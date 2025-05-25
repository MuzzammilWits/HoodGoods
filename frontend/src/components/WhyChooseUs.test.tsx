import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import WhyChooseUs from './WhyChooseUs'; // Adjust the import path as needed


// --- Test Suite for WhyChooseUs Component ---
describe('WhyChooseUs Component', () => {
  let container: HTMLElement;

  beforeEach(() => {
    const { container: renderedContainer } = render(<WhyChooseUs />);
    container = renderedContainer;
  });

  // Test 1: Check if the "About Us" section is rendered correctly
  it('should render the "About Us" section with heading and text', () => {
    // Check for the "About Us" heading
    expect(screen.getByRole('heading', { name: /about us/i, level: 2 })).toBeInTheDocument();

    // Check for a snippet of the "About Us" text
    expect(screen.getByText(/HoodsGoods is a vibrant marketplace/i)).toBeInTheDocument();
    expect(screen.getByText(/you're investing in a community of makers/i)).toBeInTheDocument();
  });

  // Test 2: Check if the "Why Choose Us?" section is rendered correctly
  it('should render the "Why Choose Us?" section with heading', () => {
    // Check for the "Why Choose Us?" heading
    expect(screen.getByRole('heading', { name: /why choose us\?/i, level: 2 })).toBeInTheDocument();
  });

  // Test 3: Check if all features are rendered with their titles and descriptions
  it('should render all four features with correct titles and descriptions', () => {
    const features = [
      {
        title: 'Secure & Trusted Shopping',
        description: 'Shop with confidence. We use secure payment gateways and prioritize your privacy for a safe online experience.',
      },
      {
        title: 'Truly Handmade Treasures',
        description: 'Discover one-of-a-kind items crafted with passion and skill by talented artisans right here in South Africa.',
      },
      {
        title: 'Careful & Reliable Delivery',
        description: 'Your handmade items are packed with care and shipped reliably to your choice of pickup points. Choose the best delivery option for you at checkout.',
      },
      {
        title: 'Easy to Shop',
        description: 'Browse, discover, and buy with ease. Our clean, simple interface makes finding something special a breeze.',
      },
    ];

    features.forEach((feature) => {
      // Check for the feature title
      const featureTitle = screen.getByRole('heading', { name: feature.title, level: 3 });
      expect(featureTitle).toBeInTheDocument();

      // Check for the feature description
      expect(screen.getByText(feature.description)).toBeInTheDocument();

      // Check for the presence of an SVG icon within the feature
      const featureArticle = featureTitle.closest('article.selling-point-item');
      expect(featureArticle).not.toBeNull();
      if (featureArticle) {
        const svgElement = featureArticle.querySelector('svg');
        expect(svgElement).toBeInTheDocument();
      }
    });

    // Ensure exactly four features are rendered
    const featureArticles = screen.getAllByRole('article');
    const actualFeatures = Array.from(featureArticles).filter(article => article.classList.contains('selling-point-item'));
    expect(actualFeatures).toHaveLength(4);
  });

  // Test 4: Check for specific SVG elements to ensure icons are rendering
  it('should render specific SVG elements for each feature icon', () => {
    // Icon 1: Secure & Trusted Shopping (Clock icon)
    const secureShoppingFeature = screen.getByRole('heading', { name: 'Secure & Trusted Shopping' }).closest('article');
    expect(secureShoppingFeature?.querySelector('svg circle')).toBeInTheDocument();
    expect(secureShoppingFeature?.querySelector('svg polyline')).toBeInTheDocument();

    // Icon 2: Truly Handmade Treasures (Tag icon)
    const handmadeFeature = screen.getByRole('heading', { name: 'Truly Handmade Treasures' }).closest('article');
    expect(handmadeFeature?.querySelector('svg path[d*="M20.59"]')).toBeInTheDocument();
    expect(handmadeFeature?.querySelector('svg line[x1="7"]')).toBeInTheDocument();

    // Icon 3: Careful & Reliable Delivery (Credit Card/Package icon)
    const deliveryFeature = screen.getByRole('heading', { name: 'Careful & Reliable Delivery' }).closest('article');
    expect(deliveryFeature?.querySelector('svg rect[width="22"]')).toBeInTheDocument();
    expect(deliveryFeature?.querySelector('svg line[x1="1"][y1="10"]')).toBeInTheDocument();

    // Icon 4: Easy to Shop (List icon)
    const easyShopFeature = screen.getByRole('heading', { name: 'Easy to Shop' }).closest('article');
    expect(easyShopFeature?.querySelector('svg line[x1="8"][y1="6"]')).toBeInTheDocument();
    expect(easyShopFeature?.querySelector('svg line[x1="3"][y1="6"]')).toBeInTheDocument();
  });

  // Test 5: Snapshot test to ensure UI consistency
  it('should match the snapshot', () => {
    expect(container).toMatchSnapshot();
  });

  // Test 6: Check for the 'id' attribute on the main section
  it('should have the id "about-us" on the main section element', () => {
    const mainSection = container.querySelector('section.why-choose-us-container');
    expect(mainSection).not.toBeNull();
    if (mainSection) {
      expect(mainSection.id).toBe('about-us');
    }
  });

  // Test 7: Verify the list structure for features
  it('should render features within an unordered list (ul) and list items (li)', () => {
    const whyChooseUsSection = screen.getByRole('heading', { name: /why choose us\?/i, level: 2 }).closest('section');
    expect(whyChooseUsSection).not.toBeNull();

    if (whyChooseUsSection) {
      const listElement = whyChooseUsSection.querySelector('ul.selling-points-grid');
      expect(listElement).toBeInTheDocument();

      const listItems = whyChooseUsSection.querySelectorAll('ul.selling-points-grid > li');
      expect(listItems.length).toBe(4); // Assuming there are always 4 features

      listItems.forEach(item => {
        expect(item.querySelector('article.selling-point-item')).toBeInTheDocument();
      });
    }
  });
});
