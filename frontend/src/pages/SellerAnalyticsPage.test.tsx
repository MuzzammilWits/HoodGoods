// src/pages/SellerAnalyticsPage.test.tsx
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom'; 
import SellerAnalyticsPage from './SellerAnalyticsPage';
import { useAuth0 } from '@auth0/auth0-react';

// Mock the Auth0 hook to control authentication status in tests
vi.mock('@auth0/auth0-react');

// Helper to create a mock for Supabase's fluent query builder
const createFilterBuilderMock = (data: any, error: any = null) => {
  const mock = {
    select: vi.fn().mockReturnThis(), // Allows chaining .select()
    eq: vi.fn().mockReturnThis(),     // Allows chaining .eq()
    single: vi.fn().mockResolvedValue({ data, error }), // Simulates fetching a single record
  };
  return mock;
};

// Mock the Supabase client to control database interactions
vi.mock('../supabaseClient', () => ({
  __esModule: true,
  default: {
    auth: {
      setSession: vi.fn().mockResolvedValue({ error: null }), // Mock session setting
    },
    from: vi.fn(() => createFilterBuilderMock( // Default mock for 'from' queries
      { store_id: 'store123', store_name: 'Test Store' }, // Default successful store data
      null
    )),
  },
}));

// Mock the report components to isolate testing to the page logic
vi.mock('../components/reporting/SalesTrendReport', () => ({
  default: () => <div>SalesTrendReport Mock</div>, // Simple placeholder
}));
vi.mock('../components/reporting/InventoryStatusReport', () => ({
  default: () => <div>InventoryStatusReport Mock</div>, // Simple placeholder
}));

// Test suite for the SellerAnalyticsPage
describe('SellerAnalyticsPage', () => {
  // Runs before each test to reset mocks and set up common conditions
  beforeEach(() => {
    vi.clearAllMocks(); // Clears any previous mock calls and states

    // Default Auth0 mock: Simulate an authenticated user
    vi.mocked(useAuth0).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { sub: 'auth0|123' }, // Mock user object with a sub (ID)
      getAccessTokenSilently: vi.fn().mockResolvedValue('mock-token'), // Mock token retrieval
      loginWithRedirect: vi.fn(),
      logout: vi.fn(),
    } as any);
  });

  // Test the initial loading state display
  test('renders loading state initially', () => {
    vi.mocked(useAuth0).mockReturnValue({
      ...useAuth0(), // Spread default mock
      isLoading: true, // Override isLoading to true for this test
    } as any);

    render(<SellerAnalyticsPage />);
    expect(screen.getByText('Loading Analytics Dashboard...')).toBeInTheDocument();
  });

  // Test error message for unauthenticated users
  test('shows error when not authenticated', async () => {
    vi.mocked(useAuth0).mockReturnValue({
      ...useAuth0(),
      isAuthenticated: false, // Simulate unauthenticated user
      isLoading: false,
    } as any);

    render(<SellerAnalyticsPage />);
    // Wait for async operations (like useEffect) to complete
    await waitFor(() => {
      expect(screen.getByText('Analytics Unavailable')).toBeInTheDocument();
      expect(screen.getByText('User not authenticated. Please log in.')).toBeInTheDocument();
    });
  });

  // Test successful loading and display of the dashboard
  test('loads and displays store analytics dashboard', async () => {
    render(
      <BrowserRouter> {/* Needed if page uses Link or other react-router features */}
        <SellerAnalyticsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      // Check for store name in title and report tabs/content
      expect(screen.getByText('Test Store - Analytics Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Inventory Status')).toBeInTheDocument();
      expect(screen.getByText('Sales Trends')).toBeInTheDocument();
      expect(screen.getByText('InventoryStatusReport Mock')).toBeInTheDocument(); // Default report
    });
  });

  // Test switching between different report views
  test('switches between reports', async () => {
    render(
      <BrowserRouter>
        <SellerAnalyticsPage />
      </BrowserRouter>
    );

    // Ensure initial report (Inventory) is loaded
    await waitFor(() => {
      expect(screen.getByText('InventoryStatusReport Mock')).toBeInTheDocument();
    });

    // Click the 'Sales Trends' button to switch reports
    fireEvent.click(screen.getByText('Sales Trends'));

    // Check if the SalesTrendReport mock is now visible
    await waitFor(() => {
      expect(screen.getByText('SalesTrendReport Mock')).toBeInTheDocument();
    });
  });

  // Test that clicking the already active report tab doesn't change content or state unnecessarily
  test('clicking active report tab does not change content', async () => {
    render(
      <BrowserRouter>
        <SellerAnalyticsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('InventoryStatusReport Mock')).toBeInTheDocument();
    });

    // Click the 'Inventory Status' button (which is already active)
    fireEvent.click(screen.getByText('Inventory Status'));

    // Content should remain the same
    await waitFor(() => {
      expect(screen.getByText('InventoryStatusReport Mock')).toBeInTheDocument();
    });
  });

  // Test error display if the authentication token is missing (undefined)
  test('shows error if token is null or undefined', async () => {
    vi.mocked(useAuth0).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { sub: 'auth0|123' },
      getAccessTokenSilently: vi.fn().mockResolvedValue(undefined), // Simulate no token
    } as any);

    render(<SellerAnalyticsPage />);
    await waitFor(() => {
      expect(screen.getByText('Analytics Unavailable')).toBeInTheDocument();
      expect(screen.getByText(/Authentication token could not be retrieved/)).toBeInTheDocument();
    });
  });

  // Test error display if the authentication token is an empty string
  test('shows error when token is empty', async () => {
    vi.mocked(useAuth0).mockReturnValue({
      ...useAuth0(),
      getAccessTokenSilently: vi.fn().mockResolvedValue(''), // Simulate empty token
    } as any);

    render(<SellerAnalyticsPage />);
    await waitFor(() => {
      expect(screen.getByText('Analytics Unavailable')).toBeInTheDocument();
      expect(screen.getByText(/Authentication token could not be retrieved/)).toBeInTheDocument();
    });
  });

  // Test if the Inventory Status report is displayed by default
  test('defaults to Inventory Status report on initial render', async () => {
    render(
      <BrowserRouter>
        <SellerAnalyticsPage />
      </BrowserRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('InventoryStatusReport Mock')).toBeInTheDocument();
    });
    // Check if the 'Inventory Status' button has the 'active' class
    const inventoryButton = screen.getByText('Inventory Status').closest('button');
    expect(inventoryButton).toHaveClass('active');
  });

  // Test that switching tabs doesn't inadvertently trigger an error state
  test('switching tabs does not trigger error state', async () => {
    render(
      <BrowserRouter>
        <SellerAnalyticsPage />
      </BrowserRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('InventoryStatusReport Mock')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Sales Trends'));
    await waitFor(() => {
      expect(screen.getByText('SalesTrendReport Mock')).toBeInTheDocument();
      // Ensure no general error message is displayed
      expect(screen.queryByText('Analytics Unavailable')).not.toBeInTheDocument();
    });
  });

  // Test if report buttons correctly update their 'active' class
  test('report buttons update active class when clicked', async () => {
    render(
      <BrowserRouter>
        <SellerAnalyticsPage />
      </BrowserRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('InventoryStatusReport Mock')).toBeInTheDocument();
    });

    const inventoryButton = screen.getByRole('button', { name: /inventory status/i });
    const salesButton = screen.getByRole('button', { name: /sales trends/i });

    // Click Sales, check classes
    fireEvent.click(salesButton);
    await waitFor(() => {
      expect(salesButton).toHaveClass('active');
      expect(inventoryButton).not.toHaveClass('active');
    });

    // Click Inventory, check classes
    fireEvent.click(inventoryButton);
    await waitFor(() => {
      expect(inventoryButton).toHaveClass('active');
      expect(salesButton).not.toHaveClass('active');
    });
  });

  // Test for handling component unmounting during an ongoing data fetch (to prevent state updates on unmounted components)
  test('handles component unmounting during data fetch', async () => {
    // Simulate a getAccessTokenSilently call that never resolves
    vi.mocked(useAuth0().getAccessTokenSilently).mockImplementationOnce(
      () => new Promise(() => {})
    );

    const { unmount } = render(<SellerAnalyticsPage />);
    unmount(); // Unmount the component

    // Wait briefly to see if any async state updates try to occur
    await new Promise(resolve => setTimeout(resolve, 100));
    // Expect no error messages related to state updates on unmounted component
    expect(screen.queryByText('Analytics Unavailable')).toBeNull();
  });

  // Test if the correct report component is rendered based on the active state
  test('renders correct report component based on state', async () => {
    render(<SellerAnalyticsPage />);

    // Initial: Inventory report
    await waitFor(() => {
      expect(screen.getByText('InventoryStatusReport Mock')).toBeInTheDocument();
    });

    // Switch to Sales report
    fireEvent.click(screen.getByText('Sales Trends'));
    await waitFor(() => {
      expect(screen.queryByText('InventoryStatusReport Mock')).toBeNull(); // Inventory should be gone
      expect(screen.getByText('SalesTrendReport Mock')).toBeInTheDocument(); // Sales should be visible
    });
  });

  // Redundant with 'report buttons update active class', but more explicit about tab states
  test('report tabs have proper active states', async () => {
    render(
      <BrowserRouter>
        <SellerAnalyticsPage />
      </BrowserRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('InventoryStatusReport Mock')).toBeInTheDocument();
    });

    const inventoryTab = screen.getByText('Inventory Status').closest('button');
    const salesTab = screen.getByText('Sales Trends').closest('button');

    if (!inventoryTab || !salesTab) throw new Error('Tab buttons not found'); // Should not happen

    // Initial state check
    expect(inventoryTab).toHaveClass('active');
    expect(salesTab).not.toHaveClass('active');

    // Click Sales tab
    fireEvent.click(salesTab);
    await waitFor(() => {
      expect(inventoryTab).not.toHaveClass('active');
      expect(salesTab).toHaveClass('active');
    });
  });
});