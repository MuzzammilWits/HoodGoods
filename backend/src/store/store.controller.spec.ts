import { Test, TestingModule } from '@nestjs/testing';
import { StoreController } from './store.controller';
import { StoreService } from './store.service';
import { AuthGuard } from '@nestjs/passport';
import { CreateProductDto, CreateStoreWithProductsDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { BadRequestException, HttpStatus } from '@nestjs/common';

// Mock Type for StoreService
type MockStoreService = {
  createStoreWithProducts: jest.Mock;
  getStoreByUserId: jest.Mock;
  addProduct: jest.Mock;
  updateProduct: jest.Mock;
  deleteProduct: jest.Mock;
};

// Factory function for creating the mock service
const storeServiceMockFactory = (): MockStoreService => ({
  createStoreWithProducts: jest.fn(),
  getStoreByUserId: jest.fn(),
  addProduct: jest.fn(),
  updateProduct: jest.fn(),
  deleteProduct: jest.fn(),
});

describe('StoreController', () => {
  let controller: StoreController;
  let service: MockStoreService;

  const mockUserId = 'user-abc-123';
  const mockProductId = 1;
  const mockStore = { storeId: 'store-xyz-789', name: 'My Test Store', userId: mockUserId, products: [] };
  const mockProduct = { prodId: mockProductId, name: 'Test Product', price: 10, category: 'Test', description: '', imageUrl: '', isActive: true, storeId: mockStore.storeId };

  const mockRequest = {
    user: {
      sub: mockUserId,
    },
  };

  const mockRequestWithoutUser = {
    user: undefined, // Simulate missing user
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StoreController],
      providers: [
        // Provide the mock factory for StoreService
        { provide: StoreService, useFactory: storeServiceMockFactory },
      ],
    })
    // --- Mocking the AuthGuard ---
    // We assume the guard passes and attaches the user in successful scenarios.
    // For failure scenarios (no user), we pass a modified mock request.
    // This avoids needing to explicitly mock the guard's canActivate method here.
    // .overrideGuard(AuthGuard('jwt'))
    // .useValue({ canActivate: jest.fn(() => true) }) // Alternative way to mock guard
    .compile();

    controller = module.get<StoreController>(StoreController);
    // Get the mock instance
    service = module.get(StoreService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // --- Test Cases for createStore ---
  describe('createStore', () => {
    const createStoreDto: CreateStoreWithProductsDto = {
      storeName: 'New Store',
      products: [{ name: 'Initial Product', price: 25, category: 'Gadgets', description: 'desc', imageUrl: 'img.jpg' }],
    };

    it('should call storeService.createStoreWithProducts and return the result', async () => {
      const expectedResult = { ...mockStore, name: createStoreDto.storeName, products: [mockProduct] };
      service.createStoreWithProducts.mockResolvedValue(expectedResult);

      const result = await controller.createStore(createStoreDto, mockRequest);

      expect(service.createStoreWithProducts).toHaveBeenCalledWith(createStoreDto, mockUserId);
      expect(result).toEqual(expectedResult);
    });

    it('should throw BadRequestException if user ID is missing', async () => {
      await expect(controller.createStore(createStoreDto, mockRequestWithoutUser))
        .rejects.toThrow(BadRequestException);
      await expect(controller.createStore(createStoreDto, { user: {} } as any)) // Test with user but no sub
        .rejects.toThrow(BadRequestException);
      expect(service.createStoreWithProducts).not.toHaveBeenCalled();
    });
  });

  // --- Test Cases for getMyStore ---
  describe('getMyStore', () => {
    it('should call storeService.getStoreByUserId and return the result', async () => {
      service.getStoreByUserId.mockResolvedValue(mockStore);

      const result = await controller.getMyStore(mockRequest);

      expect(service.getStoreByUserId).toHaveBeenCalledWith(mockUserId);
      expect(result).toEqual(mockStore);
    });

    it('should throw BadRequestException if user ID is missing', async () => {
      await expect(controller.getMyStore(mockRequestWithoutUser))
        .rejects.toThrow(BadRequestException);
      expect(service.getStoreByUserId).not.toHaveBeenCalled();
    });
  });

  // --- Test Cases for addProduct ---
  describe('addProduct', () => {
    const productDto: CreateProductDto = {
        name: 'Another Product',
        price: 50,
        category: 'Books',
        description: 'A good read',
        imageUrl: 'book.png'
    };
    const expectedAddedProduct = { ...mockProduct, name: productDto.name, prodId: 2 };

    it('should call storeService.addProduct and return the new product', async () => {
        service.addProduct.mockResolvedValue(expectedAddedProduct);

        const result = await controller.addProduct(productDto, mockRequest);

        expect(service.addProduct).toHaveBeenCalledWith(mockUserId, productDto);
        expect(result).toEqual(expectedAddedProduct);
    });

    it('should throw BadRequestException if user ID is missing', async () => {
        await expect(controller.addProduct(productDto, mockRequestWithoutUser))
          .rejects.toThrow(BadRequestException);
        expect(service.addProduct).not.toHaveBeenCalled();
    });
  });

  // --- Test Cases for updateProduct ---
  describe('updateProduct', () => {
    const updateDto: UpdateProductDto = { name: 'Updated Product Name', price: 15 };
    const expectedUpdatedProduct = { ...mockProduct, ...updateDto };

    it('should call storeService.updateProduct with correct parameters', async () => {
        service.updateProduct.mockResolvedValue(expectedUpdatedProduct);

        const result = await controller.updateProduct(mockProductId, updateDto, mockRequest);

        expect(service.updateProduct).toHaveBeenCalledWith(mockProductId, updateDto, mockUserId);
        expect(result).toEqual(expectedUpdatedProduct);
    });

    it('should throw BadRequestException if user ID is missing', async () => {
        await expect(controller.updateProduct(mockProductId, updateDto, mockRequestWithoutUser))
            .rejects.toThrow(BadRequestException);
        expect(service.updateProduct).not.toHaveBeenCalled();
    });

    // Note: ParseIntPipe failure cases are typically handled by NestJS framework testing, not controller unit tests
  });

  // --- Test Cases for deleteProduct ---
  describe('deleteProduct', () => {
    it('should call storeService.deleteProduct with correct parameters and return void', async () => {
        // deleteProduct service method might return void or some confirmation
        service.deleteProduct.mockResolvedValue(undefined); // Simulate void return

        // Use await directly as the controller method returns Promise<void>
        await controller.deleteProduct(mockProductId, mockRequest);

        // Check if the service method was called correctly
        expect(service.deleteProduct).toHaveBeenCalledWith(mockProductId, mockUserId);

        // No specific return value to check due to @HttpCode(HttpStatus.NO_CONTENT)
        // The absence of an error is the success indicator here.
    });

    it('should throw BadRequestException if user ID is missing', async () => {
        await expect(controller.deleteProduct(mockProductId, mockRequestWithoutUser))
            .rejects.toThrow(BadRequestException);
        expect(service.deleteProduct).not.toHaveBeenCalled();
    });
  });

});