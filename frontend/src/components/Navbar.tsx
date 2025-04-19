// frontend/src/components/Navbar.tsx
import React, { useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { Link } from 'react-router-dom';
import './Navbar.css'; // Ensure this path is correct
import { logo } from './utils/ImageImports'; // Ensure this path is correct

const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'; // Fallback URL

const Navbar: React.FC = () => {
  const {
    loginWithRedirect,
    logout,
    isAuthenticated,
    user,
    getAccessTokenSilently,
    isLoading, // Use isLoading to check Auth0 SDK status
  } = useAuth0();

  // State to hold the user's role fetched from the backend
  const [role, setRole] = useState<string | null>(null);

  // Effect to fetch token and role when authentication state changes
  useEffect(() => {
    const fetchTokenAndRole = async () => {
      // Only run if Auth0 is not loading and the user is authenticated
      if (!isLoading && isAuthenticated) {
        try {
          console.log("Navbar Effect: Getting token (isAuthenticated=true, isLoading=false)");
          // Fetch the access token silently
          const token = await getAccessTokenSilently();
          // Store the token in session storage for potential use elsewhere
          sessionStorage.setItem('access_token', token);
          console.log("✅ Access Token stored.");

          // Register the user with the backend (or update last login time)
          // Use catch for potential errors, as this might not be critical path
          fetch(`${backendUrl}/auth/register`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
          }).catch(regError => console.warn("Registration fetch warning:", regError));

          // Fetch the user's role from the backend /auth/me endpoint
          console.log("Fetching user role...");
          const roleRes = await fetch(`${backendUrl}/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` },
          });

          if (roleRes.ok) {
            // If role fetch is successful, update the state
            const data = await roleRes.json();
            setRole(data.role);
            console.log("🧠 Role fetched:", data.role);

            // Handle the specific flow for users who clicked "Become a Seller" before logging in
            const wasTryingToBecomeSeller = sessionStorage.getItem('clicked_become_seller');
            if (wasTryingToBecomeSeller === 'true' && data.role !== 'seller') {
              alert("Welcome! Click 'Become a Seller' again to set up your shop.");
              // Mark the alert as handled in session storage
              sessionStorage.setItem('clicked_become_seller', 'handled');
            }
          } else {
            // Log error if role fetch fails and clear local role state
            console.error("❌ Could not fetch user role. Status:", roleRes.status);
            setRole(null);
          }
        } catch (e) {
          // Handle errors during token fetching or role fetching
          console.error("❌ Error in fetchTokenAndRole:", e);
          // Clear token/role on significant error
          sessionStorage.removeItem('access_token');
          setRole(null);
        }
      } else if (!isLoading && !isAuthenticated) {
        // If Auth0 is done loading and user is NOT authenticated, clear token/role
        console.log("Navbar Effect: Clearing token/role (isAuthenticated=false, isLoading=false)");
        sessionStorage.removeItem('access_token');
        setRole(null);
      } else {
         // Log if the effect is skipped due to loading state or other conditions
         console.log("Navbar Effect: Skipping fetch (isLoading=", isLoading, ", isAuthenticated=", isAuthenticated, ")");
      }
    };

    fetchTokenAndRole();
    // Dependencies: run effect if any of these change
  }, [isAuthenticated, getAccessTokenSilently, isLoading, backendUrl]); // Added backendUrl

  // --- Render Logic ---
  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Logo Section */}
        <div className="logo-container">
          <img src={logo} alt="Hood Goods" className="logo" />
        </div>

        {/* Navigation Menu Links */}
        <ul className="nav-menu">
          {/* Standard navigation links */}
          <li className="nav-item"><a href="#shop" className="nav-link">Shop</a></li>
          <li className="nav-item"><a href="#featured-products" className="nav-link">Products</a></li>
          <li className="nav-item"><a href="#about-us" className="nav-link">About Us</a></li>

          {/* Conditional "Become a Seller" Button */}
          {/* Only show if Auth0 is done loading, user is authenticated, and role is NOT seller */}
          {!isLoading && isAuthenticated && role !== 'seller' && (
            <li className="nav-item">
              <button
                className="nav-link" // Use nav-link class for styling consistency (or create specific button style)
                onClick={() => {
                  // Set flag indicating user wants to become a seller
                  const status = sessionStorage.getItem('clicked_become_seller');
                  if (!status) {
                    sessionStorage.setItem('clicked_become_seller', 'true');
                  }
                  // Redirect to the create store page (assuming user is already authenticated here)
                  window.location.href = '/create-store';
                }}
              >
                Become A Seller
              </button>
            </li>
          )}

          {/* Conditional "My Store" Link */}
          {/* Only show if Auth0 is done loading, user is authenticated, and role IS seller */}
          {!isLoading && isAuthenticated && role === 'seller' && (
            <li className="nav-item">
              <Link to="/my-store" className="nav-link">My Store</Link>
            </li>
          )}
        </ul>

        {/* Icons and Authentication Section */}
        <div className="nav-icons">
          {/* Authentication Buttons */}
          {/* Render nothing while Auth0 SDK is loading */}
          {isLoading ? null : (
             !isAuthenticated ? (
               // Render "Sign in" button if not authenticated
               <button
                 className="sign-in-btn"
                 onClick={() => loginWithRedirect()}
               >
                 Sign in
               </button>
             ) : (
               // Render user greeting and "Sign out" button if authenticated
               <div className="auth-user">
                 {/* Display user's name, providing fallbacks */}
                 <span className="user-greeting">Hi, {user?.given_name ?? user?.name ?? 'User'}</span>
                 <button
                   className="sign-out-btn" // Ensure this class exists and styles correctly
                   onClick={() => logout({
                     logoutParams: { returnTo: window.location.origin } // Redirect to home page after logout
                   })}
                 >
                   Sign out
                 </button>
               </div>
             )
          )}

          {/* Other Icons (Search, Account, Cart) */}
          <a href="#search" className="icon-link">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
              <path fill="none" stroke="currentColor" strokeWidth="2" d="M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM16 16l4.5 4.5" />
            </svg>
          </a>
          <a href="#account" className="icon-link">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
              <path fill="none" stroke="currentColor" strokeWidth="2" d="M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-6 9v-1a6 6 0 0 1 12 0v1" />
            </svg>
          </a>
          <Link to="/cart" className="icon-link">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
              <path fill="none" stroke="currentColor" strokeWidth="2" d="M7 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM17 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM8.3 5H19l-3 7H8.3M4.5 2h2l.6 3" />
            </svg>
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;