// src/orders/orders.service.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner, EntityManager, FindOptionsWhere, ObjectLiteral } from 'typeorm';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  Logger, // Main NestJS Logger
  Inject,
  ForbiddenException,
  ConsoleLoggerOptions, // For Logger options type
  LoggerService,      // For localInstance type
} from '@nestjs/common';


// Import Service, Entities, DTOs
import { OrdersService } from './orders.service';
import { Order } from './entities/order.entity';
import { SellerOrder } from './entities/seller-order.entity';
import { SellerOrderItem } from './entities/seller-order-item.entity';
import { Product } from '../products/entities/product.entity';
import { Store } from '../store/entities/store.entity';
import { CartItem } from '../cart/entities/cart-item.entity';
import { User } from '../auth/user.entity';
import { CreateOrderDto, CartItemDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';


// --- Mock Data ---
const mockUserId = 'auth0|user-buyer-123';
const mockSellerUserId = 'auth0|user-seller-abc';
const mockStoreId = '98765432101234567';
const mockProdId1 = 101;
const mockProdId2 = 102;

const mockBuyerUser: User = { userID: mockUserId, role: 'buyer' };
const mockSellerUser: User = { userID: mockSellerUserId, role: 'seller' };

const mockStore: Store = { storeId: mockStoreId, userId: mockSellerUserId, storeName: 'Mock Seller Store', standardPrice: 5.00, standardTime: '3-5 days', expressPrice: 15.00, expressTime: '1-2 days', user: mockSellerUser, products: [], isActive: true };
const mockProduct1: Product = { prodId: mockProdId1, name: 'Mock Gadget Pro', description: 'The best mock gadget ever.', category: 'Electronics', price: 199.99, productquantity: 50, userId: mockSellerUserId, imageUrl: 'https://example.com/mock-product1.jpg', storeName: mockStore.storeName, isActive: true, storeId: mockStoreId, store: mockStore };
const mockProduct2: Product = { prodId: mockProdId2, name: 'Mock Accessory', description: 'A useful accessory.', category: 'Accessories', price: 25.50, productquantity: 100, userId: mockSellerUserId, imageUrl: 'https://example.com/mock-product2.jpg', storeName: mockStore.storeName, isActive: true, storeId: mockStoreId, store: mockStore };

const mockOrderId = 5001;
const mockSellerOrderId = 6001;
const mockSellerOrderItemId1 = 7001;
const mockSellerOrderItemId2 = 7002;
const mockOrderDate = new Date('2025-05-18T12:00:00.000Z');

const mockOrder: Order = { orderId: mockOrderId, userId: mockUserId, user: mockBuyerUser, orderDate: mockOrderDate, grandTotal: (mockProduct1.price * 2) + (mockProduct2.price * 1) + mockStore.standardPrice, pickupArea: 'Area 51', pickupPoint: 'Main Gate', sellerOrders: [] };
const mockSellerOrder: SellerOrder = { sellerOrderId: mockSellerOrderId, orderId: mockOrderId, order: mockOrder, userId: mockSellerUserId, seller: mockSellerUser, deliveryMethod: 'standard', deliveryPrice: mockStore.standardPrice, deliveryTimeEstimate: mockStore.standardTime, itemsSubtotal: (mockProduct1.price * 2) + (mockProduct2.price * 1), sellerTotal: (mockProduct1.price * 2) + (mockProduct2.price * 1) + mockStore.standardPrice, status: 'Processing', items: []};
const mockSellerOrderItem1: SellerOrderItem = { sellerOrderItemId: mockSellerOrderItemId1, sellerOrderId: mockSellerOrderId, sellerOrder: mockSellerOrder, productId: mockProdId1, product: mockProduct1, quantityOrdered: 2, pricePerUnit: mockProduct1.price, productNameSnapshot: mockProduct1.name };
const mockSellerOrderItem2: SellerOrderItem = { sellerOrderItemId: mockSellerOrderItemId2, sellerOrderId: mockSellerOrderId, sellerOrder: mockSellerOrder, productId: mockProdId2, product: mockProduct2, quantityOrdered: 1, pricePerUnit: mockProduct2.price, productNameSnapshot: mockProduct2.name };

const mockCartItemDto1: CartItemDto = { productId: mockProdId1, quantity: 2, pricePerUnitSnapshot: mockProduct1.price, storeId: mockStoreId };
const mockCartItemDto2: CartItemDto = { productId: mockProdId2, quantity: 1, pricePerUnitSnapshot: mockProduct2.price, storeId: mockStoreId };

const mockCreateOrderDto: CreateOrderDto = { cartItems: [mockCartItemDto1, mockCartItemDto2], deliverySelections: { [mockStoreId]: 'standard', }, selectedArea: 'Area 51', selectedPickupPoint: 'Main Gate', frontendGrandTotal: (mockCartItemDto1.pricePerUnitSnapshot * mockCartItemDto1.quantity) + (mockCartItemDto2.pricePerUnitSnapshot * mockCartItemDto2.quantity) + mockStore.standardPrice, yocoChargeId: 'charge_123xyz' };
const mockUpdateOrderStatusDto: UpdateOrderStatusDto = { status: 'Shipped' };
// --- End Mock Data ---

type MockRepository<T extends ObjectLiteral = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;
const createMockRepository = <T extends ObjectLiteral = any>(): MockRepository<T> => ({ findOne: jest.fn(), find: jest.fn(), create: jest.fn(), save: jest.fn(), merge: jest.fn(), delete: jest.fn(), update: jest.fn(), findOneOrFail: jest.fn(), findByIds: jest.fn(), createQueryBuilder: jest.fn() });

const createMockEntityManager = (): jest.Mocked<EntityManager> => {
    const mock = { findByIds: jest.fn(), create: jest.fn(), save: jest.fn(), update: jest.fn(), delete: jest.fn(), query: jest.fn(), transaction: jest.fn(), connection: undefined as any, queryRunner: undefined as any };
    return mock as unknown as jest.Mocked<EntityManager>;
};

// Corrected QueryRunner Mock for boolean properties
type MockQueryRunnerType = {
  manager: jest.Mocked<EntityManager>;
  connect: jest.Mock;
  startTransaction: jest.Mock;
  commitTransaction: jest.Mock;
  rollbackTransaction: jest.Mock;
  release: jest.Mock;
  isTransactionActive: boolean; // Now a boolean property
  isReleased: boolean;        // Now a boolean property
};

const createMockQueryRunner = (manager: jest.Mocked<EntityManager>): MockQueryRunnerType => ({
  manager: manager,
  connect: jest.fn().mockResolvedValue(undefined),
  startTransaction: jest.fn().mockResolvedValue(undefined),
  commitTransaction: jest.fn().mockResolvedValue(undefined),
  rollbackTransaction: jest.fn().mockResolvedValue(undefined),
  release: jest.fn().mockResolvedValue(undefined),
  isTransactionActive: true, // Default value
  isReleased: false,       // Default value
});

type MockDataSourceType = { createQueryRunner: jest.Mock<MockQueryRunnerType>; };
const createMockDataSource = (queryRunner: MockQueryRunnerType): MockDataSourceType => ({ createQueryRunner: jest.fn().mockReturnValue(queryRunner) });

// REVISED Logger Mock
const createMockLogger = (): jest.Mocked<Logger> => {
    const mockLocalInstance: LoggerService = { // Adhere strictly to LoggerService interface
        log: jest.fn(), error: jest.fn(), warn: jest.fn(),
        debug: jest.fn(), verbose: jest.fn(), fatal: jest.fn(),
        setLogLevels: jest.fn(),
        // 'isLevelEnabled' is NOT part of LoggerService interface.
    };

    const loggerMock = {
        log: jest.fn(), error: jest.fn(), warn: jest.fn(),
        debug: jest.fn(), verbose: jest.fn(), fatal: jest.fn(),
        setLogLevels: jest.fn(), getLogLevels: jest.fn().mockReturnValue([]),
        isLevelEnabled: jest.fn().mockReturnValue(true), // Public method on ConsoleLogger
        getTimestamp: jest.fn().mockReturnValue(new Date().toISOString()),
        printMessages: jest.fn(),
        localInstance: mockLocalInstance,
        // Protected members are not explicitly set here. The `as unknown` cast handles differences.
        options: {} as ConsoleLoggerOptions, // Keep if TS strictly requires for jest.Mocked<Logger>
        registerLocalInstanceRef: jest.fn(), // Keep if TS strictly requires
    };
    return loggerMock as unknown as jest.Mocked<Logger>;
};

let service: OrdersService;
let mockOrdersRepository: MockRepository<Order>;
let mockCartItemsRepository: MockRepository<CartItem>;
let mockSellerOrdersRepository: MockRepository<SellerOrder>;
let mockDataSource: MockDataSourceType;
let mockQueryRunner: MockQueryRunnerType;
let mockEntityManager: jest.Mocked<EntityManager>;
let mockLogger: jest.Mocked<Logger>;

describe('OrdersService', () => {
  beforeEach(async () => {
    jest.useFakeTimers().setSystemTime(mockOrderDate);

    mockOrdersRepository = createMockRepository<Order>();
    mockCartItemsRepository = createMockRepository<CartItem>();
    mockSellerOrdersRepository = createMockRepository<SellerOrder>();
    mockEntityManager = createMockEntityManager();
    mockQueryRunner = createMockQueryRunner(mockEntityManager); // QueryRunner now has boolean flags by default
    mockDataSource = createMockDataSource(mockQueryRunner);
    mockLogger = createMockLogger();

    // Reset EntityManager mocks
    (Object.values(mockEntityManager) as jest.Mock[]).forEach(mockFn => {
        if(jest.isMockFunction(mockFn)) mockFn.mockReset();
    });
    // Reset QueryRunner method mocks
    mockQueryRunner.connect.mockReset().mockResolvedValue(undefined);
    mockQueryRunner.startTransaction.mockReset().mockResolvedValue(undefined);
    mockQueryRunner.commitTransaction.mockReset().mockResolvedValue(undefined);
    mockQueryRunner.rollbackTransaction.mockReset().mockResolvedValue(undefined);
    mockQueryRunner.release.mockReset().mockResolvedValue(undefined);
    // Reset QueryRunner boolean flags to defaults for each test in this suite
    mockQueryRunner.isTransactionActive = true;
    mockQueryRunner.isReleased = false;

    const module: TestingModule = await Test.createTestingModule({
      providers: [ OrdersService,
        { provide: DataSource, useValue: mockDataSource as unknown as DataSource },
        { provide: getRepositoryToken(Order), useValue: mockOrdersRepository },
        { provide: getRepositoryToken(CartItem), useValue: mockCartItemsRepository },
        { provide: getRepositoryToken(SellerOrder), useValue: mockSellerOrdersRepository },
        { provide: Logger, useValue: mockLogger },
      ],
    }).compile();
    service = module.get<OrdersService>(OrdersService);
  });

  afterEach(() => { jest.useRealTimers(); });
  it('should be defined', () => { expect(service).toBeDefined(); });

  describe('createOrder', () => {
    const setupSuccessfulTransactionMocks = () => {
        mockEntityManager.findByIds.mockImplementation(async (entityType: any, ids: any[]) => { if (entityType === Product) { const products = [ { ...mockProduct1, productquantity: 100 }, { ...mockProduct2, productquantity: 100 } ].filter(p => ids.includes(p.prodId)); return products; } if (entityType === Store) { return ids.includes(mockStore.storeId) ? [{ ...mockStore }] : []; } return []; });
        mockEntityManager.create.mockImplementation((_entityType: any, data: any) => ({ ...data, createdAt: mockOrderDate, updatedAt: mockOrderDate }));
        mockEntityManager.save.mockImplementation(async (entityType: any, data: any) => { if (entityType === Order) return { ...data, orderId: mockOrderId, orderDate: mockOrderDate }; if (entityType === SellerOrder) return { ...data, sellerOrderId: mockSellerOrderId }; if (entityType === SellerOrderItem && Array.isArray(data)) { return data.map((item, index) => ({ ...item, sellerOrderItemId: mockSellerOrderItemId1 + index })); } if (entityType === SellerOrderItem && !Array.isArray(data)){ return { ...data, sellerOrderItemId: mockSellerOrderItemId1 }; } return data; });
        mockEntityManager.update.mockResolvedValue({ affected: 1, generatedMaps: [], raw: {} });
        mockEntityManager.delete.mockResolvedValue({ affected: mockCreateOrderDto.cartItems.length, raw: {} });
        const finalOrderWithRelations = { ...mockOrder, orderId: mockOrderId, userId: mockUserId, grandTotal: mockCreateOrderDto.frontendGrandTotal, sellerOrders: [{ ...mockSellerOrder, sellerOrderId: mockSellerOrderId, orderId: mockOrderId, userId: mockSellerUserId, items: [ { ...mockSellerOrderItem1, sellerOrderId: mockSellerOrderId, product: { prodId: mockProdId1, name: mockProduct1.name, imageUrl: mockProduct1.imageUrl } }, { ...mockSellerOrderItem2, sellerOrderId: mockSellerOrderId, product: { prodId: mockProdId2, name: mockProduct2.name, imageUrl: mockProduct2.imageUrl } } ], seller: mockSellerUser }], user: mockBuyerUser };
        if (mockOrdersRepository.findOneOrFail) { mockOrdersRepository.findOneOrFail.mockResolvedValue(finalOrderWithRelations); }
    };

    beforeEach(() => { // This beforeEach is specific to 'createOrder' tests
      (Object.values(mockEntityManager) as jest.Mock[]).forEach(mockFn => { if(jest.isMockFunction(mockFn)) mockFn.mockReset(); });
      if(mockOrdersRepository.findOneOrFail) mockOrdersRepository.findOneOrFail.mockReset();
      // Reset query runner boolean flags for each createOrder test to ensure isolation
      mockQueryRunner.isTransactionActive = true;
      mockQueryRunner.isReleased = false;
      setupSuccessfulTransactionMocks();
    });

    it('should successfully create an order and related entities', async () => {
      const result = await service.createOrder(mockCreateOrderDto, mockUserId);
      expect(result).toBeDefined(); expect(result.orderId).toEqual(mockOrderId); expect(mockDataSource.createQueryRunner).toHaveBeenCalledTimes(1); expect(mockQueryRunner.connect).toHaveBeenCalledTimes(1); expect(mockQueryRunner.startTransaction).toHaveBeenCalledTimes(1); expect(mockEntityManager.findByIds).toHaveBeenCalledWith(Product, [mockProdId1, mockProdId2]); expect(mockEntityManager.findByIds).toHaveBeenCalledWith(Store, [mockStoreId]); expect(mockEntityManager.save).toHaveBeenCalledWith(Order, expect.objectContaining({ userId: mockUserId, orderDate: mockOrderDate })); expect(mockEntityManager.save).toHaveBeenCalledWith(SellerOrder, expect.objectContaining({ orderId: mockOrderId, userId: mockSellerUserId })); expect(mockEntityManager.save).toHaveBeenCalledWith(SellerOrderItem, expect.arrayContaining([ expect.objectContaining({ productId: mockProdId1, sellerOrderId: mockSellerOrderId }), expect.objectContaining({ productId: mockProdId2, sellerOrderId: mockSellerOrderId }), ])); expect(mockEntityManager.update).toHaveBeenCalledWith(Product, mockProdId1, expect.objectContaining({ productquantity: 100 - mockCartItemDto1.quantity })); expect(mockEntityManager.update).toHaveBeenCalledWith(Product, mockProdId2, expect.objectContaining({ productquantity: 100 - mockCartItemDto2.quantity })); expect(mockEntityManager.delete).toHaveBeenCalledWith(CartItem, { userId: mockUserId }); expect(mockQueryRunner.commitTransaction).toHaveBeenCalledTimes(1); expect(mockQueryRunner.rollbackTransaction).not.toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalledTimes(1);
      expect(mockOrdersRepository.findOneOrFail!).toHaveBeenCalledWith(expect.objectContaining({ where: { orderId: mockOrderId } })); expect(result.sellerOrders).toHaveLength(1); expect(result.grandTotal).toBeCloseTo(mockCreateOrderDto.frontendGrandTotal, 2);
    });

    it('should throw ConflictException if stock is insufficient', async () => {
      mockEntityManager.findByIds!.mockImplementation(async (entityType: any, ids: any[]) => { if (entityType === Product) { const p1 = { ...mockProduct1, productquantity: 1 }; const p2 = { ...mockProduct2, productquantity: 100 }; return [p1,p2].filter(p => ids.includes(p.prodId)); } if (entityType === Store) return [{ ...mockStore }]; return []; });
      await expect(service.createOrder(mockCreateOrderDto, mockUserId)).rejects.toThrow(ConflictException);
      expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled(); expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
      expect(mockQueryRunner.release).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException if a product is not found', async () => {
        mockEntityManager.findByIds!.mockImplementation(async (entityType: any, ids: any[]) => { if (entityType === Product) { return [{ ...mockProduct2, productquantity: 100 }].filter(p => ids.includes(p.prodId)); } if (entityType === Store) return [{ ...mockStore }]; return []; });
        await expect(service.createOrder(mockCreateOrderDto, mockUserId)).rejects.toThrow(new NotFoundException(`Product details not found for product ID: ${mockProdId1}`));
        expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
        expect(mockQueryRunner.release).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException if a store is not found', async () => {
        mockEntityManager.findByIds!.mockImplementation(async (entityType: any, ids: any[]) => { if (entityType === Product) return [ { ...mockProduct1, productquantity: 100 }, { ...mockProduct2, productquantity: 100 } ].filter(p => ids.includes(p.prodId)); if (entityType === Store) return []; return []; });
        await expect(service.createOrder(mockCreateOrderDto, mockUserId)).rejects.toThrow(new NotFoundException(`Store details not found for store ID: ${mockStoreId}`));
        expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
        expect(mockQueryRunner.release).toHaveBeenCalledTimes(1);
    });

    it('should throw BadRequestException for invalid delivery method', async () => {
        const dtoWithInvalidDelivery = { ...mockCreateOrderDto, deliverySelections: { [mockStoreId]: 'invalid_method' as any }, };
        await expect(service.createOrder(dtoWithInvalidDelivery, mockUserId)).rejects.toThrow(new BadRequestException(`Invalid or missing delivery method ('invalid_method') for store ID: ${mockStoreId}. Must be 'standard' or 'express'.`));
        expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
        expect(mockQueryRunner.release).toHaveBeenCalledTimes(1);
    });

    it('should throw InternalServerErrorException if saving Order fails', async () => {
        const dbError = new Error("DB Save Order Error");
        mockEntityManager.save!.mockImplementation(async (entityType: any, data: any) => { if (entityType === Order) throw dbError; if (entityType === SellerOrder) return { ...data, sellerOrderId: mockSellerOrderId }; if (entityType === SellerOrderItem && Array.isArray(data)) { return data.map((item, index) => ({ ...item, sellerOrderItemId: mockSellerOrderItemId1 + index })); } return data; });
        await expect(service.createOrder(mockCreateOrderDto, mockUserId)).rejects.toThrow(InternalServerErrorException);
        expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
        expect(mockQueryRunner.release).toHaveBeenCalledTimes(1);
        expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('--- Service: CATCH block reached'), dbError.stack);
    });

    it('should throw InternalServerErrorException if updating stock fails and log detailed error', async () => {
        const dbError = new Error("DB Update Stock Error");
        mockEntityManager.update!.mockImplementation(async (entityType: any) => { if (entityType === Product) throw dbError; return { affected: 1, generatedMaps: [], raw: {} }; });
        await expect(service.createOrder(mockCreateOrderDto, mockUserId)).rejects.toThrow(InternalServerErrorException);
        expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
        expect(mockQueryRunner.release).toHaveBeenCalledTimes(1);
        expect(mockLogger.error).toHaveBeenCalledWith( expect.stringContaining(`--- Service: CATCH block reached for user ${mockUserId}. Rolling back transaction. Error: ${dbError.message} ---`), dbError.stack );
    });

    it('should throw InternalServerErrorException if clearing cart fails', async () => {
        const dbError = new Error("DB Delete Cart Error");
        mockEntityManager.delete!.mockRejectedValue(dbError);
        await expect(service.createOrder(mockCreateOrderDto, mockUserId)).rejects.toThrow(InternalServerErrorException);
        expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
        expect(mockQueryRunner.release).toHaveBeenCalledTimes(1);
        expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('--- Service: CATCH block reached'), dbError.stack);
    });

    it('should log a warning if grand totals mismatch but still proceed with backend calculated total', async () => {
        const frontendTotal = mockCreateOrderDto.frontendGrandTotal + 10; const mismatchDto = { ...mockCreateOrderDto, frontendGrandTotal: frontendTotal }; const backendCalculatedTotal = (mockProduct1.price * mockCartItemDto1.quantity) + (mockProduct2.price * mockCartItemDto2.quantity) + mockStore.standardPrice;
        const result = await service.createOrder(mismatchDto, mockUserId);
        expect(mockLogger.warn).toHaveBeenCalledWith( expect.stringContaining(`Grand total mismatch! Backend calculated: ${backendCalculatedTotal.toFixed(2)}, Frontend sent: ${frontendTotal.toFixed(2)}`) );
        expect(mockQueryRunner.commitTransaction).toHaveBeenCalledTimes(1);
        expect(mockQueryRunner.release).toHaveBeenCalledTimes(1);
        expect(result).toBeDefined(); expect(result.grandTotal).toBeCloseTo(backendCalculatedTotal, 2);
    });

    it('should proceed if deliverySelections contains an extra storeId not in cartItems (current behavior ignores extra)', async () => {
        const specificDeliverySelections: Record<string, 'standard' | 'express'> = { [mockStoreId]: 'standard', 'store-not-in-cart-xyz': 'express', };
        const dtoWithExtraDeliverySelection: CreateOrderDto = { ...mockCreateOrderDto, deliverySelections: specificDeliverySelections, };
        await expect(service.createOrder(dtoWithExtraDeliverySelection, mockUserId)).resolves.toBeDefined();
        expect(mockQueryRunner.commitTransaction).toHaveBeenCalledTimes(1);
        expect(mockQueryRunner.release).toHaveBeenCalledTimes(1);
    });

    it('should not call rollbackTransaction if transaction is not active in catch block', async () => {
        const earlyError = new Error('Simulated DB error early');
        // Simulate error occurring after createQueryRunner but before/during other operations
        // And ensure isTransactionActive is false when the catch block checks it.
        mockEntityManager.findByIds!.mockImplementationOnce(async () => {
             throw earlyError;
        });
        mockQueryRunner.isTransactionActive = false; // Set property for the catch block check

        await expect(service.createOrder(mockCreateOrderDto, mockUserId))
            .rejects.toThrow(InternalServerErrorException); // Generic error from catch

        expect(mockQueryRunner.rollbackTransaction).not.toHaveBeenCalled();
        expect(mockQueryRunner.release).toHaveBeenCalledTimes(1);
        expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining(earlyError.message), earlyError.stack);
    });


    it('should throw InternalServerErrorException if final order fetch (findOneOrFail) fails after commit', async () => {
        mockOrdersRepository.findOneOrFail!.mockRejectedValueOnce(new Error('DB error on final fetch after commit'));
        await expect(service.createOrder(mockCreateOrderDto, mockUserId)) .rejects.toThrow(new InternalServerErrorException('Order was created successfully, but failed to retrieve the final details.'));
        expect(mockQueryRunner.commitTransaction).toHaveBeenCalledTimes(1); expect(mockQueryRunner.rollbackTransaction).not.toHaveBeenCalled();
        expect(mockQueryRunner.release).toHaveBeenCalledTimes(1);
        expect(mockOrdersRepository.findOneOrFail!).toHaveBeenCalledTimes(1);
    });

    it('should not call queryRunner.release in finally if it was already released', async () => {
        const testError = new Error('Test error to trigger finally');
        mockEntityManager.findByIds!.mockImplementationOnce(() => { throw testError; });
        mockQueryRunner.isReleased = true; // Set property directly

        await expect(service.createOrder(mockCreateOrderDto, mockUserId)) .rejects.toThrow(InternalServerErrorException);
        expect(mockQueryRunner.release).not.toHaveBeenCalled();
        expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining(testError.message), testError.stack);
    });

    // Corrected Test Expectation for "savedOrder is null"
     it('should throw InternalServerErrorException from catch block if savedOrder is null (due to TypeError)', async () => {
        mockEntityManager.save!.mockImplementation(async (entityType: any, data: any) => { if (entityType === Order) return null; if (entityType === SellerOrder) return { ...data, sellerOrderId: mockSellerOrderId }; if (entityType === SellerOrderItem && Array.isArray(data)) { return data.map((item, index) => ({ ...item, sellerOrderItemId: mockSellerOrderItemId1 + index })); } return data; });
        await expect(service.createOrder(mockCreateOrderDto, mockUserId))
            .rejects.toThrow(new InternalServerErrorException('Failed to create order due to an unexpected internal error.'));
        expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
        expect(mockQueryRunner.release).toHaveBeenCalledTimes(1);
        expect(mockLogger.error).toHaveBeenCalled(); // General check for error logging
    });
  });

  describe('findSellerOrders', () => {
    const dbError = new Error("DB Error");
    it('should return seller orders with relations', async () => {
        const orders = [{...mockSellerOrder, items: [mockSellerOrderItem1]}];
        mockSellerOrdersRepository.find!.mockResolvedValue(orders);
        const result = await service.findSellerOrders(mockSellerUserId);
        expect(mockSellerOrdersRepository.find!).toHaveBeenCalledWith({ where: { userId: mockSellerUserId }, relations: ['order', 'items', 'items.product'], });
        expect(result).toEqual(orders);
    });
    it('should return an empty array if no orders found for seller', async () => {
        mockSellerOrdersRepository.find!.mockResolvedValue([]);
        const result = await service.findSellerOrders(mockSellerUserId);
        expect(result).toEqual([]);
    });
    it('should throw InternalServerErrorException on database error for findSellerOrders', async () => {
        mockSellerOrdersRepository.find!.mockRejectedValue(dbError);
        await expect(service.findSellerOrders(mockSellerUserId)).rejects.toThrow(InternalServerErrorException);
        expect(mockLogger.error).toHaveBeenCalledWith( expect.stringContaining('Failed to find seller orders'), dbError.stack );
    });
  });

  describe('calculateSellerEarnings', () => {
    const mockQueryBuilder = { select: jest.fn().mockReturnThis(), where: jest.fn().mockReturnThis(), andWhere: jest.fn().mockReturnThis(), getRawOne: jest.fn(), };
    const dbError = new Error("DB Error for earnings");
    beforeEach(() => {
      mockQueryBuilder.select.mockClear().mockReturnThis(); mockQueryBuilder.where.mockClear().mockReturnThis(); mockQueryBuilder.andWhere.mockClear().mockReturnThis(); mockQueryBuilder.getRawOne.mockClear();
      mockSellerOrdersRepository.createQueryBuilder!.mockReturnValue(mockQueryBuilder as any);
    });
    it('should calculate total earnings correctly without status filter', async () => {
        mockQueryBuilder.getRawOne.mockResolvedValue({ totalEarnings: '250.75' });
        const result = await service.calculateSellerEarnings(mockSellerUserId);
        expect(mockQueryBuilder.select).toHaveBeenCalledWith('SUM(sellerOrder.sellerTotal)', 'totalEarnings'); expect(mockQueryBuilder.where).toHaveBeenCalledWith('sellerOrder.userId = :sellerUserId', { sellerUserId: mockSellerUserId }); expect(mockQueryBuilder.andWhere).not.toHaveBeenCalled(); expect(result).toEqual({ totalEarnings: 250.75 });
    });
    it('should calculate total earnings correctly with status filter', async () => {
        const status = 'Completed'; mockQueryBuilder.getRawOne.mockResolvedValue({ totalEarnings: '150.00' });
        const result = await service.calculateSellerEarnings(mockSellerUserId, status);
        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('sellerOrder.status = :status', { status }); expect(result).toEqual({ totalEarnings: 150.00 });
    });
    it('should return 0 earnings when status filter matches no orders (getRawOne returns null)', async () => {
        const status = 'NonExistentStatus'; mockQueryBuilder.getRawOne.mockResolvedValue(null);
        const result = await service.calculateSellerEarnings(mockSellerUserId, status);
        expect(mockSellerOrdersRepository.createQueryBuilder!).toHaveBeenCalledWith('sellerOrder'); expect(mockQueryBuilder.where).toHaveBeenCalledWith('sellerOrder.userId = :sellerUserId', { sellerUserId: mockSellerUserId }); expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('sellerOrder.status = :status', { status }); expect(result).toEqual({ totalEarnings: 0 });
    });
    it('should return 0 earnings if getRawOne returns object without totalEarnings', async () => {
        mockQueryBuilder.getRawOne.mockResolvedValue({ someOtherField: 123 });
        const result = await service.calculateSellerEarnings(mockSellerUserId); expect(result).toEqual({ totalEarnings: 0 });
    });
    it('should return 0 earnings if parsed totalEarnings is NaN and log error', async () => {
        mockQueryBuilder.getRawOne.mockResolvedValue({ totalEarnings: 'not-a-number' });
        const result = await service.calculateSellerEarnings(mockSellerUserId); expect(result).toEqual({ totalEarnings: 0 }); expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to parse earnings sum. Raw value was: not-a-number.'));
    });
    it('should throw InternalServerErrorException on database error for calculateSellerEarnings', async () => {
        mockQueryBuilder.getRawOne.mockRejectedValue(dbError);
        await expect(service.calculateSellerEarnings(mockSellerUserId)).rejects.toThrow(InternalServerErrorException);
        expect(mockLogger.error).toHaveBeenCalledWith( expect.stringContaining('Failed to calculate earnings for seller'), dbError.stack );
    });
  });

  describe('updateSellerOrderStatus', () => {
    const sellerOrderIdToUpdate = mockSellerOrder.sellerOrderId; const newStatusDto: UpdateOrderStatusDto = { status: 'Shipped' }; const dbError = new Error("DB Save Error for status update");
    it('should update the status of a seller order successfully', async () => {
        const foundOrder = { ...mockSellerOrder, status: 'Processing' }; mockSellerOrdersRepository.findOne!.mockResolvedValue(foundOrder); const expectedUpdatedOrder = { ...foundOrder, status: newStatusDto.status, updatedAt: mockOrderDate }; mockSellerOrdersRepository.save!.mockResolvedValue(expectedUpdatedOrder);
        const result = await service.updateSellerOrderStatus(sellerOrderIdToUpdate, mockSellerUserId, newStatusDto);
        expect(mockSellerOrdersRepository.findOne!).toHaveBeenCalledWith({ where: { sellerOrderId: sellerOrderIdToUpdate, userId: mockSellerUserId } }); expect(foundOrder.status).toEqual(newStatusDto.status); expect(mockSellerOrdersRepository.save!).toHaveBeenCalledWith(foundOrder); expect(result).toEqual(expectedUpdatedOrder);
    });
    it('should throw NotFoundException if order not found or not owned by seller for updateStatus', async () => {
        mockSellerOrdersRepository.findOne!.mockResolvedValue(null);
        await expect(service.updateSellerOrderStatus(sellerOrderIdToUpdate, mockSellerUserId, newStatusDto)).rejects.toThrow(new NotFoundException(`Seller order with ID ${sellerOrderIdToUpdate} not found or access denied.`));
        expect(mockSellerOrdersRepository.save!).not.toHaveBeenCalled();
    });
    it('should throw InternalServerErrorException if save fails during status update', async () => {
        const foundOrder = { ...mockSellerOrder, status: 'Processing' }; mockSellerOrdersRepository.findOne!.mockResolvedValue(foundOrder); mockSellerOrdersRepository.save!.mockRejectedValue(dbError);
        await expect(service.updateSellerOrderStatus(sellerOrderIdToUpdate, mockSellerUserId, newStatusDto)).rejects.toThrow(InternalServerErrorException);
        expect(mockLogger.error).toHaveBeenCalledWith( expect.stringContaining('Failed to save updated status for sellerOrder ID'), dbError.stack );
    });
  });

  describe('findBuyerOrders', () => {
    const dbError = new Error("DB Error for buyer orders");
    it('should return orders for a specific buyer with relations and correct sorting', async () => {
        const buyerOrders = [{ ...mockOrder, sellerOrders: [{ ...mockSellerOrder }] }]; mockOrdersRepository.find!.mockResolvedValue(buyerOrders);
        const result = await service.findBuyerOrders(mockUserId);
        expect(mockOrdersRepository.find!).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: mockUserId }, relations: [ 'sellerOrders', 'sellerOrders.items', 'sellerOrders.items.product', ], order: { orderDate: 'DESC' } })); expect(result).toEqual(buyerOrders);
    });
    it('should return an empty array if buyer has no orders', async () => {
        mockOrdersRepository.find!.mockResolvedValue([]);
        const result = await service.findBuyerOrders(mockUserId); expect(result).toEqual([]);
    });
    it('should throw InternalServerErrorException on database error for findBuyerOrders', async () => {
        mockOrdersRepository.find!.mockRejectedValue(dbError);
        await expect(service.findBuyerOrders(mockUserId)).rejects.toThrow(InternalServerErrorException);
        expect(mockLogger.error).toHaveBeenCalledWith( expect.stringContaining('Failed to find orders for buyer user ID'), dbError.stack );
    });
  });
});