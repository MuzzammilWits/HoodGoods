// frontend/src/App.tsx
import React from 'react';
import { Auth0Provider, AppState } from '@auth0/auth0-react';
import { Routes, Route, useNavigate } // Removed Link as it's not directly used in App.tsx, but in components like Hero/Navbar
from 'react-router-dom';
import { CartProvider } from './context/ContextCart';
import './App.css';

// Import Components and Pages
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import WhyChooseUs from './components/WhyChooseUs';
import Footer from './components/Footer';
import CartPage from './pages/CartPage';
import ProductsPage from './pages/ProductsPage';
import CreateYourStore from './pages/CreateYourStore';
import MyStore from './pages/MyStore';
import AdminDashboard from './pages/AdminDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import CheckoutPage from './pages/CheckoutPage';
import OrderConfirmationPage from './pages/OrderConfirmationPage';
import SellerDashboardPage from './pages/SellerDashboardPage';
import SellerAnalyticsPage from './pages/SellerAnalyticsPage';
import MyOrdersPage from './pages/MyOrdersPage';
import AdminAnalyticsPage from './pages/AdminAnalyticsPage';

// --- NEW IMPORTS FOR RECOMMENDATIONS ---
import BestSellersList from './components/recommendations/BestSellersList';
import RecommendationsPage from './pages/RecommendationsPage'; // Assuming you've created this page

const AppContent: React.FC = () => {
  const navigate = useNavigate();

  const onRedirectCallback = (appState?: AppState) => {
    console.log("Auth0 onRedirectCallback triggered. AppState:", appState);
    // Navigate to the intended route after login, or to the current path, or fallback to home
    navigate(appState?.returnTo || window.location.pathname || '/');
  };

  return (
    <Auth0Provider
      domain={import.meta.env.VITE_AUTH0_DOMAIN!}
      clientId={import.meta.env.VITE_AUTH0_CLIENT_ID!}
      authorizationParams={{
        audience: import.meta.env.VITE_AUTH0_AUDIENCE,
        redirect_uri: import.meta.env.VITE_AUTH0_CALLBACK_URL || window.location.origin, // Ensure callback URL is correctly configured
      }}
      onRedirectCallback={onRedirectCallback}
      cacheLocation="localstorage" // Using localstorage for cache, consider implications for token storage
    >
      <CartProvider> {/* Cart context wrapping the application */}
        <header>
          <Navbar /> {/* Navbar rendered on all pages */}
        </header>

        <main className="app-main-content"> {/* Added a class for potential global main styling */}
          <Routes>
            {/* Public Home Route */}
            <Route path="/" element={
              <>
                <section aria-labelledby="hero-heading"> {/* Hero section */}
                  <h2 id="hero-heading" className="visually-hidden">Main Showcase</h2> {/* For accessibility */}
                  <Hero />
                </section>
                <section aria-labelledby="why-choose-us-heading" style={{ backgroundColor: 'var(--background-color, #fff)', padding: '20px 0' }}> {/* Why Choose Us section */}
                   <h2 id="why-choose-us-heading" className="visually-hidden">Our Values</h2> {/* For accessibility */}
                  <WhyChooseUs />
                </section>
                {/* --- ADDED BestSellersList to HomePage --- */}
                <section aria-labelledby="popular-products-heading" className="homepage-recommendations" style={{ padding: '20px 15px', backgroundColor: 'var(--background-color-light, #f9f9f9)' }}>
                  <h2 id="popular-products-heading" className="visually-hidden">Popular Products</h2> {/* For accessibility, real title is in BestSellersList */}
                  <BestSellersList limit={6} title="Popular Right Now" />
                </section>
                {/* You might have other homepage sections like <ImageGalleryDisplay /> here */}
              </>
            } />

            {/* Public Products Route */}
            <Route path="/products" element={
              <section aria-label="All Products">
                <ProductsPage />
              </section>
            } />

            {/* --- NEW: Dedicated Recommendations Page Route --- */}
            <Route path="/recommendations" element={
              <section aria-label="Product Recommendations">
                <RecommendationsPage />
              </section>
            } />

            {/* Cart Route (Protected) */}
            <Route path="/cart" element={
              <section aria-label="Shopping Cart">
                <ProtectedRoute allowedRoles={['buyer', 'seller']}>
                  <CartPage />
                </ProtectedRoute>
              </section>
            } />

            {/* Checkout Route (Protected) */}
            <Route path="/checkout" element={
              <section aria-label="Checkout">
                <ProtectedRoute allowedRoles={['buyer', 'seller']}>
                  <CheckoutPage />
                </ProtectedRoute>
              </section>
            } />

            {/* Order Confirmation Route (Protected) */}
            <Route path="/order-confirmation" element={
              <section aria-label="Order Confirmation">
                <ProtectedRoute allowedRoles={['buyer', 'seller']}>
                  <OrderConfirmationPage />
                </ProtectedRoute>
              </section>
            } />

            {/* --- Protected Routes for Sellers and Buyers --- */}
            <Route path="/create-store" element={
              <ProtectedRoute allowedRoles={['buyer']}> {/* Assuming only buyers can become sellers */}
                <article aria-label="Create Your Store">
                  <CreateYourStore />
                </article>
              </ProtectedRoute>
            } />

            <Route path="/my-store" element={
              <ProtectedRoute allowedRoles={['seller']}>
                <article aria-label="My Store Management">
                  <MyStore />
                </article>
              </ProtectedRoute>
            } />

            <Route
              path="/seller/analytics"
              element={
                <ProtectedRoute allowedRoles={['seller']}>
                  <section aria-label="Seller Analytics">
                    <SellerAnalyticsPage />
                  </section>
                </ProtectedRoute>
              }
            />

            <Route path="/seller-dashboard" element={
              <ProtectedRoute allowedRoles={['seller']}>
                <article aria-label="Seller Dashboard">
                  <SellerDashboardPage />
                </article>
              </ProtectedRoute>
            } />

            {/* --- Protected Routes for Admin --- */}
            <Route path="/admin-dashboard" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <article aria-label="Admin Dashboard">
                  <AdminDashboard />
                </article>
              </ProtectedRoute>
            } />

            <Route path="/admin/analytics" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <section aria-label="Admin Platform Analytics">
                  <AdminAnalyticsPage />
                </section>
              </ProtectedRoute>
            } />

            {/* Protected Route for User Orders */}
            <Route path="/my-orders" element={
              <ProtectedRoute allowedRoles={['buyer', 'seller']}>
                <article aria-label="My Orders">
                  <MyOrdersPage />
                </article>
              </ProtectedRoute>
            } />

            {/* Consider adding a 404 Not Found Route here */}
            {/* <Route path="*" element={<NotFoundPage />} /> */}

          </Routes>
        </main>

        <footer>
          <Footer /> {/* Footer rendered on all pages */}
        </footer>
      </CartProvider>
    </Auth0Provider>
  );
}

// The App component that renders AppContent, which contains the router context
function App() {
  // BrowserRouter is typically in main.tsx, so AppContent is used here.
  // If BrowserRouter was here, AppContent would be its child.
  return <AppContent />;
}

export default App;
