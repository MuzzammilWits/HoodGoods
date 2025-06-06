import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import SellerAnalyticsPage from './SellerAnalyticsPage';
import { useAuth0 } from '@auth0/auth0-react';

vi.mock('@auth0/auth0-react');

const createFilterBuilderMock = (data: any, error: any = null) => {
  const mock = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error }),
  };
  return mock;
};

vi.mock('../supabaseClient', () => ({
  __esModule: true,
  default: {
    auth: {
      setSession: vi.fn().mockResolvedValue({ error: null }),
    },
    from: vi.fn(() => createFilterBuilderMock(
      { store_id: 'store123', store_name: 'Test Store' },
      null
    )),
  },
}));

vi.mock('../components/reporting/SalesTrendReport', () => ({
  default: () => <article>SalesTrendReport Mock</article>,
}));
vi.mock('../components/reporting/InventoryStatusReport', () => ({
  default: () => <article>InventoryStatusReport Mock</article>,
}));

describe('SellerAnalyticsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useAuth0).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { sub: 'auth0|123' },
      getAccessTokenSilently: vi.fn().mockResolvedValue('mock-token'),
      loginWithRedirect: vi.fn(),
      logout: vi.fn(),
    } as any);
  });

  test('renders loading state initially', () => {
    vi.mocked(useAuth0).mockReturnValue({
      ...useAuth0(),
      isLoading: true,
    } as any);

    render(<SellerAnalyticsPage />);
    expect(screen.getByText('Loading Analytics Dashboard...')).toBeInTheDocument();
  });

  test('shows error when not authenticated', async () => {
    vi.mocked(useAuth0).mockReturnValue({
      ...useAuth0(),
      isAuthenticated: false,
      isLoading: false,
    } as any);

    render(<SellerAnalyticsPage />);
    await waitFor(() => {
      expect(screen.getByText('Analytics Unavailable')).toBeInTheDocument();
      expect(screen.getByText('User not authenticated. Please log in.')).toBeInTheDocument();
    });
  });

  test('loads and displays store analytics dashboard', async () => {
    render(
      <BrowserRouter>
        <SellerAnalyticsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Store - Analytics Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Inventory Status')).toBeInTheDocument();
      expect(screen.getByText('Sales Trends')).toBeInTheDocument();
      expect(screen.getByText('InventoryStatusReport Mock')).toBeInTheDocument();
    });
  });

  test('switches between reports', async () => {
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
    });
  });

  test('clicking active report tab does not change content', async () => {
    render(
      <BrowserRouter>
        <SellerAnalyticsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('InventoryStatusReport Mock')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Inventory Status'));

    await waitFor(() => {
      expect(screen.getByText('InventoryStatusReport Mock')).toBeInTheDocument();
    });
  });

  test('shows error if token is null or undefined', async () => {
    vi.mocked(useAuth0).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { sub: 'auth0|123' },
      getAccessTokenSilently: vi.fn().mockResolvedValue(undefined),
    } as any);

    render(<SellerAnalyticsPage />);
    await waitFor(() => {
      expect(screen.getByText('Analytics Unavailable')).toBeInTheDocument();
      expect(screen.getByText(/Authentication token could not be retrieved/)).toBeInTheDocument();
    });
  });

  test('shows error when token is empty', async () => {
    vi.mocked(useAuth0).mockReturnValue({
      ...useAuth0(),
      getAccessTokenSilently: vi.fn().mockResolvedValue(''),
    } as any);

    render(<SellerAnalyticsPage />);
    await waitFor(() => {
      expect(screen.getByText('Analytics Unavailable')).toBeInTheDocument();
      expect(screen.getByText(/Authentication token could not be retrieved/)).toBeInTheDocument();
    });
  });

  test('defaults to Inventory Status report on initial render', async () => {
    render(
      <BrowserRouter>
        <SellerAnalyticsPage />
      </BrowserRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('InventoryStatusReport Mock')).toBeInTheDocument();
    });
    const inventoryButton = screen.getByText('Inventory Status').closest('button');
    expect(inventoryButton).toHaveClass('active');
  });

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
      expect(screen.queryByText('Analytics Unavailable')).not.toBeInTheDocument();
    });
  });

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

    fireEvent.click(salesButton);
    await waitFor(() => {
      expect(salesButton).toHaveClass('active');
      expect(inventoryButton).not.toHaveClass('active');
    });

    fireEvent.click(inventoryButton);
    await waitFor(() => {
      expect(inventoryButton).toHaveClass('active');
      expect(salesButton).not.toHaveClass('active');
    });
  });

  test('handles component unmounting during data fetch', async () => {
    vi.mocked(useAuth0().getAccessTokenSilently).mockImplementationOnce(
      () => new Promise(() => {})
    );

    const { unmount } = render(<SellerAnalyticsPage />);
    unmount();

    await new Promise(resolve => setTimeout(resolve, 100));
    expect(screen.queryByText('Analytics Unavailable')).toBeNull();
  });

  test('renders correct report component based on state', async () => {
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
      expect(screen.queryByText('InventoryStatusReport Mock')).toBeNull();
      expect(screen.getByText('SalesTrendReport Mock')).toBeInTheDocument();
    });
  });

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

    if (!inventoryTab || !salesTab) throw new Error('Tab buttons not found');

    expect(inventoryTab).toHaveClass('active');
    expect(salesTab).not.toHaveClass('active');

    fireEvent.click(salesTab);
    await waitFor(() => {
      expect(inventoryTab).not.toHaveClass('active');
      expect(salesTab).toHaveClass('active');
    });
  });
});