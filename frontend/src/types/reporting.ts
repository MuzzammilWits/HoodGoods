
// For Inventory Status Report
export interface LowStockItem {
  productName: string;
  currentQuantity: number;
  prodId: number;
}

export interface OutOfStockItem {
  productName: string;
  prodId: number;
}

export interface FullInventoryItem {
  prodId: number;
  productName: string;
  quantity: number;
  price: number;
  category: string;
}

export interface StockBreakdown {
  inStockPercent: number;
  lowStockPercent: number;
  outOfStockPercent: number;
  totalProducts: number;
}

export interface InventoryStatusReportData {
  lowStockItems: LowStockItem[];
  outOfStockItems: OutOfStockItem[];
  fullInventory: FullInventoryItem[];
  stockBreakdown: StockBreakdown;
  reportGeneratedAt: string; // Date will be a string from JSON
}

// For Sales Trend Report
export interface SalesData {
  date: string;
  sales: number;
}

export interface SalesReportSummary {
  totalSales: number;
  averageDailySales: number;
  period: string;
  startDate: string;
  endDate: string;
}

export interface SalesReportData {
  salesData: SalesData[];
  summary: SalesReportSummary;
  reportGeneratedAt: string;
}

// Enum for TimePeriod if you want to use it on the frontend for consistency
export enum TimePeriod {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

// TYPES FOR ADMIN PLATFORM METRICS

export interface PlatformMetricPoint { 
  date: string; // e.g., "2023-10-26"
  totalSales: number;
  totalOrders: number; // Ensuring this is required
  // newBuyers?: number; 
  // newSellers?: number; 
}

export interface OverallPlatformMetrics {
  totalSales: number;
  totalOrders: number;
  averageOrderValue: number;
  totalActiveSellers: number;
  totalRegisteredBuyers: number;
}

export interface AdminPlatformMetricsData {
  overallMetrics: OverallPlatformMetrics;
  timeSeriesMetrics?: PlatformMetricPoint[]; // Now active and uses PlatformMetricPoint
  reportGeneratedAt: string;
  periodCovered: {
    period: TimePeriod | 'allTime' | 'custom';
    startDate?: string;
    endDate?: string;
  };
}