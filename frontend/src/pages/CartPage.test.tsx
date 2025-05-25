import React from 'react'; 
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest'; 
import axios from 'axios'; 
import { CartProvider, useCart } from '../context/ContextCart'; 
import type { AddToCartItem } from '../context/ContextCart'; 

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
    delete: vi.fn(), 
    patch: vi.fn(), 
};
// Make axios.create return our simplified mock instance
mockedAxios.create.mockReturnValue(mockedAxiosInstance as any);


// --- Helper Test Component ---
// A simple component to interact with the CartContext
const TestCartConsumer: React.FC = () => {
    // Consume the cart context
    const {
        cartItems,
        addToCart, // Add addToCart back for testing
        removeFromCart,
        updateQuantity,
        clearCart,
        totalItems,
        totalPrice,
        isLoading,
        cartLoaded, 
        cartError 
    } = useCart();

    // Sample items for testing actions - Ensure they match AddToCartItem interface
    const sampleItem1: AddToCartItem = {
        productId: 123, 
        productName: 'Test Item 1',
        productPrice: 10.00,
        storeId: 'store-a', 
        storeName: 'Store A', 
        imageUrl: 'img1.jpg'
    };
    const sampleItem2: AddToCartItem = {
        productId: 456, 
        productName: 'Test Item 2',
        productPrice: 25.50,
        storeId: 'store-b', 
        storeName: 'Store B', 
    };

    return (
        <div>
            <h1>Cart Test</h1>
            {/* Display loading state */}
            {isLoading && <p>Loading cart...</p>}
            {/* Display error state */}
            {cartError && <p data-testid="cart-error">Error: {cartError}</p>}
            {/* Display cartLoaded status (Recommended way) */}
            <p data-testid="cart-status">Loaded: {cartLoaded ? 'Yes' : 'No'}</p>
            {/* Display calculated totals */}
            <p>Total Items: {totalItems}</p>
            <p>Total Price: ${totalPrice.toFixed(2)}</p>
            {/* Display cart items */}
            <div data-testid="cart-items">
                {cartItems.map(item => (
                    // Use numeric productId for data-testid
                    <div key={item.productId} data-testid={`item-${item.productId}`}>
                        <span>ID: {item.productId}</span> {/* Display ID */}
                        <span>Name: {item.productName}</span> {/* Display Name */}
                        <span>Store: {item.storeName} ({item.storeId})</span> {/* Display Store info */}
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
            {/* Add buttons using the correctly typed sample items */}
            <button onClick={() => addToCart(sampleItem1)}>Add Item 1</button>
            <button onClick={() => addToCart(sampleItem2)}>Add Item 2</button>
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
        mockedAxiosInstance.delete.mockClear(); 
        mockedAxiosInstance.patch.mockClear(); 
        // Provide default successful mock responses for Axios calls
        mockedAxiosInstance.get.mockResolvedValue({ data: [] }); 
        mockedAxiosInstance.post.mockResolvedValue({ data: {} }); 
        mockedAxiosInstance.delete.mockResolvedValue({ data: {} }); 
        mockedAxiosInstance.patch.mockResolvedValue({ data: {} }); 
    });

    // Restore timers after each test if fake timers were used
    afterEach(() => {
        vi.useRealTimers(); // Ensure real timers are restored
    });


    test('initial state when not authenticated', () => {
        renderCart();
        expect(screen.getByText('Total Items: 0')).toBeInTheDocument();
        expect(screen.getByText('Total Price: $0.00')).toBeInTheDocument();
        expect(screen.queryByText('Loading cart...')).not.toBeInTheDocument(); // Should not be loading if not authenticated
        expect(mockedAxiosInstance.get).not.toHaveBeenCalled(); // No fetch attempt
        expect(screen.getByTestId('cart-status')).toHaveTextContent('Loaded: Yes'); // Should be loaded (but empty) if not authenticated and auth not loading
    });


    test('fetches cart on mount when authenticated', async () => {
        // Mock initial cart data returned from backend - MUST match backend structure closely
        // which CartProvider maps to CartItemUI
        const initialBackendData = [
            {
                cartID: 1,
                productId: 123, 
                productName: 'Fetched Item 1',
                productPrice: 50,
                quantity: 2,
                storeId: 'store-a', 
                storeName: 'Store A', 
                imageUrl: 'img1.jpg',
                availableQuantity: 10
            }
        ];
        // Set Auth0 mock to authenticated state
        mockUseAuth0.mockReturnValue({
            isAuthenticated: true,
            isLoading: false, 
            user: { sub: 'auth0|user123' }, 
            getAccessTokenSilently: vi.fn().mockResolvedValue('mock-fetch-token'),
        });
        // Mock the GET /cart response with backend structure
        mockedAxiosInstance.get.mockResolvedValue({ data: initialBackendData });

        renderCart();

        // Check for initial loading state triggered by fetchCart
        expect(screen.getByText('Loading cart...')).toBeInTheDocument();
        expect(screen.getByTestId('cart-status')).toHaveTextContent('Loaded: No'); 

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
            expect(screen.getByTestId('cart-status')).toHaveTextContent('Loaded: Yes'); 
        });

        // Verify cart state reflects fetched data using numeric ID
        expect(screen.getByText('Total Items: 2')).toBeInTheDocument();
        expect(screen.getByText('Total Price: $100.00')).toBeInTheDocument();
        const itemElement = screen.getByTestId('item-123'); 
        expect(itemElement).toHaveTextContent('Name: Fetched Item 1'); 
        expect(itemElement).toHaveTextContent('Store: Store A (store-a)');
        expect(itemElement).toHaveTextContent('Qty: 2');
    });

    test('handles fetch cart failure', async () => {
        // Set Auth0 mock to authenticated state
        mockUseAuth0.mockReturnValue({
            isAuthenticated: true,
            isLoading: false,
            user: { sub: 'auth0|user123' },
            getAccessTokenSilently: vi.fn().mockResolvedValue('mock-fail-token'),
        });
        // Suppress console.error for this specific test
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const errorResponse = { response: { data: { message: 'Backend fetch error' } } };
        mockedAxiosInstance.get.mockRejectedValue(errorResponse);

        renderCart();

        expect(screen.getByText('Loading cart...')).toBeInTheDocument();
        expect(screen.getByTestId('cart-status')).toHaveTextContent('Loaded: No');

        await waitFor(() => {
            expect(mockedAxiosInstance.get).toHaveBeenCalledTimes(1);
        });

        // Wait for loading state to resolve and error message to appear
        await waitFor(() => {
            expect(screen.queryByText('Loading cart...')).not.toBeInTheDocument();
            expect(screen.getByTestId('cart-error')).toHaveTextContent('Error: Backend fetch error');
            expect(screen.getByTestId('cart-status')).toHaveTextContent('Loaded: Yes'); // Should be marked loaded even on error
        });

        // Verify cart state remains empty
        expect(screen.getByText('Total Items: 0')).toBeInTheDocument();
        expect(screen.getByText('Total Price: $0.00')).toBeInTheDocument();
        expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to fetch cart:', errorResponse);

        // Restore console.error
        consoleErrorSpy.mockRestore();
    });


    test('addToCart adds new item locally', async () => {
        // Set Auth0 mock to authenticated state (needed for addToCart check)
        mockUseAuth0.mockReturnValue({
            isAuthenticated: true,
            isLoading: false,
            user: { sub: 'auth0|user123' },
            getAccessTokenSilently: vi.fn().mockResolvedValue('mock-add-token')
        });
        // Mock the POST /cart response (used by syncCart later, not directly by addToCart)
        mockedAxiosInstance.post.mockResolvedValue({ data: { success: true } });

        renderCart();

        // Wait for initial (empty) cart fetch to complete (if applicable)
        await waitFor(() => expect(screen.queryByText('Loading cart...')).not.toBeInTheDocument());
        await waitFor(() => expect(screen.getByTestId('cart-status')).toHaveTextContent('Loaded: Yes'));


        // Find and click the "Add Item 1" button
        const addButton = screen.getByRole('button', { name: 'Add Item 1' });
        // Wrap state update in act
        act(() => {
            fireEvent.click(addButton);
        });


        // Verify immediate local state update (optimistic)
        const itemElement = await screen.findByTestId('item-123'); // Use numeric ID
        expect(itemElement).toBeInTheDocument();
        expect(itemElement).toHaveTextContent('Name: Test Item 1');
        expect(itemElement).toHaveTextContent('Store: Store A (store-a)');
        expect(itemElement).toHaveTextContent('Qty: 1');
        expect(screen.getByText('Total Items: 1')).toBeInTheDocument();
        expect(screen.getByText('Total Price: $10.00')).toBeInTheDocument()
        expect(mockedAxiosInstance.post).not.toHaveBeenCalled();
    });

    test('addToCart increments quantity for existing item locally', async () => {
        // Setup initial state with item 1 already in cart (matching backend structure)
        const initialBackendData = [{
            cartID: 1, productId: 123, productName: 'Test Item 1', productPrice: 10.00, quantity: 1,
            storeId: 'store-a', storeName: 'Store A', imageUrl: 'img1.jpg', availableQuantity: 5
        }];
        mockUseAuth0.mockReturnValue({
            isAuthenticated: true, isLoading: false, user: { sub: 'auth0|user123' },
            getAccessTokenSilently: vi.fn().mockResolvedValue('mock-add-token')
        });
        mockedAxiosInstance.get.mockResolvedValue({ data: initialBackendData }); // Mock initial fetch

        renderCart();

        // Wait for initial item to render and cart to be loaded
        const itemElement = await screen.findByTestId('item-123'); // Use numeric ID
        await waitFor(() => expect(screen.getByTestId('cart-status')).toHaveTextContent('Loaded: Yes'));
        expect(screen.getByText('Total Items: 1')).toBeInTheDocument();


        // Click button to add the same item again
        const addButton = screen.getByRole('button', { name: 'Add Item 1' });
        // Wrap state update in act
        act(() => {
            fireEvent.click(addButton);
        });

        // Verify immediate local state update (quantity increments)
        expect(await within(itemElement).findByText('Qty: 2')).toBeInTheDocument();
        expect(screen.getByText('Total Items: 2')).toBeInTheDocument();
        expect(screen.getByText('Total Price: $20.00')).toBeInTheDocument();

        // Again, addToCart only updates locally. syncCart handles backend.
        expect(mockedAxiosInstance.post).not.toHaveBeenCalled();
    });

    test('removeFromCart updates state locally only', async () => {
        const initialBackendData = [{
            cartID: 1, productId: 123, productName: 'Test Item 1', productPrice: 10.00, quantity: 1,
            storeId: 'store-a', storeName: 'Store A', imageUrl: 'img1.jpg', availableQuantity: 5
        }];
        mockUseAuth0.mockReturnValue({
            isAuthenticated: true, isLoading: false, user: { sub: 'auth0|user123' },
            getAccessTokenSilently: vi.fn().mockResolvedValue('mock-token')
        });
        mockedAxiosInstance.get.mockResolvedValue({ data: initialBackendData });
        renderCart();

        // Wait for item to appear and cart to be loaded
        const itemElement = await screen.findByTestId('item-123'); // Use numeric ID
        await waitFor(() => expect(screen.getByTestId('cart-status')).toHaveTextContent('Loaded: Yes'));

        const removeButton = within(itemElement).getByRole('button', { name: 'Remove' });

        // Click remove button - wrap in act
        act(() => {
            fireEvent.click(removeButton);
        });


        // Verify item disappears from local state
        // Use waitFor to ensure the removal happens before assertion
        await waitFor(() => {
            expect(screen.queryByTestId('item-123')).not.toBeInTheDocument();
        });
        expect(screen.getByText('Total Items: 0')).toBeInTheDocument();
        expect(screen.getByText('Total Price: $0.00')).toBeInTheDocument();

        // Verify NO backend calls were made by this specific action
        expect(mockedAxiosInstance.get).toHaveBeenCalledTimes(1);
        expect(mockedAxiosInstance.post).not.toHaveBeenCalled();
        expect(mockedAxiosInstance.delete).not.toHaveBeenCalled(); 
    });

    test('updateQuantity updates state locally only', async () => {
        const initialBackendData = [{
            cartID: 1, productId: 123, productName: 'Test Item 1', productPrice: 10.00, quantity: 1,
            storeId: 'store-a', storeName: 'Store A', imageUrl: 'img1.jpg', availableQuantity: 5
        }];
        mockUseAuth0.mockReturnValue({
            isAuthenticated: true, isLoading: false, user: { sub: 'auth0|user123' },
            getAccessTokenSilently: vi.fn().mockResolvedValue('mock-token')
        });
        mockedAxiosInstance.get.mockResolvedValue({ data: initialBackendData });
        renderCart();

        // Wait for item and find buttons within it, and cart loaded
        const itemElement = await screen.findByTestId('item-123'); 
        await waitFor(() => expect(screen.getByTestId('cart-status')).toHaveTextContent('Loaded: Yes'));
        const incButton = within(itemElement).getByRole('button', { name: 'Inc Qty' });
        const decButton = within(itemElement).getByRole('button', { name: 'Dec Qty' });

        // Increment quantity - wrap in act
        act(() => {
           fireEvent.click(incButton);
        });
        await waitFor(() => { 
            expect(within(itemElement).getByText('Qty: 2')).toBeInTheDocument();
            expect(screen.getByText('Total Items: 2')).toBeInTheDocument();
            expect(screen.getByText('Total Price: $20.00')).toBeInTheDocument();
        });

        // Decrement quantity - wrap in act
        act(() => {
            fireEvent.click(decButton);
        });
        await waitFor(() => { 
            expect(within(itemElement).getByText('Qty: 1')).toBeInTheDocument();
            expect(screen.getByText('Total Items: 1')).toBeInTheDocument();
            expect(screen.getByText('Total Price: $10.00')).toBeInTheDocument();
        });

        // Decrement quantity to zero (should remove item via removeFromCart) - wrap in act
        act(() => {
            fireEvent.click(decButton);
        });
        await waitFor(() => { 
            expect(screen.queryByTestId('item-123')).not.toBeInTheDocument();
            expect(screen.getByText('Total Items: 0')).toBeInTheDocument();
            expect(screen.getByText('Total Price: $0.00')).toBeInTheDocument();
        });

        // Verify NO backend calls were made by updateQuantity actions
        expect(mockedAxiosInstance.get).toHaveBeenCalledTimes(1); // Initial fetch only
        expect(mockedAxiosInstance.post).not.toHaveBeenCalled();
        expect(mockedAxiosInstance.patch).not.toHaveBeenCalled(); // Check patch specifically if sync used it
    });

    test('clearCart updates state locally only', async () => {
        const initialBackendData = [
            {
                cartID: 1, productId: 123, productName: 'Test Item 1', productPrice: 10.00, quantity: 1,
                storeId: 'store-a', storeName: 'Store A', imageUrl: 'img1.jpg', availableQuantity: 5
            },
            {
                cartID: 2, productId: 456, productName: 'Test Item 2', productPrice: 25.50, quantity: 2,
                storeId: 'store-b', storeName: 'Store B', imageUrl: 'img2.jpg', availableQuantity: 8
            }
        ];
        mockUseAuth0.mockReturnValue({
            isAuthenticated: true, isLoading: false, user: { sub: 'auth0|user123' },
            getAccessTokenSilently: vi.fn().mockResolvedValue('mock-token')
        });
        mockedAxiosInstance.get.mockResolvedValue({ data: initialBackendData });
        renderCart();

        // Wait for items to render using numeric IDs and cart loaded
        await screen.findByTestId('item-123');
        await screen.findByTestId('item-456');
        await waitFor(() => expect(screen.getByTestId('cart-status')).toHaveTextContent('Loaded: Yes'));
        expect(screen.getByText('Total Items: 3')).toBeInTheDocument();


        // Click clear cart button - wrap in act
        const clearButton = screen.getByRole('button', { name: 'Clear Cart' });
        act(() => {
            fireEvent.click(clearButton);
        });


        // Verify local state is cleared
        await waitFor(() => {
            expect(screen.queryByTestId('item-123')).not.toBeInTheDocument();
            expect(screen.queryByTestId('item-456')).not.toBeInTheDocument();
        });
        expect(screen.getByText('Total Items: 0')).toBeInTheDocument();
        expect(screen.getByText('Total Price: $0.00')).toBeInTheDocument();

        // Verify NO backend calls were made by clearCart action itself
        expect(mockedAxiosInstance.get).toHaveBeenCalledTimes(1); 
        expect(mockedAxiosInstance.post).not.toHaveBeenCalled();
        expect(mockedAxiosInstance.delete).not.toHaveBeenCalled();
    });



    test('syncCart is not called when not authenticated', async () => {
        vi.useFakeTimers();
        mockUseAuth0.mockReturnValue({ isAuthenticated: false, isLoading: false, user: null, getAccessTokenSilently: vi.fn() }); // Not authenticated
        renderCart();

        // Use clearCart which works locally regardless of auth state in this implementation
        const clearButton = screen.getByRole('button', { name: 'Clear Cart' });
        // Wrap state update in act
        act(() => {
            fireEvent.click(clearButton); // Change cartItems state locally
        });

        // Advance timers - wrap in act AND run pending timers/promises
        await act(async () => { 
            vi.advanceTimersByTime(1100); 
            await vi.runAllTimersAsync(); 
        });

        // Sync should NOT have been called
        expect(mockedAxiosInstance.post).not.toHaveBeenCalledWith('/cart/sync', expect.anything(), expect.anything());

    }); 

});

// Test useCart hook outside provider
describe('useCart Hook', () => {
    test('throws error when used outside of CartProvider', () => {
        // Suppress console.error from React for this expected error
        const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const BadComponent = () => {
            useCart(); 
            return null;
        };
        expect(() => render(<BadComponent />)).toThrowError('useCart must be used within CartProvider');
        errSpy.mockRestore();
    });
});