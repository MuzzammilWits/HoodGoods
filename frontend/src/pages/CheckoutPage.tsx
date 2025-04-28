import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './CheckoutPage.css'; // Ensure CSS is linked
import { useCart } from '../context/ContextCart';
import { useAuth0 } from '@auth0/auth0-react';
import axios, { AxiosError } from 'axios';

// --- Interfaces ---
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

  // --- State ---
  const [streetAddress, setStreetAddress] = useState('');
  const [deliveryArea, setDeliveryArea] = useState('');
  const [deliverySelectionState, setDeliverySelectionState] = useState<Record<string, 'standard' | 'express'>>({});
  const [storeDeliveryOptions, setStoreDeliveryOptions] = useState<DeliveryOptionsResponse>({});
  const [isLoadingDeliveryOptions, setIsLoadingDeliveryOptions] = useState(false);
  const [deliveryOptionsError, setDeliveryOptionsError] = useState<string | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Axios instance
  const api = axios.create({
    baseURL: import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000',
  });

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
        setDeliverySelectionState(prev => {
            const newSelectionState: Record<string, 'standard' | 'express'> = {};
            uniqueStoreIds.forEach(id => {
                if (fetchedOptions[id]) {
                    newSelectionState[id] = prev[id] || 'standard';
                }
            });
            Object.keys(prev).forEach(id => {
                if (uniqueStoreIds.includes(id) && fetchedOptions[id]) {
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
  }, [uniqueStoreIds, isAuthenticated, getAccessTokenSilently]);

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
    const itemsSubtotal = cartItems.reduce((sum, item) => sum + (item.productPrice * item.quantity), 0);
    const deliveryTotal = calculateTotalDelivery();
    return itemsSubtotal + deliveryTotal;
  }, [cartItems, deliverySelectionState, storeDeliveryOptions]);

  // --- Event Handlers ---
  const handleDeliveryOptionChange = (storeId: string, selection: string) => {
      if (selection === 'standard' || selection === 'express') {
          setDeliverySelectionState(prev => ({ ...prev, [storeId]: selection }));
      }
  };

  // Renamed back to handlePayment, triggered by button onClick
  const handlePayment = async () => {
     // Validation Checks
     if (!isAuthenticated || !user) { setPaymentError("Please log in to proceed."); return; }
     if (cartItems.length === 0) { setPaymentError("Your cart is empty."); return; }
     if (!streetAddress || !deliveryArea) { setPaymentError("Please fill in your delivery address and select an area."); return; }
     if (isLoadingDeliveryOptions) { setPaymentError("Please wait, loading delivery options."); return; }
     if (deliveryOptionsError) { setPaymentError(`Cannot proceed: ${deliveryOptionsError}`); return; }
     if (uniqueStoreIds.some(id => !deliverySelectionState[id])) { setPaymentError("Please select a delivery option for all stores."); return; }

     setIsProcessingPayment(true);
     setPaymentError(null);

     try {
       const token = await getAccessTokenSilently();
       // 1. Initiate payment
       console.log("Initiating payment with backend...");
       const response = await api.post<InitiatePaymentResponse>('/payments/initiate-yoco',
         { amount: Math.round(grandTotal * 100), currency: 'ZAR', metadata: { /* ... */ } },
         { headers: { Authorization: `Bearer ${token}` } }
       );
       const { checkoutId } = response.data;
       if (!checkoutId) throw new Error("Missing checkoutId from backend.");

       // 2. Initialize Yoco SDK
       const yoco = new YocoSDK({ publicKey: 'pk_test_ed3c54a6gOol69qa7f45' }); // Your TEST key

       console.log("Showing Yoco popup...");
       yoco.showPopup({
         checkoutId: checkoutId,
         amountInCents: Math.round(grandTotal * 100),
         currency: 'ZAR',
         callback: async (result: any) => {
           console.log("Yoco SDK Callback Result:", result);
           // Only set isProcessingPayment to false on *final* states

           if (result.error) {
             setIsProcessingPayment(false); // Final state: Error
             console.error("Yoco Payment Error:", result.error);
             setPaymentError(`Payment failed: ${result.error.message || 'Please try again.'}`);

           } else if (result.status === 'successful' || result.status === 'pending') {
             setIsProcessingPayment(false); // Final state: Success/Pending
             console.log(`Yoco Payment Status: ${result.status}. Clearing cart and navigating.`);
             try {
                 await clearCart();
                 navigate('/order-confirmation');
             } catch(clearError) {
                 console.error("Error clearing cart after payment:", clearError);
                 setPaymentError("Payment successful, but failed to clear cart. Please contact support.");
                 navigate('/order-confirmation');
             }

           } else if (result.status === 'charge_ready') {
             // NOT a final state - keep processing indicator active OR show specific message
             // setIsProcessingPayment(true); // Keep true
             console.log("Yoco Payment Status: charge_ready. Waiting for 3DS or further action.");
             setPaymentError(null); // Clear previous errors

           } else if (result.status === 'failed') {
             setIsProcessingPayment(false); // Final state: Failed
             console.warn("Yoco Payment explicitly failed.");
             setPaymentError("Payment failed. Please check your details or try another card.");

           } else if (result.status === 'cancelled') {
             setIsProcessingPayment(false); // Final state: Cancelled
             console.warn("Yoco Payment was cancelled by the user.");
             setPaymentError("Payment was cancelled.");

           } else {
             setIsProcessingPayment(false); // Final state: Unknown/Other
             console.warn("Yoco Payment resulted in unexpected status:", result.status);
             setPaymentError(`Payment outcome uncertain (${result.status}). Please check your confirmation or contact support.`);
           }
         } // End callback
       }); // End showPopup

     } catch (error) { // Catch errors from initiation or SDK setup
       console.error("Failed to initiate payment or Yoco SDK error:", error);
       const errorMsg = error instanceof AxiosError ? error.response?.data?.message || error.message : error instanceof Error ? error.message : 'Payment initiation failed';
       setPaymentError(errorMsg);
       setIsProcessingPayment(false); // Ensure processing stops on initiation error
     }
  }; // End handlePayment


  // --- Render Logic ---
  // (Loading/Empty states remain the same)
  if (isAuthLoading) return <p>Loading authentication...</p>;
  if (!isAuthenticated) return ( <main className="checkout-container"><h1>Checkout</h1><p>Please log in to view checkout.</p></main> );
  if (cartItems === null || (cartItems.length > 0 && isLoadingDeliveryOptions)) { return <p>Loading checkout details...</p>; }
  if (cartItems.length === 0) return ( <main className="checkout-container"><h1>Checkout</h1><p>Your cart is empty.</p><Link to="/products" className="back-link">Continue Shopping</Link></main> );

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

      {/* FIX: Changed back to a non-form wrapper (e.g., div or section) */}
      <div className="checkout-layout"> {/* Changed class name for clarity */}

        {/* Delivery Address Section */}
        <section className="form-section delivery-address-section" aria-labelledby="delivery-address-heading">
           <h2 id="delivery-address-heading">Delivery Address</h2>
           {/* Use p for simple field grouping */}
           <p className="form-field">
             <label htmlFor="street-address">Street Address</label>
             <input id="street-address" type="text" className="form-input" value={streetAddress} onChange={(e) => setStreetAddress(e.target.value)} required autoComplete="street-address"/>
           </p>
           <p className="form-field">
             <label htmlFor="delivery-area">Delivery Area</label>
             <select id="delivery-area" className="form-input" value={deliveryArea} onChange={(e) => setDeliveryArea(e.target.value)} required>
               <option value="" disabled>Select an area...</option>
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
            const currentSelection = deliverySelectionState[storeId] || 'standard';
            if (!items || items.length === 0) return null;
            const storeName = items[0]?.storeName || `Store ID: ${storeId}`;

            return (
              <article key={storeId} className="store-group" aria-labelledby={`store-heading-${storeId}`}>
                <h3 id={`store-heading-${storeId}`} className="store-name">{storeName}</h3>
                {/* Delivery Options Dropdown */}
                {/* Use div as container */}
                <div className="delivery-option form-field">
                   <label htmlFor={`delivery-${storeId}`}>Delivery Option</label>
                   {!deliveryDetails ? (
                       // Render text directly
                       "Loading delivery options..."
                   ) : (
                       <select id={`delivery-${storeId}`} className="form-input" value={currentSelection} onChange={(e) => handleDeliveryOptionChange(storeId, e.target.value)}>
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
                  {deliveryDetails && (<p>Delivery: R{(currentSelection === 'standard' ? deliveryDetails.standardPrice : deliveryDetails.expressPrice).toFixed(2)}</p>)}
                </footer>
              </article>
            );
          })}
          {/* Grand Total Section */}
          <footer className="order-totals">
            <p className="grand-total">Grand Total: R{grandTotal.toFixed(2)}</p>
          </footer>
        </section>

        {/* Payment Button Section */}
        <section className="payment-section">
           {/* Display payment-specific error */}
           {paymentError && <p style={{ color: 'red' }}>Payment Error: {paymentError}</p>}
           {/* FIX: Changed back to type="button" and added onClick */}
           <button
             type="button" // <<< Use button type
             onClick={handlePayment} // <<< Use onClick handler
             disabled={isProcessingPayment || isLoadingDeliveryOptions || !!deliveryOptionsError || !streetAddress || !deliveryArea || uniqueStoreIds.length === 0 || uniqueStoreIds.some(id => !deliverySelectionState[id])}
             className="yoco-pay-button" // Keep original class name
           >
             {isProcessingPayment ? 'Processing...' : `Pay R${grandTotal.toFixed(2)} with Yoco`}
           </button>
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
