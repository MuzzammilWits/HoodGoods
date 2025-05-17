// frontend/src/pages/AdminAnalyticsPage.tsx
import React from 'react';
import PlatformMetricsReport from '../components/reporting/PlatformMetricsReport'; // Adjust path if necessary
import './AdminAnalyticsPage.css'; // We'll create this CSS file next

const AdminAnalyticsPage: React.FC = () => {
  // For now, this page will directly render the PlatformMetricsReport.
  // Later, you could add navigation here if you have multiple admin reports.
  // For example, similar to SellerAnalyticsPage with an 'activeReport' state.

  return (
    <main className="admin-analytics-page container mt-4">
      <header className="page-header mb-4">
        <h1>Admin Analytics Dashboard</h1>
      </header>

      <section className="analytics-content">
        {/* Directly render the PlatformMetricsReport component */}
        <div className="report-group mb-5" aria-labelledby="platform-metrics-heading">
          {/* The PlatformMetricsReport component will have its own internal H2 or H3 title */}
          <PlatformMetricsReport />
        </div>

        {/*
          Future admin reports could be added here, e.g.:
          {activeReport === 'sellerPerformance' && <SellerPerformanceReport />}
          {activeReport === 'productTrends' && <ProductTrendsReport />}
        */}
      </section>
    </main>
  );
};

export default AdminAnalyticsPage;