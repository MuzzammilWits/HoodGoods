// src/components/__tests__/StoreInfoForm.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest'; // For extended Vitest matchers
import StoreInfoForm from './StoreInfoForm'; // Adjust the import path as needed
import { vi } from 'vitest'; // Import vi for mocking

describe('StoreInfoForm', () => {
  // Mock props for reusability
  const mockOnStoreNameChange = vi.fn(); // Use vi.fn() for Vitest

  const defaultProps = {
    storeName: '',
    onStoreNameChange: mockOnStoreNameChange,
    isSubmitting: false,
  };

  // Reset mocks before each test
  beforeEach(() => {
    mockOnStoreNameChange.mockClear();
  });

  it('should render the store name label and input field', () => {
    render(<StoreInfoForm {...defaultProps} />);

    // Check for the section title
    expect(screen.getByText('Store Information')).toBeInTheDocument();

    // Check for the label
    expect(screen.getByLabelText('Store Name')).toBeInTheDocument();

    // Check for the input field by its placeholder
    const inputElement = screen.getByPlaceholderText('Enter your store name');
    expect(inputElement).toBeInTheDocument();
    expect(inputElement).toHaveAttribute('type', 'text');
  });

  it('should display the initial storeName prop value in the input', () => {
    const initialName = 'My Awesome Store';
    render(<StoreInfoForm {...defaultProps} storeName={initialName} />);

    const inputElement = screen.getByLabelText('Store Name');
    expect(inputElement).toHaveValue(initialName);
  });

  it('should call onStoreNameChange when the input value changes', () => {
    render(<StoreInfoForm {...defaultProps} />);
    const inputElement = screen.getByLabelText('Store Name');
    const newName = 'New Store Name';

    fireEvent.change(inputElement, { target: { value: newName } });

    expect(mockOnStoreNameChange).toHaveBeenCalledTimes(1);
    expect(mockOnStoreNameChange).toHaveBeenCalledWith(newName);
  });

  it('should disable the input field when isSubmitting is true', () => {
    render(<StoreInfoForm {...defaultProps} isSubmitting={true} />);
    const inputElement = screen.getByLabelText('Store Name');
    expect(inputElement).toBeDisabled();
  });

  it('should enable the input field when isSubmitting is false', () => {
    render(<StoreInfoForm {...defaultProps} isSubmitting={false} />);
    const inputElement = screen.getByLabelText('Store Name');
    expect(inputElement).not.toBeDisabled();
    expect(inputElement).toBeEnabled(); // More explicit assertion
  });

  it('should have the "required" attribute on the input field', () => {
    render(<StoreInfoForm {...defaultProps} />);
    const inputElement = screen.getByLabelText('Store Name');
    expect(inputElement).toBeRequired();
  });

  it('should match the snapshot', () => {
    const { container } = render(<StoreInfoForm {...defaultProps} storeName="Snapshot Store" />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('should match the snapshot when submitting', () => {
    const { container } = render(
      <StoreInfoForm {...defaultProps} storeName="Submitting Store" isSubmitting={true} />
    );
    expect(container.firstChild).toMatchSnapshot();
  });
});

// Ensure your Vitest setup includes necessary globals or imports for testing-library/jest-dom.
// For example, in your vitest.setup.ts or similar:
// import '@testing-library/jest-dom/vitest';
