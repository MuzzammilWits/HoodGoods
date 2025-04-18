import React, { useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { Link } from 'react-router-dom';
import './Navbar.css';
import { logo } from './utils/ImageImports';

const Navbar: React.FC = () => {
  const {
    loginWithRedirect,
    logout,
    isAuthenticated,
    user,
    getAccessTokenSilently,
  } = useAuth0();

  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const fetchToken = async () => {
      try {
        const token = await getAccessTokenSilently();
        sessionStorage.setItem('access_token', token);
        console.log("✅ Access Token:", token);

        // Send token to your server for registration
        await fetch('http://localhost:3000/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });

        // Fetch role from backend
        const roleRes = await fetch('http://localhost:3000/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (roleRes.ok) {
          const data = await roleRes.json();
          setRole(data.role);
          console.log("🧠 Role:", data.role);

          // Show alert if user was trying to become a seller (only once)
          const wasTryingToBecomeSeller = sessionStorage.getItem('clicked_become_seller');
          if (wasTryingToBecomeSeller === 'true' && data.role !== 'seller') {
            alert("Welcome! Click 'Become a Seller' again to set up your shop.");
            sessionStorage.setItem('clicked_become_seller', 'handled');
          }
        } else {
          console.error("❌ Could not fetch user role");
        }
      } catch (e) {
        console.error("❌ Error getting token:", e);
      }
    };

    if (isAuthenticated) {
      fetchToken();
    }
  }, [isAuthenticated, getAccessTokenSilently]);

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="logo-container">
          <img src={logo} alt="Hood Goods" className="logo" />
        </div>

        <ul className="nav-menu">
          <li className="nav-item">
            <a href="#shop" className="nav-link">Shop</a>
          </li>
          <li className="nav-item">
            <a href="#featured-products" className="nav-link">Products</a>
          </li>
          <li className="nav-item">
            <a href="#about-us" className="nav-link">About Us</a>
          </li>

          {/* Show Become a Seller or My Store */}
          {role !== 'seller' && (
            <li className="nav-item">
              <button
                className="nav-link"
                onClick={() => {
                  const status = sessionStorage.getItem('clicked_become_seller');
                  if (!status) {
                    sessionStorage.setItem('clicked_become_seller', 'true');
                  }

                  if (!isAuthenticated) {
                    loginWithRedirect();
                  } else {
                    window.location.href = '/create-store';
                  }
                }}
              >
                Become A Seller
              </button>
            </li>
          )}

          {isAuthenticated && role === 'seller' && (
            <li className="nav-item">
              <Link to="/my-store" className="nav-link">My Store</Link>
            </li>
          )}
        </ul>

        <div className="nav-icons">
          {!isAuthenticated ? (
            <button 
              className="sign-in-btn"
              onClick={() => loginWithRedirect()}
            >
              Sign in
            </button>
          ) : (
            <div className="auth-user">
              <span className="user-greeting">Hi, {user?.given_name || user?.name}</span>
              <button 
                className="sign-out-btn"
                onClick={() => logout({
                  logoutParams: {
                    returnTo: window.location.origin
                  }
                })}
              >
                Sign out
              </button>
            </div>
          )}

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
