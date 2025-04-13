import React from 'react';
import './Hero.css';
// Import your hero images using the central import file
import { jewelleryImg, flowerImg, honeyImg, ceramicsImg, getImage } from './utils/ImageImports';

const Hero: React.FC = () => {
  return (
    <section className="hero-section light-purple-bg">
      <div className="hero-container">
        <div className="hero-content">
          <h1 className="hero-title">
            Find Your<br />
            Kind of<br />
            Handmade
          </h1>
          <p className="hero-text">
            From bold and modern to cozy and traditional,
            every shop here brings something unique. Browse
            through passionate creators and find pieces that
            match your style, your story, and your space.
          </p>
          <div className="hero-buttons">
            <button className="btn btn-primary">Shop now</button>
            <button className="btn btn-secondary">Explore categories</button>
          </div>
        </div>
        
        <div className="hero-images">
          <div className="image-grid">
            <div className="grid-item new">
              {getImage(jewelleryImg, "Jewelry", 200, 150)}
              <span className="tag">New</span>
            </div>
            <div className="grid-item featured">
              {getImage(flowerImg, "Flowers", 200, 150)}
              <span className="tag">Featured</span>
            </div>
            <div className="grid-item">
              {getImage(honeyImg, "Honey", 200, 150)}
              <span className="tag">Popular</span>
            </div>
            <div className="grid-item">
              {getImage(ceramicsImg, "Ceramics", 200, 150)}
              <span className="tag">Trending</span>
            </div>
          </div>
          <div className="dots-decoration">
            <div className="dots"></div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;