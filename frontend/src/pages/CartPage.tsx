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
      price: 10,
      image: 'https://www.tday.co.za/cdn/shop/files/white3Ddaisymughandmadeceramicmug-1_460x.jpg?v=1743184126',
      quantity: 0 // Changed to 2 to show quantity adjustment works
    },
    {
      id: 'ex-2',
      name: 'Artisan Wooden Bowl',
      price: 10000,
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
    <div className="cart-page">
      <h1>Your Shopping Cart</h1>
      
      {cartItems.length === 0 ? (
        <div className="empty-cart">
          <p>Your cart is empty:(</p>
        </div>
      ) : (
        <>
          <div className="cart-items">
            {cartItems.map(item => (
              <div key={item.id} className="cart-item">
                <div className="item-image-container">
                  {item.image && (
                    <img src={item.image} alt={item.name} className="cart-item-image" />
                  )}
                </div>
                <div className="item-details">
                  <h3>{item.name}</h3>
                  <p>Price: R{item.price.toFixed(2)}</p>
                  <div className="quantity-controls">
                    <button 
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                      className="quantity-btn"
                    >
                      -
                    </button>
                    <span className="quantity-value">{item.quantity}</span>
                    <button 
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="quantity-btn"
                    >
                      +
                    </button>
                  </div>
                  <p className="subtotal">Subtotal: R{(item.price * item.quantity).toFixed(2)}</p>
                </div>
                <button 
                  onClick={() => removeFromCart(item.id)}
                  className="remove-btn"
                  aria-label="Remove item"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          
          <div className="cart-summary">
            <h3>Order Summary</h3>
            <div className="summary-row">
              <span>Subtotal:</span>
              <span>R{totalPrice.toFixed(2)}</span>
            </div>
            <div className="summary-row">
              <span>Shipping:</span>
              <span>Free</span>
            </div>
            <div className="summary-row total">
              <span>Total:</span>
              <span>R{totalPrice.toFixed(2)}</span>
            </div>
            
            <div className="cart-actions">
              <Link to="/checkout" className="checkout-btn">
                Proceed to Checkout
              </Link>
              <button className="clear-btn" onClick={clearCart}>
                Clear Cart
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CartPage;