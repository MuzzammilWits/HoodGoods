import { render, screen} from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, beforeEach, afterEach, test, expect } from 'vitest';
import axios from 'axios';
import CheckoutPage from './CheckoutPage';

// Extend the Window interface to include YocoSDK for mocking purposes.
declare global {
  interface Window {
    YocoSDK: any;
  }
}

// --- Interfaces ---
// Define the structure for a cart item as it's displayed or used in the component.
type CartItemDisplay = {
  id: string; productId: number; name: string; productName: string; price: number; productPrice: number; quantity: number; storeName: string; storeId: string;
};


// --- Mocks ---
// Mock Auth0's `getAccessTokenSilently` and `useAuth0` hooks.
const mockGetAccessTokenSilently = vi.fn();
const mockUseAuth0 = vi.fn();
vi.mock('@auth0/auth0-react', () => ({ useAuth0: () => mockUseAuth0() }));

// Mock the `useCart` hook from the cart context.
const mockUseCart = vi.fn();
vi.mock('../context/ContextCart', () => ({ useCart: () => mockUseCart() }));

// Mock `react-router-dom`'s `useNavigate` and `Link` components.
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const originalModule = await vi.importActual('react-router-dom');
  return { ...originalModule, useNavigate: () => mockNavigate, Link: (props: any) => <a href={props.to} {...props}>{props.children}</a> };
});

// Mock `axios` for controlling API requests.
const mockApiPost = vi.fn();
const mockApiGet = vi.fn();

vi.mock('axios', async (importOriginal) => {
    const actualAxios = await importOriginal<typeof axios>();
    return {
        AxiosError: actualAxios.AxiosError,
        isAxiosError: actualAxios.isAxiosError,
        default: {
            create: vi.fn(() => ({ // Mock `axios.create` to return our mock instance.
                post: (...args: any[]) => mockApiPost(...args),
                get: (...args: any[]) => mockApiGet(...args),
            })),
            isAxiosError: actualAxios.isAxiosError,
        },
    };
});

// Mock Yoco SDK's `showPopup` and `closePopup` methods.
const mockYocoShowPopup = vi.fn();
const mockYocoClosePopup = vi.fn();


// --- Helper Functions & Data ---
// Sets a default mock for Auth0's `useAuth0` hook.
const setDefaultAuth0Mock = (overrides = {}) => {
  mockGetAccessTokenSilently.mockReset().mockResolvedValue('default-mock-access-token');
  mockUseAuth0.mockReturnValue({
    isAuthenticated: false, isLoading: false, user: null,
    getAccessTokenSilently: mockGetAccessTokenSilently,
    ...overrides,
  });
};

// Default cart items for testing scenarios.
const defaultCartItems: CartItemDisplay[] = [
  { id: '1', productId: 1, name: 'Product A', productName: 'Product A', price: 100, productPrice: 100, quantity: 1, storeName: 'Store One', storeId: 'store1' },
  { id: '2', productId: 2, name: 'Product B', productName: 'Product B', price: 50, productPrice: 50, quantity: 2, storeName: 'Store One', storeId: 'store1' },
];

// Sets a default mock for the `useCart` hook.
const setDefaultCartMock = (overrides = {}) => {
  mockUseCart.mockReturnValue({
    cartItems: [], clearCart: vi.fn().mockResolvedValue(undefined), cartError: null,
    ...overrides,
  });
};
// Renders the `CheckoutPage` wrapped in `MemoryRouter` for routing context.
const renderCheckoutPage = () => render(<MemoryRouter><CheckoutPage /></MemoryRouter>);

// --- Test Suite for CheckoutPage Component ---
describe('CheckoutPage Component', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  // Setup before each test run.
  beforeEach(() => {
    vi.clearAllMocks(); // Clears all mock call history.

    // Set default authentication and cart states.
    setDefaultAuth0Mock({ isAuthenticated: true, user: { sub: 'user123', name: 'Test User', email: 'test@example.com' } });
    setDefaultCartMock({ cartItems: defaultCartItems }); // Start with items in the cart by default.

    // Reset mocks for API calls.
    mockApiPost.mockReset();
    mockApiGet.mockReset();

    // Mock the global YocoSDK object and its methods.
    window.YocoSDK = vi.fn().mockImplementation(() => ({ showPopup: mockYocoShowPopup, closePopup: mockYocoClosePopup }));

    // Spy on `console.error` to suppress output and check for errors.
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.useFakeTimers(); // Use fake timers for controlling `setTimeout` calls.
  });

  // Cleanup after each test.
  afterEach(() => {
    vi.runOnlyPendingTimers(); // Ensure all pending timers are run.
    vi.useRealTimers(); // Restore real timers.
    consoleErrorSpy.mockRestore(); // Restore original `console.error`.
  });

  // Test case: Renders the loading state when Auth0 is initializing.
  test('renders loading state when Auth0 is loading', () => {
    setDefaultAuth0Mock({ isLoading: true, isAuthenticated: false }); // Simulate Auth0 loading.
    renderCheckoutPage();
    expect(screen.getByText('Loading authentication...')).toBeInTheDocument();
  });

  // Test case: Renders the login prompt when the user is not authenticated.
  test('renders login prompt when not authenticated', () => {
    setDefaultAuth0Mock({ isAuthenticated: false }); // Simulate unauthenticated state.
    renderCheckoutPage();
    expect(screen.getByText(/Please log in to proceed with checkout./i)).toBeInTheDocument();
  });

  // Test case: Renders an empty cart message when authenticated but the cart is empty.
  test('renders empty cart message when authenticated but cart is empty', () => {
    setDefaultAuth0Mock({ isAuthenticated: true, user: { sub: 'user123' } });
    setDefaultCartMock({ cartItems: [] }); // Explicitly set the cart to empty.
    renderCheckoutPage();
    expect(screen.getByText('Your cart is empty.')).toBeInTheDocument();
  });

  // Test case: Displays a general loading message when cart has items and delivery options are being fetched.
  test('displays "Loading checkout details..." initially when cart has items and delivery options are fetching', () => {
    // Auth and cart are set to have items by default in `beforeEach`.
    setDefaultAuth0Mock({ isAuthenticated: true, user: { sub: 'user123' } });
    // Make the delivery options API call pend indefinitely to simulate loading.
    mockApiPost.mockImplementationOnce(() => new Promise(() => {}));
    renderCheckoutPage();
    expect(screen.getByText('Loading checkout details...')).toBeInTheDocument();
  });
});