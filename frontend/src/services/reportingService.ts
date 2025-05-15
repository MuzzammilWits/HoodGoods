// frontend/src/services/reportingService.ts

// The VITE_API_URL should point to your NestJS backend's /api route
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const REPORTING_ENDPOINT_PREFIX = `${API_BASE_URL}/reporting`;

export interface SalesTrendDataPointAPI {
  order_date: string; // Expecting date string (e.g., ISO format "YYYY-MM-DD")
  total_revenue: number;
  order_count: number;
}

// Helper function to create authenticated headers
const getAuthHeaders = (token: string): HeadersInit => {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json', // Default for JSON, can be overridden
  };
};

// Generic fetch function with error handling
const fetchWithAuth = async (
  url: string,
  token: string,
  options: RequestInit = {}
): Promise<Response> => {
  const defaultHeaders = getAuthHeaders(token);
  const headers = {
    ...defaultHeaders,
    ...options.headers, // Allow overriding default headers like Content-Type
  };

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    let errorMessage = `API Error: ${response.status} ${response.statusText} at ${url}`;
    try {
      // Try to parse error response body if it's JSON
      const errorBody = await response.json();
      errorMessage = errorBody.message || errorBody.error || errorMessage;
    } catch (e) {
      // If response is not JSON or error parsing, stick with the status text
      const textError = await response.text().catch(() => "Could not read error response body.");
      errorMessage = `${errorMessage}. Response body: ${textError.substring(0, 200)}`; // Limit length
    }
    console.error(errorMessage);
    throw new Error(errorMessage);
  }
  return response;
};


export const fetchSalesTrendsForSeller = async (token: string): Promise<SalesTrendDataPointAPI[]> => {
  try {
    // The backend infers the store from the authenticated user (via JWT sub)
    const response = await fetchWithAuth(
      `${REPORTING_ENDPOINT_PREFIX}/seller/sales-trends`,
      token,
      { method: 'GET' }
    );
    return await response.json();
  } catch (error) {
    console.error("Error in fetchSalesTrendsForSeller API call:", error);
    // Re-throw to be caught by the component for UI error handling
    throw error;
  }
};

export const downloadSalesTrendsForSellerCSV = async (token: string): Promise<Blob> => {
  try {
    // For file downloads, we don't send 'Content-Type': 'application/json'
    // The fetchWithAuth helper will use its default Authorization header.
    // We can override other headers if needed. Here, we just need the token for auth.
    const response = await fetchWithAuth(
      `${REPORTING_ENDPOINT_PREFIX}/seller/sales-trends/csv`,
      token,
      {
        method: 'GET',
        headers: {
          // Only Authorization header is needed from getAuthHeaders.
          // Content-Type for the request is not relevant for a GET.
          // Accept header could be useful if backend provides different formats.
          'Authorization': `Bearer ${token}`,
        }
      }
    );

    const blob = await response.blob();
    if (blob.type === "application/json") {
        // This means the backend likely sent an error JSON instead of a CSV
        const errorJson = JSON.parse(await blob.text());
        console.error("CSV download failed, server sent JSON error:", errorJson);
        throw new Error(errorJson.message || "Failed to download CSV: Server returned an error.");
    }
    return blob;
  } catch (error) {
    console.error("Error in downloadSalesTrendsForSellerCSV API call:", error);
    // Re-throw to be caught by the component for UI error handling
    throw error;
  }
};


// --- Placeholder functions for other reports as per project brief ---

// Inventory Status Report
export interface InventoryStatusDataPointAPI {
  product_id: string;
  product_name: string;
  quantity_on_hand: number;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock'; // Example statuses
  last_updated: string;
}

export const fetchInventoryStatusForSeller = async (_token: string): Promise<InventoryStatusDataPointAPI[]> => {
  console.warn("fetchInventoryStatusForSeller is a placeholder and needs a real backend endpoint. Token not used in placeholder.");
  // Example: const response = await fetchWithAuth(`${REPORTING_ENDPOINT_PREFIX}/seller/inventory-status`, _token);
  // return response.json();
  await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call
  return [
    { product_id: 'prod_1', product_name: 'Handmade Scarf', quantity_on_hand: 10, status: 'In Stock', last_updated: new Date().toISOString() },
    { product_id: 'prod_2', product_name: 'Ceramic Mug', quantity_on_hand: 3, status: 'Low Stock', last_updated: new Date().toISOString() },
  ];
};

export const downloadInventoryStatusForSellerCSV = async (_token: string): Promise<Blob> => {
  console.warn("downloadInventoryStatusForSellerCSV is a placeholder and needs a real backend endpoint. Token not used in placeholder.");
  // Example: const response = await fetchWithAuth(`${REPORTING_ENDPOINT_PREFIX}/seller/inventory-status/csv`, _token, { headers: {'Authorization': `Bearer ${_token}`} });
  // return response.blob();
  await new Promise(resolve => setTimeout(resolve, 500));
  const csvContent = "product_id,product_name,quantity_on_hand,status,last_updated\nprod_1,Handmade Scarf,10,In Stock,N/A";
  return new Blob([csvContent], { type: 'text/csv' });
};


// Custom View Report (This will likely need more parameters for 'viewConfig')
export interface CustomViewDataPointAPI {
  // Define structure based on what custom views might entail
  dimension: string;
  metric_value: number;
  details: Record<string, any>;
}

export const fetchCustomViewForSeller = async (_token: string, viewConfig: Record<string, any>): Promise<CustomViewDataPointAPI[]> => {
  console.warn("fetchCustomViewForSeller is a placeholder and needs a real backend endpoint and viewConfig handling. Token not used in placeholder.");
  // Example: const response = await fetchWithAuth(
  //   `${REPORTING_ENDPOINT_PREFIX}/seller/custom-view`,
  //   _token,
  //   { method: 'POST', body: JSON.stringify(viewConfig) } // Assuming config sent in body
  // );
  // return response.json();
  await new Promise(resolve => setTimeout(resolve, 500));
  return [
    { dimension: `Custom Dimension based on: ${JSON.stringify(viewConfig)}`, metric_value: Math.random() * 100, details: { info: 'Placeholder data' } },
  ];
};

export const downloadCustomViewForSellerCSV = async (_token: string, viewConfig: Record<string, any>): Promise<Blob> => {
  console.warn("downloadCustomViewForSellerCSV is a placeholder and needs a real backend endpoint and viewConfig handling. Token not used in placeholder.");
  // Example: As above, likely a POST or GET with query params
  await new Promise(resolve => setTimeout(resolve, 500));
  const csvContent = `dimension,metric_value,details_info\nCustom (config: ${JSON.stringify(viewConfig)}),${Math.random() * 100},Placeholder`;
  return new Blob([csvContent], { type: 'text/csv' });
};