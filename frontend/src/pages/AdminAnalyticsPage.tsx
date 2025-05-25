// frontend/src/pages/AdminAnalyticsPage.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom'; 
import PlatformMetricsReport from '../components/reporting/PlatformMetricsReport';
import './AdminAnalyticsPage.css';

const AdminAnalyticsPage: React.FC = () => {
  const navigate = useNavigate(); 

  return (
    <main className="admin-analytics-page container mt-4">
      <header className="page-header mb-4" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <h1>Admin Analytics Dashboard</h1>
        <button
          onClick={() => navigate('/admin-dashboard')}
          className="back-button"
        >
          Back to Dashboard
        </button>
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