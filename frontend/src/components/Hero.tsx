import React, { useEffect, useRef } from 'react';
import './Hero.css';
import { useAuth0 } from '@auth0/auth0-react';
import { Link } from 'react-router-dom';

// --- TypeScript Declaration for Vanta ---
declare global {
  interface Window {
    VANTA: {
      FOG: (options: VantaFogOptions) => VantaEffect;
    };
  }
}

interface VantaFogOptions {
  el: HTMLElement | string;
  mouseControls?: boolean;
  touchControls?: boolean;
  gyroControls?: boolean;
  minHeight?: number;
  minWidth?: number;
  highlightColor?: number | string;
  midtoneColor?: number | string;
  lowlightColor?: number | string;
  baseColor?: number | string;
  blurFactor?: number;
  zoom?: number;
  speed?: number;
}

interface VantaEffect {
  destroy: () => void;
}
// --- End TypeScript Declaration ---

const Hero: React.FC = () => {
  const { isAuthenticated, loginWithRedirect, isLoading } = useAuth0();
  const showPrompt = !isLoading && !isAuthenticated;

  const vantaRef = useRef<HTMLElement>(null);

  const handleLoginPrompt = () => {
    loginWithRedirect({
      appState: { returnTo: window.location.pathname },
    });
  };

  // --- Vanta Initialization useEffect ---
  useEffect(() => {
    let effectInstance: VantaEffect | null = null;

    if (window.VANTA && window.VANTA.FOG && vantaRef.current) {
      effectInstance = window.VANTA.FOG({
        el: vantaRef.current,
        mouseControls: true,
        touchControls: true,
        gyroControls: false,
        minHeight: 200.00,
        minWidth: 200.00,
        highlightColor: 0x6514a4, // Purpleish highlight
        midtoneColor: 0x090909,   // Dark midtone (almost black)
        lowlightColor: 0x4920d2,  // Deeper purple lowlight
        baseColor: 0x000000,      // Black base for the fog
        blurFactor: 0.36,
        speed: 0.60,
        zoom: 0.20
      });
    }

    return () => {
      if (effectInstance) {
        effectInstance.destroy();
      }
    };
  }, []); // Empty dependency array ensures this runs only once

  return (
    <section className="hero-section light-purple-bg" ref={vantaRef}>
      <article className="hero-container">
        <header className="hero-header">
          <h1 className="hero-title">
            Find Your Kind<br/>
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
            <Link to="/recommendations" className="btn btn-secondary" style={{ marginLeft: '10px' }}>
              Discover
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

        {/* The logo image is positioned by the grid layout */}
        <img src="/src/assets/logo.svg" alt="HoodGoods Logo" className="hero-logo" />
      </article>
    </section>
  );
};

export default Hero;