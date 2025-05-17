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
import MyOrdersPage from './pages/MyOrdersPage';
// --- RESTORED IMPORTS for Analytics Pages ---
import SellerAnalyticsPage from './pages/SellerAnalyticsPage';
import AdminAnalyticsPage from './pages/AdminAnalyticsPage';


// --- NEW IMPORTS FOR RECOMMENDATIONS ---
import BestSellersList from './components/recommendations/BestSellersList';
import RecommendationsPage from './pages/RecommendationsPage'; // Assuming you've created this page

const AppContent: React.FC = () => {
  const navigate = useNavigate();

  const onRedirectCallback = (appState?: AppState) => {
    console.log("Auth0 onRedirectCallback triggered. AppState:", appState);
    navigate(appState?.returnTo || window.location.pathname || '/');
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
        <header>
          <Navbar />
        </header>

        <main className="app-main-content"> {/* Added a class for potential global main styling */}
          <Routes>
            {/* Public Home Route */}
            <Route path="/" element={
              <>
                <section aria-labelledby="hero-heading">
                  {/* Visually hidden h2 for "Main Showcase" removed as requested */}
                  <Hero />
                </section>

                {/* --- ADDED BestSellersList (Popular Products) right above WhyChooseUs --- */}
                <section aria-labelledby="popular-products-heading" className="homepage-recommendations" style={{ padding: '20px 15px', backgroundColor: 'var(--background-color-light, #f9f9f9)' }}>
                  <h2 id="popular-products-heading" className="visually-hidden">Popular Products</h2> {/* Keeping this one as BestSellersList has its own visible title */}
                  <BestSellersList limit={6} title="Popular This Week" />
                </section>

                <section aria-labelledby="why-choose-us-heading" style={{ backgroundColor: 'var(--background-color, #fff)', padding: '20px 0' }}>
                   {/* Visually hidden h2 for "Our Values" removed as requested */}
                  <WhyChooseUs />
                </section>
                {/* Other homepage sections might follow here */}
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

            {/* --- Protected Routes --- */}
            <Route path="/create-store" element={
              <ProtectedRoute allowedRoles={['buyer']}>
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

            <Route path="/seller-dashboard" element={
              <ProtectedRoute allowedRoles={['seller']}>
                <article aria-label="Seller Dashboard">
                  <SellerDashboardPage />
                </article>
              </ProtectedRoute>
            } />
            
            {/* --- RESTORED Seller Analytics Page Route --- */}
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

            <Route path="/admin-dashboard" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <article aria-label="Admin Dashboard">
                  <AdminDashboard />
                </article>
              </ProtectedRoute>
            } />

            {/* --- RESTORED Admin Analytics Page Route --- */}
            <Route path="/admin/analytics" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <section aria-label="Admin Platform Analytics"> {/* Changed from <article> to <section> for consistency with SellerAnalytics */}
                  <AdminAnalyticsPage />
                </section>
              </ProtectedRoute>
            } />

            <Route path="/my-orders" element={
              <ProtectedRoute allowedRoles={['buyer', 'seller']}>
                <article aria-label="My Orders">
                  <MyOrdersPage />
                </article>
              </ProtectedRoute>
            } />

            {/* Consider a 404 Not Found Route */}
            {/* <Route path="*" element={<NotFoundPage />} /> */}

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
