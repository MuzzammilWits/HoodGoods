// frontend/src/pages/CartPage.tsx
import React, { useState, useEffect } from 'react';
import { useCart, CartItemUI } from '../context/ContextCart';
import { Link, useLocation } from 'react-router-dom';
import './CartPage.css';

const CartPage: React.FC = () => {
  const {
    cartItems,
    removeFromCart,
    updateQuantity,
    totalPrice,
    clearCart,
    isLoading: contextIsLoading, // Renamed to avoid conflict with local loading/refreshing state
    cartError,
    fetchCart,
  } = useCart();

  const location = useLocation();

  // Local state to manage the "refresh requested by navigation" lifecycle.
  // This state is more robustly controlled within this component.
  const [isPageRefreshing, setIsPageRefreshing] = useState(() => {
    // Initialize based on navigation state. This function runs only once.
    const wasNavRefreshRequested = location.state?.refresh === true;
    if (wasNavRefreshRequested) {
      window.history.replaceState({}, document.title); // Clear history state immediately
      return true; // Start in a refreshing state if navigation requested it
    }
    return false;
  });

  useEffect(() => {
    // This effect triggers the actual data fetch if `isPageRefreshing` is true.
    if (isPageRefreshing) {
      // We only fetch if the cart had items initially.
      // This adheres to the "no skeleton for empty cart navigation" rule.
      if (cartItems.length > 0) {
        fetchCart().finally(() => {
          // CRITICAL: Always set isPageRefreshing to false after fetch completes.
          setIsPageRefreshing(false);
        });
      } else {
        // If cart was empty, no need to fetch, just turn off the refresh state.
        setIsPageRefreshing(false);
      }
    }
    // Note: The CartProvider handles the initial fetch on hard reload.
  }, [isPageRefreshing, cartItems.length, fetchCart]); // Effect dependencies

  // --- FINAL SKELETON DISPLAY LOGIC ---
  // Show skeleton if:
  // 1. The CartContext is loading (handles hard reloads where cartItems might be empty initially).
  // OR
  // 2. Our local page refresh is active AND there were items in the cart.
  const showSkeleton =
    (contextIsLoading && cartItems.length === 0) || // For hard reload: context is loading, cartItems is initially empty.
    (contextIsLoading && cartItems.length > 0) ||   // For hard reload: context is loading, cartItems might already be populated by a quick context.
    (isPageRefreshing && cartItems.length > 0);     // For navigation refresh: our local flag is active for a non-empty cart.


  if (showSkeleton) {
    return (
      <div className="cart-container" aria-busy="true" aria-label="Loading your shopping cart...">
        <header>
          <h1 className="skeleton-item skeleton-title" aria-hidden="true"></h1>
        </header>
        <section className="cart-content">
          <ul className="cart-items">
            {/* Show a number of skeleton items based on current cart size if known, or default to 1-2 */}
            {Array.from({ length: Math.max(cartItems.length, 1) }).map((_, index) => (
              <li key={index} className="cart-item skeleton-cart-item">
                <figure className="item-image-container skeleton-item skeleton-image-item" aria-hidden="true"></figure>
                <article className="item-details">
                  <p className="skeleton-item skeleton-text" aria-hidden="true"></p>
                  <p className="skeleton-item skeleton-text short" aria-hidden="true"></p>
                  <p className="skeleton-item skeleton-text medium" aria-hidden="true"></p>
                </article>
              </li>
            ))}
          </ul>
          <footer className="cart-summary">
            <h3 className="skeleton-item skeleton-summary-title" aria-hidden="true"></h3>
            <dl className="summary-details">
              <dt className="skeleton-item skeleton-text short" aria-hidden="true"></dt>
              <dd className="skeleton-item skeleton-text short" aria-hidden="true"></dd>
            </dl>
            <section className="cart-actions">
              <button className="skeleton-item skeleton-button" disabled aria-hidden="true"></button>
              <button className="skeleton-item skeleton-button" disabled aria-hidden="true"></button>
              <button className="skeleton-item skeleton-button" disabled aria-hidden="true"></button>
            </section>
          </footer>
        </section>
      </div>
    );
  }

  if (cartError) {
    return (
      <div className="cart-container">
        <header>
            <h1 className="cart-title">Your Shopping Cart</h1>
        </header>
        <section className="error-message" role="alert">
            <h2>Could Not Load Cart</h2>
            <p>{cartError}</p>
              <button onClick={() => window.location.reload()} className="retry-button">
                Refresh Page
            </button>
        </section>
      </div>
    );
  }

  return (
    <div className="cart-container">
      <header>
        <h1 className="cart-title">Your Shopping Cart</h1>
      </header>
      {cartItems.length === 0 ? (
        <section className="empty-cart">
          <p className="empty-text">Your cart is empty</p>
          <Link to="/products" className="continue-shopping-btn">
            Browse Products
          </Link>
        </section>
      ) : (
        <section className="cart-content">
          <ul className="cart-items">
            {cartItems.map((item: CartItemUI) => (
              <li key={item.productId} className="cart-item">
                <figure className="item-image-container">
                  <img src={item.imageUrl || '/placeholder.png'} alt={item.productName} className="item-image" />
                </figure>
                <article className="item-details">
                  <h3 className="item-name">{item.productName}</h3>
                  <p className="item-price">R{Number(item.productPrice).toFixed(2)}</p>
                  <section className="quantity-controls">
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                      className="quantity-btn"
                      aria-label={`Decrease quantity of ${item.productName}`}
                    >
                      −
                    </button>
                    <output className="quantity" aria-live="polite">{item.quantity}</output>
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                      disabled={item.availableQuantity != null && item.quantity >= item.availableQuantity}
                      className="quantity-btn"
                      aria-label={`Increase quantity of ${item.productName}`}
                    >
                      +
                    </button>
                  </section>
                  <p className="item-subtotal">
                    Subtotal: R{(Number(item.productPrice) * item.quantity).toFixed(2)}
                  </p>
                </article>
                <button
                  onClick={() => removeFromCart(item.productId)}
                  className="remove-btn"
                  aria-label={`Remove ${item.productName} from cart`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
          <footer className="cart-summary">
            <h3 className="summary-title">Order Summary</h3>
            <dl className="summary-details">
              <dt>Subtotal:</dt>
              <dd>R{Number(totalPrice).toFixed(2)}</dd>
            </dl>
            <section className="cart-actions">
              <Link to="/products" className="checkout-btn">
                Continue Shopping
              </Link>
              <Link to="/checkout" className="checkout-btn">
                Proceed to Checkout
              </Link>
              <button
                onClick={clearCart}
                className="checkout-btn clear-cart-btn"
              >
                Clear Cart
              </button>
            </section>
          </footer>
        </section>
      )}
    </div>
  );
};

export default CartPage;