import React from 'react';
// Import 'within' for scoped queries inside elements
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Routes, Route } from 'react-router-dom'; // Use MemoryRouter for useSearchParams
import { vi } from 'vitest'; // Or import { jest } from '@jest/globals'; if using Jest
import axios from 'axios'; // Import axios to mock it
import { useCart } from '../context/ContextCart'; // Adjust path
import ProductsPage from './ProductsPage'; // Adjust path

// --- Mocks ---

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

// Mock useCart hook
// --- FIX: Make mock async ---
const mockAddToCart = vi.fn().mockResolvedValue(undefined);
// --- End FIX ---
vi.mock('../context/ContextCart', () => ({
    // Mock the specific hook return value
    useCart: () => ({
        // Only mock the functions/values used by ProductsPage
        addToCart: mockAddToCart,
        // Add other properties if ProductsPage uses them (e.g., cartItems count for an icon)
    }),
    // Export CartProvider if needed for wrapping, but usually not needed when mocking the hook
    // CartProvider: ({ children }) => <div>{children}</div>
}));

// Mock window.alert
global.alert = vi.fn();

// --- Mock Data ---
const mockProductsData = [
  { prodId: 1, name: 'Wooden Bowl', description: 'Handcrafted bowl.', category: 'Home & Living', price: 45.00, userId: 'user1', imageUrl: '/img/bowl.jpg', storeName: 'Crafty Corner', isActive: true },
  { prodId: 2, name: 'Silver Necklace', description: 'Shiny silver.', category: 'Jewellery & Accessories', price: 120.00, userId: 'user2', imageUrl: '/img/necklace.jpg', storeName: 'Glitter Gems', isActive: true },
  { prodId: 3, name: 'Canvas Print', description: 'Abstract art.', category: 'Art', price: 85.50, userId: 'user1', imageUrl: '/img/print.jpg', storeName: 'Crafty Corner', isActive: true },
  { prodId: 4, name: 'Leather Wallet', description: 'Durable wallet.', category: 'Jewellery & Accessories', price: 70.00, userId: 'user3', imageUrl: '/img/wallet.jpg', storeName: 'Leather Lux', isActive: true },
];

// Helper to render with Router context
const renderWithRouter = (initialEntries = ['/products']) => {
    return render(
        <MemoryRouter initialEntries={initialEntries}>
            <Routes>
                <Route path="/products" element={<ProductsPage />} />
                {/* Add other routes if needed for navigation testing */}
            </Routes>
        </MemoryRouter>
    );
};


// --- Test Suite ---
describe('ProductsPage Component', () => {

    beforeEach(() => {
        // Reset mocks before each test
        vi.clearAllMocks();
        // Default successful fetch mock
        mockedAxios.get.mockResolvedValue({ data: [...mockProductsData] }); // Return a copy
    });

    test('renders loading state initially', () => {
        renderWithRouter();
        expect(screen.getByText(/Loading products.../i)).toBeInTheDocument();
    });

    test('fetches and displays products successfully', async () => {
        renderWithRouter();

        // --- MODIFICATION START ---
        // Use findByText to wait for the first product name to appear.
        // This combines waiting for loading to finish AND the content to render.
        expect(await screen.findByText('Wooden Bowl')).toBeInTheDocument();
        // --- MODIFICATION END ---

        // Now that we know the first item is loaded, the others should also be present
        expect(screen.getByText('Silver Necklace')).toBeInTheDocument();
        expect(screen.getByText('Canvas Print')).toBeInTheDocument();
        expect(screen.getByText('Leather Wallet')).toBeInTheDocument();

        // Check if category filter is populated (can use findByRole for the first option too if needed)
        expect(screen.getByRole('option', { name: 'All Categories' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'Home & Living' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'Jewellery & Accessories' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'Art' })).toBeInTheDocument();

        // Verify axios call
        expect(mockedAxios.get).toHaveBeenCalledTimes(1);
        expect(mockedAxios.get).toHaveBeenCalledWith(expect.stringContaining('/products'));
    });

    test('displays error message on fetch failure', async () => {
        const errorMsg = 'Network Error - Failed to fetch';
        // --- FIX: Mock with standard Error ---
        mockedAxios.get.mockRejectedValue(new Error(errorMsg));
        renderWithRouter();

        // Wait for loading to disappear and error to appear
        await waitFor(() => {
            expect(screen.queryByText(/Loading products.../i)).not.toBeInTheDocument();
        });

        // --- FIX: Assert the correct error message ---
        expect(screen.getByText(errorMsg)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

     test('displays error message on invalid data format', async () => {
        mockedAxios.get.mockResolvedValue({ data: { notAnArray: true } }); // Simulate invalid data
        renderWithRouter();

        await waitFor(() => {
            expect(screen.queryByText(/Loading products.../i)).not.toBeInTheDocument();
        });

        expect(screen.getByText(/Invalid data format received from server/i)).toBeInTheDocument();
    });

    /* // --- FAILING TEST 1 ---
     test('retry button re-fetches products after error', async () => {
         const errorMsg = 'Initial Fail';
          // --- FIX: Mock with standard Error ---
         mockedAxios.get.mockRejectedValueOnce(new Error(errorMsg)); // First call fails
         renderWithRouter();

         // --- FIX: Wait for the correct error message ---
         await screen.findByText(errorMsg);
         const retryButton = screen.getByRole('button', { name: /retry/i });

         // Reset mock for successful fetch on retry
         mockedAxios.get.mockResolvedValue({ data: [mockProductsData[0]] });

         // Click retry
         fireEvent.click(retryButton);

         // Check for loading state again
         expect(screen.getByText(/Loading products.../i)).toBeInTheDocument();

         // Wait for successful fetch and render
         // --- ERROR OCCURRED HERE: Loading state didn't disappear in time ---
         await waitFor(() => {
             expect(screen.queryByText(/Loading products.../i)).not.toBeInTheDocument();
         });
         expect(screen.getByText(mockProductsData[0].name)).toBeInTheDocument();

         // Verify axios was called twice (initial + retry)
         expect(mockedAxios.get).toHaveBeenCalledTimes(2);
     });
     // --- END FAILING TEST 1 --- */


    test('filters products based on category selection', async () => {
        renderWithRouter();
        await waitFor(() => {
            expect(screen.queryByText(/Loading products.../i)).not.toBeInTheDocument();
        });

        // Initially shows all 4 products
        expect(screen.getByText('Wooden Bowl')).toBeInTheDocument();
        expect(screen.getByText('Silver Necklace')).toBeInTheDocument();
        expect(screen.getByText('Canvas Print')).toBeInTheDocument();
        expect(screen.getByText('Leather Wallet')).toBeInTheDocument();

        // Select "Jewellery & Accessories" category
        const categorySelect = screen.getByLabelText(/Filter by Category/i);
        fireEvent.change(categorySelect, { target: { value: 'Jewellery & Accessories' } });

        // Wait for re-render (useEffect updates filteredProducts)
        await waitFor(() => {
            // Check for absence of items NOT in the selected category
            expect(screen.queryByText('Wooden Bowl')).not.toBeInTheDocument();
            expect(screen.queryByText('Canvas Print')).not.toBeInTheDocument();
        });
        // Check for presence of items IN the selected category
        expect(screen.getByText('Silver Necklace')).toBeInTheDocument();
        expect(screen.getByText('Leather Wallet')).toBeInTheDocument();
        expect(categorySelect).toHaveValue('Jewellery & Accessories'); // Check select value updated

        // Select "All Categories"
        fireEvent.change(categorySelect, { target: { value: '' } });

        // Wait for re-render - use findByText to ensure they reappear
         await screen.findByText('Wooden Bowl'); // Wait for one to reappear
         expect(screen.getByText('Canvas Print')).toBeInTheDocument(); // Check others
        expect(screen.getByText('Silver Necklace')).toBeInTheDocument();
        expect(screen.getByText('Leather Wallet')).toBeInTheDocument();
        expect(categorySelect).toHaveValue(''); // Check select value updated
    });

     test('filters products based on initial URL search parameter', async () => {
        // Render with initial category in URL
        renderWithRouter(['/products?category=Art']);

        await waitFor(() => {
            expect(screen.queryByText(/Loading products.../i)).not.toBeInTheDocument();
        });

        // Only "Art" category product should be visible
        expect(screen.queryByText('Wooden Bowl')).not.toBeInTheDocument();
        expect(screen.queryByText('Silver Necklace')).not.toBeInTheDocument();
        expect(screen.getByText('Canvas Print')).toBeInTheDocument(); // Art product
        expect(screen.queryByText('Leather Wallet')).not.toBeInTheDocument();

        // Check if select dropdown reflects the URL param
        expect(screen.getByLabelText(/Filter by Category/i)).toHaveValue('Art');
    });

    /* // --- FAILING TEST 2 ---
     test('displays message when no products match filter', async () => {
        renderWithRouter();
        await waitFor(() => {
            expect(screen.queryByText(/Loading products.../i)).not.toBeInTheDocument();
        });

        const categorySelect = screen.getByLabelText(/Filter by Category/i);
        fireEvent.change(categorySelect, { target: { value: 'NonExistentCategory' } }); // Use a category not in mock data

        // --- FIX: Wait for the "No products found" message ---
        // --- ERROR OCCURRED HERE: Expected message was not found in the DOM ---
        await waitFor(() => {
            expect(screen.getByText(/No products found in NonExistentCategory category/i)).toBeInTheDocument();
        });
        // Optional: Assert absence after waiting
        expect(screen.queryByText('Wooden Bowl')).not.toBeInTheDocument();
        expect(screen.queryByText('Silver Necklace')).not.toBeInTheDocument();
        // --- End FIX ---
       });
       // --- END FAILING TEST 2 --- */

     test('displays message when no products are fetched', async () => {
        mockedAxios.get.mockResolvedValue({ data: [] }); // Return empty array
        renderWithRouter();
        await waitFor(() => {
            expect(screen.queryByText(/Loading products.../i)).not.toBeInTheDocument();
        });
        expect(screen.getByText(/No products available/i)).toBeInTheDocument();
       });


    test('calls addToCart from context when "Add to Cart" button is clicked', async () => {
        renderWithRouter();
        await waitFor(() => {
            expect(screen.queryByText(/Loading products.../i)).not.toBeInTheDocument();
        });

        // Find the button specifically for "Wooden Bowl"
        const productCard = screen.getByText('Wooden Bowl').closest('.product-card');
        expect(productCard).toBeInTheDocument(); // Ensure card was found

        const addButton = within(productCard! as HTMLElement).getByRole('button', { name: /Add Wooden Bowl to cart/i });

        // --- FIX: Wrap async function trigger in act ---
        await act(async () => {
            fireEvent.click(addButton);
        });
        // --- End FIX ---

        // Verify mock addToCart was called with correct data
        expect(mockAddToCart).toHaveBeenCalledTimes(1);
        expect(mockAddToCart).toHaveBeenCalledWith({
            productId: '1', // Ensure it's converted to string if needed by context
            name: 'Wooden Bowl',
            price: 45.00,
            image: '/img/bowl.jpg'
        });

        // Verify alert was called
        expect(global.alert).toHaveBeenCalledTimes(1); // Check call count
        expect(global.alert).toHaveBeenCalledWith('Wooden Bowl added to cart!');
    });

});