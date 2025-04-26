// src/pages/CheckoutPage.tsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import './CheckoutPage.css';

export default function CheckoutPage() {
  const cartItems = [
    { id: '1', name: 'Handmade Pot', price: 120, quantity: 2 },
    { id: '2', name: 'Wooden Spoon', price: 45, quantity: 1 },
    { id: '3', name: 'Woven Basket', price: 180, quantity: 1 }
  ];

  // Delivery areas
  const deliveryAreas = ['Area 1', 'Area 2', 'Area 3'];

  // Delivery options
  const deliveryOptions = [
    { id: 'standard', name: 'Standard Delivery', price: 50, days: '3-5 business days' },
    { id: 'express', name: 'Express Delivery', price: 100, days: '1-2 business days' }
  ];

  const [address, setAddress] = useState({
    street: '',
    area: deliveryAreas[0] // Default to first area
  });

  const [deliveryOption, setDeliveryOption] = useState(deliveryOptions[0].id);
  const selectedDelivery = deliveryOptions.find(opt => opt.id === deliveryOption)!;

  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const total = subtotal + selectedDelivery.price;

  return (
    <main className="checkout-container">
      <header>
        <h1>Checkout</h1>
        <p className="instructions">Please enter your delivery details</p>
      </header>

      <form className="checkout-form">
        <section className="form-section">
          <h2>Delivery Address</h2>
          <label>
            Street Address
            <input
              type="text"
              value={address.street}
              onChange={(e) => setAddress({...address, street: e.target.value})}
              className="form-input"
              required
            />
          </label>
          
          <label>
            Delivery Area
            <select
              value={address.area}
              onChange={(e) => setAddress({...address, area: e.target.value})}
              className="form-input"
              required
            >
              {deliveryAreas.map(area => (
                <option key={area} value={area}>{area}</option>
              ))}
            </select>
          </label>
        </section>

        <section className="form-section">
          <h2>Delivery Method</h2>
          <select
            value={deliveryOption}
            onChange={(e) => setDeliveryOption(e.target.value)}
            className="form-input"
          >
            {deliveryOptions.map(option => (
              <option key={option.id} value={option.id}>
                {option.name} - R{option.price} ({option.days})
              </option>
            ))}
          </select>
        </section>

        <section className="form-section">
          <h2>Order Summary</h2>
          <ul className="order-items">
            {cartItems.map((item) => (
              <li key={item.id} className="order-item">
                {item.name} - R{item.price} × {item.quantity}
              </li>
            ))}
          </ul>
          
          <table className="order-totals">
            <tbody>
              <tr>
                <td>Delivery:</td>
                <td>R{selectedDelivery.price}</td>
              </tr>
              <tr className="grand-total">
                <td>Total:</td>
                <td>R{total}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <menu className="actions">
          <li>
            <button type="submit" className="confirm-btn">
              Confirm Order
            </button>
          </li>
          <li>
            <Link to="/cart" className="back-link">
              Back to Cart
            </Link>
          </li>
        </menu>
      </form>
    </main>
  );
}