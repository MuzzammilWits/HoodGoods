import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdminStoreApproval from './AdminStoreApproval';
import { describe, it, expect, beforeEach } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import axios from 'axios';
import { MemoryRouter } from 'react-router-dom';

const mockAxios = new MockAdapter(axios);

const storesMock = [
  {
    storeId: 'store1',
    userId: 'user1',
    storeName: 'Cool Store',
    standardPrice: 50,
    standardTime: '3 days',
    expressPrice: 100,
    expressTime: '1 day',
    isActiveStore: false,
    products: [
      {
        prodId: 1,
        name: 'Product 1',
        description: 'Desc',
        category: 'Clothing',
        price: 100,
        productquantity: 10,
        userId: 'user1',
        imageUrl: '',
        storeId: 'store1',
        storeName: 'Cool Store',
        isActive: false,
      },
    ],
  },
];

describe('AdminStoreApproval', () => {
  beforeEach(() => {
    mockAxios.reset();
  });

  it('displays loading skeleton on initial render', async () => {
    mockAxios.onGet(/stores\/inactive/).reply(() => new Promise(() => {})); // never resolves

    render(<AdminStoreApproval />, { wrapper: MemoryRouter });

    expect(screen.getByText(/Store Management/i)).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(5); // skeleton loaders
  });

  it('displays message when no stores are returned', async () => {
    mockAxios.onGet(/stores\/inactive/).reply(200, []);

    render(<AdminStoreApproval />, { wrapper: MemoryRouter });

    await screen.findByText(/No stores are currently awaiting approval/i);
  });

  it('renders a store with correct pricing info', async () => {
    mockAxios.onGet(/stores\/inactive/).reply(200, storesMock);

    render(<AdminStoreApproval />, { wrapper: MemoryRouter });

    await screen.findByText('Cool Store');
    expect(screen.getByText('Price: R 50.00')).toBeInTheDocument();
    expect(screen.getByText('Time: 3 days')).toBeInTheDocument();
    expect(screen.getByText('Price: R 100.00')).toBeInTheDocument();
  });

  it('expands and collapses a store on click', async () => {
    mockAxios.onGet(/stores\/inactive/).reply(200, storesMock);

    render(<AdminStoreApproval />, { wrapper: MemoryRouter });

    const storeHeader = await screen.findByText('Cool Store');
    fireEvent.click(storeHeader);

    await screen.findByText('Products in this Store');
    expect(screen.getByText('Product 1')).toBeInTheDocument();

    fireEvent.click(storeHeader);
    await waitFor(() =>
      expect(screen.queryByText('Products in this Store')).not.toBeInTheDocument()
    );
  });

  it('approves a store and removes it from the list', async () => {
    mockAxios.onGet(/stores\/inactive/).reply(200, storesMock);
    mockAxios.onPatch(/stores\/store1\/approve/).reply(200);

    render(<AdminStoreApproval />, { wrapper: MemoryRouter });

    await screen.findByText('Cool Store');
    const approveBtn = screen.getByRole('button', { name: /Approve store Cool Store/i });
    fireEvent.click(approveBtn);

    await waitFor(() =>
      expect(screen.queryByText('Cool Store')).not.toBeInTheDocument()
    );
    expect(screen.getByText(/Store approved successfully!/i)).toBeInTheDocument();
  });

  it('rejects a store and removes it from the list', async () => {
    mockAxios.onGet(/stores\/inactive/).reply(200, storesMock);
    mockAxios.onDelete(/stores\/store1/).reply(200);

    render(<AdminStoreApproval />, { wrapper: MemoryRouter });

    await screen.findByText('Cool Store');
    const rejectBtn = screen.getByRole('button', { name: /Reject store Cool Store/i });
    fireEvent.click(rejectBtn);

    await waitFor(() =>
      expect(screen.queryByText('Cool Store')).not.toBeInTheDocument()
    );
    expect(screen.getByText(/Store rejected and deleted successfully!/i)).toBeInTheDocument();
  });

  it('allows keyboard toggle of expanded view', async () => {
    mockAxios.onGet(/stores\/inactive/).reply(200, storesMock);

    render(<AdminStoreApproval />, { wrapper: MemoryRouter });

    const header = await screen.findByText('Cool Store');
    fireEvent.keyDown(header, { key: 'Enter', code: 'Enter' });

    await screen.findByText('Products in this Store');
  });
});
