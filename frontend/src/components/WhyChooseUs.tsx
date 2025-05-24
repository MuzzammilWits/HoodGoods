// frontend/src/components/WhyChooseUs.tsx
import React from 'react';
import './WhyChooseUs.css';

interface FeatureProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const Feature: React.FC<FeatureProps> = ({ icon, title, description }) => {
  return (
    <article className="selling-point-item">
      <figure className="selling-point-icon">
        {icon}
      </figure>
      <h3>{title}</h3>
      <p>{description}</p>
    </article>
  );
};

const WhyChooseUs: React.FC = () => {
  return (
    <section id="about-us" className="why-choose-us-container">
      <main className="container">
        <section className="about-us-section">
            <h2 className="common-section-heading">About Us</h2>
            <p className="about-us-text">
                HoodsGoods is a vibrant marketplace connecting talented local artisans with conscious consumers who value handcrafted quality. Founded in 2020, our platform supports independent creators throughout South Africa, providing them with a digital space to showcase their unique skills and products. We believe that behind every handmade item is a story of passion, creativity, and craftsmanship. Our mission is to celebrate these stories while promoting sustainable shopping practices and supporting local economies. When you shop at HoodsGoods, you're not just buying a product - you're investing in a community of makers and the authentic art of handmade creation.
            </p>
        </section>

        <section className="why-choose-us-section">
            <h2 className="common-section-heading">Why Choose Us?</h2>
            <ul className="selling-points-grid">
                <li>
                    <Feature
                        icon={
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="50" height="50" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="12 6 12 12 16 14"></polyline>
                            </svg>
                        }
                        title="Secure & Trusted Shopping"
                        description="Shop with confidence. We use secure payment gateways and prioritize your privacy for a safe online experience."
                    />
                </li>
                <li>
                    <Feature
                        icon={
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="50" height="50" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
                                <line x1="7" y1="7" x2="7.01" y2="7"></line>
                            </svg>
                        }
                        title="Truly Handmade Treasures"
                        description="Discover one-of-a-kind items crafted with passion and skill by talented artisans right here in South Africa."
                    />
                </li>
                <li>
                    <Feature
                        icon={
                            <svg xmlns="http://www.w3.org/000/svg" viewBox="0 0 24 24" width="50" height="50" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="1" y="3" width="22" height="18" rx="2" ry="2"></rect>
                                <line x1="1" y1="10" x2="23" y2="10"></line>
                            </svg>
                        }
                        title="Careful & Reliable Delivery"
                        description="Your handmade items are packed with care and shipped reliably to your choice of pickup points. Choose the best delivery option for you at checkout."
                    />
                </li>
                <li>
                    <Feature
                        icon={
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="50" height="50" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="8" y1="6" x2="21" y2="6"></line>
                                <line x1="8" y1="12" x2="21" y2="12"></line>
                                <line x1="8" y1="18" x2="21" y2="18"></line>
                                <line x1="3" y1="6" x2="3.01" y2="6"></line>
                                <line x1="3" y1="12" x2="3.01" y2="12"></line>
                                <line x1="3" y1="18" x2="3.01" y2="18"></line>
                            </svg>
                        }
                        title="Easy to Shop"
                        description="Browse, discover, and buy with ease. Our clean, simple interface makes finding something special a breeze."
                    />
                </li>
            </ul>
        </section>
      </main>
    </section>
  );
};

export default WhyChooseUs;