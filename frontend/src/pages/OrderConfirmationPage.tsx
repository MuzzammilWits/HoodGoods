// src/pages/OrderConfirmationPage.tsx
import React from 'react';
import { Link } from 'react-router-dom';
// Optional: Import a specific CSS file for this page if needed
// import './OrderConfirmationPage.css';

const OrderConfirmationPage: React.FC = () => {
  // In a real application, you might fetch order details here based on an ID
  // passed via state or URL parameter after successful payment confirmation (ideally via webhook).
  // For now, we'll just display a generic message.

  return (
    <main className="order-confirmation-container" style={styles.container}>
      {/* Changed div to article for better semantics */}
      <article style={styles.card} className="order-confirmation-card">
        <h1 style={styles.title}>Order Confirmed!</h1>
        <p style={styles.message}>
          Thank you for your purchase. Your order is being processed.
        </p>
        {/* Add more details here if available, e.g., order number */}
        {/* <p>Order Number: #12345</p> */}
        <Link to="/products" style={styles.button}>
          Continue Shopping
        </Link>
      </article>
    </main>
  );
};

// Basic inline styles for demonstration (consider moving to CSS file)
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 'calc(100vh - 200px)', // Adjust based on header/footer height
    padding: '2rem',
    textAlign: 'center',
    fontFamily: "'Hind', sans-serif", // Example: Consistent font
  },
  card: {
    backgroundColor: '#fff',
    padding: '2rem 3rem',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
    maxWidth: '500px',
  },
  title: {
    color: '#2ecc71', // Green color for success
    marginBottom: '1rem',
    fontSize: '2.2em', // Slightly larger
    fontFamily: "'Poppins', sans-serif", // Example: Heading font
  },
  message: {
    fontSize: '1.1em',
    color: '#555',
    marginBottom: '2rem', // More space before button
    lineHeight: '1.6',
  },
  button: {
    display: 'inline-block',
    backgroundColor: '#007bff', // Example button color (consider using your primary color variable)
    color: '#fff',
    padding: '0.9rem 1.8rem', // Slightly larger padding
    borderRadius: '5px',
    textDecoration: 'none',
    fontWeight: 'bold',
    transition: 'background-color 0.2s ease, transform 0.1s ease',
    fontFamily: "'Poppins', sans-serif", // Consistent button font
  },
  // To add hover styles, it's best to use a CSS file.
  // For example, in OrderConfirmationPage.css:
  // .order-confirmation-card .button:hover {
  //   background-color: '#0056b3';
  //   transform: translateY(-1px);
  // }
};

export default OrderConfirmationPage;