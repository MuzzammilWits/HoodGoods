// Add useRef to the import
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

export default function CheckoutPage() {
  // --- Hooks ---
  const { cartItems, clearCart, cartError: contextCartError } = useCart();
  const { user, getAccessTokenSilently, isAuthenticated, isLoading: isAuthLoading } = useAuth0();
  const navigate = useNavigate();

  // --- State --- (Keep state as it is)
  const [streetAddress, setStreetAddress] = useState('');
  const [deliveryArea, setDeliveryArea] = useState('');
  const [deliverySelectionState, setDeliverySelectionState] = useState<Record<string, 'standard' | 'express'>>({});
  const [storeDeliveryOptions, setStoreDeliveryOptions] = useState<DeliveryOptionsResponse>({});
  const [isLoadingDeliveryOptions, setIsLoadingDeliveryOptions] = useState(false);
  const [deliveryOptionsError, setDeliveryOptionsError] = useState<string | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // --- Add Ref for Timeout ---
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

  // --- Add Effect for Timeout Cleanup on Unmount ---
  useEffect(() => {
    // This function runs when the component unmounts
    return () => {
      if (paymentTimeoutRef.current) {
        console.log("CheckoutPage unmounting, clearing payment timeout.");
        clearTimeout(paymentTimeoutRef.current);
      }
    };
  }, []); // Empty dependency array ensures this runs only on mount and unmount

  // --- Calculation Functions --- (Keep these as they are)
  const calculateStoreSubtotal = (items: CartItemDisplay[]): number => items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const calculateTotalDelivery = (): number => {
    return Object.keys(deliverySelectionState).reduce((sum, storeId) => {
      const selectedOptionType = deliverySelectionState[storeId];
      const storeOptions = storeDeliveryOptions[storeId];
      if (!selectedOptionType || !storeOptions) return sum;
      const price = selectedOptionType === 'standard' ? storeOptions.standardPrice : storeOptions.expressPrice;
      // Ensure price is treated as a number, default to 0 if invalid
      return sum + (Number(price) || 0);
    }, 0);
  };

  const grandTotal = useMemo(() => {
    // Ensure cartItems is an array before reducing
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

  // Modified handlePayment with Timeout
  const handlePayment = async () => {
    // Basic validation (Keep as is)
    if (!isAuthenticated || !user || cartItems.length === 0) {
        setPaymentError("Cannot proceed to payment. Ensure you are logged in and have items in your cart.");
        return;
    }
    if (!streetAddress || !deliveryArea) {
        setPaymentError("Please fill in your delivery address and select an area.");
        return;
    }
    // Ensure delivery option selected for all stores
     if (uniqueStoreIds.some(id => !deliverySelectionState[id])) {
        setPaymentError("Please select a delivery option for all store groups.");
        return;
     }


    setIsProcessingPayment(true);
    setPaymentError(null);

    // --- Clear any previous lingering timeout ---
    if (paymentTimeoutRef.current) {
        clearTimeout(paymentTimeoutRef.current);
        paymentTimeoutRef.current = null;
    }

    try {
        const token = await getAccessTokenSilently();

        // 1. Call backend to initiate payment (Keep as is)
        console.log("Initiating payment with backend...");
        const response = await api.post<InitiatePaymentResponse>('/payments/initiate-yoco',
            {
                amount: Math.round(grandTotal * 100), // Send amount in cents
                currency: 'ZAR',
                // Optionally send more details
            },
            { headers: { Authorization: `Bearer ${token}` } }
        );

        const { checkoutId } = response.data;
        console.log("Received checkoutId:", checkoutId);
        if (!checkoutId) throw new Error("Missing checkoutId from backend.");

        // 2. Initialize Yoco SDK (Keep as is)
        const yoco = new YocoSDK({
            publicKey: 'pk_test_ed3c54a6gOol69qa7f45', // Use Test Public Key
        });

        console.log("Showing Yoco popup...");
        yoco.showPopup({
            checkoutId: checkoutId,
            amountInCents: Math.round(grandTotal * 100),
            currency: 'ZAR',
            // customer: { email: user.email, ... },
            callback: async (result: any) => {
                // --- START: Clear timeout inside callback ---
                if (paymentTimeoutRef.current) {
                    console.log("Yoco callback triggered, clearing payment timeout.");
                    clearTimeout(paymentTimeoutRef.current);
                    paymentTimeoutRef.current = null;
                }
                // --- END: Clear timeout ---

                console.log("--- Yoco SDK Callback START ---");
                console.log("Received Yoco Result:", JSON.stringify(result, null, 2));

                let outcomeError: string | null = null;
                let shouldNavigate = false;
                let clearCartErrorOccurred = false;

                // Using try/finally within callback for robustness
                try {
                    if (result.error) {
                        console.error("Yoco Payment Error:", result.error);
                        outcomeError = `Payment failed: ${result.error.message || 'Please try again.'}`;
                    } else if (result.status === 'successful' || result.status === 'pending' || result.status === 'charge_ready') {
                        console.log(`Yoco Payment Status on Frontend: ${result.status}`);
                        shouldNavigate = true;
                        try {
                            console.log("Clearing cart on frontend...");
                            await clearCart(); // Use clearCart from context
                            console.log("Frontend cart cleared.");
                        } catch (clearError) {
                            console.error("Error clearing cart on frontend:", clearError);
                            clearCartErrorOccurred = true;
                            // Append to existing error or set new one
                            outcomeError = (outcomeError ? outcomeError + " " : "") + "Additionally, failed to clear cart automatically.";
                        }
                    } else if (result.status === 'failed') {
                        console.warn("Yoco Payment explicitly failed.");
                        outcomeError = "Payment failed. Please check your details or try another card.";
                    } else if (result.status === 'cancelled') {
                        console.warn("Yoco Payment was cancelled (status: 'cancelled').");
                        outcomeError = "Payment was cancelled.";
                    } else {
                        console.warn("Yoco Payment resulted in unexpected status:", result.status, "Full result:", result);
                        outcomeError = "Payment outcome uncertain. Please check your confirmation or contact support.";
                    }

                    if (outcomeError) {
                        console.log("Setting payment error state:", outcomeError);
                        setPaymentError(outcomeError); // Set any accumulated error message
                    }
                    if (clearCartErrorOccurred) {
                        console.log("Handling cart clear error occurrence (message set above).");
                        /* Additional handling if needed */
                    }
                    if (shouldNavigate) {
                        console.log("Navigating to /order-confirmation");
                        navigate('/order-confirmation');
                    }

                } catch (callbackError) {
                    console.error("--- Error INSIDE Yoco Callback Logic ---:", callbackError);
                    setPaymentError("An internal error occurred after payment interaction. Please check your order status or contact support.");
                } finally {
                    // This *always* runs if the callback is entered, after try/catch
                    console.log("--- Yoco SDK Callback FINALLY block ---");
                    console.log("Resetting isProcessingPayment to false via callback.");
                    setIsProcessingPayment(false); // Reset processing state
                    console.log("--- Yoco SDK Callback END ---");
                }
            } // end callback
        }); // end showPopup

        // --- START: Set the timeout AFTER showing the popup ---
        console.log("Setting payment timeout fallback (45s).");
        paymentTimeoutRef.current = setTimeout(() => {
            console.warn("Payment timeout reached (popup likely closed manually or timed out).");
            // Use functional update to safely check the *current* state
            setIsProcessingPayment(currentProcessingState => {
                if (currentProcessingState) { // Only act if it's still true
                    console.log("Resetting processing state due to timeout.");
                    setPaymentError("Payment process was cancelled or timed out.");
                    return false; // Set state to false
                }
                // If already false, callback must have run just before timeout
                console.log("Timeout fired, but processing state already false (callback likely ran).");
                return false; // Keep it false
            });
            paymentTimeoutRef.current = null; // Clear ref after timeout runs
        }, 450); // 45 seconds - adjust duration as needed
        // --- END: Set timeout ---

    } catch (error) {
        console.error("Failed to initiate payment:", error);
        const errorMsg = axios.isAxiosError(error) ? error.response?.data?.message || error.message : 'Payment initiation failed';
        setPaymentError(errorMsg);

        // --- START: Clear timeout on initiation error ---
        if (paymentTimeoutRef.current) {
            console.log("Clearing payment timeout due to initiation error.");
            clearTimeout(paymentTimeoutRef.current);
            paymentTimeoutRef.current = null;
        }
        // --- END: Clear timeout ---
        setIsProcessingPayment(false); // Reset processing state on error
    }
  }; // end handlePayment


  // --- Render Logic --- (Keep render logic as is)
  if (isAuthLoading) return <p>Loading authentication...</p>;
  if (!isAuthenticated) return ( <main className="checkout-container"><h1>Checkout</h1><p>Please log in to view checkout.</p></main> );
  // Handle cartItems possibly being null during initial load from context
  if (cartItems === null) return <p>Loading cart...</p>;
  if (cartItems.length > 0 && isLoadingDeliveryOptions) { return <p>Loading checkout details...</p>; }
  if (cartItems.length === 0) return ( <main className="checkout-container"><h1>Checkout</h1><p>Your cart is empty.</p><Link to="/products" className="back-link">Continue Shopping</Link></main> );

  // Ensure grandTotal is a valid number for display/payment
  const displayGrandTotal = typeof grandTotal === 'number' && !isNaN(grandTotal) ? grandTotal : 0;
  // Disable button if grand total is zero or invalid (e.g., cart empty after loading)
  const isCheckoutReady = !isProcessingPayment && !isLoadingDeliveryOptions && !deliveryOptionsError && streetAddress && deliveryArea && uniqueStoreIds.length > 0 && !uniqueStoreIds.some(id => !deliverySelectionState[id]) && displayGrandTotal > 0;


  return (
    <main className="checkout-container">
      <header>
        <h1>Checkout</h1>
        <p className="instructions">Please enter delivery details and review your order.</p>
        {/* Display relevant errors */}
        {contextCartError && <p className="error-message">Cart Notice: {contextCartError}</p>}
        {deliveryOptionsError && <p className="error-message">Delivery Error: {deliveryOptionsError}</p>}
        {paymentError && <p className="error-message">Payment Error: {paymentError}</p>}
      </header>

      <div className="checkout-layout">

        {/* Delivery Address Section */}
        <section className="form-section delivery-address-section" aria-labelledby="delivery-address-heading">
           <h2 id="delivery-address-heading">Delivery Address</h2>
           <p className="form-field">
             <label htmlFor="street-address">Street Address</label>
             <input id="street-address" type="text" className="form-input" value={streetAddress} onChange={(e) => setStreetAddress(e.target.value)} required autoComplete="street-address"/>
           </p>
           <p className="form-field">
             <label htmlFor="delivery-area">Delivery Area</label>
             <select id="delivery-area" className="form-input" value={deliveryArea} onChange={(e) => setDeliveryArea(e.target.value)} required>
               <option value="" disabled>Select an area...</option>
               {/* Populate with actual areas */}
               <option value="Area1">Area 1</option>
               <option value="Area2">Area 2</option>
             </select>
           </p>
         </section>

        {/* Order Summary Section */}
        <section className="form-section order-summary-section" aria-labelledby="order-summary-heading">
          <h2 id="order-summary-heading">Order Summary</h2>
          {uniqueStoreIds.map(storeId => {
            const items = groupedItemsByStoreId[storeId];
            const deliveryDetails = storeDeliveryOptions[storeId];
            const currentSelection = deliverySelectionState[storeId]; // Will be 'standard' or 'express' once loaded

            if (!items || items.length === 0) return null; // Should not happen if uniqueStoreIds is derived correctly
            const storeName = items[0]?.storeName || `Store ID: ${storeId}`;

            return (
              <article key={storeId} className="store-group" aria-labelledby={`store-heading-${storeId}`}>
                <h3 id={`store-heading-${storeId}`} className="store-name">{storeName}</h3>

                {/* Delivery Options Dropdown */}
                <div className="delivery-option form-field">
                  <label htmlFor={`delivery-${storeId}`}>Delivery Option</label>
                  {isLoadingDeliveryOptions ? (
                       "Loading options..." // Show loading text while fetching
                  ) : !deliveryDetails ? (
                       <span className="error-message">Unavailable</span> // Show if options failed to load for this store
                   ) : (
                    <select
                        id={`delivery-${storeId}`}
                        className="form-input"
                        value={currentSelection || ''} // Ensure value is controlled, default to '' if somehow undefined
                        onChange={(e) => handleDeliveryOptionChange(storeId, e.target.value)}
                        required // Make selection required
                    >
                        {/* Provide a default disabled option if no selection yet? Or rely on initial state? */}
                        {/* <option value="" disabled>Select delivery...</option> */}
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

        {/* Payment Button Section */}
        <section className="payment-section">
          {/* Payment error display moved to header */}
          <button
            type="button"
            onClick={handlePayment}
            // Update disabled logic for clarity and completeness
            disabled={!isCheckoutReady || isProcessingPayment}
            className="yoco-pay-button"
          >
            {isProcessingPayment ? 'Processing...' : `Pay R${displayGrandTotal.toFixed(2)} with Yoco`}
          </button>
           {/* Optional: Show detailed disable reason for debugging */}
           {/* {!isCheckoutReady && <p style={{fontSize: '0.8em', color: 'grey'}}>Please complete address and delivery options.</p>} */}
        </section>

        {/* Actions Menu */}
        <menu className="actions">
          <li>
            <Link to="/cart" className="back-link">Back to Cart</Link>
          </li>
        </menu>
      </div> {/* End checkout-layout wrapper */}
    </main>
  );
}