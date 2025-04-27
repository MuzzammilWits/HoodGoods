import React, { useState, useEffect, useMemo } from 'react'; // Added useMemo
import { Link, useNavigate } from 'react-router-dom'; // Added useNavigate
import './CheckoutPage.css'; // Make sure this CSS file exists and is linked
import { useCart } from '../context/ContextCart';
import { useAuth0 } from '@auth0/auth0-react'; // Added useAuth0
import axios, { AxiosError } from 'axios'; // Added axios and AxiosError

// Interface for items displayed within this component
type CartItemDisplay = {
  id: string; // Product ID as string
  name: string;
  price: number;
  quantity: number;
  storeName: string;
};

// Define the structure for delivery options
type DeliveryOption = {
  id: string;
  name: string;
  price: number;
  days: string;
};

// Interface for the expected response from your backend's initiate endpoint
interface InitiatePaymentResponse {
  checkoutId: string;
}

// Yoco SDK Declaration
// ** IMPORTANT: Add Yoco SDK script to your public/index.html **
// <script src="https://js.yoco.com/sdk/v1/yoco-sdk-web.js"></script>
declare const YocoSDK: any; // Basic declaration

// Renamed back to CheckoutPage
export default function CheckoutPage() {
  // --- Hooks ---
  // Hooks from original CheckoutPage
  const { cartItems, clearCart, cartError: contextCartError } = useCart(); // Added clearCart and contextCartError

  // Hooks needed for Payment Logic (from PayPage)
  const { user, getAccessTokenSilently, isAuthenticated, isLoading: isAuthLoading } = useAuth0(); // isAuthLoading for initial auth check
  const [isProcessingPayment, setIsProcessingPayment] = useState(false); // Renamed state for clarity
  const [paymentError, setPaymentError] = useState<string | null>(null); // Local state for payment-specific errors
  const navigate = useNavigate();

  // State from original CheckoutPage
  const [streetAddress, setStreetAddress] = useState('');
  const [deliveryArea, setDeliveryArea] = useState('');

  // Axios instance (from PayPage)
  const api = axios.create({
    baseURL: import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000',
  });

  // --- Data Processing (from original CheckoutPage) ---

  // Hardcoded delivery areas and options
  const deliveryAreas = ['Area 1', 'Area 2', 'Area 3'];
  const deliveryOptions: DeliveryOption[] = [
    { id: 'standard', name: 'Standard Delivery', price: 50, days: '3-5 business days' },
    { id: 'express', name: 'Express Delivery', price: 100, days: '1-2 business days' }
  ];

  // Get unique store names from cart items using useMemo
  const storeNames = useMemo(() =>
    [...new Set(cartItems.map(item => item.storeName || 'Unknown Store'))]
  , [cartItems]);

  // Group items by store name using useMemo
  const groupedItems = useMemo(() =>
    cartItems.reduce((groups, item) => {
      const key = item.storeName || 'Unknown Store';
      if (!groups[key]) {
        groups[key] = [];
      }
      // Map CartItemUI to CartItemDisplay
      groups[key].push({
        id: item.productId.toString(), // Convert productId to string id
        name: item.productName,
        price: item.productPrice,
        quantity: item.quantity,
        storeName: key
      });
      return groups;
    }, {} as Record<string, CartItemDisplay[]>)
  , [cartItems]);

  // Initialize delivery option state for each store
  const [deliveryOptionState, setDeliveryOptionState] = useState<Record<string, string>>(() =>
    storeNames.reduce((acc, storeName) => {
      acc[storeName] = 'standard'; // Default to standard
      return acc;
    }, {} as Record<string, string>)
  );

  // Update delivery state if storeNames change (e.g., item removed from cart)
  useEffect(() => {
    setDeliveryOptionState(prev => {
      const newState = { ...prev };
      let changed = false;
      // Add default for new stores
      storeNames.forEach(name => {
        if (!(name in newState)) {
          newState[name] = 'standard';
          changed = true;
        }
      });
      // Remove entries for stores no longer in cart
      Object.keys(newState).forEach(name => {
        if (!storeNames.includes(name)) {
          delete newState[name];
          changed = true;
        }
      });
      return changed ? newState : prev;
    });
  }, [storeNames]);


  // --- Calculation Functions (from original CheckoutPage) ---

  const calculateStoreSubtotal = (items: CartItemDisplay[]): number => {
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  const calculateTotalDelivery = (): number => {
    return storeNames.reduce((sum, storeName) => {
      const selectedOptionId = deliveryOptionState[storeName];
      const option = deliveryOptions.find(opt => opt.id === selectedOptionId);
      return sum + (option?.price || 0);
    }, 0);
  };

  // Use useMemo for grand total calculation
  const grandTotal = useMemo(() => {
    const itemsSubtotal = Object.values(groupedItems)
                              .flat()
                              .reduce((sum, item) => sum + item.price * item.quantity, 0);
    const deliveryTotal = calculateTotalDelivery();
    return itemsSubtotal + deliveryTotal;
  }, [groupedItems, deliveryOptionState]); // Recalculate when items or delivery options change


  // --- Event Handlers ---

  // Delivery option change handler (from original CheckoutPage)
  const handleDeliveryOptionChange = (storeName: string, optionId: string) => {
    setDeliveryOptionState(prev => ({
      ...prev,
      [storeName]: optionId
    }));
  };

  // Payment handler (adapted from PayPage)
  const handlePayment = async () => {
    // Basic validation
    if (!isAuthenticated || !user || cartItems.length === 0) {
      setPaymentError("Cannot proceed to payment. Ensure you are logged in and have items in your cart.");
      return;
    }
    if (!streetAddress || !deliveryArea) {
        setPaymentError("Please fill in your delivery address and select an area.");
        return;
    }

    setIsProcessingPayment(true);
    setPaymentError(null);

    try {
      const token = await getAccessTokenSilently();

      // 1. Call backend to initiate payment
      console.log("Initiating payment with backend...");
      const response = await api.post<InitiatePaymentResponse>('/payments/initiate-yoco',
        {
          // Use the calculated grandTotal
          amount: Math.round(grandTotal * 100), // Send amount in cents
          currency: 'ZAR',
          // Optionally send more details if needed by backend
          // address: { street: streetAddress, area: deliveryArea },
          // deliveryOptions: deliveryOptionState,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const { checkoutId } = response.data;
      console.log("Received checkoutId:", checkoutId);
      if (!checkoutId) throw new Error("Missing checkoutId from backend.");

      // 2. Initialize Yoco SDK
      const yoco = new YocoSDK({
        publicKey: 'pk_test_ed3c54a6gOol69qa7f45', // Use Test Public Key
      });

      console.log("Showing Yoco popup...");
      yoco.showPopup({
        checkoutId: checkoutId,
        amountInCents: Math.round(grandTotal * 100),
        currency: 'ZAR',
        // You can add customer details here if desired
        // customer: { email: user.email, firstName: user.given_name, lastName: user.family_name },
        callback: async (result: any) => {
          console.log("Yoco SDK Callback Result:", result);

          let outcomeError: string | null = null;
          let shouldNavigate = false;
          let clearCartErrorOccurred = false;

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
             }
          } else if (result.status === 'failed') {
             console.warn("Yoco Payment explicitly failed.");
             outcomeError = "Payment failed. Please check your details or try another card.";
          } else if (result.status === 'cancelled') {
             console.warn("Yoco Payment was cancelled by the user.");
             outcomeError = "Payment was cancelled.";
          } else {
             console.warn("Yoco Payment resulted in unexpected status:", result.status);
             outcomeError = "Payment outcome uncertain. Please check your confirmation or contact support.";
          }

          if (outcomeError) setPaymentError(outcomeError);
          if (clearCartErrorOccurred) { /* Optionally handle cart clear error */ }
          if (shouldNavigate) navigate('/order-confirmation');

          setIsProcessingPayment(false); // Reset processing state
        }
      });

    } catch (error) {
      console.error("Failed to initiate payment:", error);
      const errorMsg = axios.isAxiosError(error) ? error.response?.data?.message || error.message : 'Payment initiation failed';
      setPaymentError(errorMsg);
      setIsProcessingPayment(false); // Reset processing state on error
    }
  };


  // --- Render Logic ---

  // Show loading if Auth0 is loading OR if cart items haven't loaded yet (and user is authenticated)
  if (isAuthLoading || (!cartItems && isAuthenticated)) {
     return (
        <div className="loading-container"> {/* Use spinner styles if defined */}
          <div className="spinner"></div>
          <p>Loading checkout...</p>
        </div>
      );
  }

  if (!isAuthenticated) {
      return (
          <main className="checkout-container">
              <h1>Checkout</h1>
              <p>Please log in to proceed with checkout.</p>
              {/* Optionally add login button here */}
          </main>
      );
  }

  if (cartItems.length === 0) {
    return (
      <main className="checkout-container">
        <h1>Checkout</h1>
        <p>Your cart is empty.</p>
        <Link to="/products" className="back-link">Continue Shopping</Link>
      </main>
    );
  }

  return (
    <main className="checkout-container">
      <header>
        <h1>Checkout</h1>
        <p className="instructions">Please enter your delivery details and review your order.</p>
        {/* Display general cart errors from context */}
        {contextCartError && <p style={{ color: 'orange', fontWeight: 'bold' }}>Cart Notice: {contextCartError}</p>}
      </header>

      {/* Use a div instead of form if payment button handles submission */}
      <div className="checkout-form">

        <section className="form-section delivery-address-section" aria-labelledby="delivery-address-heading">
          <h2 id="delivery-address-heading">Delivery Address</h2>
          <p className="form-field">
            <label htmlFor="street-address">Street Address</label>
            <input
              id="street-address"
              type="text"
              className="form-input"
              value={streetAddress}
              onChange={(e) => setStreetAddress(e.target.value)}
              required
              autoComplete="street-address"
            />
          </p>
          <p className="form-field">
            <label htmlFor="delivery-area">Delivery Area</label>
            <select
              id="delivery-area"
              className="form-input"
              value={deliveryArea}
              onChange={(e) => setDeliveryArea(e.target.value)}
              required
            >
              <option value="" disabled>Select an area...</option>
              {deliveryAreas.map(area => (
                <option key={area} value={area}>{area}</option>
              ))}
            </select>
          </p>
        </section>

        <section className="form-section order-summary-section" aria-labelledby="order-summary-heading">
          <h2 id="order-summary-heading">Order Summary</h2>

          {storeNames.map(storeName => {
            const items = groupedItems[storeName];
            if (!items || items.length === 0) return null;

            const selectedOptionId = deliveryOptionState[storeName] || 'standard';
            const selectedOption = deliveryOptions.find(opt => opt.id === selectedOptionId);

            return (
              <article key={storeName} className="store-group" aria-labelledby={`store-heading-${storeName}`}>
                <h3 id={`store-heading-${storeName}`} className="store-name">{storeName}</h3>

                <p className="delivery-option form-field">
                    <label htmlFor={`delivery-${storeName}`}>Delivery Option</label>
                    <select
                      id={`delivery-${storeName}`}
                      className="form-input"
                      value={selectedOptionId}
                      onChange={(e) => handleDeliveryOptionChange(storeName, e.target.value)}
                    >
                      {deliveryOptions.map(option => (
                        <option key={option.id} value={option.id}>
                          {option.name} - R{option.price.toFixed(2)} ({option.days})
                        </option>
                      ))}
                    </select>
                </p>

                <ul className="order-items" aria-label={`Items from ${storeName}`}>
                  {items.map(item => (
                    <li key={`${item.id}-${item.storeName}`} className="order-item">
                      {item.name} - R{item.price.toFixed(2)} × {item.quantity}
                    </li>
                  ))}
                </ul>

                <footer className="store-summary">
                  <p>Subtotal: R{calculateStoreSubtotal(items).toFixed(2)}</p>
                  <p>Delivery: R{(selectedOption?.price || 0).toFixed(2)}</p>
                </footer>
              </article>
            );
          })}

          <footer className="order-totals">
            <p className="grand-total">
                Grand Total: R{grandTotal.toFixed(2)}
            </p>
          </footer>
        </section>

        {/* --- Payment Section (from PayPage) --- */}
        <section className="payment-section">
          {/* Display payment-specific error */}
          {paymentError && <p style={{ color: 'red' }}>Payment Error: {paymentError}</p>}
          <button
            onClick={handlePayment}
            // Disable if processing, cart empty, not logged in, or address incomplete
            disabled={isProcessingPayment || cartItems.length === 0 || !isAuthenticated || !streetAddress || !deliveryArea}
            className="yoco-pay-button" // Style this button
          >
            {isProcessingPayment ? 'Processing...' : `Pay R${grandTotal.toFixed(2)} with Yoco`}
          </button>
        </section>

        {/* Actions Menu (Optional - Keep Back to Cart?) */}
        <menu className="actions">
          <li>
            <Link to="/cart" className="back-link">
              Back to Cart
            </Link>
          </li>
        </menu>
      </div>
    </main>
  );
}
