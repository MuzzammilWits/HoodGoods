import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest'; // Or import { jest } from '@jest/globals'; if using Jest
import ProductList from './ProductList'; // Adjust path if needed
import { ProductFormData } from '../types/createStore'; // Adjust path if needed

// --- Mock ProductForm ---
// We mock ProductForm to verify props passed down without testing its internals again.
vi.mock('./ProductForm', () => ({
  // Default export mock
  default: vi.fn(({ index, product, canRemove }) => (
    <div data-testid={`mock-product-form-${index}`}>
      Mock Product Form #{index + 1} - Name: {product.productName} - CanRemove: {String(canRemove)}
    </div>
  )),
}));
// If using Jest:
// jest.mock('./ProductForm', () => ({
//   __esModule: true, // Needed for default export mocks with Jest
//   default: jest.fn(({ index, product, canRemove }) => (
//     <div data-testid={`mock-product-form-${index}`}>
//       Mock Product Form #{index + 1} - Name: {product.productName} - CanRemove: {String(canRemove)}
//     </div>
//   )),
// }));


// --- Mock Props Setup ---
const mockProducts: ProductFormData[] = [
  { productName: 'Item 1', productDescription: 'Desc 1', productPrice: '10', productCategory: 'Art', image: null, imagePreview: null },
  { productName: 'Item 2', productDescription: 'Desc 2', productPrice: '20', productCategory: 'Clothing', image: null, imagePreview: null },
];
const mockCategories = ['Clothing', 'Art', 'Crafts'];
const mockOnProductChange = vi.fn(); // Use jest.fn() if using Jest
const mockOnImageChange = vi.fn();
const mockOnRemoveProduct = vi.fn();
const mockOnAddProduct = vi.fn();

// Import the mocked component *after* the mock definition
// Ensure this dynamic import works with your test runner setup (Vitest usually handles it)
const MockedProductForm = vi.mocked( // Use jest.mocked() if using Jest
    (await import('./ProductForm')).default
);


describe('ProductList Component', () => {
   beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks(); // Use jest.clearAllMocks() if using Jest
  });

  test('renders heading, paragraph, and correct number of ProductForms', () => {
    render(
      <ProductList
        products={mockProducts}
        productCategories={mockCategories}
        onProductChange={mockOnProductChange}
        onImageChange={mockOnImageChange}
        onRemoveProduct={mockOnRemoveProduct}
        onAddProduct={mockOnAddProduct}
        isSubmitting={false}
      />
    );

    expect(screen.getByRole('heading', { name: /Products/i })).toBeInTheDocument();
    expect(screen.getByText(/Add at least one product/i)).toBeInTheDocument();

    // Check if the correct number of mocked forms are rendered
    const forms = screen.getAllByTestId(/mock-product-form-/i);
    expect(forms).toHaveLength(mockProducts.length);

    // Check content of mocked forms (optional, verifies data pass-down)
    expect(forms[0]).toHaveTextContent('Mock Product Form #1 - Name: Item 1');
    expect(forms[1]).toHaveTextContent('Mock Product Form #2 - Name: Item 2');
  });

  test('passes correct props down to each ProductForm', () => {
     render(
      <ProductList
        products={mockProducts}
        productCategories={mockCategories}
        onProductChange={mockOnProductChange}
        onImageChange={mockOnImageChange}
        onRemoveProduct={mockOnRemoveProduct}
        onAddProduct={mockOnAddProduct}
        isSubmitting={false}
      />
    );

    // Verify props passed to the first mocked ProductForm
    // --- FIX: Added 'undefined' as second expected argument ---
    expect(MockedProductForm).toHaveBeenNthCalledWith(1, // Check 1st call
      expect.objectContaining({ // Check 1st argument (props)
        index: 0,
        product: mockProducts[0],
        productCategories: mockCategories,
        onProductChange: mockOnProductChange,
        onImageChange: mockOnImageChange,
        onRemove: mockOnRemoveProduct,
        isSubmitting: false,
        canRemove: true, // Because products.length > 1
      }),
      undefined // Expect 'undefined' as the 2nd argument
    );

     // Verify props passed to the second mocked ProductForm
     // --- FIX: Added 'undefined' as second expected argument ---
     expect(MockedProductForm).toHaveBeenNthCalledWith(2, // Check 2nd call
      expect.objectContaining({ // Check 1st argument (props)
        index: 1,
        product: mockProducts[1],
        // Check a few key props again for the second call
        productCategories: mockCategories,
        onProductChange: mockOnProductChange,
        isSubmitting: false,
        canRemove: true,
      }),
      undefined // Expect 'undefined' as the 2nd argument
    );
  });

   test('passes canRemove=false to ProductForm when only one product exists', () => {
     render(
      <ProductList
        products={[mockProducts[0]]} // Only one product
        productCategories={mockCategories}
        onProductChange={mockOnProductChange}
        onImageChange={mockOnImageChange}
        onRemoveProduct={mockOnRemoveProduct}
        onAddProduct={mockOnAddProduct}
        isSubmitting={false}
      />
    );

     // --- FIX: Check calls more explicitly ---
     // Check the first (and only) call more explicitly
     expect(MockedProductForm).toHaveBeenCalledTimes(1); // Ensure it was called exactly once

     // Check the props object (first argument) of the first call
     expect(MockedProductForm.mock.calls[0][0]).toMatchObject(
        expect.objectContaining({
            index: 0,
            product: mockProducts[0],
            canRemove: false, // Should be false for single product
        })
     );
     // --- End FIX ---

     // Check content of mocked form (still useful)
     expect(screen.getByTestId('mock-product-form-0')).toHaveTextContent('CanRemove: false');
  });


  test('calls onAddProduct when "Add Another Product" button is clicked', () => {
    render(
      <ProductList
        products={mockProducts}
        productCategories={mockCategories}
        onProductChange={mockOnProductChange}
        onImageChange={mockOnImageChange}
        onRemoveProduct={mockOnRemoveProduct}
        onAddProduct={mockOnAddProduct}
        isSubmitting={false}
      />
    );

    const addButton = screen.getByRole('button', { name: /\+ Add Another Product/i });
    fireEvent.click(addButton);

    expect(mockOnAddProduct).toHaveBeenCalledTimes(1);
  });

  test('disables "Add Another Product" button when isSubmitting is true', () => {
     render(
      <ProductList
        products={mockProducts}
        productCategories={mockCategories}
        onProductChange={mockOnProductChange}
        onImageChange={mockOnImageChange}
        onRemoveProduct={mockOnRemoveProduct}
        onAddProduct={mockOnAddProduct}
        isSubmitting={true} // Set submitting state
      />
    );

    const addButton = screen.getByRole('button', { name: /\+ Add Another Product/i });
    expect(addButton).toBeDisabled();

    // --- FIX: Check calls more explicitly ---
    // Verify the mock was called for each product
    expect(MockedProductForm).toHaveBeenCalledTimes(mockProducts.length);

    // Check the 'isSubmitting' prop in the first argument (props object) of each call
    expect(MockedProductForm.mock.calls[0][0]).toMatchObject(
      expect.objectContaining({ isSubmitting: true })
    );
    expect(MockedProductForm.mock.calls[1][0]).toMatchObject(
      expect.objectContaining({ isSubmitting: true })
    );
    // --- End FIX ---
  });
});
