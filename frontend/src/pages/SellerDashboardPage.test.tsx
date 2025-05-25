import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom'; 
import SellerDashboardPage from './SellerDashboardPage';
import { useAuth0 } from '@auth0/auth0-react';

// Importing Axios types for mocking
import axiosActualModule, { AxiosError } from 'axios';

// Hoisted mocks for Axios GET and PATCH methods
const { mockApiGet, mockApiPatch } = vi.hoisted(() => {
  return {
    mockApiGet: vi.fn(),
    mockApiPatch: vi.fn(),
  };
});

// Mock the Auth0 hook
vi.mock('@auth0/auth0-react');

// Mock Axios to control API calls during tests
vi.mock('axios', async (importOriginal) => {
  const actualAxios = await importOriginal<typeof axiosActualModule>();
  return {
    __esModule: true,
    default: {
      ...actualAxios,
      create: vi.fn(() => ({ // Mock the 'create' method to return our mocked functions
        get: mockApiGet,
        patch: mockApiPatch,
      })),
    },
    AxiosError: actualAxios.AxiosError, // Preserve actual AxiosError
    isAxiosError: actualAxios.isAxiosError,
    // Spread other exports from actual Axios
    ...(Object.keys(actualAxios)
      .filter(key => key !== 'default' && key !== '__esModule')
      .reduce((acc, key) => {
        acc[key] = (actualAxios as any)[key];
        return acc;
      }, {} as Record<string, unknown>)
    ),
  };
});

// Stub environment variables used by the component
vi.stubEnv('VITE_BACKEND_URL', 'http://localhost:3000/test-api');

// --- Mock Data ---
// Sample user data for testing authenticated states
const mockUser = { name: 'Test Seller', sub: 'auth0|seller123' };

// Sample product data
const mockProduct1 = { prodId: 1, name: 'Handmade Scarf', imageUrl: 'scarf.jpg' };
const mockProduct2 = { prodId: 2, name: 'Wooden Bowl', imageUrl: 'bowl.jpg' };
const mockProduct3 = { prodId: 3, name: 'Product NoImage', imageUrl: undefined }; // For testing no image case
const mockProduct4 = { prodId: 4, name: 'Product ImageFail', imageUrl: 'http://example.com/imagefail.jpg' }; // For testing image load error

// Sample order data to simulate API responses
const mockOrdersDataInitial = [
  {
    sellerOrderId: 1,
    orderId: 101,
    order: { orderId: 101, userId: 'user1', orderDate: '2023-01-01T10:00:00Z', pickupArea: 'North Campus', pickupPoint: 'Library' },
    userId: 'sellerX',
    deliveryMethod: 'Standard Pickup',
    deliveryPrice: 0,
    deliveryTimeEstimate: '3-5',
    itemsSubtotal: 100,
    sellerTotal: 100,
    status: 'Processing', // An order that can be updated
    createdAt: '2023-01-01T10:00:00Z',
    updatedAt: '2023-01-01T10:00:00Z',
    items: [{
      sellerOrderItemId: 1, productId: 1, quantityOrdered: 1, pricePerUnit: 100,
      productNameSnapshot: 'Handmade Scarf', product: mockProduct1, createdAt: '2023-01-01T10:00:00Z', updatedAt: '2023-01-01T10:00:00Z',
    }]
  },
  {
    sellerOrderId: 2,
    orderId: 102,
    order: { orderId: 102, userId: 'user2', orderDate: '2023-01-15T14:30:00Z', pickupArea: 'South Campus', pickupPoint: 'Bookstore' },
    userId: 'sellerX',
    deliveryMethod: 'Express Shipping',
    deliveryPrice: 75,
    deliveryTimeEstimate: '1-2',
    itemsSubtotal: 450,
    sellerTotal: 525,
    status: 'Shipped', // Another updatable order
    createdAt: '2023-01-15T14:30:00Z',
    updatedAt: '2023-01-16T09:00:00Z',
    items: [
      { sellerOrderItemId: 2, productId: 2, quantityOrdered: 2, pricePerUnit: 200,
        productNameSnapshot: 'Wooden Bowl', product: mockProduct2, createdAt: '2023-01-15T14:30:00Z', updatedAt: '2023-01-15T14:30:00Z' },
      { sellerOrderItemId: 3, productId: 3, quantityOrdered: 1, pricePerUnit: 50,
        productNameSnapshot: 'Product NoImage', product: mockProduct3, createdAt: '2023-01-15T14:30:00Z', updatedAt: '2023-01-15T14:30:00Z' }
    ]
  },
  {
    sellerOrderId: 3,
    orderId: 103,
    order: { orderId: 103, userId: 'user3', orderDate: '2023-01-17T10:00:00Z', pickupArea: 'East Campus', pickupPoint: 'Cafe' },
    userId: 'sellerX',
    deliveryMethod: 'Standard Pickup',
    deliveryPrice: 0,
    deliveryTimeEstimate: '2-3',
    itemsSubtotal: 90,
    sellerTotal: 90,
    status: 'Delivered', // A non-updatable order status
    createdAt: '2023-01-17T10:00:00Z',
    updatedAt: '2023-01-17T10:00:00Z',
    items: [{
      sellerOrderItemId: 4, productId: 4, quantityOrdered: 1, pricePerUnit: 90,
      productNameSnapshot: 'Product ImageFail', product: mockProduct4, createdAt: '2023-01-18T10:00:00Z', updatedAt: '2023-01-18T10:00:00Z',
    }]
  }
];
// Sample earnings data
const mockEarningsData = { totalEarnings: mockOrdersDataInitial.reduce((sum, order) => sum + order.sellerTotal, 0) };

// Helper to create AxiosError instances for testing error handling
const createMockAxiosError = (
    message: string,
    responseData: any = { message: 'Detailed error from API' },
    status: number = 500
): AxiosError => {
    const error = new AxiosError(message);
    error.response = {
        data: responseData, status: status, statusText: `HTTP ${status}`, headers: {}, config: {} as any,
    };
    return error;
};

// Helper function to render components within a BrowserRouter context
const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

// Test suite for the SellerDashboardPage
describe('SellerDashboardPage', () => {
  // Setup common mock behaviors before each test
  beforeEach(() => {
    vi.clearAllMocks(); // Clear any previous mock states

    // Default Auth0 mock for an authenticated user
    vi.mocked(useAuth0).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: mockUser,
      getAccessTokenSilently: vi.fn().mockResolvedValue('mock-access-token'),
      loginWithRedirect: vi.fn(),
      logout: vi.fn(),
    } as any);

    // Default successful API responses
    mockApiGet
      .mockResolvedValueOnce({ data: [...mockOrdersDataInitial] }) // Orders API call
      .mockResolvedValueOnce({ data: mockEarningsData });      // Earnings API call
    mockApiPatch.mockResolvedValue({ data: {} }); // Default success for status updates
  });

  // Test for the initial loading state (Auth0 loading)
  test('renders loading state during auth initialization', () => {
    vi.mocked(useAuth0).mockReturnValue({
      isAuthenticated: false, isLoading: true, user: undefined, // Simulate Auth0 loading
      getAccessTokenSilently: vi.fn(), loginWithRedirect: vi.fn(), logout: vi.fn(),
    } as any);
    renderWithRouter(<SellerDashboardPage />);
    expect(screen.getByText('Loading authentication...')).toBeInTheDocument();
  });

  // Test for displaying a login prompt if the user is not authenticated
  test('shows login prompt when not authenticated', async () => {
    vi.mocked(useAuth0).mockReturnValue({
      isAuthenticated: false, isLoading: false, user: undefined, // Simulate unauthenticated user
      getAccessTokenSilently: vi.fn(), loginWithRedirect: vi.fn(), logout: vi.fn(),
    } as any);
    renderWithRouter(<SellerDashboardPage />);
    await waitFor(() => { // Wait for any initial effects to settle
      expect(screen.getByText('Please log in to view your dashboard.')).toBeInTheDocument();
    });
  });

  // Group tests for scenarios where the seller is authenticated
  describe('Authenticated Seller Scenarios', () => {
    // Test if the dashboard loads and displays key information
    test('loads and displays dashboard overview for authenticated seller', async () => {
      renderWithRouter(<SellerDashboardPage />);

      // Check for welcome message and dashboard title
      await waitFor(() => {
        // Corrected expectation: The main title is "Orders"
        expect(screen.getByRole('heading', { name: /Orders/i, level: 1 })).toBeInTheDocument();
        expect(screen.getByText(`Welcome, ${mockUser.name}!`)).toBeInTheDocument();
      });

      // Check for earnings display
      await waitFor(() => {
        expect(screen.getByText(`Total Earnings (All Orders): R${mockEarningsData.totalEarnings.toFixed(2)}`)).toBeInTheDocument();
      });
      // This checks for the H2 heading of the orders section
      expect(screen.getByRole('heading', { name: /Your Orders/i, level: 2 })).toBeInTheDocument();
    });

    // Test if fetched orders and their item details are displayed correctly
    test('displays fetched orders with their details and items', async () => {
        renderWithRouter(<SellerDashboardPage />);

        // Wait for the first order to appear and check its details
        await waitFor(() => {
            expect(screen.getByText(`Order #${mockOrdersDataInitial[0].orderId} (Shipment #${mockOrdersDataInitial[0].sellerOrderId})`)).toBeInTheDocument();
        });
        expect(screen.getByText(mockOrdersDataInitial[0].order.pickupArea)).toBeInTheDocument();
        expect(screen.getByText(mockOrdersDataInitial[0].items[0].productNameSnapshot + ` (ID: ${mockOrdersDataInitial[0].items[0].productId})`)).toBeInTheDocument();
        expect(screen.getByText(`Qty: ${mockOrdersDataInitial[0].items[0].quantityOrdered} @ R${mockOrdersDataInitial[0].items[0].pricePerUnit.toFixed(2)} each`)).toBeInTheDocument();
        const img1 = screen.getByRole('img', { name: mockOrdersDataInitial[0].items[0].product.name });
        expect(img1).toHaveAttribute('src', mockOrdersDataInitial[0].items[0].product.imageUrl);

        // Check details of the second order, including an item with no image
        expect(screen.getByText(`Order #${mockOrdersDataInitial[1].orderId} (Shipment #${mockOrdersDataInitial[1].sellerOrderId})`)).toBeInTheDocument();
        expect(screen.getByText(mockOrdersDataInitial[1].order.pickupPoint)).toBeInTheDocument();
        expect(screen.getByText(mockOrdersDataInitial[1].items[0].productNameSnapshot + ` (ID: ${mockOrdersDataInitial[1].items[0].productId})`)).toBeInTheDocument();

        // Check item with no image (should use placeholder)
        const itemNoImageText = mockOrdersDataInitial[1].items[1].productNameSnapshot + ` (ID: ${mockOrdersDataInitial[1].items[1].productId})`;
        expect(screen.getByText(itemNoImageText)).toBeInTheDocument();
        const imgNoImage = screen.getByRole('img', { name: mockOrdersDataInitial[1].items[1].product.name });
        expect(imgNoImage).toHaveAttribute('src', 'https://placehold.co/60x60/eee/ccc?text=No+Image');
    });

    // Test image error handling (shows error placeholder)
    test('handles image error by showing error placeholder', async () => {
        renderWithRouter(<SellerDashboardPage />);

        // Wait for the relevant order with the 'failing' image to render
        await waitFor(() => {
            expect(screen.getByText(`Order #${mockOrdersDataInitial[2].orderId} (Shipment #${mockOrdersDataInitial[2].sellerOrderId})`)).toBeInTheDocument();
        });

        const imgToFail = screen.getByRole('img', { name: mockProduct4.name }) as HTMLImageElement;
        expect(imgToFail).toHaveAttribute('src', mockProduct4.imageUrl);

        // Simulate an error event on the image
        fireEvent.error(imgToFail);
        expect(imgToFail).toHaveAttribute('src', 'https://placehold.co/60x60/eee/ccc?text=Error'); // Check for error placeholder
    });

    // Test if filtering orders by status works as expected
    test('filters orders by status correctly', async () => {
        renderWithRouter(<SellerDashboardPage />);
        await waitFor(() => expect(screen.getByText(`Order #${mockOrdersDataInitial[0].orderId} (Shipment #${mockOrdersDataInitial[0].sellerOrderId})`)).toBeInTheDocument());

        const filterSelect = screen.getByLabelText('Filter by Status:');

        // Initial state: All orders should be visible
        expect(screen.getAllByText(/Order #\d+ \(Shipment #\d+\)/i)).toHaveLength(mockOrdersDataInitial.length);

        // Filter by 'Processing'
        fireEvent.change(filterSelect, { target: { value: 'Processing' } });
        await waitFor(() => {
            expect(screen.getByText(`Order #${mockOrdersDataInitial[0].orderId} (Shipment #${mockOrdersDataInitial[0].sellerOrderId})`)).toBeInTheDocument();
            expect(screen.queryByText(`Order #${mockOrdersDataInitial[1].orderId} (Shipment #${mockOrdersDataInitial[1].sellerOrderId})`)).not.toBeInTheDocument();
        });

        // Filter by 'Shipped'
        fireEvent.change(filterSelect, { target: { value: 'Shipped' } });
        await waitFor(() => {
            expect(screen.queryByText(`Order #${mockOrdersDataInitial[0].orderId} (Shipment #${mockOrdersDataInitial[0].sellerOrderId})`)).not.toBeInTheDocument();
            expect(screen.getByText(`Order #${mockOrdersDataInitial[1].orderId} (Shipment #${mockOrdersDataInitial[1].sellerOrderId})`)).toBeInTheDocument();
        });

        // Filter by a status with no matching orders
        fireEvent.change(filterSelect, { target: { value: 'Ready for Pickup' } });
         await waitFor(() => {
            expect(screen.getByText('No orders found with status "Ready for Pickup".')).toBeInTheDocument();
        });

        // Change back to 'All'
        fireEvent.change(filterSelect, { target: { value: 'All' } });
        await waitFor(() => {
             expect(screen.getAllByText(/Order #\d+ \(Shipment #\d+\)/i)).toHaveLength(mockOrdersDataInitial.length);
        });
    });

    // Test "no orders" message when API returns an empty list
    test('shows "You have no orders yet." when API returns empty order list', async () => {
        mockApiGet.mockReset() // Reset mocks to provide specific responses for this test
          .mockResolvedValueOnce({ data: [] }) // Simulate empty orders response
          .mockResolvedValueOnce({ data: mockEarningsData }); // Earnings still load

        renderWithRouter(<SellerDashboardPage />);

        await waitFor(() => {
          expect(screen.getByText("You have no orders yet.")).toBeInTheDocument();
        });
        // Ensure earnings are still displayed
        expect(await screen.findByText(`Total Earnings (All Orders): R${mockEarningsData.totalEarnings.toFixed(2)}`)).toBeInTheDocument();
    });

    // Test generic error message when fetching orders fails
    test('shows error when fetching orders fails (generic error)', async () => {
        mockApiGet.mockReset()
          .mockRejectedValueOnce(new Error('Network Error for Orders')) // Simulate generic network error
          .mockResolvedValueOnce({ data: mockEarningsData });

        renderWithRouter(<SellerDashboardPage />);

        await waitFor(() => {
          expect(screen.getByText('Error loading orders: Could not load seller orders.')).toBeInTheDocument();
        });
        expect(await screen.findByText(`Total Earnings (All Orders): R${mockEarningsData.totalEarnings.toFixed(2)}`)).toBeInTheDocument();
    });

    // Test specific error message from Axios when fetching orders fails
    test('shows specific error when fetching orders fails (AxiosError)', async () => {
        const errorMessage = "Order retrieval failed due to server issue";
        mockApiGet.mockReset()
          .mockRejectedValueOnce(createMockAxiosError("Orders API Error", { message: errorMessage }, 500)) // Simulate Axios error
          .mockResolvedValueOnce({ data: mockEarningsData });

        renderWithRouter(<SellerDashboardPage />);

        await waitFor(() => {
          expect(screen.getByText(`Error loading orders: ${errorMessage}`)).toBeInTheDocument();
        });
    });

    // Test earnings loading state
    test('displays earnings loading state correctly', async () => {
        mockApiGet.mockReset()
          .mockResolvedValueOnce({ data: [...mockOrdersDataInitial] }) // Orders load successfully
          .mockImplementationOnce(() => new Promise(() => {})); // Earnings API call never resolves

        renderWithRouter(<SellerDashboardPage />);

        await waitFor(() => expect(screen.getByText(`Order #${mockOrdersDataInitial[0].orderId} (Shipment #${mockOrdersDataInitial[0].sellerOrderId})`)).toBeInTheDocument());
        expect(screen.getByText('Loading earnings...')).toBeInTheDocument(); // Check for earnings loading text
    });

    // Test generic error message for earnings
    test('displays earnings error state (generic error)', async () => {
        mockApiGet.mockReset()
          .mockResolvedValueOnce({ data: [...mockOrdersDataInitial] })
          .mockRejectedValueOnce(new Error('Earnings System Offline')); // Simulate earnings API error

        renderWithRouter(<SellerDashboardPage />);

        await waitFor(() => {
          expect(screen.getByText('Error loading earnings: Could not load earnings.')).toBeInTheDocument();
        });
        // Orders should still be visible
        expect(await screen.findByText(`Order #${mockOrdersDataInitial[0].orderId} (Shipment #${mockOrdersDataInitial[0].sellerOrderId})`)).toBeInTheDocument();
    });

    // --- Tests for Order Status Update Functionality ---

    // Test error message display if an order status update fails
    test('displays an error message if status update fails', async () => {
      const updateErrorMessage = "Invalid status transition from API.";
      mockApiPatch.mockRejectedValueOnce(createMockAxiosError("Update Failed", { message: updateErrorMessage }, 400)); // Simulate PATCH error

      renderWithRouter(<SellerDashboardPage />);
      // Wait for an order to be present
      await waitFor(() => expect(screen.getByText(`Order #${mockOrdersDataInitial[0].orderId} (Shipment #${mockOrdersDataInitial[0].sellerOrderId})`)).toBeInTheDocument());

      const statusSelectOrder1 = screen.getByLabelText(`Update status for shipment ${mockOrdersDataInitial[0].sellerOrderId}`);
      fireEvent.change(statusSelectOrder1, { target: { value: 'Delivered' } }); // Attempt to update status

      // Check for the update error message
      await waitFor(() => {
        expect(screen.getByText(/Update Error: Failed for Order #1: Invalid status transition from API./i)).toBeInTheDocument();
      });
      // Ensure the status dropdown reflects the original status and is not disabled
      expect(screen.getByLabelText(`Update status for shipment ${mockOrdersDataInitial[0].sellerOrderId}`)).toHaveValue('Processing');
      expect(screen.getByLabelText(`Update status for shipment ${mockOrdersDataInitial[0].sellerOrderId}`)).not.toBeDisabled();
      expect(screen.queryByText('Updating...')).not.toBeInTheDocument(); // No "Updating..." text visible
    });

  });
});