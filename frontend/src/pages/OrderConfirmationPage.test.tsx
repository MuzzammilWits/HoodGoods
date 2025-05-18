import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom'; // To wrap components using <Link>
import '@testing-library/jest-dom'; // For DOM matchers like toBeInTheDocument
import { describe, it, expect } from 'vitest';

import OrderConfirmationPage from './OrderConfirmationPage'; // Adjust path if necessary

describe('OrderConfirmationPage', () => {
  // Helper function to render the component with MemoryRouter
  const renderWithRouter = (ui: React.ReactElement, { route = '/' } = {}) => {
    window.history.pushState({}, 'Test page', route);
    return render(ui, { wrapper: MemoryRouter });
  };

  it('should render the "Order Confirmed!" title', () => {
    renderWithRouter(<OrderConfirmationPage />);
    
    // Check for the heading by its role and text content
    const titleElement = screen.getByRole('heading', { name: /Order Confirmed!/i });
    expect(titleElement).toBeInTheDocument();
  });

  it('should render the confirmation message', () => {
    renderWithRouter(<OrderConfirmationPage />);
    
    // Check for the paragraph containing the specific message
    const messageElement = screen.getByText(/Thank you for your purchase. Your order is being processed./i);
    expect(messageElement).toBeInTheDocument();
  });

  it('should render the "Continue Shopping" link with the correct href', () => {
    renderWithRouter(<OrderConfirmationPage />);
    
    // Check for the link by its role and text content
    const continueShoppingLink = screen.getByRole('link', { name: /Continue Shopping/i });
    expect(continueShoppingLink).toBeInTheDocument();
    
    // Verify the 'to' prop (which translates to 'href' in the rendered <a> tag)
    expect(continueShoppingLink).toHaveAttribute('href', '/products');
  });

  it('should apply basic inline styles (example check for title color)', () => {
    renderWithRouter(<OrderConfirmationPage />);
    
    const titleElement = screen.getByRole('heading', { name: /Order Confirmed!/i });
    // Check a specific style property. Note: Testing exact style values can make tests brittle.
    // It's often better to test for classes if styles are in CSS files.
    // For inline styles, this is a direct way.
    expect(titleElement).toHaveStyle('color: rgb(46, 204, 113)'); // #2ecc71 in rgb
    // Or more generically:
    // expect(titleElement.style.color).toBe('rgb(46, 204, 113)');
  });

  it('should apply basic inline styles for the container (example check for display flex)', () => {
    renderWithRouter(<OrderConfirmationPage />);
    
    // The <main> element is the container in this component
    const containerElement = screen.getByRole('main');
    expect(containerElement).toHaveStyle('display: flex');
    expect(containerElement).toHaveStyle('justify-content: center');
  });
});
