// src/pages/CartPage.tsx
import  { useEffect } from 'react';
import { useCart } from '../context/ContextCart';
import { Link } from 'react-router-dom';

const CartPage = () => {
  const {
    cartItems,
    removeFromCart,
    updateQuantity,
    totalPrice,
    clearCart,
    addToCart
  } = useCart();

  // Example products to pre-load
  const exampleProducts = [
    {
      id: 'ex-1',
      name: 'Handcrafted Ceramic Mug',
      price: 100,
      image: 'https://www.tday.co.za/cdn/shop/files/white3Ddaisymughandmadeceramicmug-1_460x.jpg?v=1743184126',
      quantity: 0 // Changed to 2 to show quantity adjustment works
    },
    {
      id: 'ex-2',
      name: 'Artisan Wooden Bowl',
      price: 200,
      image: 'https://www.spencerpeterman.com/wp-content/uploads/2020/08/spalted-live-edge-bowl.jpg',
      quantity: 0
    }
  ];

  // Load example products if cart is empty
  useEffect(() => {
    if (cartItems.length === 0) {
      exampleProducts.forEach(product => {
        addToCart({
          id: product.id,
          name: product.name,
          price: product.price,
          image: product.image
        });
      });
    }
  }, []);

  return (
    <main className="cart-page">
      <h1>Your Shopping Cart</h1>
      
      {cartItems.length === 0 ? (
        <section className="empty-cart">
          <p>Your cart is empty:(</p>
        </section>
      ) : (
        <>
          <section className="cart-items">
            {cartItems.map(item => (
              <article key={item.id} className="cart-item">
                <figure className="item-image-container">
                  {item.image && (
                    <img src={item.image} alt={item.name} className="cart-item-image" />
                  )}
                </figure>
                <section className="item-details">
                  <h3>{item.name}</h3>
                  <p>Price: R{item.price.toFixed(2)}</p>
                  <menu className="quantity-controls">
                    <button 
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                      className="quantity-btn"
                    >
                      -
                    </button>
                    <output className="quantity-value">{item.quantity}</output>
                    <button 
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="quantity-btn"
                    >
                      +
                    </button>
                  </menu>
                  <p className="subtotal">Subtotal: R{(item.price * item.quantity).toFixed(2)}</p>
                </section>
                <button 
                  onClick={() => removeFromCart(item.id)}
                  className="remove-btn"
                  aria-label="Remove item"
                >
                  ×
                </button>
              </article>
            ))}
          </section>
          
          <aside className="cart-summary">
            <h3>Order Summary</h3>
            <section className="summary-row">
              <p><strong>Subtotal:</strong> R{totalPrice.toFixed(2)}</p>
            </section>
            <section className="summary-row">
             <p><strong>Shipping:</strong>Free</p>
            </section>
            <section className="summary-row total">
              <p><strong>Total:</strong>R{totalPrice.toFixed(2)}</p>
            </section>
            <section className="cart-actions">
              <Link to="/checkout" className="checkout-btn">
                Proceed to Checkout
              </Link>
              <button className="clear-btn" onClick={clearCart}>
                Clear Cart
              </button>
            </section>
          </aside>
        </>
      )}
    </main>
  );
};

export default CartPage;