// frontend/src/pages/AdminAnalyticsPage.tsx
import React from 'react';
import PlatformMetricsReport from '../components/reporting/PlatformMetricsReport'; // Adjust path if necessary
import './AdminAnalyticsPage.css';

const AdminAnalyticsPage: React.FC = () => {
  return (
    <main className="admin-analytics-page container mt-4">
      <header className="page-header mb-4">
        <h1>Admin Analytics Dashboard</h1>
      </header>

      <section className="analytics-content">
        {/* Directly render the PlatformMetricsReport component */}
        <article className="report-group mb-5" aria-labelledby="platform-metrics-heading">
          {/* Added a visually hidden heading for the article, associated by aria-labelledby */}
          <h2 id="platform-metrics-heading" className="visually-hidden">
            Platform Metrics Report Section
          </h2>
          <PlatformMetricsReport />
        </article>

        {/*
          Future admin reports could be added here, e.g.:
          <article className="report-group mb-5" aria-labelledby="seller-performance-heading">
            <h2 id="seller-performance-heading" className="visually-hidden">Seller Performance Report Section</h2>
            {activeReport === 'sellerPerformance' && <SellerPerformanceReport />}
          </article>
          <article className="report-group mb-5" aria-labelledby="product-trends-heading">
            <h2 id="product-trends-heading" className="visually-hidden">Product Trends Report Section</h2>
            {activeReport === 'productTrends' && <ProductTrendsReport />}
          </article>
        */}
      </section>
    </main>
  );
};

export default AdminAnalyticsPage;