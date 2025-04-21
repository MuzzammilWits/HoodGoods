import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom'; // Needed for <Link> components
import { vi } from 'vitest'; // Or import { jest } from '@jest/globals'; if using Jest
import Navbar from './Navbar'; // Adjust path if needed

// --- Mocks ---

// Mock useAuth0 hook
// We'll use a factory to easily change the mock's return value per test suite
const mockUseAuth0 = vi.fn();
vi.mock('@auth0/auth0-react', () => ({
    useAuth0: () => mockUseAuth0(), // Return the mock function's result
}));

// Mock fetch API
global.fetch = vi.fn();
const mockedFetch = vi.mocked(global.fetch);

// Mock sessionStorage (optional, but good for verifying token storage)
const mockSessionStorage = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: vi.fn((key: string) => store[key] || null),
        setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
        removeItem: vi.fn((key: string) => { delete store[key]; }),
        clear: vi.fn(() => { store = {}; }),
    };
})();
Object.defineProperty(window, 'sessionStorage', { value: mockSessionStorage });

// Mock window.location (for redirect tests)
const originalLocation = window.location;
beforeAll(() => {
    // Define window.location properties needed for tests
    Object.defineProperty(window, 'location', {
        configurable: true,
        value: { ...originalLocation, assign: vi.fn(), href: '' }, // Mock href assignment
    });
});
afterAll(() => {
    // Restore original window.location
    Object.defineProperty(window, 'location', {
        configurable: true,
        value: originalLocation,
    });
});


// Mock ImageImports (usually just needs to provide a value)
vi.mock('./utils/ImageImports', () => ({
    logo: 'mock-logo.png',
}));

// Helper to set default Auth0 mock values
const setDefaultAuth0Mock = (overrides = {}) => {
    mockUseAuth0.mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        // role: null, // Role is fetched, not part of Auth0 state directly
        // isRoleLoading: true, // Component manages its own role loading state
        getAccessTokenSilently: vi.fn().mockResolvedValue('mock-access-token'),
        loginWithRedirect: vi.fn(),
        logout: vi.fn(),
        getIdTokenClaims: vi.fn(), // Mock if used
        ...overrides,
    });
};

// Helper to setup fetch mocks for role/register
const setupFetchMocks = (roleResponse: any = { role: 'user' }, roleStatus = 200, registerStatus = 200) => {
     mockedFetch.mockImplementation(async (url) => {
        const urlString = url.toString();
        if (urlString.includes('/auth/me')) {
            console.log(`[TEST] Mocking fetch for /auth/me - Status: ${roleStatus}`);
            // Simulate slight delay for role fetch if needed for waitFor
            // await new Promise(res => setTimeout(res, 10));
            return {
                ok: roleStatus === 200,
                status: roleStatus,
                json: async () => {
                    if (roleStatus !== 200) throw new Error('Failed to parse JSON');
                    return roleResponse;
                 },
            } as Response;
        }
        if (urlString.includes('/auth/register')) {
             console.log(`[TEST] Mocking fetch for /auth/register - Status: ${registerStatus}`);
            return {
                ok: registerStatus === 200,
                status: registerStatus,
                json: async () => ({ message: 'Registered/Updated' }),
            } as Response;
        }
        // Default fallback
        console.log(`[TEST] Mocking fetch default 404 for ${urlString}`);
        return { ok: false, status: 404, json: async () => ({ message: 'Not Found' }) } as Response;
    });
};


// --- Test Suite ---
describe('Navbar Component', () => {
    beforeEach(() => {
        // Reset mocks before each test
        vi.clearAllMocks();
        mockSessionStorage.clear();
        mockedFetch.mockClear(); // Clear fetch calls specifically
        // Reset window.location.href mock if needed
        Object.defineProperty(window, 'location', {
             configurable: true,
             value: { ...window.location, href: '' },
        });
        // Set a default mock state for Auth0 before each test
        setDefaultAuth0Mock();
        // Set a default successful fetch mock
        setupFetchMocks();
    });

    // --- Test Cases ---

    test('renders standard links correctly', () => {
        render(<MemoryRouter><Navbar /></MemoryRouter>);
        expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /products/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /about us/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /🛒/i })).toBeInTheDocument(); // Cart icon link
        expect(screen.getByRole('link', { name: /👤/i })).toBeInTheDocument(); // Account icon link
    });

    test('renders loading state initially', () => {
        setDefaultAuth0Mock({ isLoading: true }); // Override default to set loading
        render(<MemoryRouter><Navbar /></MemoryRouter>);

        // Auth buttons/greeting should NOT be present
        expect(screen.queryByRole('button', { name: /sign in/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /sign out/i })).not.toBeInTheDocument();
        expect(screen.queryByText(/hi,/i)).not.toBeInTheDocument();

        // Conditional links should NOT be present
        expect(screen.queryByRole('button', { name: /become a seller/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('link', { name: /my store/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('link', { name: /admin dashboard/i })).not.toBeInTheDocument();
    });

    test('renders "Sign in" button when logged out', () => {
        setDefaultAuth0Mock({ isLoading: false, isAuthenticated: false }); // Explicitly logged out
        render(<MemoryRouter><Navbar /></MemoryRouter>);

        expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /sign out/i })).not.toBeInTheDocument();
        expect(screen.queryByText(/hi,/i)).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /become a seller/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('link', { name: /my store/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('link', { name: /admin dashboard/i })).not.toBeInTheDocument();
    });

    test('calls loginWithRedirect when "Sign in" is clicked', () => {
        const loginMock = vi.fn();
        setDefaultAuth0Mock({ isLoading: false, isAuthenticated: false, loginWithRedirect: loginMock });
        render(<MemoryRouter><Navbar /></MemoryRouter>);

        const signInButton = screen.getByRole('button', { name: /sign in/i });
        fireEvent.click(signInButton);

        expect(loginMock).toHaveBeenCalledTimes(1);
    });

    test('renders user greeting, "Sign out", and "Become a Seller" when logged in as regular user', async () => {
        const mockUser = { name: 'Test User', given_name: 'Test' };
        setDefaultAuth0Mock({ isLoading: false, isAuthenticated: true, user: mockUser });
        setupFetchMocks({ role: 'user' }); // Mock role fetch

        render(<MemoryRouter><Navbar /></MemoryRouter>);

        // Wait for the useEffect to fetch role and update state
        // Use findBy* which incorporates waitFor
        expect(await screen.findByText(/hi, Test/i)).toBeInTheDocument(); // Check greeting

        expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /become a seller/i })).toBeInTheDocument(); // Should show for 'user' role
        expect(screen.queryByRole('button', { name: /sign in/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('link', { name: /my store/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('link', { name: /admin dashboard/i })).not.toBeInTheDocument();

        // Verify useEffect actions
        await waitFor(() => {
            expect(mockUseAuth0().getAccessTokenSilently).toHaveBeenCalled();
            expect(mockSessionStorage.setItem).toHaveBeenCalledWith('access_token', 'mock-access-token');
            expect(mockedFetch).toHaveBeenCalledWith(expect.stringContaining('/auth/register'), expect.any(Object));
            expect(mockedFetch).toHaveBeenCalledWith(expect.stringContaining('/auth/me'), expect.any(Object));
        });
    });

     test('renders "My Store" link when logged in as seller', async () => {
        const mockUser = { name: 'Seller User', given_name: 'Seller' };
        setDefaultAuth0Mock({ isLoading: false, isAuthenticated: true, user: mockUser });
        setupFetchMocks({ role: 'seller' }); // Mock role fetch

        render(<MemoryRouter><Navbar /></MemoryRouter>);

        expect(await screen.findByText(/hi, Seller/i)).toBeInTheDocument();

        expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /my store/i })).toBeInTheDocument(); // Should show for 'seller' role
        expect(screen.queryByRole('button', { name: /sign in/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /become a seller/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('link', { name: /admin dashboard/i })).not.toBeInTheDocument();

         await waitFor(() => {
            expect(mockedFetch).toHaveBeenCalledWith(expect.stringContaining('/auth/me'), expect.any(Object));
        });
    });

     test('renders "Admin Dashboard" link when logged in as admin', async () => {
        const mockUser = { name: 'Admin User', given_name: 'Admin' };
        setDefaultAuth0Mock({ isLoading: false, isAuthenticated: true, user: mockUser });
        setupFetchMocks({ role: 'admin' }); // Mock role fetch

        render(<MemoryRouter><Navbar /></MemoryRouter>);

        expect(await screen.findByText(/hi, Admin/i)).toBeInTheDocument();

        expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /admin dashboard/i })).toBeInTheDocument(); // Should show for 'admin' role
        expect(screen.queryByRole('button', { name: /sign in/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /become a seller/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('link', { name: /my store/i })).not.toBeInTheDocument();

        await waitFor(() => {
            expect(mockedFetch).toHaveBeenCalledWith(expect.stringContaining('/auth/me'), expect.any(Object));
        });
    });


    test('calls logout when "Sign out" is clicked', async () => {
        const logoutMock = vi.fn();
        const mockUser = { name: 'Test User', given_name: 'Test' };
        setDefaultAuth0Mock({ isLoading: false, isAuthenticated: true, user: mockUser, logout: logoutMock });
        setupFetchMocks({ role: 'user' });

        render(<MemoryRouter><Navbar /></MemoryRouter>);

        // Wait for button to appear after role fetch
        const signOutButton = await screen.findByRole('button', { name: /sign out/i });
        fireEvent.click(signOutButton);

        expect(logoutMock).toHaveBeenCalledTimes(1);
        expect(logoutMock).toHaveBeenCalledWith({
            logoutParams: { returnTo: window.location.origin }
        });
    });

    test('handles role fetch failure gracefully', async () => {
        const mockUser = { name: 'Test User', given_name: 'Test' };
        setDefaultAuth0Mock({ isLoading: false, isAuthenticated: true, user: mockUser });
        setupFetchMocks(null, 500); // Mock role fetch failure (status 500)

        render(<MemoryRouter><Navbar /></MemoryRouter>);

        // Wait for the useEffect attempt and subsequent render
        await waitFor(() => {
             // Check that the fetch call was made
             expect(mockedFetch).toHaveBeenCalledWith(expect.stringContaining('/auth/me'), expect.any(Object));
             // Check that greeting is still rendered (auth state is independent of role fetch)
             expect(screen.getByText(/hi, Test/i)).toBeInTheDocument();
        });

        // Should still show user greeting and sign out as auth state is true
        expect(screen.getByText(/hi, Test/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();

        // Conditional links based on role should NOT be rendered because role state is null,
        // BUT "Become a Seller" SHOULD be rendered in this case according to component logic.
        // --- FIX: Corrected Assertion ---
        expect(screen.getByRole('button', { name: /become a seller/i })).toBeInTheDocument();
        // --- End FIX ---
        expect(screen.queryByRole('link', { name: /my store/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('link', { name: /admin dashboard/i })).not.toBeInTheDocument();
    });

     test('redirects when "Become a Seller" is clicked', async () => {
        const mockUser = { name: 'Test User', given_name: 'Test' };
        setDefaultAuth0Mock({ isLoading: false, isAuthenticated: true, user: mockUser });
        setupFetchMocks({ role: 'user' }); // Ensure role is 'user' so button renders

        render(<MemoryRouter><Navbar /></MemoryRouter>);

        const becomeSellerButton = await screen.findByRole('button', { name: /become a seller/i });
        fireEvent.click(becomeSellerButton);

        // Check if window.location.href was assigned the correct value
        expect(window.location.href).toBe('/create-store');
    });

});
