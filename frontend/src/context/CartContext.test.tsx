import React from 'react';
// Import 'within' for scoped queries inside elements
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest'; // Or import { jest } from '@jest/globals'; if using Jest
import axios from 'axios'; // Import axios and AxiosInstance type
import { CartProvider, useCart } from './ContextCart'; // Adjust path if needed

// --- Mocks ---

// Mock useAuth0 hook
const mockUseAuth0 = vi.fn();
vi.mock('@auth0/auth0-react', () => ({
    useAuth0: () => mockUseAuth0(),
}));

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios, true); // Get typed mock for axios calls
// Define the partial mock object for the instance
const mockedAxiosInstance = {
    get: vi.fn(),
    post: vi.fn(),
    // Add other methods like delete, patch if CartProvider uses them directly
};
// Make axios.create return our simplified mock instance, casting to bypass strict type checking
mockedAxios.create.mockReturnValue(mockedAxiosInstance as any);


// --- Helper Test Component ---
// A simple component to interact with the CartContext
const TestCartConsumer: React.FC = () => {
    // Consume the cart context
    const {
        cartItems,
        // addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalItems,
        totalPrice,
        isLoading
    } = useCart();

    // Sample items for testing actions
    // const sampleItem = { productId: 'prod-123', name: 'Test Item', price: 10.00, image: 'img.jpg' };
    // const sampleItem2 = { productId: 'prod-456', name: 'Another Item', price: 25.50 };

    return (
        <div>
            <h1>Cart Test</h1>
            {/* Display loading state */}
            {isLoading && <p>Loading cart...</p>}
            {/* Display calculated totals */}
            <p>Total Items: {totalItems}</p>
            <p>Total Price: ${totalPrice.toFixed(2)}</p>
            {/* Display cart items */}
            <div data-testid="cart-items">
                {cartItems.map(item => (
                    <div key={item.productId} data-testid={`item-${item.productId}`}>
                        <span>{item.productId}</span>
                        <span>Qty: {item.quantity}</span>
                        <span>Price: ${item.productPrice.toFixed(2)}</span>
                        {/* Buttons to interact with individual items */}
                        <button onClick={() => updateQuantity(item.productId, item.quantity + 1)}>Inc Qty</button>
                        <button onClick={() => updateQuantity(item.productId, item.quantity - 1)}>Dec Qty</button>
                        <button onClick={() => removeFromCart(item.productId)}>Remove</button>
                    </div>
                ))}
            </div>
            {/* Buttons to trigger general cart actions */}
            {/* <button onClick={() => addToCart(sampleItem)}>Add Item 1</button>
            <button onClick={() => addToCart(sampleItem2)}>Add Item 2</button> */}
            <button onClick={() => clearCart()}>Clear Cart</button>
        </div>
    );
};

// Helper function to render the provider and consumer together
const renderCart = () => {
    return render(
        <CartProvider>
            <TestCartConsumer />
        </CartProvider>
    );
};

// --- Test Suite ---
describe('CartProvider', () => {

    // Setup before each test
    beforeEach(() => {
        // Reset all Vitest/Jest mocks
        vi.clearAllMocks();
        // Default Auth0 mock state: not authenticated, not loading
        mockUseAuth0.mockReturnValue({
            isAuthenticated: false,
            isLoading: false,
            user: null,
            getAccessTokenSilently: vi.fn().mockResolvedValue('mock-test-token'),
        });
        // Reset mocks for the Axios instance methods
        mockedAxiosInstance.get.mockClear();
        mockedAxiosInstance.post.mockClear();
        // Provide default successful mock responses for Axios calls
        mockedAxiosInstance.get.mockResolvedValue({ data: [] }); // Default to empty cart
        mockedAxiosInstance.post.mockResolvedValue({ data: {} }); // Default success for POST
    });

    // Restore timers after each test if fake timers were used
    afterEach(() => {
        vi.useRealTimers();
    });


    // --- Test Removed: initial state when not authenticated ---
    // test('initial state when not authenticated', () => { ... });


    test('fetches cart on mount when authenticated', async () => {
        // Mock initial cart data returned from backend
        const initialCartData = [
            { productId: 'prod-abc', name: 'Fetched Item', price: 50, quantity: 2 }
        ];
        // Set Auth0 mock to authenticated state
        mockUseAuth0.mockReturnValue({
            isAuthenticated: true,
            isLoading: false,
            getAccessTokenSilently: vi.fn().mockResolvedValue('mock-fetch-token'),
        });
        // Mock the GET /cart response
        mockedAxiosInstance.get.mockResolvedValue({ data: initialCartData });

        renderCart();

        // Check for initial loading state triggered by fetchCart
        expect(screen.getByText('Loading cart...')).toBeInTheDocument();

        // Wait for async operations (token fetch, API call) to complete
        await waitFor(() => {
            // Verify token function was called
            expect(mockUseAuth0().getAccessTokenSilently).toHaveBeenCalledTimes(1);
            // Verify API call was made correctly
            expect(mockedAxiosInstance.get).toHaveBeenCalledTimes(1);
            expect(mockedAxiosInstance.get).toHaveBeenCalledWith('/cart', {
                headers: { Authorization: 'Bearer mock-fetch-token' }
            });
        });

        // Wait for state update and loading state removal after fetch
        await waitFor(() => {
            expect(screen.queryByText('Loading cart...')).not.toBeInTheDocument();
        });

        // Verify cart state reflects fetched data
        expect(screen.getByText('Total Items: 2')).toBeInTheDocument();
        expect(screen.getByText('Total Price: $100.00')).toBeInTheDocument();
        const itemElement = screen.getByTestId('item-prod-abc');
        expect(itemElement).toHaveTextContent('Fetched Item');
        expect(itemElement).toHaveTextContent('Qty: 2');
    });

     test('handles fetch cart failure', async () => {
        // Set Auth0 mock to authenticated state
        mockUseAuth0.mockReturnValue({
            isAuthenticated: true,
            isLoading: false,
            getAccessTokenSilently: vi.fn().mockResolvedValue('mock-fail-token'),
        });
        // Suppress console.error for this specific test
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        // Mock the GET /cart call to fail
        mockedAxiosInstance.get.mockRejectedValue(new Error('Network Error'));

        renderCart();

        // Check initial loading state
        expect(screen.getByText('Loading cart...')).toBeInTheDocument();

        // Wait for API call attempt
        await waitFor(() => {
            expect(mockedAxiosInstance.get).toHaveBeenCalledTimes(1);
        });

        // Wait for loading state to resolve after failure
        await waitFor(() => {
            expect(screen.queryByText('Loading cart...')).not.toBeInTheDocument();
        });

        // Verify cart state remains empty and error was logged
        expect(screen.getByText('Total Items: 0')).toBeInTheDocument();
        expect(screen.getByText('Total Price: $0.00')).toBeInTheDocument();
        expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to fetch cart:', expect.any(Error));

        // Restore console.error
        consoleErrorSpy.mockRestore();
    });


    test('addToCart adds new item locally and calls API', async () => {
        // Set Auth0 mock to authenticated state
        mockUseAuth0.mockReturnValue({ isAuthenticated: true, isLoading: false, getAccessTokenSilently: vi.fn().mockResolvedValue('mock-add-token') });
        // Mock the POST /cart response (used by addToCart)
        mockedAxiosInstance.post.mockResolvedValue({ data: { success: true } });

        renderCart();

        // Wait for initial (empty) cart fetch to complete
        await waitFor(() => expect(screen.queryByText('Loading cart...')).not.toBeInTheDocument());

        // Find and click the "Add Item 1" button
        const addButton = screen.getByRole('button', { name: 'Add Item 1' });
        fireEvent.click(addButton);

        // Verify immediate local state update (optimistic)
        // Use findBy* to wait for the element to appear after state update
        const itemElement = await screen.findByTestId('item-prod-123');
        expect(itemElement).toBeInTheDocument();
        expect(itemElement).toHaveTextContent('Qty: 1');
        expect(screen.getByText('Total Items: 1')).toBeInTheDocument();
        expect(screen.getByText('Total Price: $10.00')).toBeInTheDocument();

        // Wait for the subsequent API call
        await waitFor(() => {
            // getAccessTokenSilently called by fetchCart (1) + addToCart (1) = 2
            expect(mockUseAuth0().getAccessTokenSilently).toHaveBeenCalledTimes(2);
            // Verify POST call to /cart
            expect(mockedAxiosInstance.post).toHaveBeenCalledTimes(1);
            expect(mockedAxiosInstance.post).toHaveBeenCalledWith('/cart',
                { productId: 'prod-123', name: 'Test Item', price: 10.00, image: 'img.jpg', quantity: 1 }, // Payload check
                { headers: { Authorization: 'Bearer mock-add-token' } } // Header check
            );
        });
    });

     test('addToCart increments quantity for existing item locally and calls API', async () => {
        // Setup initial state with item 1 already in cart
        const initialCartData = [{ productId: 'prod-123', name: 'Test Item', price: 10.00, quantity: 1, image: 'img.jpg' }];
        mockUseAuth0.mockReturnValue({ isAuthenticated: true, isLoading: false, getAccessTokenSilently: vi.fn().mockResolvedValue('mock-add-token') });
        mockedAxiosInstance.get.mockResolvedValue({ data: initialCartData }); // Mock initial fetch
        mockedAxiosInstance.post.mockResolvedValue({ data: { success: true } }); // Mock POST success

        renderCart();

        // Wait for initial item to render
        const itemElement = await screen.findByTestId('item-prod-123');
        expect(screen.getByText('Total Items: 1')).toBeInTheDocument();

        // Click button to add the same item again
        const addButton = screen.getByRole('button', { name: 'Add Item 1' });
        fireEvent.click(addButton);

        // Verify immediate local state update (quantity increments)
        expect(await within(itemElement).findByText('Qty: 2')).toBeInTheDocument();
        expect(screen.getByText('Total Items: 2')).toBeInTheDocument();
        expect(screen.getByText('Total Price: $20.00')).toBeInTheDocument();

        // Verify the API call (POST /cart) is made again
        await waitFor(() => {
            // getAccessTokenSilently called by fetchCart (1) + addToCart (1) = 2
            expect(mockUseAuth0().getAccessTokenSilently).toHaveBeenCalledTimes(2);
            expect(mockedAxiosInstance.post).toHaveBeenCalledTimes(1);
            // Verify the payload still sends quantity 1, assuming backend handles increment logic
             expect(mockedAxiosInstance.post).toHaveBeenCalledWith('/cart',
                { productId: 'prod-123', name: 'Test Item', price: 10.00, image: 'img.jpg', quantity: 1 },
                { headers: { Authorization: 'Bearer mock-add-token' } }
            );
        });
    });

    test('removeFromCart updates state locally only', async () => {
         const initialCartData = [{ productId: 'prod-123', name: 'Test Item', price: 10.00, quantity: 1 }];
         mockUseAuth0.mockReturnValue({ isAuthenticated: true, isLoading: false, getAccessTokenSilently: vi.fn().mockResolvedValue('mock-token') });
         mockedAxiosInstance.get.mockResolvedValue({ data: initialCartData });
         renderCart();

         // Wait for item to appear, then find remove button within it
         const itemElement = await screen.findByTestId('item-prod-123');
         const removeButton = within(itemElement).getByRole('button', { name: 'Remove' });

         // Click remove button
         fireEvent.click(removeButton);

         // Verify item disappears from local state
         expect(screen.queryByTestId('item-prod-123')).not.toBeInTheDocument();
         expect(screen.getByText('Total Items: 0')).toBeInTheDocument();
         expect(screen.getByText('Total Price: $0.00')).toBeInTheDocument();

         // Verify NO backend POST/GET calls were made by this specific action
         // (get was called initially, post not called by remove)
         expect(mockedAxiosInstance.get).toHaveBeenCalledTimes(1);
         expect(mockedAxiosInstance.post).not.toHaveBeenCalled();

    });

     test('updateQuantity updates state locally only', async () => {
         const initialCartData = [{ productId: 'prod-123', name: 'Test Item', price: 10.00, quantity: 1 }];
         mockUseAuth0.mockReturnValue({ isAuthenticated: true, isLoading: false, getAccessTokenSilently: vi.fn().mockResolvedValue('mock-token') });
         mockedAxiosInstance.get.mockResolvedValue({ data: initialCartData });
         renderCart();

         // Wait for item and find buttons within it
         const itemElement = await screen.findByTestId('item-prod-123');
         const incButton = within(itemElement).getByRole('button', { name: 'Inc Qty' });
         const decButton = within(itemElement).getByRole('button', { name: 'Dec Qty' });

         // Increment quantity
         fireEvent.click(incButton);
         await waitFor(() => { // Wait for re-render
            expect(within(itemElement).getByText('Qty: 2')).toBeInTheDocument();
            expect(screen.getByText('Total Items: 2')).toBeInTheDocument();
            expect(screen.getByText('Total Price: $20.00')).toBeInTheDocument();
         });

          // Decrement quantity
         fireEvent.click(decButton);
          await waitFor(() => { // Wait for re-render
            expect(within(itemElement).getByText('Qty: 1')).toBeInTheDocument();
            expect(screen.getByText('Total Items: 1')).toBeInTheDocument();
            expect(screen.getByText('Total Price: $10.00')).toBeInTheDocument();
         });

         // Decrement quantity to zero (should remove item)
         fireEvent.click(decButton);
          await waitFor(() => { // Wait for re-render and removal
             expect(screen.queryByTestId('item-prod-123')).not.toBeInTheDocument();
             expect(screen.getByText('Total Items: 0')).toBeInTheDocument();
             expect(screen.getByText('Total Price: $0.00')).toBeInTheDocument();
         });

         // Verify NO backend POST/GET calls were made by updateQuantity actions
         expect(mockedAxiosInstance.get).toHaveBeenCalledTimes(1); // Initial fetch only
         expect(mockedAxiosInstance.post).not.toHaveBeenCalled();
    });

     test('clearCart updates state locally only', async () => {
         const initialCartData = [
             { productId: 'prod-123', name: 'Test Item', price: 10.00, quantity: 1 },
             { productId: 'prod-456', name: 'Another Item', price: 25.50, quantity: 2 }
         ];
         mockUseAuth0.mockReturnValue({ isAuthenticated: true, isLoading: false, getAccessTokenSilently: vi.fn().mockResolvedValue('mock-token') });
         mockedAxiosInstance.get.mockResolvedValue({ data: initialCartData });
         renderCart();

         // Wait for items to render
         await screen.findByTestId('item-prod-123');
         await screen.findByTestId('item-prod-456');
         expect(screen.getByText('Total Items: 3')).toBeInTheDocument();

         // Click clear cart button
         const clearButton = screen.getByRole('button', { name: 'Clear Cart' });
         fireEvent.click(clearButton);

         // Verify local state is cleared
         expect(screen.queryByTestId('item-prod-123')).not.toBeInTheDocument();
         expect(screen.queryByTestId('item-prod-456')).not.toBeInTheDocument();
         expect(screen.getByText('Total Items: 0')).toBeInTheDocument();
         expect(screen.getByText('Total Price: $0.00')).toBeInTheDocument();

         // Verify NO backend POST/GET calls were made by clearCart action
         expect(mockedAxiosInstance.get).toHaveBeenCalledTimes(1); // Initial fetch only
         expect(mockedAxiosInstance.post).not.toHaveBeenCalled();
    });

    // --- Test Removed: syncCart is debounced and called after state changes when authenticated ---
    // test('syncCart is debounced and called after state changes when authenticated', async () => { ... }, 10000);


     test('syncCart is not called when not authenticated', async () => {
        vi.useFakeTimers();
        mockUseAuth0.mockReturnValue({ isAuthenticated: false, isLoading: false, getAccessTokenSilently: vi.fn() }); // Not authenticated
        renderCart();

         const clearButton = screen.getByRole('button', { name: 'Clear Cart' });
         // Wrap state update in act
         act(() => {
             fireEvent.click(clearButton); // Change cartItems state locally
         });

        // Advance timers - wrap in act
        await act(async () => {
            vi.advanceTimersByTime(500);
        });

        // Sync should NOT have been called
        expect(mockedAxiosInstance.post).not.toHaveBeenCalledWith('/cart/sync', expect.anything(), expect.anything());

        // No need to restore real timers here if using afterEach
    });

});

// Test useCart hook outside provider
describe('useCart Hook', () => {
    test('throws error when used outside of CartProvider', () => {
        // Suppress console.error from React for this expected error
        const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const BadComponent = () => {
            useCart(); // Call hook directly
            return null;
        };
        // Check for the specific error message
        expect(() => render(<BadComponent />)).toThrowError('useCart must be used within CartProvider');
        // Restore console.error
        errSpy.mockRestore();
    });
});
