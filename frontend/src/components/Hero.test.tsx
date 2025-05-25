import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Hero from './Hero'; // Adjust the import path as needed
import { useAuth0, Auth0ContextInterface, User } from '@auth0/auth0-react';

// --- Mocking Dependencies ---

// Mock the useAuth0 hook
vi.mock('@auth0/auth0-react', () => ({
  useAuth0: vi.fn(),
}));

// Mock the logo asset
vi.mock('/src/assets/logo.svg', () => ({
  default: 'mock-logo.svg',
}));

// --- Test Suite Setup ---
const mockUseAuth0 = vi.mocked(useAuth0);

// Create a complete, type-safe mock for the Auth0 context.
// This helper function allows us to override specific properties for each test.
const createAuth0Mock = (
  overrides: Partial<Auth0ContextInterface<User>>
): Auth0ContextInterface<User> => {
  const defaults: Auth0ContextInterface<User> = {
    // Default values that satisfy the type
    isAuthenticated: false,
    isLoading: false,
    user: undefined,
    loginWithRedirect: vi.fn(),
    logout: vi.fn(),
    getAccessTokenSilently: vi.fn(),
    getAccessTokenWithPopup: vi.fn(),
    getIdTokenClaims: vi.fn(),
    loginWithPopup: vi.fn(),
    handleRedirectCallback: vi.fn(),
  };
  return { ...defaults, ...overrides };
};


describe('Hero Component', () => {
  // Mock the global VANTA object before each test
  beforeEach(() => {
    const mockVantaEffect = {
      destroy: vi.fn(),
    };
    window.VANTA = {
      FOG: vi.fn().mockReturnValue(mockVantaEffect),
    };
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    delete (window as any).VANTA;
  });

  const renderComponent = () => {
    return render(
      <MemoryRouter>
        <Hero />
      </MemoryRouter>
    );
  };

  it('should render the main title, text, and navigation buttons', () => {
    // Use the helper to create a complete mock
    mockUseAuth0.mockReturnValue(createAuth0Mock({
      isAuthenticated: false,
      isLoading: false
    }));

    renderComponent();

    expect(screen.getByRole('heading', { name: /Find Your Kind Of Handmade/i })).toBeInTheDocument();
    expect(screen.getByText(/From bold and modern to cozy and traditional/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /shop now/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /discover/i })).toBeInTheDocument();
    expect(screen.getByAltText('HoodGoods Logo')).toBeInTheDocument();
  });

  describe('Authentication Scenarios', () => {
    it('should display the seller prompt when the user is not authenticated and not loading', () => {
      mockUseAuth0.mockReturnValue(createAuth0Mock({
        isAuthenticated: false,
        isLoading: false,
      }));

      renderComponent();

      const prompt = screen.getByText(/Ready to share your unique creations/i);
      expect(prompt).toBeInTheDocument();
      
      const loginButton = screen.getByRole('button', { name: /Sign up or Log in/i });
      expect(loginButton).toBeInTheDocument();
    });

    it('should call loginWithRedirect when the login button is clicked', () => {
      const loginWithRedirect = vi.fn();
      mockUseAuth0.mockReturnValue(createAuth0Mock({
        isAuthenticated: false,
        isLoading: false,
        loginWithRedirect, // Pass the specific spy for this test
      }));

      renderComponent();
      
      const loginButton = screen.getByRole('button', { name: /Sign up or Log in/i });
      fireEvent.click(loginButton);

      expect(loginWithRedirect).toHaveBeenCalledTimes(1);
      expect(loginWithRedirect).toHaveBeenCalledWith({
        appState: { returnTo: window.location.pathname },
      });
    });

    it('should NOT display the seller prompt when the user is authenticated', () => {
      mockUseAuth0.mockReturnValue(createAuth0Mock({
        isAuthenticated: true,
        isLoading: false,
      }));

      renderComponent();
      
      const prompt = screen.queryByText(/Ready to share your unique creations/i);
      expect(prompt).not.toBeInTheDocument();
    });

    it('should NOT display the seller prompt when the auth state is loading', () => {
      mockUseAuth0.mockReturnValue(createAuth0Mock({
        isAuthenticated: false,
        isLoading: true,
      }));

      renderComponent();

      const prompt = screen.queryByText(/Ready to share your unique creations/i);
      expect(prompt).not.toBeInTheDocument();
    });
  });

  describe('Vanta.js Background Effect', () => {
    it('should initialize the VANTA.FOG effect on mount', () => {
      mockUseAuth0.mockReturnValue(createAuth0Mock({
        isAuthenticated: false,
        isLoading: false,
      }));

      renderComponent();

      expect(window.VANTA.FOG).toHaveBeenCalledTimes(1);
      expect(window.VANTA.FOG).toHaveBeenCalledWith(
        expect.objectContaining({
          highlightColor: 0x6514a4,
        })
      );
    });

    it('should clean up the VANTA effect on unmount', () => {
      mockUseAuth0.mockReturnValue(createAuth0Mock({
        isAuthenticated: false,
        isLoading: false,
      }));

      const { unmount } = renderComponent();

      expect(window.VANTA.FOG).toHaveBeenCalledTimes(1);
      const mockEffectInstance = (window.VANTA.FOG as any).mock.results[0].value;
      
      unmount();

      expect(mockEffectInstance.destroy).toHaveBeenCalledTimes(1);
    });
  });
});