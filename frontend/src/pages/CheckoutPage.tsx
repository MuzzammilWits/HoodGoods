// frontend/src/pages/CheckoutPage.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './CheckoutPage.css'; // Ensure CSS is linked
import { useCart } from '../context/ContextCart'; // Assuming path is correct
import { useAuth0 } from '@auth0/auth0-react';
import axios, { AxiosError } from 'axios';

// --- Interfaces ---
type CartItemDisplay = {
  id: string; // Likely mapped from productId
  productId: number;
  name: string;
  productName: string;
  price: number;
  productPrice: number;
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

// --- Pickup Locations Data Structure ---
const pickupLocationsData: Record<string, string[]> = {
    "Area1": ["Area 1 - Pickup Point Alpha", "Area 1 - Pickup Point Beta"],
    "Area2": ["Area 2 - Pickup Point Gamma", "Area 2 - Pickup Point Delta", "Area 2 - Pickup Point Epsilon"],
    "Area3": ["Area 3 - Pickup Point Zeta", "Area 3 - Pickup Point Eta", "Area 3 - Pickup Point Theta"]
};
// --- End Pickup Locations Data ---

const api = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000',
});

export default function CheckoutPage() {
  const { cartItems, clearCart, cartError: contextCartError } = useCart();
  const { user, getAccessTokenSilently, isAuthenticated, isLoading: isAuthLoading } = useAuth0();
  const navigate = useNavigate();

  const [selectedArea, setSelectedArea] = useState('');
  const [selectedPickupPoint, setSelectedPickupPoint] = useState('');
  const [deliverySelectionState, setDeliverySelectionState] = useState<Record<string, 'standard' | 'express'>>({});
  const [storeDeliveryOptions, setStoreDeliveryOptions] = useState<DeliveryOptionsResponse>({});
  const [isLoadingDeliveryOptions, setIsLoadingDeliveryOptions] = useState(false);
  const [deliveryOptionsError, setDeliveryOptionsError] = useState<string | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const paymentTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const yocoInstanceRef = useRef<any>(null);

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

  useEffect(() => {
    if (!isAuthenticated || uniqueStoreIds.length === 0) {
      setStoreDeliveryOptions({}); setDeliverySelectionState({}); return;
    }
    const fetchOptions = async () => {
        setIsLoadingDeliveryOptions(true); setDeliveryOptionsError(null);
        try {
            const token = await getAccessTokenSilently();
            const response = await api.post<DeliveryOptionsResponse>('/stores/delivery-options', { storeIds: uniqueStoreIds }, { headers: { Authorization: `Bearer ${token}` } });
            const fetchedOptions = response.data || {};
            setStoreDeliveryOptions(fetchedOptions);
            setDeliverySelectionState(prev => {
                const newState: Record<string, 'standard' | 'express'> = {};
                uniqueStoreIds.forEach(id => { if (fetchedOptions[id]) { newState[id] = prev[id] || 'standard'; } });
                Object.keys(prev).forEach(id => { if (uniqueStoreIds.includes(id) && fetchedOptions[id] && !newState[id]) { newState[id] = prev[id]; } });
                return newState;
            });
        } catch (error) {
            console.error("Failed to fetch delivery options:", error);
            const msg = error instanceof AxiosError ? error.response?.data?.message || error.message : 'Could not load delivery options.';
            setDeliveryOptionsError(msg); setStoreDeliveryOptions({}); setDeliverySelectionState({});
        } finally { setIsLoadingDeliveryOptions(false); }
    }; fetchOptions();
  }, [uniqueStoreIds, isAuthenticated, getAccessTokenSilently]);

  useEffect(() => {
    return () => {
        if (paymentTimeoutRef.current) { clearTimeout(paymentTimeoutRef.current); }
        try { if (yocoInstanceRef.current?.closePopup) { yocoInstanceRef.current.closePopup(); } } catch (e) { console.error("Error closing Yoco on unmount:", e); }
    };
  }, []);

  const calculateStoreSubtotal = (items: CartItemDisplay[]): number => items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const calculateTotalDelivery = (): number => Object.keys(deliverySelectionState).reduce((sum, storeId) => { const opt = deliverySelectionState[storeId]; const details = storeDeliveryOptions[storeId]; if (!opt || !details) return sum; const price = opt === 'standard' ? details.standardPrice : details.expressPrice; return sum + (Number(price) || 0); }, 0);
  const grandTotal = useMemo(() => { const itemsSub = cartItems?.reduce((s, i) => s + (i.productPrice * i.quantity), 0) ?? 0; const delTotal = calculateTotalDelivery(); return itemsSub + delTotal; }, [cartItems, deliverySelectionState, storeDeliveryOptions]);

  const handleDeliveryOptionChange = (storeId: string, selection: string) => { if (selection === 'standard' || selection === 'express') { setDeliverySelectionState(prev => ({ ...prev, [storeId]: selection })); } };
  const handleAreaChange = (event: React.ChangeEvent<HTMLSelectElement>) => { const newArea = event.target.value; setSelectedArea(newArea); setSelectedPickupPoint(''); };

  const handlePayment = async () => {
    if (!isAuthenticated || !user || cartItems.length === 0) { setPaymentError("Please log in and ensure your cart is not empty."); return; }
    if (!selectedArea || !selectedPickupPoint) { setPaymentError("Please select a pickup area and point."); return; }
    if (uniqueStoreIds.some(id => !deliverySelectionState[id])) { setPaymentError("Please select a delivery option for all stores."); return; }
    if (grandTotal <= 0) { setPaymentError("Cannot process payment with zero or negative total."); return; }

    setIsProcessingPayment(true);
    setPaymentError(null);

    if (paymentTimeoutRef.current) { clearTimeout(paymentTimeoutRef.current); paymentTimeoutRef.current = null; }
    yocoInstanceRef.current = null;

    const performCleanup = () => {
        setIsProcessingPayment(false);
        try { if (yocoInstanceRef.current?.closePopup) { yocoInstanceRef.current.closePopup(); } }
        catch (closeError) { console.error("Cleanup: Error closing via SDK:", closeError); }
        setTimeout(() => {
            const yocoPopupElement = document.querySelector('.yc-auto-shown-popup');
            if (yocoPopupElement) yocoPopupElement.remove();
        }, 0);
        if (paymentTimeoutRef.current) { clearTimeout(paymentTimeoutRef.current); paymentTimeoutRef.current = null; }
    };

    try {
        const token = await getAccessTokenSilently();
        const response = await api.post<InitiatePaymentResponse>('/payments/initiate-yoco', { amount: Math.round(grandTotal * 100), currency: 'ZAR' }, { headers: { Authorization: `Bearer ${token}` } });
        const { checkoutId } = response.data;
        if (!checkoutId) throw new Error("Missing checkoutId from backend.");

        const yoco = new YocoSDK({ publicKey: 'pk_test_ed3c54a6gOol69qa7f45' });
        yocoInstanceRef.current = yoco;

        yoco.showPopup({
            checkoutId: checkoutId, amountInCents: Math.round(grandTotal * 100), currency: 'ZAR',
            callback: async (result: any) => {
                let outcomeError: string | null = null;
                let shouldClearCartAndNavigate = false;
                try {
                    if (result.error) { outcomeError = `Payment failed: ${result.error.message || 'Unknown error'}`; }
                    else if (result.status === 'successful' || result.status === 'pending' || result.status === 'charge_ready') {
                        const yocoChargeId = result.id || result.chargeId || result.paymentId || 'yoco_id_not_found';
                        const backendCartItems = cartItems.map(item => ({ productId: item.productId, quantity: item.quantity, pricePerUnitSnapshot: item.productPrice, storeId: item.storeId.toString() }));
                        const orderPayload = { cartItems: backendCartItems, deliverySelections: deliverySelectionState, selectedArea, selectedPickupPoint, yocoChargeId, frontendGrandTotal: grandTotal };
                        try { const backendToken = await getAccessTokenSilently(); await api.post('/orders/create', orderPayload, { headers: { Authorization: `Bearer ${backendToken}` } }); shouldClearCartAndNavigate = true; }
                        catch (backendError) { outcomeError = "Order Placement Failed. Please contact support if payment was taken."; shouldClearCartAndNavigate = false; }
                    }
                    else if (result.status === 'failed') { outcomeError = "Payment failed."; }
                    else if (result.status === 'cancelled') { outcomeError = "Payment was cancelled."; }
                    else { outcomeError = `Unexpected payment status: ${result.status}. Please contact support if payment was taken.`; }

                    if (outcomeError) { setPaymentError(outcomeError); }
                } catch (callbackLogicError) { console.error("Error inside Yoco callback:", callbackLogicError); setPaymentError("Unexpected error after payment attempt."); shouldClearCartAndNavigate = false; }
                finally { performCleanup(); }

                if (shouldClearCartAndNavigate) {
                    try { await clearCart(); navigate('/order-confirmation'); }
                    catch (clearError) { console.error("Failed to clear cart:", clearError); setPaymentError("Order placed, but failed to clear cart locally."); navigate('/order-confirmation'); }
                }
            }
        });

        paymentTimeoutRef.current = setTimeout(() => {
            setPaymentError("Payment process timed out. If payment was made, please contact support. Otherwise, try again.");
            performCleanup();
            paymentTimeoutRef.current = null;
        }, 45000); // 45 seconds, Yoco default might be longer

    } catch (error) {
        const errorMsg = error instanceof AxiosError ? error.response?.data?.message || error.message : 'Payment initiation failed';
        setPaymentError(errorMsg);
        setIsProcessingPayment(false);
        if (paymentTimeoutRef.current) { clearTimeout(paymentTimeoutRef.current); paymentTimeoutRef.current = null; }
    }
  };

  if (isAuthLoading) return <p className="loading-auth-message">Loading authentication...</p>;
  if (!isAuthenticated) return ( <main className="checkout-container"><header><h1>Checkout</h1></header><p>Please log in to proceed with checkout.</p></main> );
  if (cartItems === null) return <p className="loading-cart-message">Loading cart...</p>;
  if (cartItems.length > 0 && isLoadingDeliveryOptions) { return <p className="loading-delivery-message">Loading checkout details...</p>; }
  if (cartItems.length === 0) return ( <main className="checkout-container"><header><h1>Checkout</h1></header><p>Your cart is empty.</p><Link to="/products" className="back-link">Continue Shopping</Link></main> );

  const displayGrandTotal = typeof grandTotal === 'number' && !isNaN(grandTotal) ? grandTotal : 0;
  const isCheckoutReady = !isProcessingPayment && !isLoadingDeliveryOptions && !deliveryOptionsError && selectedArea && selectedPickupPoint && uniqueStoreIds.length > 0 && !uniqueStoreIds.some(id => !deliverySelectionState[id]) && displayGrandTotal > 0;

  return (
    <main className="checkout-container">
      <section className="main-titles">
        <h1>Checkout</h1>
      </section>
      <header>
        <h1>Checkout</h1>
        <p className="instructions">Please select your pickup location, review delivery options, and complete your order.</p>
        {contextCartError && <p className="error-message cart-error">Cart Notice: {contextCartError}</p>}
        {deliveryOptionsError && <p className="error-message delivery-error">Delivery Error: {deliveryOptionsError}</p>}
        {paymentError && <p className="error-message payment-error">Payment Error: {paymentError}</p>}
      </header>

      <section className="checkout-layout">
        <section className="form-section pickup-location-section" aria-labelledby="pickup-location-heading">
            <h2 id="pickup-location-heading">1. Pickup Location</h2>
            <p className="form-field">
                <label htmlFor="delivery-area">Select Area:</label>
                <select id="delivery-area" className="form-input" value={selectedArea} onChange={handleAreaChange} required aria-required="true">
                    <option value="" disabled>Select an area...</option>
                    {Object.keys(pickupLocationsData).map(area => (<option key={area} value={area}>{area}</option>))}
                </select>
            </p>
            <p className="form-field">
                <label htmlFor="pickup-point">Select Pickup Point:</label>
                <select id="pickup-point" className="form-input" value={selectedPickupPoint} onChange={(e) => setSelectedPickupPoint(e.target.value)} required aria-required="true" disabled={!selectedArea}>
                    <option value="" disabled>Select a pickup point...</option>
                    {selectedArea && pickupLocationsData[selectedArea]?.map(point => (<option key={point} value={point}>{point}</option>))}
                </select>
                {!selectedArea && <small className="field-hint">Please select an area first.</small>}
            </p>
           </section>

        <section className="form-section order-summary-section" aria-labelledby="order-summary-heading">
          <h2 id="order-summary-heading">2. Order Summary & Delivery</h2>
          {uniqueStoreIds.map(storeId => {
            const items = groupedItemsByStoreId[storeId];
            const deliveryDetails = storeDeliveryOptions[storeId];
            const currentSelection = deliverySelectionState[storeId];
            if (!items || items.length === 0) return null;
            const storeName = items[0]?.storeName || `Store ID: ${storeId}`;
            return (
              <article key={storeId} className="store-group" aria-labelledby={`store-heading-${storeId}`}>
                <h3 id={`store-heading-${storeId}`} className="store-name">{storeName}</h3>
                <section className="delivery-option form-field"> {/* Changed div to section */}
                  <label htmlFor={`delivery-${storeId}`}>Delivery Option:</label>
                  {isLoadingDeliveryOptions ? (<p className="loading-options-text">Loading options...</p>) : !deliveryDetails ? (<p className="error-message delivery-unavailable-text">Delivery Unavailable</p>) : (
                    <select id={`delivery-${storeId}`} className="form-input" value={currentSelection || ''} onChange={(e) => handleDeliveryOptionChange(storeId, e.target.value)} required aria-required="true">
                      <option value="standard"> Standard - R{deliveryDetails.standardPrice.toFixed(2)} ({deliveryDetails.standardTime}) </option>
                      <option value="express"> Express - R{deliveryDetails.expressPrice.toFixed(2)} ({deliveryDetails.expressTime}) </option>
                    </select>
                  )}
                </section>
                <ul className="order-items" aria-label={`Items from ${storeName}`}>
                  {items.map(item => ( <li key={`${item.productId}-${storeId}`} className="order-item"> {item.name} - R{item.price.toFixed(2)} &times; {item.quantity} </li> ))}
                </ul>
                <footer className="store-summary">
                  <p>Items Subtotal: R{calculateStoreSubtotal(items).toFixed(2)}</p>
                  {deliveryDetails && currentSelection && (<p>Delivery: R{(currentSelection === 'standard' ? deliveryDetails.standardPrice : deliveryDetails.expressPrice).toFixed(2)}</p>)}
                </footer>
              </article>
            );
          })}
          <footer className="order-totals">
            <p className="grand-total">Grand Total: R{displayGrandTotal.toFixed(2)}</p>
          </footer>
        </section>

        <section className="payment-section">
            <h2 style={{marginBottom: '10px'}}>3. Payment</h2>
          <button type="button" onClick={handlePayment} disabled={!isCheckoutReady || isProcessingPayment} className="yoco-pay-button">
            {isProcessingPayment ? 'Processing Payment...' : `Pay R${displayGrandTotal.toFixed(2)} Securely with Yoco`}
          </button>
          {!isCheckoutReady && !isProcessingPayment && !deliveryOptionsError &&
            <p className="field-hint payment-hint"> Please select area, pickup point, and delivery options for all items to proceed. </p>
          }
        </section>

        <menu className="actions">
          <li><Link to="/cart" className="back-link">&larr; Back to Cart</Link></li>
        </menu>
      </section>
    </main>
  );
}