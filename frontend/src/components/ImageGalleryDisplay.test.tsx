import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest'; // For extended Vitest matchers
import ImageGalleryDisplay from './ImageGalleryDisplay'; // Adjust the import path as needed

describe('ImageGalleryDisplay Component', () => {
  const mockImageUrls = [
    'https://example.com/image1.jpg',
    'https://example.com/image2.png',
    'https://example.com/image3.gif',
  ];

  it('should render null if galleryImages is empty', () => {
    const { container } = render(<ImageGalleryDisplay galleryImages={[]} />);
    // The component should return null, so the container should be empty.
    expect(container.firstChild).toBeNull();
  });

  it('should render the title when images are provided', () => {
    render(<ImageGalleryDisplay galleryImages={mockImageUrls} />);
    expect(screen.getByText('Recently Uploaded Images (via Supabase)')).toBeInTheDocument();
  });

  it('should render the correct number of images', () => {
    render(<ImageGalleryDisplay galleryImages={mockImageUrls} />);
    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(mockImageUrls.length);
  });

  it('should render images with correct src and alt attributes', () => {
    render(<ImageGalleryDisplay galleryImages={mockImageUrls} />);
    const images = screen.getAllByRole('img');

    images.forEach((img, index) => {
      expect(img).toHaveAttribute('src', mockImageUrls[index]);
      expect(img).toHaveAttribute('alt', `Gallery item ${index + 1}`);
    });
  });

  it('should apply inline styles to images (basic check for existence of style attribute)', () => {
    render(<ImageGalleryDisplay galleryImages={mockImageUrls.slice(0, 1)} />); // Test with one image for simplicity
    const image = screen.getByRole('img');
    expect(image).toHaveAttribute('style');
    // More specific style checks can be brittle, but you can do them if necessary:
    // expect(image.style.width).toBe('100%');
    // expect(image.style.height).toBe('150px');
    // expect(image.style.objectFit).toBe('cover');
    // expect(image.style.borderRadius).toBe('4px');
  });

  it('should apply inline styles to the section and figure elements', () => {
    const { container } = render(<ImageGalleryDisplay galleryImages={mockImageUrls} />);
    
    // Check section style
    const sectionElement = container.querySelector('section');
    expect(sectionElement).toHaveStyle('margin: 2rem 0px');

    // Check figure style
    const figureElement = container.querySelector('figure');
    expect(figureElement).toHaveStyle('display: grid');
    expect(figureElement).toHaveStyle('grid-template-columns: repeat(auto-fill, minmax(150px, 1fr))');
    expect(figureElement).toHaveStyle('gap: 1rem');
  });


  // Snapshot tests
  it('should match snapshot when galleryImages is empty (renders null)', () => {
    const { container } = render(<ImageGalleryDisplay galleryImages={[]} />);
    expect(container.firstChild).toMatchSnapshot(); // Will be null
  });

  it('should match snapshot when images are provided', () => {
    const { container } = render(<ImageGalleryDisplay galleryImages={mockImageUrls} />);
    expect(container.firstChild).toMatchSnapshot();
  });
});

