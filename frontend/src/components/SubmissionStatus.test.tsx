// src/components/__tests__/SubmissionStatus.test.tsx

import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest'; // For extended Vitest matchers
import SubmissionStatus from './SubmissionStatus'; // Adjust the import path as needed
// No vi.fn() is needed here as SubmissionStatus does not take function props

describe('SubmissionStatus Component', () => {
  it('should render null if no error or success message is provided', () => {
    const { container } = render(<SubmissionStatus error={null} success={null} />);
    // The component should return null, so the container should be empty.
    expect(container.firstChild).toBeNull();
  });

  it('should render only the error message when error is provided', () => {
    const errorMessage = 'Something went wrong!';
    render(<SubmissionStatus error={errorMessage} success={null} />);

    const errorOutput = screen.getByText(errorMessage);
    expect(errorOutput).toBeInTheDocument();
    expect(errorOutput).toHaveClass('error-message');
    expect(errorOutput.tagName).toBe('OUTPUT'); // Check if it's an <output> element

    // Ensure success message is not present.
    // Using queryByText for non-existence check.
    expect(screen.queryByText(/success/i, { selector: '.success-message' })).not.toBeInTheDocument();
  });

  it('should render only the success message when success is provided', () => {
    const successMessage = 'Operation completed successfully!';
    render(<SubmissionStatus error={null} success={successMessage} />);

    const successOutput = screen.getByText(successMessage);
    expect(successOutput).toBeInTheDocument();
    expect(successOutput).toHaveClass('success-message');
    expect(successOutput.tagName).toBe('OUTPUT');

    // Ensure error message is not present
    expect(screen.queryByText(/error/i, { selector: '.error-message' })).not.toBeInTheDocument();
  });

  it('should render both messages if both error and success are provided', () => {
    // The current component implementation will render both if both are true,
    // one after the other in the DOM within the fragment.
    const errorMessage = 'An error occurred.';
    const successMessage = 'But some part was successful.';
    render(<SubmissionStatus error={errorMessage} success={successMessage} />);

    const errorOutput = screen.getByText(errorMessage);
    expect(errorOutput).toBeInTheDocument();
    expect(errorOutput).toHaveClass('error-message');

    const successOutput = screen.getByText(successMessage);
    expect(successOutput).toBeInTheDocument();
    expect(successOutput).toHaveClass('success-message');
  });

  // Snapshot tests
  it('should match snapshot when only error is present', () => {
    const { container } = render(<SubmissionStatus error="Snapshot error" success={null} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('should match snapshot when only success is present', () => {
    const { container } = render(<SubmissionStatus error={null} success="Snapshot success" />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('should match snapshot when both error and success are present', () => {
    const { container } = render(<SubmissionStatus error="Snapshot error" success="Snapshot success" />);
    // The container will have two <output> elements as children of the fragment
    expect(container.childNodes).toMatchSnapshot();
  });

  it('should match snapshot when no messages are present (renders null)', () => {
    const { container } = render(<SubmissionStatus error={null} success={null} />);
    expect(container.firstChild).toMatchSnapshot(); // Will be null
  });
});

// Ensure your Vitest setup includes necessary globals or imports for testing-library/jest-dom.
// For example, in your vitest.setup.ts or similar:
// import '@testing-library/jest-dom/vitest';
