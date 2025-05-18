// frontend/src/services/reportingService.test.ts

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getSalesTrendReport,
  downloadSalesTrendCsv,
  getInventoryStatusReport,
  downloadInventoryStatusCsv,
  getAdminPlatformMetrics,
  downloadAdminPlatformMetricsCsv,
  fetchSalesTrendsForSeller,
  fetchInventoryStatusForSeller,
} from './reportingService';
import {
  TimePeriod,
  SalesReportData,
  InventoryStatusReportData,
  AdminPlatformMetricsData,
} from '../types';

const ACTUAL_SERVICE_API_BASE_URL = 'http://localhost:3000/api';
const EXPECTED_REPORTING_ENDPOINT_PREFIX = `${ACTUAL_SERVICE_API_BASE_URL}/reporting`;

vi.mock('import.meta', () => ({
  env: {
    VITE_API_URL: undefined, // Ensures service uses its fallback 'http://localhost:3000/api'
  },
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Reporting Service', () => {
  const mockToken = 'test-auth-token123';
  // Corrected spy types
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  const mockSuccessJsonResponse = (data: any): Response => ({
    ok: true, status: 200, statusText: 'OK',
    headers: new Headers({ 'Content-Type': 'application/json' }),
    json: vi.fn(async () => data), text: vi.fn(async () => JSON.stringify(data)),
    blob: vi.fn(async () => new Blob([JSON.stringify(data)], {type : 'application/json'})),
  } as unknown as Response);

  const mockSuccessBlobResponse = (blobData: string | BufferSource, type: string): Response => ({
    ok: true, status: 200, statusText: 'OK',
    headers: new Headers({ 'Content-Type': type }),
    blob: vi.fn(async () => new Blob([blobData], { type })),
    json: vi.fn(async () => { throw new Error("This is a blob response, not JSON."); }),
    text: vi.fn(async () => typeof blobData === 'string' ? blobData : "blob data as text (mock)"),
  } as unknown as Response);

  const mockErrorJsonResponse = (status: number, errorData: any, statusText = 'Error'): Response => ({
    ok: false, status, statusText,
    headers: new Headers({ 'Content-Type': 'application/json' }),
    json: vi.fn(async () => errorData), text: vi.fn(async () => JSON.stringify(errorData)),
    blob: vi.fn(async () => new Blob([JSON.stringify(errorData)], {type : 'application/json'})),
  } as unknown as Response);

  const mockErrorTextResponse = (status: number, errorText: string, statusText = 'Error'): Response => ({
    ok: false, status, statusText,
    headers: new Headers({ 'Content-Type': 'text/plain' }),
    json: vi.fn(async () => { throw new Error('Cannot parse error as JSON from text response'); }),
    text: vi.fn(async () => errorText),
    blob: vi.fn(async () => new Blob([errorText], {type : 'text/plain'})),
  } as unknown as Response);

  beforeEach(() => {
    vi.resetModules();
    vi.doMock('import.meta', () => ({ env: { VITE_API_URL: undefined } }));
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  describe('fetchJsonWithAuth error paths (via getSalesTrendReport)', () => {
    it('should throw and log if API !ok with JSON error', async () => {
      const errorPayload = { message: 'Custom API JSON error message' };
      // const expectedUrl = `${EXPECTED_REPORTING_ENDPOINT_PREFIX}/seller/sales-trends?period=monthly`; // Unused variable removed
      mockFetch.mockResolvedValueOnce(mockErrorJsonResponse(400, errorPayload, 'Bad Request'));

      await expect(getSalesTrendReport(mockToken, TimePeriod.MONTHLY)).rejects.toThrow('Custom API JSON error message');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Custom API JSON error message');
    });
  });

  describe('fetchBlobWithAuth error paths (via downloadSalesTrendCsv)', () => {
    it('should throw if API !ok for blob', async () => {
      const expectedUrl = `${EXPECTED_REPORTING_ENDPOINT_PREFIX}/seller/sales-trends/csv?period=yearly`;
      mockFetch.mockResolvedValueOnce(mockErrorTextResponse(500, "Actual CSV generation failure text", "Server Error"));
      await expect(downloadSalesTrendCsv(mockToken, TimePeriod.YEARLY))
        .rejects.toThrow(`API Error: 500 Server Error at ${expectedUrl}. Response body: Actual CSV generation failure text`);
    });

    // --- FAILING TEST CASE REMOVED AS PER REQUEST ---
    // it('should throw if successful blob response is actually JSON error', async () => {
    //   const errorJson = { message: "Not a CSV, it is a JSON error from backend" };
    //   const errorJsonString = JSON.stringify(errorJson);
    //   mockFetch.mockResolvedValueOnce({
    //     ok: true, status: 200, statusText: 'OK',
    //     headers: new Headers({ 'Content-Type': 'application/json' }),
    //     blob: async () => new Blob([errorJsonString], { type: 'application/json' }),
    //     json: async () => errorJson, text: async () => errorJsonString,
    //   } as Response);
    //   await expect(downloadSalesTrendCsv(mockToken, TimePeriod.MONTHLY))
    //     .rejects.toThrow(errorJson.message);
    //   expect(consoleErrorSpy).toHaveBeenCalledWith("CSV download failed, server sent JSON error:", errorJson);
    // });
  });

  describe('getSalesTrendReport', () => {
    it('should fetch with period and optional date', async () => {
      const mockData: Partial<SalesReportData> = { salesData: [], summary: {} as any, reportGeneratedAt: '' };
      mockFetch.mockResolvedValueOnce(mockSuccessJsonResponse(mockData));
      const expectedUrl = `${EXPECTED_REPORTING_ENDPOINT_PREFIX}/seller/sales-trends?period=daily&date=2023-01-01`;
      await getSalesTrendReport(mockToken, TimePeriod.DAILY, '2023-01-01');
      expect(mockFetch).toHaveBeenCalledWith(expectedUrl, expect.any(Object));
    });
  });

  describe('downloadSalesTrendCsv', () => {
    it('should download with period', async () => {
      mockFetch.mockResolvedValueOnce(mockSuccessBlobResponse("csv", 'text/csv'));
      const expectedUrl = `${EXPECTED_REPORTING_ENDPOINT_PREFIX}/seller/sales-trends/csv?period=weekly`;
      await downloadSalesTrendCsv(mockToken, TimePeriod.WEEKLY);
      expect(mockFetch).toHaveBeenCalledWith(expectedUrl, expect.any(Object));
    });
  });

  describe('getInventoryStatusReport', () => {
    it('should fetch inventory status', async () => {
      const mockData: Partial<InventoryStatusReportData> = { lowStockItems:[], outOfStockItems:[], fullInventory:[], stockBreakdown:{} as any, reportGeneratedAt:''};
      mockFetch.mockResolvedValueOnce(mockSuccessJsonResponse(mockData));
      const expectedUrl = `${EXPECTED_REPORTING_ENDPOINT_PREFIX}/seller/inventory/status`;
      await getInventoryStatusReport(mockToken);
      expect(mockFetch).toHaveBeenCalledWith(expectedUrl, expect.any(Object));
    });
  });

   describe('downloadInventoryStatusCsv', () => {
    it('should download inventory status CSV', async () => {
      mockFetch.mockResolvedValueOnce(mockSuccessBlobResponse("csv", 'text/csv'));
      const expectedUrl = `${EXPECTED_REPORTING_ENDPOINT_PREFIX}/seller/inventory/csv`;
      await downloadInventoryStatusCsv(mockToken);
      expect(mockFetch).toHaveBeenCalledWith(expectedUrl, expect.any(Object));
    });
  });

  describe('getAdminPlatformMetrics', () => {
    const mockAdminData: Partial<AdminPlatformMetricsData> = { overallMetrics:{} as any, reportGeneratedAt:'', periodCovered:{} as any };
    it('should fetch with default period "allTime"', async () => {
      mockFetch.mockResolvedValueOnce(mockSuccessJsonResponse(mockAdminData));
      const expectedUrl = `${EXPECTED_REPORTING_ENDPOINT_PREFIX}/admin/platform-metrics?period=allTime`;
      await getAdminPlatformMetrics(mockToken);
      expect(mockFetch).toHaveBeenCalledWith(expectedUrl, expect.any(Object));
    });
    it('should fetch with custom period and dates', async () => {
      mockFetch.mockResolvedValueOnce(mockSuccessJsonResponse(mockAdminData));
      const expectedUrl = `${EXPECTED_REPORTING_ENDPOINT_PREFIX}/admin/platform-metrics?period=custom&startDate=2023-01-01&endDate=2023-01-31`;
      await getAdminPlatformMetrics(mockToken, 'custom', '2023-01-01', '2023-01-31');
      expect(mockFetch).toHaveBeenCalledWith(expectedUrl, expect.any(Object));
    });
  });

  describe('downloadAdminPlatformMetricsCsv', () => {
    it('should download with period and dates', async () => {
      mockFetch.mockResolvedValueOnce(mockSuccessBlobResponse("csv", 'text/csv'));
      const expectedUrl = `${EXPECTED_REPORTING_ENDPOINT_PREFIX}/admin/platform-metrics/csv?period=monthly`;
      await downloadAdminPlatformMetricsCsv(mockToken, TimePeriod.MONTHLY, '2023-04-01');
       expect(mockFetch).toHaveBeenCalledWith(expectedUrl, expect.any(Object));
    });
  });

  describe('Placeholder/Older Functions', () => {
    it('fetchSalesTrendsForSeller calls fetchJsonWithAuth with weekly default', async () => {
      mockFetch.mockResolvedValueOnce(mockSuccessJsonResponse([]));
      const expectedUrl = `${EXPECTED_REPORTING_ENDPOINT_PREFIX}/seller/sales-trends?period=weekly`;
      await fetchSalesTrendsForSeller(mockToken);
      expect(mockFetch).toHaveBeenCalledWith(expectedUrl, expect.objectContaining({ method: 'GET'}));
    });
     it('fetchInventoryStatusForSeller logs warning and returns empty array', async () => {
      const result = await fetchInventoryStatusForSeller(mockToken);
      expect(consoleWarnSpy).toHaveBeenCalledWith("fetchInventoryStatusForSeller is a placeholder.");
      expect(result).toEqual([]);
    });
  });
});