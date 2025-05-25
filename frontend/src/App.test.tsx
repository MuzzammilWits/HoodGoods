import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest';
import App from './App'; // The component being tested
import { useAuth0 } from '@auth0/auth0-react'; // Auth0Provider removed as it's not used directly in this file

// --- Mocking Child Components ---
// Using React.Fragment or simple text for minimal mock structure where possible,
// but keeping data-testid for existing query patterns.

vi.mock('./components/Navbar', () => ({
  default: () => <nav data-testid="mock-navbar">Navbar</nav>
}));

vi.mock('./components/Hero', () => ({
  default: () => <section data-testid="mock-hero">Hero</section>
}));

vi.mock('./components/WhyChooseUs', () => ({
  default: () => <section data-testid="mock-why-choose-us">WhyChooseUs</section>
}));

vi.mock('./components/Footer', () => ({
  default: () => <footer data-testid="mock-footer">Footer</footer>
}));

vi.mock('./pages/CartPage', () => ({
  default: () => <div data-testid="mock-cart-page">CartPage Content</div>
}));

vi.mock('./pages/ProductsPage', () => ({
  default: () => <div data-testid="mock-products-page">ProductsPage Content</div>
}));

vi.mock('./pages/CreateYourStore', () => ({
  default: () => <div data-testid="mock-create-your-store">CreateYourStore Content</div>
}));

vi.mock('./pages/MyStore', () => ({
  default: () => <div data-testid="mock-my-store">MyStore Content</div>
}));

vi.mock('./pages/AdminPages/AdminDashboard', () => ({
  default: () => <div data-testid="mock-admin-dashboard">AdminDashboard Content</div>
}));

vi.mock('./pages/CheckoutPage', () => ({
  default: () => <div data-testid="mock-checkout-page">CheckoutPage Content</div>
}));

vi.mock('./pages/OrderConfirmationPage', () => ({
  default: () => <div data-testid="mock-order-confirmation-page">OrderConfirmationPage Content</div>
}));

vi.mock('./pages/SellerDashboardPage', () => ({
  default: () => <div data-testid="mock-seller-dashboard-page">SellerDashboardPage Content</div>
}));

vi.mock('./pages/MyOrdersPage', () => ({
  default: () => <div data-testid="mock-my-orders-page">MyOrdersPage Content</div>
}));

vi.mock('./pages/TermsAndConditionsPage', () => ({
  default: () => <article data-testid="mock-terms-page">TermsAndConditionsPage Content</article>,
}));

vi.mock('./pages/PrivacyPolicyPage', () => ({
    default: () => <article data-testid="mock-privacy-page">PrivacyPolicyPage Content</article>,
}));

vi.mock('./pages/SellerAgreementPage', () => ({
    default: () => <article data-testid="mock-seller-agreement-page">SellerAgreementPage Content</article>,
}));

vi.mock('./pages/RecommendationsPage', () => ({
    default: () => <section data-testid="mock-recommendations-page">RecommendationsPage Content</section>,
}));

vi.mock('./pages/AdminPages/AdminProductApproval', () => ({
    default: () => <article data-testid="mock-admin-product-approval">AdminProductApproval Content</article>,
}));
vi.mock('./pages/AdminPages/AdminStoreApproval', () => ({
    default: () => <article data-testid="mock-admin-store-approval">AdminStoreApproval Content</article>,
}));
vi.mock('./pages/AdminAnalyticsPage', () => ({
    default: () => <section data-testid="mock-admin-analytics-page">AdminAnalyticsPage Content</section>,
}));
vi.mock('./pages/SellerAnalyticsPage', () => ({
    default: () => <section data-testid="mock-seller-analytics-page">SellerAnalyticsPage Content</section>,
}));

// --- Mocking ProtectedRoute ---
// This mock is crucial for testing role-based access.
vi.mock('./components/ProtectedRoute', () => ({
  default: ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles: string[] }) => {
    const { isAuthenticated, user } = useAuth0(); // useAuth0 will be mocked per test scenario
    const userRoles = user?.['https://hoodsgoods.com/roles'] || [];
    const hasRequiredRole = isAuthenticated && (allowedRoles.some(role => userRoles.includes(role)));

    return (
      <div
        data-testid="protected-route"
        data-roles={allowedRoles.join(',')}
        data-authenticated={String(isAuthenticated)} // Convert boolean to string for attribute
        data-has-role={String(hasRequiredRole)}       // Convert boolean to string for attribute
      >
        {hasRequiredRole ? children : <div data-testid="access-denied">Access Denied</div>}
      </div>
    );
  }
}));

// --- Mocking Auth0 ---
const mockUseAuth0 = vi.fn();
vi.mock('@auth0/auth0-react', async () => {
  const actual = await vi.importActual('@auth0/auth0-react'); // Import actual to spread
  return {
    ...actual,
    useAuth0: () => mockUseAuth0(), // This will be controlled by test scenarios
    Auth0Provider: ({ children }: { children: React.ReactNode }) => <>{children}</>, // Simplified mock provider
  };
});

// --- Mocking Services & Components that make network calls ---
vi.mock('./services/recommendationsService', () => ({
  getBestSellingProducts: vi.fn(() => Promise.resolve({ data: [] })), // Mock successful empty response
}));

vi.mock('./components/recommendations/BestSellersList', () => ({
    default: ({ limit, title }: {limit?: number, title?: string}) => ( // Made props optional for safety
        <div data-testid="mock-bestsellers-list" data-limit={limit} data-title={title}>
            Mocked BestSellersList
        </div>
    ),
}));

// --- Auth0 State Scenarios ---
const createAuthState = (isAuthenticated: boolean, roles: string[] = []) => {
  return {
    isAuthenticated,
    user: isAuthenticated ? {
      sub: 'user-123',
      name: 'Test User',
      email: 'test@example.com',
      'https://hoodsgoods.com/roles': roles
    } : undefined,
    isLoading: false,
    loginWithRedirect: vi.fn(),
    logout: vi.fn(),
    getAccessTokenSilently: vi.fn(() => Promise.resolve('mock-token')), // Mock token retrieval
    getAccessTokenWithPopup: vi.fn(() => Promise.resolve('mock-token')),
    getIdTokenClaims: vi.fn(() => Promise.resolve({ __raw: 'mock-id-token' })),
    loginWithPopup: vi.fn(() => Promise.resolve()),
    handleRedirectCallback: vi.fn(() => Promise.resolve(undefined)),
    buildAuthorizeUrl: vi.fn(() => Promise.resolve('http://authorize.url')),
    buildLogoutUrl: vi.fn(() => 'http://logout.url'),
    error: undefined
  };
};

const authScenarios = {
  notAuthenticated: createAuthState(false),
  authenticatedAsBuyer: createAuthState(true, ['buyer']),
  authenticatedAsSeller: createAuthState(true, ['seller']),
  authenticatedAsAdmin: createAuthState(true, ['admin']),
  authenticatedWithMultipleRoles: createAuthState(true, ['buyer', 'seller'])
};

// --- Test Setup ---
beforeEach(() => {
  // Mock import.meta.env
  vi.stubGlobal('import', {
    meta: {
      env: {
        VITE_AUTH0_DOMAIN: 'test-domain.auth0.com',
        VITE_AUTH0_CLIENT_ID: 'test-client-id',
        VITE_AUTH0_AUDIENCE: 'test-audience',
        VITE_AUTH0_CALLBACK_URL: 'http://localhost:5173' // Or your dev server port
      }
    }
  });

  // Mock window.scrollTo
  global.scrollTo = vi.fn();

  // Mock document.getElementById for the homepage scroll effect
  // and ensure scrollIntoView is also a mock function.
  document.getElementById = vi.fn((id) => {
    if (id === 'about-us') {
      const mockElement = document.createElement('div');
      mockElement.scrollIntoView = vi.fn(); // Mock scrollIntoView
      return mockElement;
    }
    // Return a generic mock element for other IDs if necessary, or null
    const genericMockElement = document.createElement('div');
    genericMockElement.scrollIntoView = vi.fn();
    return genericMockElement;
  }) as any;


  // Default Auth0 state for tests (can be overridden in specific tests)
  mockUseAuth0.mockReturnValue(authScenarios.notAuthenticated);
});

afterEach(() => {
  vi.restoreAllMocks(); // Restore all mocks after each test to avoid interference
});

// --- Test Suite ---
describe('App component', () => {
  // Helper function to render with MemoryRouter (preferred for testing routes)
  const renderWithMemoryRouter = (ui: React.ReactElement, { initialEntries = ['/'] } = {}) => {
    return render(ui, { wrapper: ({ children }) => <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter> });
  };
  // renderWithRouter removed as it was unused

  test('renders main structural components', async () => {
    await act(async () => {
        renderWithMemoryRouter(<App />);
    });
    expect(screen.getByTestId('mock-navbar')).toBeInTheDocument();
    expect(screen.getByTestId('mock-footer')).toBeInTheDocument();
  });

  test('renders home page components on root route', async () => {
     await act(async () => {
        renderWithMemoryRouter(<App />, { initialEntries: ['/'] });
    });
    expect(screen.getByTestId('mock-hero')).toBeInTheDocument();
    expect(screen.getByTestId('mock-why-choose-us')).toBeInTheDocument();
    expect(screen.getByTestId('mock-bestsellers-list')).toBeInTheDocument();
  });

  test('renders products page on /products route', async () => {
    await act(async () => {
        renderWithMemoryRouter(<App />, { initialEntries: ['/products'] });
    });
    expect(screen.getByTestId('mock-products-page')).toBeInTheDocument();
  });

  test('shows access denied for cart page when not authenticated', async () => {
    mockUseAuth0.mockReturnValue(authScenarios.notAuthenticated);
    await act(async () => {
        renderWithMemoryRouter(<App />, { initialEntries: ['/cart'] });
    });
    const protectedRoute = screen.getByTestId('protected-route');
    expect(protectedRoute).toBeInTheDocument();
    expect(protectedRoute).toHaveAttribute('data-roles', 'buyer,seller,admin'); // Corrected assertion
    expect(protectedRoute).toHaveAttribute('data-authenticated', 'false');
    expect(protectedRoute).toHaveAttribute('data-has-role', 'false');
    expect(screen.getByTestId('access-denied')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-cart-page')).not.toBeInTheDocument();
  });

  test('shows cart page when authenticated as buyer', async () => {
    mockUseAuth0.mockReturnValue(authScenarios.authenticatedAsBuyer);
     await act(async () => {
        renderWithMemoryRouter(<App />, { initialEntries: ['/cart'] });
    });
    const protectedRoute = screen.getByTestId('protected-route');
    expect(protectedRoute).toBeInTheDocument();
    expect(protectedRoute).toHaveAttribute('data-authenticated', 'true');
    expect(protectedRoute).toHaveAttribute('data-has-role', 'true');
    expect(screen.getByTestId('mock-cart-page')).toBeInTheDocument();
    expect(screen.queryByTestId('access-denied')).not.toBeInTheDocument();
  });

  test('shows cart page when authenticated as seller', async () => {
    mockUseAuth0.mockReturnValue(authScenarios.authenticatedAsSeller);
    await act(async () => {
        renderWithMemoryRouter(<App />, { initialEntries: ['/cart'] });
    });
    expect(screen.getByTestId('mock-cart-page')).toBeInTheDocument();
    expect(screen.queryByTestId('access-denied')).not.toBeInTheDocument();
  });

  test('shows access denied for create store page when authenticated as seller', async () => {
    mockUseAuth0.mockReturnValue(authScenarios.authenticatedAsSeller);
    await act(async () => {
        renderWithMemoryRouter(<App />, { initialEntries: ['/create-store'] });
    });
    expect(screen.getByTestId('protected-route')).toHaveAttribute('data-has-role', 'false');
    expect(screen.getByTestId('access-denied')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-create-your-store')).not.toBeInTheDocument();
  });

  test('shows create store page when authenticated as buyer', async () => {
    mockUseAuth0.mockReturnValue(authScenarios.authenticatedAsBuyer);
    await act(async () => {
        renderWithMemoryRouter(<App />, { initialEntries: ['/create-store'] });
    });
    expect(screen.getByTestId('protected-route')).toHaveAttribute('data-has-role', 'true');
    expect(screen.getByTestId('mock-create-your-store')).toBeInTheDocument();
    expect(screen.queryByTestId('access-denied')).not.toBeInTheDocument();
  });

  test('shows access denied for my store page when authenticated as buyer', async () => {
    mockUseAuth0.mockReturnValue(authScenarios.authenticatedAsBuyer);
    await act(async () => {
        renderWithMemoryRouter(<App />, { initialEntries: ['/my-store'] });
    });
    expect(screen.getByTestId('protected-route')).toHaveAttribute('data-has-role', 'false');
    expect(screen.getByTestId('access-denied')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-my-store')).not.toBeInTheDocument();
  });

  test('shows my store page when authenticated as seller', async () => {
    mockUseAuth0.mockReturnValue(authScenarios.authenticatedAsSeller);
    await act(async () => {
        renderWithMemoryRouter(<App />, { initialEntries: ['/my-store'] });
    });
    expect(screen.getByTestId('protected-route')).toHaveAttribute('data-has-role', 'true');
    expect(screen.getByTestId('mock-my-store')).toBeInTheDocument();
    expect(screen.queryByTestId('access-denied')).not.toBeInTheDocument();
  });

  test('shows access denied for admin dashboard when authenticated as buyer', async () => {
    mockUseAuth0.mockReturnValue(authScenarios.authenticatedAsBuyer);
    await act(async () => {
        renderWithMemoryRouter(<App />, { initialEntries: ['/admin-dashboard'] });
    });
    expect(screen.getByTestId('protected-route')).toHaveAttribute('data-has-role', 'false');
    expect(screen.getByTestId('access-denied')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-admin-dashboard')).not.toBeInTheDocument();
  });

  test('shows admin dashboard when authenticated as admin', async () => {
    mockUseAuth0.mockReturnValue(authScenarios.authenticatedAsAdmin);
    await act(async () => {
        renderWithMemoryRouter(<App />, { initialEntries: ['/admin-dashboard'] });
    });
    expect(screen.getByTestId('protected-route')).toHaveAttribute('data-has-role', 'true');
    expect(screen.getByTestId('mock-admin-dashboard')).toBeInTheDocument();
    expect(screen.queryByTestId('access-denied')).not.toBeInTheDocument();
  });

  test('shows my orders page when authenticated as buyer', async () => {
    mockUseAuth0.mockReturnValue(authScenarios.authenticatedAsBuyer);
    await act(async () => {
        renderWithMemoryRouter(<App />, { initialEntries: ['/my-orders'] });
    });
    expect(screen.getByTestId('protected-route')).toHaveAttribute('data-has-role', 'true');
    expect(screen.getByTestId('mock-my-orders-page')).toBeInTheDocument();
    expect(screen.queryByTestId('access-denied')).not.toBeInTheDocument();
  });

  test('shows my orders page when authenticated as seller', async () => {
    mockUseAuth0.mockReturnValue(authScenarios.authenticatedAsSeller);
    await act(async () => {
        renderWithMemoryRouter(<App />, { initialEntries: ['/my-orders'] });
    });
    expect(screen.getByTestId('protected-route')).toHaveAttribute('data-has-role', 'true');
    expect(screen.getByTestId('mock-my-orders-page')).toBeInTheDocument();
    expect(screen.queryByTestId('access-denied')).not.toBeInTheDocument();
  });

  test('shows access denied for seller dashboard when authenticated as buyer', async () => {
    mockUseAuth0.mockReturnValue(authScenarios.authenticatedAsBuyer);
    await act(async () => {
        renderWithMemoryRouter(<App />, { initialEntries: ['/seller-dashboard'] });
    });
    expect(screen.getByTestId('protected-route')).toHaveAttribute('data-has-role', 'false');
    expect(screen.getByTestId('access-denied')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-seller-dashboard-page')).not.toBeInTheDocument();
  });
});
