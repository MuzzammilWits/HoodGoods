import React from 'react';
import { useCart } from '../context/ContextCart'; // Assuming path is correct
import { Link } from 'react-router-dom';
import './CartPage.css'; // Assuming path is correct

// Interface for item used *within this component*
// Should match the CartItemUI from the context, including availableQuantity
interface CartItemDisplay {
  productId: number; // Use number
  imageUrl?: string | undefined;
  productName: string; // Use context's naming
  productPrice: number; // Use context's naming (number)
  quantity: number;
  availableQuantity?: number; // <-- Add this field to match context state
}

// Type the component as a React Functional Component (React.FC)
const CartPage: React.FC = () => {
  // Destructure values from the hook
  // Ensure the hook returns the expected types (matching CartContextType)
  const {
    cartItems, // This is CartItemUI[] from the context, now including availableQuantity
    removeFromCart,
    updateQuantity,
    totalPrice,
    clearCart,
    isLoading
  } = useCart();

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
          <Link to="/products" className="continue-shopping-btn"> {/* Adjust link as needed */}
            Browse Products
          </Link>
        </section>
      ) : (
        <section className="cart-content">
          <section className="cart-items">
            {/* Map over cartItems. Ensure 'item' type includes availableQuantity */}
            {cartItems.map((item: CartItemDisplay) => ( // Type item explicitly here
              <article key={item.productId} className="cart-item">
                <figure className="item-image-container">
                   {/* Use imageUrl and productName */}
                   <img src={item.imageUrl || '/placeholder.png'} alt={item.productName} className="item-image" />
                </figure>
                <section className="item-details">
                   {/* Use productName and productPrice */}
                   <h3 className="item-name">{item.productName}</h3>
                   <p className="item-price">R{Number(item.productPrice).toFixed(2)}</p>
                  <section className="quantity-controls">
                    <button
                      // Pass productId (number) and updated quantity
                      onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                      className="quantity-btn"
                      aria-label={`Decrease quantity of ${item.productName}`} // Accessibility
                    >
                      −
                    </button>
                    <output className="quantity" aria-live="polite">{item.quantity}</output> {/* Accessibility */}
                    <button
                      // Pass productId (number) and updated quantity
                      onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                       // *** MODIFICATION START ***
                       // Disable button if availableQuantity is known and quantity meets/exceeds it
                      disabled={item.availableQuantity != null && item.quantity >= item.availableQuantity}
                      // *** MODIFICATION END ***
                      className="quantity-btn"
                      aria-label={`Increase quantity of ${item.productName}`} // Accessibility
                    >
                      +
                    </button>
                  </section>
                  {/* Optional: Display available stock */}
                  {item.availableQuantity != null && (
                     <p style={{ fontSize: '0.8em', color: '#666' }}>
                       {item.availableQuantity - item.quantity >= 0
                          ? `${item.availableQuantity - item.quantity} more available`
                          : `${item.availableQuantity} available (in stock)`
                       }
                     </p>
                  )}
                   {/* Optional: Display warning if quantity somehow exceeds stock */}
                  {item.availableQuantity != null && item.quantity > item.availableQuantity && (
                    <p style={{ color: 'red', fontSize: '0.8em', fontWeight: 'bold' }}>
                        Warning: Quantity in cart exceeds available stock! ({item.availableQuantity} available)
                    </p>
                  )}
                  <p className="item-subtotal">
                    {/* Use productPrice */}
                    Subtotal: R{(Number(item.productPrice) * item.quantity).toFixed(2)}
                  </p>
                </section>
                <button
                  // Pass productId (number)
                  onClick={() => removeFromCart(item.productId)}
                  className="remove-btn"
                  aria-label={`Remove ${item.productName} from cart`} // Improve accessibility
                >
                  ×
                </button>
              </article>
            ))}
          </section>

          {/* Footer remains the same */}
          <footer className="cart-summary">
             {/* ... rest of the footer ... */}
             <h3 className="summary-title">Order Summary</h3>
            <dl className="summary-details">
              <dt>Subtotal:</dt>
              <dd>R{Number(totalPrice).toFixed(2)}</dd>
              <dt>Shipping:</dt>
              <dd>Free</dd> {/* Or calculate shipping */}
              <dt className="total-label">Total:</dt>
              <dd className="total-value">R{totalPrice.toFixed(2)}</dd>
            </dl>
            <section className="cart-actions">
              <Link to="/checkout" className="checkout-btn"> {/* Adjust link as needed */}
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