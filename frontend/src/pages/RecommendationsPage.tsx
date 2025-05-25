// frontend/src/pages/RecommendationsPage.tsx
import React from 'react';
import BestSellersList from '../components/recommendations/BestSellersList';
import { useNavigate } from 'react-router-dom';
import './RecommendationsPage.css'; // Create this CSS file

const RecommendationsPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    // Changed div to main for the primary content container of the page
    <main className="recommendations-page-container" style={{ paddingTop: '20px', paddingBottom: '20px' }}>
        <h1 className="main-titles">Discover Products You Might Like</h1>
        <p className="main-titles-sub">Based on current trends and popular items.</p>
        <section className="back-button-container">
        <button onClick={() => navigate('/products')} className="back-button">
          Back to Products
        </button>
        </section>


      <section className="recommendation-section">
        <BestSellersList limit={12} timeWindowDays={30} title="Top Selling Products This Month" />
      </section>

      <section className="recommendation-section" style={{ marginTop: '40px' }}>
        <BestSellersList limit={8} timeWindowDays={7} title="Trending This Week" />
      </section>
    </main>
  );
};

export default RecommendationsPage;