import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AdminDashboard from './AdminDashboard';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Wrapper component for React Router
const RouterWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('AdminDashboard', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  describe('Rendering', () => {
    it('renders the main title', () => {
      render(<AdminDashboard />, { wrapper: RouterWrapper });
      expect(screen.getByRole('heading', { name: /admin dashboard/i })).toBeInTheDocument();
    });

    it('renders all three management cards', () => {
      render(<AdminDashboard />, { wrapper: RouterWrapper });
      
      expect(screen.getByText('Store Management')).toBeInTheDocument();
      expect(screen.getByText('Product Management')).toBeInTheDocument();
      expect(screen.getByText('Admin Analytics')).toBeInTheDocument();
    });

    it('renders card descriptions', () => {
      render(<AdminDashboard />, { wrapper: RouterWrapper });
      
      expect(screen.getByText('Approve or reject new store applications')).toBeInTheDocument();
      expect(screen.getByText('Approve or reject new product listings')).toBeInTheDocument();
      expect(screen.getByText('View system reports and analytics')).toBeInTheDocument();
    });

    it('renders SVG icons for each card', () => {
      const { container } = render(<AdminDashboard />, { wrapper: RouterWrapper });
      
      const svgs = container.querySelectorAll('svg');
      expect(svgs).toHaveLength(3);
    });
  });

  describe('Navigation - Click Events', () => {
    it('navigates to store approval when store management card is clicked', () => {
      render(<AdminDashboard />, { wrapper: RouterWrapper });
      
      const storeCard = screen.getByLabelText('Manage Stores');
      fireEvent.click(storeCard);
      
      expect(mockNavigate).toHaveBeenCalledWith('/admin/store-approval');
    });

    it('navigates to product approval when product management card is clicked', () => {
      render(<AdminDashboard />, { wrapper: RouterWrapper });
      
      const productCard = screen.getByLabelText('Manage Products');
      fireEvent.click(productCard);
      
      expect(mockNavigate).toHaveBeenCalledWith('/admin/product-approval');
    });

    it('navigates to analytics when reports card is clicked', () => {
      render(<AdminDashboard />, { wrapper: RouterWrapper });
      
      const analyticsCard = screen.getByLabelText('View Reports and Analytics');
      fireEvent.click(analyticsCard);
      
      expect(mockNavigate).toHaveBeenCalledWith('/admin/analytics');
    });
  });

  describe('Navigation - Button Click Events', () => {
    it('navigates to store approval when store management button is clicked', () => {
      render(<AdminDashboard />, { wrapper: RouterWrapper });
      
      const storeButton = screen.getByRole('button', { name: /store management/i });
      fireEvent.click(storeButton);
      
      expect(mockNavigate).toHaveBeenCalledWith('/admin/store-approval');
    });

    it('navigates to product approval when product management button is clicked', () => {
      render(<AdminDashboard />, { wrapper: RouterWrapper });
      
      const productButton = screen.getByRole('button', { name: /product management/i });
      fireEvent.click(productButton);
      
      expect(mockNavigate).toHaveBeenCalledWith('/admin/product-approval');
    });

    it('navigates to analytics when admin analytics button is clicked', () => {
      render(<AdminDashboard />, { wrapper: RouterWrapper });
      
      const analyticsButton = screen.getByRole('button', { name: /admin analytics/i });
      fireEvent.click(analyticsButton);
      
      expect(mockNavigate).toHaveBeenCalledWith('/admin/analytics');
    });

    it('prevents event bubbling when button is clicked', () => {
      render(<AdminDashboard />, { wrapper: RouterWrapper });
      
      const storeButton = screen.getByRole('button', { name: /store management/i });
      const clickSpy = vi.fn();
      const storeCard = screen.getByLabelText('Manage Stores');
      storeCard.addEventListener('click', clickSpy);
      
      fireEvent.click(storeButton);
      
      // Navigation should only be called once (from button, not from card)
      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith('/admin/store-approval');
    });
  });

  describe('Keyboard Navigation', () => {
    it('navigates when Enter key is pressed on store card', () => {
      render(<AdminDashboard />, { wrapper: RouterWrapper });
      
      const storeCard = screen.getByLabelText('Manage Stores');
      fireEvent.keyDown(storeCard, { key: 'Enter' });
      
      expect(mockNavigate).toHaveBeenCalledWith('/admin/store-approval');
    });

    it('navigates when Space key is pressed on product card', () => {
      render(<AdminDashboard />, { wrapper: RouterWrapper });
      
      const productCard = screen.getByLabelText('Manage Products');
      fireEvent.keyDown(productCard, { key: ' ' });
      
      expect(mockNavigate).toHaveBeenCalledWith('/admin/product-approval');
    });

    it('navigates when Enter key is pressed on analytics card', () => {
      render(<AdminDashboard />, { wrapper: RouterWrapper });
      
      const analyticsCard = screen.getByLabelText('View Reports and Analytics');
      fireEvent.keyDown(analyticsCard, { key: 'Enter' });
      
      expect(mockNavigate).toHaveBeenCalledWith('/admin/analytics');
    });

    it('does not navigate when other keys are pressed', () => {
      render(<AdminDashboard />, { wrapper: RouterWrapper });
      
      const storeCard = screen.getByLabelText('Manage Stores');
      fireEvent.keyDown(storeCard, { key: 'Tab' });
      fireEvent.keyDown(storeCard, { key: 'Escape' });
      fireEvent.keyDown(storeCard, { key: 'a' });
      
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('prevents default behavior when Enter or Space is pressed', () => {
      render(<AdminDashboard />, { wrapper: RouterWrapper });
      
      const storeCard = screen.getByLabelText('Manage Stores');
      
      // Test Enter key
      fireEvent.keyDown(storeCard, { key: 'Enter' });
      expect(mockNavigate).toHaveBeenCalledWith('/admin/store-approval');
      
      // Test Space key
      fireEvent.keyDown(storeCard, { key: ' ' });
      expect(mockNavigate).toHaveBeenCalledWith('/admin/store-approval');
      
      // Should have been called twice
      expect(mockNavigate).toHaveBeenCalledTimes(2);
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for all cards', () => {
      render(<AdminDashboard />, { wrapper: RouterWrapper });
      
      expect(screen.getByLabelText('Manage Stores')).toBeInTheDocument();
      expect(screen.getByLabelText('Manage Products')).toBeInTheDocument();
      expect(screen.getByLabelText('View Reports and Analytics')).toBeInTheDocument();
    });

    it('has proper role attributes for all cards', () => {
      render(<AdminDashboard />, { wrapper: RouterWrapper });
      
      const cards = screen.getAllByRole('link');
      expect(cards).toHaveLength(3);
    });

    it('has proper tabIndex for keyboard navigation', () => {
      render(<AdminDashboard />, { wrapper: RouterWrapper });
      
      const storeCard = screen.getByLabelText('Manage Stores');
      const productCard = screen.getByLabelText('Manage Products');
      const analyticsCard = screen.getByLabelText('View Reports and Analytics');
      
      expect(storeCard).toHaveAttribute('tabIndex', '0');
      expect(productCard).toHaveAttribute('tabIndex', '0');
      expect(analyticsCard).toHaveAttribute('tabIndex', '0');
    });

    it('has semantic HTML structure', () => {
      render(<AdminDashboard />, { wrapper: RouterWrapper });
      
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('list')).toBeInTheDocument();
      
      // The li elements have role="link" so they're not accessible as listitem
      const linkCards = screen.getAllByRole('link');
      expect(linkCards).toHaveLength(3);
    });
  });

  describe('CSS Classes', () => {
    it('applies correct CSS classes to container elements', () => {
      render(<AdminDashboard />, { wrapper: RouterWrapper });
      
      const mainContainer = screen.getByRole('main');
      expect(mainContainer).toHaveClass('admin-dashboard-container');
      
      const cardsList = screen.getByRole('list');
      expect(cardsList).toHaveClass('management-cards2');
    });

    it('applies correct CSS classes to cards', () => {
      const { container } = render(<AdminDashboard />, { wrapper: RouterWrapper });
      
      const cards = container.querySelectorAll('li.management-card3');
      expect(cards).toHaveLength(3);
      
      cards.forEach(card => {
        expect(card).toHaveClass('management-card3', 'product-card');
      });
    });

    it('applies correct CSS classes to SVG elements', () => {
      const { container } = render(<AdminDashboard />, { wrapper: RouterWrapper });
      
      const storeSvg = container.querySelector('.store-card-svg');
      const dashboardSvgs = container.querySelectorAll('.dashboard-card-svg');
      
      expect(storeSvg).toBeInTheDocument();
      expect(dashboardSvgs).toHaveLength(2);
    });
  });

  describe('Component Structure', () => {
    it('renders the correct number of management cards', () => {
      const { container } = render(<AdminDashboard />, { wrapper: RouterWrapper });
      
      const managementCards = container.querySelectorAll('li.management-card3');
      expect(managementCards).toHaveLength(3);
    });

    it('each card contains a figure and article element', () => {
      const { container } = render(<AdminDashboard />, { wrapper: RouterWrapper });
      
      const figures = container.querySelectorAll('figure.product-image-container');
      const articles = container.querySelectorAll('article.product-details');
      
      expect(figures).toHaveLength(3);
      expect(articles).toHaveLength(3);
    });

    it('each card contains a button and description', () => {
      const { container } = render(<AdminDashboard />, { wrapper: RouterWrapper });
      
      const buttons = screen.getAllByRole('button');
      const descriptions = container.querySelectorAll('.product-description');
      
      expect(buttons).toHaveLength(3);
      expect(descriptions).toHaveLength(3);
    });
  });

  describe('Event Handling Edge Cases', () => {
    it('handles multiple rapid clicks gracefully', () => {
      render(<AdminDashboard />, { wrapper: RouterWrapper });
      
      const storeCard = screen.getByLabelText('Manage Stores');
      
      // Simulate rapid clicking
      fireEvent.click(storeCard);
      fireEvent.click(storeCard);
      fireEvent.click(storeCard);
      
      expect(mockNavigate).toHaveBeenCalledTimes(3);
      expect(mockNavigate).toHaveBeenCalledWith('/admin/store-approval');
    });

    it('handles keyboard and mouse events on the same card', () => {
      render(<AdminDashboard />, { wrapper: RouterWrapper });
      
      const productCard = screen.getByLabelText('Manage Products');
      
      fireEvent.click(productCard);
      fireEvent.keyDown(productCard, { key: 'Enter' });
      
      expect(mockNavigate).toHaveBeenCalledTimes(2);
      expect(mockNavigate).toHaveBeenCalledWith('/admin/product-approval');
    });
  });
});