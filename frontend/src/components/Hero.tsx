// frontend/src/components/Hero.tsx
import React, { useEffect, useRef } from 'react';
import './Hero.css';
// These image imports are no longer used if the <main> section is commented out
// import { jewelleryImg, flowerImg, honeyImg, ceramicsImg, getImage } from './utils/ImageImports'; // Adjust path if needed
import { useAuth0 } from '@auth0/auth0-react';
import { Link } from 'react-router-dom';

// --- TypeScript Declaration for Vanta ---
declare global {
  interface Window {
    VANTA: {
      FOG: (options: VantaFogOptions) => VantaEffect;
      // BIRDS?: (options: VantaBirdsOptions) => VantaEffect; // Kept if you might use it
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

// Interface for VantaBirdsOptions if you were to use it
// interface VantaBirdsOptions {
//   el: HTMLElement | string;
//   mouseControls?: boolean;
//   touchControls?: boolean;
//   gyroControls?: boolean;
//   minHeight?: number;
//   minWidth?: number;
//   backgroundColor?: number | string;
//   color1?: number | string;
//   color2?: number | string;
//   birdSize?: number;
//   wingSpan?: number;
//   speedLimit?: number;
//   separation?: number;
//   alignment?: number;
//   cohesion?: number;
//   quantity?: number;
// }

interface VantaEffect {
  destroy: () => void;
}
// --- End TypeScript Declaration ---

const Hero: React.FC = () => {
  const { isAuthenticated, loginWithRedirect, isLoading } = useAuth0();
  const showPrompt = !isLoading && !isAuthenticated;

  // Ref for the Vanta target element
  const vantaRef = useRef<HTMLElement>(null); // Use HTMLElement for <section>

  const handleLoginPrompt = () => {
    loginWithRedirect({
      appState: { returnTo: window.location.pathname },
    });
  };

  // --- Vanta Initialization useEffect ---
  useEffect(() => {
    let effectInstance: VantaEffect | null = null;

    if (window.VANTA && window.VANTA.FOG && vantaRef.current) {
      console.log("Initializing Vanta Fog effect (run once)...");
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
        baseColor: 0x000000,     // Black base for the fog
        blurFactor: 0.36,
        speed: 0.60,
        zoom: 0.20
      });
    } else {
      console.warn("Vanta.js FOG or target element not ready for initialization.");
    }

    return () => {
      if (effectInstance) {
        effectInstance.destroy();
        console.log("Vanta Fog effect destroyed.");
      }
    };
  }, []); // Empty dependency array ensures this runs only once on mount and unmount

  return (
    // Attach the ref to the main section element
    <section className="hero-section light-purple-bg" ref={vantaRef}>
      {/* The Vanta effect is applied to this section's background */}
      <article className="hero-container">
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
            {/* --- NEW LINK TO RECOMMENDATIONS PAGE --- */}
            <Link to="/recommendations" className="btn btn-secondary" style={{ marginLeft: '10px' }}>
              Discover
            </Link>
            {/* --- END NEW LINK --- */}
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

        {/* --- You have commented out this section --- */}
        {/* <main className="hero-images">
        // ... (your commented out image grid) ...
        </main> */}
      </article>
    </section>
  );
};

export default Hero;