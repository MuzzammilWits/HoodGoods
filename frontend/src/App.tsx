import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Auth0Provider } from '@auth0/auth0-react';
import AuthButtons from './AuthButtons';
import AdminDashboard from './AdminDashboard';

function App() {
  return (
    <Auth0Provider
      domain={import.meta.env.VITE_AUTH0_DOMAIN}
      clientId={import.meta.env.VITE_AUTH0_CLIENT_ID}
      authorizationParams={{
        audience: import.meta.env.VITE_AUTH0_AUDIENCE,
        redirect_uri: import.meta.env.VITE_AUTH0_CALLBACK_URL,
        prompt: "login" // Forces fresh login screen
      }}
    >
      <BrowserRouter>
        <Routes>
          <Route path="/" element={
            <main>
              <h1>Welcome to HoodGoods</h1>
              <AuthButtons />
            </main>
          } />
          <Route path="/admin-dashboard" element={<AdminDashboard />} />
          <Route path="/test" element={<h1>Test Page</h1>} />
        </Routes>
      </BrowserRouter>
    </Auth0Provider>
  );
}

export default App; 