// frontend/src/pages/__tests__/RecommendationsPage.test.tsx

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import RecommendationsPage from './RecommendationsPage';

// Mock the BestSellersList component
vi.mock('../components/recommendations/BestSellersList', () => ({
  default: vi.fn(({ title, limit, timeWindowDays }) => (
    <div data-testid="best-sellers-list">
      <h2>{title}</h2>
      <p>Limit: {limit}</p>
      <p>Time Window: {timeWindowDays} days</p>
    </div>
  ))
}));

// Mock the Cart Context to avoid provider errors
vi.mock('../context/ContextCart', () => ({
  useCart: vi.fn(() => ({
    cartItems: [],
    addToCart: vi.fn(),
    removeFromCart: vi.fn(),
    updateQuantity: vi.fn(),
    clearCart: vi.fn(),
    getCartTotal: vi.fn(() => 0),
    getCartItemsCount: vi.fn(() => 0)
  }))
}));

// Mock react-router-dom navigate function
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Helper function to render component with router
const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('RecommendationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Page Structure and Content', () => {
    it('renders the main page container with correct class', () => {
      renderWithRouter(<RecommendationsPage />);
      
      const mainContainer = screen.getByRole('main');
      expect(mainContainer).toBeInTheDocument();
      expect(mainContainer).toHaveClass('recommendations-page-container');
    });

    it('displays the main title and subtitle', () => {
      renderWithRouter(<RecommendationsPage />);
      
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Discover Products You Might Like');
      expect(screen.getByText('Based on current trends and popular items.')).toBeInTheDocument();
    });

    it('applies correct CSS classes to title elements', () => {
      renderWithRouter(<RecommendationsPage />);
      
      const title = screen.getByRole('heading', { level: 1 });
      const subtitle = screen.getByText('Based on current trends and popular items.');
      
      expect(title).toHaveClass('main-titles');
      expect(subtitle).toHaveClass('main-titles-sub');
    });

    it('renders the back button with correct text and class', () => {
      renderWithRouter(<RecommendationsPage />);
      
      const backButton = screen.getByRole('button', { name: /back to products/i });
      expect(backButton).toBeInTheDocument();
      expect(backButton).toHaveClass('back-button');
    });

    it('renders back button container with correct class', () => {
      renderWithRouter(<RecommendationsPage />);
      
      const backButtonContainer = screen.getByRole('button').closest('section');
      expect(backButtonContainer).toHaveClass('back-button-container');
    });
  });

  describe('BestSellersList Components', () => {
    it('renders two BestSellersList components', () => {
      renderWithRouter(<RecommendationsPage />);
      
      const bestSellersLists = screen.getAllByTestId('best-sellers-list');
      expect(bestSellersLists).toHaveLength(2);
    });

    it('renders monthly top selling products section with correct props', () => {
      renderWithRouter(<RecommendationsPage />);
      
      const monthlySection = screen.getByText('Top Selling Products This Month').closest('[data-testid="best-sellers-list"]');
      
      expect(monthlySection).toBeInTheDocument();
      expect(screen.getByText('Top Selling Products This Month')).toBeInTheDocument();
      expect(screen.getByText('Limit: 12')).toBeInTheDocument();
      expect(screen.getByText('Time Window: 30 days')).toBeInTheDocument();
    });

    it('renders weekly trending products section with correct props', () => {
      renderWithRouter(<RecommendationsPage />);
      
      const weeklySection = screen.getByText('Trending This Week').closest('[data-testid="best-sellers-list"]');
      
      expect(weeklySection).toBeInTheDocument();
      expect(screen.getByText('Trending This Week')).toBeInTheDocument();
      expect(screen.getByText('Limit: 8')).toBeInTheDocument();
      expect(screen.getByText('Time Window: 7 days')).toBeInTheDocument();
    });

    it('applies correct CSS classes to recommendation sections', () => {
      renderWithRouter(<RecommendationsPage />);
      
      const sections = screen.getAllByTestId('best-sellers-list').map(list => 
        list.closest('section')
      );
      
      sections.forEach(section => {
        expect(section).toHaveClass('recommendation-section');
      });
    });
  });

  describe('Navigation Functionality', () => {
    it('navigates to products page when back button is clicked', () => {
      renderWithRouter(<RecommendationsPage />);
      
      const backButton = screen.getByRole('button', { name: /back to products/i });
      fireEvent.click(backButton);
      
      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith('/products');
    });

    it('back button is clickable and accessible', () => {
      renderWithRouter(<RecommendationsPage />);
      
      const backButton = screen.getByRole('button', { name: /back to products/i });
      expect(backButton).toBeEnabled();
      expect(backButton).toBeVisible();
    });
  });

  describe('Styling and Layout', () => {
    it('applies inline styles to main container', () => {
      renderWithRouter(<RecommendationsPage />);
      
      const mainContainer = screen.getByRole('main');
      expect(mainContainer).toHaveStyle({
        paddingTop: '20px',
        paddingBottom: '20px'
      });
    });

    it('applies margin top to the second recommendation section', () => {
      renderWithRouter(<RecommendationsPage />);
      
      const sections = screen.getAllByTestId('best-sellers-list').map(list => 
        list.closest('section')
      );
      
      // The second section should have marginTop style
      expect(sections[1]).toHaveStyle({ marginTop: '40px' });
    });
  });

  describe('Accessibility', () => {
    it('uses semantic HTML elements correctly', () => {
      renderWithRouter(<RecommendationsPage />);
      
      // Check for main landmark
      expect(screen.getByRole('main')).toBeInTheDocument();
      
      // Check for heading hierarchy
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      
      // Check for button
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('has proper heading structure', () => {
      renderWithRouter(<RecommendationsPage />);
      
      const headings = screen.getAllByRole('heading');
      
      // Should have main h1 and two h2s from BestSellersList components
      expect(headings).toHaveLength(3);
      expect(headings[0]).toHaveProperty('tagName', 'H1');
      expect(headings[1]).toHaveProperty('tagName', 'H2');
      expect(headings[2]).toHaveProperty('tagName', 'H2');
    });
  });

  describe('Component Integration', () => {
    it('passes correct props to first BestSellersList component', async () => {
      const BestSellersList = vi.mocked(
        (await import('../components/recommendations/BestSellersList')).default
      );
      
      renderWithRouter(<RecommendationsPage />);
      
      // Check that the component was called with the monthly props (first call)
      expect(BestSellersList).toHaveBeenNthCalledWith(1,
        expect.objectContaining({
          limit: 12,
          timeWindowDays: 30,
          title: 'Top Selling Products This Month'
        }),
        undefined  // React ref parameter
      );
    });

    it('passes correct props to second BestSellersList component', async () => {
      const BestSellersList = vi.mocked(
        (await import('../components/recommendations/BestSellersList')).default
      );
      
      renderWithRouter(<RecommendationsPage />);
      
      // Check that the component was called with the weekly props (second call)
      expect(BestSellersList).toHaveBeenNthCalledWith(2,
        expect.objectContaining({
          limit: 8,
          timeWindowDays: 7,
          title: 'Trending This Week'
        }),
        undefined  // React ref parameter
      );
    });

    it('calls BestSellersList component exactly twice', async () => {
      const BestSellersList = vi.mocked(
        (await import('../components/recommendations/BestSellersList')).default
      );
      
      renderWithRouter(<RecommendationsPage />);
      
      expect(BestSellersList).toHaveBeenCalledTimes(2);
    });

    it('verifies all props are passed correctly to both components', async () => {
      const BestSellersList = vi.mocked(
        (await import('../components/recommendations/BestSellersList')).default
      );
      
      renderWithRouter(<RecommendationsPage />);
      
      // Verify first call (monthly)
      expect(BestSellersList).toHaveBeenNthCalledWith(1,
        expect.objectContaining({
          limit: 12,
          timeWindowDays: 30,
          title: 'Top Selling Products This Month'
        }),
        undefined
      );
      
      // Verify second call (weekly)
      expect(BestSellersList).toHaveBeenNthCalledWith(2,
        expect.objectContaining({
          limit: 8,
          timeWindowDays: 7,
          title: 'Trending This Week'
        }),
        undefined
      );
    });
  });

  describe('Error Handling', () => {
    it('renders without crashing when BestSellersList is mocked', () => {
      expect(() => {
        renderWithRouter(<RecommendationsPage />);
      }).not.toThrow();
    });

    it('handles component rendering gracefully', () => {
      const { container } = renderWithRouter(<RecommendationsPage />);
      expect(container).toBeInTheDocument();
    });
  });

  describe('Component Lifecycle', () => {
    it('unmounts without errors', () => {
      const { unmount } = renderWithRouter(<RecommendationsPage />);
      
      expect(() => {
        unmount();
      }).not.toThrow();
    });

    it('re-renders correctly when props change', () => {
      const { rerender } = renderWithRouter(<RecommendationsPage />);
      
      expect(() => {
        rerender(
          <BrowserRouter>
            <RecommendationsPage />
          </BrowserRouter>
        );
      }).not.toThrow();
      
      // Verify content is still there after re-render
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Discover Products You Might Like');
    });
  });

  describe('Component Props Validation', () => {
    it('verifies BestSellersList receives all required props', () => {
      renderWithRouter(<RecommendationsPage />);
      
      const bestSellersLists = screen.getAllByTestId('best-sellers-list');
      
      // First component (monthly)
      expect(bestSellersLists[0]).toHaveTextContent('Top Selling Products This Month');
      expect(bestSellersLists[0]).toHaveTextContent('Limit: 12');
      expect(bestSellersLists[0]).toHaveTextContent('Time Window: 30 days');
      
      // Second component (weekly)
      expect(bestSellersLists[1]).toHaveTextContent('Trending This Week');
      expect(bestSellersLists[1]).toHaveTextContent('Limit: 8');
      expect(bestSellersLists[1]).toHaveTextContent('Time Window: 7 days');
    });

    it('ensures different configurations for each BestSellersList', () => {
      renderWithRouter(<RecommendationsPage />);
      
      const bestSellersLists = screen.getAllByTestId('best-sellers-list');
      
      // Verify they have different configurations
      expect(bestSellersLists[0]).toHaveTextContent('Limit: 12');
      expect(bestSellersLists[1]).toHaveTextContent('Limit: 8');
      
      expect(bestSellersLists[0]).toHaveTextContent('Time Window: 30 days');
      expect(bestSellersLists[1]).toHaveTextContent('Time Window: 7 days');
    });
  });

  describe('CSS Classes and Styling', () => {
    it('applies all expected CSS classes', () => {
      renderWithRouter(<RecommendationsPage />);
      
      // Main container
      expect(screen.getByRole('main')).toHaveClass('recommendations-page-container');
      
      // Title elements
      expect(screen.getByRole('heading', { level: 1 })).toHaveClass('main-titles');
      expect(screen.getByText('Based on current trends and popular items.')).toHaveClass('main-titles-sub');
      
      // Back button
      expect(screen.getByRole('button')).toHaveClass('back-button');
      
      // Sections
      const sections = screen.getAllByTestId('best-sellers-list').map(list => 
        list.closest('section')
      );
      sections.forEach(section => {
        expect(section).toHaveClass('recommendation-section');
      });
    });

    it('applies correct inline styles', () => {
      renderWithRouter(<RecommendationsPage />);
      
      const mainContainer = screen.getByRole('main');
      expect(mainContainer).toHaveStyle('padding-top: 20px');
      expect(mainContainer).toHaveStyle('padding-bottom: 20px');
      
      const sections = screen.getAllByTestId('best-sellers-list').map(list => 
        list.closest('section')
      );
      expect(sections[1]).toHaveStyle('margin-top: 40px');
    });
  });
});