
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom'; // Import BrowserRouter
import { describe, it, expect, vi } from 'vitest';
import Footer from './Footer';

// Mock the ImageImports module based on its actual structure
// logo is a direct string import (e.g., path to an image)
vi.mock('./utils/ImageImports', () => ({
  logo: 'mocked-logo-path.svg', // This will be the src for the img
  // We don't need to mock other images like jewelleryImg unless Footer uses them
}));

describe('Footer Component', () => {
  // Helper function to render the component within BrowserRouter if any links might use it
  // Although these are hash links, it's good practice if other links might be real routes.
  const renderFooter = () => {
    render(
      <BrowserRouter>
        <Footer />
      </BrowserRouter>
    );
  };

  beforeEach(() => {
    renderFooter();
  });

  it('renders the footer element with the correct class', () => {
    const footerElement = screen.getByRole('contentinfo'); // <footer> has a role of contentinfo
    expect(footerElement).toBeInTheDocument();
    expect(footerElement).toHaveClass('footer');
  });

  it('renders the main logo with correct src and alt text', () => {
    const logoImage = screen.getByRole('img', { name: /Hood Goods/i });
    expect(logoImage).toBeInTheDocument();
    expect(logoImage).toHaveAttribute('src', 'mocked-logo-path.svg');
    expect(logoImage).toHaveClass('logo');
  });

  describe('Footer Main Section', () => {
    it('contains the main content wrapper', () => {
      const footerMain = document.querySelector('.footer-main');
      expect(footerMain).toBeInTheDocument();
      const container = footerMain?.querySelector('.container');
      expect(container).toBeInTheDocument();
      const footerContent = container?.querySelector('.footer-content');
      expect(footerContent).toBeInTheDocument();
    });
  });

  describe('Footer Menu Navigation', () => {
    let menuNav: HTMLElement;

    beforeEach(() => {
      menuNav = screen.getByRole('navigation', { name: /Footer Menu/i });
    });

    it('renders the "Menu" heading', () => {
      // The heading is within the nav, so we can find it relative to the nav
      const heading = screen.getByRole('heading', { name: /Menu/i, level: 3 });
      expect(menuNav).toContainElement(heading);
    });

    it('renders all primary menu links with correct text and href attributes', () => {
      const links = [
        { name: /Shop/i, href: '#shop' },
        { name: /Product/i, href: '#product' },
        { name: /About us/i, href: '#about-us' },
        { name: /Become a seller/i, href: '#become-seller' },
      ];

      links.forEach(linkInfo => {
        const linkElement = screen.getByRole('link', { name: linkInfo.name });
        expect(linkElement).toBeInTheDocument();
        expect(linkElement).toHaveAttribute('href', linkInfo.href);
        expect(menuNav).toContainElement(linkElement); // Ensure link is within the correct nav
      });
    });
  });

  describe('Social Links Navigation', () => {
    let socialNav: HTMLElement;

    beforeEach(() => {
      socialNav = screen.getByRole('navigation', { name: /Social Links/i });
    });

    it('renders the "Social" heading', () => {
      // The heading is not inside the social links nav, but in the section containing it
      const socialHeadingSection = socialNav.closest('.footer-social');
      expect(socialHeadingSection).toBeInTheDocument();
      const heading = screen.getByRole('heading', { name: /Social/i, level: 3 });
      expect(socialHeadingSection).toContainElement(heading);
    });

    it('renders social media links with correct aria-labels, href, and SVGs', () => {
      const socialLinks = [
        { label: /Facebook/i, href: '#facebook' },
        { label: /Twitter/i, href: '#twitter' },
        { label: /Instagram/i, href: '#instagram' },
      ];

      socialLinks.forEach(linkInfo => {
        const linkElement = screen.getByRole('link', { name: linkInfo.label });
        expect(linkElement).toBeInTheDocument();
        expect(linkElement).toHaveAttribute('href', linkInfo.href);
        expect(linkElement).toHaveClass('social-icon');
        expect(linkElement.querySelector('svg')).toBeInTheDocument();
        expect(socialNav).toContainElement(linkElement); // Ensure link is within the correct nav
      });
    });
  });

  describe('Footer Bottom Section', () => {
    it('contains the bottom content wrapper', () => {
      const footerBottom = document.querySelector('.footer-bottom');
      expect(footerBottom).toBeInTheDocument();
      const container = footerBottom?.querySelector('.container');
      expect(container).toBeInTheDocument();
      const footerBottomContent = container?.querySelector('.footer-bottom-content');
      expect(footerBottomContent).toBeInTheDocument();
    });

    it('renders the copyright text', () => {
      const copyrightText = screen.getByText((content, element) => {
        return element?.tagName.toLowerCase() === 'p' && element.classList.contains('copyright') && /Copyright HoodsGoods/i.test(content);
      });
      expect(copyrightText).toBeInTheDocument();
    });

    it('renders "Terms & Conditions" and "Privacy Policy" links with correct href attributes', () => {
      const footerLinksNav = screen.getByRole('navigation', { name: /Footer Links/i });
      expect(footerLinksNav).toBeInTheDocument();

      const termsLink = screen.getByRole('link', { name: /Terms & Conditions/i });
      expect(termsLink).toBeInTheDocument();
      expect(termsLink).toHaveAttribute('href', '#terms');
      expect(footerLinksNav).toContainElement(termsLink);

      const privacyLink = screen.getByRole('link', { name: /Privacy Policy/i });
      expect(privacyLink).toBeInTheDocument();
      expect(privacyLink).toHaveAttribute('href', '#privacy');
      expect(footerLinksNav).toContainElement(privacyLink);
    });
  });

  it('verifies the presence of key structural classes from Footer.css', () => {
    // Check for classes from Footer.css that define major layout blocks
    // This complements the semantic structure tests
    expect(document.querySelector('.footer-logo .logo')).toBeInTheDocument();
    expect(document.querySelector('.footer-menu ul')).toBeInTheDocument();
    expect(document.querySelector('.social-icons')).toBeInTheDocument();
    expect(document.querySelector('.footer-links')).toBeInTheDocument();
  });
});