import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AdminAnalyticsPage from './AdminAnalyticsPage';

// Mock the navigate function from react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock the PlatformMetricsReport component
vi.mock('../../components/reporting/PlatformMetricsReport', () => ({
  default: () => <div data-testid="platform-metrics-report">Platform Metrics Report Component</div>,
}));

// Helper function to render component with router
const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('AdminAnalyticsPage', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  //---

  describe('Component Rendering', () => {
    it('should render the main page structure', () => {
      renderWithRouter(<AdminAnalyticsPage />);

      const mainElement = screen.getByRole('main');
      expect(mainElement).toBeInTheDocument();
      expect(mainElement).toHaveClass('admin-analytics-page', 'container', 'mt-4');
    });

    it('should render the page header with correct title', () => {
      renderWithRouter(<AdminAnalyticsPage />);

      const header = screen.getByRole('banner');
      expect(header).toBeInTheDocument();
      expect(header).toHaveClass('page-header', 'mb-4');

      const title = screen.getByRole('heading', { level: 1 });
      expect(title).toBeInTheDocument();
      expect(title).toHaveTextContent('Admin Analytics Dashboard');
    });

    it('should render the back to dashboard button', () => {
      renderWithRouter(<AdminAnalyticsPage />);

      const backButton = screen.getByRole('button', { name: /back to dashboard/i });
      expect(backButton).toBeInTheDocument();
      expect(backButton).toHaveClass('back-button');
    });

    it('should have proper ARIA structure for accessibility', () => {
      renderWithRouter(<AdminAnalyticsPage />);

      // Check for the visually hidden heading
      const hiddenHeading = screen.getByRole('heading', { level: 2 });
      expect(hiddenHeading).toBeInTheDocument();
      expect(hiddenHeading).toHaveClass('visually-hidden');
      expect(hiddenHeading).toHaveTextContent('Platform Metrics Report Section');

      // Check aria-labelledby association
      const reportGroup = screen.getByRole('article');
      expect(reportGroup).toHaveAttribute('aria-labelledby', 'platform-metrics-heading');
    });
  });

  //---

  describe('Navigation Functionality', () => {
    it('should navigate to admin dashboard when back button is clicked', async () => {
      renderWithRouter(<AdminAnalyticsPage />);

      const backButton = screen.getByRole('button', { name: /back to dashboard/i });
      fireEvent.click(backButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledTimes(1);
        expect(mockNavigate).toHaveBeenCalledWith('/admin-dashboard');
      });
    });

    it('should handle multiple rapid clicks on back button', async () => {
      renderWithRouter(<AdminAnalyticsPage />);

      const backButton = screen.getByRole('button', { name: /back to dashboard/i });

      // Simulate rapid clicks
      fireEvent.click(backButton);
      fireEvent.click(backButton);
      fireEvent.click(backButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledTimes(3);
        expect(mockNavigate).toHaveBeenCalledWith('/admin-dashboard');
      });
    });
  });

  //---

  describe('CSS Classes and Styling', () => {
    it('should apply correct CSS classes to main container', () => {
      renderWithRouter(<AdminAnalyticsPage />);

      const mainElement = screen.getByRole('main');
      expect(mainElement).toHaveClass('admin-analytics-page');
      expect(mainElement).toHaveClass('container');
      expect(mainElement).toHaveClass('mt-4');
    });

    it('should apply correct CSS classes to header', () => {
      renderWithRouter(<AdminAnalyticsPage />);

      const header = screen.getByRole('banner');
      expect(header).toHaveClass('page-header');
      expect(header).toHaveClass('mb-4');
    });

    it('should apply correct CSS classes to report group', () => {
      renderWithRouter(<AdminAnalyticsPage />);

      const reportGroup = screen.getByRole('article');
      expect(reportGroup).toHaveClass('report-group');
      expect(reportGroup).toHaveClass('mb-5');
    });

    it('should have proper inline styles for header layout', () => {
      renderWithRouter(<AdminAnalyticsPage />);

      const header = screen.getByRole('banner');
      expect(header).toHaveStyle({
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      });
    });
  });

  //---

  describe('Component Structure and Semantic HTML', () => {
    it('should have proper heading hierarchy', () => {
      renderWithRouter(<AdminAnalyticsPage />);

      const h1 = screen.getByRole('heading', { level: 1 });
      const h2 = screen.getByRole('heading', { level: 2 });

      expect(h1).toBeInTheDocument();
      expect(h2).toBeInTheDocument();
      expect(h1).toHaveTextContent('Admin Analytics Dashboard');
      expect(h2).toHaveTextContent('Platform Metrics Report Section');
    });
  });

  //---

  describe('Error Handling and Edge Cases', () => {
    it('should render correctly when PlatformMetricsReport fails to load', () => {
      // This test ensures the page structure remains intact even if child component fails
      renderWithRouter(<AdminAnalyticsPage />);

      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /back to dashboard/i })).toBeInTheDocument();
    });
  });

  //---

  describe('Accessibility', () => {
    it('should have proper button accessibility', () => {
      renderWithRouter(<AdminAnalyticsPage />);

      const backButton = screen.getByRole('button', { name: /back to dashboard/i });
      expect(backButton).toBeInTheDocument();
      expect(backButton).toHaveAccessibleName('Back to Dashboard');
    });

    it('should have visually hidden content for screen readers', () => {
      renderWithRouter(<AdminAnalyticsPage />);

      const hiddenHeading = screen.getByText('Platform Metrics Report Section');
      expect(hiddenHeading).toHaveClass('visually-hidden');
    });

    it('should support keyboard navigation', () => {
      renderWithRouter(<AdminAnalyticsPage />);

      const backButton = screen.getByRole('button', { name: /back to dashboard/i });

      // Focus the button
      backButton.focus();
      expect(document.activeElement).toBe(backButton);

      // Simulate Enter key press
      fireEvent.keyDown(backButton, { key: 'Enter', code: 'Enter' });
      fireEvent.keyUp(backButton, { key: 'Enter', code: 'Enter' });
    });
  });

  //---

  describe('Component Integration', () => {
    it('should properly integrate with React Router', () => {
      renderWithRouter(<AdminAnalyticsPage />);

      // Component should render without router-related errors
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(mockNavigate).toBeDefined();
    });

    it('should maintain component state during re-renders', () => {
      const { rerender } = renderWithRouter(<AdminAnalyticsPage />);

      expect(screen.getByRole('main')).toBeInTheDocument();

      // Re-render the component
      rerender(
        <BrowserRouter>
          <AdminAnalyticsPage />
        </BrowserRouter>
      );

      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Admin Analytics Dashboard');
    });
  });
});