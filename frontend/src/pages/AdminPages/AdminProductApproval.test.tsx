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
    mockedAxios.get.mockReset();
    mockedAxios.patch.mockReset();
    mockedAxios.delete.mockReset();
  });

  it('shows loading skeleton initially', async () => {
    mockedAxios.get.mockImplementation(() => new Promise(() => {})); // never resolves
    render(<BrowserRouter><AdminProductApproval /></BrowserRouter>);
    expect(screen.getAllByRole('row').length).toBeGreaterThan(1); // Check for skeleton rows
  });

  it('renders error message if product fetch fails', async () => {
    mockedAxios.get.mockRejectedValue(new Error('Failed to load'));
    render(<BrowserRouter><AdminProductApproval /></BrowserRouter>);
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/error loading products/i)).toBeInTheDocument();
    });
  });

  it('displays products in table after fetch', async () => {
    mockedAxios.get.mockResolvedValue({ data: sampleProducts });
    render(<BrowserRouter><AdminProductApproval /></BrowserRouter>);
    expect(await screen.findByText('Sample Product')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /approve/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reject/i })).toBeInTheDocument();
  });

  it('approves a product when approve button is clicked', async () => {
    mockedAxios.get.mockResolvedValue({ data: sampleProducts });
    mockedAxios.patch.mockResolvedValue({});
    render(<BrowserRouter><AdminProductApproval /></BrowserRouter>);

    const approveButton = await screen.findByRole('button', { name: /approve/i });
    fireEvent.click(approveButton);

    await waitFor(() => {
      expect(mockedAxios.patch).toHaveBeenCalledWith(expect.stringContaining('/approve'));
      expect(screen.queryByText('Sample Product')).not.toBeInTheDocument();
    });
  });

  it('deletes a product when reject button is clicked', async () => {
    mockedAxios.get.mockResolvedValue({ data: sampleProducts });
    mockedAxios.delete.mockResolvedValue({});
    render(<BrowserRouter><AdminProductApproval /></BrowserRouter>);

    const rejectButton = await screen.findByRole('button', { name: /reject/i });
    fireEvent.click(rejectButton);

    await waitFor(() => {
      expect(mockedAxios.delete).toHaveBeenCalledWith(expect.stringContaining('/products/1'));
      expect(screen.queryByText('Sample Product')).not.toBeInTheDocument();
    });
  });


  it('renders store name in table row', async () => {
    mockedAxios.get.mockResolvedValue({ data: sampleProducts });
    render(<BrowserRouter><AdminProductApproval /></BrowserRouter>);
    
    await screen.findByText('Sample Product');
    const storeCells = screen.getAllByText('Test Store');
    // The store name appears in both the table and dropdown, so we need to be specific
    expect(storeCells.length).toBeGreaterThanOrEqual(1);
  });

  it('renders product image', async () => {
    mockedAxios.get.mockResolvedValue({ data: sampleProducts });
    render(<BrowserRouter><AdminProductApproval /></BrowserRouter>);

    const img = await screen.findByRole('img', { name: /sample product/i });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/image.jpg');
  });

  it('renders success message when approval succeeds', async () => {
    mockedAxios.get.mockResolvedValue({ data: sampleProducts });
    mockedAxios.patch.mockResolvedValue({});
    
    render(<BrowserRouter><AdminProductApproval /></BrowserRouter>);
    
    const approveButton = await screen.findByRole('button', { name: /approve/i });
    fireEvent.click(approveButton);
    
    await waitFor(() => {
      expect(screen.getByText(/product approved successfully/i)).toBeInTheDocument();
    });
  });

  it('renders success message when reject succeeds', async () => {
    mockedAxios.get.mockResolvedValue({ data: sampleProducts });
    mockedAxios.delete.mockResolvedValue({});
  
    render(<BrowserRouter><AdminProductApproval /></BrowserRouter>);
  
    const rejectButton = await screen.findByRole('button', { name: /reject/i });
    fireEvent.click(rejectButton);
  
    await waitFor(() => {
      expect(screen.getByText(/product rejected and deleted successfully/i)).toBeInTheDocument();
    });
  });
});