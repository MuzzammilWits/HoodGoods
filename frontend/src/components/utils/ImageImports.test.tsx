// frontend/src/components/utils/ImageImports.test.tsx

import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';

// Mock the imported assets.
// Vite handles asset imports by providing a URL string as the default export.
vi.mock('../../assets/logo.svg', () => ({
  default: 'mocked-logo.svg',
}));
vi.mock('../../assets/jewellery.jpg', () => ({
  default: 'mocked-jewellery.jpg',
}));
vi.mock('../../assets/flowers.jpg', () => ({
  default: 'mocked-flowers.jpg',
}));
vi.mock('../../assets/honey.jpg', () => ({
  default: 'mocked-honey.jpg',
}));
vi.mock('../../assets/ceramics.jpg', () => ({
  default: 'mocked-ceramics.jpg',
}));
vi.mock('../../assets/marketplace.jpg', () => ({
  default: 'mocked-marketplace.jpg',
}));

// Import the items to be tested AFTER the mocks are set up.
// Vitest hoists vi.mock calls, so this is generally fine.
import {
  logo,
  jewelleryImg,
  flowerImg,
  honeyImg,
  ceramicsImg,
  marketplaceImg,
  getImage,
} from './ImageImports'; // Adjust path as necessary

describe('ImageImports', () => {
  describe('getImage function', () => {
    it('should render an img element with correct src and alt attributes', () => {
      const testSrc = 'test-image.png';
      const testAlt = 'A test image';
      // The getImage function returns a JSX element, so we render it.
      render(getImage(testSrc, testAlt));

      const imgElement = screen.getByRole('img');
      expect(imgElement).toBeInTheDocument();
      expect(imgElement).toHaveAttribute('src', testSrc);
      expect(imgElement).toHaveAttribute('alt', testAlt);
    });

    it('should pass width and height props to the img element when provided', () => {
      const testSrc = 'test-image-sized.png';
      const testAlt = 'A sized test image';
      const testWidth = 100;
      const testHeight = 50;
      render(getImage(testSrc, testAlt, testWidth, testHeight));

      const imgElement = screen.getByRole('img');
      expect(imgElement).toBeInTheDocument();
      expect(imgElement).toHaveAttribute('src', testSrc);
      expect(imgElement).toHaveAttribute('alt', testAlt);
      expect(imgElement).toHaveAttribute('width', testWidth.toString());
      expect(imgElement).toHaveAttribute('height', testHeight.toString());
    });

    it('should render an img element without width and height attributes when not provided', () => {
      const testSrc = 'test-image-unsized.png';
      const testAlt = 'An unsized test image';
      render(getImage(testSrc, testAlt));

      const imgElement = screen.getByRole('img');
      expect(imgElement).toBeInTheDocument();
      expect(imgElement).not.toHaveAttribute('width');
      expect(imgElement).not.toHaveAttribute('height');
    });
  });

  describe('Exported Image Variables', () => {
    it('should export "logo" as a string with the mocked path', () => {
      expect(typeof logo).toBe('string');
      expect(logo).toBe('mocked-logo.svg');
    });

    it('should export "jewelleryImg" as a string with the mocked path', () => {
      expect(typeof jewelleryImg).toBe('string');
      expect(jewelleryImg).toBe('mocked-jewellery.jpg');
    });

    it('should export "flowerImg" as a string with the mocked path', () => {
      expect(typeof flowerImg).toBe('string');
      expect(flowerImg).toBe('mocked-flowers.jpg');
    });

    it('should export "honeyImg" as a string with the mocked path', () => {
      expect(typeof honeyImg).toBe('string');
      expect(honeyImg).toBe('mocked-honey.jpg');
    });

    it('should export "ceramicsImg" as a string with the mocked path', () => {
      expect(typeof ceramicsImg).toBe('string');
      expect(ceramicsImg).toBe('mocked-ceramics.jpg');
    });

    it('should export "marketplaceImg" as a string with the mocked path', () => {
      expect(typeof marketplaceImg).toBe('string');
      expect(marketplaceImg).toBe('mocked-marketplace.jpg');
    });

    // A more concise way to check all at once for type and definition
    it('should export all image variables as defined strings', () => {
      const images = {
        logo,
        jewelleryImg,
        flowerImg,
        honeyImg,
        ceramicsImg,
        marketplaceImg,
      };
      for (const key in images) {
        expect(images[key as keyof typeof images]).toBeDefined();
        expect(typeof images[key as keyof typeof images]).toBe('string');
      }
    });
  });
});