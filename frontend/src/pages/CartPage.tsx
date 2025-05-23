// frontend/src/pages/CartPage.tsx
import React, { useEffect, useState } from 'react';
import { useCart } from '../context/ContextCart'; // Assuming path is correct
import { Link } from 'react-router-dom';
import './CartPage.css'; // Assuming path is correct

interface CartItemDisplay {
  productId: number;
  imageUrl?: string | undefined;
  productName: string;
  productPrice: number;
  quantity: number;
  availableQuantity?: number;
}

const CartPage: React.FC = () => {
  const {
    cartItems,
    removeFromCart,
    updateQuantity,
    totalPrice,
    clearCart,
    isLoading
  } = useCart();

  const [isLoadingLocal, setIsLoadingLocal] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoadingLocal(false);
    }, 200); // Wait minimum 200ms

    return () => clearTimeout(timer); // Clean up timer
  }, []);

  if (isLoading || isLoadingLocal) {
    return (
      <section className="loading-container" aria-label="Loading cart contents">
        <figure className="spinner" role="img" aria-label="Loading animation"></figure>
        <p>Loading cart...</p>
      </section>
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
          <ul className="cart-items"> {/* Changed from section to ul */}
            {cartItems.map((item: CartItemDisplay) => (
              <li key={item.productId} className="cart-item"> {/* Changed from article to li */}
                <figure className="item-image-container">
                  <img src={item.imageUrl || '/placeholder.png'} alt={item.productName} className="item-image" />
                </figure>
                <article className="item-details"> {/* Changed from section to article */}
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
                className="checkout-btn clear-cart-btn" /* Added clear-cart-btn for distinct styling if needed */
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