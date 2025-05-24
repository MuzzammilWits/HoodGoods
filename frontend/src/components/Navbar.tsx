// frontend/src/components/Navbar.tsx
import React, { useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { Link, useNavigate } from 'react-router-dom';
import './Navbar.css';
import { logo } from './utils/ImageImports';
// Removed useCart import as fetchCart will be triggered by CartPage

const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

const Navbar: React.FC = () => {
  const {
    loginWithRedirect,
    logout,
    isAuthenticated,
    user,
    getAccessTokenSilently,
    isLoading: isAuth0Loading, 
  } = useAuth0();

  const [role, setRole] = useState<string | null>(null);
  const [isRoleLoading, setIsRoleLoading] = useState<boolean>(true);

  const navigate = useNavigate();
  // Removed useCart from Navbar

  useEffect(() => {
    const fetchTokenAndRole = async () => {
      if (!isAuth0Loading && isAuthenticated) { 
        try {
          const token = await getAccessTokenSilently();
          sessionStorage.setItem('access_token', token); 

          fetch(`${backendUrl}/auth/register`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
          }).catch(regError => console.warn("[Navbar] Registration fetch warning:", regError));

          const roleRes = await fetch(`${backendUrl}/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` },
          });

          if (roleRes.ok) {
            const data = await roleRes.json();
            setRole(data.role);
          } else {
            console.error("[Navbar] Failed to fetch role, response not OK:", roleRes.status);
            setRole(null);
          }
        } catch (e) {
          console.error("[Navbar] Error fetching token or role:", e);
          sessionStorage.removeItem('access_token'); 
          setRole(null);
        } finally {
          setIsRoleLoading(false);
        }
      } else if (!isAuth0Loading && !isAuthenticated) {
        sessionStorage.removeItem('access_token');
        setRole(null);
        setIsRoleLoading(false);
      }
    };

    fetchTokenAndRole();
  }, [isAuthenticated, getAccessTokenSilently, isAuth0Loading, backendUrl]); 

  // --- MODIFIED handleCartClick ---
  const handleCartClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault(); // Prevent default Link navigation
    
    console.log('[Navbar] Cart icon clicked. Navigating to /cart with refresh intent.');
    
    // Navigate to /cart and pass a state to indicate a refresh is desired.
    // CartPage will pick this up and call fetchCart.
    navigate('/cart', { state: { refresh: true } }); 
  };

  return (
    <nav className="navbar">
      <header className="navbar-container">
        <figure className="logo-container">
          <img src={logo} alt="Hood Goods" className="logo" />
        </figure>

        <ul className="nav-menu">
          <li className="nav-item"><Link to="/" className="nav-link">Home</Link></li>
          <li className="nav-item"><Link to="/products" className="nav-link">Products</Link></li>
          <li className="nav-item">
            <Link
              to={{ pathname: '/', hash: '#about-us' }}
              state={{ scrollToAbout: true }}
              className="nav-link"
            >
              About Us
            </Link>
          </li>

          {!isAuth0Loading && isAuthenticated && !isRoleLoading && role !== 'seller' && role !== 'admin' && (
            <li className="nav-item">
              <Link to="/seller-agreement" className="nav-link">Become A Seller</Link>
            </li>
          )}

          {!isAuth0Loading && isAuthenticated && !isRoleLoading && role === 'seller' && (
            <li className="nav-item">
              <Link to="/my-store" className="nav-link">My Store</Link>
            </li>
          )}

          {!isAuth0Loading && isAuthenticated && !isRoleLoading && role === 'admin' && (
            <li className="nav-item">
              <Link to="/admin-dashboard" className="nav-link">Admin Dashboard</Link>
            </li>
          )}
        </ul>

        <section className="nav-icons">
          {isAuth0Loading ? null : ( 
            !isAuthenticated ? (
              <button
                className="sign-in-btn"
                onClick={() => loginWithRedirect()}
              >
                Sign in
              </button>
            ) : (
              <article className="auth-user">
                <p className="user-greeting">Hi, {user?.given_name ?? user?.name ?? 'User'}</p>
                <button
                  className="sign-out-btn"
                  onClick={() => logout({
                    logoutParams: { returnTo: window.location.origin }
                  })}
                >
                  Sign out
                </button>
              </article>
            )
          )}

          {isAuthenticated && (
            <Link to="/my-orders" className="icon-link first-icon-link" title="My Orders" aria-label="My Orders">
              <img src="https://icons.iconarchive.com/icons/icons8/windows-8/128/Finance-Purchase-Order-icon.png" alt="My Orders" width="28" height="28" style={{verticalAlign: 'middle'}} />
              <span className="icon-help-text">My Orders</span>
            </Link>
          )}

          {isAuthenticated && (
            <Link 
              to="/cart" 
              className="icon-link" 
              title="My Cart" 
              aria-label="My Cart" 
              onClick={handleCartClick} 
            >
              <svg height="20px" version="1.1" viewBox="0 0 20 20" width="20px" xmlns="http://www.w3.org/2000/svg" xmlnsSketch="http://www.bohemiancoding.com/sketch/ns" xmlnsXlink="http://www.w3.org/1999/xlink"><title/><desc/><defs/><g fill="none" fillRule="evenodd" id="Page-1" stroke="none" strokeWidth="1"><g fill="#000000" id="Core" transform="translate(-212.000000, -422.000000)"><g id="shopping-cart" transform="translate(212.000000, 422.000000)"><path d="M6,16 C4.9,16 4,16.9 4,18 C4,19.1 4.9,20 6,20 C7.1,20 8,19.1 8,18 C8,16.9 7.1,16 6,16 L6,16 Z M0,0 L0,2 L2,2 L5.6,9.6 L4.2,12 C4.1,12.3 4,12.7 4,13 C4,14.1 4.9,15 6,15 L18,15 L18,13 L6.4,13 C6.3,13 6.2,12.9 6.2,12.8 L6.2,12.7 L7.1,11 L14.5,11 C15.3,11 15.9,10.6 16.2,10 L19.8,3.5 C20,3.3 20,3.2 20,3 C20,2.4 19.6,2 19,2 L4.2,2 L3.3,0 L0,0 L0,0 Z M16,16 C14.9,16 14,16.9 14,18 C14,19.1 14.9,20 16,20 C17.1,20 18,19.1 18,18 C18,16.9 17.1,16 16,16 L16,16 Z" id="Shape"/></g></g></g></svg>
              <span className="icon-help-text">My Cart</span>
            </Link>
          )}
        </section>
      </header>
    </nav>
  );
};

export default Navbar;
