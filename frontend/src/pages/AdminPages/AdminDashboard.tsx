// frontend/src/pages/AdminPages/AdminDashboard.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminDashboard.css';
import storeImage from '../../assets/store-management.png';
import productImage from '../../assets/product-management.png';
import reportImage from '../../assets/reports-analytics.png';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();

  const handleCardKeyDown = (
    event: React.KeyboardEvent<HTMLLIElement>,
    path: string
  ) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      navigate(path);
    }
  };

  return (
    <main className="admin-dashboard-container">
      <header className="admin-header">
        <h1>Admin Dashboard</h1>
      </header>

      <ul className="management-cards2">
        {/* Store Management Card */}
        <li
          className="management-card3 product-card"
          onClick={() => navigate('/admin/store-approval')}
          role="link" // Provides semantic meaning for assistive technologies
          tabIndex={0} // Makes the element focusable
          onKeyDown={(e) => handleCardKeyDown(e, '/admin/store-approval')}
          aria-label="Manage Stores"
        >
          <figure className="product-image-container">
            <img
              src={storeImage}
              alt="Illustration for store management"
              className="product-image"
            />
          </figure>
          <article className="product-details">
            <h2>Manage Stores</h2>
            <p className="product-description">
              Approve or reject new store applications
            </p>
            <button
              className="manage-btn"
              onClick={(e) => {
                e.stopPropagation(); // Prevent li's onClick from firing twice
                navigate('/admin/store-approval');
              }}
            >
              Store Management
            </button>
          </article>
        </li>

        {/* Product Management Card */}
        <li
          className="management-card3 product-card"
          onClick={() => navigate('/admin/product-approval')}
          role="link"
          tabIndex={0}
          onKeyDown={(e) => handleCardKeyDown(e, '/admin/product-approval')}
          aria-label="Manage Products"
        >
          <figure className="product-image-container">
            <img
              src={productImage}
              alt="Illustration for product management"
              className="product-image"
            />
          </figure>
          <article className="product-details">
            <h2>Manage Products</h2>
            <p className="product-description">
              Approve or reject new product listings
            </p>
            <button
              className="manage-btn"
              onClick={(e) => {
                e.stopPropagation();
                navigate('/admin/product-approval');
              }}
            >
              Product Management
            </button>
          </article>
        </li>

        {/* Reports Card */}
        <li
          className="management-card3 product-card"
          onClick={() => navigate('/admin/analytics')}
          role="link"
          tabIndex={0}
          onKeyDown={(e) => handleCardKeyDown(e, '/admin/analytics')}
          aria-label="View Reports and Analytics"
        >
          <figure className="product-image-container">
            <img
              src={reportImage}
              alt="Illustration for reports and analytics"
              className="product-image"
            />
          </figure>
          <article className="product-details">
            <h2>View Reports</h2>
            <p className="product-description">
              View system reports and analytics
            </p>
            <button
              className="manage-btn"
              onClick={(e) => {
                e.stopPropagation();
                navigate('/admin/analytics');
              }}
            >
              View Reports
            </button>
          </article>
        </li>
      </ul>
    </main>
  );
};

export default AdminDashboard;