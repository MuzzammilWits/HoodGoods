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

  it('should render the title with the correct class for styling', () => {
    renderWithRouter(<OrderConfirmationPage />);
    
    const titleElement = screen.getByRole('heading', { name: /Order Confirmed!/i });
  
    // Expect the title to have the class that applies the color in CSS
    expect(titleElement).toHaveClass('title');
  });

  it('should apply the correct container class for layout styling', () => {
    renderWithRouter(<OrderConfirmationPage />);
    
    const containerElement = screen.getByRole('main');
    expect(containerElement).toHaveClass('order-confirmation-container');
  });

  it('should render the main container using a semantic <main> tag', () => {
    renderWithRouter(<OrderConfirmationPage />);
    const mainElement = screen.getByRole('main');
    expect(mainElement).toBeInTheDocument();
  });

  it('should render the "Continue Shopping" link styled as a button and navigate correctly', () => {
    renderWithRouter(<OrderConfirmationPage />);
    const link = screen.getByRole('link', { name: /Continue Shopping/i });
    expect(link).toHaveAttribute('href', '/products');
    expect(link).toHaveClass('continue-shopping-button');
  });
});
