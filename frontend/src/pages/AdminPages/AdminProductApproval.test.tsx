import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AdminProductApproval from './AdminProductApproval';
import { BrowserRouter } from 'react-router-dom';
import axios from 'axios';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    BrowserRouter: actual.BrowserRouter,
  };
});

// Mock Axios
vi.mock('axios');
const mockedAxios = axios as unknown as {
  get: ReturnType<typeof vi.fn>;
  patch: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

const sampleProducts = [
  {
    prodId: 1,
    name: 'Sample Product',
    description: 'Test description',
    category: 'Crafts',
    price: 100,
    productquantity: 10,
    userId: 'user123',
    imageUrl: 'https://example.com/image.jpg',
    storeId: 'store1',
    storeName: 'Test Store',
    isActive: false,
  },
];

describe('AdminProductApproval', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading spinner initially', async () => {
    mockedAxios.get = vi.fn(() => new Promise(() => {})); // never resolves
    render(<BrowserRouter><AdminProductApproval /></BrowserRouter>);
    expect(screen.getByText(/loading products/i)).toBeInTheDocument();
  });

  it('renders error message if product fetch fails', async () => {
    mockedAxios.get = vi.fn().mockRejectedValue(new Error('Failed to load'));
    render(<BrowserRouter><AdminProductApproval /></BrowserRouter>);
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/error loading products/i)).toBeInTheDocument();
    });
  });

  it('displays products in table after fetch', async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({ data: sampleProducts });
    render(<BrowserRouter><AdminProductApproval /></BrowserRouter>);
    expect(await screen.findByText('Sample Product')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /approve/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reject/i })).toBeInTheDocument();
  });

  it('renders product cards after fetching', async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({ data: sampleProducts });
  
    render(<BrowserRouter><AdminProductApproval /></BrowserRouter>);
  
    // Wait for product to appear
    const productName = await screen.findByText('Sample Product');
    expect(productName).toBeInTheDocument();
  
    // Check if product description is also rendered
    //expect(screen.getByText('Test description')).toBeInTheDocument();
  
    // Check if approve/reject buttons are present
    expect(screen.getByRole('button', { name: /approve/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reject/i })).toBeInTheDocument();
  });

  it('approves a product when approve button is clicked', async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({ data: sampleProducts });
    mockedAxios.patch = vi.fn().mockResolvedValue({});
    render(<BrowserRouter><AdminProductApproval /></BrowserRouter>);

    const approveButton = await screen.findByRole('button', { name: /approve/i });
    fireEvent.click(approveButton);

    await waitFor(() => {
      expect(mockedAxios.patch).toHaveBeenCalledWith(expect.stringContaining('/approve'));
      expect(screen.queryByText('Sample Product')).not.toBeInTheDocument(); // Removed from list
    });
  });

  it('deletes a product when reject button is clicked', async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({ data: sampleProducts });
    mockedAxios.delete = vi.fn().mockResolvedValue({});
    render(<BrowserRouter><AdminProductApproval /></BrowserRouter>);

    const rejectButton = await screen.findByRole('button', { name: /reject/i });
    fireEvent.click(rejectButton);

    await waitFor(() => {
      expect(mockedAxios.delete).toHaveBeenCalledWith(expect.stringContaining('/products/1'));
      expect(screen.queryByText('Sample Product')).not.toBeInTheDocument();
    });
  });

  it('navigates back to dashboard on back button click', async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({ data: [] });
    render(<BrowserRouter><AdminProductApproval /></BrowserRouter>);
    const backBtn = await screen.findByRole('button', { name: /back to dashboard/i });
    fireEvent.click(backBtn);
    expect(mockNavigate).toHaveBeenCalledWith('/admin-dashboard');
  });

  it('renders store name along with product', async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({ data: sampleProducts });
  
    render(<BrowserRouter><AdminProductApproval /></BrowserRouter>);
  
    // Wait for product to be rendered
    await screen.findByText('Sample Product');
  
    // Check that the store name appears
    expect(screen.getByText('Test Store')).toBeInTheDocument();
  });

  it('renders product image', async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({ data: sampleProducts });
  
    render(<BrowserRouter><AdminProductApproval /></BrowserRouter>);
  
    const img = await screen.findByRole('img', { name: /sample product/i });
  
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/image.jpg');
  });

  it('renders product name', async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({ data: sampleProducts });
  
    render(<BrowserRouter><AdminProductApproval /></BrowserRouter>);
  
    const productName = await screen.findByText('Sample Product');
    expect(productName).toBeInTheDocument();
  });

  it('renders product price', async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({ data: sampleProducts });
  
    render(<BrowserRouter><AdminProductApproval /></BrowserRouter>);
  
    const productPrice = await screen.findByText('R100.00');
    expect(productPrice).toBeInTheDocument();
  });

  it('renders product isActive status', async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({ data: sampleProducts });
  
    render(<BrowserRouter><AdminProductApproval /></BrowserRouter>);
  
    const statusText = await screen.findByText(/inactive/i); // since sample product has isActive: false
    expect(statusText).toBeInTheDocument();
  });

  it('renders the Approve button', async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({ data: sampleProducts });
  
    render(<BrowserRouter><AdminProductApproval /></BrowserRouter>);
  
    const approveButton = await screen.findByRole('button', { name: /approve/i });
    expect(approveButton).toBeInTheDocument();
  });

  it('renders the Reject button', async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({ data: sampleProducts });
  
    render(<BrowserRouter><AdminProductApproval /></BrowserRouter>);
  
    const rejectButton = await screen.findByRole('button', { name: /reject/i });
    expect(rejectButton).toBeInTheDocument();
  });

  it('renders success message when approval succeeds', async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({ data: sampleProducts });
    mockedAxios.patch = vi.fn().mockResolvedValue({}); // Approve succeeds
    
    render(<BrowserRouter><AdminProductApproval /></BrowserRouter>);
    
    const approveButton = await screen.findByRole('button', { name: /approve/i });
    fireEvent.click(approveButton);
    
    // Wait for the success message to appear after approval
    const successMessage = await screen.findByText(/product approved successfully/i);
    expect(successMessage).toBeInTheDocument();
  });

  it('renders success message when reject succeeds', async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({ data: sampleProducts });
    mockedAxios.delete = vi.fn().mockResolvedValue({}); // Reject (delete) succeeds
  
    render(<BrowserRouter><AdminProductApproval /></BrowserRouter>);
  
    const rejectButton = await screen.findByRole('button', { name: /reject/i });
    fireEvent.click(rejectButton);
  
    // Wait for the success message after rejection
    const successMessage = await screen.findByText(/product deleted successfully/i);
    expect(successMessage).toBeInTheDocument();
  });
});


