// src/App.tsx
import React from 'react';
import { Auth0Provider, AppState } from '@auth0/auth0-react';
import { Routes, Route, useNavigate } from 'react-router-dom';
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
import AdminAnalyticsPage from './pages/AdminAnalyticsPage'; // <-- NEW: Import AdminAnalyticsPage

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

        <main>
          <Routes>
            {/* Public Home Routes */}
            <Route path="/" element={
              <>
                <section>
                  <Hero />
                </section>
                <section>
                  <WhyChooseUs />
                </section>
              </>
            } />

            {/* Public Products Route */}
            <Route path="/products" element={
              <section>
                <ProductsPage />
              </section>
            } />

            {/* Cart Route (Protected) */}
            <Route path="/cart" element={
              <section>
                <ProtectedRoute allowedRoles={['buyer', 'seller']}>
                  <CartPage />
                </ProtectedRoute>
              </section>
            } />

            {/* Checkout Route (Protected) */}
            <Route path="/checkout" element={
              <section>
                 <ProtectedRoute allowedRoles={['buyer', 'seller']}>
                    <CheckoutPage />
                 </ProtectedRoute>
              </section>
            } />

            {/* Order Confirmation Route (Protected) */}
            <Route path="/order-confirmation" element={
              <section>
                 <ProtectedRoute allowedRoles={['buyer', 'seller']}>
                   <OrderConfirmationPage />
                 </ProtectedRoute>
              </section>
            } />

            {/* --- Protected Routes --- */}
            <Route path="/create-store" element={
              <ProtectedRoute allowedRoles={['buyer']}>
                <article>
                  <CreateYourStore />
                </article>
              </ProtectedRoute>
            } />

            <Route path="/my-store" element={
              <ProtectedRoute allowedRoles={['seller']}>
                <article>
                  <MyStore />
                </article>
              </ProtectedRoute>
            } />

            <Route
              path="/seller/analytics"
              element={
                <ProtectedRoute allowedRoles={['seller']}>
                  <SellerAnalyticsPage />
                </ProtectedRoute>
              }
            />  

             <Route path="/seller-dashboard" element={
              <ProtectedRoute allowedRoles={['seller']}>
                <article>
                  <SellerDashboardPage />
                </article>
              </ProtectedRoute>
            } />

            <Route path="/admin-dashboard" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <article>
                  <AdminDashboard />
                </article>
              </ProtectedRoute>
            } />

            {/* *** NEW: Admin Analytics Page Route *** */}
            <Route path="/admin/analytics" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <article>
                  <AdminAnalyticsPage />
                </article>
              </ProtectedRoute>
            } />

            <Route path="/my-orders" element={
              <ProtectedRoute allowedRoles={['buyer', 'seller']}>
                <article>
                  <MyOrdersPage />
                </article>
              </ProtectedRoute>
            } />

            {/* Add other routes as needed */}

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