// src/App.test.tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom'; // Use MemoryRouter for routing context
import '@testing-library/jest-dom';
import { vi } from 'vitest'; // Use vi from vitest
import App from './App';

// --- Mock Auth0 ---
// Mock the entire module
vi.mock('@auth0/auth0-react', () => ({
  // Mock the Provider component as a simple pass-through
  Auth0Provider: ({ children }: { children: React.ReactNode }) => children,
  // Mock the useAuth0 hook
  useAuth0: () => ({
    isAuthenticated: true, // Simulate authenticated state
    isLoading: false, // Simulate loading finished
    user: { // Provide mock user data
        name: 'Test User',
        email: 'test@example.com',
        sub: 'auth0|123456', // Example unique user ID
        // Add other user properties if your app uses them
    },
    loginWithRedirect: vi.fn(), // Mock login function
    logout: vi.fn(), // Mock logout function
    // *** ADDED: Mock getAccessTokenSilently ***
    getAccessTokenSilently: vi.fn().mockResolvedValue('mock-test-access-token'), // Mock token function
    // Add other functions/properties your App might use from useAuth0
    // For example:
    // getIdTokenClaims: vi.fn(),
    // handleRedirectCallback: vi.fn(),
  }),
}));

// --- Mock ContextCart if App uses it directly or indirectly ---
// If your CartProvider also calls useAuth0, ensure it gets the mocked version.
// Often, mocking at the top level like above is sufficient.
// If CartProvider makes its own fetch calls, you might need to mock fetch here too.
vi.mock('./context/ContextCart', async (importOriginal) => {
    const original = await importOriginal() as any; // Import original to get exports
    return {
        ...original, // Keep original exports like CartProvider
        // If useCart hook needs mocking (less common unless testing specific cart logic here)
        // useCart: () => ({ /* mock cart state and functions */ }),
    };
});


// --- Mock fetch globally (optional but good practice for App test) ---
// This prevents actual network calls from any component within App
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}), // Default mock response
  })
) as any;


// --- Test Case ---
test('renders without crashing and shows basic layout', () => {
  render(
    // Wrap App in MemoryRouter because it likely contains Routes/Links
    <MemoryRouter>
      <App />
    </MemoryRouter>
  );

  // Example assertion: Check if an element typically rendered by Navbar or a main page exists.
  // Use findBy* if the element appears asynchronously.
  // Using getAllByText is okay if you expect multiple instances *synchronously*.
  // Let's check for something likely in the Navbar when logged in.
  // Adjust the text based on your actual Navbar content.
  expect(screen.getByText(/Test User/i)).toBeInTheDocument(); // Check if mock user name is displayed

  // Or check for a common navigation link
  expect(screen.getByRole('link', { name: /products/i })).toBeInTheDocument();

});
