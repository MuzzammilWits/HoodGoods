import React, { useState, useEffect, useMemo } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';
import './AdminDashboard.css';
//import { jewelleryImg, getImage } from '../components/utils/ImageImports';
//import productImage from '../assets/jewellery.jpg';
//import userImage from '../assets/manageUser.jpg';


// ... (keep your existing interfaces and imports)

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  // ... (keep your existing state and hooks)

  // ... (keep your existing functions)

  return (
    <main className="admin-dashboard-container">
      <header className="admin-header">
        <h1>Admin Dashboard</h1>
        
        
      </header>

      <div className="admin-controls">
        {/* ... (keep your existing search and stats) */}
      </div>

      {/* Add this new section for management cards */}
      <div className="management-cards2">
        <div 
          className="management-card3 product-card"
          onClick={() => navigate('/admin/store-approval')}
        >
          <div className="product-image-container">
          
            <img
              src={"productImage"} // Replace with your image or use an icon
              alt="Manage Store Approval"
              className="product-image"
            />
          </div>
          <div className="product-details">
            <h2>Manage Stores</h2>
            <p className="product-description">
              View, edit, and remove products from the marketplace
            </p>
            <button className="manage-btn" onClick={() => navigate('/admin/products')}>
              Go to Store Management
            </button>
          </div>
        </div>

        <div 
          className="management-card3 product-card"
          onClick={() => navigate('/admin/product-approval')}
        >
          <div className="product-image-container">
          <img
              src={"userImage"}// Replace with your image or use an icon
              alt="Manage Product Approval"
              className="product-image"
            />
          </div>
          <div className="product-details">
            <h2>Manage Products</h2>
            <p className="product-description">
              View, edit, and remove suspicious users from the marketplace
            </p>
            <button className="manage-btn" onClick={() => navigate('/admin/usermanagement')}>
              Go to Products Management
            </button>
          </div>
        </div>

        {/* You can add more management cards here for other admin functions */}
      </div>

      {/* Keep your existing products grid or modify as needed */}
    </main>
  );
};

export default AdminDashboard;