import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import StoreInfoForm from './StoreInfoForm'; // Adjust path if necessary

describe('StoreInfoForm', () => {
  const mockOnStoreNameChange = vi.fn();
  const defaultProps = {
    storeName: '',
    onStoreNameChange: mockOnStoreNameChange,
    isSubmitting: false,
  };

  beforeEach(() => {
    // Clear mock calls before each test
    mockOnStoreNameChange.mockClear();
  });

  it('should render the heading and disclaimer text', () => {
    render(<StoreInfoForm {...defaultProps} />);

    expect(screen.getByRole('heading', { name: /Store Name/i })).toBeInTheDocument();
    expect(
      screen.getByText(
        /Your store name is your unique brand on our platform and cannot be changed later. Choose wisely!/i
      )
    ).toBeInTheDocument();
  });

  it('should render the input field with the correct initial value and placeholder', () => {
    render(<StoreInfoForm {...defaultProps} storeName="My Awesome Store" />);

    const inputElement = screen.getByPlaceholderText('Enter your store name');
    expect(inputElement).toBeInTheDocument();
    expect(inputElement).toHaveValue('My Awesome Store');
  });

  it('should call onStoreNameChange when the input value changes', () => {
    render(<StoreInfoForm {...defaultProps} />);
    const inputElement = screen.getByPlaceholderText('Enter your store name');

    fireEvent.change(inputElement, { target: { value: 'New Store Name' } });
    expect(mockOnStoreNameChange).toHaveBeenCalledTimes(1);
    expect(mockOnStoreNameChange).toHaveBeenCalledWith('New Store Name');
  });

  it('should display the updated storeName prop in the input field', () => {
    const { rerender } = render(<StoreInfoForm {...defaultProps} storeName="Initial Name" />);
    const inputElement = screen.getByPlaceholderText('Enter your store name');
    expect(inputElement).toHaveValue('Initial Name');

    rerender(<StoreInfoForm {...defaultProps} storeName="Updated Name From Prop" />);
    expect(inputElement).toHaveValue('Updated Name From Prop');
  });

  it('should disable the input field when isSubmitting is true', () => {
    render(<StoreInfoForm {...defaultProps} isSubmitting={true} />);
    const inputElement = screen.getByPlaceholderText('Enter your store name');
    expect(inputElement).toBeDisabled();
  });

  it('should enable the input field when isSubmitting is false', () => {
    render(<StoreInfoForm {...defaultProps} isSubmitting={false} />);
    const inputElement = screen.getByPlaceholderText('Enter your store name');
    expect(inputElement).not.toBeDisabled();
  });

  it('should have the input field marked as required', () => {
    render(<StoreInfoForm {...defaultProps} />);
    const inputElement = screen.getByPlaceholderText('Enter your store name');
    expect(inputElement).toBeRequired();
  });
});