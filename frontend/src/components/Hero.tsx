import React from 'react'; // No longer need useState, useEffect here
import './Hero.css';
import { jewelleryImg, flowerImg, honeyImg, ceramicsImg, getImage } from './utils/ImageImports';
import { useAuth0 } from '@auth0/auth0-react';
import { Link } from 'react-router-dom';


// No longer need backendUrl or namespace constant here

const Hero: React.FC = () => {
  const {
    isAuthenticated, // The primary status we need
    loginWithRedirect,
    isLoading,      // Still useful to prevent flashes of content
    // user, // Not needed for this logic
    // getAccessTokenSilently, // Not needed for this logic
  } = useAuth0();

  // Role state and fetching effect are removed

  // --- Determine if the prompt should be shown ---
  // Show the prompt ONLY if Auth0 is finished loading AND the user is NOT authenticated.
  const showPrompt = !isLoading && !isAuthenticated;
  // --- End Prompt Logic ---

  // Login handler remains the same
  const handleLoginPrompt = () => {
    loginWithRedirect({
      appState: { returnTo: window.location.pathname }, // Optional: redirect back here after login
      // screen_hint: 'signup' // Optional hint for Auth0
    });
  };

  return (
    <section className="hero-section light-purple-bg">
      <div className="hero-container">
        <div className="hero-content">
          <h1 className="hero-title">
            Find Your Kind<br />
            Of Handmade     
          </h1>
          <p className="hero-text">
            From bold and modern to cozy and traditional,
            every shop here brings something unique. Browse
            through passionate creators and find pieces that
            match your style, your story, and your space.
          </p>
          <div className="hero-buttons">
          <Link to="products" className="btn btn-primary">
            Shop now
          </Link>
          </div>
          {/* --- Conditional Seller Prompt --- */}
          {/* Show this message ONLY if the user is logged out (and Auth0 is ready) */}
          {showPrompt && (
            <div className="hero-seller-prompt">
              <p>
                Ready to share your unique creations with the world?{' '}
                <button onClick={handleLoginPrompt} className="link-button">
                  Sign up or Log in
                </button>
                {' '}to become a seller on HoodsGoods!
              </p>
            </div>
          )}
          {/* --- End Conditional Seller Prompt --- */}

        </div>

        {/* --- Hero Images (No Changes) --- */}
        <div className="hero-images">
           {/* ... rest of image grid ... */}
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
        {/* --- End Hero Images --- */}
      </div>
    </section>
  );
};

export default Hero;