import React, { useState, useEffect } from 'react';
import { useCart } from '../context/ContextCart'; // Adjust path as needed
import { useAuth0 } from '@auth0/auth0-react';
import axios, { AxiosError } from 'axios'; // Import AxiosError
import { useNavigate } from 'react-router-dom'; // For redirection after payment

// Interface for the expected response from your backend's initiate endpoint
interface InitiatePaymentResponse {
  checkoutId: string;
}

// ** IMPORTANT: Add Yoco SDK script to your public/index.html **
// <script src="https://js.yoco.com/sdk/v1/yoco-sdk-web.js"></script>
// Make sure the YocoSDK type is available globally (you might need to declare it)
declare const YocoSDK: any; // Basic declaration, consider installing types if available

// Renamed component from CheckoutPage to PayPage
const PayPage: React.FC = () => {
  // *** FIX: Added cartError and clearCart to destructuring ***
  const { cartItems, totalPrice, isLoading: isCartLoading, clearCart, cartError } = useCart();
  const { user, getAccessTokenSilently, isAuthenticated } = useAuth0();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null); // Local state for payment-specific errors
  const navigate = useNavigate();

  const api = axios.create({
    baseURL: import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000',
  });

  // Function to initiate payment with your backend
  const handlePayment = async () => {
    if (!isAuthenticated || !user || cartItems.length === 0) {
      setPaymentError("Cannot proceed to payment. Ensure you are logged in and have items in your cart.");
      return;
    }

    setIsProcessing(true);
    setPaymentError(null); // Clear previous payment errors

    try {
      const token = await getAccessTokenSilently();

      // 1. Call your backend to initiate payment and get checkoutId
      console.log("Initiating payment with backend...");
      const response = await api.post<InitiatePaymentResponse>('/payments/initiate-yoco',
        {
          amount: Math.round(totalPrice * 100), // Send amount in cents, ensure it's an integer
          currency: 'ZAR', // Or your desired currency
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const { checkoutId } = response.data;
      console.log("Received checkoutId:", checkoutId);

      if (!checkoutId) {
        throw new Error("Missing checkoutId from backend.");
      }

      // 2. Initialize Yoco Inline SDK
      const yoco = new YocoSDK({
        publicKey: 'pk_test_ed3c54a6gOol69qa7f45', // Using Test Public Key
      });

      console.log("Showing Yoco popup...");
      yoco.showPopup({
        checkoutId: checkoutId,
        amountInCents: Math.round(totalPrice * 100), // Ensure integer amount
        currency: 'ZAR',
        callback: async (result: any) => {
          console.log("Yoco SDK Callback Result:", result); // Log the full result
          setIsProcessing(false); // Stop processing indicator

          // Check for explicit error first
          if (result.error) {
            console.error("Yoco Payment Error:", result.error);
            setPaymentError(`Payment failed: ${result.error.message || 'Please try again.'}`);
          }
          // Check for success/pending/charge_ready statuses
          else if (result.status === 'successful' || result.status === 'pending' || result.status === 'charge_ready') {
             console.log(`Yoco Payment Status on Frontend: ${result.status}`);
             // *** ADDED: Clear cart optimistically on frontend success indication ***
             try {
                console.log("Clearing cart on frontend...");
                await clearCart(); // Call clearCart from context
                console.log("Frontend cart cleared.");
             } catch (clearError) {
                console.error("Error clearing cart on frontend:", clearError);
                // Optionally set an error message, but proceed with navigation
                // setPaymentError("Payment likely succeeded, but failed to clear cart display.");
             }
             navigate('/order-confirmation'); // Redirect on success/pending/charge_ready
          }
          // Handle other specific statuses if known
          else if (result.status === 'failed') {
             console.warn("Yoco Payment explicitly failed.");
             setPaymentError("Payment failed. Please check your details or try another card.");
          } else if (result.status === 'cancelled') {
             console.warn("Yoco Payment was cancelled by the user.");
             setPaymentError("Payment was cancelled.");
          }
          // Fallback for any other unexpected result/status
          else {
             console.warn("Yoco Payment resulted in unexpected status:", result.status);
             setPaymentError("Payment outcome uncertain. Please check your confirmation or contact support."); // Updated fallback message
          }
        }
      });

    } catch (error) {
      console.error("Failed to initiate payment:", error);
      const errorMsg = axios.isAxiosError(error) ? error.response?.data?.message || error.message : 'Payment initiation failed';
      setPaymentError(errorMsg); // Set payment-specific error state
      setIsProcessing(false);
    }
  };

  if (isCartLoading) {
    // Use the nicer spinner class if you added it previously
    return (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading checkout...</p>
        </div>
      );
  }

  return (
    <main className="checkout-container"> {/* Add appropriate styling */}
      <h1>Checkout</h1>
      {/* Display cart error from context if present */}
      {/* This uses the cartError from the useCart hook */}
      {cartError && <p style={{ color: 'orange', fontWeight: 'bold' }}>Cart Notice: {cartError}</p>}

      <section className="order-summary">
        <h2>Order Summary</h2>
        {cartItems.length === 0 ? (
          <p>Your cart is empty.</p>
        ) : (
          <ul>
            {cartItems.map(item => (
              <li key={item.productId}>
                {item.productName} (x{item.quantity}) - R{(Number(item.productPrice) * item.quantity).toFixed(2)}
              </li>
            ))}
          </ul>
        )}
        <h3>Total: R{totalPrice.toFixed(2)}</h3>
      </section>

      <section className="payment-section">
        {/* Display payment-specific error from local state */}
        {paymentError && <p style={{ color: 'red' }}>Payment Error: {paymentError}</p>}
        <button
          onClick={handlePayment}
          disabled={isProcessing || cartItems.length === 0 || !isAuthenticated}
          className="yoco-pay-button" // Style this button
        >
          {isProcessing ? 'Processing...' : `Pay R${totalPrice.toFixed(2)} with Yoco`}
        </button>
      </section>
    </main>
  );
};

// Updated default export
export default PayPage;
