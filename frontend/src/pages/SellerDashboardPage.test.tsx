// src/pages/SellerDashboardPage.test.tsx
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, describe, test, expect, beforeEach  } from 'vitest';
import { BrowserRouter } from 'react-router-dom'; // Keep for potential Link components
import SellerDashboardPage from './SellerDashboardPage';
import { useAuth0 } from '@auth0/auth0-react';

// Import types from the actual axios module, and the module itself for vi.importActual
import axiosActualModule, { AxiosError } from 'axios';

// --- Mocks ---
const { mockApiGet, mockApiPatch } = vi.hoisted(() => {
  return {
    mockApiGet: vi.fn(),
    mockApiPatch: vi.fn(),
  };
});

vi.mock('@auth0/auth0-react');

vi.mock('axios', async (importOriginal) => {
  const actualAxios = await importOriginal<typeof axiosActualModule>();
  return {
    __esModule: true,
    default: {
      ...actualAxios, // Use actualAxios directly (no .default)
      create: vi.fn(() => ({
        get: mockApiGet,
        patch: mockApiPatch,
      })),
    },
    AxiosError: actualAxios.AxiosError,
    isAxiosError: actualAxios.isAxiosError,
    ...(Object.keys(actualAxios)
      .filter(key => key !== 'default' && key !== '__esModule')
      .reduce((acc, key) => {
        acc[key] = (actualAxios as any)[key];
        return acc;
      }, {} as Record<string, unknown>)
    ),
  };
});

vi.stubEnv('VITE_BACKEND_URL', 'http://localhost:3000/test-api');

// --- Mock Data ---
const mockUser = { name: 'Test Seller', sub: 'auth0|seller123' };

const mockProduct1 = { prodId: 1, name: 'Handmade Scarf', imageUrl: 'scarf.jpg' };
const mockProduct2 = { prodId: 2, name: 'Wooden Bowl', imageUrl: 'bowl.jpg' };
const mockProduct3 = { prodId: 3, name: 'Product NoImage', imageUrl: undefined };
const mockProduct4 = { prodId: 4, name: 'Product ImageFail', imageUrl: 'http://example.com/imagefail.jpg' };


const mockOrdersDataInitial = [
  {
    sellerOrderId: 1,
    orderId: 101,
    order: { orderId: 101, userId: 'user1', orderDate: '2023-01-01T10:00:00Z', pickupArea: 'North Campus', pickupPoint: 'Library' },
    userId: 'sellerX', // Assuming this is seller's own ID, might be from auth0 user.sub
    deliveryMethod: 'Standard Pickup',
    deliveryPrice: 0,
    deliveryTimeEstimate: '3-5',
    itemsSubtotal: 100,
    sellerTotal: 100,
    status: 'Processing', // Updatable
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
    status: 'Shipped', // Updatable
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
    sellerOrderId: 3, // Different from your example for a new order
    orderId: 103,
    order: { orderId: 103, userId: 'user3', orderDate: '2023-01-17T10:00:00Z', pickupArea: 'East Campus', pickupPoint: 'Cafe' },
    userId: 'sellerX',
    deliveryMethod: 'Standard Pickup',
    deliveryPrice: 0,
    deliveryTimeEstimate: '2-3',
    itemsSubtotal: 90,
    sellerTotal: 90,
    status: 'Delivered', // Non-updatable
    createdAt: '2023-01-17T10:00:00Z',
    updatedAt: '2023-01-17T10:00:00Z',
    items: [{
      sellerOrderItemId: 4, productId: 4, quantityOrdered: 1, pricePerUnit: 90,
      productNameSnapshot: 'Product ImageFail', product: mockProduct4, createdAt: '2023-01-18T10:00:00Z', updatedAt: '2023-01-18T10:00:00Z',
    }]
  }
];
const mockEarningsData = { totalEarnings: mockOrdersDataInitial.reduce((sum, order) => sum + order.sellerTotal, 0) };

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

// Helper to wrap in BrowserRouter
const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('SellerDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default Auth0 mock for most tests
    vi.mocked(useAuth0).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: mockUser,
      getAccessTokenSilently: vi.fn().mockResolvedValue('mock-access-token'),
      loginWithRedirect: vi.fn(),
      logout: vi.fn(),
    } as any);

    // Default API call mocks
    // Ensure we provide a new array copy for orders data to avoid issues if tests modify it
    mockApiGet
      .mockResolvedValueOnce({ data: [...mockOrdersDataInitial] }) // First call for orders
      .mockResolvedValueOnce({ data: mockEarningsData });      // Second call for earnings
    mockApiPatch.mockResolvedValue({ data: {} }); // Default success for PATCH
  });

  test('renders loading state during auth initialization', () => {
    vi.mocked(useAuth0).mockReturnValue({
      isAuthenticated: false, isLoading: true, user: undefined,
      getAccessTokenSilently: vi.fn(), loginWithRedirect: vi.fn(), logout: vi.fn(),
    } as any);
    renderWithRouter(<SellerDashboardPage />);
    expect(screen.getByText('Loading authentication...')).toBeInTheDocument();
  });

  test('shows login prompt when not authenticated', async () => {
    vi.mocked(useAuth0).mockReturnValue({
      isAuthenticated: false, isLoading: false, user: undefined,
      getAccessTokenSilently: vi.fn(), loginWithRedirect: vi.fn(), logout: vi.fn(),
    } as any);
    renderWithRouter(<SellerDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('Please log in to view your dashboard.')).toBeInTheDocument();
    });
  });

  describe('Authenticated Seller Scenarios', () => {
    test('loads and displays dashboard overview for authenticated seller', async () => {
      renderWithRouter(<SellerDashboardPage />);
      
      await waitFor(() => {
        expect(screen.getAllByText('Seller Dashboard').length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText(`Welcome, ${mockUser.name}!`)).toBeInTheDocument();
      });
      
      await waitFor(() => {
        expect(screen.getByText(`Total Earnings (All Orders): R${mockEarningsData.totalEarnings.toFixed(2)}`)).toBeInTheDocument();
      });
      expect(screen.getByText('Your Orders')).toBeInTheDocument();
    });

    test('displays fetched orders with their details and items', async () => {
        renderWithRouter(<SellerDashboardPage />);

        await waitFor(() => {
            expect(screen.getByText(`Order #${mockOrdersDataInitial[0].orderId} (Shipment #${mockOrdersDataInitial[0].sellerOrderId})`)).toBeInTheDocument();
        });
        expect(screen.getByText(mockOrdersDataInitial[0].order.pickupArea)).toBeInTheDocument();
        expect(screen.getByText(mockOrdersDataInitial[0].items[0].productNameSnapshot + ` (ID: ${mockOrdersDataInitial[0].items[0].productId})`)).toBeInTheDocument();
        expect(screen.getByText(`Qty: ${mockOrdersDataInitial[0].items[0].quantityOrdered} @ R${mockOrdersDataInitial[0].items[0].pricePerUnit.toFixed(2)} each`)).toBeInTheDocument();
        const img1 = screen.getByRole('img', { name: mockOrdersDataInitial[0].items[0].product.name });
        expect(img1).toHaveAttribute('src', mockOrdersDataInitial[0].items[0].product.imageUrl);

        expect(screen.getByText(`Order #${mockOrdersDataInitial[1].orderId} (Shipment #${mockOrdersDataInitial[1].sellerOrderId})`)).toBeInTheDocument();
        expect(screen.getByText(mockOrdersDataInitial[1].order.pickupPoint)).toBeInTheDocument();
        expect(screen.getByText(mockOrdersDataInitial[1].items[0].productNameSnapshot + ` (ID: ${mockOrdersDataInitial[1].items[0].productId})`)).toBeInTheDocument();

        const itemNoImageText = mockOrdersDataInitial[1].items[1].productNameSnapshot + ` (ID: ${mockOrdersDataInitial[1].items[1].productId})`;
        expect(screen.getByText(itemNoImageText)).toBeInTheDocument();
        const imgNoImage = screen.getByRole('img', { name: mockOrdersDataInitial[1].items[1].product.name });
        expect(imgNoImage).toHaveAttribute('src', 'https://placehold.co/60x60/eee/ccc?text=No+Image');
    });
    
    test('handles image error by showing error placeholder', async () => {
        // For this test, we need mockOrdersDataInitial[2] which has product4 (ImageFail)
        // Ensure the default mockApiGet for orders returns this data.
        // If your beforeEach sets up a generic mock, you might need to override it here
        // or ensure mockOrdersDataInitial includes the ImageFail case.
        // For simplicity, assuming mockOrdersDataInitial[2] is the one with product4.
        
        renderWithRouter(<SellerDashboardPage />);

        await waitFor(() => {
            expect(screen.getByText(`Order #${mockOrdersDataInitial[2].orderId} (Shipment #${mockOrdersDataInitial[2].sellerOrderId})`)).toBeInTheDocument();
        });

        const imgToFail = screen.getByRole('img', { name: mockProduct4.name }) as HTMLImageElement;
        expect(imgToFail).toHaveAttribute('src', mockProduct4.imageUrl);

        fireEvent.error(imgToFail);
        expect(imgToFail).toHaveAttribute('src', 'https://placehold.co/60x60/eee/ccc?text=Error');
    });

    test('filters orders by status correctly', async () => {
        renderWithRouter(<SellerDashboardPage />);
        await waitFor(() => expect(screen.getByText(`Order #${mockOrdersDataInitial[0].orderId} (Shipment #${mockOrdersDataInitial[0].sellerOrderId})`)).toBeInTheDocument());

        const filterSelect = screen.getByLabelText('Filter by Status:');

        // Initial: All orders visible
        expect(screen.getAllByText(/Order #\d+ \(Shipment #\d+\)/i)).toHaveLength(mockOrdersDataInitial.length);

        // Filter by 'Processing' (Order 101)
        fireEvent.change(filterSelect, { target: { value: 'Processing' } });
        await waitFor(() => {
            expect(screen.getByText(`Order #${mockOrdersDataInitial[0].orderId} (Shipment #${mockOrdersDataInitial[0].sellerOrderId})`)).toBeInTheDocument();
            expect(screen.queryByText(`Order #${mockOrdersDataInitial[1].orderId} (Shipment #${mockOrdersDataInitial[1].sellerOrderId})`)).not.toBeInTheDocument(); // Shipped
            expect(screen.queryByText(`Order #${mockOrdersDataInitial[2].orderId} (Shipment #${mockOrdersDataInitial[2].sellerOrderId})`)).not.toBeInTheDocument(); // Delivered
        });

        // Filter by 'Shipped' (Order 102)
        fireEvent.change(filterSelect, { target: { value: 'Shipped' } });
        await waitFor(() => {
            expect(screen.queryByText(`Order #${mockOrdersDataInitial[0].orderId} (Shipment #${mockOrdersDataInitial[0].sellerOrderId})`)).not.toBeInTheDocument();
            expect(screen.getByText(`Order #${mockOrdersDataInitial[1].orderId} (Shipment #${mockOrdersDataInitial[1].sellerOrderId})`)).toBeInTheDocument();
            expect(screen.queryByText(`Order #${mockOrdersDataInitial[2].orderId} (Shipment #${mockOrdersDataInitial[2].sellerOrderId})`)).not.toBeInTheDocument();
        });
        
        fireEvent.change(filterSelect, { target: { value: 'Ready for Pickup' } });
         await waitFor(() => {
            expect(screen.getByText('No orders found with status "Ready for Pickup".')).toBeInTheDocument();
        });

        fireEvent.change(filterSelect, { target: { value: 'All' } });
        await waitFor(() => {
             expect(screen.getAllByText(/Order #\d+ \(Shipment #\d+\)/i)).toHaveLength(mockOrdersDataInitial.length);
        });
    });

    test('shows "You have no orders yet." when API returns empty order list', async () => {
        mockApiGet.mockReset()
          .mockResolvedValueOnce({ data: [] })
          .mockResolvedValueOnce({ data: mockEarningsData });
    
        renderWithRouter(<SellerDashboardPage />);
        
        await waitFor(() => {
          expect(screen.getByText("You have no orders yet.")).toBeInTheDocument();
        });
        expect(await screen.findByText(`Total Earnings (All Orders): R${mockEarningsData.totalEarnings.toFixed(2)}`)).toBeInTheDocument();
    });

    test('shows error when fetching orders fails (generic error)', async () => {
        mockApiGet.mockReset()
          .mockRejectedValueOnce(new Error('Network Error for Orders'))
          .mockResolvedValueOnce({ data: mockEarningsData });
    
        renderWithRouter(<SellerDashboardPage />);
    
        await waitFor(() => {
          expect(screen.getByText('Error loading orders: Could not load seller orders.')).toBeInTheDocument();
        });
        expect(await screen.findByText(`Total Earnings (All Orders): R${mockEarningsData.totalEarnings.toFixed(2)}`)).toBeInTheDocument();
    });
    
    test('shows specific error when fetching orders fails (AxiosError)', async () => {
        const errorMessage = "Order retrieval failed due to server issue";
        mockApiGet.mockReset()
          .mockRejectedValueOnce(createMockAxiosError("Orders API Error", { message: errorMessage }, 500))
          .mockResolvedValueOnce({ data: mockEarningsData });
    
        renderWithRouter(<SellerDashboardPage />);
    
        await waitFor(() => {
          expect(screen.getByText(`Error loading orders: ${errorMessage}`)).toBeInTheDocument();
        });
    });

    test('displays earnings loading state correctly', async () => {
        mockApiGet.mockReset()
          .mockResolvedValueOnce({ data: [...mockOrdersDataInitial] }) // Orders load
          .mockImplementationOnce(() => new Promise(() => {})); // Earnings never resolve
    
        renderWithRouter(<SellerDashboardPage />);
        
        await waitFor(() => expect(screen.getByText(`Order #${mockOrdersDataInitial[0].orderId} (Shipment #${mockOrdersDataInitial[0].sellerOrderId})`)).toBeInTheDocument());
        expect(screen.getByText('Loading earnings...')).toBeInTheDocument();
    });
    
    test('displays earnings error state (generic error)', async () => {
        mockApiGet.mockReset()
          .mockResolvedValueOnce({ data: [...mockOrdersDataInitial] })
          .mockRejectedValueOnce(new Error('Earnings System Offline'));
    
        renderWithRouter(<SellerDashboardPage />);
        
        await waitFor(() => {
          expect(screen.getByText('Error loading earnings: Could not load earnings.')).toBeInTheDocument();
        });
        expect(await screen.findByText(`Order #${mockOrdersDataInitial[0].orderId} (Shipment #${mockOrdersDataInitial[0].sellerOrderId})`)).toBeInTheDocument();
    });

    // --- NEW/UPDATED TESTS for STATUS UPDATE ---

    test('displays an error message if status update fails', async () => {
      const updateErrorMessage = "Invalid status transition from API.";
      mockApiPatch.mockRejectedValueOnce(createMockAxiosError("Update Failed", { message: updateErrorMessage }, 400));
      
      renderWithRouter(<SellerDashboardPage />);
      await waitFor(() => expect(screen.getByText(`Order #${mockOrdersDataInitial[0].orderId} (Shipment #${mockOrdersDataInitial[0].sellerOrderId})`)).toBeInTheDocument());

      const statusSelectOrder1 = screen.getByLabelText(`Update status for shipment ${mockOrdersDataInitial[0].sellerOrderId}`);
      fireEvent.change(statusSelectOrder1, { target: { value: 'Delivered' } }); // Try an update

      await waitFor(() => {
        expect(screen.getByText(/Update Error: Failed for Order #1: Invalid status transition from API./i)).toBeInTheDocument();
      });
      // Status should revert or remain the original status
      expect(screen.getByLabelText(`Update status for shipment ${mockOrdersDataInitial[0].sellerOrderId}`)).toHaveValue('Processing');
      expect(screen.getByLabelText(`Update status for shipment ${mockOrdersDataInitial[0].sellerOrderId}`)).not.toBeDisabled();
      expect(screen.queryByText('Updating...')).not.toBeInTheDocument();
    });

  });
});