import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, vi, beforeEach } from 'vitest';
import { BrowserRouter as Router } from 'react-router-dom';
import CartPage from './CartPage';



// Mocks
vi.mock('../context/ContextCart', async () => {
  const original = await vi.importActual('../context/ContextCart');
  return {
    ...original,
    useCart: vi.fn(),
  };
});

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useLocation: vi.fn(),
  };
});

import { useCart } from '../context/ContextCart';
import { useLocation } from 'react-router-dom';

describe('CartPage', () => {
  const mockUseCart = useCart as jest.Mock;
  const mockUseLocation = useLocation as jest.Mock;

  const renderWithRouter = (ui: React.ReactElement) => {
    return render(<Router>{ui}</Router>);
  };

  const baseCartItem = {
    productId: '1',
    productName: 'Test Product',
    productPrice: 100,
    quantity: 2,
    availableQuantity: 10,
    imageUrl: '/test.png',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseLocation.mockReturnValue({ state: {} });
  });

  it('shows skeleton loader when loading', () => {
    mockUseCart.mockReturnValue({
      cartItems: [baseCartItem],
      contextIsLoading: true,
      isLoading: true,
      cartError: null,
      fetchCart: vi.fn(),
    });

    renderWithRouter(<CartPage />);
    expect(screen.getByLabelText('Loading your shopping cart...')).toBeInTheDocument();
  });

  it('displays empty cart message when cart is empty', () => {
    mockUseCart.mockReturnValue({
      cartItems: [],
      contextIsLoading: false,
      cartError: null,
      totalPrice: 0,
    });

    renderWithRouter(<CartPage />);
    expect(screen.getByText(/your cart is empty/i)).toBeInTheDocument();
    expect(screen.getByText(/browse products/i)).toBeInTheDocument();
  });

  it('displays cart error message on error', () => {
    mockUseCart.mockReturnValue({
      cartItems: [],
      contextIsLoading: false,
      cartError: 'Failed to fetch cart.',
    });

    renderWithRouter(<CartPage />);
    expect(screen.getByText(/could not load cart/i)).toBeInTheDocument();
    expect(screen.getByText(/failed to fetch cart/i)).toBeInTheDocument();
  });

  it('renders cart items and order summary', () => {
    mockUseCart.mockReturnValue({
      cartItems: [baseCartItem],
      contextIsLoading: false,
      cartError: null,
      totalPrice: 200,
      updateQuantity: vi.fn(),
      removeFromCart: vi.fn(),
      clearCart: vi.fn(),
    });

    renderWithRouter(<CartPage />);
    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText('Subtotal: R200.00')).toBeInTheDocument();
    expect(screen.getByText('Order Summary')).toBeInTheDocument();
    expect(screen.getByText('Proceed to Checkout')).toBeInTheDocument();
  });

  it('calls updateQuantity on + and - button clicks', async () => {
    const updateQuantity = vi.fn();
    mockUseCart.mockReturnValue({
      cartItems: [baseCartItem],
      contextIsLoading: false,
      cartError: null,
      totalPrice: 200,
      updateQuantity,
      removeFromCart: vi.fn(),
      clearCart: vi.fn(),
    });

    renderWithRouter(<CartPage />);
    const incrementButton = screen.getByLabelText('Increase quantity of Test Product');
    const decrementButton = screen.getByLabelText('Decrease quantity of Test Product');

    fireEvent.click(incrementButton);
    fireEvent.click(decrementButton);

    await waitFor(() => {
      expect(updateQuantity).toHaveBeenCalledWith('1', 3);
      expect(updateQuantity).toHaveBeenCalledWith('1', 1);
    });
  });

  it('removes item from cart', async () => {
    const removeFromCart = vi.fn();
    mockUseCart.mockReturnValue({
      cartItems: [baseCartItem],
      contextIsLoading: false,
      cartError: null,
      totalPrice: 200,
      updateQuantity: vi.fn(),
      removeFromCart,
      clearCart: vi.fn(),
    });

    renderWithRouter(<CartPage />);
    const removeButton = screen.getByLabelText('Remove Test Product from cart');
    fireEvent.click(removeButton);

    await waitFor(() => {
      expect(removeFromCart).toHaveBeenCalledWith('1');
    });
  });

  it('clears the cart on "Clear Cart" button click', async () => {
    const clearCart = vi.fn();
    mockUseCart.mockReturnValue({
      cartItems: [baseCartItem],
      contextIsLoading: false,
      cartError: null,
      totalPrice: 200,
      updateQuantity: vi.fn(),
      removeFromCart: vi.fn(),
      clearCart,
    });

    renderWithRouter(<CartPage />);
    fireEvent.click(screen.getByText(/clear cart/i));

    await waitFor(() => {
      expect(clearCart).toHaveBeenCalled();
    });
  });

  it('refreshes page if location.state.refresh is true', async () => {
    const fetchCart = vi.fn().mockResolvedValue(undefined);
    mockUseLocation.mockReturnValue({ state: { refresh: true } });

    mockUseCart.mockReturnValue({
      cartItems: [baseCartItem],
      contextIsLoading: false,
      cartError: null,
      totalPrice: 200,
      updateQuantity: vi.fn(),
      removeFromCart: vi.fn(),
      clearCart: vi.fn(),
      fetchCart,
    });

    renderWithRouter(<CartPage />);
    await waitFor(() => {
      expect(fetchCart).toHaveBeenCalled();
    });
  });
});
