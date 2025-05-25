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
    isLoading: contextIsLoading,
    cartError,
    fetchCart,
  } = useCart();

  const location = useLocation();

  const [isPageRefreshing, setIsPageRefreshing] = useState(() => {
    const wasNavRefreshRequested = location.state?.refresh === true;
    if (wasNavRefreshRequested) {
      window.history.replaceState({}, document.title);
      return true;
    }
    return false;
  });

  useEffect(() => {
    if (isPageRefreshing) {
      if (cartItems.length > 0) {
        fetchCart().finally(() => {
          setIsPageRefreshing(false);
        });
      } else {
        setIsPageRefreshing(false);
      }
    }
  }, [isPageRefreshing, cartItems.length, fetchCart]);

  const showSkeleton =
    (contextIsLoading && cartItems.length === 0) ||
    (contextIsLoading && cartItems.length > 0) ||
    (isPageRefreshing && cartItems.length > 0);

  if (showSkeleton) {
    return (
      <main className="cart-container" aria-busy="true" aria-label="Loading your shopping cart...">
        <header className="main-titles">
          <h1 className="skeleton-item skeleton-title" aria-hidden="true"></h1>
        </header>
        <section className="cart-content">
          <ul className="cart-items">
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
          <aside className="cart-summary">
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
          </aside>
        </section>
      </main>
    );
  }

  if (cartError) {
    return (
      <main className="cart-container">
        <header className="main-titles">
          <h1>Shopping Cart</h1>
        </header>
        <section className="error-message" role="alert">
            <h2>Could Not Load Cart</h2>
            <p>{cartError}</p>
            <button onClick={() => window.location.reload()} className="retry-button">
              Refresh Page
            </button>
        </section>
      </main>
    );
  }

  return (
    <main className="cart-container">
      <header className="main-titles">
        <h1>Shopping Cart</h1>
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
          <aside className="cart-summary">
            <h3 className="summary-title">Order Summary</h3>
            <dl className="summary-details">
              <dt>Subtotal:</dt>
              <dd>R{Number(totalPrice).toFixed(2)}</dd>
            </dl>
            <nav className="cart-actions">
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
            </nav>
          </aside>
        </section>
      )}
    </main>
  );
};

export default CartPage;