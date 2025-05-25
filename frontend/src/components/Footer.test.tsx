import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom'; // To wrap components using <Link>
import Footer from './Footer'; // Adjust the import path as needed

// --- Mocks ---

// Mock the logo import
vi.mock('./utils/ImageImports', () => ({
  logo: 'mock-logo.svg',
}));

// Mock window.scrollTo
const mockScrollTo = vi.fn();

describe('Footer Component', () => {
  let originalScrollTo: typeof window.scrollTo;

  beforeEach(() => {
    // Store original and assign mock
    originalScrollTo = window.scrollTo;
    window.scrollTo = mockScrollTo;

    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>
    );
  });

  afterEach(() => {
    // Restore original
    window.scrollTo = originalScrollTo;
    vi.clearAllMocks();
  });

  // Test 1: Basic rendering of essential elements
  it('should render the footer logo, social icons, and copyright text', () => {
    // Check for the logo
    const logoImg = screen.getByAltText('Hood Goods');
    expect(logoImg).toBeInTheDocument();
    expect(logoImg).toHaveAttribute('src', 'mock-logo.svg');

    // Check for social icons (by aria-label)
    expect(screen.getByLabelText('Facebook')).toBeInTheDocument();
    expect(screen.getByLabelText('Twitter')).toBeInTheDocument();
    expect(screen.getByLabelText('Instagram')).toBeInTheDocument();

    // Check for copyright text
    expect(screen.getByText(/Copyright ©HoodsGoods/i)).toBeInTheDocument();
  });

  // Test 2: "Back to Top" button functionality
  it('should render the "Back to Top" button and call window.scrollTo on click', () => {
    const backToTopButton = screen.getByRole('button', { name: /back to top/i });
    expect(backToTopButton).toBeInTheDocument();

    fireEvent.click(backToTopButton);
    expect(mockScrollTo).toHaveBeenCalledTimes(1);
    expect(mockScrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });

  // Test 3: Social media links properties
  it('should render social media links with correct href, target, and rel attributes', () => {
    const socialLinks = [
      { label: 'Facebook', href: 'https://www.youtube.com/watch?v=xvFZjo5PgG0' },
      { label: 'Twitter', href: 'https://www.youtube.com/watch?v=xvFZjo5PgG0' },
      { label: 'Instagram', href: 'https://www.youtube.com/watch?v=xvFZjo5PgG0' },
    ];

    socialLinks.forEach(linkInfo => {
      const linkElement = screen.getByLabelText(linkInfo.label);
      expect(linkElement).toBeInTheDocument();
      expect(linkElement).toHaveAttribute('href', linkInfo.href);
      expect(linkElement).toHaveAttribute('target', '_blank');
      expect(linkElement).toHaveAttribute('rel', 'noopener noreferrer');
      // Check for SVG presence within the link
      expect(linkElement.querySelector('svg')).toBeInTheDocument();
    });
  });

  // Test 4: Footer navigation links
  it('should render footer navigation links for Terms & Conditions and Privacy Policy', () => {
    const termsLink = screen.getByRole('link', { name: /terms & conditions/i });
    expect(termsLink).toBeInTheDocument();
    expect(termsLink).toHaveAttribute('href', '/terms-and-conditions');

    const privacyLink = screen.getByRole('link', { name: /privacy policy/i });
    expect(privacyLink).toBeInTheDocument();
    expect(privacyLink).toHaveAttribute('href', '/privacy-policy');
  });

  // Test 5: Presence of the decorative SVG divider
  it('should render the decorative SVG section divider', () => {
    const dividerSvg = document.querySelector('.section-divider svg'); // More specific selector
    expect(dividerSvg).toBeInTheDocument();
    expect(dividerSvg?.querySelector('path[d*="M0,100 L 0,40"]')).toBeInTheDocument(); // Check for part of the path
  });

  // Test 6: Presence of the horizontal rule divider
  it('should render the horizontal rule divider', () => {
    const hrElement = screen.getByRole('separator', { hidden: true }); // hr has implicit role separator
    expect(hrElement).toBeInTheDocument();
    expect(hrElement).toHaveClass('footer-divider');
  });

  // Test 7: Snapshot test for overall structure
  it('should match the snapshot', () => {
    const { container } = render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>
    );
    expect(container.firstChild).toMatchSnapshot();
  });
});
