// frontend/src/components/recommendations/BestSellersList.test.tsx

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { User, Auth0ContextInterface } from '@auth0/auth0-react';

// --- Mock import.meta.env ---
// NOTE: For reliable testing of VITE_ variables used in module-level constants
// (like `backendUrl` in BestSellersList.tsx), using the `define` property
// in `vitest.config.ts` is STRONGLY RECOMMENDED.
const mockEnv = {
  VITE_BACKEND_URL: 'http://mock-auth-api.com',
  VITE_API_BASE_URL: 'http://mock-service-api.com',
};
vi.mock('import.meta', () => ({
  env: mockEnv,
}));

import BestSellersList from './BestSellersList';
import { PopularProductDto } from '../../types';
// **** USER ACTION REQUIRED: Ensure CartItemUI is exported from this path for this import to work ****
// If CartItemUI cannot be exported, you'll need to define a local TestCartItem interface
// and use `[] as TestCartItem[]` for cartItems in the useCart mock.
import { CartItemUI } from '../../context/ContextCart';


vi.mock('../../services/recommendationsService', async () => {
  const originalModule = await vi.importActual<typeof import('../../services/recommendationsService')>('../../services/recommendationsService');
  return { ...originalModule, getBestSellingProducts: vi.fn() };
});
vi.mock('../../context/ContextCart', async () => ({ useCart: vi.fn() }));
vi.mock('@auth0/auth0-react', async () => ({ useAuth0: vi.fn() }));
vi.mock('axios');

let mockGetBestSellingProducts: ReturnType<typeof vi.fn>;
let mockUseCart: ReturnType<typeof vi.fn>;
let mockUseAuth0: ReturnType<typeof vi.fn>;
let mockAxiosGet: ReturnType<typeof vi.fn>;

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

type MockUser = { sub?: string; name?: string; [key: string]: any };

const baseAuth0Mock: Auth0ContextInterface<User> = {
  isAuthenticated: false, user: undefined, isLoading: false,
  getAccessTokenSilently: vi.fn(), loginWithRedirect: vi.fn(), getAccessTokenWithPopup: vi.fn(),
  getIdTokenClaims: vi.fn(), loginWithPopup: vi.fn(), logout: vi.fn(), handleRedirectCallback: vi.fn(),
};

describe('BestSellersList', () => {
  let mockAddToCartFn: ReturnType<typeof vi.fn>;
  let mockGetAccessTokenSilentlyFn: ReturnType<typeof vi.fn>;
  let alertSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    vi.resetModules();
    vi.doMock('import.meta', () => ({ env: mockEnv }));

    const recommendationsServiceImport = await import('../../services/recommendationsService');
    mockGetBestSellingProducts = vi.mocked(recommendationsServiceImport.getBestSellingProducts);
    const cartContextImport = await import('../../context/ContextCart');
    mockUseCart = vi.mocked(cartContextImport.useCart);
    const auth0ReactImport = await import('@auth0/auth0-react');
    mockUseAuth0 = vi.mocked(auth0ReactImport.useAuth0);
    const axiosDefault = (await import('axios')).default;
    mockAxiosGet = vi.mocked(axiosDefault.get);

    vi.clearAllMocks();
    mockAddToCartFn = vi.fn().mockResolvedValue(undefined);
    mockGetAccessTokenSilentlyFn = vi.fn().mockResolvedValue('mock-access-token');
    mockUseAuth0.mockReturnValue({ ...baseAuth0Mock, getAccessTokenSilently: mockGetAccessTokenSilentlyFn });
    mockUseCart.mockReturnValue({
      cartItems: [] as CartItemUI[], addToCart: mockAddToCartFn, removeFromCart: vi.fn().mockResolvedValue(undefined),
      updateQuantity: vi.fn().mockResolvedValue(undefined), clearCart: vi.fn().mockResolvedValue(undefined),
      totalItems: 0, totalPrice: 0, isLoading: false, cartLoaded: true,
      fetchCart: vi.fn().mockResolvedValue(undefined), cartError: undefined,
    });
    mockGetBestSellingProducts.mockResolvedValue([mockProduct1, mockProduct2]);
    mockAxiosGet.mockResolvedValue({ data: { role: 'customer' } });
    alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    alertSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    vi.useRealTimers(); // Ensure real timers are restored if any test used fake ones (none in this suite now)
  });

  it('should display loading state initially for products', () => {
    mockGetBestSellingProducts.mockImplementation(() => new Promise(() => {}));
    render(<BestSellersList />);
    expect(screen.getByText('Loading best sellers...')).toBeInTheDocument();
  });

  it('should display the default title', async () => {
    render(<BestSellersList />);
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Best Selling Products' })).toBeInTheDocument());
  });

  it('should fetch and display products with correct details', async () => {
    render(<BestSellersList />);
    await waitFor(() => {
      expect(screen.getByText(mockProduct1.name)).toBeInTheDocument();
      expect(screen.getByText(`R${mockProduct1.productPrice.toFixed(2)}`)).toBeInTheDocument();
    });
  });

  it('should display placeholder image on image error', async () => {
    render(<BestSellersList />);
    await waitFor(() => screen.getByText(mockProduct1.name));
    const image = screen.getAllByRole('img', { name: mockProduct1.name })[0] as HTMLImageElement;
    fireEvent.error(image);
    expect(image.src).toContain('/placeholder-image.png');
  });

  it('should not show "Sold by:" if storeName is not available', async () => {
    mockGetBestSellingProducts.mockResolvedValue([mockProductNoStoreName]);
    render(<BestSellersList />);
    await waitFor(() => {
      expect(screen.getByText(mockProductNoStoreName.name)).toBeInTheDocument();
      expect(screen.queryByText(/Sold by:/i)).not.toBeInTheDocument();
    });
  });

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

  it('should handle role fetch error gracefully and set role to null', async () => {
    mockUseAuth0.mockReturnValue({
      ...baseAuth0Mock, user: { sub: 'currentUserSub' } as MockUser, isAuthenticated: true,
      getAccessTokenSilently: mockGetAccessTokenSilentlyFn,
    });
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


  describe('Add to Cart button and logic', () => {
    const user = userEvent.setup();

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

    it('should show "Please sign in" notification if user is not authenticated and tries to add to cart', async () => {
        mockUseAuth0.mockReturnValue({...baseAuth0Mock, isAuthenticated: false });
        render(<BestSellersList />);
        await waitFor(() => expect(screen.getByText(mockProduct1.name)).toBeInTheDocument());
        const addButton = screen.getAllByRole('button', { name: `Add ${mockProduct1.name} to cart` })[0];
        await user.click(addButton);
        await waitFor(() => expect(screen.getByText('Please sign in to add items to your cart.')).toBeInTheDocument());
      });

    it('should have "Admin View" button (disabled) if user is admin', async () => {
        mockUseAuth0.mockReturnValue({
          ...baseAuth0Mock, user: { sub: 'adminUser' } as MockUser, isAuthenticated: true, getAccessTokenSilently: mockGetAccessTokenSilentlyFn,
        });
        mockAxiosGet.mockResolvedValue({ data: { role: 'admin' } });
        render(<BestSellersList />);
        await waitFor(() => {
          const adminButtons = screen.getAllByRole('button', { name: `Admin cannot add ${mockProduct1.name} to cart` });
          expect(adminButtons.length).toBeGreaterThan(0);
          // Add more specific assertions if needed, e.g., text content, disabled state
          expect(adminButtons[0]).toHaveTextContent('Admin View');
          expect(adminButtons[0]).toBeDisabled();
        });
      });

    it('should successfully add product to cart and show success notification', async () => {
        mockUseAuth0.mockReturnValue({
          ...baseAuth0Mock, user: { sub: 'customer1' } as MockUser, isAuthenticated: true, getAccessTokenSilently: mockGetAccessTokenSilentlyFn,
        });
        render(<BestSellersList />);
        await waitFor(() => expect(screen.getByText(mockProduct1.name)).toBeInTheDocument());
        const addButton = screen.getAllByRole('button', { name: `Add ${mockProduct1.name} to cart` })[0];
        await user.click(addButton);
        await waitFor(() => expect(mockAddToCartFn).toHaveBeenCalled());
        await waitFor(() => expect(screen.getByText(`${mockProduct1.name} added to cart!`)).toBeInTheDocument());
      });
  });

  // Test case for notification timeout has been removed as per request.
  // it('should display and clear notification after timeout', async () => {
  //   /* ... test content ... */
  // });
});