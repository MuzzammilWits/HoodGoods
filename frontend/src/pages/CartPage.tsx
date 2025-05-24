// frontend/src/pages/CartPage.tsx
import React from 'react';
// --- MODIFIED: Added CartItemUI to the import ---
import { useCart, CartItemUI } from '../context/ContextCart';
import { Link } from 'react-router-dom';
import './CartPage.css'; // Ensure this CSS file has the skeleton styles for cart

// Note: The local CartItemDisplay interface is no longer strictly needed if CartItemUI from context serves the purpose.
// However, if CartItemDisplay is intentionally different for the view layer, it can remain.
// For this fix, we assume cartItems from useCart() provides items conforming to CartItemUI.

const CartPage: React.FC = () => {
  const {
    cartItems,
    removeFromCart,
    updateQuantity,
    totalPrice,
    clearCart,
    isLoading, 
    cartError 
  } = useCart();

  if (isLoading) {
    return (
      <main className="cart-container" aria-busy="true" aria-label="Loading your shopping cart...">
        <header>
          <h1 className="skeleton-item skeleton-title" aria-hidden="true"></h1>
        </header>

        <section className="cart-content">
          <ul className="cart-items">
            {Array.from({ length: 2 }).map((_, index) => (
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
      </main>
    );
  }

  if (cartError) {
    return (
        <main className="cart-container">
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
        </main>
    );
  }

  return (
    <main className="cart-container">
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
            {/* --- MODIFIED: Explicitly using CartItemUI for item type --- */}
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
                  {item.availableQuantity != null && (
                    <p style={{ fontSize: '0.8em', color: '#666' }}>
                      {item.availableQuantity - item.quantity >= 0
                        ? `${item.availableQuantity - item.quantity} more available`
                        : `${item.availableQuantity} available (in stock)`}
                    </p>
                  )}
                  {item.availableQuantity != null && item.quantity > item.availableQuantity && (
                    <p style={{ color: 'red', fontSize: '0.8em', fontWeight: 'bold' }}>
                      Warning: Quantity in cart exceeds available stock! ({item.availableQuantity} available)
                    </p>
                  )}
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
    </main>
  );
};

export default CartPage;