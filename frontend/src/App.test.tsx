import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import App from './App';

// Mock Auth0
vi.mock('@auth0/auth0-react', () => ({
  Auth0Provider: ({ children }: { children: React.ReactNode }) => children,
  useAuth0: () => ({
    isAuthenticated: true,
    user: { name: 'Test User' },
    loginWithRedirect: vi.fn(),
    logout: vi.fn(),
  }),
}));

test('renders without crashing', () => {
  render(
    <MemoryRouter>
      <App />
    </MemoryRouter>
  );

  // Safer check
  expect(screen.getAllByText(/Products/i).length).toBeGreaterThan(0);
});
