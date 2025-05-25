import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom'; // Still useful for DOM assertions
import { vi, beforeEach, describe, it, expect } from 'vitest'; 
import ImageGallery from './ImageGallery'; 

// --- Mock Supabase Client for Vitest ---

// These are the top-level mock function instances that your tests will interact with.
const mockSupabaseList = vi.fn();

const mockSupabaseFrom = vi.fn((_bucketName: string) => ({
  list: mockSupabaseList,
}));

// Mock the Supabase client module.
// The factory function is hoisted.
vi.mock('../supabaseClient', () => {
  // This factory function returns the structure of the mocked module.
  return {
    __esModule: true,
    default: {
      storage: {
        // Define 'from' as a function that matches the expected signature.
        // supabase.storage.from() takes one string argument (bucketName).
        // This calls our top-level `mockSupabaseFrom` with the specific argument.
        from: (bucketName: string) => mockSupabaseFrom(bucketName),
      },
    },
  };
});
// --- End Mock Supabase Client ---

describe('ImageGallery', () => {
  // Base URL prefix for constructing image URLs, matching the component.
  const SUPABASE_URL_PREFIX = 'https://euudlgzarnvbsvzlizcu.supabase.co/storage/v1/object/public/images/uploads/';

  // Clear mock call history before each test to ensure test isolation.
  beforeEach(() => {
    mockSupabaseFrom.mockClear();
    mockSupabaseList.mockClear();
  });

  it('should render the main figure container initially', () => {
    // Mock an empty response to prevent errors during initial render if fetch occurs quickly.
    mockSupabaseList.mockResolvedValueOnce({ data: [], error: null });
    render(<ImageGallery />);

    // Check if the main container (<figure>) is rendered.
    expect(screen.getByRole('figure')).toBeInTheDocument();
    // Initially, before useEffect completes or if data is empty, no images should be rendered.
    expect(screen.queryAllByRole('img')).toHaveLength(0);
  });

  it('should fetch images from Supabase and display them correctly', async () => {
    // Define mock image data that Supabase would return.
    const mockImagesData = [
      { name: 'image1.jpg', id: 'id1', updated_at: '', created_at: '', last_accessed_at: '', metadata: {} },
      { name: 'image2.png', id: 'id2', updated_at: '', created_at: '', last_accessed_at: '', metadata: {} },
    ];
    // Configure the mock 'list' function to resolve with our mock data.
    mockSupabaseList.mockResolvedValueOnce({ data: mockImagesData, error: null });

    render(<ImageGallery />);

    // Wait for the component to finish fetching and rendering the images.
    await waitFor(() => {
      // Expect the number of rendered images to match our mock data.
      expect(screen.getAllByRole('img')).toHaveLength(mockImagesData.length);
    });

    // Verify each image is rendered with the correct src, alt, and styles.
    const displayedImages = screen.getAllByRole('img');
    mockImagesData.forEach((mockImageItem) => {
      const expectedSrc = `${SUPABASE_URL_PREFIX}${mockImageItem.name}`;
      // Find the image element by its src attribute.
      const imageElement = displayedImages.find(img => img.getAttribute('src') === expectedSrc);
      
      expect(imageElement).toBeInTheDocument();
      if (imageElement) { // TypeScript type guard
        expect(imageElement).toHaveAttribute('alt', 'Gallery image from storage');
        expect(imageElement).toHaveStyle('width: 150px');
        expect(imageElement).toHaveStyle('height: 150px');
        expect(imageElement).toHaveStyle('object-fit: cover');
      }
    });

    // Verify that the Supabase client methods were called as expected.
    expect(mockSupabaseFrom).toHaveBeenCalledWith('images');
    expect(mockSupabaseList).toHaveBeenCalledWith('uploads');
  });

  it('should handle an empty list of images from Supabase', async () => {
    // Configure the mock 'list' function to resolve with an empty data array.
    mockSupabaseList.mockResolvedValueOnce({ data: [], error: null });

    render(<ImageGallery />);

    // Wait for the fetch operation to complete.
    await waitFor(() => {
      // Check that the list method was called, even if it returned no items.
      expect(mockSupabaseList).toHaveBeenCalledWith('uploads');
    });

    // Assert that no <img> elements are rendered.
    expect(screen.queryAllByRole('img')).toHaveLength(0);
  });

  it('should handle a fetch error from Supabase', async () => {
    // Configure the mock 'list' function to resolve with an error.
    mockSupabaseList.mockResolvedValueOnce({ data: null, error: { message: 'Failed to fetch' } });
    // Spy on console.error before rendering
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<ImageGallery />);

    // Wait for the fetch operation to complete.
    await waitFor(() => {
      // Check that the list method was called.
      expect(mockSupabaseList).toHaveBeenCalledWith('uploads');
    });

    // Since the component doesn't explicitly render an error message,
    // we expect no images to be rendered in case of an error.
    expect(screen.queryAllByRole('img')).toHaveLength(0);
    
    // Clean up the spy
    consoleErrorSpy.mockRestore();
  });
});
