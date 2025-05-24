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
      <section className="main-titles">
        <h1>Admin Dashboard</h1>
      </section>

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
          <svg
  className="product-image"
  width="100%"
  height="100%"
  viewBox="0 0 18 16"
  version="1.1"
  xmlns="http://www.w3.org/2000/svg"
  xmlnsXlink="http://www.w3.org/1999/xlink"
>
  <title />
  <desc />
  <defs />
  <rect width="100%" height="100%" fill="white" />
  <g fill="none" fillRule="evenodd" stroke="none" strokeWidth="1">
    <g fill="#000000" id="Core" transform="translate(-465.000000, -424.000000)">
      <g id="store" transform="translate(465.000000, 424.000000)">
        <path d="M17,0 L1,0 L1,2 L17,2 L17,0 L17,0 Z M18,10 L18,8 L17,3 L1,3 L0,8 L0,10 L1,10 L1,16 L11,16 L11,10 L15,10 L15,16 L17,16 L17,10 L18,10 L18,10 Z M9,14 L3,14 L3,10 L9,10 L9,14 L9,14 Z" id="Shape" />
      </g>
    </g>
  </g>
</svg>

          </figure>
          <article className="product-details">
            <button
              className="manage-btn"
              onClick={(e) => {
                e.stopPropagation(); // Prevent li's onClick from firing twice
                navigate('/admin/store-approval');
              }}
            >
              Store Management
            </button>
            <p className="product-description">
              Approve or reject new store applications
            </p>
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
            <button
              className="manage-btn"
              onClick={(e) => {
                e.stopPropagation();
                navigate('/admin/product-approval');
              }}
            >
              Product Management
            </button>
            <p className="product-description">
              Approve or reject new product listings
            </p>
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
            <button
              className="manage-btn"
              onClick={(e) => {
                e.stopPropagation();
                navigate('/admin/analytics');
              }}
            >
              Admin Analytics
            </button>
            <p className="product-description">
              View system reports and analytics
            </p>
          </article>
        </li>
      </ul>
    </main>
  );
};

export default AdminDashboard;