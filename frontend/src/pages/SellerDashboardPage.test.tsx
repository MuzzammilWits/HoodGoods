// src/pages/SellerDashboardPage.test.tsx
import { render, screen, waitFor} from '@testing-library/react';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import SellerDashboardPage from './SellerDashboardPage';
import { useAuth0 } from '@auth0/auth0-react';
import axios from 'axios';

// Mock Auth0
vi.mock('@auth0/auth0-react');

// Mock axios
vi.mock('axios');

// Mock environment variable
vi.stubEnv('VITE_BACKEND_URL', 'http://localhost:3000');

// Mock data
const mockOrders = [{
  sellerOrderId: 1,
  orderId: 101,
  order: {
    orderId: 101,
    userId: 'user1',
    orderDate: '2023-01-01',
    pickupArea: 'Area 1',
    pickupPoint: 'Point A'
  },
  userId: 'user1',
  deliveryMethod: 'Standard',
  deliveryPrice: 50,
  deliveryTimeEstimate: '3',
  itemsSubtotal: 200,
  sellerTotal: 250,
  status: 'Processing',
  items: [{
    sellerOrderItemId: 1,
    productId: 1,
    quantityOrdered: 2,
    pricePerUnit: 100,
    productNameSnapshot: 'Test Product',
    product: {
      prodId: 1,
      name: 'Test Product',
      imageUrl: 'http://example.com/image.jpg'
    }
  }]
}];

const mockEarnings = { totalEarnings: 1000 };

describe('SellerDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default Auth0 mock - authenticated user
    vi.mocked(useAuth0).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { name: 'Test Seller', sub: 'auth0|123' },
      getAccessTokenSilently: vi.fn().mockResolvedValue('mock-token'),
      loginWithRedirect: vi.fn(),
      logout: vi.fn(),
    } as any);

    // Default axios mocks
    vi.mocked(axios.get)
      .mockResolvedValueOnce({ data: mockOrders }) // Orders
      .mockResolvedValueOnce({ data: mockEarnings }); // Earnings
  });

  test('renders loading state during auth initialization', () => {
  // Mock Auth0 loading state
  vi.mocked(useAuth0).mockReturnValue({
    isAuthenticated: false,
    isLoading: true,
    user: undefined,
    getAccessTokenSilently: vi.fn(),
    loginWithRedirect: vi.fn(),
    logout: vi.fn(),
  } as any);

  render(<SellerDashboardPage />);
  expect(screen.getByText('Loading authentication...')).toBeInTheDocument();
});
test('shows login prompt when not authenticated', async () => {
  // Mock unauthenticated state
  vi.mocked(useAuth0).mockReturnValue({
    isAuthenticated: false,
    isLoading: false,
    user: undefined,
    getAccessTokenSilently: vi.fn(),
    loginWithRedirect: vi.fn(),
    logout: vi.fn(),
  } as any);

  render(<SellerDashboardPage />);
  await waitFor(() => {
    expect(screen.getByText('Please log in to view your dashboard.')).toBeInTheDocument();
  });
});
test('loads and displays dashboard for authenticated seller', async () => {
  // Mock authenticated state
  vi.mocked(useAuth0).mockReturnValue({
    isAuthenticated: true,
    isLoading: false,
    user: { name: 'Test Seller', sub: 'auth0|123' },
    getAccessTokenSilently: vi.fn().mockResolvedValue('mock-token'),
    loginWithRedirect: vi.fn(),
    logout: vi.fn(),
  } as any);

  // Mock empty API responses
  vi.mocked(axios.get)
    .mockResolvedValueOnce({ data: [] })
    .mockResolvedValueOnce({ data: { totalEarnings: 0 } });

  render(
    <BrowserRouter>
      <SellerDashboardPage />
    </BrowserRouter>
  );
  
  await waitFor(() => {
    expect(screen.getByText('Seller Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Welcome, Test Seller!')).toBeInTheDocument();
    expect(screen.getByText('Earnings')).toBeInTheDocument();
    expect(screen.getByText('Your Orders')).toBeInTheDocument();
  });
});
test('shows error when fetching orders fails', async () => {
  vi.mocked(axios.get)
    .mockRejectedValueOnce(new Error('Orders fetch failed')) // Orders
    .mockResolvedValueOnce({ data: mockEarnings }); // Earnings

  render(<BrowserRouter><SellerDashboardPage /></BrowserRouter>);

  await waitFor(() => {
    expect(screen.getByText(/Error loading orders:/)).toBeInTheDocument();
  });
});
test('displays earnings loading state', async () => {
  // Delay the earnings response to test loading state
  vi.mocked(axios.get)
    .mockResolvedValueOnce({ data: mockOrders })
    .mockImplementationOnce(() => new Promise(() => {})); // Never resolves

  render(<BrowserRouter><SellerDashboardPage /></BrowserRouter>);
  
  expect(screen.getByText('Loading earnings...')).toBeInTheDocument();
});
test('displays earnings error state', async () => {
  vi.mocked(axios.get)
    .mockResolvedValueOnce({ data: mockOrders })
    .mockRejectedValueOnce(new Error('Earnings fetch failed'));

  render(<BrowserRouter><SellerDashboardPage /></BrowserRouter>);
  
  await waitFor(() => {
    expect(screen.getByText(/Error loading earnings:/)).toBeInTheDocument();
  });
});
test('shows error messages when API calls fail', async () => {
  vi.mocked(axios.get)
    .mockRejectedValueOnce(new Error('Orders fetch failed'))
    .mockRejectedValueOnce(new Error('Earnings fetch failed'));

  render(<BrowserRouter><SellerDashboardPage /></BrowserRouter>);
  
  await waitFor(() => {
    expect(screen.getByText(/Error loading orders:/)).toBeInTheDocument();
    expect(screen.getByText(/Error loading earnings:/)).toBeInTheDocument();
  });
});
test('disables status filter during orders loading', async () => {
  vi.mocked(axios.get)
    .mockImplementationOnce(() => new Promise(() => {}))
    .mockResolvedValueOnce({ data: mockEarnings });

  render(<BrowserRouter><SellerDashboardPage /></BrowserRouter>);
  
  expect(screen.getByLabelText('Filter by Status:')).toBeDisabled();
});
test('displays errors if API calls fail', async () => {
  vi.mocked(axios.get).mockRejectedValueOnce(new Error('Order fetch failed'));
  vi.mocked(axios.get).mockRejectedValueOnce(new Error('Earnings fetch failed'));

  render(
    <BrowserRouter>
      <SellerDashboardPage />
    </BrowserRouter>
  );

  await waitFor(() => {
    expect(screen.getByText(/Error loading earnings/)).toBeInTheDocument();
    expect(screen.getByText(/Error loading orders/)).toBeInTheDocument();
  });
});

});