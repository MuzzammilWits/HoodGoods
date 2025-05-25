import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Route, Routes,  } from 'react-router-dom'; // Import Routes and Route for path checking
import { vi } from 'vitest';
import Navbar from './Navbar';

// --- Mocks ---
const mockUseAuth0 = vi.fn();
vi.mock('@auth0/auth0-react', () => ({
    useAuth0: () => mockUseAuth0(),
}));

global.fetch = vi.fn();
const mockedFetch = vi.mocked(global.fetch);

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

const originalLocation = window.location;
let mockNavigate = vi.fn(); // Mock for useNavigate

beforeAll(() => {
    Object.defineProperty(window, 'location', {
        writable: true,
        value: {
            ...originalLocation,
            assign: vi.fn(),
            reload: vi.fn(),
            origin: 'http://localhost:3000',
            href: 'http://localhost:3000/',
            pathname: '/',
        },
    });
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    document.getElementById = vi.fn();
});

afterAll(() => {
    Object.defineProperty(window, 'location', {
        configurable: true,
        value: originalLocation,
    });
    vi.restoreAllMocks();
    // @ts-ignore
    document.getElementById.mockRestore?.();
    // @ts-ignore
    window.HTMLElement.prototype.scrollIntoView.mockRestore?.();
});

vi.mock('./utils/ImageImports', () => ({
    logo: 'mock-logo.png',
}));

// Mock react-router-dom's useNavigate
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate, // Return our mock navigate function
    };
});


const setDefaultAuth0Mock = (overrides = {}) => {
    mockUseAuth0.mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        getAccessTokenSilently: vi.fn().mockResolvedValue('mock-access-token'),
        loginWithRedirect: vi.fn(),
        logout: vi.fn(),
        getIdTokenClaims: vi.fn(),
        ...overrides,
    });
};

const setupFetchMocks = (roleResponse: any = { role: 'user' }, roleStatus = 200, registerStatus = 200) => {
     mockedFetch.mockImplementation(async (url) => {
         const urlString = url.toString();
         if (urlString.includes('/auth/me')) {
             if (roleStatus !== 200) {
                 return Promise.resolve({ ok: false, status: roleStatus, statusText: `Error ${roleStatus}` } as Response);
             }
             return Promise.resolve({
                 ok: true,
                 status: 200,
                 json: async () => roleResponse,
             } as Response);
         }
         if (urlString.includes('/auth/register')) {
             return Promise.resolve({
                 ok: registerStatus === 200,
                 status: registerStatus,
                 json: async () => ({ message: 'Registered/Updated' }),
             } as Response);
         }
         return Promise.resolve({ ok: false, status: 404, json: async () => ({ message: 'Not Found' }) } as Response);
     });
};

const renderNavbar = (initialRoute = '/') => {
    return render(
        <MemoryRouter initialEntries={[initialRoute]}>
            <Routes>
                <Route path="*" element={<Navbar />} />
            </Routes>
        </MemoryRouter>
    );
};


describe('Navbar Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockSessionStorage.clear();
        mockedFetch.mockClear();
        mockNavigate.mockClear(); // Clear navigate mock
        Object.defineProperty(window, 'location', {
            writable: true,
            value: {
                ...window.location,
                href: 'http://localhost:3000/',
                pathname: '/',
                assign: vi.fn(),
                reload: vi.fn(),
                origin: window.location.origin
            },
        });
        setDefaultAuth0Mock();
        setupFetchMocks();
        vi.mocked(document.getElementById).mockClear();
        vi.mocked(window.HTMLElement.prototype.scrollIntoView).mockClear();
    });

    test('renders standard links and guest icons correctly when logged out', () => {
        renderNavbar();
        expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /products/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /about us/i })).toBeInTheDocument();
        // Icons are not present when logged out
        expect(screen.queryByRole('link', { name: 'My Cart' })).not.toBeInTheDocument();
        expect(screen.queryByRole('link', { name: 'My Orders' })).not.toBeInTheDocument();
    });

    test('renders standard links and authenticated icons correctly when logged in as user', async () => {
        setDefaultAuth0Mock({ isAuthenticated: true, isLoading: false, user: { name: 'Test User' } });
        setupFetchMocks({ role: 'user' }); // Ensure role is 'user'
        renderNavbar();

        await waitFor(() => {
             expect(mockedFetch).toHaveBeenCalledWith(expect.stringContaining('/auth/me'), expect.any(Object));
        });

        expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /products/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /about us/i })).toBeInTheDocument();
        // Corrected icon names and expectations
        expect(screen.getByRole('link', { name: 'My Cart' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'My Orders' })).toBeInTheDocument();
    });

    test('renders loading state initially', () => {
        setDefaultAuth0Mock({ isLoading: true });
        renderNavbar();
        expect(screen.queryByRole('button', { name: /sign in/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /sign out/i })).not.toBeInTheDocument();
        expect(screen.queryByText(/hi,/i)).not.toBeInTheDocument();
        expect(screen.queryByRole('link', { name: /become a seller/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('link', { name: /my store/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('link', { name: /admin dashboard/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('link', { name: 'My Cart' })).not.toBeInTheDocument();
        expect(screen.queryByRole('link', { name: 'My Orders' })).not.toBeInTheDocument();
    });

    test('renders "Sign in" button when logged out', () => {
        setDefaultAuth0Mock({ isLoading: false, isAuthenticated: false });
        renderNavbar();
        expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /sign out/i })).not.toBeInTheDocument();
        expect(screen.queryByText(/hi,/i)).not.toBeInTheDocument();
        expect(screen.queryByRole('link', { name: /become a seller/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('link', { name: /my store/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('link', { name: /admin dashboard/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('link', { name: 'My Cart' })).not.toBeInTheDocument();
        expect(screen.queryByRole('link', { name: 'My Orders' })).not.toBeInTheDocument();
    });

    test('calls loginWithRedirect when "Sign in" is clicked', () => {
        const loginMock = vi.fn();
        setDefaultAuth0Mock({ isLoading: false, isAuthenticated: false, loginWithRedirect: loginMock });
        renderNavbar();
        const signInButton = screen.getByRole('button', { name: /sign in/i });
        fireEvent.click(signInButton);
        expect(loginMock).toHaveBeenCalledTimes(1);
    });

    test('renders user greeting, "Sign out", and "Become a Seller" when logged in as regular user', async () => {
        const mockUser = { name: 'Test User', given_name: 'Test' };
        setDefaultAuth0Mock({ isLoading: false, isAuthenticated: true, user: mockUser });
        setupFetchMocks({ role: 'user' });
        renderNavbar();

        await waitFor(() => {
             expect(mockedFetch).toHaveBeenCalledWith(expect.stringContaining('/auth/me'), expect.any(Object));
        });

        expect(screen.getByText(/hi, Test/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /sign in/i })).not.toBeInTheDocument();
        expect(screen.getByRole('link', { name: /become a seller/i })).toBeInTheDocument();
        expect(screen.queryByRole('link', { name: /my store/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('link', { name: /admin dashboard/i })).not.toBeInTheDocument();
        // Corrected icon names
        expect(screen.getByRole('link', { name: 'My Cart' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'My Orders' })).toBeInTheDocument();

        await waitFor(() => {
            expect(mockUseAuth0().getAccessTokenSilently).toHaveBeenCalled();
            expect(mockSessionStorage.setItem).toHaveBeenCalledWith('access_token', 'mock-access-token');
            expect(mockedFetch).toHaveBeenCalledWith(expect.stringContaining('/auth/register'), expect.any(Object));
        });
    });

     test('renders "My Store" link when logged in as seller', async () => {
        const mockUser = { name: 'Seller User', given_name: 'Seller' };
        setDefaultAuth0Mock({ isLoading: false, isAuthenticated: true, user: mockUser });
        setupFetchMocks({ role: 'seller' }); // Role is seller
        renderNavbar();

         await waitFor(() => {
             expect(mockedFetch).toHaveBeenCalledWith(expect.stringContaining('/auth/me'), expect.any(Object));
        });

        expect(screen.getByText(/hi, Seller/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /sign in/i })).not.toBeInTheDocument();
        expect(screen.getByRole('link', { name: /my store/i })).toBeInTheDocument();
        expect(screen.queryByRole('link', { name: /become a seller/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('link', { name: /admin dashboard/i })).not.toBeInTheDocument();
        // Corrected icon names
        expect(screen.getByRole('link', { name: 'My Cart' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'My Orders' })).toBeInTheDocument();
    });

     test('renders "Admin Dashboard" link when logged in as admin and NO user-specific icons', async () => {
        const mockUser = { name: 'Admin User', given_name: 'Admin' };
        setDefaultAuth0Mock({ isLoading: false, isAuthenticated: true, user: mockUser });
        setupFetchMocks({ role: 'admin' }); // Role is admin
        renderNavbar();

         await waitFor(() => {
             expect(mockedFetch).toHaveBeenCalledWith(expect.stringContaining('/auth/me'), expect.any(Object));
        });

        expect(screen.getByText(/hi, Admin/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /sign in/i })).not.toBeInTheDocument();
        expect(screen.getByRole('link', { name: /admin dashboard/i })).toBeInTheDocument();
        expect(screen.queryByRole('link', { name: /become a seller/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('link', { name: /my store/i })).not.toBeInTheDocument();
        // Icons should NOT be present for admin
        expect(screen.queryByRole('link', { name: 'My Cart' })).not.toBeInTheDocument();
        expect(screen.queryByRole('link', { name: 'My Orders' })).not.toBeInTheDocument();
    });


    test('calls logout when "Sign out" is clicked', async () => {
        const logoutMock = vi.fn();
        const mockUser = { name: 'Test User', given_name: 'Test' };
        setDefaultAuth0Mock({ isLoading: false, isAuthenticated: true, user: mockUser, logout: logoutMock });
        setupFetchMocks({ role: 'user' });
        renderNavbar();

        const signOutButton = await screen.findByRole('button', { name: /sign out/i });
        fireEvent.click(signOutButton);

        expect(logoutMock).toHaveBeenCalledTimes(1);
        expect(logoutMock).toHaveBeenCalledWith({
            logoutParams: { returnTo: window.location.origin }
        });
    });

    test('handles role fetch failure gracefully (user sees default user links and icons)', async () => {
        const mockUser = { name: 'Test User', given_name: 'Test' };
        setDefaultAuth0Mock({ isLoading: false, isAuthenticated: true, user: mockUser });
        setupFetchMocks(null, 500); // Mock role fetch failure, role will be null
        renderNavbar();

        await waitFor(() => {
            expect(mockedFetch).toHaveBeenCalledWith(expect.stringContaining('/auth/me'), expect.any(Object));
        });

        expect(screen.getByText(/hi, Test/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
        // Corrected icon names
        expect(screen.getByRole('link', { name: 'My Cart' })).toBeInTheDocument(); // Shown when role is null (not admin)
        expect(screen.getByRole('link', { name: 'My Orders' })).toBeInTheDocument(); // Shown when role is null (not admin)
        expect(screen.getByRole('link', { name: /become a seller/i })).toBeInTheDocument(); // Shown when role is null (not admin or seller)
        expect(screen.queryByRole('link', { name: /my store/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('link', { name: /admin dashboard/i })).not.toBeInTheDocument();
    });

     test('"Become a Seller" link has correct href', async () => {
        const mockUser = { name: 'Test User', given_name: 'Test' };
        setDefaultAuth0Mock({ isLoading: false, isAuthenticated: true, user: mockUser });
        setupFetchMocks({ role: 'user' }); // Role is user
        renderNavbar();

        const becomeSellerLink = await screen.findByRole('link', { name: /become a seller/i });
        // Corrected expected href
        expect(becomeSellerLink).toHaveAttribute('href', '/seller-agreement'); //
    });

    test('navigates with state when Cart icon is clicked', async () => {
        setDefaultAuth0Mock({ isAuthenticated: true, isLoading: false, user: { name: 'Test' } });
        setupFetchMocks({ role: 'user' }); // Role is user
        renderNavbar();

        const cartLink = await screen.findByRole('link', { name: 'My Cart' }); // Corrected name
        fireEvent.click(cartLink);

        // Check if navigate was called with the correct path and state
        expect(mockNavigate).toHaveBeenCalledWith('/cart', { state: { refresh: true } });
        expect(window.location.reload).not.toHaveBeenCalled(); // Should not reload directly anymore
    });


    test('"About Us" link has correct href for home page context', () => {
        Object.defineProperty(window, 'location', {
            writable: true,
            value: { ...window.location, pathname: '/' }
        });
        renderNavbar('/');
        const aboutUsLink = screen.getByRole('link', { name: /about us/i });
        fireEvent.click(aboutUsLink);
        // The Navbar itself does not call getElementById or scrollIntoView
        // It relies on the Link component and potentially the target page to handle scrolling.
        // We verify the link is correctly formed.
        expect(aboutUsLink).toHaveAttribute('href', '/#about-us'); //
        // We can also check if react-router's navigate was called appropriately by the Link click if needed,
        // but the primary responsibility of Navbar is to render the correct Link.
        // The click on a Link component is handled by MemoryRouter.
        // We expect the link to be present and have the correct href.
        // If a specific navigation side effect (like calling a mock navigate) is expected
        // from the *Link* component itself (via MemoryRouter), that's harder to test here
        // without deeper inspection of router internals or if Link had an onClick.
        // For this test, ensuring the href is correct is the main check for Navbar's responsibility.
        // The state={{ scrollToAbout: true }} is passed to the Link component.
    });

    test('"About Us" link navigates normally (has correct href) when not on home page', () => {
        Object.defineProperty(window, 'location', {
            writable: true,
            value: { ...window.location, pathname: '/products' }
        });
        renderNavbar('/products');
        const aboutUsLink = screen.getByRole('link', { name: /about us/i });
        fireEvent.click(aboutUsLink);
        expect(document.getElementById).not.toHaveBeenCalled();
        expect(window.HTMLElement.prototype.scrollIntoView).not.toHaveBeenCalled();
        expect(aboutUsLink).toHaveAttribute('href', '/#about-us'); //
    });

    test('does not call token/fetch APIs when not authenticated', () => {
        setDefaultAuth0Mock({ isAuthenticated: false, isLoading: false });
        renderNavbar();
        expect(mockUseAuth0().getAccessTokenSilently).not.toHaveBeenCalled();
        expect(mockedFetch).not.toHaveBeenCalledWith(expect.stringContaining('/auth/register'), expect.any(Object));
        expect(mockedFetch).not.toHaveBeenCalledWith(expect.stringContaining('/auth/me'), expect.any(Object));
    });

    test('clears session storage when not authenticated on load', () => {
        mockSessionStorage.setItem('access_token', 'old-stale-token');
        setDefaultAuth0Mock({ isAuthenticated: false, isLoading: false });
        renderNavbar();
        expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('access_token');
        expect(mockSessionStorage.getItem('access_token')).toBeNull();
    });

    test('clears session storage on logout', async () => {
        const logoutMock = vi.fn();
        setDefaultAuth0Mock({ isAuthenticated: true, isLoading: false, user: { name: 'Test' }, logout: logoutMock });
        setupFetchMocks({ role: 'user' });
        mockSessionStorage.setItem('access_token', 'active-token');

        const { rerender } = renderNavbar();

        await waitFor(() => {
            expect(mockSessionStorage.getItem('access_token')).toBe('active-token'); // Token set initially
        });

        const signOutButton = await screen.findByRole('button', { name: /sign out/i });
        fireEvent.click(signOutButton);
        expect(logoutMock).toHaveBeenCalled();

        // Simulate Auth0 state change after logout trigger
        setDefaultAuth0Mock({ isAuthenticated: false, isLoading: false, user: null }); // Now logged out
        
        // Rerender with the new state (Navbar's useEffect should run again)
        rerender(
             <MemoryRouter> {/* Ensure consistent environment for rerender */}
                <Routes>
                    <Route path="*" element={<Navbar />} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => {
            // Navbar's useEffect should run due to !isAuthenticated && !isAuth0Loading
            expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('access_token');
        });
         expect(mockSessionStorage.getItem('access_token')).toBeNull();
    });
});