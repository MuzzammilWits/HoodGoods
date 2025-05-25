import { describe, it, expect } from 'vitest';
import type {
  LowStockItem,
  OutOfStockItem,
  FullInventoryItem,
  StockBreakdown,
  InventoryStatusReportData,
  SalesData,
  SalesReportSummary,
  SalesReportData,
  PlatformMetricPoint,
  OverallPlatformMetrics,
  AdminPlatformMetricsData,
} from './reporting'; 
import { TimePeriod } from './reporting';

describe('Inventory Status Report Interfaces', () => {
  it('LowStockItem structure can be satisfied', () => {
    const mockItem: LowStockItem = {
      productName: 'Fading Widget',
      currentQuantity: 3,
      prodId: 101,
    };
    expect(mockItem.productName).toBe('Fading Widget');
    expect(mockItem.currentQuantity).toBe(3);
    expect(mockItem.prodId).toBe(101);
  });

  it('OutOfStockItem structure can be satisfied', () => {
    const mockItem: OutOfStockItem = {
      productName: 'Sold Out Gadget',
      prodId: 202,
    };
    expect(mockItem.productName).toBe('Sold Out Gadget');
    expect(mockItem.prodId).toBe(202);
  });

  it('FullInventoryItem structure can be satisfied', () => {
    const mockItem: FullInventoryItem = {
      prodId: 303,
      productName: 'Abundant Gizmo',
      quantity: 150,
      price: 25.99,
      category: 'Electronics',
    };
    expect(mockItem.prodId).toBe(303);
    expect(mockItem.productName).toBe('Abundant Gizmo');
    expect(mockItem.quantity).toBe(150);
    expect(mockItem.price).toBe(25.99);
    expect(mockItem.category).toBe('Electronics');
  });

  it('StockBreakdown structure can be satisfied', () => {
    const mockBreakdown: StockBreakdown = {
      inStockPercent: 70.5,
      lowStockPercent: 15.2,
      outOfStockPercent: 14.3,
      totalProducts: 1000,
    };
    expect(mockBreakdown.inStockPercent).toBe(70.5);
    expect(mockBreakdown.lowStockPercent).toBe(15.2);
    expect(mockBreakdown.outOfStockPercent).toBe(14.3);
    expect(mockBreakdown.totalProducts).toBe(1000);
  });

  it('InventoryStatusReportData structure can be satisfied', () => {
    const mockReport: InventoryStatusReportData = {
      lowStockItems: [{ productName: 'Low Item', currentQuantity: 2, prodId: 1 }],
      outOfStockItems: [{ productName: 'Out Item', prodId: 2 }],
      fullInventory: [{ prodId: 3, productName: 'Full Item', quantity: 50, price: 10, category: 'Test' }],
      stockBreakdown: { inStockPercent: 80, lowStockPercent: 10, outOfStockPercent: 10, totalProducts: 100 },
      reportGeneratedAt: new Date().toISOString(),
    };
    expect(mockReport.lowStockItems.length).toBe(1);
    expect(mockReport.outOfStockItems.length).toBe(1);
    expect(mockReport.fullInventory.length).toBe(1);
    expect(typeof mockReport.reportGeneratedAt).toBe('string');
  });
});

describe('Sales Trend Report Interfaces', () => {
  it('SalesData structure can be satisfied', () => {
    const mockData: SalesData = {
      date: '2023-10-01',
      sales: 1500.75,
    };
    expect(mockData.date).toBe('2023-10-01');
    expect(mockData.sales).toBe(1500.75);
  });

  it('SalesReportSummary structure can be satisfied', () => {
    const mockSummary: SalesReportSummary = {
      totalSales: 125000.50,
      averageDailySales: 4166.68,
      period: 'monthly',
      startDate: '2023-10-01',
      endDate: '2023-10-31',
    };
    expect(mockSummary.totalSales).toBe(125000.50);
    expect(mockSummary.averageDailySales).toBe(4166.68);
    expect(mockSummary.period).toBe('monthly');
  });

  it('SalesReportData structure can be satisfied', () => {
    const mockReport: SalesReportData = {
      salesData: [{ date: '2023-10-01', sales: 100 }],
      summary: {
        totalSales: 100, averageDailySales: 100, period: 'daily',
        startDate: '2023-10-01', endDate: '2023-10-01',
      },
      reportGeneratedAt: new Date().toISOString(),
    };
    expect(mockReport.salesData.length).toBe(1);
    expect(typeof mockReport.summary.totalSales).toBe('number');
    expect(typeof mockReport.reportGeneratedAt).toBe('string');
  });
});

describe('TimePeriod Enum', () => {
  it('should be defined', () => {
    expect(TimePeriod).toBeDefined();
  });

  it('should have correct string values for its members', () => {
    expect(TimePeriod.DAILY).toBe('daily');
    expect(TimePeriod.WEEKLY).toBe('weekly');
    expect(TimePeriod.MONTHLY).toBe('monthly');
    expect(TimePeriod.YEARLY).toBe('yearly');
  });

  it('all members should be strings', () => {
    Object.values(TimePeriod).forEach(value => {
      expect(typeof value).toBe('string');
    });
  });

  it('should have the expected number of members', () => {
    expect(Object.keys(TimePeriod).length).toBe(4);
  });
});

describe('Admin Platform Metrics Interfaces', () => {
  it('PlatformMetricPoint structure can be satisfied (with optional fields)', () => {
    const mockPoint: PlatformMetricPoint = {
      date: '2023-10-26',
      totalSales: 5230.90,
      totalOrders: 75,
      // newBuyers: 10, // Example if optional field is present
      // newSellers: 2,  // Example if optional field is present
    };
    expect(mockPoint.date).toBe('2023-10-26');
    expect(mockPoint.totalSales).toBe(5230.90);
    expect(mockPoint.totalOrders).toBe(75);
    // expect(mockPoint.newBuyers).toBe(10);
    // expect(mockPoint.newSellers).toBe(2);
  });

  it('PlatformMetricPoint structure can be satisfied (required fields only)', () => {
    const mockPointRequired: PlatformMetricPoint = {
      date: '2023-10-27',
      totalSales: 6000.00,
      totalOrders: 80,
    };
    expect(mockPointRequired.date).toBe('2023-10-27');
    expect(mockPointRequired.totalSales).toBe(6000.00);
    expect(mockPointRequired.totalOrders).toBe(80);
    // @ts-expect-error - Testing access to a potential optional field that is not set
    expect(mockPointRequired.newBuyers).toBeUndefined();
  });


  it('OverallPlatformMetrics structure can be satisfied', () => {
    const mockMetrics: OverallPlatformMetrics = {
      totalSales: 120500.75,
      totalOrders: 1500,
      averageOrderValue: 80.33,
      totalActiveSellers: 250,
      totalRegisteredBuyers: 5000,
    };
    expect(mockMetrics.totalSales).toBe(120500.75);
    expect(mockMetrics.totalOrders).toBe(1500);
    expect(mockMetrics.averageOrderValue).toBe(80.33);
  });

  it('AdminPlatformMetricsData structure can be satisfied (with timeSeriesMetrics)', () => {
    const mockData: AdminPlatformMetricsData = {
      overallMetrics: {
        totalSales: 10000, totalOrders: 100, averageOrderValue: 100,
        totalActiveSellers: 10, totalRegisteredBuyers: 50,
      },
      timeSeriesMetrics: [
        { date: '2023-01-01', totalSales: 100, totalOrders: 1 },
      ],
      reportGeneratedAt: new Date().toISOString(),
      periodCovered: {
        period: TimePeriod.MONTHLY, // Using the enum
        startDate: '2023-01-01',
        endDate: '2023-01-31',
      },
    };
    expect(mockData.overallMetrics.totalSales).toBe(10000);
    expect(mockData.timeSeriesMetrics?.length).toBe(1);
    expect(mockData.periodCovered.period).toBe('monthly');
  });

  it('AdminPlatformMetricsData structure can be satisfied (timeSeriesMetrics optional and omitted)', () => {
    const mockData: AdminPlatformMetricsData = {
      overallMetrics: {
        totalSales: 20000, totalOrders: 200, averageOrderValue: 100,
        totalActiveSellers: 20, totalRegisteredBuyers: 100,
      },
      // timeSeriesMetrics is omitted
      reportGeneratedAt: new Date().toISOString(),
      periodCovered: {
        period: 'allTime', // Using a literal string type
      },
    };
    expect(mockData.overallMetrics.totalSales).toBe(20000);
    expect(mockData.timeSeriesMetrics).toBeUndefined();
    expect(mockData.periodCovered.period).toBe('allTime');
    expect(mockData.periodCovered.startDate).toBeUndefined();
  });

   it('AdminPlatformMetricsData periodCovered can handle "custom" period', () => {
    const mockData: AdminPlatformMetricsData = {
      overallMetrics: { /* ... */ } as OverallPlatformMetrics, // Cast for brevity
      reportGeneratedAt: new Date().toISOString(),
      periodCovered: {
        period: 'custom',
        startDate: '2023-03-15',
        endDate: '2023-04-15',
      },
    };
    expect(mockData.periodCovered.period).toBe('custom');
    expect(mockData.periodCovered.startDate).toBe('2023-03-15');
    expect(mockData.periodCovered.endDate).toBe('2023-04-15');
  });
});
