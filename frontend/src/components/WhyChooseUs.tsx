import React from 'react';
import './WhyChooseUs.css';
// Import using the utility instead of direct import
import { interiorImg, getImage } from './utils/ImageImports';

interface FeatureProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const Feature: React.FC<FeatureProps> = ({ icon, title, description }) => {
  return (
    <div className="feature">
      <div className="feature-icon">
        {icon}
      </div>
      <h3 className="feature-title">{title}</h3>
      <p className="feature-description">{description}</p>
    </div>
  );
};

const WhyChooseUs: React.FC = () => {
  return (
    <section className="why-choose-us light-purple-bg">
      <div className="container">
        <div className="why-choose-us-content">
          <div className="why-choose-us-text">
            <h2 className="section-title">Why Choose Us</h2>
            
            <div className="features-grid">
              <Feature 
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                    <path fill="none" stroke="currentColor" strokeWidth="2" d="M4 14h16M4 10h16M7 18l-3 4M17 18l3 4" />
                  </svg>
                }
                title="Fast & Free Shipping"
                description="Donec mattis porta eros, aliquet finibus risus interdum at. Nulla vivethe as it was"
              />
              
              <Feature 
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                    <path fill="none" stroke="currentColor" strokeWidth="2" d="M12 22c5.5 0 10-4.5 10-10S17.5 2 12 2 2 6.5 2 12s4.5 10 10 10zM12 6v6l4 2" />
                  </svg>
                }
                title="24/7 Support"
                description="Donec mattis porta eros, aliquet finibus risus interdum at. Nulla vivethe as it was"
              />
              
              <Feature 
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                    <path fill="none" stroke="currentColor" strokeWidth="2" d="M22 12c0 5-4 9-9 9s-9-4-9-9 4-9 9-9 9 4 9 9zM8 15l3-3-3-3M12 12h6" />
                  </svg>
                }
                title="Hassle Free Returns"
                description="Donec mattis porta eros, aliquet finibus risus interdum at. Nulla vivethe as it was"
              />
              
              <Feature 
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                    <path fill="none" stroke="currentColor" strokeWidth="2" d="M3 6h18M3 12h18M3 18h18" />
                  </svg>
                }
                title="Easy to Shop"
                description="Donec mattis porta eros, aliquet finibus risus interdum at. Nulla vivethe as it was"
              />
            </div>
          </div>
          
          <div className="why-choose-us-image">
            {getImage(interiorImg, "Interior design with Hood Goods products", 500, 400)}
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhyChooseUs;