import React from 'react';
// import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';
import './AdminDashboard.css';
import storeImage from '../../assets/store-management.png';
import productImage from '../../assets/product-management.png';
import reportImage from '../../assets/reports-analytics.png';


const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();

  return (
    <main className="admin-dashboard-container">
      <header className="admin-header">
        <h1>Admin Dashboard</h1>
      </header>

      <div className="management-cards2">
        {/* Store Management Card */}
        <div 
          className="management-card3 product-card"
          onClick={() => navigate('/admin/store-approval')}
        >
          <div className="product-image-container">
            <img
              src={storeImage}  // Use the imported image
              alt="Manage Store Approval"
              className="product-image"
            />
          </div>
          <div className="product-details">
            <h2>Manage Stores</h2>
            <p className="product-description">
              Approve or reject new store applications
            </p>
            <button 
              className="manage-btn" 
              onClick={(e) => {
                e.stopPropagation();
                navigate('/admin/store-approval');
              }}
            >
              Store Management
            </button>
          </div>
        </div>

        {/* Product Management Card */}
        <div 
          className="management-card3 product-card"
          onClick={() => navigate('/admin/product-approval')}
        >
          <div className="product-image-container">
            <img
              src={productImage}  // Use the imported image
              alt="Manage Product Approval"
              className="product-image"
            />
          </div>
          <div className="product-details">
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
          </div>
        </div>

        {/* Reports Card */}
        <div 
          className="management-card3 product-card"
          onClick={() => navigate('/admin/analytics')}
        >
          <div className="product-image-container">
            <img
              src={reportImage}  // Use the imported image
              alt="View Reports"
              className="product-image"
            />
          </div>
          <div className="product-details">
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
          </div>
        </div>
      </div>
    </main>
  );
};

export default AdminDashboard;
