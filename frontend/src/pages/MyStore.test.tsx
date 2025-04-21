// src/pages/MyStore.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest'; // Use vi from vitest
import MyStore from './MyStore'; // Import the component to test

// --- Mock Auth0 ---
// Mock the useAuth0 hook. THIS MUST BE AT THE TOP LEVEL.
// It ensures that any import or initial render cycle of MyStore
// immediately gets this mocked version, preventing calls to real Auth0 functions.
vi.mock('@auth0/auth0-react', () => ({
  // We don't need to mock Auth0Provider if we mock the hook directly like this
  useAuth0: () => ({
    // *** Crucial: Set isAuthenticated to true from the start ***
    // This prevents the useEffect logic in MyStore from trying to call
    // loginWithRedirect, which causes the "forgot to wrap" error.
    isAuthenticated: true,
    isLoading: false, // Simulate Auth0 loading is complete
    user: { sub: 'auth0|test-user-id-123', name: 'Store Owner' }, // Provide mock user
    loginWithRedirect: vi.fn(), // Mock function (won't be called if isAuthenticated is true)
    logout: vi.fn(), // Mock function
    // Mock getAccessTokenSilently as it's called by fetchStoreData
    getAccessTokenSilently: vi.fn().mockResolvedValue('mock-store-test-token'),
  }),
}));

// --- Mock fetch ---
// Mock fetch specifically for the endpoints MyStore calls
const mockStoreData = {
  storeName: 'Mock Test Store',
  products: [
    { prodId: 1, name: 'Test Product 1', description: 'Desc 1', price: 10.99, category: 'Clothing', imageUrl: 'http://example.com/img1.jpg' },
    { prodId: 2, name: 'Test Product 2', description: 'Desc 2', price: 25.50, category: 'Art', imageUrl: null },
  ],
};

// Store the original fetch to restore later
const originalFetch = global.fetch;

beforeEach(() => {
  // Reset mocks and fetch before each test
  vi.clearAllMocks();

  // Configure the fetch mock for this test suite
  global.fetch = vi.fn(async (url, options): Promise<Response> => {
    const urlString = url.toString();
    const method = options?.method || 'GET';
    console.log(`[MyStore Test] Mock fetch intercepted: ${method} ${urlString}`);

    // Mock GET /stores/my-store
    if (urlString.includes('/stores/my-store') && method === 'GET') {
      const authHeader = (options?.headers as Record<string, string>)?.['Authorization'];
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.error('[MyStore Test] Mock fetch: Missing/invalid Bearer token for /stores/my-store');
        // Simulate an unauthorized response
        const response = new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
        return Promise.resolve(response);
      }
      console.log('[MyStore Test] Mock fetch: Returning mock store data for /stores/my-store.');
      // Simulate a successful response with mock data
      const response = new Response(JSON.stringify(mockStoreData), { status: 200, headers: { 'Content-Type': 'application/json' } });
      return Promise.resolve(response);
    }

    // Mock POST /upload/image
    if (urlString.includes('/upload/image') && method === 'POST') {
      console.log('[MyStore Test] Mock fetch: Simulating image upload.');
      const response = new Response(JSON.stringify({ url: 'http://example.com/mock_uploaded_image.jpg' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      return Promise.resolve(response);
    }

    // Mock POST /stores/products (Add Product)
    if (urlString.includes('/stores/products') && method === 'POST') {
      console.log('[MyStore Test] Mock fetch: Simulating add product.');
      const response = new Response(JSON.stringify({ prodId: 999, message: 'Product added' }), { status: 201, headers: { 'Content-Type': 'application/json' } });
      return Promise.resolve(response);
    }

    // Mock PATCH /stores/products/:id (Update Product)
    if (urlString.match(/\/stores\/products\/\d+$/) && method === 'PATCH') {
      console.log(`[MyStore Test] Mock fetch: Simulating update product.`);
      const response = new Response(JSON.stringify({ message: 'Product updated' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      return Promise.resolve(response);
    }

    // Mock DELETE /stores/products/:id (Delete Product)
    if (urlString.match(/\/stores\/products\/\d+$/) && method === 'DELETE') {
      console.log(`[MyStore Test] Mock fetch: Simulating delete product.`);
      // DELETE often returns 204 No Content
      const response = new Response(null, { status: 204 });
      return Promise.resolve(response);
    }

    // Fallback for unhandled requests
    console.warn(`[MyStore Test] Mock fetch: Unhandled request - ${method} ${urlString}`);
    const response = new Response(JSON.stringify({ message: 'Mock Fetch: Not Found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    return Promise.resolve(response);
  });
});

afterEach(() => {
    // Restore original fetch after each test to avoid interference
    global.fetch = originalFetch;
});


// --- Test Suite ---
describe('MyStore component', () => {

  // --- Test Case (Async) ---
  // Test is marked async to allow for `await` with `findBy*` queries
  it('renders the store dashboard after loading', async () => {
    render(<MyStore />); // Render the component

    // ** Assertions wait for elements to appear **
    // Use findBy* queries which wait for the element to be available,
    // handling the initial loading states ("Checking Authentication...", "Loading Store Data...")

    // Check for the store name heading (using mock data)
    // This should appear after fetchStoreData completes successfully
    expect(await screen.findByRole('heading', { name: mockStoreData.storeName, level: 1 })).toBeInTheDocument();

    // Check for the "Your Products" section heading
    expect(await screen.findByRole('heading', { name: /Your Products/i, level: 2 })).toBeInTheDocument();

    // Check if product data is rendered from mock data
    expect(await screen.findByText(mockStoreData.products[0].name)).toBeInTheDocument();
    expect(await screen.findByText(mockStoreData.products[1].name)).toBeInTheDocument();

    // ** Remove incorrect assertions **
    // expect(screen.getByText(/Sign out/i)).toBeInTheDocument(); // REMOVED - Not part of MyStore
    // expect(screen.getByText(/Shop/i)).toBeInTheDocument(); // REMOVED - Not part of MyStore

    // Verify the fetch mock was called correctly for the initial store data load
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        // Use stringContaining because the baseUrl might resolve differently
        expect.stringContaining('/stores/my-store'),
        // Check that options included the Authorization header from the mocked token
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-store-test-token',
          }),
        })
      );
    });

    // Add a check to ensure the loading indicators are gone
    expect(screen.queryByText(/Checking Authentication.../i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Loading Store Data.../i)).not.toBeInTheDocument();
  });

  // --- Add more specific tests here ---
  // test('displays "Add Product" form when button is clicked', async () => { ... });
  // test('prevents deleting the last product', async () => { ... });
  // test('shows an error message if fetching store data fails', async () => { ... });

});
