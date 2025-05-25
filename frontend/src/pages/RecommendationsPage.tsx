// frontend/src/pages/RecommendationsPage.tsx

import React from 'react';
import BestSellersList from '../components/recommendations/BestSellersList';
import './RecommendationsPage.css'; 

// This page is for showing various product recommendations to users.
const RecommendationsPage: React.FC = () => {
  return (
    // Main container for the entire recommendations page content
    <main className="recommendations-page-container" style={{ paddingTop: '20px', paddingBottom: '20px' }}>
        {/* Page title and a brief description */}
        <h1 className="main-titles">Discover Products You Might Like</h1>
        <p className="main-titles-sub">Based on current trends and popular items.</p>

      {/* Section for displaying top-selling products over a longer period (e.g., a month) */}
      <section className="recommendation-section">
        <BestSellersList limit={12} timeWindowDays={30} title="Top Selling Products This Month" />
      </section>

      {/* Section for displaying products that are currently trending (e.g., this week) */}
      <section className="recommendation-section" style={{ marginTop: '40px' }}>
        <BestSellersList limit={8} timeWindowDays={7} title="Trending This Week" />
      </section>
    </main>
  );
};

export default RecommendationsPage;