import { describe, it, expect, vi, beforeEach, afterEach, MockInstance } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SalesTrendReport from './SalesTrendReport';

import {
  SalesReportData,
  TimePeriod,
  SalesData,
  SalesReportSummary,
} from '../../types';

// --- Hoisted Mocks ---
const { mockGetSalesTrendReport, mockDownloadSalesTrendCsv } = vi.hoisted(() => ({
  mockGetSalesTrendReport: vi.fn(),
  mockDownloadSalesTrendCsv: vi.fn(),
}));

const { mockGetAccessTokenSilently } = vi.hoisted(() => ({
  mockGetAccessTokenSilently: vi.fn(),
}));

const { mockHtml2Canvas } = vi.hoisted(() => ({ mockHtml2Canvas: vi.fn() }));

const {
  mockJsPDFConstructor, mockJsPDFSave, mockJsPDFAddImage, mockJsPDFText,
  mockJsPDFSetFontSize, mockGetImageProperties,
} = vi.hoisted(() => {
  const pdfInstanceMethods = {
    text: vi.fn(), addImage: vi.fn(), save: vi.fn(), setFontSize: vi.fn(),
    internal: { pageSize: { getWidth: vi.fn(() => 841.89), getHeight: vi.fn(() => 595.28),}}, // A4 landscape
    getImageProperties: vi.fn(() => ({ width: 1000, height: 500 })),
  };
  return {
    mockJsPDFConstructor: vi.fn(() => pdfInstanceMethods),
    mockJsPDFSave: pdfInstanceMethods.save, mockJsPDFAddImage: pdfInstanceMethods.addImage,
    mockJsPDFText: pdfInstanceMethods.text, mockJsPDFSetFontSize: pdfInstanceMethods.setFontSize,
    mockGetImageProperties: pdfInstanceMethods.getImageProperties,
  };
});

const mockChartJSRegister = vi.hoisted(() => vi.fn());

import RealJsPDFConstructor from 'jspdf';

vi.mock('../../services/reportingService', () => ({
  getSalesTrendReport: mockGetSalesTrendReport,
  downloadSalesTrendCsv: mockDownloadSalesTrendCsv,
}));

vi.mock('@auth0/auth0-react', () => ({
  useAuth0: () => ({
    getAccessTokenSilently: mockGetAccessTokenSilently,
    isAuthenticated: true, user: { name: 'Test Seller' }, isLoading: false,
  }),
}));

vi.mock('react-chartjs-2', () => ({
  Line: vi.fn((props) => (
    <div data-testid="mock-line-chart">
      Chart Title From Options: {props.options?.plugins?.title?.text || 'No Title Prop'}
      Data Points: {props.data?.datasets[0]?.data?.length || 0}
    </div>
  )),
}));

vi.mock('chart.js', async (importActual) => {
  const actual = await importActual<typeof import('chart.js')>();
  return {
    ...actual,
    Chart: {
      ...(actual.Chart as object),
      register: mockChartJSRegister,
      defaults: actual.Chart.defaults,
    },
  };
});

vi.mock('jspdf', () => ({ default: mockJsPDFConstructor }));
vi.mock('html2canvas', () => ({ default: mockHtml2Canvas }));

const mockCreateObjectURL = vi.fn();
const mockRevokeObjectURL = vi.fn();

const MOCK_TOKEN = 'mock-seller-token';
const fixedMockDateString = '2024-08-15';
const mockGeneratedDate = new Date(`${fixedMockDateString}T12:00:00.000Z`);

const sampleSalesData: SalesData[] = [
  { date: '2024-08-13T00:00:00.000Z', sales: 150 },
  { date: '2024-08-14T00:00:00.000Z', sales: 200 },
  { date: '2024-08-15T00:00:00.000Z', sales: 180 },
];
const sampleSummary: SalesReportSummary = {
  totalSales: 530, averageDailySales: 176.67,
  period: 'Weekly', startDate: '2024-08-09', endDate: '2024-08-15',
};
const mockSalesReport: SalesReportData = {
  salesData: sampleSalesData, summary: sampleSummary, reportGeneratedAt: mockGeneratedDate.toISOString(),
};
const mockSalesReportNoData: SalesReportData = {
  salesData: [],
  summary: { ...sampleSummary, totalSales: 0, averageDailySales: 0, period: TimePeriod.WEEKLY, startDate: fixedMockDateString, endDate: fixedMockDateString },
  reportGeneratedAt: mockGeneratedDate.toISOString(),
};

// Mock data for testing missing summary
const mockReportDataWithNullSummary: SalesReportData = {
  salesData: sampleSalesData, // Has sales data, so chartData might exist
  summary: null as any, // Explicitly null summary (cast to any to bypass strict null check for test)
  reportGeneratedAt: mockGeneratedDate.toISOString(),
};


const TrueOriginalDate = Date;

describe('SalesTrendReport', () => {
  const user = userEvent.setup();
  let originalUrlCreateObjectURL: typeof window.URL.createObjectURL;
  let originalUrlRevokeObjectURL: typeof window.URL.revokeObjectURL;
  let dateConstructorSpy: MockInstance<(...args: any[]) => Date>;


  beforeEach(() => {
    const mockTodayInstance = new TrueOriginalDate(`${fixedMockDateString}T12:00:00.000Z`);

    dateConstructorSpy = vi.spyOn(global, 'Date')
      .mockImplementation((value?: string | number | Date) => {
        if (value === undefined) {
          return new TrueOriginalDate(mockTodayInstance.toISOString());
        }
        return new TrueOriginalDate(value);
      }) as MockInstance<(...args: any[]) => Date>;
    (dateConstructorSpy as any).now = vi.fn(() => mockTodayInstance.getTime());


    mockGetAccessTokenSilently.mockReset().mockResolvedValue(MOCK_TOKEN);
    mockGetSalesTrendReport.mockReset().mockResolvedValue(mockSalesReport);
    mockDownloadSalesTrendCsv.mockReset().mockResolvedValue(new Blob(['csv,sales,data'], { type: 'text/csv' }));

    (RealJsPDFConstructor as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => {
      const pdfInstanceMethods = {
          text: mockJsPDFText, addImage: mockJsPDFAddImage, save: mockJsPDFSave,
          setFontSize: mockJsPDFSetFontSize,
          internal: { pageSize: { getWidth: vi.fn(() => 841.89), getHeight: vi.fn(() => 595.28),}},
          getImageProperties: mockGetImageProperties,
      };
      mockJsPDFText.mockClear(); mockJsPDFAddImage.mockClear(); mockJsPDFSave.mockClear();
      mockJsPDFSetFontSize.mockClear(); mockGetImageProperties.mockClear();
      pdfInstanceMethods.internal.pageSize.getWidth.mockClear();
      pdfInstanceMethods.internal.pageSize.getHeight.mockClear();
      mockGetImageProperties.mockReturnValue({ width: 800, height: 400 });
      return pdfInstanceMethods;
    });

    mockHtml2Canvas.mockReset().mockImplementation(async (element: HTMLElement, options?: Partial<any>) => {
      const canvas = document.createElement('canvas');
      canvas.width = options?.scale && element.offsetWidth ? element.offsetWidth * options.scale : 600;
      canvas.height = options?.scale && element.offsetHeight ? element.offsetHeight * options.scale : 400;
      canvas.toDataURL = vi.fn(() => 'data:image/png;base64,mockchartimagedata');
      return canvas;
    });

    mockChartJSRegister.mockClear();

    originalUrlCreateObjectURL = global.URL.createObjectURL;
    originalUrlRevokeObjectURL = global.URL.revokeObjectURL;
    global.URL.createObjectURL = mockCreateObjectURL.mockReturnValue('blob:http://localhost/mock-sales-csv-url');
    global.URL.revokeObjectURL = mockRevokeObjectURL;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    global.URL.createObjectURL = originalUrlCreateObjectURL;
    global.URL.revokeObjectURL = originalUrlRevokeObjectURL;
  });

  it('should render loading state initially', () => {
    mockGetSalesTrendReport.mockImplementationOnce(() => new Promise(() => {}));
    render(<SalesTrendReport />);
    expect(screen.getByText('Loading sales data...')).toBeInTheDocument();
  });

  it('should fetch and display sales trend report successfully with default period (Weekly)', async () => {
    render(<SalesTrendReport />);
    await waitFor(() => expect(screen.getByText('Sales Trend Report')).toBeInTheDocument());
    expect(mockGetSalesTrendReport).toHaveBeenCalledWith(MOCK_TOKEN, TimePeriod.WEEKLY, undefined);

    const chart = screen.getByTestId('mock-line-chart');
    expect(chart).toBeInTheDocument();
    expect(chart).toHaveTextContent(`Data Points: ${sampleSalesData.length}`);
    expect(chart).toHaveTextContent(
      `Chart Title From Options: Sales Trends - ${sampleSummary.period} (${sampleSummary.startDate} to ${sampleSummary.endDate})`
    );

    expect(screen.getByText(`Total Sales: R ${sampleSummary.totalSales.toFixed(2)}`)).toBeInTheDocument();
    expect(screen.getByText(`Average Daily Sales: R ${sampleSummary.averageDailySales.toFixed(2)}`)).toBeInTheDocument();
    expect(screen.getByText(`Period Covered: ${sampleSummary.startDate} to ${sampleSummary.endDate}`)).toBeInTheDocument();
    expect(screen.getByText(`Report Generated: ${mockGeneratedDate.toLocaleString()}`)).toBeInTheDocument();
  });

  it('should display "No sales data available" message if salesData is empty', async () => {
    mockGetSalesTrendReport.mockResolvedValueOnce(mockSalesReportNoData);
    render(<SalesTrendReport />);
    await waitFor(() => expect(screen.getByText('No sales data available for the selected period.')).toBeInTheDocument());
    expect(screen.queryByTestId('mock-line-chart')).not.toBeInTheDocument();
  });

  it('should display error message if data fetching fails initially', async () => {
    const errorMsg = 'Failed to fetch sales trends';
    mockGetSalesTrendReport.mockRejectedValueOnce(new Error(errorMsg));
    render(<SalesTrendReport />);
    await waitFor(() => expect(screen.getByText(`Error: ${errorMsg}`)).toBeInTheDocument());
  });

  it('should refetch data when selectedPeriod is changed', async () => {
    render(<SalesTrendReport />);
    await waitFor(() => expect(mockGetSalesTrendReport).toHaveBeenCalledWith(MOCK_TOKEN, TimePeriod.WEEKLY, undefined));
    mockGetSalesTrendReport.mockClear(); // Clear previous calls

    const periodSelect = screen.getByLabelText('Custom View:');
    await user.selectOptions(periodSelect, TimePeriod.MONTHLY);

    await waitFor(() => expect(mockGetSalesTrendReport).toHaveBeenCalledWith(MOCK_TOKEN, TimePeriod.MONTHLY, undefined));
  });

 
  it('should display error message if getAccessTokenSilently fails', async () => {
    const tokenErrorMsg = 'Token retrieval failed';
    mockGetAccessTokenSilently.mockRejectedValueOnce(new Error(tokenErrorMsg));
    render(<SalesTrendReport />);
    await waitFor(() => expect(screen.getByText(`Error: ${tokenErrorMsg}`)).toBeInTheDocument());
  });


  describe('CSV Export', () => {
    it('should trigger CSV download with correct parameters (defaulting to Weekly)', async () => {
      render(<SalesTrendReport />);
      await waitFor(() => screen.getByText('Download CSV'));

      const csvButton = screen.getByRole('button', { name: 'Download CSV' });
      const createElementSpy = vi.spyOn(document, 'createElement');
      await user.click(csvButton);

      expect(mockDownloadSalesTrendCsv).toHaveBeenCalledWith(MOCK_TOKEN, TimePeriod.WEEKLY, undefined);
      await waitFor(() => expect(mockCreateObjectURL).toHaveBeenCalled());
      const createdAnchor = createElementSpy.mock.results[0].value as HTMLAnchorElement;
      expect(createdAnchor.download).toBe(`sales_trend_${TimePeriod.WEEKLY}_${sampleSummary.startDate}_to_${sampleSummary.endDate}.csv`);
      createElementSpy.mockRestore();
    });

    it('should show error if CSV download fails', async () => {
      mockDownloadSalesTrendCsv.mockRejectedValueOnce(new Error('CSV Download Error'));
      render(<SalesTrendReport />);
      await waitFor(() => screen.getByText('Download CSV'));
      await user.click(screen.getByRole('button', { name: 'Download CSV' }));
      await waitFor(() => expect(screen.getByText('Error: CSV Download Error')).toBeInTheDocument());
    });

    it('should show error message if report summary is not available for CSV export', async () => {
      mockGetSalesTrendReport.mockResolvedValueOnce(mockReportDataWithNullSummary);
      render(<SalesTrendReport />);
      await waitFor(() => screen.getByText('Download CSV')); // Wait for component to stabilize

      const csvButton = screen.getByRole('button', { name: 'Download CSV' });
      await user.click(csvButton);

      await waitFor(() => expect(screen.getByText("Error: Report data not available for CSV export.")).toBeInTheDocument());
      expect(mockDownloadSalesTrendCsv).not.toHaveBeenCalled();
    });
  });

  describe('PDF Export', () => {
    it('should attempt PDF generation and call save', async () => {
      render(<SalesTrendReport />);
      await waitFor(() => screen.getByText('Download PDF'));

      const pdfButton = screen.getByRole('button', { name: 'Download PDF' });
      expect(pdfButton).not.toBeDisabled();

      await user.click(pdfButton);

      await waitFor(() => expect(mockHtml2Canvas).toHaveBeenCalled());
      expect(mockHtml2Canvas).toHaveBeenCalledWith(
        expect.any(HTMLElement),
        expect.objectContaining({ scale: 2, useCORS: true })
      );

      await waitFor(() => expect(mockJsPDFSave).toHaveBeenCalled());
      expect(mockJsPDFText).toHaveBeenCalledWith(
        `Sales Trends - ${sampleSummary.period} (${sampleSummary.startDate} to ${sampleSummary.endDate})`,
        expect.any(Number), expect.any(Number), { align: 'center' }
      );
      expect(mockJsPDFAddImage).toHaveBeenCalledWith('data:image/png;base64,mockchartimagedata', 'PNG', expect.any(Number), expect.any(Number), expect.any(Number), expect.any(Number));
      expect(mockJsPDFSave).toHaveBeenCalledWith(`sales_trend_report_${sampleSummary.startDate}_to_${sampleSummary.endDate}.pdf`);
    });

    it('should disable PDF button if chartData is initially null (no sales data)', async () => {
      mockGetSalesTrendReport.mockResolvedValueOnce(mockSalesReportNoData);
      render(<SalesTrendReport />);
      await waitFor(() => expect(screen.getByText('No sales data available for the selected period.')).toBeInTheDocument());

      const pdfButton = screen.getByRole('button', { name: 'Download PDF' });
      expect(pdfButton).toBeDisabled();
    });

    it('should show error message if report summary is not available for PDF export when button is clicked', async () => {
      // This test ensures the check within handleDownloadPdf is hit if the button somehow becomes enabled
      // while summary is null (e.g. salesData exists, but summary is missing).
      mockGetSalesTrendReport.mockResolvedValueOnce(mockReportDataWithNullSummary);
      render(<SalesTrendReport />);
      await waitFor(() => screen.getByText('Sales Trend Report')); // Wait for component to render with data

      const pdfButton = screen.getByRole('button', { name: 'Download PDF' });
      // In this scenario, `chartData` would exist due to `sampleSalesData`, so button might be enabled.
      expect(pdfButton).not.toBeDisabled(); 

      await user.click(pdfButton);
      
      await waitFor(() => expect(screen.getByText("Error: Chart or report data is not available for PDF export.")).toBeInTheDocument());
      expect(mockHtml2Canvas).not.toHaveBeenCalled();
      expect(mockJsPDFSave).not.toHaveBeenCalled();
    });


    it('should handle PDF generation error if html2canvas fails', async () => {
      const canvasErrorMsg = "html2canvas PDF export error";
      mockHtml2Canvas.mockRejectedValueOnce(new Error(canvasErrorMsg));
      render(<SalesTrendReport />);
      await waitFor(() => screen.getByText('Download PDF'));

      const pdfButton = screen.getByRole('button', { name: 'Download PDF' });
      await user.click(pdfButton);

      await waitFor(() => expect(screen.getByText(`Error: ${canvasErrorMsg}`)).toBeInTheDocument());
      expect(mockJsPDFSave).not.toHaveBeenCalled();
    });
  });
});