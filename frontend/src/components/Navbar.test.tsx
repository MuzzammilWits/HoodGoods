import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

// Mock window.location (for redirect tests - less needed now with Link)
const originalLocation = window.location;
beforeAll(() => {
    // Define window.location properties needed for tests
    Object.defineProperty(window, 'location', {
        configurable: true,
        value: { ...originalLocation, assign: vi.fn(), href: '', origin: 'http://localhost' }, // Added origin for logout test
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
        console.log(`[TEST] Mocking fetch default 404 for ${urlString}`);
        return { ok: false, status: 404, json: async () => ({ message: 'Not Found' }) } as Response;
    });
};


// --- Test Suite ---
describe('Navbar Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockSessionStorage.clear();
        mockedFetch.mockClear();
        Object.defineProperty(window, 'location', {
             configurable: true,
             value: { ...window.location, href: '' }, // Reset href
        });
        setDefaultAuth0Mock();
        setupFetchMocks();
    });

    // --- Test Cases ---

    test('renders standard links correctly', () => {
        render(<MemoryRouter><Navbar /></MemoryRouter>);
        expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /products/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /about us/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /🛒/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /👤/i })).toBeInTheDocument();
    });

    test('renders loading state initially', () => {
        setDefaultAuth0Mock({ isLoading: true });
        render(<MemoryRouter><Navbar /></MemoryRouter>);
        expect(screen.queryByRole('button', { name: /sign in/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /sign out/i })).not.toBeInTheDocument();
        expect(screen.queryByText(/hi,/i)).not.toBeInTheDocument();
        // --- FIX: Query for link role ---
        expect(screen.queryByRole('link', { name: /become a seller/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('link', { name: /my store/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('link', { name: /admin dashboard/i })).not.toBeInTheDocument();
    });

    test('renders "Sign in" button when logged out', () => {
        setDefaultAuth0Mock({ isLoading: false, isAuthenticated: false });
        render(<MemoryRouter><Navbar /></MemoryRouter>);
        expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /sign out/i })).not.toBeInTheDocument();
        expect(screen.queryByText(/hi,/i)).not.toBeInTheDocument();
         // --- FIX: Query for link role ---
        expect(screen.queryByRole('link', { name: /become a seller/i })).not.toBeInTheDocument();
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
        setupFetchMocks({ role: 'user' });

        render(<MemoryRouter><Navbar /></MemoryRouter>);

        expect(await screen.findByText(/hi, Test/i)).toBeInTheDocument();

        expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
        // --- FIX: Query for link role ---
        expect(screen.getByRole('link', { name: /become a seller/i })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /sign in/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('link', { name: /my store/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('link', { name: /admin dashboard/i })).not.toBeInTheDocument();

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
        setupFetchMocks({ role: 'seller' });

        render(<MemoryRouter><Navbar /></MemoryRouter>);

        expect(await screen.findByText(/hi, Seller/i)).toBeInTheDocument();

        expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /my store/i })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /sign in/i })).not.toBeInTheDocument();
         // --- FIX: Query for link role ---
        expect(screen.queryByRole('link', { name: /become a seller/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('link', { name: /admin dashboard/i })).not.toBeInTheDocument();

         await waitFor(() => {
            expect(mockedFetch).toHaveBeenCalledWith(expect.stringContaining('/auth/me'), expect.any(Object));
        });
    });

     test('renders "Admin Dashboard" link when logged in as admin', async () => {
        const mockUser = { name: 'Admin User', given_name: 'Admin' };
        setDefaultAuth0Mock({ isLoading: false, isAuthenticated: true, user: mockUser });
        setupFetchMocks({ role: 'admin' });

        render(<MemoryRouter><Navbar /></MemoryRouter>);

        expect(await screen.findByText(/hi, Admin/i)).toBeInTheDocument();

        expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /admin dashboard/i })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /sign in/i })).not.toBeInTheDocument();
         // --- FIX: Query for link role ---
        expect(screen.queryByRole('link', { name: /become a seller/i })).not.toBeInTheDocument();
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
        setupFetchMocks(null, 500); // Mock role fetch failure

        render(<MemoryRouter><Navbar /></MemoryRouter>);

        await waitFor(() => {
             expect(mockedFetch).toHaveBeenCalledWith(expect.stringContaining('/auth/me'), expect.any(Object));
             expect(screen.getByText(/hi, Test/i)).toBeInTheDocument();
        });

        expect(screen.getByText(/hi, Test/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();

        // --- FIX: Query for link role and expect it TO be in document ---
        expect(screen.getByRole('link', { name: /become a seller/i })).toBeInTheDocument();
        // --- End FIX ---
        expect(screen.queryByRole('link', { name: /my store/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('link', { name: /admin dashboard/i })).not.toBeInTheDocument();
    });

     test('redirects when "Become a Seller" is clicked', async () => {
        const mockUser = { name: 'Test User', given_name: 'Test' };
        setDefaultAuth0Mock({ isLoading: false, isAuthenticated: true, user: mockUser });
        setupFetchMocks({ role: 'user' }); // Ensure role is 'user' so link renders

        render(<MemoryRouter><Navbar /></MemoryRouter>);

        // --- FIX: Query for link role ---
        const becomeSellerLink = await screen.findByRole('link', { name: /become a seller/i });
        expect(becomeSellerLink).toHaveAttribute('href', '/create-store'); // Verify href

        // fireEvent.click(becomeSellerLink); // Clicking Link updates MemoryRouter history
        // You could potentially check history object if needed for more complex routing tests
        // For this component, verifying the link exists with correct href is sufficient
        // expect(window.location.href).toBe('/create-store'); // REMOVED - Link doesn't set window.location.href directly
    });

});
