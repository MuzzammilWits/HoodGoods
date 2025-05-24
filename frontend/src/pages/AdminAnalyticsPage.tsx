// frontend/src/pages/AdminAnalyticsPage.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import PlatformMetricsReport from '../components/reporting/PlatformMetricsReport';
import './AdminAnalyticsPage.css';

const AdminAnalyticsPage: React.FC = () => {
  const navigate = useNavigate(); // Initialize navigate

  return (
    <main className="admin-analytics-page container mt-4">
      <header className="page-header mb-4">
        <div className="admin-header-content">
          <h1>Admin Analytics Dashboard</h1>
          <button
            onClick={() => navigate('/admin-dashboard')}
            className="back-button" // Reusing class name for consistency
          >
            Back to Dashboard
          </button>
        </div>
      </header>

      <section className="analytics-content">
        <article className="report-group mb-5" aria-labelledby="platform-metrics-heading">
          <h2 id="platform-metrics-heading" className="visually-hidden">
            Platform Metrics Report Section
          </h2>
          <PlatformMetricsReport />
        </article>
      </section>
    </main>
  );
};

export default AdminAnalyticsPage;