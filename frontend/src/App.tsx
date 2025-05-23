// frontend/src/App.tsx
import React from 'react';
import { Auth0Provider, AppState } from '@auth0/auth0-react';
import { Routes, Route, useNavigate, useLocation, Navigate }
from 'react-router-dom';
import { CartProvider } from './context/ContextCart';
import './App.css'; // Relies on this for layout
import ScrollToTop from './components/ScrollToTop';
import { useEffect } from 'react';

// Import Components and Pages
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import WhyChooseUs from './components/WhyChooseUs';
import Footer from './components/Footer';
import CartPage from './pages/CartPage';
import ProductsPage from './pages/ProductsPage';
import CreateYourStore from './pages/CreateYourStore';
import MyStore from './pages/MyStore';
import AdminDashboard from './pages/AdminPages/AdminDashboard';
import AdminProductApproval from './pages/AdminPages/AdminProductApproval';
import AdminStoreApproval from './pages/AdminPages/AdminStoreApproval';
import ProtectedRoute from './components/ProtectedRoute';
import CheckoutPage from './pages/CheckoutPage';
import OrderConfirmationPage from './pages/OrderConfirmationPage';
import SellerDashboardPage from './pages/SellerDashboardPage';
import MyOrdersPage from './pages/MyOrdersPage';
import SellerAnalyticsPage from './pages/SellerAnalyticsPage';
import AdminAnalyticsPage from './pages/AdminAnalyticsPage';
import BestSellersList from './components/recommendations/BestSellersList';
import RecommendationsPage from './pages/RecommendationsPage';
import SellerAgreementPage from './pages/SellerAgreementPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsAndConditionsPage from './pages/TermsAndConditionsPage'; // <-- Added import for the actual page

// The inline placeholder for TermsAndConditionsPage has been removed.

const AppContent: React.FC = () => {
  const navigate = useNavigate();

  const onRedirectCallback = (appState?: AppState) => {
    console.log("Auth0 onRedirectCallback triggered. AppState:", appState);
    const targetPath = appState?.returnTo && appState.returnTo !== window.location.pathname
      ? appState.returnTo
      : window.location.pathname || '/';
    navigate(targetPath);
  };

  return (
    <Auth0Provider
      domain={import.meta.env.VITE_AUTH0_DOMAIN!}
      clientId={import.meta.env.VITE_AUTH0_CLIENT_ID!}
      authorizationParams={{
        audience: import.meta.env.VITE_AUTH0_AUDIENCE,
        redirect_uri: import.meta.env.VITE_AUTH0_CALLBACK_URL || window.location.origin,
      }}
      onRedirectCallback={onRedirectCallback}
      cacheLocation="localstorage"
    >
      <CartProvider>
        <ScrollToTop />
        <header>
          <Navbar />
        </header>

        <main className="app-main-content"> {/* This class handles main content growth */}
          <Routes>
            {/* Public Home Route - uses React.Fragment */}
            <Route path="/" element={
              <React.Fragment>
                <section aria-labelledby="hero-heading">
                  <Hero />
                </section>

                <section aria-labelledby="popular-products-heading" className="homepage-recommendations" style={{ padding: '20px 15px', backgroundColor: 'var(--background-color-light, #f9f9f9)' }}>
                  <h2 id="popular-products-heading" className="visually-hidden">Popular Products</h2>
                  <BestSellersList limit={6} title="Popular This Week" />
                </section>

                <figure className="section-divider" role="presentation">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <path d="M0,100 L 0,40 L 15,75 L 30,25 L 50,85 L 70,20 L 85,70 L 100,40 L 100,100 Z" fill="#432C53"></path>
                  </svg>
                </figure>

                <section aria-labelledby="why-choose-us-heading" style={{ backgroundColor: 'var(--background-color, #fff)', padding: '20px 0' }}>
                  <WhyChooseUs />
                </section>

                {/* Scroll to About Us if requested via state */}
                {(() => {
                  const location = useLocation();
                  useEffect(() => {
                    if (location.state && location.state.scrollToAbout) {
                      const scrollToAbout = () => {
                        const aboutSection = document.getElementById('about-us');
                        if (aboutSection) {
                          aboutSection.scrollIntoView({ behavior: 'smooth' });
                        }
                      };
                      const timer = setTimeout(scrollToAbout, 60);
                      return () => clearTimeout(timer);
                    }
                  }, [location]);
                  return null;
                })()}
              </React.Fragment>
            } />

            {/* Public Products Route */}
            <Route path="/products" element={
              <section aria-label="All Products">
                <ProductsPage />
              </section>
            } />

            <Route path="/recommendations" element={
              <section aria-label="Product Recommendations">
                <RecommendationsPage />
              </section>
            } />

            {/* --- Policy Pages --- */}
            <Route path="/privacy-policy" element={
              <article aria-label="Privacy Policy">
                <PrivacyPolicyPage />
              </article>
            } />
            <Route path="/terms-and-conditions" element={
              <article aria-label="Terms and Conditions"> {/* Wrapped in article */}
                <TermsAndConditionsPage /> {/* Using the imported component */}
              </article>
            } />


            {/* Cart Route (Protected) */}
            <Route path="/cart" element={
              <section aria-label="Shopping Cart">
                <ProtectedRoute allowedRoles={['buyer', 'seller', 'admin']}>
                  <CartPage />
                </ProtectedRoute>
              </section>
            } />

            <Route path="/checkout" element={
              <section aria-label="Checkout">
                <ProtectedRoute allowedRoles={['buyer', 'seller', 'admin']}>
                  <CheckoutPage />
                </ProtectedRoute>
              </section>
            } />

            <Route path="/order-confirmation" element={
              <section aria-label="Order Confirmation">
                <ProtectedRoute allowedRoles={['buyer', 'seller', 'admin']}>
                  <OrderConfirmationPage />
                </ProtectedRoute>
              </section>
            } />

            <Route path="/seller-agreement" element={
              <ProtectedRoute allowedRoles={['buyer', 'admin']}>
                <article aria-label="Seller Agreement">
                  <SellerAgreementPage />
                </article>
              </ProtectedRoute>
            } />

            {/* --- Protected Routes --- */}
            <Route path="/create-store" element={
              <ProtectedRoute allowedRoles={['buyer', 'admin']}>
                <article aria-label="Create Your Store">
                  <CreateYourStore />
                </article>
              </ProtectedRoute>
            } />

            <Route path="/my-store" element={
              <ProtectedRoute allowedRoles={['seller', 'admin']}>
                <article aria-label="My Store Management">
                  <MyStore />
                </article>
              </ProtectedRoute>
            } />

            <Route path="/seller-dashboard" element={
              <ProtectedRoute allowedRoles={['seller', 'admin']}>
                <article aria-label="Seller Dashboard">
                  <SellerDashboardPage />
                </article>
              </ProtectedRoute>
            } />

            <Route
              path="/seller/analytics"
              element={
                <ProtectedRoute allowedRoles={['seller', 'admin']}>
                  <section aria-label="Seller Analytics">
                    <SellerAnalyticsPage />
                  </section>
                </ProtectedRoute>
              }
            />

            <Route path="/admin-dashboard" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <article aria-label="Admin Dashboard">
                  <AdminDashboard />
                </article>
              </ProtectedRoute>
            } />


            <Route path="/admin/product-approval" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <article aria-label="Admin Product Approval">
                  <AdminProductApproval />
                </article>
              </ProtectedRoute>
            } />

            <Route path="/admin/store-approval" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <article aria-label="Admin Store Approval">
                  <AdminStoreApproval />
                </article>
              </ProtectedRoute>
            } />

            <Route path="/admin/reports" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <article aria-label="Admin Reports">
                  <AdminStoreApproval /> {/* Ensure this is the correct component for reports */}
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


            <Route path="/my-orders" element={
              <ProtectedRoute allowedRoles={['buyer', 'seller', 'admin']}>
                <article aria-label="My Orders">
                  <MyOrdersPage />
                </article>
              </ProtectedRoute>
            } />

            {/* Fallback route for unmatched paths */}
            <Route path="*" element={<Navigate to="/" replace />} />

          </Routes>
        </main>

        <footer>
          <Footer />
        </footer>
      </CartProvider>
    </Auth0Provider>
  );
}

function App() {
  return <AppContent />;
}

export default App;
