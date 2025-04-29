import { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './CheckoutPage.css'; // Ensure CSS is linked
import { useCart } from '../context/ContextCart';
import { useAuth0 } from '@auth0/auth0-react';
import axios, { AxiosError } from 'axios';

// --- Interfaces --- (Keep interfaces as they are)
type CartItemDisplay = {
  id: string;
  name: string;
  price: number;
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

declare const YocoSDK: any;
interface InitiatePaymentResponse {
  checkoutId: string;
}
// --- End Interfaces ---

// --- NEW: Define Pickup Locations Data Structure ---
const pickupLocationsData: Record<string, string[]> = {
    "Area1": ["Area 1 - Pickup Point Alpha", "Area 1 - Pickup Point Beta"],
    "Area2": ["Area 2 - Pickup Point Gamma", "Area 2 - Pickup Point Delta", "Area 2 - Pickup Point Epsilon"],
    "Area3": ["Area 3 - Pickup Point Zeta", "Area 3 - Pickup Point Eta", "Area 3 - Pickup Point Theta"]
};
// --- End Pickup Locations Data ---

export default function CheckoutPage() {
  // --- Hooks ---
  const { cartItems, clearCart, cartError: contextCartError } = useCart();
  const { user, getAccessTokenSilently, isAuthenticated, isLoading: isAuthLoading } = useAuth0();
  const navigate = useNavigate();

  // --- State ---
  // REMOVED: streetAddress state
  // MODIFIED: deliveryArea renamed to selectedArea
  const [selectedArea, setSelectedArea] = useState('');
  // NEW: State for the selected pickup point
  const [selectedPickupPoint, setSelectedPickupPoint] = useState('');
  const [deliverySelectionState, setDeliverySelectionState] = useState<Record<string, 'standard' | 'express'>>({});
  const [storeDeliveryOptions, setStoreDeliveryOptions] = useState<DeliveryOptionsResponse>({});
  const [isLoadingDeliveryOptions, setIsLoadingDeliveryOptions] = useState(false);
  const [deliveryOptionsError, setDeliveryOptionsError] = useState<string | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // --- Ref for Timeout ---
  const paymentTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Axios instance
  const api = axios.create({
    baseURL: import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000',
  });

  // --- Data Processing & Memos --- (Keep these as they are)
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
        name: item.productName,
        price: item.productPrice,
        quantity: item.quantity,
        storeName: item.storeName || 'Unknown Store',
        storeId: key
      });
      return groups;
    }, {} as Record<string, CartItemDisplay[]>)
  , [cartItems]);

  // --- Effects ---

  // Effect for fetching delivery options (Keep as is)
  useEffect(() => {
    if (!isAuthenticated || uniqueStoreIds.length === 0) {
      setStoreDeliveryOptions({});
      setDeliverySelectionState({});
      return;
    }
    const fetchOptions = async () => {
      setIsLoadingDeliveryOptions(true);
      setDeliveryOptionsError(null);
      try {
        const token = await getAccessTokenSilently();
        const response = await api.post<DeliveryOptionsResponse>(
          '/stores/delivery-options',
          { storeIds: uniqueStoreIds },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const fetchedOptions = response.data || {};
        setStoreDeliveryOptions(fetchedOptions);
        // Initialize/preserve delivery selections
        setDeliverySelectionState(prev => {
          const newSelectionState: Record<string, 'standard' | 'express'> = {};
          uniqueStoreIds.forEach(id => {
            if (fetchedOptions[id]) { // Only add if options exist for store
              newSelectionState[id] = prev[id] || 'standard'; // Default or keep existing
            }
          });
          // Ensure we don't lose selections for stores that might temporarily disappear/reappear if cart changes
          Object.keys(prev).forEach(id => {
             if (uniqueStoreIds.includes(id) && fetchedOptions[id] && !newSelectionState[id]) {
                 newSelectionState[id] = prev[id];
             }
          });
          return newSelectionState;
       });
      } catch (error) {
        console.error("Failed to fetch delivery options:", error);
        const errorMsg = error instanceof AxiosError ? error.response?.data?.message || error.message : 'Could not load delivery options.';
        setDeliveryOptionsError(errorMsg);
        setStoreDeliveryOptions({});
        setDeliverySelectionState({});
      } finally {
        setIsLoadingDeliveryOptions(false);
      }
    };
    fetchOptions();
  }, [uniqueStoreIds, isAuthenticated, getAccessTokenSilently]); // Keep dependencies

  // Effect for Timeout Cleanup on Unmount (Keep as is)
  useEffect(() => {
    return () => {
      if (paymentTimeoutRef.current) {
        console.log("CheckoutPage unmounting, clearing payment timeout.");
        clearTimeout(paymentTimeoutRef.current);
      }
    };
  }, []);

  // --- Calculation Functions --- (Keep these as they are)
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

  // NEW: Handler for Area change
  const handleAreaChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
      const newArea = event.target.value;
      setSelectedArea(newArea);
      setSelectedPickupPoint(''); // Reset pickup point when area changes
  };

  // --- MODIFIED handlePayment function ---
  const handlePayment = async () => {
    // --- Step 1: Frontend Validation (Keep existing validation) ---
    if (!isAuthenticated || !user || cartItems.length === 0) {
        setPaymentError("Cannot proceed to payment. Ensure you are logged in and have items in your cart.");
        return;
    }
    if (!selectedArea || !selectedPickupPoint) {
        setPaymentError("Please select your delivery area and pickup point.");
        return;
    }
     if (uniqueStoreIds.some(id => !deliverySelectionState[id])) {
        setPaymentError("Please select a delivery option for all store groups.");
        return;
     }
     // --- End Frontend Validation ---

    setIsProcessingPayment(true);
    setPaymentError(null);

    // Clear any previous lingering timeout
    if (paymentTimeoutRef.current) {
        clearTimeout(paymentTimeoutRef.current);
        paymentTimeoutRef.current = null;
    }

    try {
      // --- Step 2: Initiate Yoco Payment with Backend (Keep existing logic) ---
      const token = await getAccessTokenSilently();
      console.log("Initiating payment with backend...");
      // Assuming 'api' is your preconfigured Axios instance
      const response = await api.post<InitiatePaymentResponse>('/payments/initiate-yoco',
          {
              amount: Math.round(grandTotal * 100), // Send amount in cents
              currency: 'ZAR',
          },
          { headers: { Authorization: `Bearer ${token}` } }
      );

      const { checkoutId } = response.data;
      console.log("Received checkoutId:", checkoutId);
      if (!checkoutId) throw new Error("Missing checkoutId from backend.");
      // --- End Yoco Initiation ---


      // --- Step 3: Show Yoco Popup ---
      const yoco = new YocoSDK({ publicKey: 'pk_test_ed3c54a6gOol69qa7f45' }); // Use your actual public key

      console.log("Showing Yoco popup...");
      yoco.showPopup({
          checkoutId: checkoutId,
          amountInCents: Math.round(grandTotal * 100),
          currency: 'ZAR',
          // customer: { email: user.email }, // Optional: Pass customer details
          callback: async (result: any) => { // <<< Make callback async
              // --- Step 4: Handle Yoco Callback ---
              // Clear timeout inside callback
              if (paymentTimeoutRef.current) {
                  console.log("Yoco callback triggered, clearing payment timeout.");
                  clearTimeout(paymentTimeoutRef.current);
                  paymentTimeoutRef.current = null;
              }

              console.log("--- Yoco SDK Callback START ---");
              console.log("Received Yoco Result:", JSON.stringify(result, null, 2)); // Log the full result to check structure

              let outcomeError: string | null = null;
              let backendErrorOccurred = false;
              let shouldClearCartAndNavigate = false;

              try {
                  // --- Step 4a: Check Yoco Result Status ---
                  if (result.error) {
                      console.error("Yoco Payment Error:", result.error);
                      outcomeError = `Payment failed: ${result.error.message || 'Please try again.'}`;
                  } else if (result.status === 'successful' || result.status === 'pending' || result.status === 'charge_ready') {
                      // --- PAYMENT SUCCEEDED (or pending confirmation) via Yoco ---
                      console.log(`Yoco Payment Status: ${result.status}. Attempting backend order creation...`);

                      // --- Step 4b: Prepare Payload for Backend /orders/create ---
                      // IMPORTANT: Inspect the logged 'result' object to find the correct Yoco charge ID property!
                      const yocoChargeId = result.id || result.chargeId || result.paymentId || 'yoco_id_not_found'; // <<< ADJUST THIS based on actual Yoco result object
                      if (yocoChargeId === 'yoco_id_not_found') {
                          console.warn("Could not find Yoco Charge/Payment ID in result object:", result);
                      }

                      // Map frontend cart items to the structure expected by the backend DTO
                      const backendCartItems: CartItemForPayload[] = cartItems.map(item => ({
                          productId: item.productId, // Ensure this is the correct numeric ID
                          quantity: item.quantity,
                          pricePerUnitSnapshot: item.productPrice, // Price used during checkout
                          storeId: item.storeId.toString(), // Ensure storeId is string if needed by backend
                      }));

                      const orderPayload: OrderPayload = {
                          cartItems: backendCartItems,
                          deliverySelections: deliverySelectionState,
                          selectedArea: selectedArea,
                          selectedPickupPoint: selectedPickupPoint,
                          yocoChargeId: yocoChargeId,
                          frontendGrandTotal: grandTotal,
                      };
                      // --- End Prepare Payload ---


                      // --- Step 4c: Call Backend /orders/create Endpoint ---
                      try {
                          // Get token again just in case it expired during payment interaction
                          const backendToken = await getAccessTokenSilently();
                          console.log("Calling backend POST /orders/create endpoint...");

                          // Use your Axios instance 'api'
                          await api.post('/orders/create', orderPayload, {
                              headers: { Authorization: `Bearer ${backendToken}` },
                          });

                          console.log("Backend successfully created the order.");
                          // Set flag to clear cart and navigate AFTER the callback logic finishes
                          shouldClearCartAndNavigate = true;

                      } catch (backendError) {
                          // --- Backend Order Creation FAILED! ---
                          console.error("--- Backend /orders/create FAILED ---:", backendError);
                          backendErrorOccurred = true;
                          if (axios.isAxiosError(backendError)) {
                              const errorMsg = backendError.response?.data?.message || backendError.message;
                              // Provide specific message based on potential backend errors
                              let displayMsg = `Order Placement Failed: ${errorMsg}.`;
                              if (backendError.response?.status === 409) { // Example: Conflict (e.g., stock)
                                   displayMsg = `Order Placement Issue: ${errorMsg}. Please adjust your cart or try again.`
                              }
                               outcomeError = `${displayMsg} Payment MAY have been processed (Yoco Status: ${result.status}). Please contact support with Payment Reference: ${yocoChargeId}.`;
                          } else {
                              outcomeError = `An unexpected error occurred while placing your order. Payment MAY have been processed (Yoco Status: ${result.status}). Please contact support with Payment Reference: ${yocoChargeId}.`;
                          }
                          // --- DO NOT clear cart or navigate here ---
                      }
                      // --- End Backend Call ---

                  } else if (result.status === 'failed') {
                      console.warn("Yoco Payment explicitly failed.");
                      outcomeError = "Payment failed. Please check your details or try another card.";
                  } else if (result.status === 'cancelled') {
                      console.warn("Yoco Payment was cancelled (status: 'cancelled').");
                      outcomeError = "Payment was cancelled.";
                  } else {
                      // Handle other unexpected statuses
                      console.warn("Yoco Payment resulted in unexpected status:", result.status, "Full result:", result);
                      outcomeError = "Payment outcome uncertain. Please check your confirmation or contact support.";
                  }

                  // --- Step 4d: Handle Callback Outcome ---
                  if (outcomeError) {
                      console.log("Setting payment error state:", outcomeError);
                      setPaymentError(outcomeError); // Display error to the user
                  }

                  if (shouldClearCartAndNavigate) {
                      // --- Order successfully created on backend ---
                      try {
                          console.log("Clearing cart on frontend...");
                          await clearCart(); // Use clearCart from context
                          console.log("Frontend cart cleared.");
                          console.log("Navigating to /order-confirmation");
                          navigate('/order-confirmation'); // Navigate only after backend success
                      } catch (clearError) {
                          console.error("Error clearing cart on frontend after successful order creation:", clearError);
                          // Minor issue: Order created, but frontend cart didn't clear.
                           setPaymentError("Order created successfully, but failed to clear local cart. Please refresh if items still appear.");
                           // Still navigate as the order IS placed.
                           navigate('/order-confirmation');
                      }
                  }
                  // --- End Handle Callback Outcome ---

              } catch (callbackLogicError) {
                  // --- Error within the callback logic itself ---
                  console.error("--- Error INSIDE Yoco Callback Logic ---:", callbackLogicError);
                  setPaymentError("An internal error occurred after payment processing. Please check your order history or contact support.");
                  // Avoid clearing cart or navigating if the flow logic failed
              } finally {
                  // --- Always reset processing state ---
                  console.log("Resetting isProcessingPayment to false via callback.");
                  setIsProcessingPayment(false);
                  console.log("--- Yoco SDK Callback END ---");
              }
              // --- End Step 4: Handle Yoco Callback ---
          } // end callback
      }); // end showPopup

      // --- Step 5: Set Timeout Fallback (Keep existing logic) ---
      console.log("Setting payment timeout fallback (45s).");
      paymentTimeoutRef.current = setTimeout(() => {
          console.warn("Payment timeout reached.");
          // Only set error if still processing (i.e., callback hasn't completed/run)
          if (isProcessingPayment) {
                setIsProcessingPayment(false);
                setPaymentError("Payment process was cancelled or timed out before completing.");
          }
          paymentTimeoutRef.current = null;
      }, 45000); // 45 seconds
      // --- End Timeout Fallback ---

    } catch (error) { // Catch errors during Yoco initiation step
        console.error("Failed to initiate payment:", error);
        const errorMsg = axios.isAxiosError(error) ? error.response?.data?.message || error.message : 'Payment initiation failed';
        setPaymentError(errorMsg);
        if (paymentTimeoutRef.current) { // Clear timeout if initiation failed
             clearTimeout(paymentTimeoutRef.current);
             paymentTimeoutRef.current = null;
        }
        setIsProcessingPayment(false); // Reset processing state on initiation error
    }
  }; // --- END MODIFIED handlePayment ---

  // --- Render Logic ---
  if (isAuthLoading) return <p>Loading authentication...</p>;
  if (!isAuthenticated) return ( <main className="checkout-container"><h1>Checkout</h1><p>Please log in to view checkout.</p></main> );
  if (cartItems === null) return <p>Loading cart...</p>;
  if (cartItems.length > 0 && isLoadingDeliveryOptions) { return <p>Loading checkout details...</p>; }
  if (cartItems.length === 0) return ( <main className="checkout-container"><h1>Checkout</h1><p>Your cart is empty.</p><Link to="/products" className="back-link">Continue Shopping</Link></main> );

  const displayGrandTotal = typeof grandTotal === 'number' && !isNaN(grandTotal) ? grandTotal : 0;
  // UPDATED: Checkout readiness check
  const isCheckoutReady = !isProcessingPayment &&
                         !isLoadingDeliveryOptions &&
                         !deliveryOptionsError &&
                         selectedArea && // Check selected area
                         selectedPickupPoint && // Check selected pickup point
                         uniqueStoreIds.length > 0 &&
                         !uniqueStoreIds.some(id => !deliverySelectionState[id]) &&
                         displayGrandTotal > 0;

  return (
    <main className="checkout-container">
      <header>
        <h1>Checkout</h1>
        <p className="instructions">Please select your pickup location and review your order.</p> {/* Updated instruction */}
        {/* Display relevant errors */}
        {contextCartError && <p className="error-message">Cart Notice: {contextCartError}</p>}
        {deliveryOptionsError && <p className="error-message">Delivery Error: {deliveryOptionsError}</p>}
        {paymentError && <p className="error-message">Payment Error: {paymentError}</p>}
      </header>

      <div className="checkout-layout">

        {/* MODIFIED: Delivery Address Section -> Pickup Location Section */}
        <section className="form-section pickup-location-section" aria-labelledby="pickup-location-heading">
            <h2 id="pickup-location-heading">Pickup Location</h2>

            {/* Area Selection Dropdown */}
            <p className="form-field">
              <label htmlFor="delivery-area">Select Area</label>
              <select
                id="delivery-area"
                className="form-input"
                value={selectedArea}
                onChange={handleAreaChange} // Use specific handler
                required
              >
                <option value="" disabled>Select an area...</option>
                {Object.keys(pickupLocationsData).map(area => (
                    <option key={area} value={area}>{area}</option>
                ))}
              </select>
            </p>

            {/* Pickup Point Selection Dropdown */}
            <p className="form-field">
              <label htmlFor="pickup-point">Select Pickup Point</label>
              <select
                id="pickup-point"
                className="form-input"
                value={selectedPickupPoint}
                onChange={(e) => setSelectedPickupPoint(e.target.value)}
                required
                disabled={!selectedArea} // Disable until an area is chosen
              >
                <option value="" disabled>Select a pickup point...</option>
                {selectedArea && pickupLocationsData[selectedArea] && // Check if area and points exist
                    pickupLocationsData[selectedArea].map(point => (
                        <option key={point} value={point}>{point}</option>
                ))}
              </select>
              {!selectedArea && <small className="field-hint">Please select an area first.</small>}
            </p>
         </section>
        {/* END MODIFIED SECTION */}

        {/* Order Summary Section (Remains the same) */}
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

                {/* Delivery Options Dropdown */}
                <div className="delivery-option form-field">
                  <label htmlFor={`delivery-${storeId}`}>Delivery Option</label>
                  {isLoadingDeliveryOptions ? (
                       "Loading options..."
                   ) : !deliveryDetails ? (
                       <span className="error-message">Unavailable</span>
                   ) : (
                    <select
                        id={`delivery-${storeId}`}
                        className="form-input"
                        value={currentSelection || ''}
                        onChange={(e) => handleDeliveryOptionChange(storeId, e.target.value)}
                        required
                    >
                        <option value="standard">Standard - R{deliveryDetails.standardPrice.toFixed(2)} ({deliveryDetails.standardTime})</option>
                        <option value="express">Express - R{deliveryDetails.expressPrice.toFixed(2)} ({deliveryDetails.expressTime})</option>
                    </select>
                  )}
                </div>

                {/* Items List */}
                <ul className="order-items" aria-label={`Items from ${storeName}`}>
                  {items.map(item => ( <li key={`${item.id}-${storeId}`} className="order-item">{item.name} - R{item.price.toFixed(2)} × {item.quantity}</li> ))}
                </ul>

                {/* Store Summary Footer */}
                <footer className="store-summary">
                  <p>Subtotal: R{calculateStoreSubtotal(items).toFixed(2)}</p>
                  {deliveryDetails && currentSelection && (
                     <p>Delivery: R{(currentSelection === 'standard' ? deliveryDetails.standardPrice : deliveryDetails.expressPrice).toFixed(2)}</p>
                   )}
                </footer>
              </article>
            );
          })}
          {/* Grand Total Section */}
          <footer className="order-totals">
            <p className="grand-total">Grand Total: R{displayGrandTotal.toFixed(2)}</p>
          </footer>
        </section>

        {/* Payment Button Section (Updated disabled logic check) */}
        <section className="payment-section">
          <button
            type="button"
            onClick={handlePayment}
            disabled={!isCheckoutReady || isProcessingPayment} // Uses updated isCheckoutReady
            className="yoco-pay-button"
          >
            {isProcessingPayment ? 'Processing...' : `Pay R${displayGrandTotal.toFixed(2)} with Yoco`}
          </button>
           {/* Optional: Show detailed disable reason */}
           {!isCheckoutReady && !isProcessingPayment && <p style={{fontSize: '0.8em', color: 'grey', marginTop: '5px'}}>Please select area, pickup point, and delivery options.</p>}
        </section>

        {/* Actions Menu (Remains the same) */}
        <menu className="actions">
          <li>
            <Link to="/cart" className="back-link">Back to Cart</Link>
          </li>
        </menu>
      </div> {/* End checkout-layout wrapper */}
    </main>
  );
}