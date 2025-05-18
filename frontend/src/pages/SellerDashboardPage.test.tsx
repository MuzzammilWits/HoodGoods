// src/pages/SellerDashboardPage.test.tsx
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import SellerDashboardPage from './SellerDashboardPage';
import { useAuth0 } from '@auth0/auth0-react';

// Import types from the actual axios module, and the module itself for vi.importActual
import axiosActualModule, { AxiosError } from 'axios'; // Used for typing importOriginal

// --- Mocks ---

// CRITICAL FIX 1: Use vi.hoisted for mockApiGet and mockApiPatch
// This ensures they are initialized before the axios mock factory uses them.
const { mockApiGet, mockApiPatch } = vi.hoisted(() => {
  return {
    mockApiGet: vi.fn(),
    mockApiPatch: vi.fn(),
  };
});

// Mock Auth0 (your existing structure is fine)
vi.mock('@auth0/auth0-react');

// CRITICAL FIX 2: Correctly mock the axios module
vi.mock('axios', async (importOriginal) => {
  // importOriginal should give us the module namespace object
  const actualAxios = await importOriginal<typeof axiosActualModule>();

  return {
    __esModule: true, // Important for mocking modules with default exports

    // This is the default export that the application will receive
    // (e.g., when doing `import axios from 'axios'`)
    default: {
      // Spread all properties/methods from the actual *default export* of axios
      // (which is the AxiosStatic instance)
      ...actualAxios,
      create: vi.fn(() => ({  // Override only the .create() method
        get: mockApiGet,     // Use the hoisted mock function
        patch: mockApiPatch, // Use the hoisted mock function
      })),
    },

    // Provide real named exports from the actual axios module
    AxiosError: actualAxios.AxiosError,
    isAxiosError: actualAxios.isAxiosError,
    // Spread other named exports to ensure they are available if used
    ...(Object.keys(actualAxios)
      .filter(key => key !== 'default' && key !== '__esModule') // Exclude 'default' and '__esModule' already handled
      .reduce((acc, key) => {
        acc[key] = (actualAxios as any)[key]; // Use 'as any' to bypass strict index signature errors if necessary
        return acc;
      }, {} as Record<string, unknown>)
    ),
  };
});

// Mock environment variable
vi.stubEnv('VITE_BACKEND_URL', 'http://localhost:3000/test-api');

// --- Mock Data (from your file) ---
const mockProduct1 = { prodId: 1, name: 'Test Product 1', imageUrl: 'http://example.com/image1.jpg' };
const mockProduct2 = { prodId: 2, name: 'Test Product 2', imageUrl: 'http://example.com/image2.jpg' };
const mockProduct3 = { prodId: 3, name: 'Product NoImage', imageUrl: undefined };
const mockProduct4 = { prodId: 4, name: 'Product ImageFail', imageUrl: 'http://example.com/imagefail.jpg' };


const mockOrdersData = [
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
    status: 'Processing',
    createdAt: '2023-01-01T10:00:00Z',
    updatedAt: '2023-01-01T10:00:00Z',
    items: [{
      sellerOrderItemId: 1, productId: 1, quantityOrdered: 1, pricePerUnit: 100,
      productNameSnapshot: 'Test Product 1', product: mockProduct1, createdAt: '2023-01-01T10:00:00Z', updatedAt: '2023-01-01T10:00:00Z',
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
    status: 'Shipped',
    createdAt: '2023-01-15T14:30:00Z',
    updatedAt: '2023-01-16T09:00:00Z',
    items: [
      { sellerOrderItemId: 2, productId: 2, quantityOrdered: 2, pricePerUnit: 200,
        productNameSnapshot: 'Test Product 2', product: mockProduct2, createdAt: '2023-01-15T14:30:00Z', updatedAt: '2023-01-15T14:30:00Z' },
      { sellerOrderItemId: 3, productId: 3, quantityOrdered: 1, pricePerUnit: 50,
        productNameSnapshot: 'Product NoImage', product: mockProduct3, createdAt: '2023-01-15T14:30:00Z', updatedAt: '2023-01-15T14:30:00Z' }
    ]
  },
    {
    sellerOrderId: 4,
    orderId: 104,
    order: { orderId: 104, userId: 'user4', orderDate: '2023-01-18T10:00:00Z', pickupArea: 'East Campus', pickupPoint: 'Cafe' },
    userId: 'sellerX',
    deliveryMethod: 'Standard Pickup',
    deliveryPrice: 0,
    deliveryTimeEstimate: '2-3',
    itemsSubtotal: 90,
    sellerTotal: 90,
    status: 'Packaging',
    createdAt: '2023-01-18T10:00:00Z',
    updatedAt: '2023-01-18T10:00:00Z',
    items: [{
      sellerOrderItemId: 5, productId: 4, quantityOrdered: 1, pricePerUnit: 90,
      productNameSnapshot: 'Product ImageFail', product: mockProduct4, createdAt: '2023-01-18T10:00:00Z', updatedAt: '2023-01-18T10:00:00Z',
    }]
  }
];
const mockEarningsData = { totalEarnings: 100 + 525 + 90 }; // 715

const createMockAxiosError = ( // Helper for specific Axios error testing
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


describe('SellerDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    vi.mocked(useAuth0).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { name: 'Test Seller', sub: 'auth0|seller123' },
      getAccessTokenSilently: vi.fn().mockResolvedValue('mock-access-token'),
      loginWithRedirect: vi.fn(),
      logout: vi.fn(),
    } as any);

    // Default API call mocks: Now use mockApiGet
    mockApiGet
      .mockResolvedValueOnce({ data: mockOrdersData })
      .mockResolvedValueOnce({ data: mockEarningsData });
  });

  test('renders loading state during auth initialization', () => {
    vi.mocked(useAuth0).mockReturnValue({
      isAuthenticated: false, isLoading: true, user: undefined,
      getAccessTokenSilently: vi.fn(), loginWithRedirect: vi.fn(), logout: vi.fn(),
    } as any);
    render(<SellerDashboardPage />);
    expect(screen.getByText('Loading authentication...')).toBeInTheDocument();
  });

  test('shows login prompt when not authenticated', async () => {
    vi.mocked(useAuth0).mockReturnValue({
      isAuthenticated: false, isLoading: false, user: undefined,
      getAccessTokenSilently: vi.fn(), loginWithRedirect: vi.fn(), logout: vi.fn(),
    } as any);
    render(<SellerDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('Please log in to view your dashboard.')).toBeInTheDocument();
    });
  });

  describe('Authenticated Seller Scenarios', () => {
    test('loads and displays dashboard overview for authenticated seller', async () => {
      render(<BrowserRouter><SellerDashboardPage /></BrowserRouter>);
      
      await waitFor(() => {
        expect(screen.getByText('Seller Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Welcome, Test Seller!')).toBeInTheDocument();
      });
      
      await waitFor(() => {
        expect(screen.getByText(`Total Earnings (All Orders): R${mockEarningsData.totalEarnings.toFixed(2)}`)).toBeInTheDocument();
      });
      expect(screen.getByText('Your Orders')).toBeInTheDocument();
    });

    test('displays fetched orders with their details and items', async () => {
        render(<BrowserRouter><SellerDashboardPage /></BrowserRouter>);

        await waitFor(() => {
            expect(screen.getByText(`Order #${mockOrdersData[0].orderId}`)).toBeInTheDocument();
        });
        expect(screen.getByText(mockOrdersData[0].order.pickupArea)).toBeInTheDocument();
        expect(screen.getByText(mockOrdersData[0].items[0].productNameSnapshot + ` (ID: ${mockOrdersData[0].items[0].productId})`)).toBeInTheDocument();
        expect(screen.getByText(`Qty: ${mockOrdersData[0].items[0].quantityOrdered} @ R${mockOrdersData[0].items[0].pricePerUnit.toFixed(2)} each`)).toBeInTheDocument();
        const img1 = screen.getByRole('img', { name: mockOrdersData[0].items[0].product.name });
        expect(img1).toHaveAttribute('src', mockOrdersData[0].items[0].product.imageUrl);

        expect(screen.getByText(`Order #${mockOrdersData[1].orderId}`)).toBeInTheDocument();
        expect(screen.getByText(mockOrdersData[1].order.pickupPoint)).toBeInTheDocument();
        expect(screen.getByText(mockOrdersData[1].items[0].productNameSnapshot + ` (ID: ${mockOrdersData[1].items[0].productId})`)).toBeInTheDocument();

        const itemNoImageText = mockOrdersData[1].items[1].productNameSnapshot + ` (ID: ${mockOrdersData[1].items[1].productId})`;
        expect(screen.getByText(itemNoImageText)).toBeInTheDocument();
        const imgNoImage = screen.getByRole('img', { name: mockOrdersData[1].items[1].product.name });
        expect(imgNoImage).toHaveAttribute('src', 'https://placehold.co/60x60/eee/ccc?text=No+Image');
    });
    
    test('handles image error by showing error placeholder', async () => {
        render(<BrowserRouter><SellerDashboardPage /></BrowserRouter>);

        await waitFor(() => {
            expect(screen.getByText(`Order #${mockOrdersData[2].orderId}`)).toBeInTheDocument(); // Order 104 with Product ImageFail
        });

        const imgToFail = screen.getByRole('img', { name: mockProduct4.name }) as HTMLImageElement;
        expect(imgToFail).toHaveAttribute('src', mockProduct4.imageUrl);

        fireEvent.error(imgToFail);
        expect(imgToFail).toHaveAttribute('src', 'https://placehold.co/60x60/eee/ccc?text=Error');
    });

    test('filters orders by status correctly', async () => {
        render(<BrowserRouter><SellerDashboardPage /></BrowserRouter>);
        await waitFor(() => expect(screen.getByText(`Order #${mockOrdersData[0].orderId}`)).toBeInTheDocument());

        const filterSelect = screen.getByLabelText('Filter by Status:');

        // Initial: All 3 orders visible
        // FIX for previous getAllByRole: Count by a more reliable element
        expect(screen.getAllByText(/Order #\d+/)).toHaveLength(mockOrdersData.length);

        // Filter by 'Processing' (Order 101)
        fireEvent.change(filterSelect, { target: { value: 'Processing' } });
        await waitFor(() => {
            expect(screen.getByText(`Order #${mockOrdersData[0].orderId}`)).toBeInTheDocument();
            expect(screen.queryByText(`Order #${mockOrdersData[1].orderId}`)).not.toBeInTheDocument(); // Shipped
            expect(screen.queryByText(`Order #${mockOrdersData[2].orderId}`)).not.toBeInTheDocument(); // Packaging
        });

        // Filter by 'Shipped' (Order 102)
        fireEvent.change(filterSelect, { target: { value: 'Shipped' } });
        await waitFor(() => {
            expect(screen.queryByText(`Order #${mockOrdersData[0].orderId}`)).not.toBeInTheDocument();
            expect(screen.getByText(`Order #${mockOrdersData[1].orderId}`)).toBeInTheDocument();
            expect(screen.queryByText(`Order #${mockOrdersData[2].orderId}`)).not.toBeInTheDocument();
        });
        
        fireEvent.change(filterSelect, { target: { value: 'Ready for Pickup' } }); // Assuming this status has no orders
         await waitFor(() => {
            expect(screen.getByText('No orders found with status "Ready for Pickup".')).toBeInTheDocument();
        });

        fireEvent.change(filterSelect, { target: { value: 'All' } });
        await waitFor(() => {
            expect(screen.getAllByText(/Order #\d+/)).toHaveLength(mockOrdersData.length);
        });
    });

    test('shows "You have no orders yet." when API returns empty order list', async () => {
        mockApiGet.mockReset()
          .mockResolvedValueOnce({ data: [] })
          .mockResolvedValueOnce({ data: mockEarningsData });
    
        render(<BrowserRouter><SellerDashboardPage /></BrowserRouter>);
        
        await waitFor(() => {
          expect(screen.getByText("You have no orders yet.")).toBeInTheDocument();
        });
        expect(await screen.findByText(`Total Earnings (All Orders): R${mockEarningsData.totalEarnings.toFixed(2)}`)).toBeInTheDocument();
    });

    test('shows error when fetching orders fails (generic error)', async () => {
        mockApiGet.mockReset()
          .mockRejectedValueOnce(new Error('Network Error for Orders'))
          .mockResolvedValueOnce({ data: mockEarningsData });
    
        render(<BrowserRouter><SellerDashboardPage /></BrowserRouter>);
    
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
    
        render(<BrowserRouter><SellerDashboardPage /></BrowserRouter>);
    
        await waitFor(() => {
          expect(screen.getByText(`Error loading orders: ${errorMessage}`)).toBeInTheDocument();
        });
    });

    test('displays earnings loading state correctly', async () => {
        mockApiGet.mockReset()
          .mockResolvedValueOnce({ data: mockOrdersData })
          .mockImplementationOnce(() => new Promise(() => {}));
    
        render(<BrowserRouter><SellerDashboardPage /></BrowserRouter>);
        
        await waitFor(() => expect(screen.getByText(`Order #${mockOrdersData[0].orderId}`)).toBeInTheDocument());
        expect(screen.getByText('Loading earnings...')).toBeInTheDocument();
    });
    
    test('displays earnings error state (generic error)', async () => {
        mockApiGet.mockReset()
          .mockResolvedValueOnce({ data: mockOrdersData })
          .mockRejectedValueOnce(new Error('Earnings System Offline'));
    
        render(<BrowserRouter><SellerDashboardPage /></BrowserRouter>);
        
        await waitFor(() => {
          expect(screen.getByText('Error loading earnings: Could not load earnings.')).toBeInTheDocument();
        });
        expect(await screen.findByText(`Order #${mockOrdersData[0].orderId}`)).toBeInTheDocument();
    });






  });
});