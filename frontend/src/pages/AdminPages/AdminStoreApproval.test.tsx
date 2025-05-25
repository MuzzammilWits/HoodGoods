import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import axios from 'axios';
import AdminStoreApproval from './AdminStoreApproval';

// Mock axios
vi.mock('axios');
const mockedAxios = axios as any;

// Mock navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Test data
const mockStores = [
  {
    storeId: 'store-1',
    userId: 'user-1',
    storeName: 'Test Store 1',
    standardPrice: 10.50,
    standardTime: '2-3 days',
    expressPrice: 15.75,
    expressTime: '1 day',
    isActiveStore: false,
    products: [
      {
        prodId: 1,
        name: 'Test Product 1',
        description: 'A test product',
        category: 'Electronics',
        price: 25.99,
        productquantity: 10,
        userId: 'user-1',
        imageUrl: 'https://example.com/image1.jpg',
        storeId: 'store-1',
        storeName: 'Test Store 1',
        isActive: true
      }
    ]
  },
  {
    storeId: 'store-2',
    userId: 'user-2',
    storeName: 'Test Store 2',
    standardPrice: null,
    standardTime: null,
    expressPrice: 20.00,
    expressTime: '4 hours',
    isActiveStore: false,
    products: []
  }
];

const renderComponent = () => {
  return render(
    <BrowserRouter>
      <AdminStoreApproval />
    </BrowserRouter>
  );
};

describe('AdminStoreApproval', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup axios mocks
    mockedAxios.get = vi.fn().mockResolvedValue({ data: mockStores });
    mockedAxios.patch = vi.fn().mockResolvedValue({});
    mockedAxios.delete = vi.fn().mockResolvedValue({});
    mockedAxios.isAxiosError = vi.fn().mockReturnValue(false);
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  // This is the block indicated by your error message (line 69)
  describe('Initial Rendering and Loading', () => {
    it('renders the main header correctly', async () => {
      renderComponent();

      expect(screen.getByRole('heading', { name: /store management/i })).toBeInTheDocument();
      expect(screen.getByText('Back to Dashboard')).toBeInTheDocument();
    });

    it('shows loading skeleton while fetching data', () => {
      // Mock a delayed response
      mockedAxios.get.mockImplementation(() => new Promise(() => {}));

      renderComponent();

      expect(screen.getByRole('main')).toHaveAttribute('aria-busy', 'true');
      expect(screen.getByRole('button', { name: /back to dashboard/i })).toBeInTheDocument();
    });

    it('fetches stores from the correct API endpoint', async () => {
      renderComponent();

      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalledWith('http://localhost:3000/stores/inactive');
      });
    });
  }); // Make sure this closing brace '});' exists for 'Initial Rendering and Loading'

  describe('Store Display', () => {
    it('displays stores correctly after loading', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Test Store 1')).toBeInTheDocument();
        expect(screen.getByText('Test Store 2')).toBeInTheDocument();
      });
    });

    it('displays pricing information correctly', async () => {
      renderComponent();

      await waitFor(() => {
        // Store 1 with all pricing info
        expect(screen.getByText('Price: R 10.50')).toBeInTheDocument();
        expect(screen.getByText('Time: 2-3 days')).toBeInTheDocument();
        expect(screen.getByText('Price: R 15.75')).toBeInTheDocument();
        expect(screen.getByText('Time: 1 day')).toBeInTheDocument();

        // Store 2 with null values
        expect(screen.getByText('Price: R N/A')).toBeInTheDocument();
        expect(screen.getByText('Time: Not specified')).toBeInTheDocument();
        expect(screen.getByText('Price: R 20.00')).toBeInTheDocument();
        expect(screen.getByText('Time: 4 hours')).toBeInTheDocument();
      });
    });

    it('shows "no stores" message when list is empty', async () => {
      mockedAxios.get.mockResolvedValue({ data: [] });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('No stores are currently awaiting approval.')).toBeInTheDocument();
      });
    });
  });

  describe('Store Expansion/Collapse', () => {
    it('expands store to show products when clicked', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Test Store 1')).toBeInTheDocument();
      });

      const storeHeader = screen.getByText('Test Store 1').closest('.store-header');
      fireEvent.click(storeHeader!);

      await waitFor(() => {
        expect(screen.getByText('Products in this Store')).toBeInTheDocument();
        expect(screen.getByText('Test Product 1')).toBeInTheDocument();
        expect(screen.getByText('Price: R 25.99')).toBeInTheDocument();
        expect(screen.getByText('Quantity: 10')).toBeInTheDocument();
        expect(screen.getByText('Category: Electronics')).toBeInTheDocument();
      });
    });

    it('shows "no products" message for stores without products', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Test Store 2')).toBeInTheDocument();
      });

      const storeHeader = screen.getByText('Test Store 2').closest('.store-header');
      fireEvent.click(storeHeader!);

      await waitFor(() => {
        expect(screen.getByText('No products found for this store or products are active.')).toBeInTheDocument();
      });
    });

    it('collapses expanded store when clicked again', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Test Store 1')).toBeInTheDocument();
      });

      const storeHeader = screen.getByText('Test Store 1').closest('.store-header');

      // Expand
      fireEvent.click(storeHeader!);
      await waitFor(() => {
        expect(screen.getByText('Products in this Store')).toBeInTheDocument();
      });

      // Collapse
      fireEvent.click(storeHeader!);
      await waitFor(() => {
        expect(screen.queryByText('Products in this Store')).not.toBeInTheDocument();
      });
    });
  });

  describe('Keyboard Accessibility', () => {
    it('expands store when Enter key is pressed', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Test Store 1')).toBeInTheDocument();
      });

      const storeHeader = screen.getByText('Test Store 1').closest('.store-header');
      fireEvent.keyDown(storeHeader!, { key: 'Enter' });

      await waitFor(() => {
        expect(screen.getByText('Products in this Store')).toBeInTheDocument();
      });
    });

    it('expands store when Space key is pressed', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Test Store 1')).toBeInTheDocument();
      });

      const storeHeader = screen.getByText('Test Store 1').closest('.store-header');
      fireEvent.keyDown(storeHeader!, { key: ' ' }); // Space key

      await waitFor(() => {
        expect(screen.getByText('Products in this Store')).toBeInTheDocument();
      });
    });

    it('has proper ARIA attributes for accessibility', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Test Store 1')).toBeInTheDocument();
      });

      const storeHeader = screen.getByText('Test Store 1').closest('.store-header');
      expect(storeHeader).toHaveAttribute('role', 'button');
      expect(storeHeader).toHaveAttribute('tabIndex', '0');
      expect(storeHeader).toHaveAttribute('aria-expanded', 'false');
    });
  });

  describe('Store Approval', () => {
    it('approves store successfully', async () => {
      mockedAxios.patch.mockResolvedValue({});

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Test Store 1')).toBeInTheDocument();
      });

      const approveButton = screen.getByLabelText('Approve store Test Store 1');

      await act(async () => {
        fireEvent.click(approveButton);
      });

      await waitFor(() => {
        expect(mockedAxios.patch).toHaveBeenCalledWith('http://localhost:3000/stores/store-1/approve');
        expect(screen.queryByText('Test Store 1')).not.toBeInTheDocument();
        expect(screen.getByText('Store approved successfully!')).toBeInTheDocument();
      });
    });

    it('handles approval error gracefully', async () => {
      mockedAxios.patch.mockRejectedValue(new Error('Network error'));

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Test Store 1')).toBeInTheDocument();
      });

      const approveButton = screen.getByLabelText('Approve store Test Store 1');

      await act(async () => {
        fireEvent.click(approveButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Failed to approve store')).toBeInTheDocument();
        expect(screen.getByText('Test Store 1')).toBeInTheDocument(); // Store should still be visible
      });
    });

    it('prevents event propagation when approve button is clicked', async () => {
      mockedAxios.patch.mockResolvedValue({});

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Test Store 1')).toBeInTheDocument();
      });

      const approveButton = screen.getByLabelText('Approve store Test Store 1');

      await act(async () => {
        fireEvent.click(approveButton);
      });

      // Store should not expand when approve button is clicked
      expect(screen.queryByText('Products in this Store')).not.toBeInTheDocument();
    });
  });

  describe('Store Rejection', () => {
    it('rejects store successfully', async () => {
      mockedAxios.delete.mockResolvedValue({});

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Test Store 1')).toBeInTheDocument();
      });

      const rejectButton = screen.getByLabelText('Reject store Test Store 1');

      await act(async () => {
        fireEvent.click(rejectButton);
      });

      await waitFor(() => {
        expect(mockedAxios.delete).toHaveBeenCalledWith('http://localhost:3000/stores/store-1');
        expect(screen.queryByText('Test Store 1')).not.toBeInTheDocument();
        expect(screen.getByText('Store rejected and deleted successfully!')).toBeInTheDocument();
      });
    });

    it('handles rejection error gracefully', async () => {
      mockedAxios.delete.mockRejectedValue(new Error('Network error'));

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Test Store 1')).toBeInTheDocument();
      });

      const rejectButton = screen.getByLabelText('Reject store Test Store 1');

      await act(async () => {
        fireEvent.click(rejectButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Failed to reject store')).toBeInTheDocument();
        expect(screen.getByText('Test Store 1')).toBeInTheDocument(); // Store should still be visible
      });
    });

    it('prevents event propagation when reject button is clicked', async () => {
      mockedAxios.delete.mockResolvedValue({});

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Test Store 1')).toBeInTheDocument();
      });

      const rejectButton = screen.getByLabelText('Reject store Test Store 1');

      await act(async () => {
        fireEvent.click(rejectButton);
      });

      // Store should not expand when reject button is clicked
      expect(screen.queryByText('Products in this Store')).not.toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('navigates back to dashboard when back button is clicked', async () => {
      renderComponent();

      // Wait for initial data to load to ensure component is stable
      await waitFor(() => {
        if (mockStores.length > 0) {
            expect(screen.getByText(mockStores[0].storeName)).toBeInTheDocument();
        } else {
            // Fallback if mockStores could be empty during this test
            expect(screen.getByText('No stores are currently awaiting approval.')).toBeInTheDocument();
        }
      });

      const backButton = screen.getByText('Back to Dashboard');
      fireEvent.click(backButton);

      expect(mockNavigate).toHaveBeenCalledWith('/admin-dashboard');
    });
  });

  describe('Error Handling', () => {
    it('handles API fetch error gracefully', async () => {
      const mockError = {
        response: {
          data: {
            message: 'Server error'
          }
        }
      };
      mockedAxios.get.mockRejectedValue(mockError);
      mockedAxios.isAxiosError.mockReturnValue(true);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Server error')).toBeInTheDocument();
        expect(screen.getByText('No stores are currently awaiting approval.')).toBeInTheDocument();
      });
    });

    it('handles non-axios errors', async () => {
      const mockError = new Error('Network error');
      mockedAxios.get.mockRejectedValue(mockError);
      mockedAxios.isAxiosError.mockReturnValue(false);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Failed to load stores')).toBeInTheDocument();
      });
    });
  });

  // Corrected: Removed the redundant inner describe block
  describe('Notifications', () => {
    it('shows and hides notification after timeout', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Test Store 1')).toBeInTheDocument();
      });

      const approveButton = screen.getByLabelText('Approve store Test Store 1');

      await act(async () => {
        fireEvent.click(approveButton);
      });

      // Wait for notification to appear
      await waitFor(() => {
        expect(screen.getByText('Store approved successfully!')).toBeInTheDocument();
      });

      // Wait for notification to disappear (3 seconds + buffer)
      await waitFor(() => {
        expect(screen.queryByText('Store approved successfully!')).not.toBeInTheDocument();
      }, { timeout: 4000 }); // Increased timeout for safety
    });

    it('has correct ARIA role for error notifications', async () => {
      mockedAxios.patch.mockRejectedValue(new Error('Network error'));

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Test Store 1')).toBeInTheDocument();
      });

      const approveButton = screen.getByLabelText('Approve store Test Store 1');

      await act(async () => {
        fireEvent.click(approveButton);
      });

      await waitFor(() => {
        const notification = screen.getByText('Failed to approve store');
        expect(notification.closest('.notification-modal')).toHaveAttribute('role', 'alert');
      });
    });

    it('has correct ARIA role for success notifications', async () => {
      mockedAxios.patch.mockResolvedValue({});

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Test Store 1')).toBeInTheDocument();
      });

      const approveButton = screen.getByLabelText('Approve store Test Store 1');

      await act(async () => {
        fireEvent.click(approveButton);
      });

      await waitFor(() => {
        const notification = screen.getByText('Store approved successfully!');
        expect(notification.closest('.notification-modal')).toHaveAttribute('role', 'status');
      });
    });
  });
});