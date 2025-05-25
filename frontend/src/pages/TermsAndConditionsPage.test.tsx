import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import TermsAndConditionsPage from './TermsAndConditionsPage';

// Helper function to render the component within MemoryRouter
const renderWithRouter = () => {
  return render(
    <MemoryRouter>
      <TermsAndConditionsPage />
    </MemoryRouter>
  );
};

describe('TermsAndConditionsPage', () => {

  it('should render the main heading and last updated date', () => {
    renderWithRouter();

    // Check for the main H1 heading
    const mainHeading = screen.getByRole('heading', { 
      level: 1, 
      name: /Terms and Conditions for HoodsGoods/i 
    });
    expect(mainHeading).toBeInTheDocument();

    // **FIX:** Check for the two parts of the text separately.
    // This is more robust and ignores the <strong> tag.
    expect(screen.getByText(/Last Updated:/i)).toBeInTheDocument();
    expect(screen.getByText(/May 24, 2025/i)).toBeInTheDocument();
  });

  it('should render all section headings correctly', () => {
    renderWithRouter();
    
    const expectedHeadings = [
      /1. Acceptance of Terms/i,
      /2. User Accounts/i,
      /3. Use of the Platform/i,
      /4. Content and Intellectual Property/i,
      /5. Seller Specific Terms/i,
      /6. Purchases and Payments/i,
      /7. Delivery System/i,
      /8. Disclaimers/i,
      /9. Limitation of Liability/i,
      /10. Indemnification/i,
      /11. Termination/i,
      /12. Governing Law/i,
      /13. Changes to Terms/i,
      /14. Contact Information/i,
    ];

    expectedHeadings.forEach(headingText => {
      const headingElement = screen.getByRole('heading', { level: 2, name: headingText });
      expect(headingElement).toBeInTheDocument();
    });
  });

  it('should display the contact email address', () => {
    renderWithRouter();

    // **FIX:** Use a regular expression instead of a plain string.
    // This is more flexible and handles surrounding whitespace or nodes.
    const emailElement = screen.getByText(/legal@hoodsgoods.example.com/i);
    expect(emailElement).toBeInTheDocument();
  });

  it('should contain a link to the Privacy Policy page', () => {
    renderWithRouter();

    const privacyPolicyLink = screen.getByRole('link', { name: /Privacy Policy/i });
    
    expect(privacyPolicyLink).toBeInTheDocument();
    expect(privacyPolicyLink).toHaveAttribute('href', '/privacy-policy');
  });

  it('should render the introductory paragraph', () => {
    renderWithRouter();

    const introParagraph = screen.getByText(/Welcome to HoodsGoods!/i);
    expect(introParagraph).toBeInTheDocument();
  });

  it('should render the list of prohibited conduct', () => {
    renderWithRouter();

    const violatingLaws = screen.getByText(/Violating any applicable laws or regulations./i);
    const divertingUsers = screen.getByText(/Attempting to divert users or transactions off-platform./i);
    
    expect(violatingLaws).toBeInTheDocument();
    expect(divertingUsers).toBeInTheDocument();
  });

});