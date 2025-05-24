// frontend/src/pages/OrderConfirmationPage.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import './OrderConfirmationPage.css'; // Ensure this line is present and uncommented

const OrderConfirmationPage: React.FC = () => {
  return (
    <main className="order-confirmation-container">
      <article className="order-confirmation-card">
        <h1 className="title">Order Confirmed!</h1>
        <p className="message">
          Thank you for your purchase. Your order is being processed.
        </p>
        {/* Example: You could display an order number if you have it */}
        {/* <p className="order-details">Order Number: #12345XYZ</p> */}
        <Link to="/products" className="continue-shopping-button">
          Continue Shopping
        </Link>
      </article>
    </main>
  );
};

export default OrderConfirmationPage;
