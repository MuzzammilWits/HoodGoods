import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import axios from 'axios';
import AdminStoreApproval from './AdminStoreApproval';

// Mock axios
vi.mock('axios');
const mockedAxios = axios as unknown as {
  get: ReturnType<typeof vi.fn>;
  patch: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

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

const mockStores = [
  {
    storeId: 'store1',
    userId: 'user1',
    storeName: 'Test Store',
    standardPrice: 10,
    standardTime: '3-5',
    expressPrice: 20,
    expressTime: '0-1',
    isActiveStore: false,
    products: [],
  },
];

describe('AdminStoreApproval', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading spinner initially', async () => {
    mockedAxios.get = vi.fn(() => new Promise(() => {})); // Never resolves

    render(
      <BrowserRouter>
        <AdminStoreApproval />
      </BrowserRouter>
    );

    expect(screen.getByText(/loading stores/i)).toBeInTheDocument();
  });

  it('renders store cards after fetching data', async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({ data: mockStores });

    render(
      <BrowserRouter>
        <AdminStoreApproval />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Store')).toBeInTheDocument();
    });
  });

  it('calls approve API and removes store on success', async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({ data: mockStores });
    mockedAxios.patch = vi.fn().mockResolvedValue({});

    render(
      <BrowserRouter>
        <AdminStoreApproval />
      </BrowserRouter>
    );

    await waitFor(() => screen.getByText('Test Store'));

    const approveButton = screen.getByRole('button', { name: /approve store/i });
    fireEvent.click(approveButton);

    await waitFor(() => {
      expect(mockedAxios.patch).toHaveBeenCalledWith(expect.stringContaining('/approve'));
      expect(screen.queryByText('Test Store')).not.toBeInTheDocument();
    });
  });

  it('calls reject API and removes store on success', async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({ data: mockStores });
    mockedAxios.delete = vi.fn().mockResolvedValue({});

    render(
      <BrowserRouter>
        <AdminStoreApproval />
      </BrowserRouter>
    );

    await waitFor(() => screen.getByText('Test Store'));

    const rejectButton = screen.getByRole('button', { name: /reject store/i });
    fireEvent.click(rejectButton);

    await waitFor(() => {
      expect(mockedAxios.delete).toHaveBeenCalledWith(expect.stringContaining('/stores/store1'));
      expect(screen.queryByText('Test Store')).not.toBeInTheDocument();
    });
  });

  it('displays error notification if fetching stores fails', async () => {
    mockedAxios.get = vi.fn().mockRejectedValue(new Error('Fetch failed'));

    render(
      <BrowserRouter>
        <AdminStoreApproval />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/failed to load stores/i)).toBeInTheDocument();
    });
  });

  it('navigates back to dashboard on back button click', async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({ data: [] });
    render(<BrowserRouter><AdminStoreApproval /></BrowserRouter>);
    const backBtn = await screen.findByRole('button', { name: /back to dashboard/i });
    fireEvent.click(backBtn);
    expect(mockNavigate).toHaveBeenCalledWith('/admin-dashboard');
  });

  it('renders store name', async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({ data: mockStores });
  
    render(
      <BrowserRouter>
        <AdminStoreApproval />
      </BrowserRouter>
    );
  
    const storeName = await screen.findByText('Test Store');
    expect(storeName).toBeInTheDocument();
  });

  it('renders standard service', async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({ data: mockStores });
  
    render(
      <BrowserRouter>
        <AdminStoreApproval />
      </BrowserRouter>
    );
  
    // Wait for content to appear
    await screen.findByText('Test Store');
  
    // Assert standard delivery price and time are displayed
    expect(screen.getByText(/10/i)).toBeInTheDocument();      // Standard price
    expect(screen.getByText(/3-5/i)).toBeInTheDocument();   // Standard time
  });

  it('renders express service', async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({ data: mockStores });
  
    render(
      <BrowserRouter>
        <AdminStoreApproval />
      </BrowserRouter>
    );
  
    // Wait for store to render
    await screen.findByText('Test Store');
  
    // Assert express delivery price and time are displayed
    expect(screen.getByText(/20/i)).toBeInTheDocument();      // Express price
    expect(screen.getByText(/0-1/i)).toBeInTheDocument();    // Express time
  });

  it('renders approve button', async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({ data: mockStores });
  
    render(
      <BrowserRouter>
        <AdminStoreApproval />
      </BrowserRouter>
    );
  
    await screen.findByText('Test Store');
  
    const approveButton = screen.getByRole('button', { name: /approve store/i });
    expect(approveButton).toBeInTheDocument();
  });

  it('renders reject button', async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({ data: mockStores });
  
    render(
      <BrowserRouter>
        <AdminStoreApproval />
      </BrowserRouter>
    );
  
    await screen.findByText('Test Store');
  
    const rejectButton = screen.getByRole('button', { name: /reject store/i });
    expect(rejectButton).toBeInTheDocument();
  });

  it('approves a store when approve button is clicked', async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({ data: mockStores });
    mockedAxios.patch = vi.fn().mockResolvedValue({});
  
    render(
      <BrowserRouter>
        <AdminStoreApproval />
      </BrowserRouter>
    );
  
    // Wait for store to render
    await screen.findByText('Test Store');
  
    // Click the approve button
    const approveButton = await screen.findByRole('button', { name: /approve store/i });
    fireEvent.click(approveButton);
  
    await waitFor(() => {
      
      expect(mockedAxios.patch).toHaveBeenCalledWith(expect.stringContaining('/approve'));
      
      expect(screen.queryByText('Test Store')).not.toBeInTheDocument();
    });
  });

  it('rejects a store when reject button is clicked', async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({ data: mockStores });
    mockedAxios.delete = vi.fn().mockResolvedValue({});
  
    render(
      <BrowserRouter>
        <AdminStoreApproval />
      </BrowserRouter>
    );
  
    // Wait for the store to appear
    await screen.findByText('Test Store');
  
    // Click the reject button
    const rejectButton = await screen.findByRole('button', { name: /reject store/i });
    fireEvent.click(rejectButton);
  
    await waitFor(() => {
      // Ensure DELETE was called with the correct endpoint
      expect(mockedAxios.delete).toHaveBeenCalledWith(
        expect.stringContaining('/stores/store1')
      );
      // Ensure the store is removed from the UI
      expect(screen.queryByText('Test Store')).not.toBeInTheDocument();
    });
  });
  
});