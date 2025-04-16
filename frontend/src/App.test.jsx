import { render, screen } from '@testing-library/react';
import App from './App'; // Adjust the path if necessary
import { BrowserRouter } from 'react-router-dom'; // Needed for <Routes> to work
import { Auth0Provider } from '@auth0/auth0-react'; // For Auth0 context
import { CartProvider } from './context/ContextCart'; // For Cart context

// Mock the environment variables for Auth0
process.env.VITE_AUTH0_DOMAIN = 'mock-domain';
process.env.VITE_AUTH0_CLIENT_ID = 'mock-client-id';
process.env.VITE_AUTH0_AUDIENCE = 'mock-audience';
process.env.VITE_AUTH0_CALLBACK_URL = 'mock-callback-url';

test('renders the app and checks essential elements', () => {
  render(
    <Auth0Provider
      domain={process.env.VITE_AUTH0_DOMAIN}
      clientId={process.env.VITE_AUTH0_CLIENT_ID}
      authorizationParams={{
        audience: process.env.VITE_AUTH0_AUDIENCE,
        redirect_uri: process.env.VITE_AUTH0_CALLBACK_URL,
      }}
    >
      <CartProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </CartProvider>
    </Auth0Provider>
  );

  // Check if key components are in the document
  expect(screen.getByText(/hero/i)).toBeInTheDocument(); // Adjust the text content check
  expect(screen.getByText(/explore shops/i)).toBeInTheDocument(); // Adjust the text content check
  expect(screen.getByText(/featured products/i)).toBeInTheDocument(); // Adjust the text content check
  expect(screen.getByText(/why choose us/i)).toBeInTheDocument(); // Adjust the text content check
  expect(screen.getByText(/footer/i)).toBeInTheDocument(); // Adjust the text content check

  // Check if the navbar is rendered
  const navbar = screen.getByRole('navigation');
  expect(navbar).toBeInTheDocument();
});
