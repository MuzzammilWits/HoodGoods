import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { useAuth0, User, Auth0ContextInterface } from '@auth0/auth0-react';
import Hero from './Hero';

// Mock useAuth0
vi.mock('@auth0/auth0-react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@auth0/auth0-react')>();
  return {
    ...actual,
    useAuth0: vi.fn(),
  };
});
const mockUseAuth0 = vi.mocked(useAuth0);


// Mock Vanta.js on the global window object
const mockVantaDestroyFn = vi.fn();
const mockVantaFogFn = vi.fn(() => ({
  destroy: mockVantaDestroyFn,
}));

// Helper function to set up the full Auth0 mock
const setupAuth0Mock = (options: Partial<Auth0ContextInterface<User>> = {}) => {
  const defaults: Auth0ContextInterface<User> = {
    isAuthenticated: false,
    user: undefined,
    loginWithRedirect: vi.fn(),
    isLoading: false,
    getAccessTokenSilently: vi.fn().mockResolvedValue('mock-access-token'),
    getAccessTokenWithPopup: vi.fn(),
    getIdTokenClaims: vi.fn(),
    loginWithPopup: vi.fn(),
    logout: vi.fn(),
    handleRedirectCallback: vi.fn(),
  };
  mockUseAuth0.mockReturnValue({ ...defaults, ...options });
};


describe('Hero Component', () => {
  let originalVanta: typeof window.VANTA | undefined;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  const originalWindowLocation = window.location;

  beforeEach(() => {
    vi.clearAllMocks();
    setupAuth0Mock();

    originalVanta = window.VANTA;
    // @ts-ignore
    window.VANTA = { FOG: mockVantaFogFn };

    // Mock window.location by replacing it, using 'as any' for window to bypass strict global type
    // @ts-ignore
    delete window.location;
    (window as any).location = {
      // Provide a base structure. Specific tests can override pathname.
      // Start with a minimal set of properties often checked or used with location.
      href: 'http://localhost:3000/default-test-path',
      pathname: '/default-test-path',
      search: '',
      hash: '',
      assign: vi.fn(),
      replace: vi.fn(),
      reload: vi.fn(),
      // This simplified mock focuses on what's typically interacted with in tests.
    };


    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    if (originalVanta) {
      window.VANTA = originalVanta;
    } else {
      // @ts-ignore
      delete window.VANTA;
    }
    // Restore original window.location
    (window as any).location = originalWindowLocation;

    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    cleanup();
  });

  const renderWithRouter = (ui: React.ReactElement) => {
    return render(ui, { wrapper: MemoryRouter });
  };

  it('renders static content correctly', () => {
    renderWithRouter(<Hero />);
    expect(screen.getByRole('heading', { name: /Find Your Kind Of Handmade/i })).toBeInTheDocument();
    expect(screen.getByText(/From bold and modern to cozy and traditional/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Shop now/i })).toHaveAttribute('href', '/products');
    expect(screen.getByRole('link', { name: /Discover/i })).toHaveAttribute('href', '/recommendations');
    // expect(screen.getByAltText('HoodGoods Logo')).toHaveAttribute('src', '/src/assets/logo.svg');
  });

  describe('Vanta.js FOG Effect', () => {
    it('initializes VANTA.FOG on mount if available', () => {
      renderWithRouter(<Hero />);
      expect(consoleLogSpy).toHaveBeenCalledWith("Initializing Vanta Fog effect (run once)...");
      expect(mockVantaFogFn).toHaveBeenCalledTimes(1);
      expect(mockVantaFogFn).toHaveBeenCalledWith(expect.objectContaining({
        el: expect.any(HTMLElement),
        mouseControls: true,
        highlightColor: 0x6514a4,
      }));
    });

    it('calls destroy on the Vanta effect instance on unmount', () => {
      const { unmount } = renderWithRouter(<Hero />);
      unmount();
      expect(mockVantaDestroyFn).toHaveBeenCalledTimes(1);
      expect(consoleLogSpy).toHaveBeenCalledWith("Vanta Fog effect destroyed.");
    });

    it('logs a warning if VANTA.FOG is not available', () => {
      // @ts-ignore
      delete window.VANTA.FOG;
      renderWithRouter(<Hero />);
      expect(mockVantaFogFn).not.toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledWith("Vanta.js FOG or target element not ready for initialization.");
    });

     it('logs a warning if window.VANTA itself is not available', () => {
      // @ts-ignore
      delete window.VANTA;
      renderWithRouter(<Hero />);
      expect(mockVantaFogFn).not.toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledWith("Vanta.js FOG or target element not ready for initialization.");
    });
  });

  describe('Authentication Prompt', () => {
    it('shows the login prompt if not authenticated and not loading', () => {
      setupAuth0Mock({ isAuthenticated: false, isLoading: false });
      renderWithRouter(<Hero />);
      expect(screen.getByText(/Ready to share your unique creations/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Sign up or Log in/i })).toBeInTheDocument();
    });

    it('does not show the login prompt if authenticated', () => {
      setupAuth0Mock({ isAuthenticated: true, isLoading: false });
      renderWithRouter(<Hero />);
      expect(screen.queryByText(/Ready to share your unique creations/i)).not.toBeInTheDocument();
    });

    it('does not show the login prompt if Auth0 is loading', () => {
      setupAuth0Mock({ isAuthenticated: false, isLoading: true });
      renderWithRouter(<Hero />);
      expect(screen.queryByText(/Ready to share your unique creations/i)).not.toBeInTheDocument();
    });

    it('calls loginWithRedirect with appState when "Sign up or Log in" is clicked', async () => {
      const user = userEvent.setup();
      const mockLoginWithRedirect = vi.fn();
      
      (window as any).location.pathname = '/custom-path-for-this-test';

      setupAuth0Mock({
        isAuthenticated: false,
        isLoading: false,
        loginWithRedirect: mockLoginWithRedirect,
      });

      renderWithRouter(<Hero />);
      const loginButton = screen.getByRole('button', { name: /Sign up or Log in/i });
      await user.click(loginButton);

      expect(mockLoginWithRedirect).toHaveBeenCalledTimes(1);
      expect(mockLoginWithRedirect).toHaveBeenCalledWith({
        appState: { returnTo: '/custom-path-for-this-test' },
      });
    });
  });
});