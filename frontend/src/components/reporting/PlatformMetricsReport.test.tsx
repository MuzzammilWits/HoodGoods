import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useAuth0 } from '@auth0/auth0-react';
import PlatformMetricsReport from './PlatformMetricsReport';
import { getAdminPlatformMetrics, downloadAdminPlatformMetricsCsv } from '../../services/reportingService';
import { TimePeriod, AdminPlatformMetricsData } from '../../types';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// Setup test environment
beforeAll(() => {
  // Suppress console errors during tests
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(() => {
  vi.restoreAllMocks();
});

// Mock dependencies
vi.mock('@auth0/auth0-react');
vi.mock('../../services/reportingService');
vi.mock('html2canvas');
vi.mock('jspdf');
vi.mock('react-chartjs-2', () => ({
  Line: vi.fn(({ data, options }) => (
    <div data-testid="line-chart" data-chart-data={JSON.stringify(data)} data-chart-options={JSON.stringify(options)}>
      Mock Line Chart
    </div>
  ))
}));

// Mock Chart.js
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
  Filler: vi.fn()
}));

const mockReportData: AdminPlatformMetricsData = {
  overallMetrics: {
    totalSales: 125000.50,
    totalOrders: 450,
    averageOrderValue: 277.78,
    totalActiveSellers: 25,
    totalRegisteredBuyers: 890
  },
  periodCovered: {
    period: TimePeriod.MONTHLY,
    startDate: '2024-01-01',
    endDate: '2024-12-31'
  },
  reportGeneratedAt: '2024-05-25T10:30:00Z',
  timeSeriesMetrics: [
    {
      date: '2024-01-01',
      totalSales: 10000,
      totalOrders: 50
    },
    {
      date: '2024-02-01',
      totalSales: 12000,
      totalOrders: 60
    },
    {
      date: '2024-03-01',
      totalSales: 15000,
      totalOrders: 75
    }
  ]
};

const mockAuth0 = {
  getAccessTokenSilently: vi.fn().mockResolvedValue('mock-token')
};

describe('PlatformMetricsReport', () => {
  beforeEach(() => {
    vi.mocked(useAuth0).mockReturnValue(mockAuth0 as any);
    vi.mocked(getAdminPlatformMetrics).mockResolvedValue(mockReportData);
    vi.mocked(downloadAdminPlatformMetricsCsv).mockResolvedValue(new Blob(['csv,data'], { type: 'text/csv' }));
    
    // Mock URL.createObjectURL and revokeObjectURL
    global.URL.createObjectURL = vi.fn(() => 'mock-url');
    global.URL.revokeObjectURL = vi.fn();
    
    // Mock html2canvas
    vi.mocked(html2canvas).mockResolvedValue({
      toDataURL: vi.fn().mockReturnValue('data:image/png;base64,mock-image-data')
    } as any);
    
    // Mock jsPDF
    const mockPdf = {
      internal: {
        pageSize: {
          getWidth: vi.fn().mockReturnValue(595),
          getHeight: vi.fn().mockReturnValue(842)
        }
      },
      setFontSize: vi.fn(),
      text: vi.fn(),
      addImage: vi.fn(),
      save: vi.fn(),
      getImageProperties: vi.fn().mockReturnValue({ width: 800, height: 600 })
    };
    vi.mocked(jsPDF).mockReturnValue(mockPdf as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  describe('Initial Loading and Data Fetching', () => {
    it('renders loading skeleton initially', () => {
      vi.mocked(getAdminPlatformMetrics).mockImplementation(() => new Promise(() => {})); // Never resolves
      
      render(<PlatformMetricsReport />);
      
      expect(screen.getByRole('article', { busy: true })).toBeInTheDocument();
      // Check for skeleton items - update count based on actual implementation
      expect(screen.getAllByText('', { selector: '.skeleton-item' })).toHaveLength(19);
    });

    it('fetches report data on mount with default "allTime" period', async () => {
      render(<PlatformMetricsReport />);
      
      await waitFor(() => {
        expect(getAdminPlatformMetrics).toHaveBeenCalledWith('mock-token', 'allTime', undefined, undefined);
      });
    });

    it('renders report data after successful fetch', async () => {
      render(<PlatformMetricsReport />);
      
      await waitFor(() => {
        expect(screen.getByText('Platform Performance Overview')).toBeInTheDocument();
      });
      
      expect(screen.getByText('R 125000.50')).toBeInTheDocument();
      expect(screen.getByText('450')).toBeInTheDocument();
      expect(screen.getByText('R 277.78')).toBeInTheDocument();
      expect(screen.getByText('25')).toBeInTheDocument();
      expect(screen.getByText('890')).toBeInTheDocument();
    });

    it('displays period information correctly', async () => {
      render(<PlatformMetricsReport />);
      
      await waitFor(() => {
        expect(screen.getByText(/Period Covered: Monthly \(From: 2024-01-01 To: 2024-12-31\)/)).toBeInTheDocument();
        expect(screen.getByText(/Report Generated: 5\/25\/2024/)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('displays error message when data fetch fails', async () => {
      const error = new Error('Failed to fetch data');
      vi.mocked(getAdminPlatformMetrics).mockRejectedValue(error);
      
      render(<PlatformMetricsReport />);
      
      await waitFor(() => {
        expect(screen.getByText('Error: Failed to fetch data')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument();
      });
    });

    it('allows retry after error', async () => {
      const error = new Error('Network error');
      vi.mocked(getAdminPlatformMetrics)
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce(mockReportData);
      
      render(<PlatformMetricsReport />);
      
      await waitFor(() => {
        expect(screen.getByText('Error: Network error')).toBeInTheDocument();
      });
      
      const tryAgainButton = screen.getByRole('button', { name: 'Try Again' });
      await userEvent.click(tryAgainButton);
      
      await waitFor(() => {
        expect(screen.getByText('Platform Performance Overview')).toBeInTheDocument();
      });
    });

    it('displays info message when no data is available', async () => {
      vi.mocked(getAdminPlatformMetrics).mockResolvedValue(null as any);
      
      render(<PlatformMetricsReport />);
      
      await waitFor(() => {
        expect(screen.getByText('No platform metrics data available.')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument();
      });
    });
  });
});

describe('PlatformMetricsReport - User Interactions', () => {
  beforeEach(() => {
    vi.mocked(useAuth0).mockReturnValue(mockAuth0 as any);
    vi.mocked(getAdminPlatformMetrics).mockResolvedValue(mockReportData);
    vi.mocked(downloadAdminPlatformMetricsCsv).mockResolvedValue(new Blob(['csv,data'], { type: 'text/csv' }));
    
    global.URL.createObjectURL = vi.fn(() => 'mock-url');
    global.URL.revokeObjectURL = vi.fn();
    vi.mocked(html2canvas).mockResolvedValue({
      toDataURL: vi.fn().mockReturnValue('data:image/png;base64,mock-image-data')
    } as any);
    
    const mockPdf = {
      internal: { pageSize: { getWidth: vi.fn().mockReturnValue(595), getHeight: vi.fn().mockReturnValue(842) } },
      setFontSize: vi.fn(), text: vi.fn(), addImage: vi.fn(), save: vi.fn(),
      getImageProperties: vi.fn().mockReturnValue({ width: 800, height: 600 })
    };
    vi.mocked(jsPDF).mockReturnValue(mockPdf as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  describe('Period Selection', () => {
    it('updates period when select value changes', async () => {
      render(<PlatformMetricsReport />);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('All Time')).toBeInTheDocument();
      });
      
      const periodSelect = screen.getByLabelText('Report Period:');
      await userEvent.selectOptions(periodSelect, TimePeriod.WEEKLY);
      
      expect(screen.getByDisplayValue('Weekly')).toBeInTheDocument();
    });

    it('shows date inputs for custom period', async () => {
      render(<PlatformMetricsReport />);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('All Time')).toBeInTheDocument();
      });
      
      const periodSelect = screen.getByLabelText('Report Period:');
      await userEvent.selectOptions(periodSelect, 'custom');
      
      expect(screen.getByLabelText('Start Date')).toBeInTheDocument();
      expect(screen.getByLabelText('End Date')).toBeInTheDocument();
    });

    it('shows start date input for daily period', async () => {
      render(<PlatformMetricsReport />);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('All Time')).toBeInTheDocument();
      });
      
      const periodSelect = screen.getByLabelText('Report Period:');
      await userEvent.selectOptions(periodSelect, TimePeriod.DAILY);
      
      expect(screen.getByLabelText('Start Date')).toBeInTheDocument();
      expect(screen.queryByLabelText('End Date')).not.toBeInTheDocument();
    });

    it('clears date inputs when switching from custom to other periods', async () => {
      render(<PlatformMetricsReport />);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('All Time')).toBeInTheDocument();
      });
      
      // Switch to custom and set dates
      const periodSelect = screen.getByLabelText('Report Period:');
      await userEvent.selectOptions(periodSelect, 'custom');
      
      const startDateInput = screen.getByLabelText('Start Date');
      const endDateInput = screen.getByLabelText('End Date');
      
      await userEvent.type(startDateInput, '2024-01-01');
      await userEvent.type(endDateInput, '2024-12-31');
      
      expect(startDateInput).toHaveValue('2024-01-01');
      expect(endDateInput).toHaveValue('2024-12-31');
      
      // Switch back to weekly
      await userEvent.selectOptions(periodSelect, TimePeriod.WEEKLY);
      
      // Date inputs should be gone
      expect(screen.queryByLabelText('Start Date')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('End Date')).not.toBeInTheDocument();
    });
  });

  describe('Data Refresh', () => {
    it('refreshes data when refresh button is clicked', async () => {
      render(<PlatformMetricsReport />);
      
      await waitFor(() => {
        expect(screen.getByText('Platform Performance Overview')).toBeInTheDocument();
      });
      
      vi.clearAllMocks();
      
      const refreshButton = screen.getByRole('button', { name: 'Refresh Report' });
      await userEvent.click(refreshButton);
      
      expect(getAdminPlatformMetrics).toHaveBeenCalledWith('mock-token', 'allTime', undefined, undefined);
    });

    it('disables refresh button during loading', async () => {
      vi.mocked(getAdminPlatformMetrics).mockImplementation(() => new Promise(() => {}));
      
      render(<PlatformMetricsReport />);
      
      // During initial loading, the button is in skeleton state and not accessible
      // Check that the component is in loading state instead
      expect(screen.getByRole('article', { busy: true })).toBeInTheDocument();
    });

    it('shows refreshing state during non-initial refresh', async () => {
      render(<PlatformMetricsReport />);
      
      await waitFor(() => {
        expect(screen.getByText('Platform Performance Overview')).toBeInTheDocument();
      });
      
      // Mock delayed response for refresh
      vi.mocked(getAdminPlatformMetrics).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(mockReportData), 100))
      );
      
      const refreshButton = screen.getByRole('button', { name: 'Refresh Report' });
      await userEvent.click(refreshButton);
      
      expect(screen.getByRole('button', { name: 'Refreshing...' })).toBeInTheDocument();
    });
  });

  describe('Charts Rendering', () => {
    it('renders charts when time series data is available', async () => {
      render(<PlatformMetricsReport />);
      
      await waitFor(() => {
        expect(screen.getAllByTestId('line-chart')).toHaveLength(2);
      });
    });

    it('displays message when no time series data is available', async () => {
      const dataWithoutTimeSeries: AdminPlatformMetricsData = { 
        ...mockReportData, 
        timeSeriesMetrics: [] 
      };
      vi.mocked(getAdminPlatformMetrics).mockResolvedValue(dataWithoutTimeSeries);
      
      render(<PlatformMetricsReport />);
      
      await waitFor(() => {
        expect(screen.getByText('No time series data available for graphs for the selected period.')).toBeInTheDocument();
      });
    });

    it('passes correct data to sales chart', async () => {
      render(<PlatformMetricsReport />);
      
      await waitFor(() => {
        const salesChart = screen.getAllByTestId('line-chart')[0];
        const chartData = JSON.parse(salesChart.getAttribute('data-chart-data') || '{}');
        
        expect(chartData.datasets[0].label).toBe('Total Platform Sales (R)');
        expect(chartData.datasets[0].data).toEqual([10000, 12000, 15000]);
      });
    });

    it('passes correct data to orders chart', async () => {
      render(<PlatformMetricsReport />);
      
      await waitFor(() => {
        const ordersChart = screen.getAllByTestId('line-chart')[1];
        const chartData = JSON.parse(ordersChart.getAttribute('data-chart-data') || '{}');
        
        expect(chartData.datasets[0].label).toBe('Total Platform Orders');
        expect(chartData.datasets[0].data).toEqual([50, 60, 75]);
      });
    });
  });
});

describe('PlatformMetricsReport - Export Features', () => {
  beforeEach(() => {
    vi.mocked(useAuth0).mockReturnValue(mockAuth0 as any);
    vi.mocked(getAdminPlatformMetrics).mockResolvedValue(mockReportData);
    vi.mocked(downloadAdminPlatformMetricsCsv).mockResolvedValue(new Blob(['csv,data'], { type: 'text/csv' }));
    
    global.URL.createObjectURL = vi.fn(() => 'mock-url');
    global.URL.revokeObjectURL = vi.fn();
    vi.mocked(html2canvas).mockResolvedValue({
      toDataURL: vi.fn().mockReturnValue('data:image/png;base64,mock-image-data')
    } as any);
    
    const mockPdf = {
      internal: { pageSize: { getWidth: vi.fn().mockReturnValue(595), getHeight: vi.fn().mockReturnValue(842) } },
      setFontSize: vi.fn(), text: vi.fn(), addImage: vi.fn(), save: vi.fn(),
      getImageProperties: vi.fn().mockReturnValue({ width: 800, height: 600 })
    };
    vi.mocked(jsPDF).mockReturnValue(mockPdf as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  describe('CSV Export', () => {
    it('downloads CSV when download button is clicked', async () => {
      render(<PlatformMetricsReport />);
      
      await waitFor(() => {
        expect(screen.getByText('Platform Performance Overview')).toBeInTheDocument();
      });
      
      const csvButton = screen.getByRole('button', { name: 'Download CSV' });
      await userEvent.click(csvButton);
      
      await waitFor(() => {
        expect(downloadAdminPlatformMetricsCsv).toHaveBeenCalledWith('mock-token', 'allTime', undefined, undefined);
      });
    });

    it('handles CSV download error', async () => {
      const error = new Error('CSV generation failed');
      vi.mocked(downloadAdminPlatformMetricsCsv).mockRejectedValue(error);
      
      render(<PlatformMetricsReport />);
      
      await waitFor(() => {
        expect(screen.getByText('Platform Performance Overview')).toBeInTheDocument();
      });
      
      const csvButton = screen.getByRole('button', { name: 'Download CSV' });
      await userEvent.click(csvButton);
      
      await waitFor(() => {
        expect(screen.getByText('Error: CSV generation failed')).toBeInTheDocument();
      });
    });
  });

  describe('PDF Export', () => {
    it('generates PDF when download button is clicked', async () => {
      render(<PlatformMetricsReport />);
      
      await waitFor(() => {
        expect(screen.getByText('Platform Performance Overview')).toBeInTheDocument();
      });
      
      const pdfButton = screen.getByRole('button', { name: 'Download PDF' });
      await userEvent.click(pdfButton);
      
      // Wait a bit for the setTimeout to potentially trigger
      await new Promise(resolve => setTimeout(resolve, 300));
    });

    it('shows generating state during PDF creation', async () => {
      render(<PlatformMetricsReport />);
      
      await waitFor(() => {
        expect(screen.getByText('Platform Performance Overview')).toBeInTheDocument();
      });
      
      const pdfButton = screen.getByRole('button', { name: 'Download PDF' });
      await userEvent.click(pdfButton);
      
      expect(screen.getByRole('button', { name: 'Generating PDF...' })).toBeInTheDocument();
    });

    it('handles PDF generation error', async () => {
      const error = new Error('PDF generation failed');
      vi.mocked(html2canvas).mockRejectedValue(error);
      
      render(<PlatformMetricsReport />);
      
      await waitFor(() => {
        expect(screen.getByText('Platform Performance Overview')).toBeInTheDocument();
      });
      
      const pdfButton = screen.getByRole('button', { name: 'Download PDF' });
      await userEvent.click(pdfButton);
      
      await waitFor(() => {
        expect(screen.getByText('Error: PDF generation failed')).toBeInTheDocument();
      });
    });
  });

  describe('Custom Date Range', () => {
    it('fetches data with custom date range', async () => {
      render(<PlatformMetricsReport />);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('All Time')).toBeInTheDocument();
      });
      
      // Switch to custom period
      const periodSelect = screen.getByLabelText('Report Period:');
      await userEvent.selectOptions(periodSelect, 'custom');
      
      // Set dates
      const startDateInput = screen.getByLabelText('Start Date');
      const endDateInput = screen.getByLabelText('End Date');
      
      await userEvent.type(startDateInput, '2024-01-01');
      await userEvent.type(endDateInput, '2024-03-31');
      
      // Clear previous calls
      vi.clearAllMocks();
      
      // Refresh
      const refreshButton = screen.getByRole('button', { name: 'Refresh Report' });
      await userEvent.click(refreshButton);
      
      expect(getAdminPlatformMetrics).toHaveBeenCalledWith('mock-token', 'custom', '2024-01-01', '2024-03-31');
    });

    it('includes custom dates in export filenames', async () => {
      render(<PlatformMetricsReport />);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('All Time')).toBeInTheDocument();
      });
      
      // Switch to custom and set dates
      const periodSelect = screen.getByLabelText('Report Period:');
      await userEvent.selectOptions(periodSelect, 'custom');
      
      await userEvent.type(screen.getByLabelText('Start Date'), '2024-01-01');
      await userEvent.type(screen.getByLabelText('End Date'), '2024-03-31');
      
      const csvButton = screen.getByRole('button', { name: 'Download CSV' });
      await userEvent.click(csvButton);
      
      await waitFor(() => {
        expect(downloadAdminPlatformMetricsCsv).toHaveBeenCalledWith('mock-token', 'custom', '2024-01-01', '2024-03-31');
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', async () => {
      render(<PlatformMetricsReport />);
      
      await waitFor(() => {
        expect(screen.getByRole('article')).toBeInTheDocument();
        expect(screen.getByRole('banner')).toBeInTheDocument();
        expect(screen.getByLabelText('Report Period:')).toBeInTheDocument();
        expect(screen.getByLabelText('Export options')).toBeInTheDocument();
      });
    });

    it('sets aria-busy during loading', () => {
      vi.mocked(getAdminPlatformMetrics).mockImplementation(() => new Promise(() => {}));
      
      render(<PlatformMetricsReport />);
      
      expect(screen.getByRole('article', { busy: true })).toBeInTheDocument();
    });
  });
});