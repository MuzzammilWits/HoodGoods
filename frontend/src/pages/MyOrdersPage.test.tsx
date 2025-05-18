import { render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import MyOrdersPage from './MyOrdersPage'; // Adjust path if necessary
import RealAxiosModule, { AxiosError as RealAxiosErrorType } from 'axios'; // Import real AxiosError and the module type

// --- Helper Types (Copied from MyOrdersPage.tsx) ---
interface ProductSummary {
    prodId: number;
    name: string;
    imageUrl?: string;
}
interface SellerOrderItemWithProduct {
    sellerOrderItemId: number;
    productId: number;
    quantityOrdered: number;
    pricePerUnit: number;
    productNameSnapshot: string;
    product: ProductSummary;
    createdAt: string | null;
    updatedAt: string | null;
}
interface NestedSellerOrder {
    sellerOrderId: number;
    orderId: number;
    userId: string; // Seller's User ID
    deliveryMethod: string;
    deliveryPrice: number;
    deliveryTimeEstimate: string;
    itemsSubtotal: number;
    sellerTotal: number;
    status: string; // This is the tracking status for this part
    createdAt: string | null;
    updatedAt: string | null;
    items: SellerOrderItemWithProduct[];
}
interface BuyerOrderDetails {
    orderId: number;
    userId: string; // Buyer's User ID
    orderDate: string;
    grandTotal: number;
    pickupArea: string;
    pickupPoint: string;
    createdAt: string | null;
    updatedAt: string | null;
    sellerOrders: NestedSellerOrder[]; // Array of seller orders within this main order
}
// --- End Helper Types ---

// Re-define statusClassMap for test assertions if not exported from component
const statusClassMapForTest: Record<string, string> = {
    Processing: 'status-processing',
    Packaging: 'status-packaging',
    'Ready for Pickup': 'status-ready',
    Shipped: 'status-shipped',
    Delivered: 'status-delivered',
    Cancelled: 'status-cancelled',
};


// --- Mocks ---
const mockGetAccessTokenSilently = vi.fn();
const mockUseAuth0 = vi.fn();

vi.mock('@auth0/auth0-react', () => ({
  useAuth0: () => mockUseAuth0(),
}));

// Mock axios instance's get method
const mockApiGet = vi.fn();

// Mock the axios module itself
vi.mock('axios', async (importOriginal) => {
  const actualAxios = await importOriginal<typeof RealAxiosModule>();
  return {
    // This makes named exports like 'AxiosError' and 'isAxiosError' available
    // as if they were exported from the mocked module.
    AxiosError: actualAxios.AxiosError,
    isAxiosError: actualAxios.isAxiosError,
    // ... other named exports from actualAxios if needed

    // This 'default' key represents the default export of the 'axios' module.
    // The default export of axios is an instance of AxiosStatic (which has a .create method).
    default: {
      create: vi.fn(() => ({
        get: (...args: any[]) => mockApiGet(...args),
      })),
      // Provide other static methods/properties from AxiosStatic if your component uses them
      // directly on the `axios` default import.
      isAxiosError: actualAxios.isAxiosError,
      // For example, if your component used axios.defaults:
      // defaults: actualAxios.defaults,
    },
  };
});


// --- Helper Data ---
const MOCK_ORDER_DATE_ISO = '2024-05-15T10:00:00.000Z';
const MOCK_ORDER_DATE_DISPLAY = new Date(MOCK_ORDER_DATE_ISO).toLocaleDateString();
const MOCK_CREATED_AT_ISO = '2024-05-15T10:05:00.000Z';

const mockOrdersData: BuyerOrderDetails[] = [
  {
    orderId: 101,
    userId: 'buyer123',
    orderDate: MOCK_ORDER_DATE_ISO,
    grandTotal: 250.75,
    pickupArea: 'North Suburbs',
    pickupPoint: 'Community Hall A',
    createdAt: MOCK_CREATED_AT_ISO,
    updatedAt: MOCK_CREATED_AT_ISO,
    sellerOrders: [
      {
        sellerOrderId: 201,
        orderId: 101,
        userId: 'sellerABC',
        deliveryMethod: 'Standard Courier',
        deliveryPrice: 50.00,
        deliveryTimeEstimate: '3-5',
        itemsSubtotal: 100.00,
        sellerTotal: 150.00,
        status: 'Processing',
        createdAt: MOCK_CREATED_AT_ISO,
        updatedAt: MOCK_CREATED_AT_ISO,
        items: [
          { sellerOrderItemId: 301, productId: 1, quantityOrdered: 2, pricePerUnit: 25.00, productNameSnapshot: 'Eco-Friendly Water Bottle', product: { prodId: 1, name: 'Eco-Friendly Water Bottle', imageUrl: 'https://example.com/image1.jpg' }, createdAt: MOCK_CREATED_AT_ISO, updatedAt: MOCK_CREATED_AT_ISO, },
          { sellerOrderItemId: 302, productId: 2, quantityOrdered: 1, pricePerUnit: 50.00, productNameSnapshot: 'Organic Cotton Tote Bag', product: { prodId: 2, name: 'Organic Cotton Tote Bag', imageUrl: 'https://example.com/image2.jpg' }, createdAt: MOCK_CREATED_AT_ISO, updatedAt: MOCK_CREATED_AT_ISO, },
        ],
      },
      {
        sellerOrderId: 202,
        orderId: 101,
        userId: 'sellerXYZ',
        deliveryMethod: 'Local Pickup',
        deliveryPrice: 0.00,
        deliveryTimeEstimate: '1',
        itemsSubtotal: 100.75,
        sellerTotal: 100.75,
        status: 'Ready for Pickup',
        createdAt: MOCK_CREATED_AT_ISO,
        updatedAt: MOCK_CREATED_AT_ISO,
        items: [
          { sellerOrderItemId: 303, productId: 3, quantityOrdered: 1, pricePerUnit: 100.75, productNameSnapshot: 'Handmade Ceramic Mug', product: { prodId: 3, name: 'Handmade Ceramic Mug', imageUrl: undefined }, createdAt: MOCK_CREATED_AT_ISO, updatedAt: MOCK_CREATED_AT_ISO, },
        ],
      },
    ],
  },
];


describe('MyOrdersPage', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockGetAccessTokenSilently.mockReset();
    mockUseAuth0.mockReset();
    mockApiGet.mockReset();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy.mockRestore();
  });

  it('should render "Loading authentication..." when Auth0 is loading', () => {
    mockUseAuth0.mockReturnValue({ isAuthenticated: false, isLoading: true, getAccessTokenSilently: mockGetAccessTokenSilently, user: undefined });
    render(<MyOrdersPage />);
    expect(screen.getByText('Loading authentication...')).toBeInTheDocument();
  });

  it('should render "Please log in..." when not authenticated and Auth0 is done loading', () => {
    mockUseAuth0.mockReturnValue({ isAuthenticated: false, isLoading: false, getAccessTokenSilently: mockGetAccessTokenSilently, user: undefined });
    render(<MyOrdersPage />);
    expect(screen.getByText('Please log in to view your order history.')).toBeInTheDocument();
  });

  it('should render "Loading your orders..." when authenticated and fetching orders', async () => {
    mockUseAuth0.mockReturnValue({ isAuthenticated: true, isLoading: false, getAccessTokenSilently: mockGetAccessTokenSilently.mockResolvedValue('fake-token'), user: { sub: 'test-user-id' } });
    mockApiGet.mockImplementation(() => new Promise(() => {}));
    render(<MyOrdersPage />);
    expect(await screen.findByText('Loading your orders...')).toBeInTheDocument();
    expect(document.querySelector('.spinner')).toBeInTheDocument();
  });

  it('should display orders correctly when authenticated and data is fetched', async () => {
    mockUseAuth0.mockReturnValue({ isAuthenticated: true, isLoading: false, getAccessTokenSilently: mockGetAccessTokenSilently.mockResolvedValue('fake-token'), user: { sub: 'test-user-id' } });
    mockApiGet.mockResolvedValue({ data: mockOrdersData });
    render(<MyOrdersPage />);
    await waitFor(() => expect(screen.queryByText('Loading your orders...')).not.toBeInTheDocument());
    
    const orderData = mockOrdersData[0];
    const orderHeading = await screen.findByRole('heading', { name: `Order #${orderData.orderId}`, level: 2 });
    const orderArticleElement = orderHeading.closest('article'); 
    
    expect(orderArticleElement).toBeInTheDocument();
    // Type guard to ensure orderArticleElement is not null for TypeScript
    if (!orderArticleElement) throw new Error('Order article element not found');

    // Use within for queries inside this specific order article
    // Cast to HTMLElement as 'within' expects it and 'closest' returns Element | null
    const orderView = within(orderArticleElement as HTMLElement);

    expect(orderView.getByText((content, element) => element?.tagName.toLowerCase() === 'span' && content.startsWith('Placed on:') && content.includes(MOCK_ORDER_DATE_DISPLAY))).toBeInTheDocument();

    const strongTotal = orderView.getByText('Grand Total:');
    expect(strongTotal.closest('p')).toHaveTextContent(`Grand Total: R${orderData.grandTotal.toFixed(2)}`);

    const strongPickup = orderView.getByText('Pickup Location:');
    expect(strongPickup.closest('p')).toHaveTextContent(`Pickup Location: ${orderData.pickupPoint} (${orderData.pickupArea})`);

    for (const sellerOrder of orderData.sellerOrders) {
        const shipmentHeadingElement = orderView.getByRole('heading', { name: `Shipment #${sellerOrder.sellerOrderId}`, level: 4 });
        const shipmentCardElement = shipmentHeadingElement.closest<HTMLElement>('.shipment-card'); // Use type assertion for closest
        
        expect(shipmentCardElement).toBeInTheDocument();
        if (!shipmentCardElement) continue; // Should not happen if expect passed

        const shipmentView = within(shipmentCardElement); // shipmentCardElement is now HTMLElement

        const statusElement = shipmentView.getByText(sellerOrder.status, { exact: false });
        const expectedStatusClass = statusClassMapForTest[sellerOrder.status] || 'status-unknown';
        expect(statusElement).toHaveClass('status-badge', expectedStatusClass);
            
        const strongDeliveryMethod = shipmentView.getByText('Delivery Method:', { exact: false });
        expect(strongDeliveryMethod.closest('p')).toHaveTextContent(`Delivery Method: ${sellerOrder.deliveryMethod} (R${sellerOrder.deliveryPrice.toFixed(2)})`);
        
        for (const item of sellerOrder.items) {
            expect(shipmentView.getByText(item.productNameSnapshot)).toBeInTheDocument();
            const imgElement = shipmentView.getByAltText(item.product.name) as HTMLImageElement;
            if (item.product.imageUrl) {
                expect(imgElement).toHaveAttribute('src', item.product.imageUrl);
            } else {
                expect(imgElement.src).toContain('https://placehold.co/50x50');
            }
            const qtyElement = shipmentView.getByText((content, el) => el?.tagName.toLowerCase() === 'span' && content.startsWith('Qty:') && content.includes(item.quantityOrdered.toString()) && content.includes(item.pricePerUnit.toFixed(2)));
            expect(qtyElement).toBeInTheDocument();
        }
    }
  });

  it('should display "You haven\'t placed any orders yet." when authenticated and no orders are found', async () => {
    mockUseAuth0.mockReturnValue({ isAuthenticated: true, isLoading: false, getAccessTokenSilently: mockGetAccessTokenSilently.mockResolvedValue('fake-token'), user: { sub: 'test-user-id' } });
    mockApiGet.mockResolvedValue({ data: [] });
    render(<MyOrdersPage />);
    expect(await screen.findByText("You haven't placed any orders yet.")).toBeInTheDocument();
  });

  it('should display an error message if fetching orders fails with a specific API error message', async () => {
    mockUseAuth0.mockReturnValue({ isAuthenticated: true, isLoading: false, getAccessTokenSilently: mockGetAccessTokenSilently.mockResolvedValue('fake-token'), user: { sub: 'test-user-id' } });
    const errorMessage = 'Network Error from API';
    const axiosErrorInstance = new RealAxiosErrorType( 
      'Network request failed', 
      'ERR_NETWORK', 
      undefined, 
      undefined, 
      { data: { message: errorMessage }, status: 500, statusText: 'Internal Server Error', headers: {}, config: {} as any }
    );
    mockApiGet.mockRejectedValue(axiosErrorInstance);
    render(<MyOrdersPage />);
    expect(await screen.findByText(`Error loading orders: ${errorMessage}`)).toBeInTheDocument();
    expect(consoleErrorSpy).toHaveBeenCalled(); 
  });

  it('should display a generic error message if fetching orders fails without specific API message', async () => {
    mockUseAuth0.mockReturnValue({ isAuthenticated: true, isLoading: false, getAccessTokenSilently: mockGetAccessTokenSilently.mockResolvedValue('fake-token'), user: { sub: 'test-user-id' } });
    const genericErrorMessage = 'Something went wrong on the server';
    const axiosErrorInstance = new RealAxiosErrorType( 
      genericErrorMessage, 
      'ERR_BAD_RESPONSE',
      undefined,
      undefined,
      { data: {}, status: 503, statusText: 'Service Unavailable', headers: {}, config: {} as any } 
    );
    mockApiGet.mockRejectedValue(axiosErrorInstance);
    render(<MyOrdersPage />);
    expect(await screen.findByText(`Error loading orders: ${genericErrorMessage}`)).toBeInTheDocument();
    expect(consoleErrorSpy).toHaveBeenCalled(); 
  });

  it('should display a default error message if fetching orders fails with a non-Axios error', async () => {
    mockUseAuth0.mockReturnValue({ isAuthenticated: true, isLoading: false, getAccessTokenSilently: mockGetAccessTokenSilently.mockResolvedValue('fake-token'), user: { sub: 'test-user-id' } });
    mockApiGet.mockRejectedValue(new Error('A generic non-axios error'));
    render(<MyOrdersPage />);
    expect(await screen.findByText('Error loading orders: Could not load your orders.')).toBeInTheDocument();
    expect(consoleErrorSpy).toHaveBeenCalled(); 
  });

});
