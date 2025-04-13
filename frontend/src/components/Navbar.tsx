import React from 'react';
import './Navbar.css';
import { logo } from './utils/ImageImports'; // Using the centralized import

const Navbar: React.FC = () => {
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
            <a href="#products" className="nav-link">Products</a>
          </li>
          <li className="nav-item">
            <a href="#about" className="nav-link">About Us</a>
          </li>
          <li className="nav-item">
            <a href="#become-seller" className="nav-link">Become A Seller</a>
          </li>
        </ul>
        
        <div className="nav-icons">
          <button className="sign-in-btn">Sign in</button>
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
          <a href="#cart" className="icon-link">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
              <path fill="none" stroke="currentColor" strokeWidth="2" d="M7 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM17 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM8.3 5H19l-3 7H8.3M4.5 2h2l.6 3" />
            </svg>
          </a>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;