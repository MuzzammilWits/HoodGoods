import { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './CheckoutPage.css'; // Ensure CSS is linked
import { useCart } from '../context/ContextCart'; // Assuming path is correct
import { useAuth0 } from '@auth0/auth0-react';
import axios, { AxiosError } from 'axios';

// --- Interfaces ---
type CartItemDisplay = {
  // Assuming structure based on usage later - adjust if needed
  id: string; // Likely mapped from productId
  productId: number;
  name: string;
  productName: string; // Included as it's used in groupedItemsByStoreId mapping
  price: number;
  productPrice: number; // Included as it's used in calculations
  quantity: number;
  storeName: string;
  storeId: string;
};

interface CartItemForPayload {
  productId: number;
  quantity: number;
  pricePerUnitSnapshot: number;
  storeId: string;
}
interface OrderPayload {
  cartItems: CartItemForPayload[];
  deliverySelections: Record<string, 'standard' | 'express'>;
  selectedArea: string;
  selectedPickupPoint: string;
  yocoChargeId: string;
  frontendGrandTotal: number;
}

interface StoreDeliveryDetails {
    storeId: string;
    standardPrice: number;
    standardTime: string;
    expressPrice: number;
    expressTime: string;
    storeName?: string;
}

type DeliveryOptionsResponse = Record<string, StoreDeliveryDetails>;

declare const YocoSDK: any; // Assumes YocoSDK is loaded globally
interface InitiatePaymentResponse {
  checkoutId: string;
}
// --- End Interfaces ---

// --- Pickup Locations Data Structure ---
const pickupLocationsData: Record<string, string[]> = {
    "Area1": ["Area 1 - Pickup Point Alpha", "Area 1 - Pickup Point Beta"],
    "Area2": ["Area 2 - Pickup Point Gamma", "Area 2 - Pickup Point Delta", "Area 2 - Pickup Point Epsilon"],
    "Area3": ["Area 3 - Pickup Point Zeta", "Area 3 - Pickup Point Eta", "Area 3 - Pickup Point Theta"]
};
// --- End Pickup Locations Data ---

// Axios instance - Defined outside component for stability
const api = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000',
});

export default function CheckoutPage() {
  // --- Hooks ---
  const { cartItems, clearCart, cartError: contextCartError } = useCart();
  const { user, getAccessTokenSilently, isAuthenticated, isLoading: isAuthLoading } = useAuth0();
  const navigate = useNavigate();

  // --- State ---
  const [selectedArea, setSelectedArea] = useState('');
  const [selectedPickupPoint, setSelectedPickupPoint] = useState('');
  const [deliverySelectionState, setDeliverySelectionState] = useState<Record<string, 'standard' | 'express'>>({});
  const [storeDeliveryOptions, setStoreDeliveryOptions] = useState<DeliveryOptionsResponse>({});
  const [isLoadingDeliveryOptions, setIsLoadingDeliveryOptions] = useState(false);
  const [deliveryOptionsError, setDeliveryOptionsError] = useState<string | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // --- Refs ---
  const paymentTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const yocoInstanceRef = useRef<any>(null);

  // --- Data Processing & Memos ---
  const uniqueStoreIds = useMemo(() =>
    [...new Set(cartItems.map(item => item.storeId).filter(id => id && id !== 'unknown'))]
  , [cartItems]);

  const groupedItemsByStoreId = useMemo(() =>
    cartItems.reduce((groups, item) => {
      const key = item.storeId;
      if (!key || key === 'unknown') return groups;
      if (!groups[key]) groups[key] = [];
      groups[key].push({
        id: item.productId.toString(),
        productId: item.productId,
        name: item.productName,
        productName: item.productName,
        price: item.productPrice,
        productPrice: item.productPrice,
        quantity: item.quantity,
        storeName: item.storeName || 'Unknown Store',
        storeId: key
      });
      return groups;
    }, {} as Record<string, CartItemDisplay[]>)
  , [cartItems]);

  // --- Effects ---

  // Effect for fetching delivery options
  useEffect(() => {
    console.log("Delivery Options Effect Triggered. isAuthenticated:", isAuthenticated, "uniqueStoreIds:", uniqueStoreIds); // Added log
    if (!isAuthenticated || uniqueStoreIds.length === 0) {
      setStoreDeliveryOptions({});
      setDeliverySelectionState({});
      return;
    }
    const fetchOptions = async () => {
      setIsLoadingDeliveryOptions(true);
      setDeliveryOptionsError(null);
      console.log("Fetching delivery options for store IDs:", uniqueStoreIds); // Added log
      try {
        const token = await getAccessTokenSilently();
        const response = await api.post<DeliveryOptionsResponse>(
          '/stores/delivery-options',
          { storeIds: uniqueStoreIds },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const fetchedOptions = response.data || {};
        console.log("Fetched delivery options:", fetchedOptions); // Added log
        setStoreDeliveryOptions(fetchedOptions);
        // Initialize/preserve delivery selections
        setDeliverySelectionState(prev => {
          const newSelectionState: Record<string, 'standard' | 'express'> = {};
          uniqueStoreIds.forEach(id => {
            if (fetchedOptions[id]) {
              newSelectionState[id] = prev[id] || 'standard';
            }
          });
          Object.keys(prev).forEach(id => {
              if (uniqueStoreIds.includes(id) && fetchedOptions[id] && !newSelectionState[id]) {
                  newSelectionState[id] = prev[id];
              }
          });
          console.log("Updated delivery selection state:", newSelectionState); // Added log
          return newSelectionState;
       });
      } catch (error) {
        console.error("Failed to fetch delivery options:", error);
        const errorMsg = error instanceof AxiosError ? error.response?.data?.message || error.message : 'Could not load delivery options.';
        setDeliveryOptionsError(errorMsg);
        setStoreDeliveryOptions({});
        setDeliverySelectionState({});
      } finally {
        console.log("Finished fetching delivery options."); // Added log
        setIsLoadingDeliveryOptions(false);
      }
    };
    fetchOptions();
  // --- ***** THE CHANGE IS HERE ***** ---
  // Removed 'api' from the dependency array below
  }, [uniqueStoreIds, isAuthenticated, getAccessTokenSilently]);
  // --- ***** END OF CHANGE ***** ---

  // Effect for Timeout and Yoco Cleanup on Unmount
  useEffect(() => {
    return () => {
      if (paymentTimeoutRef.current) {
        console.log("CheckoutPage unmounting, clearing payment timeout.");
        clearTimeout(paymentTimeoutRef.current);
      }
      try {
        if (yocoInstanceRef.current && typeof yocoInstanceRef.current.closePopup === 'function') {
            console.log("CheckoutPage unmounting, attempting to close Yoco popup via ref...");
            yocoInstanceRef.current.closePopup();
        }
      } catch (e) {
        console.error("Error closing Yoco popup during unmount:", e);
      }
    };
  }, []); // Empty dependency array

  // --- Calculation Functions ---
  const calculateStoreSubtotal = (items: CartItemDisplay[]): number => items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const calculateTotalDelivery = (): number => {
    return Object.keys(deliverySelectionState).reduce((sum, storeId) => {
      const selectedOptionType = deliverySelectionState[storeId];
      const storeOptions = storeDeliveryOptions[storeId];
      if (!selectedOptionType || !storeOptions) return sum;
      const price = selectedOptionType === 'standard' ? storeOptions.standardPrice : storeOptions.expressPrice;
      return sum + (Number(price) || 0);
    }, 0);
  };

  const grandTotal = useMemo(() => {
    const itemsSubtotal = Array.isArray(cartItems)
        ? cartItems.reduce((sum, item) => sum + (item.productPrice * item.quantity), 0)
        : 0;
    const deliveryTotal = calculateTotalDelivery();
    return itemsSubtotal + deliveryTotal;
  }, [cartItems, deliverySelectionState, storeDeliveryOptions]);

  // --- Event Handlers ---
  const handleDeliveryOptionChange = (storeId: string, selection: string) => {
    if (selection === 'standard' || selection === 'express') {
        setDeliverySelectionState(prev => ({ ...prev, [storeId]: selection }));
    }
  };

  const handleAreaChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
      const newArea = event.target.value;
      setSelectedArea(newArea);
      setSelectedPickupPoint('');
  };

  // --- handlePayment function with Yoco closing logic ---
  const handlePayment = async () => {
    // --- Step 1: Frontend Validation ---
    if (!isAuthenticated || !user || cartItems.length === 0) { /* ... */ return; }
    if (!selectedArea || !selectedPickupPoint) { /* ... */ return; }
    if (uniqueStoreIds.some(id => !deliverySelectionState[id])) { /* ... */ return; }
    // --- End Frontend Validation ---

    setIsProcessingPayment(true);
    setPaymentError(null);

    if (paymentTimeoutRef.current) { clearTimeout(paymentTimeoutRef.current); paymentTimeoutRef.current = null; }
    yocoInstanceRef.current = null; // Clear previous instance ref

    try {
      // --- Step 2: Initiate Yoco Payment with Backend ---
      const token = await getAccessTokenSilently();
      console.log("Initiating payment with backend...");
      const response = await api.post<InitiatePaymentResponse>('/payments/initiate-yoco',
          { amount: Math.round(grandTotal * 100), currency: 'ZAR' },
          { headers: { Authorization: `Bearer ${token}` } }
      );
      const { checkoutId } = response.data;
      console.log("Received checkoutId:", checkoutId);
      if (!checkoutId) throw new Error("Missing checkoutId from backend.");
      // --- End Yoco Initiation ---

      // --- Step 3: Show Yoco Popup ---
      const yoco = new YocoSDK({ publicKey: 'pk_test_ed3c54a6gOol69qa7f45' }); // Replace with your key
      yocoInstanceRef.current = yoco; // Store instance in ref

      console.log("Showing Yoco popup...");
      yoco.showPopup({
          checkoutId: checkoutId,
          amountInCents: Math.round(grandTotal * 100),
          currency: 'ZAR',
          callback: async (result: any) => { // <<< Callback starts here
              if (paymentTimeoutRef.current) {
                  console.log("Yoco callback triggered, clearing payment timeout.");
                  clearTimeout(paymentTimeoutRef.current);
                  paymentTimeoutRef.current = null;
              }
              console.log("--- Yoco SDK Callback START ---");
              console.log("Received Yoco Result:", JSON.stringify(result, null, 2));

              let outcomeError: string | null = null;
              let shouldClearCartAndNavigate = false;
              const shouldClosePopup = true;

              try {
                  // --- Check Yoco Result Status ---
                  if (result.error) {
                      console.error("Yoco Payment Error:", result.error);
                      outcomeError = `Payment failed: ${result.error.message || 'Please try again.'}`;
                  } else if (result.status === 'successful' || result.status === 'pending' || result.status === 'charge_ready') {
                     console.log(`Yoco Payment Status: ${result.status}. Attempting backend order creation...`);
                      const yocoChargeId = result.id || result.chargeId || result.paymentId || 'yoco_id_not_found';
                      // ... (prepare orderPayload as before) ...
                      const backendCartItems: CartItemForPayload[] = cartItems.map(item => ({
                          productId: item.productId, quantity: item.quantity, pricePerUnitSnapshot: item.productPrice, storeId: item.storeId.toString(),
                      }));
                      const orderPayload: OrderPayload = {
                          cartItems: backendCartItems, deliverySelections: deliverySelectionState, selectedArea: selectedArea, selectedPickupPoint: selectedPickupPoint, yocoChargeId: yocoChargeId, frontendGrandTotal: grandTotal,
                      };
                      // --- Call Backend ---
                      try {
                          const backendToken = await getAccessTokenSilently();
                          console.log("Calling backend POST /orders/create endpoint...");
                          await api.post('/orders/create', orderPayload, { headers: { Authorization: `Bearer ${backendToken}` } });
                          console.log("Backend successfully created the order.");
                          shouldClearCartAndNavigate = true;
                      } catch (backendError) {
                          console.error("--- Backend /orders/create FAILED ---:", backendError);
                           if (axios.isAxiosError(backendError)) {
                              const errorMsg = backendError.response?.data?.message || backendError.message;
                              let displayMsg = `Order Placement Failed: ${errorMsg}.`;
                              if (backendError.response?.status === 409) { displayMsg = `Order Placement Issue: ${errorMsg}. Please adjust your cart or try again.` }
                               outcomeError = `${displayMsg} Payment MAY have been processed... Contact support...`; // Abridged
                          } else { outcomeError = `An unexpected error occurred... Contact support...`; } // Abridged
                      }
                      // --- End Backend Call ---
                  } else if (result.status === 'failed') { /* ... set outcomeError ... */ }
                    else if (result.status === 'cancelled') { /* ... set outcomeError ... */ }
                    else { /* ... set outcomeError ... */ }
                  // --- End Status Check ---

                  if (outcomeError) { setPaymentError(outcomeError); }

              } catch (callbackLogicError) { /* ... setPaymentError ... */ }
                finally {
                  // --- Always reset processing state ---
                  console.log("Resetting isProcessingPayment to false via callback.");
                  setIsProcessingPayment(false);

                  // --- ***** THE FIX: Attempt to close Yoco popup ***** ---
                  if (shouldClosePopup) {
                      try {
                          // !!! IMPORTANT: Replace 'closePopup' with ACTUAL method from Yoco Docs !!!
                          if (yocoInstanceRef.current && typeof yocoInstanceRef.current.closePopup === 'function') {
                             console.log("Attempting to close Yoco popup via SDK ref...");
                             yocoInstanceRef.current.closePopup(); // <<< CALL CLEANUP
                          } else {
                             console.warn("Yoco SDK instance ref not found or no closePopup method. Attempting manual removal...");
                             const yocoPopupElement = document.querySelector('.yc-auto-shown-popup'); // Use the class you found
                             if (yocoPopupElement) { yocoPopupElement.remove(); }
                             else { console.warn("Could not find .yc-auto-shown-popup to remove manually."); }
                          }
                      } catch (closeError) { console.error("Error trying to close/remove Yoco popup:", closeError); }
                  }
                   // --- ***** END OF FIX ***** ---

                  console.log("--- Yoco SDK Callback END ---");
              } // --- End finally block ---

              // --- Navigation (Happens AFTER finally block) ---
              if (shouldClearCartAndNavigate) {
                 try {
                   await clearCart();
                   console.log("Navigating to /order-confirmation (after attempted popup close)");
                   navigate('/order-confirmation');
                 } catch (clearError) {
                   setPaymentError("Order created, but failed to clear local cart..."); // Abridged
                   navigate('/order-confirmation'); // Still navigate
                 }
              }
              // --- End Navigation ---
          } // <<< Callback ends here
      }); // end showPopup

      // --- Step 5: Set Timeout Fallback ---
      console.log("Setting payment timeout fallback (45s).");
      paymentTimeoutRef.current = setTimeout(() => {
          console.warn("Payment timeout reached.");
          if (isProcessingPayment) {
              setIsProcessingPayment(false);
              setPaymentError("Payment process timed out.");
              // Also attempt to close popup on timeout
              try {
                 if (yocoInstanceRef.current && typeof yocoInstanceRef.current.closePopup === 'function') { yocoInstanceRef.current.closePopup(); }
              } catch(e) { console.error("Error closing popup on timeout:", e); }
          }
          paymentTimeoutRef.current = null;
      }, 45000);
      // --- End Timeout Fallback ---

    } catch (error) { // Catch initiation errors
        console.error("Failed to initiate payment:", error);
        const errorMsg = axios.isAxiosError(error) ? error.response?.data?.message || error.message : 'Payment initiation failed';
        setPaymentError(errorMsg);
        if (paymentTimeoutRef.current) { clearTimeout(paymentTimeoutRef.current); paymentTimeoutRef.current = null; }
        setIsProcessingPayment(false);
    }
  }; // --- END handlePayment ---

  // --- Render Logic ---
  if (isAuthLoading) return <p>Loading authentication...</p>;
  if (!isAuthenticated) return ( <main className="checkout-container"><h1>Checkout</h1><p>Please log in to view checkout.</p></main> );
  if (cartItems === null) return <p>Loading cart...</p>;
  if (cartItems.length > 0 && isLoadingDeliveryOptions) { return <p>Loading checkout details...</p>; }
  if (cartItems.length === 0) return ( <main className="checkout-container"><h1>Checkout</h1><p>Your cart is empty.</p><Link to="/products" className="back-link">Continue Shopping</Link></main> );

  const displayGrandTotal = typeof grandTotal === 'number' && !isNaN(grandTotal) ? grandTotal : 0;
  const isCheckoutReady = !isProcessingPayment &&
                           !isLoadingDeliveryOptions &&
                           !deliveryOptionsError &&
                           selectedArea &&
                           selectedPickupPoint &&
                           uniqueStoreIds.length > 0 &&
                           !uniqueStoreIds.some(id => !deliverySelectionState[id]) &&
                           displayGrandTotal > 0;

  return (
    <main className="checkout-container">
      <header>
        <h1>Checkout</h1>
        <p className="instructions">Please select your pickup location and review your order.</p>
        {contextCartError && <p className="error-message">Cart Notice: {contextCartError}</p>}
        {deliveryOptionsError && <p className="error-message">Delivery Error: {deliveryOptionsError}</p>}
        {paymentError && <p className="error-message">Payment Error: {paymentError}</p>}
      </header>

      <div className="checkout-layout">

        {/* Pickup Location Section */}
        <section className="form-section pickup-location-section" aria-labelledby="pickup-location-heading">
            <h2 id="pickup-location-heading">Pickup Location</h2>
            <p className="form-field">
              <label htmlFor="delivery-area">Select Area</label>
              <select id="delivery-area" className="form-input" value={selectedArea} onChange={handleAreaChange} required>
                <option value="" disabled>Select an area...</option>
                {Object.keys(pickupLocationsData).map(area => (<option key={area} value={area}>{area}</option>))}
              </select>
            </p>
            <p className="form-field">
              <label htmlFor="pickup-point">Select Pickup Point</label>
              <select id="pickup-point" className="form-input" value={selectedPickupPoint} onChange={(e) => setSelectedPickupPoint(e.target.value)} required disabled={!selectedArea}>
                <option value="" disabled>Select a pickup point...</option>
                {selectedArea && pickupLocationsData[selectedArea]?.map(point => (<option key={point} value={point}>{point}</option>))}
              </select>
              {!selectedArea && <small className="field-hint">Please select an area first.</small>}
            </p>
           </section>

        {/* Order Summary Section */}
        <section className="form-section order-summary-section" aria-labelledby="order-summary-heading">
          <h2 id="order-summary-heading">Order Summary</h2>
          {uniqueStoreIds.map(storeId => {
            const items = groupedItemsByStoreId[storeId];
            const deliveryDetails = storeDeliveryOptions[storeId];
            const currentSelection = deliverySelectionState[storeId];
            if (!items || items.length === 0) return null;
            const storeName = items[0]?.storeName || `Store ID: ${storeId}`;
            return (
              <article key={storeId} className="store-group" aria-labelledby={`store-heading-${storeId}`}>
                <h3 id={`store-heading-${storeId}`} className="store-name">{storeName}</h3>
                <div className="delivery-option form-field">
                  <label htmlFor={`delivery-${storeId}`}>Delivery Option</label>
                  {isLoadingDeliveryOptions ? ("Loading options...") : !deliveryDetails ? (<span className="error-message">Unavailable</span>) : (
                     <select id={`delivery-${storeId}`} className="form-input" value={currentSelection || ''} onChange={(e) => handleDeliveryOptionChange(storeId, e.target.value)} required>
                        <option value="standard">Standard - R{deliveryDetails.standardPrice.toFixed(2)} ({deliveryDetails.standardTime})</option>
                        <option value="express">Express - R{deliveryDetails.expressPrice.toFixed(2)} ({deliveryDetails.expressTime})</option>
                     </select>
                   )}
                </div>
                <ul className="order-items" aria-label={`Items from ${storeName}`}>
                  {items.map(item => ( <li key={`${item.id}-${storeId}`} className="order-item">{item.name} - R{item.price.toFixed(2)} × {item.quantity}</li> ))}
                </ul>
                <footer className="store-summary">
                  <p>Subtotal: R{calculateStoreSubtotal(items).toFixed(2)}</p>
                  {deliveryDetails && currentSelection && (<p>Delivery: R{(currentSelection === 'standard' ? deliveryDetails.standardPrice : deliveryDetails.expressPrice).toFixed(2)}</p>)}
                </footer>
              </article>
            );
          })}
          <footer className="order-totals">
            <p className="grand-total">Grand Total: R{displayGrandTotal.toFixed(2)}</p>
          </footer>
        </section>

        {/* Payment Button Section */}
        <section className="payment-section">
          <button type="button" onClick={handlePayment} disabled={!isCheckoutReady || isProcessingPayment} className="yoco-pay-button">
            {isProcessingPayment ? 'Processing...' : `Pay R${displayGrandTotal.toFixed(2)} with Yoco`}
          </button>
           {!isCheckoutReady && !isProcessingPayment && <p style={{fontSize: '0.8em', color: 'grey', marginTop: '5px'}}>Please select area, pickup point, and delivery options.</p>}
        </section>

        {/* Actions Menu */}
        <menu className="actions">
          <li><Link to="/cart" className="back-link">Back to Cart</Link></li>
        </menu>
      </div> {/* End checkout-layout wrapper */}
    </main>
  );
}