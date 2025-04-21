import { useCart } from '../context/ContextCart';
import { Link } from 'react-router-dom';

const CartPage = () => {
  const {
    cartItems,
    removeFromCart,
    updateQuantity,
    totalPrice,
    clearCart,
    isLoading
  } = useCart();

  if (isLoading) {
    return <div>Loading cart...</div>;
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
            {cartItems.map(item => (
              <article key={item.productId} className="cart-item">
                <figure className="item-image-container">
                  <img src={item.image} alt={item.name} className="item-image" />
                </figure>
                <section className="item-details">
                  <h3 className="item-name">{item.name}</h3>
                  <p className="item-price">R{Number  (item.price).toFixed(2)}</p>
                  <section className="quantity-controls">
                    <button 
                      onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                      className="quantity-btn"
                    >
                      −
                    </button>
                    <span className="quantity">{item.quantity}</span>
                    <button 
                      onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                      className="quantity-btn"
                    >
                      +
                    </button>
                  </section>
                  <p className="item-subtotal">
                    Subtotal: R{(Number(item.price) * item.quantity).toFixed(2)}
                  </p>
                </section>
                <button 
                  onClick={() => removeFromCart(item.productId)}
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
            <section className="summary-row">
              <span>Subtotal:</span>
              <span>R{Number(totalPrice).toFixed(2)}</span>
            </section>
            <section className="summary-row">
              <span>Shipping:</span>
              <span>Free</span>
            </section>
            <section className="summary-row total">
              <span>Total:</span>
              <span>R{totalPrice.toFixed(2)}</span>
            </section>

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