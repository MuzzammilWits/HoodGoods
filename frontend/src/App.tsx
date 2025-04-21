// src/App.tsx
import React from 'react'; // Import React if not already
import { Auth0Provider, AppState} from '@auth0/auth0-react';
import { Routes, Route, useNavigate } from 'react-router-dom'; // Import useNavigate
import { CartProvider } from './context/ContextCart'; // Ensure path is correct
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



// Define a component to handle protected routes
// This uses withAuthenticationRequired HOC from Auth0 SDK
import ProtectedRoute from './components/ProtectedRoute'; // adjust the path if it's somewhere else



// Main App Component needs to be wrapped by BrowserRouter in main.tsx/index.tsx
// But useNavigate hook needs to be called within a Router context.
// So we create a wrapper component.
const AppContent: React.FC = () => {
  const navigate = useNavigate(); // Hook for navigation

  // Define the callback function for Auth0 redirect
  const onRedirectCallback = (appState?: AppState) => {
    console.log("Auth0 onRedirectCallback triggered. AppState:", appState);
    // Use navigate to redirect the user to the intended route or home
    // appState?.returnTo is the URL the user tried to access before being prompted to login
    navigate(appState?.returnTo || window.location.pathname || '/');
  };

  

  return (
    <Auth0Provider
      domain={import.meta.env.VITE_AUTH0_DOMAIN!} // Add non-null assertion if confident env vars are set
      clientId={import.meta.env.VITE_AUTH0_CLIENT_ID!}
      authorizationParams={{
        audience: import.meta.env.VITE_AUTH0_AUDIENCE,
        redirect_uri: import.meta.env.VITE_AUTH0_CALLBACK_URL || window.location.origin, // Ensure a fallback if env var missing
      }}
      // Add the crucial onRedirectCallback prop
      onRedirectCallback={onRedirectCallback}
      // Optional: Recommended cache location for SPAs
      cacheLocation="localstorage"
    >
      <CartProvider>
        <div className="app">
          <Navbar />
          <main>
            <Routes>
              {/* Public Home Route */}
              <Route path="/" element={
                <>
                  <Hero />
                  <WhyChooseUs />
                </>
              } />

              <Route path="/products" element={<ProductsPage />} />

              {/* Public Cart Route (can be protected if needed) */}

              <Route path="/cart" element={<CartPage />} />

              {/* Protected Routes */}
              <Route
                  path="/create-store"
                  element={
                    <ProtectedRoute allowedRoles={['buyer']}>
                      <CreateYourStore />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/my-store"
                  element={
                    <ProtectedRoute allowedRoles={['seller']}>
                      <MyStore />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin-dashboard"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <AdminDashboard />
                    </ProtectedRoute>
                  }
                />
              {/* Add other routes as needed */}
            </Routes>
          </main>
          <Footer />
        </div>
      </CartProvider>
    </Auth0Provider>
  );
}

// The main export remains App, but it now just renders AppContent
// This structure allows useNavigate to be used within AppContent which is inside BrowserRouter
function App() {
  return <AppContent />;
}

export default App;