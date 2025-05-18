// backend/src/reporting/reporting.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, Between, Brackets, ObjectLiteral } from 'typeorm';
import { ReportingService } from './reporting.service';
import { Store } from '../store/entities/store.entity';
import { Product } from '../products/entities/product.entity';
import { SellerOrder } from '../orders/entities/seller-order.entity';
import { SellerOrderItem } from '../orders/entities/seller-order-item.entity';
import { Order } from '../orders/entities/order.entity';
import { User } from '../auth/user.entity';
import {
  SalesDataDto,
  SalesReportDto,
  TimePeriod,
  SalesReportSummaryDto,
} from './dto/sales-report.dto';
import {
  InventoryStatusResponseDto,
  LowStockItemDto,
  OutOfStockItemDto,
  FullInventoryItemDto,
  StockBreakdownDto,
} from './dto/inventory-status.dto';
import {
  AdminPlatformMetricsResponseDto,
  OverallPlatformMetricsDto,
  PlatformMetricPointDto,
} from './dto/admin-platform-metrics.dto';
import {
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';

// --- Mock Repository Types ---
type MockRepository<T extends ObjectLiteral = any> = Partial<
  Record<keyof Repository<T>, jest.Mock>
>;

// --- Create Mock Repositories ---
const createMockRepository = <T extends ObjectLiteral = any>(): MockRepository<T> => ({
  findOne: jest.fn(),
  find: jest.fn(),
  sum: jest.fn(),
  count: jest.fn(),
  createQueryBuilder: jest.fn(),
});

// --- Mock DTO Factories ---
const mockSalesDataDto = (
  props: Partial<SalesDataDto> = {},
): SalesDataDto => ({
  date: props.date || new Date().toISOString().split('T')[0],
  sales: props.sales !== undefined ? props.sales : Math.random() * 1000,
});

const mockSalesReportSummaryDto = (
  props: Partial<SalesReportSummaryDto> = {},
): SalesReportSummaryDto => ({
  totalSales:
    props.totalSales !== undefined
      ? props.totalSales
      : Math.random() * 10000,
  averageDailySales:
    props.averageDailySales !== undefined
      ? props.averageDailySales
      : Math.random() * 500,
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
  productName:
    props.productName || `Product ${Math.random().toString(36).substring(7)}`,
  quantity:
    props.quantity === undefined
      ? Math.floor(Math.random() * 100)
      : props.quantity,
  price: props.price || parseFloat((Math.random() * 100).toFixed(2)),
  category:
    props.category || `Category ${Math.random().toString(36).substring(2, 5)}`,
});

const mockLowStockItemDto = (
  props: Partial<LowStockItemDto> = {},
): LowStockItemDto => ({
  prodId: props.prodId ?? Math.floor(Math.random() * 1000),
  productName:
    props.productName ??
    `Low Stock Product ${Math.random().toString(36).substring(7)}`,
  currentQuantity: props.currentQuantity ?? Math.floor(Math.random() * 4) + 1, // Ensures it's < 5
});

const mockOutOfStockItemDto = (
  props: Partial<OutOfStockItemDto> = {},
): OutOfStockItemDto => ({
  prodId: props.prodId ?? Math.floor(Math.random() * 1000),
  productName:
    props.productName ??
    `Out of Stock Product ${Math.random().toString(36).substring(7)}`,
});

const mockStockBreakdownDto = (
  props: Partial<StockBreakdownDto> = {},
): StockBreakdownDto => ({
  inStockPercent: props.inStockPercent ?? 70,
  lowStockPercent: props.lowStockPercent ?? 20,
  outOfStockPercent: props.outOfStockPercent ?? 10,
  totalProducts: props.totalProducts ?? 100,
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
  totalSales:
    props.totalSales !== undefined ? props.totalSales : Math.random() * 1000,
  totalOrders:
    props.totalOrders !== undefined
      ? props.totalOrders
      : Math.floor(Math.random() * 100),
});

const mockOverallPlatformMetricsDto = (
  props: Partial<OverallPlatformMetricsDto> = {},
): OverallPlatformMetricsDto => ({
  totalSales:
    props.totalSales !== undefined ? props.totalSales : Math.random() * 100000,
  totalOrders:
    props.totalOrders !== undefined
      ? props.totalOrders
      : Math.floor(Math.random() * 1000),
  averageOrderValue:
    props.averageOrderValue !== undefined
      ? props.averageOrderValue
      : Math.random() * 100,
  totalActiveSellers:
    props.totalActiveSellers !== undefined
      ? props.totalActiveSellers
      : Math.floor(Math.random() * 50),
  totalRegisteredBuyers:
    props.totalRegisteredBuyers !== undefined
      ? props.totalRegisteredBuyers
      : Math.floor(Math.random() * 200),
});

const mockAdminPlatformMetricsResponseDto = (
  props: Partial<AdminPlatformMetricsResponseDto> = {},
): AdminPlatformMetricsResponseDto => ({
  overallMetrics: props.overallMetrics || mockOverallPlatformMetricsDto(),
  timeSeriesMetrics: props.timeSeriesMetrics || [mockPlatformMetricPointDto()],
  reportGeneratedAt: props.reportGeneratedAt || new Date(),
  periodCovered: props.periodCovered || {
    period: 'allTime',
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  },
});


// Helper to reset date mocks
const resetDateMock = () => {
  jest.useRealTimers();
};
// Helper to set a fixed date for tests
const setDateMock = (mockDate: Date) => {
  jest.useFakeTimers().setSystemTime(mockDate);
};

describe('ReportingService', () => {
  let service: ReportingService;
  let storeRepository: MockRepository<Store>;
  let productRepository: MockRepository<Product>;
  // let sellerOrderRepository: MockRepository<SellerOrder>; // Not directly used in most service methods for now
  // let sellerOrderItemRepository: MockRepository<SellerOrderItem>; // Not directly used
  let orderRepository: MockRepository<Order>;
  let userRepository: MockRepository<User>;

  const mockQueryBuilder = {
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn(),
    getRawOne: jest.fn(),
    getCount: jest.fn(),
    setParameters: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
  };

  beforeEach(async () => {
    Object.values(mockQueryBuilder).forEach(mockFn => {
      if (jest.isMockFunction(mockFn)) {
        mockFn.mockClear();
      }
    });
    mockQueryBuilder.getRawMany.mockResolvedValue([]);
    mockQueryBuilder.getRawOne.mockResolvedValue(null);
    mockQueryBuilder.getCount.mockResolvedValue(0);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportingService,
        { provide: getRepositoryToken(Store), useValue: createMockRepository<Store>() },
        { provide: getRepositoryToken(Product), useValue: createMockRepository<Product>() },
        { provide: getRepositoryToken(SellerOrder), useValue: createMockRepository<SellerOrder>() },
        { provide: getRepositoryToken(SellerOrderItem), useValue: createMockRepository<SellerOrderItem>() },
        {
          provide: getRepositoryToken(Order),
          useValue: {
            ...createMockRepository<Order>(),
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
            sum: jest.fn(),
            count: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            ...createMockRepository<User>(),
            count: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ReportingService>(ReportingService);
    storeRepository = module.get(getRepositoryToken(Store));
    productRepository = module.get(getRepositoryToken(Product));
    // sellerOrderRepository = module.get(getRepositoryToken(SellerOrder));
    // sellerOrderItemRepository = module.get(getRepositoryToken(SellerOrderItem));
    orderRepository = module.get(getRepositoryToken(Order));
    userRepository = module.get(getRepositoryToken(User));

    (orderRepository.createQueryBuilder as jest.Mock).mockReturnValue(mockQueryBuilder);
    (userRepository.count as jest.Mock).mockResolvedValue(0);
    (orderRepository.sum as jest.Mock).mockResolvedValue(0);
    (orderRepository.count as jest.Mock).mockResolvedValue(0);
    (orderRepository.find as jest.Mock).mockResolvedValue([]);


    jest.spyOn(service['logger'], 'log').mockImplementation(() => {});
    jest.spyOn(service['logger'], 'warn').mockImplementation(() => {});
    jest.spyOn(service['logger'], 'error').mockImplementation(() => {});
    jest.spyOn(service['logger'], 'debug').mockImplementation(() => {});

    resetDateMock();
  });

  afterEach(() => {
    jest.clearAllMocks();
    resetDateMock();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getStoreIdForSeller', () => {
    const auth0UserId = 'auth0|testuser1';
    it('should return storeId if store is found', async () => {
      const mockStore = { storeId: 'store-123', userId: auth0UserId } as Store; // Cast for type safety
      storeRepository.findOne!.mockResolvedValue(mockStore);
      await expect(service.getStoreIdForSeller(auth0UserId)).resolves.toBe('store-123');
      expect(storeRepository.findOne).toHaveBeenCalledWith({ where: { userId: auth0UserId } });
    });

    it('should throw NotFoundException if store is not found', async () => {
      storeRepository.findOne!.mockResolvedValue(null);
      await expect(service.getStoreIdForSeller(auth0UserId)).rejects.toThrow(NotFoundException);
    });

    it('should throw InternalServerErrorException on repository error', async () => {
      storeRepository.findOne!.mockRejectedValue(new Error('DB Error'));
      await expect(service.getStoreIdForSeller(auth0UserId)).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('getInventoryStatus', () => {
    const auth0UserId = 'auth0|seller1';
    const storeId = 'store-abc';
    const mockDate = new Date('2024-05-15T10:00:00.000Z');

    beforeEach(() => {
      setDateMock(mockDate);
      jest.spyOn(service, 'getStoreIdForSeller').mockResolvedValue(storeId);
    });

    afterEach(() => {
      resetDateMock();
    });

    it('should return empty report if no products found', async () => {
      productRepository.find!.mockResolvedValue([]);
      const expectedResponse: InventoryStatusResponseDto = {
        lowStockItems: [],
        outOfStockItems: [],
        fullInventory: [],
        stockBreakdown: {
          inStockPercent: 0,
          lowStockPercent: 0,
          outOfStockPercent: 0,
          totalProducts: 0,
        },
        reportGeneratedAt: mockDate,
      };
      const result = await service.getInventoryStatus(auth0UserId);
      expect(result).toEqual(expectedResponse);
      expect(productRepository.find).toHaveBeenCalledWith({ where: { storeId, isActive: true } });
    });



    it('should throw InternalServerErrorException if productRepository.find fails', async () => {
      productRepository.find!.mockRejectedValue(new Error('DB Error'));
      await expect(service.getInventoryStatus(auth0UserId)).rejects.toThrow(InternalServerErrorException);
    });

    it('should propagate NotFoundException from getStoreIdForSeller', async () => {
      (service.getStoreIdForSeller as jest.Mock).mockRejectedValue(new NotFoundException('Store not found'));
      await expect(service.getInventoryStatus(auth0UserId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getSalesTrends', () => {
    const auth0UserId = 'auth0|seller2';
    const storeId = 'store-def';
    const mockReportDate = new Date('2024-05-15T12:00:00.000Z');

    beforeEach(() => {
      setDateMock(mockReportDate);
      jest.spyOn(service, 'getStoreIdForSeller').mockResolvedValue(storeId);
      mockQueryBuilder.getRawMany.mockReset();
    });
    afterEach(resetDateMock);

    it('should calculate sales trends correctly for a given period', async () => {
      const rawSalesData = [
        { orderDate: '2024-05-13T00:00:00.000Z', dailySales: '150.75' },
        { orderDate: '2024-05-14T00:00:00.000Z', dailySales: '200.50' },
      ];
      mockQueryBuilder.getRawMany.mockResolvedValue(rawSalesData);
      // For this test, we let calculateDateRange run. If it's a weekly report for 2024-05-15 (Wednesday):
      // Week starts Monday 2024-05-13, ends Sunday 2024-05-19 (exclusive end for query is 2024-05-20)
      const result = await service.getSalesTrends(auth0UserId, TimePeriod.WEEKLY, '2024-05-15');

      expect(service.getStoreIdForSeller).toHaveBeenCalledWith(auth0UserId);
      expect(orderRepository.createQueryBuilder).toHaveBeenCalled();
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('product.storeId = :storeId', { storeId });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('order.orderDate >= :startDate', { startDate: new Date(Date.UTC(2024, 4, 13)) });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('order.orderDate < :endDate', { endDate: new Date(Date.UTC(2024, 4, 20)) });

      expect(result.salesData).toEqual([
        { date: '2024-05-13', sales: 150.75 },
        { date: '2024-05-14', sales: 200.50 },
      ]);
      expect(result.summary.totalSales).toBe(351.25);
      expect(result.summary.averageDailySales).toBe(175.63); // 351.25 / 2
      expect(result.summary.period).toBe(TimePeriod.WEEKLY);
      expect(result.summary.startDate).toBe('2024-05-13');
      expect(result.summary.endDate).toBe('2024-05-19'); // Display end date
      expect(result.reportGeneratedAt).toEqual(mockReportDate);
    });
    // ... other getSalesTrends tests from previous response
        it('should return empty sales data and zero summary if no orders found', async () => {
        mockQueryBuilder.getRawMany.mockResolvedValue([]);
        const result = await service.getSalesTrends(auth0UserId, TimePeriod.DAILY, '2024-05-10');

        expect(result.salesData).toEqual([]);
        expect(result.summary.totalSales).toBe(0);
        expect(result.summary.averageDailySales).toBe(0);
        expect(result.summary.startDate).toBe('2024-05-10'); // from calculateDateRange
        expect(result.summary.endDate).toBe('2024-05-10'); // Display end date for daily is same as start
    });

    it('should throw InternalServerErrorException on query builder error', async () => {
        mockQueryBuilder.getRawMany.mockRejectedValue(new Error('DB Query Failed'));
        await expect(service.getSalesTrends(auth0UserId, TimePeriod.MONTHLY)).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('getAdminPlatformMetrics', () => {
    const mockReportDate = new Date('2024-06-01T00:00:00.000Z');

    beforeEach(() => {
      setDateMock(mockReportDate);
      (orderRepository.sum as jest.Mock).mockResolvedValue(10000);
      (orderRepository.count as jest.Mock).mockResolvedValue(100);
      (userRepository.count as jest.Mock).mockImplementation(({ where }) => {
        if (where.role === 'seller') return Promise.resolve(10);
        if (where.role === 'buyer') return Promise.resolve(50);
        return Promise.resolve(0);
      });
      mockQueryBuilder.getRawMany.mockResolvedValue([]);
      (orderRepository.find as jest.Mock).mockResolvedValue([]);
      // Do NOT mock calculateDateRange by default here, let it run its course
      // unless a specific test case needs to control its output very precisely.
      // If calculateDateRange is spied on, it must be restored or re-mocked per test.
      // jest.restoreAllMocks() in afterEach can also help.
    });

    afterEach(() => {
        resetDateMock();
        jest.restoreAllMocks(); // Important to restore spies on internal methods like calculateDateRange
    });

    it('should fetch metrics for "allTime", determining date range from orders', async () => {
      (orderRepository.find as jest.Mock)
        .mockImplementation(({ order }) => {
          if (order && order.orderDate === 'ASC') return Promise.resolve([{ orderDate: new Date('2023-01-01T10:00:00Z')} as Order]);
          if (order && order.orderDate === 'DESC') return Promise.resolve([{ orderDate: new Date('2023-12-31T10:00:00Z')} as Order]);
          return Promise.resolve([]);
        });

      const result = await service.getAdminPlatformMetrics('allTime');

      expect(orderRepository.sum).toHaveBeenCalledWith('grandTotal', undefined); // No date condition for sum
      expect(orderRepository.count).toHaveBeenCalledWith({where: undefined}); // No date condition for count
      expect(userRepository.count).toHaveBeenCalledWith({ where: { role: 'seller' } });
      expect(userRepository.count).toHaveBeenCalledWith({ where: { role: 'buyer' } });
      expect(result.overallMetrics.totalSales).toBe(10000);
      expect(result.periodCovered.period).toBe('allTime');
      expect(result.periodCovered.startDate).toBe('2023-01-01');
      expect(result.periodCovered.endDate).toBe('2023-12-31');
      expect(result.reportGeneratedAt).toEqual(mockReportDate);
    });

    it('should fetch metrics for a specific TimePeriod (DAILY) with customStartDateStr', async () => {
      const customDate = '2024-03-15';
      // Let calculateDateRange determine the actual query dates
      // Expected for DAILY, '2024-03-15':
      const queryStartDate = new Date(Date.UTC(2024, 2, 15)); // March 15
      const queryEndDate = new Date(Date.UTC(2024, 2, 16));   // March 16 (exclusive)

      mockQueryBuilder.getRawMany.mockResolvedValue([
        { date: '2024-03-15', totalSales: '500.00', totalOrders: '5' }
      ]);

      const result = await service.getAdminPlatformMetrics(TimePeriod.DAILY, customDate);

      expect(orderRepository.sum).toHaveBeenCalledWith('grandTotal', { orderDate: Between(queryStartDate, new Date(queryEndDate.getTime() - 1)) });
      expect(orderRepository.count).toHaveBeenCalledWith({ where: { orderDate: Between(queryStartDate, new Date(queryEndDate.getTime() - 1)) }});
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('order.orderDate >= :queryStartDate', { queryStartDate });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('order.orderDate < :queryEndDate', { queryEndDate });

      expect(result.overallMetrics.totalSales).toBe(10000); // This is the total sum, not from time series
      expect(result.timeSeriesMetrics).toEqual([{ date: '2024-03-15', totalSales: 500, totalOrders: 5 }]);
      expect(result.periodCovered.period).toBe(TimePeriod.DAILY);
      expect(result.periodCovered.startDate).toBe('2024-03-15');
      expect(result.periodCovered.endDate).toBe('2024-03-15'); // Display end date for daily
    });
    // ... other getAdminPlatformMetrics tests
  });

  describe('generateCSVData', () => {
    // ... generateCSVData tests from previous response (they are generally fine)
    it('should return "No data available" for empty data', () => {
      expect(service.generateCSVData([], 'Test Report')).toBe('No data available for Test Report report.');
    });


     it('should handle null and undefined values as empty strings in CSV', () => {
      const data = [{ id: 1, name: null, price: undefined, notes: "note" }];
      const expectedCsv = 'id,name,price,notes\n1,,,note';
      expect(service.generateCSVData(data, 'Nullable Report')).toBe(expectedCsv);
    });
  });
});