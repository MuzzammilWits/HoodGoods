// src/pages/AdminDashboard.tsx
import React from 'react';
import { Link } from 'react-router-dom';

const AdminDashboard: React.FC = () => {
  return (
    <main style={{ padding: '2rem' }}>
      <h1>Admin Dashboard</h1>
      <nav className="admin-nav">
        <Link to="/admin/products-approval" className="nav-link">
          Product Approvals
        </Link>
        <Link to="/admin/seller-requests" className="nav-link">
          Seller Requests
        </Link>
        <Link to="/admin/reports" className="nav-link">
          Reports
        </Link>
      </nav>
    </main>
  );
};

export default AdminDashboard;