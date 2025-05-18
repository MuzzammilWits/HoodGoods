// backend/src/reporting/reporting.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import {
  ReportingController,
  ParsePeriodPipe,
} from './reporting.controller';
import { ReportingService } from './reporting.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import {
  SalesReportDto,
  TimePeriod,
  SalesDataDto,
  SalesReportSummaryDto,
} from './dto/sales-report.dto';
import {
  InventoryStatusResponseDto,
  FullInventoryItemDto,
  LowStockItemDto,
  OutOfStockItemDto,
  StockBreakdownDto,
} from './dto/inventory-status.dto';
import {
  AdminPlatformMetricsResponseDto,
  OverallPlatformMetricsDto,
  PlatformMetricPointDto,
} from './dto/admin-platform-metrics.dto';
import {
  ArgumentMetadata,
  BadRequestException,
  DefaultValuePipe,
  ParseEnumPipe,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

// --- Mock DTO Factories ---
const mockSalesDataDto = (
  props: Partial<SalesDataDto> = {},
): SalesDataDto => ({
  date: props.date || new Date().toISOString().split('T')[0],
  sales: props.sales || Math.random() * 1000,
});

const mockSalesReportSummaryDto = (
  props: Partial<SalesReportSummaryDto> = {},
): SalesReportSummaryDto => ({
  totalSales: props.totalSales || Math.random() * 10000,
  averageDailySales: props.averageDailySales || Math.random() * 500,
  period: props.period || TimePeriod.WEEKLY,
  startDate:
    props.startDate ||
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0],
  endDate: props.endDate || new Date().toISOString().split('T')[0],
});

const mockSalesReportDto = (
  props: Partial<SalesReportDto> = {},
): SalesReportDto => ({
  salesData: props.salesData || [mockSalesDataDto()],
  summary: props.summary || mockSalesReportSummaryDto(),
  reportGeneratedAt: props.reportGeneratedAt || new Date(),
});

const mockFullInventoryItemDto = (
  props: Partial<FullInventoryItemDto> = {},
): FullInventoryItemDto => ({
  prodId: props.prodId || Math.floor(Math.random() * 1000),
  productName: props.productName || `Product ${Math.random().toString(36).substring(7)}`,
  quantity: props.quantity === undefined ? Math.floor(Math.random() * 100) : props.quantity,
  price: props.price || parseFloat((Math.random() * 100).toFixed(2)),
  category: props.category || `Category ${Math.random().toString(36).substring(2, 5)}`,
});

const mockLowStockItemDto = (
  props: Partial<LowStockItemDto> = {},
): LowStockItemDto => ({
  prodId: props.prodId || Math.floor(Math.random() * 1000),
  productName: props.productName || `Low Stock Product ${Math.random().toString(36).substring(7)}`,
  currentQuantity: props.currentQuantity || Math.floor(Math.random() * 5) + 1,
});

const mockOutOfStockItemDto = (
  props: Partial<OutOfStockItemDto> = {},
): OutOfStockItemDto => ({
  prodId: props.prodId || Math.floor(Math.random() * 1000),
  productName: props.productName || `Out of Stock Product ${Math.random().toString(36).substring(7)}`,
});

const mockStockBreakdownDto = (
  props: Partial<StockBreakdownDto> = {},
): StockBreakdownDto => ({
  inStockPercent: props.inStockPercent || 70,
  lowStockPercent: props.lowStockPercent || 20,
  outOfStockPercent: props.outOfStockPercent || 10,
  totalProducts: props.totalProducts || 100,
});

const mockInventoryStatusResponseDto = (
  props: Partial<InventoryStatusResponseDto> = {},
): InventoryStatusResponseDto => ({
  lowStockItems: props.lowStockItems || [mockLowStockItemDto()],
  outOfStockItems: props.outOfStockItems || [mockOutOfStockItemDto()],
  fullInventory: props.fullInventory || [mockFullInventoryItemDto()],
  stockBreakdown: props.stockBreakdown || mockStockBreakdownDto(),
  reportGeneratedAt: props.reportGeneratedAt || new Date(),
});

const mockPlatformMetricPointDto = (
  props: Partial<PlatformMetricPointDto> = {},
): PlatformMetricPointDto => ({
  date: props.date || new Date().toISOString().split('T')[0],
  totalSales: props.totalSales || Math.random() * 1000,
  totalOrders: props.totalOrders || Math.floor(Math.random() * 100),
});

const mockOverallPlatformMetricsDto = (
  props: Partial<OverallPlatformMetricsDto> = {},
): OverallPlatformMetricsDto => ({
  totalSales: props.totalSales || Math.random() * 100000,
  totalOrders: props.totalOrders || Math.floor(Math.random() * 1000),
  averageOrderValue: props.averageOrderValue || Math.random() * 100,
  totalActiveSellers: props.totalActiveSellers || Math.floor(Math.random() * 50),
  totalRegisteredBuyers: props.totalRegisteredBuyers || Math.floor(Math.random() * 200),
});

const mockAdminPlatformMetricsResponseDto = (
  props: Partial<AdminPlatformMetricsResponseDto> = {},
): AdminPlatformMetricsResponseDto => ({
  overallMetrics: props.overallMetrics || mockOverallPlatformMetricsDto(),
  timeSeriesMetrics: props.timeSeriesMetrics || [mockPlatformMetricPointDto()],
  reportGeneratedAt: props.reportGeneratedAt || new Date(),
  periodCovered: props.periodCovered || {
    period: 'allTime',
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  },
});

// --- Test Suite ---
describe('ReportingController', () => {
  let controller: ReportingController;
  let service: ReportingService;
  let mockRequest: any;

  const mockReportingService = {
    getInventoryStatus: jest.fn(),
    getSalesTrends: jest.fn(),
    generateCSVData: jest.fn(), // Assuming this is part of ReportingService
    getAdminPlatformMetrics: jest.fn(),
  };

  const mockJwtAuthGuard = { canActivate: jest.fn(() => true) };
  const mockRolesGuard = { canActivate: jest.fn(() => true) };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportingController],
      providers: [
        { provide: ReportingService, useValue: mockReportingService },
        Reflector, // RolesGuard often depends on Reflector
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockRolesGuard)
      .compile();

    controller = module.get<ReportingController>(ReportingController);
    service = module.get<ReportingService>(ReportingService);

    mockRequest = {
      user: { sub: 'seller-user-id-123' }, // Mock user ID for seller routes
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // --- Test ParsePeriodPipe ---
  describe('ParsePeriodPipe', () => {
    const pipe = new ParsePeriodPipe();
    const metadata: ArgumentMetadata = { type: 'query', data: 'period' };

    it('should return "allTime" for "allTime" string', () => {
      expect(pipe.transform('allTime', metadata)).toBe('allTime');
    });
    it('should return valid TimePeriod enum values', () => {
      expect(pipe.transform('daily', metadata)).toBe(TimePeriod.DAILY);
      expect(pipe.transform('weekly', metadata)).toBe(TimePeriod.WEEKLY);
    });
    it('should pass through other values (as per current pipe logic)', () => {
      expect(pipe.transform('customValue', metadata)).toBe('customValue');
    });
  });

  // --- Test formatCsvCell (if it's not default export, you might need to export it from controller or test differently) ---
  // This is a utility, testing it directly can be useful.
  // If it's not exported, its behavior is tested implicitly via CSV generation tests.
  // describe('formatCsvCell', () => {
  //   it('should handle null and undefined', () => {
  //     expect(formatCsvCell(null)).toBe('');
  //     expect(formatCsvCell(undefined)).toBe('');
  //   });
  //   it('should return stringified value for simple types', () => {
  //     expect(formatCsvCell(123)).toBe('123');
  //     expect(formatCsvCell('hello')).toBe('hello');
  //   });
  //   it('should quote strings with commas', () => {
  //     expect(formatCsvCell('hello, world')).toBe('"hello, world"');
  //   });
  //   it('should quote strings with double quotes and escape them', () => {
  //     expect(formatCsvCell('hello "world"')).toBe('"hello ""world"""');
  //   });
  //   it('should quote strings with newlines', () => {
  //     expect(formatCsvCell('hello\nworld')).toBe('"hello\nworld"');
  //   });
  // });


  // --- Seller Specific Reports ---
  describe('getInventoryStatusReport', () => {
    it('should call service and return inventory status', async () => {
      const mockResponse = mockInventoryStatusResponseDto();
      mockReportingService.getInventoryStatus.mockResolvedValue(mockResponse);

      const result = await controller.getInventoryStatusReport(mockRequest);

      expect(service.getInventoryStatus).toHaveBeenCalledWith(mockRequest.user.sub);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getInventoryStatusCsv', () => {
    it('should generate and return inventory status CSV', async () => {
      const inventoryData = mockInventoryStatusResponseDto({
        fullInventory: [
          mockFullInventoryItemDto({ prodId: 1, productName: 'Laptop', category: 'Electronics', price: 1200, quantity: 10 }),
        ],
        lowStockItems: [
          mockLowStockItemDto({ prodId: 2, productName: 'Mouse', currentQuantity: 3 }),
        ],
        outOfStockItems: [
          mockOutOfStockItemDto({ prodId: 3, productName: 'Keyboard' }),
        ],
        stockBreakdown: mockStockBreakdownDto({ totalProducts: 3, inStockPercent: 33.33, lowStockPercent: 33.33, outOfStockPercent: 33.33 }),
        reportGeneratedAt: new Date('2023-10-27T10:00:00.000Z'),
      });
       // Add category and price to low stock item for full details lookup if needed
      inventoryData.fullInventory.push(mockFullInventoryItemDto({prodId: 2, productName: 'Mouse', category: 'Accessory', price: 25, quantity: 3}));
      inventoryData.fullInventory.push(mockFullInventoryItemDto({prodId: 3, productName: 'Keyboard', category: 'Accessory', price: 75, quantity: 0}));


      mockReportingService.getInventoryStatus.mockResolvedValue(inventoryData);

      const result = await controller.getInventoryStatusCsv(mockRequest);

      expect(service.getInventoryStatus).toHaveBeenCalledWith(mockRequest.user.sub);

      let expectedCsv = 'Product ID,Product Name,Category,Price,Current Quantity\n';
      expectedCsv += '# Full Inventory\n';
      expectedCsv += '1,Laptop,Electronics,1200,10\n';
      expectedCsv += '2,Mouse,Accessory,25,3\n'; // Added based on fullInventory having item for prodId 2
      expectedCsv += '3,Keyboard,Accessory,75,0\n'; // Added based on fullInventory having item for prodId 3
      expectedCsv += '\n# Low Stock Items\n';
      expectedCsv += '2,Mouse,Accessory,25,3\n';
      expectedCsv += '\n# Out of Stock Items\n';
      expectedCsv += '3,Keyboard,Accessory,75,0\n';
      expectedCsv += '\n# Stock Breakdown\n';
      expectedCsv += 'Total Products,3\n';
      expectedCsv += 'In Stock (%),33.33\n';
      expectedCsv += 'Low Stock (%),33.33\n';
      expectedCsv += 'Out of Stock (%),33.33\n';
      expectedCsv += '\nReport Generated At:,2023-10-27T10:00:00.000Z\n';

      expect(result).toBe(expectedCsv);
    });
  });

  describe('getSalesTrends', () => {
    it('should call service with default period and return sales trends', async () => {
      const mockResponse = mockSalesReportDto();
      mockReportingService.getSalesTrends.mockResolvedValue(mockResponse);

      const result = await controller.getSalesTrends(mockRequest, TimePeriod.WEEKLY, undefined); // Explicitly pass defaults for clarity

      expect(service.getSalesTrends).toHaveBeenCalledWith(mockRequest.user.sub, TimePeriod.WEEKLY, undefined);
      expect(result).toEqual(mockResponse);
    });

    it('should call service with specified period and date', async () => {
      const mockResponse = mockSalesReportDto();
      mockReportingService.getSalesTrends.mockResolvedValue(mockResponse);
      const date = '2023-10-01';

      const result = await controller.getSalesTrends(mockRequest, TimePeriod.MONTHLY, date);

      expect(service.getSalesTrends).toHaveBeenCalledWith(mockRequest.user.sub, TimePeriod.MONTHLY, date);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getSalesTrendsCsv', () => {
    it('should generate and return sales trends CSV', async () => {
      const reportData = mockSalesReportDto({
        salesData: [
          mockSalesDataDto({ date: '2023-10-26', sales: 150 }),
          mockSalesDataDto({ date: '2023-10-27', sales: 200 }),
        ],
        summary: mockSalesReportSummaryDto({
          totalSales: 350,
          averageDailySales: 175,
          period: TimePeriod.DAILY, // For simplicity
          startDate: '2023-10-26',
          endDate: '2023-10-27',
        }),
        reportGeneratedAt: new Date('2023-10-28T12:00:00.000Z'),
      });
      const generatedSalesCsvRows = 'Date,Sales\n2023-10-26,150\n2023-10-27,200\n'; // Mock output from service.generateCSVData
      mockReportingService.getSalesTrends.mockResolvedValue(reportData);
      mockReportingService.generateCSVData.mockReturnValue(generatedSalesCsvRows);


      const result = await controller.getSalesTrendsCsv(mockRequest, TimePeriod.DAILY, undefined);

      expect(service.getSalesTrends).toHaveBeenCalledWith(mockRequest.user.sub, TimePeriod.DAILY, undefined);
      expect(service.generateCSVData).toHaveBeenCalledWith(reportData.salesData, 'Sales Trends');

      let expectedCsv = generatedSalesCsvRows;
      expectedCsv += '\n# Report Summary\n';
      expectedCsv += 'Total Sales,350\n';
      expectedCsv += 'Average Daily Sales,175\n';
      expectedCsv += `Period,${TimePeriod.DAILY}\n`;
      expectedCsv += 'Start Date,2023-10-26\n';
      expectedCsv += 'End Date,2023-10-27\n';
      expectedCsv += 'Report Generated At,2023-10-28T12:00:00.000Z\n';

      expect(result).toBe(expectedCsv);
    });
  });

  // --- Admin Specific Reports ---
  describe('getAdminPlatformMetrics', () => {
    it('should call service with default period ("allTime") and return metrics', async () => {
      const mockResponse = mockAdminPlatformMetricsResponseDto();
      mockReportingService.getAdminPlatformMetrics.mockResolvedValue(mockResponse);
      // For this test, the ParsePeriodPipe will transform undefined to 'allTime'
      // The controller then sets effectivePeriod = period || 'allTime';
      // So if period is undefined from query, ParsePeriodPipe makes it 'allTime', controller keeps it 'allTime'
      const result = await controller.getAdminPlatformMetrics(undefined, undefined, undefined);

      expect(service.getAdminPlatformMetrics).toHaveBeenCalledWith('allTime', undefined, undefined);
      expect(result).toEqual(mockResponse);
    });

    it('should call service with specified period, startDate, and endDate', async () => {
      const mockResponse = mockAdminPlatformMetricsResponseDto();
      mockReportingService.getAdminPlatformMetrics.mockResolvedValue(mockResponse);
      const period = TimePeriod.MONTHLY;
      const startDate = '2023-09-01';
      const endDate = '2023-09-30';

      const result = await controller.getAdminPlatformMetrics(period, startDate, endDate);

      expect(service.getAdminPlatformMetrics).toHaveBeenCalledWith(period, startDate, endDate);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getAdminPlatformMetricsCsv', () => {


     it('should handle optional startDate and endDate in CSV', async () => {
      const reportData = mockAdminPlatformMetricsResponseDto({
        overallMetrics: mockOverallPlatformMetricsDto({
          totalSales: 60000, totalOrders: 600, averageOrderValue: 100,
          totalActiveSellers: 30, totalRegisteredBuyers: 180,
        }),
        periodCovered: {
          period: 'allTime',
          // No startDate or endDate
        },
        reportGeneratedAt: new Date('2023-03-01T00:00:00.000Z'),
        timeSeriesMetrics: [],
      });
      mockReportingService.getAdminPlatformMetrics.mockResolvedValue(reportData);

      // period comes from ParsePeriodPipe. If undefined, it becomes 'allTime'
      // effectivePeriod in controller then is 'allTime'
      const result = await controller.getAdminPlatformMetricsCsv(undefined, undefined, undefined);
      expect(service.getAdminPlatformMetrics).toHaveBeenCalledWith('allTime', undefined, undefined);

      let expectedCsv = '# Platform Overall Metrics\n';
      expectedCsv += 'Total Sales,60000\n';
      expectedCsv += 'Total Orders,600\n';
      expectedCsv += 'Average Order Value,100\n';
      expectedCsv += 'Total Active Sellers,30\n';
      expectedCsv += 'Total Registered Buyers,180\n';
      expectedCsv += '\n# Report Details\n';
      expectedCsv += 'Period Covered,allTime\n';
      // No Start Date or End Date lines
      expectedCsv += 'Report Generated At,2023-03-01T00:00:00.000Z\n';

      expect(result).toBe(expectedCsv);
    });
  });
});