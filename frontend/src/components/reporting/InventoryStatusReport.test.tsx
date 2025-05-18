// frontend/src/components/reporting/InventoryStatusReport.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InventoryStatusReport from './InventoryStatusReport';

import {
  InventoryStatusReportData,
  StockBreakdown,
} from '../../types';

// --- Use vi.hoisted() for ALL mocks needed in hoisted vi.mock factories ---
const { mockGetInventoryStatusReport, mockDownloadInventoryStatusCsv } = vi.hoisted(() => {
  return {
    mockGetInventoryStatusReport: vi.fn(),
    mockDownloadInventoryStatusCsv: vi.fn(),
  };
});

const { mockGetAccessTokenSilently } = vi.hoisted(() => {
  return {
    mockGetAccessTokenSilently: vi.fn(),
  };
});

const {
  mockJsPDFSave, mockJsPDFAddImage, mockJsPDFText,
  mockJsPDFAddPage, mockJsPDFSetFontSize,
} = vi.hoisted(() => {
  return {
    mockJsPDFSave: vi.fn(), mockJsPDFAddImage: vi.fn(), mockJsPDFText: vi.fn(),
    mockJsPDFAddPage: vi.fn(), mockJsPDFSetFontSize: vi.fn(),
  };
});

const { getMockJsPDFInstance } = vi.hoisted(() => {
  const fn = () => ({
    text: mockJsPDFText, addImage: mockJsPDFAddImage, save: mockJsPDFSave,
    addPage: mockJsPDFAddPage, setFontSize: mockJsPDFSetFontSize,
    internal: {
      pageSize: {
        getWidth: vi.fn(() => 595.28),
        getHeight: vi.fn(() => 841.89),
      },
    },
    lastAutoTable: { finalY: 0 },
  });
  return { getMockJsPDFInstance: fn };
});

const { mockAutoTable } = vi.hoisted(() => ({ mockAutoTable: vi.fn() }));
const { mockHtml2Canvas } = vi.hoisted(() => ({ mockHtml2Canvas: vi.fn() }));

import RealJsPDFConstructor from 'jspdf';

vi.mock('../../services/reportingService', () => ({
  getInventoryStatusReport: mockGetInventoryStatusReport,
  downloadInventoryStatusCsv: mockDownloadInventoryStatusCsv,
}));

vi.mock('@auth0/auth0-react', async () => {
  return {
    useAuth0: () => ({
      getAccessTokenSilently: mockGetAccessTokenSilently,
      isAuthenticated: true, user: { name: 'Test User', given_name: 'Test' }, isLoading: false,
    }),
  };
});

vi.mock('react-chartjs-2', () => ({
  Pie: vi.fn((props) => (
    <div data-testid="mock-pie-chart">
      Mock Pie Chart - Data: {JSON.stringify(props.data?.datasets[0]?.data)}
    </div>
  )),
}));

vi.mock('jspdf', () => ({
  default: vi.fn().mockImplementation(getMockJsPDFInstance),
}));

vi.mock('jspdf-autotable', () => ({ default: mockAutoTable }));
vi.mock('html2canvas', () => ({ default: mockHtml2Canvas }));

const mockCreateObjectURL = vi.fn();
const mockRevokeObjectURL = vi.fn();

const MOCK_TOKEN = 'mock-access-token';
const mockGeneratedDate = new Date('2024-05-15T10:30:00.000Z');

const mockReportData: InventoryStatusReportData = {
  reportGeneratedAt: mockGeneratedDate.toISOString(),
  stockBreakdown: {totalProducts: 10, inStockPercent: 70, lowStockPercent: 20, outOfStockPercent: 10},
  lowStockItems: [{ prodId: 101, productName: 'Low Stock Item A', currentQuantity: 3 }],
  outOfStockItems: [{ prodId: 201, productName: 'Out Of Stock Item B' }],
  fullInventory: [
    { prodId: 1, productName: 'Full Item Alpha', category: 'Electronics', quantity: 50, price: 199.99 },
    { prodId: 2, productName: 'Full Item Beta', category: 'Books', quantity: 5, price: 29.99 },
    { prodId: 101, productName: 'Low Stock Item A', category: 'Electronics', quantity: 3, price: 75.50 },
    { prodId: 201, productName: 'Out Of Stock Item B', category: 'Books', quantity: 0, price: 15.00 },
    { prodId: 3, productName: 'Full Item Gamma', category: 'Home Goods', quantity: 120, price: 49.95 },
  ],
};
const emptyStockBreakdown: StockBreakdown = {totalProducts: 0, inStockPercent: 0, lowStockPercent: 0, outOfStockPercent: 0};
const emptyReportData: InventoryStatusReportData = {
  reportGeneratedAt: mockGeneratedDate.toISOString(),
  stockBreakdown: emptyStockBreakdown, lowStockItems: [], outOfStockItems: [], fullInventory: []
};
const LOW_STOCK_THRESHOLD = 5;

describe('InventoryStatusReport', () => {
  const user = userEvent.setup();
  let originalCreateObjectURL: (blob: Blob | MediaSource) => string;
  let originalRevokeObjectURL: (url: string) => void;

  beforeEach(() => {
    // Timers still commented out for stability
    // vi.useFakeTimers();
    // vi.setSystemTime(new Date('2025-05-18T14:00:00.000Z'));

    mockGetAccessTokenSilently.mockReset().mockResolvedValue(MOCK_TOKEN);
    mockGetInventoryStatusReport.mockReset().mockResolvedValue(mockReportData);
    mockDownloadInventoryStatusCsv.mockReset().mockResolvedValue(new Blob(['csv,test,data'], { type: 'text/csv' }));

    (RealJsPDFConstructor as unknown as ReturnType<typeof vi.fn>).mockImplementation(getMockJsPDFInstance);

    mockHtml2Canvas.mockReset().mockImplementation(async (element: HTMLElement, options?: Partial<any>) => {
      const canvas = document.createElement('canvas');
      canvas.width = options?.scale && element.offsetWidth ? element.offsetWidth * options.scale : 400;
      canvas.height = options?.scale && element.offsetHeight ? element.offsetHeight * options.scale : 400;
      // Add a mock for toDataURL to the canvas instance
      canvas.toDataURL = vi.fn(() => 'data:image/png;base64,mockedimagedata');
      return canvas;
    });
    mockAutoTable.mockReset().mockImplementation((doc: any, options: any) => {
      const currentFinalY = doc.lastAutoTable?.finalY;
      const startY = options.startY;
      let baseFinalY = 0;
      if (typeof startY === 'number') baseFinalY = startY;
      else if (typeof currentFinalY === 'number') baseFinalY = currentFinalY;
      if (!doc.lastAutoTable) doc.lastAutoTable = {};
      doc.lastAutoTable.finalY = baseFinalY + 50;
    });

    mockJsPDFSave.mockClear(); mockJsPDFAddImage.mockClear(); mockJsPDFText.mockClear();
    mockJsPDFAddPage.mockClear(); mockJsPDFSetFontSize.mockClear();

    originalCreateObjectURL = global.URL.createObjectURL;
    originalRevokeObjectURL = global.URL.revokeObjectURL;
    global.URL.createObjectURL = mockCreateObjectURL.mockReturnValue('blob:http://localhost/mock-url-object-id');
    global.URL.revokeObjectURL = mockRevokeObjectURL;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // vi.useRealTimers();
    global.URL.createObjectURL = originalCreateObjectURL;
    global.URL.revokeObjectURL = originalRevokeObjectURL;
  });

  it('should render loading state initially', () => {
    mockGetInventoryStatusReport.mockImplementationOnce(() => new Promise(() => {}));
    render(<InventoryStatusReport />);
    expect(screen.getByText('Loading inventory report...')).toBeInTheDocument();
  });

  it('should fetch and display report data successfully', async () => {
    render(<InventoryStatusReport />);
    await waitFor(() => expect(screen.getByText('Inventory Status Report')).toBeInTheDocument());
    expect(mockGetInventoryStatusReport).toHaveBeenCalledWith(MOCK_TOKEN);
    expect(screen.getByText(`Report generated at: ${mockGeneratedDate.toLocaleString()}`)).toBeInTheDocument();

    const pieChart = screen.getByTestId('mock-pie-chart');
    expect(pieChart).toBeInTheDocument();
    expect(pieChart).toHaveTextContent(`[${mockReportData.stockBreakdown.inStockPercent},${mockReportData.stockBreakdown.lowStockPercent},${mockReportData.stockBreakdown.outOfStockPercent}]`);
    expect(screen.getByText(`Stock Breakdown (Total Products: ${mockReportData.stockBreakdown.totalProducts})`)).toBeInTheDocument();

    const lowStockHeadingText = `Low Stock Items (Less than ${LOW_STOCK_THRESHOLD} units)`;
    const lowStockSectionEl = screen.getByRole('heading', { name: lowStockHeadingText }).closest('.low-stock-section');
    expect(lowStockSectionEl).toBeInTheDocument();
    if (lowStockSectionEl instanceof HTMLElement) {
        expect(within(lowStockSectionEl).getByText(mockReportData.lowStockItems[0].productName)).toBeInTheDocument();
        expect(within(lowStockSectionEl).getByText(mockReportData.lowStockItems[0].currentQuantity.toString())).toBeInTheDocument();
    } else { throw new Error('Low stock section not found or not HTMLElement'); }

    const outOfStockSectionEl = screen.getByRole('heading', { name: "Out of Stock Items" }).closest('.out-of-stock-section');
    expect(outOfStockSectionEl).toBeInTheDocument();
    if (outOfStockSectionEl instanceof HTMLElement) {
        expect(within(outOfStockSectionEl).getByText(mockReportData.outOfStockItems[0].productName)).toBeInTheDocument();
    } else { throw new Error('Out of stock section not found or not HTMLElement'); }


    const fullInventorySectionEl = screen.getByRole('heading', { name: "Full Inventory List" }).closest('.full-inventory-section');
    expect(fullInventorySectionEl).toBeInTheDocument();
    if (fullInventorySectionEl instanceof HTMLElement) {
        mockReportData.fullInventory.forEach(item => {
            const rows = within(fullInventorySectionEl).getAllByRole('row');
            const targetRow = rows.find(row => within(row).queryByText(item.productName) && within(row).queryByText(item.category));
            expect(targetRow).toBeInTheDocument();
            if(targetRow){
                expect(within(targetRow).getByText(item.productName)).toBeInTheDocument();
                expect(within(targetRow).getByText(item.category)).toBeInTheDocument();
                expect(within(targetRow).getByText(item.quantity.toString())).toBeInTheDocument();
                expect(within(targetRow).getByText(`R ${item.price.toFixed(2)}`)).toBeInTheDocument();
            }
        });
    } else { throw new Error('Full inventory section not found or not HTMLElement'); }

    const categoryDropdown = screen.getByRole('combobox');
    expect(categoryDropdown).toBeInTheDocument();
    const uniqueCategories = Array.from(new Set(mockReportData.fullInventory.map(item => item.category)));
    uniqueCategories.forEach(cat => {
      expect(within(categoryDropdown).getByRole('option', { name: cat })).toBeInTheDocument();
    });
  });

  it('should display error message if data fetching fails', async () => {
    const errorMsg = 'Network Error';
    mockGetInventoryStatusReport.mockRejectedValueOnce(new Error(errorMsg));
    render(<InventoryStatusReport />);
    await waitFor(() => expect(screen.getByText(`Error: ${errorMsg}`)).toBeInTheDocument());
  });

  it('should display "No inventory data available" if reportData is null from service', async () => {
    mockGetInventoryStatusReport.mockResolvedValueOnce(null);
    render(<InventoryStatusReport />);
    await waitFor(() => expect(screen.getByText('No inventory data available.')).toBeInTheDocument());
  });

  it('should display "No items" messages if respective lists are empty', async () => {
    mockGetInventoryStatusReport.mockResolvedValueOnce(emptyReportData);
    render(<InventoryStatusReport />);
    await waitFor(() => expect(screen.getByText('No items are currently low on stock.')).toBeInTheDocument());
    expect(screen.getByText('No items are currently out of stock.')).toBeInTheDocument();
    expect(screen.getByText('No products match your current filters or the inventory is empty.')).toBeInTheDocument();
  });

  describe('Filtering Full Inventory', () => {
    it('should filter by search term', async () => {
      render(<InventoryStatusReport />);
      await waitFor(() => expect(screen.getByText('Full Item Alpha')).toBeInTheDocument()); // Wait for initial render
      const searchInput = screen.getByPlaceholderText('Search by product name...');
      await user.type(searchInput, 'Alpha');
      const fullInventorySectionEl = screen.getByRole('heading', { name: /Full Inventory List/i }).closest('.full-inventory-section');
      expect(fullInventorySectionEl).toBeInTheDocument();
      if (fullInventorySectionEl instanceof HTMLElement) {
        expect(within(fullInventorySectionEl).getByText('Full Item Alpha')).toBeInTheDocument();
        expect(within(fullInventorySectionEl).queryByText('Full Item Beta')).not.toBeInTheDocument();
      } else { throw new Error('Full inventory section not found or not HTMLElement'); }
    });

    it('should filter by category', async () => {
      render(<InventoryStatusReport />);
      await waitFor(() => expect(screen.getByText('Full Item Alpha')).toBeInTheDocument()); // Wait for initial render
      const categorySelect = screen.getByRole('combobox');
      await user.selectOptions(categorySelect, 'Books');
      const fullInventorySectionEl = screen.getByRole('heading', { name: /Full Inventory List/i }).closest('.full-inventory-section');
      expect(fullInventorySectionEl).toBeInTheDocument();
      if (fullInventorySectionEl instanceof HTMLElement) {
        expect(within(fullInventorySectionEl).getByText('Full Item Beta')).toBeInTheDocument();
        expect(within(fullInventorySectionEl).getByText('Out Of Stock Item B')).toBeInTheDocument();
        expect(within(fullInventorySectionEl).queryByText('Full Item Alpha')).not.toBeInTheDocument();
      } else { throw new Error('Full inventory section not found or not HTMLElement'); }
    });

    it('should show "no products match" message when filters result in empty list', async () => {
      render(<InventoryStatusReport />);
      await waitFor(() => expect(screen.getByText('Full Item Alpha')).toBeInTheDocument()); // Wait for initial render
      const searchInput = screen.getByPlaceholderText('Search by product name...');
      await user.type(searchInput, 'NonExistentProductXYZ');
      expect(screen.getByText('No products match your current filters or the inventory is empty.')).toBeInTheDocument();
    });
  });

  describe('CSV Download', () => {
    it('should trigger CSV download successfully', async () => {
      render(<InventoryStatusReport />);
      await waitFor(() => screen.getByText('Download CSV'));
      const csvButton = screen.getByRole('button', { name: 'Download CSV' });
      const createElementSpy = vi.spyOn(document, 'createElement');
      await user.click(csvButton);
      expect(mockGetAccessTokenSilently).toHaveBeenCalled();
      expect(mockDownloadInventoryStatusCsv).toHaveBeenCalledWith(MOCK_TOKEN);
      await waitFor(() => {
        expect(mockCreateObjectURL).toHaveBeenCalledWith(expect.any(Blob));
        expect(createElementSpy).toHaveBeenCalledWith('a');
      });
      const createdAnchor = createElementSpy.mock.results[0].value as HTMLAnchorElement;
      expect(createdAnchor.href).toBe('blob:http://localhost/mock-url-object-id');
      expect(createdAnchor.download).toBe('inventory_status_report.csv');
      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:http://localhost/mock-url-object-id');
      createElementSpy.mockRestore();
    });
    it('should show error if CSV download service fails', async () => {
      const errorMsg = 'CSV gen failed';
      mockDownloadInventoryStatusCsv.mockRejectedValueOnce(new Error(errorMsg));
      render(<InventoryStatusReport />);
      await waitFor(() => screen.getByText('Download CSV'));
      const csvButton = screen.getByRole('button', { name: 'Download CSV' });
      await user.click(csvButton);
      await waitFor(() => expect(screen.getByText(`Error: ${errorMsg}`)).toBeInTheDocument());
    });
  });

  describe('PDF Download', () => {
    it('should attempt to generate and download PDF successfully', async () => {
      render(<InventoryStatusReport />);
      await waitFor(() => screen.getByText('Download PDF'));
      const pdfButton = screen.getByRole('button', { name: 'Download PDF' });
      await user.click(pdfButton);
      await waitFor(() => expect(mockHtml2Canvas).toHaveBeenCalled());
      await waitFor(() => {
        expect(mockJsPDFText).toHaveBeenCalledWith('Inventory Status Report', expect.any(Number), expect.any(Number), { align: 'center' });
        expect(mockJsPDFText).toHaveBeenCalledWith(expect.stringContaining("Printed:"), expect.any(Number), expect.any(Number), { align: 'right'});
        expect(mockJsPDFAddImage).toHaveBeenCalledWith('data:image/png;base64,mockedimagedata', 'PNG', expect.any(Number), expect.any(Number), expect.any(Number), expect.any(Number));
        expect(mockJsPDFText).toHaveBeenCalledWith('Low Stock Items', expect.any(Number), expect.any(Number));
        expect(mockAutoTable).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
          head: [['Product ID', 'Product Name', 'Current Quantity']],
          body: mockReportData.lowStockItems.map(item => [item.prodId, item.productName, item.currentQuantity]),
        }));
        expect(mockJsPDFText).toHaveBeenCalledWith('Out of Stock Items', expect.any(Number), expect.any(Number));
        expect(mockAutoTable).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
          head: [['Product ID', 'Product Name']],
          body: mockReportData.outOfStockItems.map(item => [item.prodId, item.productName]),
        }));
        expect(mockJsPDFText).toHaveBeenCalledWith('Full Inventory List', expect.any(Number), expect.any(Number));
        expect(mockAutoTable).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
          head: [['Product ID', 'Product Name', 'Category', 'Quantity', 'Price (R)']],
          body: mockReportData.fullInventory.map(item => [item.prodId, item.productName, item.category, item.quantity, item.price.toFixed(2)]),
        }));
        expect(mockJsPDFSave).toHaveBeenCalledWith('inventory_status_report_final.pdf');
      });
    });

    it('should generate PDF with "No items" messages if lists are empty', async () => {
      mockGetInventoryStatusReport.mockResolvedValueOnce(emptyReportData);
      render(<InventoryStatusReport />);
      await waitFor(() => screen.getByText('Download PDF'));
      const pdfButton = screen.getByRole('button', { name: 'Download PDF' });
      await user.click(pdfButton);
      await waitFor(() => {
        expect(mockJsPDFText).toHaveBeenCalledWith('No items are currently low on stock.', expect.any(Number), expect.any(Number));
        expect(mockJsPDFText).toHaveBeenCalledWith('No items are currently out of stock.', expect.any(Number), expect.any(Number));
        expect(mockJsPDFText).toHaveBeenCalledWith('No products in full inventory or matching current filters.', expect.any(Number), expect.any(Number));
        expect(mockJsPDFSave).toHaveBeenCalled();
      });
    });

    it('should show error and not call PDF generation if reportData is null', async () => {
      mockGetInventoryStatusReport.mockResolvedValueOnce(null);
      render(<InventoryStatusReport />);
      await waitFor(() => screen.getByText('No inventory data available.'));
      const pdfButton = screen.queryByRole('button', { name: 'Download PDF' });
      if (pdfButton) {
        await user.click(pdfButton);
        await waitFor(() => expect(screen.getByText("Error: Report data not available to generate PDF.")).toBeInTheDocument());
        expect(mockHtml2Canvas).not.toHaveBeenCalled();
        expect(mockJsPDFSave).not.toHaveBeenCalled();
      } else {
        expect(mockHtml2Canvas).not.toHaveBeenCalled();
        expect(mockJsPDFSave).not.toHaveBeenCalled();
      }
    });

    it('should handle PDF generation error if html2canvas fails', async () => {
      const canvasError = 'Canvas capture failed';
      mockHtml2Canvas.mockRejectedValueOnce(new Error(canvasError));
      render(<InventoryStatusReport />);
      await waitFor(() => screen.getByText('Download PDF'));
      const pdfButton = screen.getByRole('button', { name: 'Download PDF' });
      await user.click(pdfButton);
      await waitFor(() => expect(screen.getByText(`Error: Failed to generate PDF: ${canvasError}`)).toBeInTheDocument());
      expect(mockJsPDFSave).not.toHaveBeenCalled();
    });

    it('should include textual chart summary in PDF when chart image is processed', async () => {
      render(<InventoryStatusReport />);
      await waitFor(() => screen.getByText('Download PDF'));
      const pdfButton = screen.getByRole('button', { name: 'Download PDF' });
      await user.click(pdfButton);
      await waitFor(() => {
        expect(mockHtml2Canvas).toHaveBeenCalled(); // Ensure chart image was processed
        // Check for the summary text that follows chart image processing
        expect(mockJsPDFText).toHaveBeenCalledWith(`- Total Products: ${mockReportData.stockBreakdown.totalProducts}`, expect.any(Number), expect.any(Number));
        expect(mockJsPDFText).toHaveBeenCalledWith(`- In Stock: ${mockReportData.stockBreakdown.inStockPercent}%`, expect.any(Number), expect.any(Number));
        expect(mockJsPDFText).toHaveBeenCalledWith(`- Low Stock: ${mockReportData.stockBreakdown.lowStockPercent}%`, expect.any(Number), expect.any(Number));
        expect(mockJsPDFText).toHaveBeenCalledWith(`- Out of Stock: ${mockReportData.stockBreakdown.outOfStockPercent}%`, expect.any(Number), expect.any(Number));
      });
      expect(mockJsPDFSave).toHaveBeenCalledWith('inventory_status_report_final.pdf');
    });

    it('should include filter criteria in PDF title for Full Inventory List', async () => {
      render(<InventoryStatusReport />);
      await waitFor(() => screen.getByText('Full Item Alpha'));
      const searchInput = screen.getByPlaceholderText('Search by product name...');
      await user.type(searchInput, 'Beta');
      const categorySelect = screen.getByRole('combobox');
      await user.selectOptions(categorySelect, 'Books');
      const pdfButton = screen.getByRole('button', { name: 'Download PDF' });
      await user.click(pdfButton);
      const expectedFilteredBody = mockReportData.fullInventory
        .filter(item => item.category === 'Books' && item.productName.toLowerCase().includes('beta'))
        .map(item => [item.prodId, item.productName, item.category, item.quantity, item.price.toFixed(2)]);
      await waitFor(() => {
        expect(mockJsPDFText).toHaveBeenCalledWith(
          'Full Inventory List (Category: Books) (Search: "Beta")',
          expect.any(Number), expect.any(Number)
        );
        expect(mockAutoTable).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            body: expectedFilteredBody,
            head: [['Product ID', 'Product Name', 'Category', 'Quantity', 'Price (R)']],
          })
        );
        expect(mockJsPDFSave).toHaveBeenCalled();
      });
    });
  });
});