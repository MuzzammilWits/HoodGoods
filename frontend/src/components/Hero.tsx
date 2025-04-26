import React from 'react';
import './Hero.css';
import { jewelleryImg, flowerImg, honeyImg, ceramicsImg, getImage } from './utils/ImageImports';
import { useAuth0 } from '@auth0/auth0-react';
import { Link } from 'react-router-dom';

const Hero: React.FC = () => {
  const { isAuthenticated, loginWithRedirect, isLoading } = useAuth0();

  const showPrompt = !isLoading && !isAuthenticated;

  const handleLoginPrompt = () => {
    loginWithRedirect({
      appState: { returnTo: window.location.pathname },
    });
  };

  return (
    <section className="hero-section light-purple-bg">
      <article className="hero-container"> {/* Replaced div with article */}
        <header className="hero-header">
          <h1 className="hero-title">
            Find Your Kind<br />
            Of Handmade
          </h1>
          <p className="hero-text">
            From bold and modern to cozy and traditional, every shop here brings something unique.
            Browse through passionate creators and find pieces that match your style, your story, and your space.
          </p>
          <nav className="hero-buttons">
            <Link to="products" className="btn btn-primary">
              Shop now
            </Link>
          </nav>
          {showPrompt && (
            <aside className="hero-seller-prompt">
              <p>
                Ready to share your unique creations with the world?{' '}
                <button onClick={handleLoginPrompt} className="link-button">
                  Sign up or Log in
                </button>
                {' '}to become a seller on HoodsGoods!
              </p>
            </aside>
          )}
        </header>

        <main className="hero-images">
          <ul className="image-grid">
            <li className="grid-item new">
              <figure>
                {getImage(jewelleryImg, "Jewelry", 200, 150)}
                <figcaption className="tag">New</figcaption>
              </figure>
            </li>
            <li className="grid-item featured">
              <figure>
                {getImage(flowerImg, "Flowers", 200, 150)}
                <figcaption className="tag">Featured</figcaption>
              </figure>
            </li>
            <li className="grid-item">
              <figure>
                {getImage(honeyImg, "Honey", 200, 150)}
                <figcaption className="tag">Popular</figcaption>
              </figure>
            </li>
            <li className="grid-item">
              <figure>
                {getImage(ceramicsImg, "Ceramics", 200, 150)}
                <figcaption className="tag">Trending</figcaption>
              </figure>
            </li>
          </ul>

          <figure className="dots-decoration" aria-hidden="true"> {/* Replaced div with figure */}
            <svg 
              className="dots" 
              width="100" 
              height="100"
              aria-hidden="true"
            >
              <pattern id="dots-pattern" x="0" y="0" width="12" height="12" patternUnits="userSpaceOnUse">
                <circle cx="1.5" cy="1.5" r="1.5" fill="var(--white, #fff)"/>
              </pattern>
              <rect width="100" height="100" fill="url(#dots-pattern)" />
            </svg>
          </figure>
        </main>
      </article>
    </section>
  );
};

export default Hero;