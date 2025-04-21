import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest'; // Or import { jest } from '@jest/globals'; if using Jest
import ProductForm from './ProductForm'; // Adjust path if needed
import { ProductFormData } from '../types/createStore'; // Adjust path if needed

// Mock Props Setup
const mockProduct: ProductFormData = {
  productName: 'Test Item',
  productDescription: 'A great test item.',
  productPrice: '19.99',
  productCategory: 'Clothing',
  image: null,
  imagePreview: null,
  // imageURL: '', // Assuming not directly part of form data state
};

const mockCategories = ['Clothing', 'Art', 'Crafts'];
const mockIndex = 0;
const mockOnProductChange = vi.fn(); // Use jest.fn() if using Jest
const mockOnImageChange = vi.fn();
const mockOnRemove = vi.fn();

describe('ProductForm Component', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks(); // Use jest.clearAllMocks() if using Jest
  });

  test('renders all form fields correctly with initial values', () => {
    render(
      <ProductForm
        product={mockProduct}
        index={mockIndex}
        productCategories={mockCategories}
        onProductChange={mockOnProductChange}
        onImageChange={mockOnImageChange}
        onRemove={mockOnRemove}
        isSubmitting={false}
        canRemove={true}
      />
    );

    // Check labels and inputs exist with correct values
    expect(screen.getByLabelText(/Product Name/i)).toHaveValue(mockProduct.productName);
    expect(screen.getByLabelText(/Description/i)).toHaveValue(mockProduct.productDescription);
    expect(screen.getByLabelText(/Price \(R\)/i)).toHaveValue(parseFloat(mockProduct.productPrice)); // Input type=number uses number value
    expect(screen.getByLabelText(/Category/i)).toHaveValue(mockProduct.productCategory);
    expect(screen.getByLabelText(/Product Image/i)).toBeInTheDocument();

    // Check heading
    expect(screen.getByRole('heading', { name: `Product #${mockIndex + 1}` })).toBeInTheDocument();

    // Check remove button exists (since canRemove is true)
    expect(screen.getByRole('button', { name: /Remove Product/i })).toBeInTheDocument();
  });

  test('calls onProductChange when text inputs change', () => {
    render(
      <ProductForm
        product={mockProduct}
        index={mockIndex}
        productCategories={mockCategories}
        onProductChange={mockOnProductChange}
        onImageChange={mockOnImageChange}
        onRemove={mockOnRemove}
        isSubmitting={false}
        canRemove={true}
      />
    );

    const nameInput = screen.getByLabelText(/Product Name/i);
    const descInput = screen.getByLabelText(/Description/i);
    const priceInput = screen.getByLabelText(/Price \(R\)/i);

    fireEvent.change(nameInput, { target: { value: 'New Name' } });
    expect(mockOnProductChange).toHaveBeenCalledWith(mockIndex, 'productName', 'New Name');

    fireEvent.change(descInput, { target: { value: 'New Desc' } });
    expect(mockOnProductChange).toHaveBeenCalledWith(mockIndex, 'productDescription', 'New Desc');

    fireEvent.change(priceInput, { target: { value: '25.50' } });
    expect(mockOnProductChange).toHaveBeenCalledWith(mockIndex, 'productPrice', '25.50');

    expect(mockOnProductChange).toHaveBeenCalledTimes(3);
  });

  test('calls onProductChange when category select changes', () => {
    render(
      <ProductForm
        product={mockProduct}
        index={mockIndex}
        productCategories={mockCategories}
        onProductChange={mockOnProductChange}
        onImageChange={mockOnImageChange}
        onRemove={mockOnRemove}
        isSubmitting={false}
        canRemove={true}
      />
    );

    const categorySelect = screen.getByLabelText(/Category/i);
    fireEvent.change(categorySelect, { target: { value: 'Art' } });
    expect(mockOnProductChange).toHaveBeenCalledWith(mockIndex, 'productCategory', 'Art');
    expect(mockOnProductChange).toHaveBeenCalledTimes(1);
  });

  test('calls onImageChange when file input changes', () => {
    render(
      <ProductForm
        product={mockProduct}
        index={mockIndex}
        productCategories={mockCategories}
        onProductChange={mockOnProductChange}
        onImageChange={mockOnImageChange}
        onRemove={mockOnRemove}
        isSubmitting={false}
        canRemove={true}
      />
    );

    const fileInput = screen.getByLabelText(/Product Image/i);
    const dummyFile = new File(['(⌐□_□)'], 'chucknorris.png', { type: 'image/png' });

    // Simulate file selection
    fireEvent.change(fileInput, { target: { files: [dummyFile] } });

    // Check if the callback was called with the index and the event object
    expect(mockOnImageChange).toHaveBeenCalledTimes(1);
    expect(mockOnImageChange).toHaveBeenCalledWith(mockIndex, expect.objectContaining({
      target: expect.objectContaining({
        files: expect.arrayContaining([dummyFile]),
      }),
    }));
  });

  test('displays image preview when imagePreview prop is provided', () => {
    const productWithPreview = { ...mockProduct, imagePreview: 'data:image/png;base64,previewdata' };
    render(
      <ProductForm
        product={productWithPreview}
        index={mockIndex}
        productCategories={mockCategories}
        onProductChange={mockOnProductChange}
        onImageChange={mockOnImageChange}
        onRemove={mockOnRemove}
        isSubmitting={false}
        canRemove={true}
      />
    );

    const previewImage = screen.getByAltText(`Preview for product ${mockIndex + 1}`);
    expect(previewImage).toBeInTheDocument();
    expect(previewImage).toHaveAttribute('src', productWithPreview.imagePreview);
  });

   test('displays "Please select an image" when no image or preview exists', () => {
    const productNoImage = { ...mockProduct, image: null, imagePreview: null };
    render(
      <ProductForm
        product={productNoImage}
        index={mockIndex}
        productCategories={mockCategories}
        onProductChange={mockOnProductChange}
        onImageChange={mockOnImageChange}
        onRemove={mockOnRemove}
        isSubmitting={false}
        canRemove={true}
      />
    );

    expect(screen.getByText(/Please select an image/i)).toBeInTheDocument();
  });


  test('calls onRemove when remove button is clicked', () => {
    render(
      <ProductForm
        product={mockProduct}
        index={mockIndex}
        productCategories={mockCategories}
        onProductChange={mockOnProductChange}
        onImageChange={mockOnImageChange}
        onRemove={mockOnRemove}
        isSubmitting={false}
        canRemove={true} // Ensure button is rendered
      />
    );

    const removeButton = screen.getByRole('button', { name: /Remove Product/i });
    fireEvent.click(removeButton);

    expect(mockOnRemove).toHaveBeenCalledWith(mockIndex);
    expect(mockOnRemove).toHaveBeenCalledTimes(1);
  });

  test('does not render remove button when canRemove is false', () => {
    render(
      <ProductForm
        product={mockProduct}
        index={mockIndex}
        productCategories={mockCategories}
        onProductChange={mockOnProductChange}
        onImageChange={mockOnImageChange}
        onRemove={mockOnRemove}
        isSubmitting={false}
        canRemove={false} // Set to false
      />
    );

    expect(screen.queryByRole('button', { name: /Remove Product/i })).not.toBeInTheDocument();
  });

  test('disables all inputs and buttons when isSubmitting is true', () => {
    render(
      <ProductForm
        product={mockProduct}
        index={mockIndex}
        productCategories={mockCategories}
        onProductChange={mockOnProductChange}
        onImageChange={mockOnImageChange}
        onRemove={mockOnRemove}
        isSubmitting={true} // Set to true
        canRemove={true}
      />
    );

    expect(screen.getByLabelText(/Product Name/i)).toBeDisabled();
    expect(screen.getByLabelText(/Description/i)).toBeDisabled();
    expect(screen.getByLabelText(/Price \(R\)/i)).toBeDisabled();
    expect(screen.getByLabelText(/Category/i)).toBeDisabled();
    expect(screen.getByLabelText(/Product Image/i)).toBeDisabled();
    expect(screen.getByRole('button', { name: /Remove Product/i })).toBeDisabled();
  });
});
