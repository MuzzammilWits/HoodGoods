
// frontend/src/context/ContextCart.test.tsx

import { render, screen, waitFor, act } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useAuth0, Auth0ContextInterface, User } from '@auth0/auth0-react';
import { CartProvider, useCart, AddToCartItem, CartItemUI } from './ContextCart';

// --- Mocking External Dependencies ---

// Use vi.hoisted() to initialize the mock before imports
const { mockApi } = vi.hoisted(() => {
  return {
    mockApi: {
      get: vi.fn(),
      post: vi.fn(),
      delete: vi.fn(),
      patch: vi.fn(),
    },
  };
});

// Mock axios.create() to ALWAYS return our single mockApi instance
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => mockApi),
  },
}));

// Mock the Auth0 hook
vi.mock('@auth0/auth0-react');
const mockUseAuth0 = vi.mocked(useAuth0);

// --- Test Harness Component ---
const TestConsumer = () => {
    const {
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalItems,
        totalPrice,
        isLoading,
        cartLoaded,
        cartError,
    } = useCart();

    const handleAddItem = () => {
        const newItem: AddToCartItem = {
            productId: 3,
            productName: 'New Gadget',
            productPrice: 99.99,
            storeId: 'store-b',
            storeName: 'Gadget Store',
        };
        addToCart(newItem).catch(() => { /* aint care */ });
    };
    
    const handleUnauthenticatedAddItem = async () => {
        try {
            await addToCart({
                productId: 1,
                productName: 'Test Product',
                productPrice: 10.99,
                storeId: 'store1',
                storeName: 'Test Store'
            });
        } catch (error) {
            // Expected error, we'll check via cartError state
        }
    };

    return (
        <div>
            <h1>Cart Test</h1>
            {isLoading && <div data-testid="is-loading">Loading...</div>}
            {cartError && <div role="alert" data-testid="cart-error">{cartError}</div>}
            {cartLoaded && <div>Cart Loaded</div>}
            <div data-testid="total-items">Total Items: {totalItems}</div>
            <div data-testid="total-price">Total Price: ${totalPrice.toFixed(2)}</div>

            {/* Buttons for various actions */}
            <button onClick={handleAddItem}>Add Item</button>
            <button onClick={() => updateQuantity(1, 5)}>Update Quantity</button>
            <button onClick={() => removeFromCart(2)}>Remove Item 2</button>
            <button onClick={() => updateQuantity(1, 0)}>Remove Item 1 via Quantity</button>
            <button onClick={clearCart}>Clear Cart</button>
            <button data-testid="unauth-add" onClick={handleUnauthenticatedAddItem}>Unauthenticated Add</button>
            <button data-testid="unauth-remove" onClick={() => removeFromCart(1)}>Unauthenticated Remove</button>


            <ul>
                {cartItems.map((item: CartItemUI) => (
                    <li key={item.productId}>
                        {item.productName} - Qty: {item.quantity} - Price: ${item.productPrice}
                    </li>
                ))}
            </ul>
        </div>
    );
};

// --- Test Suite ---
describe('CartProvider', () => {
    const user = userEvent.setup();

    const mockCartData: CartItemUI[] = [
        { cartID: 101, productId: 1, productName: 'Laptop', productPrice: 1200, quantity: 1, storeId: 'store-a', storeName: 'Tech Central', imageUrl: 'url1', availableQuantity: 10 },
        { cartID: 102, productId: 2, productName: 'Mouse', productPrice: 25, quantity: 2, storeId: 'store-a', storeName: 'Tech Central', imageUrl: 'url2', availableQuantity: 5 },
    ];
    
    const unauthenticatedMock: Auth0ContextInterface<User> = {
        isAuthenticated: false,
        user: undefined,
        isLoading: false,
        getAccessTokenSilently: vi.fn().mockRejectedValue(new Error('Not authenticated')),
        getAccessTokenWithPopup: vi.fn(),
        getIdTokenClaims: vi.fn(),
        loginWithRedirect: vi.fn(),
        loginWithPopup: vi.fn(),
        logout: vi.fn(),
        handleRedirectCallback: vi.fn(),
    };

    const authenticatedMock: Auth0ContextInterface<User> = {
        ...unauthenticatedMock,
        isAuthenticated: true,
        isLoading: false,
        user: { sub: 'auth0|user123' },
        getAccessTokenSilently: vi.fn().mockResolvedValue('fake-token'),
    };

    beforeEach(() => {
        mockUseAuth0.mockReturnValue(authenticatedMock);
        mockApi.get.mockResolvedValue({ data: mockCartData });
    });

    afterEach(() => {
        vi.clearAllMocks();
    });
    
    it('should throw error when useCart is used outside of CartProvider', () => {
        // Suppress console.error for this specific test
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        expect(() => render(<TestConsumer />)).toThrow('useCart must be used within a CartProvider');
        consoleSpy.mockRestore();
    });

    it('should show loading state when Auth0 is loading', () => {
        mockUseAuth0.mockReturnValue({ ...unauthenticatedMock, isLoading: true });
        render(<CartProvider><TestConsumer /></CartProvider>);
        expect(screen.getByTestId('is-loading')).toHaveTextContent('Loading...');
    });
    
    it('should fetch cart on initial render when user is authenticated', async () => {
        render(<CartProvider><TestConsumer /></CartProvider>);
        expect(screen.getByTestId('is-loading')).toBeInTheDocument();

        await waitFor(() => {
            expect(mockApi.get).toHaveBeenCalledWith('/cart', expect.any(Object));
        });
        
        expect(screen.getByTestId('total-items')).toHaveTextContent('Total Items: 3');
        expect(screen.getByText('Laptop - Qty: 1 - Price: $1200')).toBeInTheDocument();
    });
    
    it('should not fetch cart when user is not authenticated', async () => {
        mockUseAuth0.mockReturnValue(unauthenticatedMock);
        render(<CartProvider><TestConsumer /></CartProvider>);
        
        await waitFor(() => {
            expect(screen.queryByTestId('is-loading')).not.toBeInTheDocument();
        });
        
        expect(mockApi.get).not.toHaveBeenCalled();
    });
    
    it('should display an error if fetching the cart fails', async () => {
        const error = { response: { data: { message: 'Failed to fetch items.' } }, message: 'Network Error' };
        mockApi.get.mockRejectedValue(error);
        render(<CartProvider><TestConsumer /></CartProvider>);

        await waitFor(() => {
            expect(screen.getByRole('alert')).toHaveTextContent('Failed to fetch items.');
        });
        
        expect(screen.getByTestId('total-items')).toHaveTextContent('Total Items: 0');
    });

    it('should add an item to the cart and refetch', async () => {
        mockApi.post.mockResolvedValue({ data: { success: true } });
        mockApi.get
            .mockResolvedValueOnce({ data: mockCartData })
            .mockResolvedValueOnce({ data: [...mockCartData, { cartID: 103, productId: 3, productName: 'New Gadget', productPrice: 99.99, quantity: 1 }] });

        render(<CartProvider><TestConsumer /></CartProvider>);
        await waitFor(() => expect(screen.getByTestId('total-items')).toHaveTextContent('Total Items: 3'));
        
        await user.click(screen.getByRole('button', { name: /Add Item/i }));
        
        await waitFor(() => {
            expect(mockApi.post).toHaveBeenCalledWith('/cart', { productId: 3, quantity: 1 }, expect.any(Object));
        });
        
        expect(mockApi.get).toHaveBeenCalledTimes(2);
        await waitFor(() => {
            expect(screen.getByTestId('total-items')).toHaveTextContent('Total Items: 4');
        });
    });
    
    it('should handle add to cart error when not authenticated', async () => {
        mockUseAuth0.mockReturnValue(unauthenticatedMock);
        render(<CartProvider><TestConsumer /></CartProvider>);
        
        await act(async () => {
            await user.click(screen.getByTestId('unauth-add'));
        });
        
        await waitFor(() => {
            expect(screen.getByTestId('cart-error')).toHaveTextContent('Please log in to add items to your cart.');
        });
        expect(mockApi.post).not.toHaveBeenCalled();
    });

    it('should update an item quantity with optimistic update', async () => {
        mockApi.patch.mockResolvedValue({ data: { success: true } });
        render(<CartProvider><TestConsumer /></CartProvider>);
        
        await waitFor(() => expect(screen.getByText(/Laptop - Qty: 1/)).toBeInTheDocument());
        await user.click(screen.getByRole('button', { name: /Update Quantity/i }));
        
        expect(screen.getByText(/Laptop - Qty: 5/)).toBeInTheDocument();
        await waitFor(() => {
            expect(mockApi.patch).toHaveBeenCalledWith('/cart/1', { quantity: 5 }, expect.any(Object));
        });
    });
    
    it('should remove an item from the cart with optimistic update', async () => {
        mockApi.delete.mockResolvedValue({ data: { success: true } });
        render(<CartProvider><TestConsumer /></CartProvider>);
        
        await waitFor(() => expect(screen.getByText(/Mouse - Qty: 2/)).toBeInTheDocument());
        await user.click(screen.getByRole('button', { name: /Remove Item 2/i }));

        expect(screen.queryByText(/Mouse - Qty: 2/)).not.toBeInTheDocument();
        await waitFor(() => {
            expect(mockApi.delete).toHaveBeenCalledWith('/cart/2', expect.any(Object));
        });
    });

    it('should not remove an item when user is not authenticated', async () => {
        mockUseAuth0.mockReturnValue(unauthenticatedMock);
        render(<CartProvider><TestConsumer /></CartProvider>);
        
        await user.click(screen.getByTestId('unauth-remove'));

        expect(mockApi.delete).not.toHaveBeenCalled();
    });
    
    it('should remove item if quantity is updated to 0', async () => {
        mockApi.delete.mockResolvedValue({ data: { success: true } });
        render(<CartProvider><TestConsumer /></CartProvider>);
        
        await waitFor(() => expect(screen.getByText(/Laptop - Qty: 1/)).toBeInTheDocument());
        await user.click(screen.getByRole('button', { name: /Remove Item 1 via Quantity/i }));
        
        expect(screen.queryByText(/Laptop - Qty: 1/)).not.toBeInTheDocument();
        await waitFor(() => {
            expect(mockApi.delete).toHaveBeenCalledWith('/cart/1', expect.any(Object));
        });
    });

    it('should clear the cart', async () => {
        mockApi.delete.mockResolvedValue({ data: { success: true } });
        render(<CartProvider><TestConsumer /></CartProvider>);

        await waitFor(() => expect(screen.getByTestId('total-items')).toHaveTextContent('Total Items: 3'));
        await user.click(screen.getByRole('button', { name: /Clear Cart/i }));
        
        expect(screen.getByTestId('total-items')).toHaveTextContent('Total Items: 0');
        await waitFor(() => {
            expect(mockApi.delete).toHaveBeenCalledWith('/cart', expect.any(Object));
        });
    });
    
    it('should handle undefined/null values in calculations gracefully', async () => {
        const cartWithNulls: CartItemUI[] = [
            { cartID: 1, productId: 1, productName: 'Null Item', productPrice: undefined as any, quantity: null as any, storeId: 'store1', storeName: 'Test Store 1', imageUrl: 'url', availableQuantity: 10 },
            { cartID: 2, productId: 2, productName: 'Good Item', productPrice: 10, quantity: 2, storeId: 'store1', storeName: 'Test Store 1', imageUrl: 'url', availableQuantity: 10 }
        ];
        
        mockApi.get.mockResolvedValue({ data: cartWithNulls });
        
        render(<CartProvider><TestConsumer /></CartProvider>);
        
        await waitFor(() => {
            // The hook should filter out or default the null/undefined values
            expect(screen.getByTestId('total-items')).toHaveTextContent('Total Items: 2'); // Only 'Good Item' has valid quantity
            expect(screen.getByTestId('total-price')).toHaveTextContent('Total Price: $20.00'); // price of 'Good Item'
        });
    });
});

