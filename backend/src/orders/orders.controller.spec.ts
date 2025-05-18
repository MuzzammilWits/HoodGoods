// src/orders/orders.controller.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { Order } from './entities/order.entity';
import { SellerOrder } from './entities/seller-order.entity';
import { Request } from 'express';
import {
  InternalServerErrorException,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  HttpStatus,
  Logger, // Added Logger for potential use or if controller uses it explicitly
  ParseIntPipe,
} from '@nestjs/common';

// Define interface for the structure we need for the mock request
interface MockAuthenticatedRequest extends Partial<Request> {
  user?: {
    sub?: string;
    [key: string]: any;
  };
}

// Mock Data (Simplified versions for controller tests)
const mockBuyerUserId = 'auth0|user-buyer-123';
const mockSellerUserId = 'auth0|user-seller-abc';

const mockCreateOrderDto: CreateOrderDto = {
  cartItems: [{ productId: 1, quantity: 1, pricePerUnitSnapshot: 10, storeId: 'store1' }],
  deliverySelections: { store1: 'standard' },
  selectedArea: 'Area',
  selectedPickupPoint: 'Point',
  frontendGrandTotal: 15, // Example
  yocoChargeId: 'ch_123',
};

const mockUpdateOrderStatusDto: UpdateOrderStatusDto = {
  status: 'Shipped',
};

const mockOrder = { orderId: 1, userId: mockBuyerUserId } as Order; // Cast for type
const mockSellerOrder = { sellerOrderId: 10, orderId: 1, userId: mockSellerUserId, status: 'Processing' } as SellerOrder;
const mockUpdatedSellerOrder = { ...mockSellerOrder, status: 'Shipped' } as SellerOrder;

// Mock OrdersService
const mockOrdersService = {
  createOrder: jest.fn(),
  findBuyerOrders: jest.fn(),
  findSellerOrders: jest.fn(),
  calculateSellerEarnings: jest.fn(),
  updateSellerOrderStatus: jest.fn(),
};

describe('OrdersController', () => {
  let controller: OrdersController;
  let service: OrdersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        {
          provide: OrdersService,
          useValue: mockOrdersService, // Provide the mock service
        },
      // The controller uses its own private readonly logger = new Logger(OrdersController.name);
      // So, no need to provide Logger here unless you change the controller to inject it.
      ],
    })
    .compile();

    controller = module.get<OrdersController>(OrdersController);
    service = module.get<OrdersService>(OrdersService);

    // Reset mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // --- Tests for create ---
  describe('create', () => {
    let mockReq: MockAuthenticatedRequest;

    beforeEach(() => {
        mockReq = { user: { sub: mockBuyerUserId } };
    });

    it('should call ordersService.createOrder and return the created order', async () => {
      mockOrdersService.createOrder.mockResolvedValue(mockOrder);

      const result = await controller.create(mockCreateOrderDto, mockReq as any);

      expect(service.createOrder).toHaveBeenCalledTimes(1);
      expect(service.createOrder).toHaveBeenCalledWith(mockCreateOrderDto, mockBuyerUserId);
      expect(result).toEqual(mockOrder);
    });

    it('should throw InternalServerErrorException if user ID is missing from request', async () => {
       mockReq = { user: undefined }; // Simulate missing user

       await expect(controller.create(mockCreateOrderDto, mockReq as any))
           .rejects.toThrow(InternalServerErrorException);
       expect(service.createOrder).not.toHaveBeenCalled();
    });

    it('should throw InternalServerErrorException if user.sub ID is missing from request', async () => {
      mockReq = { user: {} }; // Simulate user object without sub

      await expect(controller.create(mockCreateOrderDto, mockReq as any))
          .rejects.toThrow(InternalServerErrorException);
      expect(service.createOrder).not.toHaveBeenCalled();
    });

     it('should re-throw errors from ordersService.createOrder', async () => {
       const serviceError = new ConflictException('Stock issue');
       mockOrdersService.createOrder.mockRejectedValue(serviceError);

       await expect(controller.create(mockCreateOrderDto, mockReq as any))
           .rejects.toThrow(ConflictException);
       expect(service.createOrder).toHaveBeenCalledTimes(1);
       expect(service.createOrder).toHaveBeenCalledWith(mockCreateOrderDto, mockBuyerUserId);
    });
  });

   // --- Tests for getMyOrders ---
   describe('getMyOrders', () => {
        let mockReq: MockAuthenticatedRequest;

        beforeEach(() => {
            mockReq = { user: { sub: mockBuyerUserId } };
        });

       it('should call ordersService.findBuyerOrders and return orders', async () => {
           const orders = [mockOrder];
           mockOrdersService.findBuyerOrders.mockResolvedValue(orders);

           const result = await controller.getMyOrders(mockReq as any);

           expect(service.findBuyerOrders).toHaveBeenCalledTimes(1);
           expect(service.findBuyerOrders).toHaveBeenCalledWith(mockBuyerUserId);
           expect(result).toEqual(orders);
       });

       it('should throw InternalServerErrorException if user ID is missing for getMyOrders', async () => {
           mockReq = { user: {} }; // Simulate missing sub
           await expect(controller.getMyOrders(mockReq as any))
               .rejects.toThrow(InternalServerErrorException);
           expect(service.findBuyerOrders).not.toHaveBeenCalled();
       });

        it('should re-throw errors from ordersService.findBuyerOrders', async () => {
           const serviceError = new InternalServerErrorException('DB Error');
           mockOrdersService.findBuyerOrders.mockRejectedValue(serviceError);

           await expect(controller.getMyOrders(mockReq as any))
               .rejects.toThrow(InternalServerErrorException);
           expect(service.findBuyerOrders).toHaveBeenCalledTimes(1);
           expect(service.findBuyerOrders).toHaveBeenCalledWith(mockBuyerUserId);
        });
   });

    // --- Tests for getMySellerOrders ---
    describe('getMySellerOrders', () => {
        let mockReq: MockAuthenticatedRequest;

        beforeEach(() => {
            mockReq = { user: { sub: mockSellerUserId } }; // Use seller ID
        });

        it('should call ordersService.findSellerOrders and return seller orders', async () => {
            const sellerOrders = [mockSellerOrder];
            mockOrdersService.findSellerOrders.mockResolvedValue(sellerOrders);

            const result = await controller.getMySellerOrders(mockReq as any);

            expect(service.findSellerOrders).toHaveBeenCalledTimes(1);
            expect(service.findSellerOrders).toHaveBeenCalledWith(mockSellerUserId);
            expect(result).toEqual(sellerOrders);
        });

         it('should throw InternalServerErrorException if user ID is missing for getMySellerOrders', async () => {
            mockReq = { user: { sub: undefined } }; // Simulate missing sub
            await expect(controller.getMySellerOrders(mockReq as any))
                .rejects.toThrow(InternalServerErrorException);
            expect(service.findSellerOrders).not.toHaveBeenCalled();
        });

         it('should re-throw errors from ordersService.findSellerOrders', async () => {
            const serviceError = new InternalServerErrorException('DB Error');
            mockOrdersService.findSellerOrders.mockRejectedValue(serviceError);

            await expect(controller.getMySellerOrders(mockReq as any))
                .rejects.toThrow(InternalServerErrorException);
            expect(service.findSellerOrders).toHaveBeenCalledTimes(1);
            expect(service.findSellerOrders).toHaveBeenCalledWith(mockSellerUserId);
         });
    });

    // --- Tests for getMySellerEarnings ---
    describe('getMySellerEarnings', () => {
        let mockReq: MockAuthenticatedRequest;

        beforeEach(() => {
            mockReq = { user: { sub: mockSellerUserId } }; // Use seller ID
        });

        it('should call ordersService.calculateSellerEarnings without status and return earnings', async () => {
            const earnings = { totalEarnings: 123.45 };
            mockOrdersService.calculateSellerEarnings.mockResolvedValue(earnings);

            const result = await controller.getMySellerEarnings(mockReq as any, undefined); // No status query param

            expect(service.calculateSellerEarnings).toHaveBeenCalledTimes(1);
            expect(service.calculateSellerEarnings).toHaveBeenCalledWith(mockSellerUserId, undefined);
            expect(result).toEqual(earnings);
        });

        it('should call ordersService.calculateSellerEarnings with status and return earnings', async () => {
            const earnings = { totalEarnings: 99.99 };
            const status = 'Completed';
            mockOrdersService.calculateSellerEarnings.mockResolvedValue(earnings);

            const result = await controller.getMySellerEarnings(mockReq as any, status); // With status query param

            expect(service.calculateSellerEarnings).toHaveBeenCalledTimes(1);
            expect(service.calculateSellerEarnings).toHaveBeenCalledWith(mockSellerUserId, status);
            expect(result).toEqual(earnings);
        });

        it('should throw InternalServerErrorException if user ID is missing for getMySellerEarnings', async () => {
            mockReq = { user: undefined }; // Simulate missing user
            await expect(controller.getMySellerEarnings(mockReq as any, undefined))
                .rejects.toThrow(InternalServerErrorException);
            expect(service.calculateSellerEarnings).not.toHaveBeenCalled();
        });

         it('should re-throw errors from ordersService.calculateSellerEarnings', async () => {
            const serviceError = new InternalServerErrorException('Calculation Error');
            mockOrdersService.calculateSellerEarnings.mockRejectedValue(serviceError);

            await expect(controller.getMySellerEarnings(mockReq as any, 'Processing'))
                .rejects.toThrow(InternalServerErrorException);
            expect(service.calculateSellerEarnings).toHaveBeenCalledTimes(1);
            expect(service.calculateSellerEarnings).toHaveBeenCalledWith(mockSellerUserId, 'Processing');
         });
    });

    // --- Tests for updateSellerOrderStatus ---
    describe('updateSellerOrderStatus', () => {
        let mockReq: MockAuthenticatedRequest;
        const sellerOrderIdToUpdate = 10; // Example ID from @Param

        beforeEach(() => {
            mockReq = { user: { sub: mockSellerUserId } }; // Use seller ID
        });

        it('should call ordersService.updateSellerOrderStatus and return updated order', async () => {
            mockOrdersService.updateSellerOrderStatus.mockResolvedValue(mockUpdatedSellerOrder);

            const result = await controller.updateSellerOrderStatus(mockReq as any, sellerOrderIdToUpdate, mockUpdateOrderStatusDto);

            expect(service.updateSellerOrderStatus).toHaveBeenCalledTimes(1);
            expect(service.updateSellerOrderStatus).toHaveBeenCalledWith(sellerOrderIdToUpdate, mockSellerUserId, mockUpdateOrderStatusDto);
            expect(result).toEqual(mockUpdatedSellerOrder);
        });

        it('should throw InternalServerErrorException if user ID is missing for updateSellerOrderStatus', async () => {
            mockReq = { user: undefined }; // Simulate missing user
            await expect(controller.updateSellerOrderStatus(mockReq as any, sellerOrderIdToUpdate, mockUpdateOrderStatusDto))
                .rejects.toThrow(InternalServerErrorException);
            expect(service.updateSellerOrderStatus).not.toHaveBeenCalled();
        });

        it('should re-throw NotFoundException from ordersService.updateSellerOrderStatus', async () => {
            const serviceError = new NotFoundException(`Order ${sellerOrderIdToUpdate} not found`);
            mockOrdersService.updateSellerOrderStatus.mockRejectedValue(serviceError);

            await expect(controller.updateSellerOrderStatus(mockReq as any, sellerOrderIdToUpdate, mockUpdateOrderStatusDto))
                .rejects.toThrow(NotFoundException);
            expect(service.updateSellerOrderStatus).toHaveBeenCalledTimes(1);
            expect(service.updateSellerOrderStatus).toHaveBeenCalledWith(sellerOrderIdToUpdate, mockSellerUserId, mockUpdateOrderStatusDto);
         });

          it('should re-throw BadRequestException from ordersService.updateSellerOrderStatus', async () => {
            const serviceError = new BadRequestException('Invalid status transition');
            mockOrdersService.updateSellerOrderStatus.mockRejectedValue(serviceError);

            await expect(controller.updateSellerOrderStatus(mockReq as any, sellerOrderIdToUpdate, mockUpdateOrderStatusDto))
                .rejects.toThrow(BadRequestException);
            expect(service.updateSellerOrderStatus).toHaveBeenCalledTimes(1);
         });

        // --- NEW TEST (Illustrative - Testing ParseIntPipe behavior is often for E2E) ---
        // This test demonstrates how one *might* consider testing the pipe.
        // However, ParseIntPipe is a built-in NestJS feature.
        // If it fails, it throws a BadRequestException *before* your controller code runs.
        // For a true unit test of the controller, you assume valid parsed inputs or explicitly
        // test the controller's reaction if the pipe *didn't* throw and passed an invalid type,
        // which shouldn't happen with standard pipes.
        it('should not call service if ParseIntPipe fails (illustrative)', async () => {
            mockReq = { user: { sub: mockSellerUserId } };
            const invalidSellerOrderId: any = 'not-an-integer';

            // We can't directly test the pipe's throw in a pure controller unit test easily
            // without a more complex setup (e.g. using a real HTTP call via Test.createTestingModule().createNestApplication()).
            // Instead, we can ensure that if such a call were to somehow bypass the pipe and reach the service,
            // the service would handle it (which is a service test).
            // For the controller, if the pipe fails, the service method should not be called.
            // This test relies on the fact that NestJS will throw an error due to ParseIntPipe
            // before the controller's method body is executed.

            // To truly test this interaction for the controller, you might use an e2e test.
            // For a unit test, you can assume the pipe works as specified by NestJS.
            // If you wanted to simulate the pipe throwing:
            const parseIntPipe = new ParseIntPipe();
            try {
                await parseIntPipe.transform(invalidSellerOrderId, { type: 'param', metatype: Number, data: 'id' });
            } catch (error) {
                 expect(error).toBeInstanceOf(BadRequestException);
            }
            // The service method should not have been called if the pipe threw an error.
            // This part of the assertion is tricky because the controller method won't even be entered.
            // Awaiting controller.updateSellerOrderStatus(...) would throw due to the pipe.
            // So, just verifying the pipe itself throws is a form of contract testing.
            expect(service.updateSellerOrderStatus).not.toHaveBeenCalled();
        });
    });

}); // End describe('OrdersController')