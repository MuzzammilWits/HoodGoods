// frontend/src/pages/AdminAnalyticsPage.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import AdminAnalyticsPage from './AdminAnalyticsPage';
import { useAuth0 } from '@auth0/auth0-react';
import { TimePeriod, type AdminPlatformMetricsData } from '../types';

// Import the service module itself to spy on its functions
import * as reportingService from '../services/reportingService';

// --- Mocks ---
// Mock the `reportingService` to control API call responses
vi.mock('../services/reportingService', () => ({
  getAdminPlatformMetrics: vi.fn(),
  downloadAdminPlatformMetricsCsv: vi.fn(),
}));

// Mock the `@auth0/auth0-react` module to simulate authentication state
vi.mock('@auth0/auth0-react', () => ({
  useAuth0: vi.fn(() => ({
    isAuthenticated: true, // Simulate an authenticated user
    user: { sub: 'test-user-id', name: 'Test User', email: 'test@example.com', 'https://hoodgoods.com/roles': ['admin'] }, // Simulate an admin user
    getAccessTokenSilently: vi.fn().mockResolvedValue('test-token'), // Mock token retrieval
    loginWithRedirect: vi.fn(),
    logout: vi.fn(),
  })),
}));

// Mock `react-chartjs-2` to prevent actual chart rendering and simplify tests
vi.mock('react-chartjs-2', () => ({
  Line: vi.fn(() => <canvas data-testid="mock-line-chart" />), // Render a simple mock canvas
}));

// Mock `chart.js` core components to prevent full initialization and console errors
vi.mock('chart.js', () => ({
  Chart: {
    register: vi.fn(), // Mock the register method
    defaults: {
        animation: {} // Mock default animation property
    }
  },
  CategoryScale: vi.fn(),
  LinearScale: vi.fn(),
  PointElement: vi.fn(),
  LineElement: vi.fn(),
  Title: vi.fn(),
  Tooltip: vi.fn(),
  Legend: vi.fn(),
  TimeScale: vi.fn(),
  Filler: vi.fn(),
}));

// Mock `chartjs-adapter-date-fns` as it's a dependency for time scales in Chart.js
vi.mock('chartjs-adapter-date-fns', () => ({}));

// Mock `jspdf` to control PDF generation behavior in tests
vi.mock('jspdf', () => {
  const mockJsPDF = {
    text: vi.fn(),
    addImage: vi.fn(),
    save: vi.fn(),
    setFontSize: vi.fn(),
    internal: {
      pageSize: {
        getWidth: vi.fn().mockReturnValue(595.28),
        getHeight: vi.fn().mockReturnValue(841.89),
      },
    },
    getImageProperties: vi.fn().mockReturnValue({ width: 100, height: 100 }),
  };
  return {
    __esModule: true,
    default: vi.fn(() => mockJsPDF), // Return a new mock instance for each call
  };
});

// Mock `html2canvas` to simulate canvas rendering from HTML elements
vi.mock('html2canvas', () => ({
  __esModule: true,
  default: vi.fn().mockResolvedValue({
    toDataURL: vi.fn().mockReturnValue('data:image/png;base64,mockimage'), // Return a mock data URL
  }),
}));

// Helper function to create mock data for `AdminPlatformMetricsData`
const createMockMetricsData = (overrides: Partial<AdminPlatformMetricsData> = {}): AdminPlatformMetricsData => ({
  overallMetrics: {
    totalSales: 10000,
    totalOrders: 100,
    averageOrderValue: 100,
    totalActiveSellers: 10,
    totalRegisteredBuyers: 50,
    ...overrides.overallMetrics, // Allow overriding specific overall metrics
  },
  timeSeriesMetrics: [
    { date: '2023-01-01T00:00:00.000Z', totalSales: 1000, totalOrders: 10 },
    { date: '2023-01-02T00:00:00.000Z', totalSales: 1500, totalOrders: 15 },
  ],
  periodCovered: {
    period: 'allTime' as TimePeriod | 'allTime' | 'custom', // Default time period
    startDate: undefined,
    endDate: undefined,
    ...overrides.periodCovered, // Allow overriding period covered
  },
  reportGeneratedAt: new Date().toISOString(), // Default report generation timestamp
  ...overrides, // Allow overriding other top-level properties
});

// Test suite for the AdminAnalyticsPage component
describe('AdminAnalyticsPage', () => {
  let mockMetricsData: AdminPlatformMetricsData;

  // Setup before each test
  beforeEach(() => {
    vi.clearAllMocks(); // Clear all mock call history
    mockMetricsData = createMockMetricsData(); // Initialize mock data

    // Re-mock `useAuth0` for each test to ensure a clean state
    (useAuth0 as Mock<any>).mockReturnValue({
        isAuthenticated: true,
        user: { sub: 'test-user-id', name: 'Test User', email: 'test@example.com', 'https://hoodgoods.com/roles': ['admin'] },
        getAccessTokenSilently: vi.fn().mockResolvedValue('test-token'),
        loginWithRedirect: vi.fn(),
        logout: vi.fn(),
      });

    // Mock the `getAdminPlatformMetrics` service call to return our mock data
    (reportingService.getAdminPlatformMetrics as Mock<any>).mockResolvedValue(mockMetricsData);
    // Mock the `downloadAdminPlatformMetricsCsv` service call to return a mock Blob
    (reportingService.downloadAdminPlatformMetricsCsv as Mock<any>).mockResolvedValue(new Blob(['csv data'], { type: 'text/csv' }));
  });

  // Test case: Renders the main page structure correctly
  it('renders the main page structure correctly', () => {
    render(
      <BrowserRouter>
        <AdminAnalyticsPage />
      </BrowserRouter>
    );

    // Assert that the main element with specific roles and classes is in the document
    const mainElement = screen.getByRole('main');
    expect(mainElement).toBeInTheDocument();
    expect(mainElement).toHaveClass('admin-analytics-page container mt-4');

    // Assert that the header element with specific roles and classes is in the document
    const headerElement = screen.getByRole('banner'); // Using 'banner' for the header element
    expect(headerElement).toBeInTheDocument();
    expect(headerElement).toHaveClass('page-header mb-4');

    // Assert that the main heading is in the document
    const headingElement = screen.getByRole('heading', { level: 1, name: /Admin Analytics Dashboard/i });
    expect(headingElement).toBeInTheDocument();
  });

  // Test case: Renders the PlatformMetricsReport component and its title within the designated section
  it('renders the PlatformMetricsReport component and its title within the designated section', async () => {
    render(
      <BrowserRouter>
        <AdminAnalyticsPage />
      </BrowserRouter>
    );

    // Wait for the heading from PlatformMetricsReport to appear, confirming it's loaded
    const platformReportHeading = await screen.findByRole('heading', { level: 2, name: /Platform Performance Overview/i });
    expect(platformReportHeading).toBeInTheDocument();

    // Check that the `AdminAnalyticsPage` contains the `report-group` div that holds the `PlatformMetricsReport`
    const reportGroupDiv = document.querySelector('.report-group');
    expect(reportGroupDiv).toBeInTheDocument();
    // Verify `aria-labelledby` attribute for accessibility
    expect(reportGroupDiv).toHaveAttribute('aria-labelledby', 'platform-metrics-heading');
    // Verify that the heading is a child of the report group div
    expect(reportGroupDiv).toContainElement(platformReportHeading);


    // Verify that some content from `PlatformMetricsReport` is displayed (confirming it loaded)
    await waitFor(() => {
      expect(screen.getByText(/Total Sales/i)).toBeInTheDocument();
      expect(screen.getByText(`R ${mockMetricsData.overallMetrics.totalSales.toFixed(2)}`)).toBeInTheDocument();
    });
  });

  // Test case: Verifies that the component includes specific CSS classes for styling
  it('includes CSS classes for styling from AdminAnalyticsPage.css', () => {
    render(
      <BrowserRouter>
        <AdminAnalyticsPage />
      </BrowserRouter>
    );

    // Assert that main elements have their expected CSS classes
    const mainElement = screen.getByRole('main');
    expect(mainElement).toHaveClass('admin-analytics-page');
    expect(mainElement).toHaveClass('container');
    expect(mainElement).toHaveClass('mt-4');

    const headerElement = screen.getByRole('banner');
    expect(headerElement).toHaveClass('page-header');
    expect(headerElement).toHaveClass('mb-4');
  });

  // Test case: Ensures that other report components are NOT rendered unless explicitly active
  it('does not render other report components if activeReport state is not implemented or not matching', () => {
    render(
      <BrowserRouter>
        <AdminAnalyticsPage />
      </BrowserRouter>
    );
    // Assert that elements unique to other report components are not in the document
    expect(screen.queryByTestId('seller-performance-report')).not.toBeInTheDocument();
    expect(screen.queryByTestId('product-trends-report')).not.toBeInTheDocument();
  });

  // Test case: Displays a loading state initially if data fetching is slow
  it('should display a loading state initially if PlatformMetricsReport takes time to load', async () => {
    // Mock the service call to simulate a delay
    (reportingService.getAdminPlatformMetrics as Mock<any>).mockImplementationOnce(
      () => new Promise(resolve => setTimeout(() => resolve(createMockMetricsData()), 100))
    );

    render(
      <BrowserRouter>
        <AdminAnalyticsPage />
      </BrowserRouter>
    );

    // Expect the loading message to be visible
    expect(screen.getByText(/Loading platform metrics.../i)).toBeInTheDocument();

    // Wait for the report heading to appear, indicating loading is complete
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: /Platform Performance Overview/i })).toBeInTheDocument();
    });
  });

  // Test case: Displays an error message if data fetching fails
  it('should display an error message if PlatformMetricsReport fails to load data', async () => {
    const errorMessage = 'Failed to fetch platform metrics due to a network error.';
    // Mock the service call to reject with an error
    (reportingService.getAdminPlatformMetrics as Mock<any>).mockRejectedValueOnce(new Error(errorMessage));

    render(
      <BrowserRouter>
        <AdminAnalyticsPage />
      </BrowserRouter>
    );

    // Wait for the error message and a retry button to appear
    await waitFor(() => {
      expect(screen.getByText(`Error: ${errorMessage}`)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Try Again/i})).toBeInTheDocument();
    });

    // Ensure the main page heading is still present
    expect(screen.getByRole('heading', { level: 1, name: /Admin Analytics Dashboard/i })).toBeInTheDocument();
  });

  // Test case: Displays a "no data" message if the service returns null data
  it('should display a "no data" message if PlatformMetricsReport returns no data', async () => {
    // Mock the service call to return null data
    (reportingService.getAdminPlatformMetrics as Mock<any>).mockResolvedValueOnce(null);

    render(
      <BrowserRouter>
        <AdminAnalyticsPage />
      </BrowserRouter>
    );

    // Wait for the "no data" message and a refresh button to appear
    await waitFor(() => {
      expect(screen.getByText(/No platform metrics data available./i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Refresh/i})).toBeInTheDocument();
    });
    // Ensure the main page heading is still present
    expect(screen.getByRole('heading', { level: 1, name: /Admin Analytics Dashboard/i })).toBeInTheDocument();
  });

  // Test case: Verifies the presence of a clear structure for future multiple report sections
  it('has a clear structure for future multiple report sections', () => {
    render(
      <BrowserRouter>
        <AdminAnalyticsPage />
      </BrowserRouter>
    );
    // Assert that the `analytics-content` section exists within the main role
    const analyticsContentSection = screen.getByRole('main').querySelector('.analytics-content');
    expect(analyticsContentSection).toBeInTheDocument();

    // Assert that a `report-group` div exists within the `analytics-content` section
    const reportGroup = analyticsContentSection?.querySelector('.report-group');
    expect(reportGroup).toBeInTheDocument();
    // Verify its `aria-labelledby` attribute for accessibility
    expect(reportGroup).toHaveAttribute('aria-labelledby', 'platform-metrics-heading');
  });
});