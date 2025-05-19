// frontend/src/services/reportingService.ts
import {
  SalesReportData,
  TimePeriod,
  InventoryStatusReportData,
  AdminPlatformMetricsData, // Import the new Admin type
} from '../types'; // Assuming your types are in 'src/types/index.ts' or 'src/types/reporting.ts' and exported

// The VITE_API_URL should point to your NestJS backend's /api route
const API_BASE_URL = import.meta.env.VITE_API_URLs ;
const REPORTING_ENDPOINT_PREFIX = `${API_BASE_URL}/reporting`;


// Helper function to create authenticated headers
const getAuthHeaders = (token: string): HeadersInit => {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json', // Default for JSON, can be overridden for other content types
  };
};

// Generic fetch function with error handling for JSON responses
const fetchJsonWithAuth = async <T>(
  url: string,
  token: string,
  options: RequestInit = {}
): Promise<T> => {
  const headers = getAuthHeaders(token);
  const response = await fetch(url, { ...options, headers: { ...headers, ...options.headers } });

  if (!response.ok) {
    let errorMessage = `API Error: ${response.status} ${response.statusText} at ${url}`;
    try {
      const errorBody = await response.json();
      errorMessage = errorBody.message || errorBody.error || errorMessage;
    } catch (e) {
      const textError = await response.text().catch(() => "Could not read error response body.");
      errorMessage = `${errorMessage}. Response body: ${textError.substring(0, 200)}`;
    }
    console.error(errorMessage);
    throw new Error(errorMessage);
  }
  return response.json() as Promise<T>;
};

// Generic fetch function for Blob responses (like CSVs)
const fetchBlobWithAuth = async (
  url: string,
  token: string,
  options: RequestInit = {}
): Promise<Blob> => {
  // For file downloads, Content-Type in request header is usually not needed.
  const headers = { 'Authorization': `Bearer ${token}`, ...options.headers };
  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    let errorMessage = `API Error: ${response.status} ${response.statusText} at ${url}`;
    try {
      // Try to parse error response body if it's JSON (some APIs might send JSON error for failed blob)
      const errorBody = await response.json();
      errorMessage = errorBody.message || errorBody.error || errorMessage;
    } catch (e) {
      // If response is not JSON or error parsing, get text
       const textError = await response.text().catch(() => "Could not read error response body.");
       errorMessage = `${errorMessage}. Response body: ${textError.substring(0,200)}`;
    }
    console.error(errorMessage);
    throw new Error(errorMessage);
  }

  const blob = await response.blob();
    // Optional: Check if the backend accidentally sent a JSON error instead of a blob
    if (blob.type === "application/json") {
        const errorJsonText = await blob.text();
        try {
            const errorJson = JSON.parse(errorJsonText);
            console.error("CSV download failed, server sent JSON error:", errorJson);
            throw new Error(errorJson.message || "Failed to download CSV: Server returned an error as JSON.");
        } catch (e) {
             throw new Error(`Failed to download file. Server sent JSON error: ${errorJsonText.substring(0,200)}`);
        }
    }
  return blob;
};


// --- Seller Sales Trend Reports ---
export const getSalesTrendReport = async (
  token: string,
  period: TimePeriod,
  date?: string,
): Promise<SalesReportData> => {
  const queryParams = new URLSearchParams({ period });
  if (date) {
    queryParams.append('date', date);
  }
  const url = `${REPORTING_ENDPOINT_PREFIX}/seller/sales-trends?${queryParams.toString()}`;
  return fetchJsonWithAuth<SalesReportData>(url, token);
};

export const downloadSalesTrendCsv = async (
  token: string,
  period: TimePeriod,
  date?: string,
): Promise<Blob> => {
  const queryParams = new URLSearchParams({ period });
  if (date) {
    queryParams.append('date', date);
  }
  const url = `${REPORTING_ENDPOINT_PREFIX}/seller/sales-trends/csv?${queryParams.toString()}`;
  return fetchBlobWithAuth(url, token);
};

// --- Seller Inventory Status Reports ---
export const getInventoryStatusReport = async (
  token: string,
): Promise<InventoryStatusReportData> => {
  const url = `${REPORTING_ENDPOINT_PREFIX}/seller/inventory/status`;
  return fetchJsonWithAuth<InventoryStatusReportData>(url, token);
};

export const downloadInventoryStatusCsv = async (
  token: string,
): Promise<Blob> => {
  const url = `${REPORTING_ENDPOINT_PREFIX}/seller/inventory/csv`;
  return fetchBlobWithAuth(url, token);
};


// --- NEW FUNCTIONS FOR ADMIN PLATFORM METRICS ---

/**
 * Fetches the admin platform metrics report.
 * @param token - The authentication token.
 * @param period - The time period for the report ('allTime', 'daily', 'weekly', 'monthly', 'yearly').
 * @param startDate - Optional start date for custom period (YYYY-MM-DD).
 * @param endDate - Optional end date for custom period (YYYY-MM-DD).
 * @returns A promise that resolves to AdminPlatformMetricsData.
 */
export const getAdminPlatformMetrics = async (
  token: string,
  period: TimePeriod | 'allTime' | 'custom' = 'allTime',
  startDate?: string,
  endDate?: string,
): Promise<AdminPlatformMetricsData> => {
  const queryParams = new URLSearchParams();
  queryParams.append('period', period);
  if (startDate && (period === 'custom' || period === TimePeriod.DAILY)) { // Only add if relevant for period
    queryParams.append('startDate', startDate);
  }
  if (endDate && period === 'custom') {
    queryParams.append('endDate', endDate);
  }
  // For daily/weekly/monthly/yearly, the 'date' or a reference date might be passed as startDate
  // Backend's `getAdminPlatformMetrics` `customStartDateStr` handles this.

  const url = `${REPORTING_ENDPOINT_PREFIX}/admin/platform-metrics?${queryParams.toString()}`;
  return fetchJsonWithAuth<AdminPlatformMetricsData>(url, token);
};

/**
 * Downloads the admin platform metrics report as a CSV file.
 * @param token - The authentication token.
 * @param period - The time period for the report.
 * @param startDate - Optional start date for custom period (YYYY-MM-DD).
 * @param endDate - Optional end date for custom period (YYYY-MM-DD).
 * @returns A promise that resolves to a Blob containing the CSV data.
 */
export const downloadAdminPlatformMetricsCsv = async (
  token: string,
  period: TimePeriod | 'allTime' | 'custom' = 'allTime',
  startDate?: string,
  endDate?: string,
): Promise<Blob> => {
  const queryParams = new URLSearchParams();
  queryParams.append('period', period);
  if (startDate && (period === 'custom' || period === TimePeriod.DAILY)) {
    queryParams.append('startDate', startDate);
  }
  if (endDate && period === 'custom') {
    queryParams.append('endDate', endDate);
  }

  const url = `${REPORTING_ENDPOINT_PREFIX}/admin/platform-metrics/csv?${queryParams.toString()}`;
  return fetchBlobWithAuth(url, token);
};

// Your existing placeholder functions for other seller reports
// SalesTrendDataPointAPI, fetchSalesTrendsForSeller, downloadSalesTrendsForSellerCSV etc.
// can remain if they are still in use or planned.
// I'm keeping the focus on the new admin functions and the already implemented seller ones.

// ---- Example of existing functions from your provided file ----
export interface SalesTrendDataPointAPI {
  order_date: string;
  total_revenue: number;
  order_count: number;
}

export const fetchSalesTrendsForSeller = async (token: string): Promise<SalesTrendDataPointAPI[]> => {
  // This seems to be a duplicate or an older version of getSalesTrendReport.
  // For consistency, using getSalesTrendReport is preferred.
  // If this is used elsewhere, ensure it aligns with backend or deprecate.
  const queryParams = new URLSearchParams({ period: TimePeriod.WEEKLY }); // Example default
  const url = `${REPORTING_ENDPOINT_PREFIX}/seller/sales-trends?${queryParams.toString()}`;
  return fetchJsonWithAuth<SalesTrendDataPointAPI[]>(url, token, { method: 'GET'});
};

export const downloadSalesTrendsForSellerCSV = async (token: string): Promise<Blob> => {
  // Similar to above, this might be an older version of downloadSalesTrendCsv
  const queryParams = new URLSearchParams({ period: TimePeriod.WEEKLY }); // Example default
  const url = `${REPORTING_ENDPOINT_PREFIX}/seller/sales-trends/csv?${queryParams.toString()}`;
  return fetchBlobWithAuth(url, token, { method: 'GET' });
};


// --- Placeholder functions (if needed, or remove if not used) ---
export interface InventoryStatusDataPointAPI {
  product_id: string;
  product_name: string;
  quantity_on_hand: number;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock';
  last_updated: string;
}

export const fetchInventoryStatusForSeller = async (_token: string): Promise<InventoryStatusDataPointAPI[]> => {
  console.warn("fetchInventoryStatusForSeller is a placeholder.");
  // ... (placeholder implementation)
  return [];
};

export const downloadInventoryStatusForSellerCSV = async (_token: string): Promise<Blob> => {
  console.warn("downloadInventoryStatusForSellerCSV is a placeholder.");
  // ... (placeholder implementation)
  return new Blob();
};

export interface CustomViewDataPointAPI {
  dimension: string;
  metric_value: number;
  details: Record<string, any>;
}

export const fetchCustomViewForSeller = async (_token: string, /* viewConfig: Record<string, any> */): Promise<CustomViewDataPointAPI[]> => {
  console.warn("fetchCustomViewForSeller is a placeholder.");
  // ... (placeholder implementation)
  return [];
};

export const downloadCustomViewForSellerCSV = async (_token: string, /* viewConfig: Record<string, any> */): Promise<Blob> => {
  console.warn("downloadCustomViewForSellerCSV is a placeholder.");
  // ... (placeholder implementation)
  return new Blob();
};