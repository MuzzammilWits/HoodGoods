import { Test, TestingModule } from '@nestjs/testing';
// REMOVED: import { vi } from 'vitest'; // Cannot use Vitest 'vi' with Jest runner
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard'; // Adjust path if needed
import { CreateCartItemDto } from './dto/create-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { SyncCartDto } from './dto/sync-cart.dto';
import { HttpException, HttpStatus } from '@nestjs/common';
import { Request } from 'express'; // Import Request type if needed, or use a simplified mock

// Extend the Request type to include the 'user' property if not globally defined
interface CustomRequest extends Request {
  user?: { sub: string };
}


// Mock CartService methods using Jest
const mockCartService = {
  getCart: jest.fn(),
  addToCart: jest.fn(),
  syncCart: jest.fn(),
  updateCartItem: jest.fn(),
  removeFromCart: jest.fn(),
  clearCart: jest.fn(),
};

// Mock JwtAuthGuard using Jest
const mockJwtAuthGuard = {
  // Use jest.fn() for the guard mock as well
  canActivate: jest.fn(() => true),
};

// Mock Request object structure
const mockRequest = (userId: string): Partial<CustomRequest> => ({
  user: { sub: userId }, // Match the structure used in controller (req.user.sub)
});


describe('CartController', () => {
  let controller: CartController;
  let service: CartService;

  const userId = 'user-123'; // Example user ID for tests

  beforeEach(async () => {
    // Reset mocks before each test using Jest's clearAllMocks
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CartController],
      providers: [
        {
          provide: CartService,
          useValue: mockCartService, // Provide the mock service
        },
      ],
    })
      // Override the guard globally for this testing module
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard) // Use the Jest mocked guard
      .compile();

    controller = module.get<CartController>(CartController);
    // Get the mocked service instance for assertion checks
    service = module.get<CartService>(CartService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // --- Test Suite for getCart ---
  describe('getCart', () => {
    it('should return the user cart successfully', async () => {
      const mockCart = { userId, items: [{ productId: 'prod-1', quantity: 2 }] };
      // Use mockResolvedValue for async functions with Jest mocks
      mockCartService.getCart.mockResolvedValue(mockCart);

      const req = mockRequest(userId);
      const result = await controller.getCart(req);

      expect(result).toEqual(mockCart);
      // Use Jest's expect(...).toHaveBeenCalledWith(...)
      expect(service.getCart).toHaveBeenCalledWith(userId);
      expect(service.getCart).toHaveBeenCalledTimes(1);
    });

    it('should throw HttpException if service fails', async () => {
      // Use mockRejectedValue for async functions with Jest mocks
      mockCartService.getCart.mockRejectedValue(new Error('Service error'));

      const req = mockRequest(userId);

      // Jest's exception testing syntax
      await expect(controller.getCart(req)).rejects.toThrow(
        new HttpException('Failed to fetch cart', HttpStatus.INTERNAL_SERVER_ERROR),
      );
      expect(service.getCart).toHaveBeenCalledWith(userId);
    });
  });

  // --- Test Suite for addToCart ---
  describe('addToCart', () => {
    // Assume CreateCartItemDto requires name and price based on previous example
     const dto: CreateCartItemDto = { productId: 'prod-new', quantity: 1, name: 'Sample Product', price: 100 };
     const dtoFail: CreateCartItemDto = { productId: 'prod-fail', quantity: 1, name: 'Failed Product', price: 0 };

    it('should add an item to the cart successfully', async () => {
      const mockUpdatedCart = { userId, items: [dto] };
      mockCartService.addToCart.mockResolvedValue(mockUpdatedCart);

      const req = mockRequest(userId);
      const result = await controller.addToCart(req, dto);

      expect(result).toEqual(mockUpdatedCart);
      expect(service.addToCart).toHaveBeenCalledWith(userId, dto);
      expect(service.addToCart).toHaveBeenCalledTimes(1);
    });

    it('should throw HttpException if service fails', async () => {
      mockCartService.addToCart.mockRejectedValue(new Error('Service error'));

      const req = mockRequest(userId);

      await expect(controller.addToCart(req, dtoFail)).rejects.toThrow(
        new HttpException('Failed to add to cart', HttpStatus.INTERNAL_SERVER_ERROR),
      );
      expect(service.addToCart).toHaveBeenCalledWith(userId, dtoFail);
    });
  });

  // --- Test Suite for syncCart ---
  describe('syncCart', () => {
     // Assume SyncCartDto items also need name/price
     const dto: SyncCartDto = { items: [{ productId: 'prod-sync', quantity: 3, name: 'Sample Product', price: 100 }] };
     const dtoFail: SyncCartDto = { items: [{ productId: 'prod-sync-fail', quantity: 1, name: 'Sample Product', price: 100 }] };

    it('should sync the cart successfully', async () => {
      mockCartService.syncCart.mockResolvedValue(undefined); // syncCart might not return anything

      const req = mockRequest(userId);
      const result = await controller.syncCart(req, dto);

      expect(result).toEqual({ message: 'Cart synced successfully' });
      expect(service.syncCart).toHaveBeenCalledWith(userId, dto.items);
      expect(service.syncCart).toHaveBeenCalledTimes(1);
    });

    it('should throw HttpException if service fails', async () => {
      mockCartService.syncCart.mockRejectedValue(new Error('Service error'));

      const req = mockRequest(userId);

      await expect(controller.syncCart(req, dtoFail)).rejects.toThrow(
        new HttpException('Failed to sync cart', HttpStatus.INTERNAL_SERVER_ERROR),
      );
      expect(service.syncCart).toHaveBeenCalledWith(userId, dtoFail.items);
    });
  });

  // --- Test Suite for updateCartItem ---
  describe('updateCartItem', () => {
    const productId = 'prod-update';
    const dto: UpdateCartItemDto = { quantity: 5 };

    it('should update a cart item successfully', async () => {
      const mockUpdatedCartItem = { productId, quantity: 5 }; // Or the whole cart
      mockCartService.updateCartItem.mockResolvedValue(mockUpdatedCartItem);

      const req = mockRequest(userId);
      const result = await controller.updateCartItem(req, productId, dto);

      expect(result).toEqual(mockUpdatedCartItem);
      expect(service.updateCartItem).toHaveBeenCalledWith(userId, productId, dto);
      expect(service.updateCartItem).toHaveBeenCalledTimes(1);
    });

    it('should throw HttpException if service fails', async () => {
      mockCartService.updateCartItem.mockRejectedValue(new Error('Service error'));

      const req = mockRequest(userId);

      await expect(controller.updateCartItem(req, productId, dto)).rejects.toThrow(
        new HttpException('Failed to update cart item', HttpStatus.INTERNAL_SERVER_ERROR),
      );
      expect(service.updateCartItem).toHaveBeenCalledWith(userId, productId, dto);
    });
  });

  // --- Test Suite for removeFromCart ---
  describe('removeFromCart', () => {
    const productId = 'prod-remove';
    it('should remove an item from the cart successfully', async () => {
      mockCartService.removeFromCart.mockResolvedValue(true); // Simulate successful removal

      const req = mockRequest(userId);
      const result = await controller.removeFromCart(req, productId);

      expect(result).toEqual({ message: 'Item removed from cart' });
      expect(service.removeFromCart).toHaveBeenCalledWith(userId, productId);
      expect(service.removeFromCart).toHaveBeenCalledTimes(1);
    });

    it('should throw HttpException with 404 if item not found', async () => {
      mockCartService.removeFromCart.mockResolvedValue(false); // Simulate item not found

      const req = mockRequest(userId);

      await expect(controller.removeFromCart(req, productId)).rejects.toThrow(
        new HttpException('Item not found', HttpStatus.NOT_FOUND),
      );
      expect(service.removeFromCart).toHaveBeenCalledWith(userId, productId);
    });

    it('should throw HttpException with 500 if service fails unexpectedly', async () => {
       mockCartService.removeFromCart.mockRejectedValue(new Error('Database connection error'));

       const req = mockRequest(userId);

       await expect(controller.removeFromCart(req, productId)).rejects.toThrow(
         new HttpException('Failed to remove item', HttpStatus.INTERNAL_SERVER_ERROR),
       );
       expect(service.removeFromCart).toHaveBeenCalledWith(userId, productId);
    });
  });

  // --- Test Suite for clearCart ---
  describe('clearCart', () => {
    it('should clear the cart successfully', async () => {
      mockCartService.clearCart.mockResolvedValue(true); // Simulate successful clear

      const req = mockRequest(userId);
      const result = await controller.clearCart(req);

      expect(result).toEqual({ message: 'Cart cleared' });
      expect(service.clearCart).toHaveBeenCalledWith(userId);
      expect(service.clearCart).toHaveBeenCalledTimes(1);
    });

    it('should throw HttpException with 404 if cart already empty', async () => {
      mockCartService.clearCart.mockResolvedValue(false); // Simulate cart already empty

      const req = mockRequest(userId);

      await expect(controller.clearCart(req)).rejects.toThrow(
        new HttpException('Cart already empty', HttpStatus.NOT_FOUND),
      );
      expect(service.clearCart).toHaveBeenCalledWith(userId);
    });

     it('should throw HttpException with 500 if service fails unexpectedly', async () => {
       mockCartService.clearCart.mockRejectedValue(new Error('Cache clear failed'));

       const req = mockRequest(userId);

       await expect(controller.clearCart(req)).rejects.toThrow(
         new HttpException('Failed to clear cart', HttpStatus.INTERNAL_SERVER_ERROR),
       );
       expect(service.clearCart).toHaveBeenCalledWith(userId);
    });
  });
});
