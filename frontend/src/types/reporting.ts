// frontend/src/types/reporting.ts

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

// You might already have these from SalesTrendReport or can consolidate
export interface SalesData {
  date: string;
  sales: number;
}

export interface SalesReportSummary {
  totalSales: number;
  averageDailySales: number;
  period: string; // Or an enum if you define TimePeriod on frontend
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