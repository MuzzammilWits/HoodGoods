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
// *** Import the Seller Dashboard Page ***
import SellerDashboardPage from './pages/SellerDashboardPage'; // Adjust path if needed

const AppContent: React.FC = () => {
  const navigate = useNavigate();

  const onRedirectCallback = (appState?: AppState) => {
    console.log("Auth0 onRedirectCallback triggered. AppState:", appState);
    // Navigate to the intended route after login, or fallback to current path/home
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

            {/* Public Cart Route */}
            <Route path="/cart" element={
              <section>
                <CartPage />
              </section>
            } />

            {/* Checkout Route (Should likely be protected) */}
             {/* Consider wrapping CheckoutPage in ProtectedRoute if needed */}
            <Route path="/checkout" element={
              <section>
                 <ProtectedRoute allowedRoles={['buyer', 'seller', 'admin']}> {/* Example: Allow all logged-in */}
                    <CheckoutPage />
                 </ProtectedRoute>
              </section>
            } />


            {/* Order Confirmation Route (Public or Protected?) */}
            {/* Usually public after redirect, but could be protected */}
            <Route path="/order-confirmation" element={
              <section>
                <OrderConfirmationPage />
              </section>
            } />

            {/* --- Protected Routes --- */}
            <Route path="/create-store" element={
              <ProtectedRoute allowedRoles={['buyer']}> {/* Adjust roles as needed */}
                <article>
                  <CreateYourStore />
                </article>
              </ProtectedRoute>
            } />

            <Route path="/my-store" element={
              <ProtectedRoute allowedRoles={['seller']}> {/* Adjust roles as needed */}
                <article>
                  <MyStore />
                </article>
              </ProtectedRoute>
            } />

            <Route path="/admin-dashboard" element={
              <ProtectedRoute allowedRoles={['admin']}> {/* Adjust roles as needed */}
                <article>
                  <AdminDashboard />
                </article>
              </ProtectedRoute>
            } />

            {/* *** ADDED Seller Dashboard Route *** */}
            <Route path="/seller-dashboard" element={
              <ProtectedRoute allowedRoles={['seller']}> {/* Protect for sellers */}
                <article>
                  <SellerDashboardPage />
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

// Keep the structure if AppContent is necessary for context providers
function App() {
  return <AppContent />;
}

export default App;
