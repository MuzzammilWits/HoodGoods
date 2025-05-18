import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom'; // Needed for components that use routing hooks/components
import AdminDashboard from './AdminDashboard';

// Mock react-router-dom's useNavigate hook
const mockUseNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    useNavigate: () => mockUseNavigate,
    BrowserRouter: actual.BrowserRouter, // Use the actual BrowserRouter
  };
});

describe('AdminDashboard', () => {
  // Reset the mock before each test
  beforeEach(() => {
    mockUseNavigate.mockClear();
  });

  it('renders the admin dashboard header', () => {
    render(
      <BrowserRouter>
        <AdminDashboard />
      </BrowserRouter>
    );
    expect(screen.getByRole('heading', { name: /admin dashboard/i })).toBeInTheDocument();
  });

  it('renders the three management cards with correct titles and descriptions', () => {
    render(
      <BrowserRouter>
        <AdminDashboard />
      </BrowserRouter>
    );

    const storeCard = screen.getByRole('heading', { name: /manage stores/i }).closest('.management-card3') as HTMLElement;
    expect(storeCard).toBeInTheDocument();
    expect(within(storeCard!).getByText(/Approve or reject new store applications/i)).toBeInTheDocument();
    expect(within(storeCard!).getByRole('button', { name: /Store Management/i })).toBeInTheDocument();

    const productCard = screen.getByRole('heading', { name: /manage products/i }).closest('.management-card3') as HTMLElement;
    expect(productCard).toBeInTheDocument();
    expect(within(productCard!).getByText(/Approve or reject new product listings/i)).toBeInTheDocument();
    expect(within(productCard!).getByRole('button', { name: /Product Management/i })).toBeInTheDocument();

    const reportsCard = screen.getByRole('heading', { name: /view reports/i }).closest('.management-card3') as HTMLElement;
    expect(reportsCard).toBeInTheDocument();
    expect(within(reportsCard!).getByText(/View system reports and analytics/i)).toBeInTheDocument();
    expect(within(reportsCard!).getByRole('button', { name: /View Reports/i })).toBeInTheDocument();
  });

  it('navigates to store approval page when Store Management card is clicked', () => {
    render(
      <BrowserRouter>
        <AdminDashboard />
      </BrowserRouter>
    );
    // Find the card via its heading and then get the closest card container
    const storeCard = screen.getByRole('heading', { name: /manage stores/i }).closest('.management-card3') as HTMLElement;
    fireEvent.click(storeCard!);
    expect(mockUseNavigate).toHaveBeenCalledWith('/admin/store-approval');
  });

  it('navigates to store approval page when Store Management button is clicked', () => {
    render(
      <BrowserRouter>
        <AdminDashboard />
      </BrowserRouter>
    );
    const storeButton = screen.getByRole('button', { name: /Store Management/i });
    fireEvent.click(storeButton);
    expect(mockUseNavigate).toHaveBeenCalledWith('/admin/store-approval');
  });

  it('navigates to product approval page when Product Management card is clicked', () => {
    render(
      <BrowserRouter>
        <AdminDashboard />
      </BrowserRouter>
    );
    // Find the card via its heading and then get the closest card container
    const productCard = screen.getByRole('heading', { name: /manage products/i }).closest('.management-card3') as HTMLElement;
    fireEvent.click(productCard!);
    expect(mockUseNavigate).toHaveBeenCalledWith('/admin/product-approval');
  });

  it('navigates to product approval page when Product Management button is clicked', () => {
    render(
      <BrowserRouter>
        <AdminDashboard />
      </BrowserRouter>
    );
    const productButton = screen.getByRole('button', { name: /Product Management/i });
    fireEvent.click(productButton);
    expect(mockUseNavigate).toHaveBeenCalledWith('/admin/product-approval');
  });

  it('navigates to analytics page when View Reports card is clicked', () => {
    render(
      <BrowserRouter>
        <AdminDashboard />
      </BrowserRouter>
    );
    // Find the card via its heading and then get the closest card container
    const reportsCard = screen.getByRole('heading', { name: /view reports/i }).closest('.management-card3') as HTMLElement;
    fireEvent.click(reportsCard!);
    expect(mockUseNavigate).toHaveBeenCalledWith('/admin/analytics');
  });

  it('navigates to analytics page when View Reports button is clicked', () => {
    render(
      <BrowserRouter>
        <AdminDashboard />
      </BrowserRouter>
    );
    const reportsButton = screen.getByRole('button', { name: /View Reports/i });
    fireEvent.click(reportsButton);
    expect(mockUseNavigate).toHaveBeenCalledWith('/admin/analytics');
  });
});
