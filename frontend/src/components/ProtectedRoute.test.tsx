import React from 'react';
import { vi } from 'vitest'; 

// --- START Vitest specific mocking for import.meta.env ---
// This MUST be before ProtectedRoute is imported
const MOCKED_BACKEND_URL = 'http://localhost:3000';
interface MockImportMetaEnv {
  VITE_BACKEND_URL: string;
  BASE_URL: string;
  MODE: string;
  DEV: boolean;
  PROD: boolean;
  SSR: boolean;
}
const mockEnv: MockImportMetaEnv = {
  VITE_BACKEND_URL: MOCKED_BACKEND_URL,
  BASE_URL: '/',
  MODE: 'test',
  DEV: true,
  PROD: false,
  SSR: false,
};
vi.stubGlobal('import', { meta: { env: mockEnv } });
// --- END Vitest specific mocking for import.meta.env ---


// Now import other modules
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute'; // Adjust path as necessary
import { useAuth0 } from '@auth0/auth0-react';


// Mock the Auth0 hook using Vitest
vi.mock('@auth0/auth0-react');
const mockUseAuth0 = useAuth0 as ReturnType<typeof vi.fn>;

// Mock react-router-dom's Navigate component using Vitest
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    Navigate: vi.fn(({ to }) => {
      return <p>Redirecting to {to}</p>;
    }),
  };
});

import { Navigate as MockedNavigateFromRRD } from 'react-router-dom';


// Mock global fetch using Vitest
global.fetch = vi.fn();
const mockFetch = global.fetch as ReturnType<typeof vi.fn>;

// Spy on console.error
const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});


// Dummy components for testing routes

const MockPublicPage = () => (
  <main>
    <p>Public Page</p>
  </main>
);

const MockProtectedPage = () => (
  <main data-testid="protected-content">
    <p>Protected Content</p>
  </main>
);

const AnotherMockProtectedPage = () => (
  <main data-testid="another-protected-content">
    <p>Another Protected Page Content</p>
  </main>
);
describe('ProtectedRoute', () => {
  beforeEach(() => {
    mockUseAuth0.mockReset();
    mockFetch.mockReset();
    (MockedNavigateFromRRD as ReturnType<typeof vi.fn>).mockClear();
    consoleErrorSpy.mockClear(); // Clear console.error spy
  });

  afterEach(() => {
    vi.unstubAllGlobals(); // Important to clean up stubs
    vi.clearAllMocks();
  });

  const renderComponent = (
    isAuthenticated: boolean,
    auth0IsLoading: boolean = false,
    getAccessTokenSilently?: ReturnType<typeof vi.fn>,
    allowedRoles: string[] = ['buyer'],
    initialRoute: string = '/protected',
    children: React.ReactNode = <MockProtectedPage /> // Allow custom children
  ) => {
    mockUseAuth0.mockReturnValue({
      isAuthenticated,
      isLoading: auth0IsLoading,
      getAccessTokenSilently: getAccessTokenSilently || vi.fn().mockResolvedValue('fake-token'),
    });

    return render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          <Route path="/" element={<MockPublicPage />} />
          <Route
            path="/protected"
            element={
              <ProtectedRoute allowedRoles={allowedRoles}>
                {children}
              </ProtectedRoute>
            }
          />
           <Route // Keep for general routing setup if other tests use it
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <MockProtectedPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );
  };

  test('should render null while loading role (component internal loading)', () => {
    const neverResolvingPromise = new Promise<string>(() => {});
    renderComponent(true, false, vi.fn(() => neverResolvingPromise));

    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    expect(screen.queryByText(/Redirecting to \//)).not.toBeInTheDocument();
  });

  test('should redirect if not authenticated, even if auth0 is initially loading (original component behavior)', async () => {
    renderComponent(false, true);

    await waitFor(() => {
      expect(screen.getByText('Redirecting to /')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });


  test('should redirect to "/" if user is not authenticated (and auth0 is not loading)', async () => {
    renderComponent(false, false);
    await waitFor(() => {
      expect(screen.getByText('Redirecting to /')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  test('should redirect to "/" if user is authenticated but role is not allowed', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ role: 'seller' }),
    } as Response);

    renderComponent(true, false, undefined, ['admin']);

    await waitFor(() => {
      expect(screen.getByText('Redirecting to /')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  test('should render children if user is authenticated and role is allowed', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ role: 'buyer' }),
    } as Response);

    renderComponent(true, false, undefined, ['buyer']);

    await waitFor(() => {
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });
    expect(screen.queryByText(/Redirecting to \//)).not.toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  test('should render children if user is authenticated and has one of multiple allowed roles', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ role: 'editor' }),
    } as Response);

    renderComponent(true, false, undefined, ['viewer', 'editor', 'admin']);

    await waitFor(() => {
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });
    expect(screen.queryByText(/Redirecting to \//)).not.toBeInTheDocument();
  });


  test('should call getAccessTokenSilently when authenticated (and auth0 is not loading)', async () => {
    const mockGetAccessTokenSilently = vi.fn().mockResolvedValue('test-token');
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ role: 'buyer' }),
    } as Response);

    renderComponent(true, false, mockGetAccessTokenSilently, ['buyer']);

    await waitFor(() => {
      expect(mockGetAccessTokenSilently).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
        expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });
  });

  test('should render children if getAccessTokenSilently fails (DUE TO CURRENT BUGGY BEHAVIOR)', async () => {
    const mockGetAccessTokenSilently = vi.fn().mockRejectedValue(new Error('Token error'));

    renderComponent(true, false, mockGetAccessTokenSilently, ['buyer']);

    await waitFor(() => { // Wait for loading to be false and effect to run
      expect(consoleErrorSpy).toHaveBeenCalledWith("Error fetching role:", expect.any(Error));
    });
    await waitFor(() => {
      expect(mockGetAccessTokenSilently).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });
    expect(screen.queryByText(/Redirecting to \//)).not.toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });

 

  // NEW TEST CASES 

  test('should redirect if allowedRoles is empty and user is authenticated with a role (original behavior: redirect because role not in empty list)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ role: 'buyer' }),
    } as Response);

    renderComponent(true, false, undefined, []); // Empty allowedRoles

    await waitFor(() => {
      expect(screen.getByText('Redirecting to /')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  test('should render children if allowedRoles is empty and role fetch fails (DUE TO CURRENT BUGGY BEHAVIOR)', async () => {
    // This case is interesting: if allowedRoles is [], and role is null (due to fetch error),
    // the buggy condition `(role && !allowedRoles.includes(role))` becomes `(null && true)` which is null/false.
    // So `!isAuthenticated (false) || null (false)` -> false. Children rendered.
    mockFetch.mockRejectedValueOnce(new Error('Failed to fetch role'));
    renderComponent(true, false, undefined, []); // Empty allowedRoles

    await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith("Error fetching role:", expect.any(Error));
    });
    await waitFor(() => {
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });
    expect(screen.queryByText(/Redirecting to \//)).not.toBeInTheDocument();
  });


  test('should redirect if role casing does not match allowedRoles (original behavior: case-sensitive redirect)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ role: 'Buyer' }), // Role from backend: "Buyer"
    } as Response);

    renderComponent(true, false, undefined, ['buyer']); // allowedRoles: "buyer"

    await waitFor(() => {
      expect(screen.getByText('Redirecting to /')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  test('should render children if role property is missing in fetch response (DUE TO CURRENT BUGGY BEHAVIOR)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}), // No 'role' property
    } as Response);

    renderComponent(true, false, undefined, ['buyer']);

    // In the original component, if `data.role` is undefined, `setRole(undefined)` is called.
    // `role` becomes `undefined`.
    // The condition `(role && !allowedRoles.includes(role))` -> `(undefined && ...)` is false.
    // So children are rendered.
    await waitFor(() => {
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });
    expect(screen.queryByText(/Redirecting to \//)).not.toBeInTheDocument();
    expect(consoleErrorSpy).not.toHaveBeenCalled(); // No explicit error log in this specific path in original code
  });

  test('should render children if role property is null in fetch response (DUE TO CURRENT BUGGY BEHAVIOR)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ role: null }), // 'role' property is null
    } as Response);

    renderComponent(true, false, undefined, ['buyer']);
    // `setRole(null)` is called.
    // `(role && !allowedRoles.includes(role))` -> `(null && ...)` is false.
    // Children rendered.
    await waitFor(() => {
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });
    expect(screen.queryByText(/Redirecting to \//)).not.toBeInTheDocument();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  test('should render different children if provided', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ role: 'admin' }),
    } as Response);

    renderComponent(true, false, undefined, ['admin'], '/protected', <AnotherMockProtectedPage />);

    await waitFor(() => {
      expect(screen.getByTestId('another-protected-content')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument(); // Ensure default children not rendered
    expect(screen.queryByText(/Redirecting to \//)).not.toBeInTheDocument();
  });

  test('should still redirect if unauthenticated even with custom children', async () => {
    renderComponent(false, false, undefined, ['admin'], '/protected', <AnotherMockProtectedPage />);
    await waitFor(() => {
      expect(screen.getByText('Redirecting to /')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('another-protected-content')).not.toBeInTheDocument();
  });

});