// frontend/src/pages/AdminAnalyticsPage.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import AdminAnalyticsPage from './AdminAnalyticsPage';
import { useAuth0 } from '@auth0/auth0-react';
import { TimePeriod, type AdminPlatformMetricsData } from '../types';

// Import the service module itself
import * as reportingService from '../services/reportingService';

// --- Mocks ---
vi.mock('../services/reportingService', () => ({
  getAdminPlatformMetrics: vi.fn(),
  downloadAdminPlatformMetricsCsv: vi.fn(),
}));

vi.mock('@auth0/auth0-react', () => ({
  useAuth0: vi.fn(() => ({
    isAuthenticated: true,
    user: { sub: 'test-user-id', name: 'Test User', email: 'test@example.com', 'https://hoodgoods.com/roles': ['admin'] },
    getAccessTokenSilently: vi.fn().mockResolvedValue('test-token'),
    loginWithRedirect: vi.fn(),
    logout: vi.fn(),
  })),
}));

vi.mock('react-chartjs-2', () => ({
  Line: vi.fn(() => <canvas data-testid="mock-line-chart" />),
}));

vi.mock('chart.js', () => ({
  Chart: {
    register: vi.fn(),
    defaults: {
        animation: {}
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

vi.mock('chartjs-adapter-date-fns', () => ({}));

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
    default: vi.fn(() => mockJsPDF),
  };
});

vi.mock('html2canvas', () => ({
  __esModule: true,
  default: vi.fn().mockResolvedValue({
    toDataURL: vi.fn().mockReturnValue('data:image/png;base64,mockimage'),
  }),
}));

// Helper function to create mock data for PlatformMetricsReport
const createMockMetricsData = (overrides: Partial<AdminPlatformMetricsData> = {}): AdminPlatformMetricsData => ({
  overallMetrics: {
    totalSales: 10000,
    totalOrders: 100,
    averageOrderValue: 100,
    totalActiveSellers: 10,
    totalRegisteredBuyers: 50,
    ...overrides.overallMetrics,
  },
  timeSeriesMetrics: [
    { date: '2023-01-01T00:00:00.000Z', totalSales: 1000, totalOrders: 10 },
    { date: '2023-01-02T00:00:00.000Z', totalSales: 1500, totalOrders: 15 },
  ],
  periodCovered: {
    period: 'allTime' as TimePeriod | 'allTime' | 'custom',
    startDate: undefined,
    endDate: undefined,
    ...overrides.periodCovered,
  },
  reportGeneratedAt: new Date().toISOString(),
  ...overrides,
});


describe('AdminAnalyticsPage', () => {
  let mockMetricsData: AdminPlatformMetricsData;

  beforeEach(() => {
    vi.clearAllMocks();
    mockMetricsData = createMockMetricsData();

    (useAuth0 as Mock<any>).mockReturnValue({
        isAuthenticated: true,
        user: { sub: 'test-user-id', name: 'Test User', email: 'test@example.com', 'https://hoodgoods.com/roles': ['admin'] },
        getAccessTokenSilently: vi.fn().mockResolvedValue('test-token'),
        loginWithRedirect: vi.fn(),
        logout: vi.fn(),
      });

    (reportingService.getAdminPlatformMetrics as Mock<any>).mockResolvedValue(mockMetricsData);
    (reportingService.downloadAdminPlatformMetricsCsv as Mock<any>).mockResolvedValue(new Blob(['csv data'], { type: 'text/csv' }));
  });

  it('renders the main page structure correctly', () => {
    render(
      <BrowserRouter>
        <AdminAnalyticsPage />
      </BrowserRouter>
    );

    const mainElement = screen.getByRole('main');
    expect(mainElement).toBeInTheDocument();
    expect(mainElement).toHaveClass('admin-analytics-page container mt-4');

    const headerElement = screen.getByRole('banner');
    expect(headerElement).toBeInTheDocument();
    expect(headerElement).toHaveClass('page-header mb-4');

    const headingElement = screen.getByRole('heading', { level: 1, name: /Admin Analytics Dashboard/i });
    expect(headingElement).toBeInTheDocument();
  });

  it('renders the PlatformMetricsReport component and its title within the designated section', async () => {
    render(
      <BrowserRouter>
        <AdminAnalyticsPage />
      </BrowserRouter>
    );

    // Wait for the heading from PlatformMetricsReport to appear
    const platformReportHeading = await screen.findByRole('heading', { level: 2, name: /Platform Performance Overview/i });
    expect(platformReportHeading).toBeInTheDocument();

    // Check that the AdminAnalyticsPage contains the report group div that holds the PlatformMetricsReport
    const reportGroupDiv = document.querySelector('.report-group');
    expect(reportGroupDiv).toBeInTheDocument();
    // We can still check that aria-labelledby attribute exists, even if we don't verify the id on the heading itself in this test
    expect(reportGroupDiv).toHaveAttribute('aria-labelledby', 'platform-metrics-heading');
    expect(reportGroupDiv).toContainElement(platformReportHeading);


    // Verify that some content from PlatformMetricsReport is displayed (confirming it loaded)
    await waitFor(() => {
      expect(screen.getByText(/Total Sales/i)).toBeInTheDocument();
      expect(screen.getByText(`R ${mockMetricsData.overallMetrics.totalSales.toFixed(2)}`)).toBeInTheDocument();
    });
  });

  it('includes CSS classes for styling from AdminAnalyticsPage.css', () => {
    render(
      <BrowserRouter>
        <AdminAnalyticsPage />
      </BrowserRouter>
    );

    const mainElement = screen.getByRole('main');
    expect(mainElement).toHaveClass('admin-analytics-page');
    expect(mainElement).toHaveClass('container');
    expect(mainElement).toHaveClass('mt-4');

    const headerElement = screen.getByRole('banner');
    expect(headerElement).toHaveClass('page-header');
    expect(headerElement).toHaveClass('mb-4');
  });

  it('does not render other report components if activeReport state is not implemented or not matching', () => {
    render(
      <BrowserRouter>
        <AdminAnalyticsPage />
      </BrowserRouter>
    );
    expect(screen.queryByTestId('seller-performance-report')).not.toBeInTheDocument();
    expect(screen.queryByTestId('product-trends-report')).not.toBeInTheDocument();
  });

  it('should display a loading state initially if PlatformMetricsReport takes time to load', async () => {
    (reportingService.getAdminPlatformMetrics as Mock<any>).mockImplementationOnce(
      () => new Promise(resolve => setTimeout(() => resolve(createMockMetricsData()), 100))
    );

    render(
      <BrowserRouter>
        <AdminAnalyticsPage />
      </BrowserRouter>
    );

    expect(screen.getByText(/Loading platform metrics.../i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: /Platform Performance Overview/i })).toBeInTheDocument();
    });
  });

  it('should display an error message if PlatformMetricsReport fails to load data', async () => {
    const errorMessage = 'Failed to fetch platform metrics due to a network error.';
    (reportingService.getAdminPlatformMetrics as Mock<any>).mockRejectedValueOnce(new Error(errorMessage));

    render(
      <BrowserRouter>
        <AdminAnalyticsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(`Error: ${errorMessage}`)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Try Again/i})).toBeInTheDocument();
    });

    expect(screen.getByRole('heading', { level: 1, name: /Admin Analytics Dashboard/i })).toBeInTheDocument();
  });

  it('should display a "no data" message if PlatformMetricsReport returns no data', async () => {
    (reportingService.getAdminPlatformMetrics as Mock<any>).mockResolvedValueOnce(null);

    render(
      <BrowserRouter>
        <AdminAnalyticsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/No platform metrics data available./i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Refresh/i})).toBeInTheDocument();
    });
    expect(screen.getByRole('heading', { level: 1, name: /Admin Analytics Dashboard/i })).toBeInTheDocument();
  });

  it('has a clear structure for future multiple report sections', () => {
    render(
      <BrowserRouter>
        <AdminAnalyticsPage />
      </BrowserRouter>
    );
    const analyticsContentSection = screen.getByRole('main').querySelector('.analytics-content');
    expect(analyticsContentSection).toBeInTheDocument();

    const reportGroup = analyticsContentSection?.querySelector('.report-group');
    expect(reportGroup).toBeInTheDocument();
    expect(reportGroup).toHaveAttribute('aria-labelledby', 'platform-metrics-heading');
  });
});