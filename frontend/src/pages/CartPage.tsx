import React from 'react'; // Import React for FC type
import { useCart } from '../context/ContextCart';
import { Link } from 'react-router-dom';
import './CartPage.css';

// Define an interface for a single cart item
interface CartItem {
  productId: string | number; // Use string | number unless you know the exact type
  image?: string | undefined;
  name: string;
  price: number; // Assuming price is consistently a number from the context
  quantity: number;
}

// (Optional but recommended) Define an interface for the values returned by your hook
// This might already be defined within your ContextCart file
interface CartContextValue {
  cartItems: CartItem[];
  removeFromCart: (productId: string) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  totalPrice: number;
  clearCart: () => void;
  isLoading: boolean;
}

// Type the component as a React Functional Component (React.FC)
const CartPage: React.FC = () => {
  // Explicitly type the destructured values from the hook
  const {
    cartItems,
    removeFromCart,
    updateQuantity,
    totalPrice,
    clearCart,
    isLoading
  }: CartContextValue = useCart(); // Assuming useCart returns CartContextValue

  if (isLoading) {
    return <p>Loading cart...</p>;
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
          <section className="cart-items">
            {/* Explicitly type the 'item' parameter in the map function */}
            {cartItems.map((item: CartItem) => (
              <article key={item.productId} className="cart-item">
                <figure className="item-image-container">
                  <img src={item.image} alt={item.name} className="item-image" />
                </figure>
                <section className="item-details">
                  <h3 className="item-name">{item.name}</h3>
                  {/* Keep Number() if price might still be a string, otherwise remove */}
                  <p className="item-price">R{Number(item.price).toFixed(2)}</p>
                  <section className="quantity-controls">
                    <button
                      onClick={() => updateQuantity(String(item.productId), item.quantity - 1)}
                      disabled={item.quantity <= 1}
                      className="quantity-btn"
                    >
                      −
                    </button>
                    <output className="quantity">{item.quantity}</output>
                    <button
                      onClick={() => updateQuantity(String(item.productId), item.quantity + 1)}
                      className="quantity-btn"
                    >
                      +
                    </button>
                  </section>
                  <p className="item-subtotal">
                    {/* Keep Number() if price might still be a string, otherwise remove */}
                    Subtotal: R{(Number(item.price) * item.quantity).toFixed(2)}
                  </p>
                </section>
                <button
                  onClick={() => removeFromCart(String(item.productId))}
                  className="remove-btn"
                  aria-label="Remove item"
                >
                  ×
                </button>
              </article>
            ))}
          </section>

          <footer className="cart-summary">
            <h3 className="summary-title">Order Summary</h3>
            <dl className="summary-details">
              <dt>Subtotal:</dt>
              <dd>R{Number(totalPrice).toFixed(2)}</dd>

              <dt>Shipping:</dt>
              <dd>Free</dd>

              <dt className="total-label">Total:</dt>
              <dd className="total-value">R{totalPrice.toFixed(2)}</dd>
            </dl>

            <section className="cart-actions">
              <Link to="/checkout" className="checkout-btn">
                Proceed to Checkout
              </Link>
              <button
                onClick={clearCart}
                className="clear-cart-btn"
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