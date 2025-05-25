import { render, screen, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach, Mock } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import axios, { AxiosInstance } from 'axios';
import { useAuth0, Auth0ContextInterface, User } from '@auth0/auth0-react';
import MyOrdersPage from './MyOrdersPage';

// Mock axios
vi.mock('axios', async (importOriginal) => {
  const actual = await importOriginal<typeof import('axios')>();
  const mockAxiosInstance = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    head: vi.fn(),
    options: vi.fn(),
    postForm: vi.fn(),
    putForm: vi.fn(),
    patchForm: vi.fn(),
    request: vi.fn(),
    getUri: vi.fn(),
    defaults: {} as any,
    interceptors: {
      request: { use: vi.fn(), eject: vi.fn(), clear: vi.fn() },
      response: { use: vi.fn(), eject: vi.fn(), clear: vi.fn() }
    } as any,
  };

  return {
    ...actual,
    default: {
      ...actual.default,
      create: vi.fn().mockReturnValue(mockAxiosInstance),
    },
    AxiosInstance: mockAxiosInstance,
  };
});
const mockedAxios = vi.mocked(axios);
const mockAxiosInstance = mockedAxios.create() as AxiosInstance;

// Mock Auth0
vi.mock('@auth0/auth0-react');
const mockedUseAuth0 = vi.mocked(useAuth0);

// Mock react-router-dom useLocation
const mockLocation = {
  pathname: '/my-orders',
  search: '',
  hash: '',
  state: null as any,
  key: 'test-key'
};

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useLocation: () => mockLocation,
  };
});

// Create a complete Auth0 context mock
const createMockAuth0Context = (overrides: Partial<Auth0ContextInterface<User>> = {}): Auth0ContextInterface<User> => ({
  isAuthenticated: false,
  isLoading: false,
  user: undefined,
  error: undefined,
  loginWithRedirect: vi.fn(),
  loginWithPopup: vi.fn(),
  logout: vi.fn(),
  getAccessTokenSilently: vi.fn(),
  getAccessTokenWithPopup: vi.fn(),
  getIdTokenClaims: vi.fn(),
  handleRedirectCallback: vi.fn(),
  ...overrides
});

describe('MyOrdersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocation.state = null;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe('Authentication States', () => {
    it('shows loading message when authentication is loading', () => {
      mockedUseAuth0.mockReturnValue(createMockAuth0Context({
        isLoading: true,
        isAuthenticated: false
      }));

      render(
        <MemoryRouter>
          <MyOrdersPage />
        </MemoryRouter>
      );

      expect(screen.getByText('Loading authentication...')).toBeInTheDocument();
    });

    it('shows login prompt when user is not authenticated', () => {
      mockedUseAuth0.mockReturnValue(createMockAuth0Context({
        isLoading: false,
        isAuthenticated: false
      }));

      render(
        <MemoryRouter>
          <MyOrdersPage />
        </MemoryRouter>
      );

      expect(screen.getByText('Please log in to view your order history.')).toBeInTheDocument();
    });
  });

  describe('Authenticated User - Order Loading', () => {
    it('shows skeleton loading state initially', async () => {
      const mockGetAccessToken = vi.fn().mockResolvedValue('mock-token');
      mockedUseAuth0.mockReturnValue(createMockAuth0Context({
        isAuthenticated: true,
        isLoading: false,
        getAccessTokenSilently: mockGetAccessToken
      }));

      const mockGet = mockAxiosInstance.get as Mock;
      mockGet.mockImplementation(() => new Promise(() => {})); // Never resolves

      await act(async () => {
        render(
          <MemoryRouter>
            <MyOrdersPage />
          </MemoryRouter>
        );
      });

      expect(screen.getByLabelText('Loading your orders...')).toBeInTheDocument();
      
      const skeletonItems = document.querySelectorAll('.skeleton-item');
      expect(skeletonItems.length).toBeGreaterThan(0);
    });
  });

  describe('Skeleton Loading', () => {
    it('shows skeleton with proper structure', async () => {
      const mockGetAccessToken = vi.fn().mockResolvedValue('mock-token');
      mockedUseAuth0.mockReturnValue(createMockAuth0Context({
        isAuthenticated: true,
        isLoading: false,
        getAccessTokenSilently: mockGetAccessToken
      }));

      const mockGet = mockAxiosInstance.get as Mock;
      mockGet.mockImplementation(() => new Promise(() => {})); // Never resolves

      await act(async () => {
        render(
          <MemoryRouter>
            <MyOrdersPage />
          </MemoryRouter>
        );
      });

      expect(screen.getByLabelText('Loading your orders...')).toBeInTheDocument();
      
      const skeletonItems = document.querySelectorAll('.skeleton-item');
      expect(skeletonItems.length).toBeGreaterThan(0);
    });
  });
});