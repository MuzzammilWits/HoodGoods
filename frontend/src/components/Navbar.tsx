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
  const [isRoleLoading, setIsRoleLoading] = useState<boolean>(true); // Flag to handle loading state for role

  // Effect to fetch token and role when authentication state changes
  useEffect(() => {
    const fetchTokenAndRole = async () => {
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
            const data = await roleRes.json();
            setRole(data.role);
            console.log("🧠 Role fetched:", data.role);
          } else {
            console.error("❌ Could not fetch user role. Status:", roleRes.status);
            setRole(null);
          }
        } catch (e) {
          console.error("❌ Error in fetchTokenAndRole:", e);
          sessionStorage.removeItem('access_token');
          setRole(null);
        } finally {
          setIsRoleLoading(false); // Ensure loading flag is set to false once role is fetched
        }
      } else if (!isLoading && !isAuthenticated) {
        // If Auth0 is done loading and user is NOT authenticated, clear token/role
        console.log("Navbar Effect: Clearing token/role (isAuthenticated=false, isLoading=false)");
        sessionStorage.removeItem('access_token');
        setRole(null);
        setIsRoleLoading(false);
      } else {
        console.log("Navbar Effect: Skipping fetch (isLoading=", isLoading, ", isAuthenticated=", isAuthenticated, ")");
      }
    };

    fetchTokenAndRole();
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
          <li className="nav-item"><Link to="/" className="nav-link">Home</Link></li>
          <li className="nav-item"><Link to="products" className="nav-link">Products</Link></li>
          <li className="nav-item"><a href="#about-us" className="nav-link">About Us</a></li>

          {/* Conditional "Become a Seller" Button */}
          {/* Only show if Auth0 is done loading, user is authenticated, and role is NOT seller */}
          {!isLoading && isAuthenticated && !isRoleLoading && role !== 'seller' && role !== 'admin' && (
            <li className="nav-item">
              <button
                className="nav-link" // Use nav-link class for styling consistency (or create specific button style)
                onClick={() => {
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
          {!isLoading && isAuthenticated && !isRoleLoading && role === 'seller' && (
            <li className="nav-item">
              <Link to="/my-store" className="nav-link">My Store</Link>
            </li>
          )}

          {/* Conditional "Admin Dashboard" Link */}
          {/* Only show if user is authenticated and role is admin */}
          {!isLoading && isAuthenticated && !isRoleLoading && role === 'admin' && (
            <li className="nav-item">
              <Link to="/admin-dashboard" className="nav-link">Admin Dashboard</Link>
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
              <path fill="none" stroke="currentColor" strokeWidth="2" d="M12 11a4 4 0 1 0-4-4 4 4 0 0 0 4 4zm0 0v5m0 0v5" />
            </svg>
          </a>
          <Link to="/cart" className="icon-link">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
              <path fill="none" stroke="currentColor" strokeWidth="2" d="M2 4h4l3 9h8l3-9h4" />
              <path fill="none" stroke="currentColor" strokeWidth="2" d="M7 13h10" />
            </svg>
            </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
