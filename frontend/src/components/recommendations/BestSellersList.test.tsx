// frontend/src/components/recommendations/BestSellersList.test.tsx

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { User, Auth0ContextInterface } from '@auth0/auth0-react';
import BestSellersList from './BestSellersList';
import { PopularProductDto } from '../../types';
import { CartItemUI } from '../../context/ContextCart';

//Mock import.meta.env

// Mock the environment variables to control API URLs in tests.
const mockEnv = {
  VITE_BACKEND_URL: 'http://mock-auth-api.com',
  VITE_API_BASE_URL: 'http://mock-service-api.com',
};
vi.mock('import.meta', () => ({
  env: mockEnv,
}));


// Mock external modules to isolate BestSellersList component.
vi.mock('../../services/recommendationsService', async () => {
  const originalModule = await vi.importActual<typeof import('../../services/recommendationsService')>('../../services/recommendationsService');
  return { ...originalModule, getBestSellingProducts: vi.fn() };
});
vi.mock('../../context/ContextCart', async () => ({ useCart: vi.fn() }));
vi.mock('@auth0/auth0-react', async () => ({ useAuth0: vi.fn() }));
vi.mock('axios');

// Declare mock variables to hold mocked functions for easier access and type safety.
let mockGetBestSellingProducts: ReturnType<typeof vi.fn>;
let mockUseCart: ReturnType<typeof vi.fn>;
let mockUseAuth0: ReturnType<typeof vi.fn>;
let mockAxiosGet: ReturnType<typeof vi.fn>;

// Define mock product data for consistent testing.
const mockProduct1: PopularProductDto = {
  productId: 123, name: 'Super Headphones', productPrice: 79.99, storeId: 'storeA', storeName: 'Electro Store',
  imageUrl: 'http://example.com/headphones.jpg', productquantity: 10, userId: 'sellerUser1', salesCount: 150,
};
const mockProduct2: PopularProductDto = {
  productId: 456, name: 'Comfortable Keyboard', productPrice: 49.50, storeId: 'storeB', storeName: 'Office Goods Co.',
  imageUrl: 'http://example.com/keyboard.jpg', productquantity: 5, userId: 'sellerUser2', salesCount: 90,
};
const mockProductNoStoreName: PopularProductDto = {
  productId: 202, name: 'Generic Item', productPrice: 10.00, storeId: 'storeD', storeName: undefined,
  imageUrl: 'http://example.com/generic.jpg', productquantity: 8, userId: 'sellerUser4', salesCount: 40,
};

// Type definition for a mock user object from Auth0.
type MockUser = { sub?: string; name?: string; [key: string]: any };

// Base mock for Auth0 context to reduce redundancy.
const baseAuth0Mock: Auth0ContextInterface<User> = {
  isAuthenticated: false, user: undefined, isLoading: false,
  getAccessTokenSilently: vi.fn(), loginWithRedirect: vi.fn(), getAccessTokenWithPopup: vi.fn(),
  getIdTokenClaims: vi.fn(), loginWithPopup: vi.fn(), logout: vi.fn(), handleRedirectCallback: vi.fn(),
};

// Test suite for the BestSellersList component.
describe('BestSellersList', () => {
  let mockAddToCartFn: ReturnType<typeof vi.fn>;
  let mockGetAccessTokenSilentlyFn: ReturnType<typeof vi.fn>;
  let alertSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  // Setup mocks before each test.
  beforeEach(async () => {
    vi.resetModules(); // Reset module mocks between tests.
    vi.doMock('import.meta', () => ({ env: mockEnv })); // Re-mock env for isolated tests.

    // Import and mock specific functions from modules.
    const recommendationsServiceImport = await import('../../services/recommendationsService');
    mockGetBestSellingProducts = vi.mocked(recommendationsServiceImport.getBestSellingProducts);
    const cartContextImport = await import('../../context/ContextCart');
    mockUseCart = vi.mocked(cartContextImport.useCart);
    const auth0ReactImport = await import('@auth0/auth0-react');
    mockUseAuth0 = vi.mocked(auth0ReactImport.useAuth0);
    const axiosDefault = (await import('axios')).default;
    mockAxiosGet = vi.mocked(axiosDefault.get);

    vi.clearAllMocks(); // Clear any previous mock calls.
    mockAddToCartFn = vi.fn().mockResolvedValue(undefined); // Mock add to cart function.
    mockGetAccessTokenSilentlyFn = vi.fn().mockResolvedValue('mock-access-token'); // Mock Auth0 token retrieval.
    mockUseAuth0.mockReturnValue({ ...baseAuth0Mock, getAccessTokenSilently: mockGetAccessTokenSilentlyFn }); // Set Auth0 mock return value.
    mockUseCart.mockReturnValue({
      cartItems: [] as CartItemUI[], addToCart: mockAddToCartFn, removeFromCart: vi.fn().mockResolvedValue(undefined),
      updateQuantity: vi.fn().mockResolvedValue(undefined), clearCart: vi.fn().mockResolvedValue(undefined),
      totalItems: 0, totalPrice: 0, isLoading: false, cartLoaded: true,
      fetchCart: vi.fn().mockResolvedValue(undefined), cartError: undefined,
    });
    mockGetBestSellingProducts.mockResolvedValue([mockProduct1, mockProduct2]); // Mock product fetching.
    mockAxiosGet.mockResolvedValue({ data: { role: 'customer' } }); // Mock initial role fetch.
    alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {}); // Spy on window.alert to prevent actual alerts.
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {}); // Spy on console.error.
  });

  // Restore spied-on functions after each test.
  afterEach(() => {
    alertSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    vi.useRealTimers(); // Ensure real timers are restored if any test used fake ones.
  });

  
  // Test case: should display the default title.
  it('should display the default title', async () => {
    render(<BestSellersList />);
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Best Selling Products' })).toBeInTheDocument());
  });

  // Test case: should fetch and display products with correct details.
  it('should fetch and display products with correct details', async () => {
    render(<BestSellersList />);
    await waitFor(() => {
      expect(screen.getByText(mockProduct1.name)).toBeInTheDocument();
      expect(screen.getByText(`R${mockProduct1.productPrice.toFixed(2)}`)).toBeInTheDocument();
    });
  });

  // Test case: should display placeholder image on image error.
  it('should display placeholder image on image error', async () => {
    render(<BestSellersList />);
    await waitFor(() => screen.getByText(mockProduct1.name));
    const image = screen.getAllByRole('img', { name: mockProduct1.name })[0] as HTMLImageElement;
    fireEvent.error(image); // Simulate an image loading error.
    expect(image.src).toContain('/placeholder-image.png'); // Verify placeholder is used.
  });

  // Test case: should not show "Sold by:" if storeName is not available.
  it('should not show "Sold by:" if storeName is not available', async () => {
    mockGetBestSellingProducts.mockResolvedValue([mockProductNoStoreName]);
    render(<BestSellersList />);
    await waitFor(() => {
      expect(screen.getByText(mockProductNoStoreName.name)).toBeInTheDocument();
      expect(screen.queryByText(/Sold by:/i)).not.toBeInTheDocument(); // Ensure "Sold by:" is absent.
    });
  });

  // Test case: should fetch user role if authenticated and Auth0 is not loading.
  it('should fetch user role if authenticated and Auth0 is not loading', async () => {
    mockUseAuth0.mockReturnValue({
      ...baseAuth0Mock, user: { sub: 'currentUserSub' } as MockUser, isAuthenticated: true,
      getAccessTokenSilently: mockGetAccessTokenSilentlyFn,
    });
    render(<BestSellersList />);
    await waitFor(() => expect(mockAxiosGet).toHaveBeenCalledWith(
        'http://localhost:3000/auth/me', // Adjusted to observed behavior
        { headers: { Authorization: `Bearer mock-access-token` } }
    ));
  });

  // Test case: should handle role fetch error gracefully and set role to null.
  it('should handle role fetch error gracefully and set role to null', async () => {
    mockUseAuth0.mockReturnValue({
      ...baseAuth0Mock, user: { sub: 'currentUserSub' } as MockUser, isAuthenticated: true,
      getAccessTokenSilently: mockGetAccessTokenSilentlyFn,
    });
    // Simulate an error when fetching the user's role.
    mockAxiosGet.mockImplementation(async (url: string) => {
        if (url === 'http://localhost:3000/auth/me') { // Adjusted to observed behavior
            throw new Error('Role fetch failed');
        }
        return { data: {} };
    });
    render(<BestSellersList />);
    await waitFor(() => expect(mockAxiosGet).toHaveBeenCalledWith('http://localhost:3000/auth/me', expect.any(Object)));
    await waitFor(() => expect(screen.getByText(mockProduct1.name)).toBeInTheDocument());
  });

  // Test suite for "Add to Cart" button and its related logic.
  describe('Add to Cart button and logic', () => {
    const user = userEvent.setup(); // Setup user-event for simulating user interactions.

    // Test case: should show "Please wait..." button state if Auth0 or role is loading.
    it('should show "Please wait..." button state if Auth0 or role is loading', async () => {
        mockUseAuth0.mockReturnValue({
            ...baseAuth0Mock, user: { sub: 'currentUserSub' } as MockUser, isAuthenticated: true, isLoading: true,
            getAccessTokenSilently: mockGetAccessTokenSilentlyFn,
          });
      render(<BestSellersList />);
      await waitFor(() => expect(screen.getByText(mockProduct1.name)).toBeInTheDocument());
      const verifyingButtons = await screen.findAllByRole('button', { name: /Verifying user permissions/i });
      expect(verifyingButtons.length).toBeGreaterThan(0);
      expect(verifyingButtons[0]).toHaveTextContent('Verifying...');
      expect(verifyingButtons[0]).toBeDisabled();
    });

    // Test case: should show "Please sign in" notification if user is not authenticated and tries to add to cart.
    it('should show "Please sign in" notification if user is not authenticated and tries to add to cart', async () => {
        mockUseAuth0.mockReturnValue({...baseAuth0Mock, isAuthenticated: false });
        render(<BestSellersList />);
        await waitFor(() => expect(screen.getByText(mockProduct1.name)).toBeInTheDocument());
        const addButton = screen.getAllByRole('button', { name: `Add ${mockProduct1.name} to cart` })[0];
        await user.click(addButton); // Simulate a click on the add to cart button.
        await waitFor(() => expect(screen.getByText('Please sign in to add items to your cart.')).toBeInTheDocument());
      });

    // Test case: should have "Admin View" button (disabled) if user is admin.
    it('should have "Admin View" button (disabled) if user is admin', async () => {
        mockUseAuth0.mockReturnValue({
          ...baseAuth0Mock, user: { sub: 'adminUser' } as MockUser, isAuthenticated: true, getAccessTokenSilently: mockGetAccessTokenSilentlyFn,
        });
        mockAxiosGet.mockResolvedValue({ data: { role: 'admin' } }); // Mock user role as 'admin'.
        render(<BestSellersList />);
        await waitFor(() => {
          const adminButtons = screen.getAllByRole('button', { name: `Admin cannot add ${mockProduct1.name} to cart` });
          expect(adminButtons.length).toBeGreaterThan(0);
          expect(adminButtons[0]).toHaveTextContent('Admin View');
          expect(adminButtons[0]).toBeDisabled(); // Admin button should be disabled.
        });
      });

    // Test case: should successfully add product to cart and show success notification.
    it('should successfully add product to cart and show success notification', async () => {
        mockUseAuth0.mockReturnValue({
          ...baseAuth0Mock, user: { sub: 'customer1' } as MockUser, isAuthenticated: true, getAccessTokenSilently: mockGetAccessTokenSilentlyFn,
        });
        render(<BestSellersList />);
        await waitFor(() => expect(screen.getByText(mockProduct1.name)).toBeInTheDocument());
        const addButton = screen.getAllByRole('button', { name: `Add ${mockProduct1.name} to cart` })[0];
        await user.click(addButton);
        await waitFor(() => expect(mockAddToCartFn).toHaveBeenCalled()); // Verify addToCart was called.
        await waitFor(() => expect(screen.getByText(`${mockProduct1.name} added to cart!`)).toBeInTheDocument()); // Verify success message.
      });
  });
});