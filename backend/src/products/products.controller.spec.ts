import { Test, TestingModule } from '@nestjs/testing';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { Product } from './entities/product.entity';
import { Store } from '../store/entities/store.entity'; 
import { User } from '../auth/user.entity'; 

// Create mock User data
const mockUser = (userId: string, role = 'seller'): User => ({
  userID: userId,
  role,
});

// Create mock Store data based on the entity
const createMockStore = (storeIdInput: string, userIdInput: string, storeNameInput: string): Store => {
  const user = mockUser(userIdInput);
  return {
    storeId: storeIdInput,
    userId: userIdInput,
    user: user, // Link to a mock User
    storeName: storeNameInput,
    standardPrice: parseFloat((Math.random() * 10 + 5).toFixed(2)), 
    standardTime: `${Math.floor(Math.random() * 3) + 2}-${Math.floor(Math.random() * 3) + 5} days`,
    expressPrice: parseFloat((Math.random() * 15 + 10).toFixed(2)), 
    expressTime: `${Math.floor(Math.random() * 2) + 1}-${Math.floor(Math.random() * 2) + 3} days`, 
    isActive: true,
    products: [], 
  };
};

//Create mock Product data
const mockProduct = (productId: number, isActiveProduct: boolean, overrides: Partial<Product> = {}): Product => {
  const storeUserId = `user-for-store-of-product-${productId}`;
  const storeIdForProduct = `store-of-product-${productId}`;
  const storeNameForProduct = `Test Store for Product ${productId}`;

  // Create a more accurate mockStore based on the entity
  const mockRelatedStore: Store = createMockStore(storeIdForProduct, storeUserId, storeNameForProduct);

  //return a mock product with all required product fields being populated
  return {
    prodId: productId,
    name: `Product ${productId}`,
    description: `Description for product ${productId}`,
    category: 'Test Category',
    price: parseFloat((Math.random() * 100).toFixed(2)),
    productquantity: Math.floor(Math.random() * 100),
    userId: storeUserId, 
    imageUrl: `http://example.com/product${productId}.jpg`,
    storeName: storeNameForProduct, 
    isActive: isActiveProduct,
    storeId: storeIdForProduct, 
    store: mockRelatedStore, 
    ...overrides,
  } as Product; 
};

describe('ProductsController', () => {
  let controller: ProductsController;
  let service: ProductsService;

  const mockProductsService = {
    findAllActive: jest.fn(),
    findAllInactive: jest.fn(),
    approveProduct: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        {
          provide: ProductsService,
          useValue: mockProductsService,
        },
      ],
    }).compile();

    controller = module.get<ProductsController>(ProductsController);
    service = module.get<ProductsService>(ProductsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should call productsService.findAllActive and return its result', async () => {
      const activeProducts = [mockProduct(1, true), mockProduct(2, true)];
      mockProductsService.findAllActive.mockResolvedValue(activeProducts);

      const result = await controller.findAll();

      expect(service.findAllActive).toHaveBeenCalledTimes(1);
      expect(result).toEqual(activeProducts);
    });

    it('should return an empty array if service.findAllActive returns empty', async () => {
      mockProductsService.findAllActive.mockResolvedValue([]);
      const result = await controller.findAll();
      expect(service.findAllActive).toHaveBeenCalledTimes(1);
      expect(result).toEqual([]);
    });
  });

  describe('findAllInactive', () => {
    it('should call productsService.findAllInactive and return its result', async () => {
      const inactiveProducts = [mockProduct(3, false), mockProduct(4, false)];
      mockProductsService.findAllInactive.mockResolvedValue(inactiveProducts);

      const result = await controller.findAllInactive();

      expect(service.findAllInactive).toHaveBeenCalledTimes(1);
      expect(result).toEqual(inactiveProducts);
    });

    it('should return an empty array if service.findAllInactive returns empty', async () => {
      mockProductsService.findAllInactive.mockResolvedValue([]);
      const result = await controller.findAllInactive();
      expect(service.findAllInactive).toHaveBeenCalledTimes(1);
      expect(result).toEqual([]);
    });
  });

  describe('approveProduct', () => {
    it('should call productsService.approveProduct with the numeric id and return its result', async () => {
      const productIdString = '5';
      const productIdNumber = 5;
      // Product before approval (isActive: false)
      const productBeforeApproval = mockProduct(productIdNumber, false);
      // Expected product after approval (isActive: true)
      const expectedResult = { ...productBeforeApproval, isActive: true };

      mockProductsService.approveProduct.mockResolvedValue(expectedResult);

      const result = await controller.approveProduct(productIdString);

      expect(service.approveProduct).toHaveBeenCalledWith(productIdNumber);
      expect(result).toEqual(expectedResult);
    });

    it('should handle cases where service.approveProduct indicates failure (e.g. product not found by returning null)', async () => {
      const productIdString = '99';
      const productIdNumber = 99;
      mockProductsService.approveProduct.mockResolvedValue(null); // Simulate product not found

      const result = await controller.approveProduct(productIdString);

      expect(service.approveProduct).toHaveBeenCalledWith(productIdNumber);
      expect(result).toBeNull();
    });
  });

  describe('remove', () => {
    it('should call productsService.remove with the numeric id and return its result', async () => {
      const productIdString = '6';
      const productIdNumber = 6;

      const removeConfirmation = { success: true, message: `Product ${productIdNumber} marked for removal.` };
      mockProductsService.remove.mockResolvedValue(removeConfirmation);

      const result = await controller.remove(productIdString);

      expect(service.remove).toHaveBeenCalledWith(productIdNumber);
      expect(result).toEqual(removeConfirmation);
    });

    it('should handle cases where service.remove indicates failure (e.g. product not found by returning null)', async () => {
      const productIdString = '101';
      const productIdNumber = 101;
      mockProductsService.remove.mockResolvedValue(null); // Simulate product not found or removal failed

      const result = await controller.remove(productIdString);
      expect(service.remove).toHaveBeenCalledWith(productIdNumber);
      expect(result).toBeNull();
    });
  });
});