
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StoreService } from './store.service';
import { Product } from './product.entity';
import { User } from '../auth/user.entity';
import { CreateProductDto, CreateStoreWithProductsDto } from './dto/create-product.dto';
import { UpdateProductDto } from '../products/dto/update-product.dto';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';

// Mock TypeORM Repository type
import { ObjectLiteral } from 'typeorm';

type MockRepository<T extends ObjectLiteral = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

// Factory function to create mock repositories
const createMockRepository = <T extends ObjectLiteral = ObjectLiteral>(): MockRepository<T> => ({
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  merge: jest.fn(),
  delete: jest.fn(),
});

describe('StoreService', () => {
  let service: StoreService;
  let productRepository: MockRepository<Product>;
  let userRepository: MockRepository<User>;

  // Mock data
  const mockUserId = 'user-test-123';
  const mockSellerUser: User = {
    userID: mockUserId, // Adjust property name if User entity is different
    role: 'seller', // Crucial for seller checks
  };
  const mockBuyerUser: User = {
    userID: 'buyer-test-456',
    role: 'buyer',
  };
  const mockStoreName = 'Test Store';

  const mockProductDto1: CreateProductDto = {
    name: 'Test Product 1',
    description: 'Desc 1',
    price: 10.99,
    category: 'Category A',
    imageUrl: 'http://example.com/img1.jpg',
    storeName: mockStoreName, // Optional here if inferred
  };

  const mockProductDto2: CreateProductDto = {
    name: 'Test Product 2',
    description: 'Desc 2',
    price: 25.00,
    category: 'Category B',
    imageUrl: 'http://example.com/img2.jpg',
    storeName: mockStoreName, // Optional here if inferred
  };

   const mockProductEntity1: Product = {
    prodId: 1,
    name: 'Test Product 1',
    description: 'Desc 1',
    price: 10.99,
    category: 'Category A',
    imageUrl: 'http://example.com/img1.jpg',
    userId: mockUserId,
    storeName: mockStoreName,
    isActive: true,
  };

   const mockProductEntity2: Product = {
    prodId: 2,
    name: 'Test Product 2',
    description: 'Desc 2',
    price: 25.00,
    category: 'Category B',
    imageUrl: 'http://example.com/img2.jpg',
    userId: mockUserId,
    storeName: mockStoreName,
    isActive: true,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StoreService,
        {
          provide: getRepositoryToken(Product),
          useValue: createMockRepository<Product>(),
        },
        {
          provide: getRepositoryToken(User),
          useValue: createMockRepository<User>(),
        },
      ],
    }).compile();

    service = module.get<StoreService>(StoreService);
    productRepository = module.get(getRepositoryToken(Product));
    userRepository = module.get(getRepositoryToken(User));

     // Reset mocks before each test if needed (jest.clearAllMocks() could also work)
     Object.values(productRepository).forEach(mockFn => mockFn.mockReset());
     Object.values(userRepository).forEach(mockFn => mockFn.mockReset());
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // --- Tests for createStoreWithProducts ---
  describe('createStoreWithProducts', () => {
    const createStoreDto: CreateStoreWithProductsDto = {
        storeName: mockStoreName,
        products: [mockProductDto1, mockProductDto2]
    };

    it('should create a store with products successfully for a seller', async () => {
        userRepository?.findOne?.mockResolvedValue(mockSellerUser);
        // Mock the 'create' method to return what 'save' should receive
        productRepository.create?.mockImplementation((prod) => ({ ...prod }));
        // Mock 'save' to return the saved entities (simulate DB response)
        productRepository.save?.mockResolvedValue([mockProductEntity1, mockProductEntity2]);

        const result = await service.createStoreWithProducts(createStoreDto, mockUserId);

        expect(userRepository.findOne).toHaveBeenCalledWith({ where: { userID: mockUserId } });
        expect(productRepository.create).toHaveBeenCalledTimes(createStoreDto.products.length);
        expect(productRepository.create).toHaveBeenCalledWith(expect.objectContaining({ ...mockProductDto1, userId: mockUserId, storeName: mockStoreName, isActive: true }));
        expect(productRepository.create).toHaveBeenCalledWith(expect.objectContaining({ ...mockProductDto2, userId: mockUserId, storeName: mockStoreName, isActive: true }));
        expect(productRepository.save).toHaveBeenCalledWith(expect.arrayContaining([
            expect.objectContaining({ name: mockProductDto1.name }),
            expect.objectContaining({ name: mockProductDto2.name }),
        ]));
        expect(result).toEqual([mockProductEntity1, mockProductEntity2]);
    });

    it('should throw NotFoundException if user not found', async () => {
        userRepository.findOne?.mockResolvedValue(null);
        await expect(service.createStoreWithProducts(createStoreDto, 'unknown-user')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if user is not a seller', async () => {
        userRepository.findOne?.mockResolvedValue(mockBuyerUser); // Use a buyer user
        await expect(service.createStoreWithProducts(createStoreDto, mockBuyerUser.userID)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if storeName is missing', async () => {
        const dtoWithoutStoreName = { ...createStoreDto, storeName: '' };
        userRepository.findOne?.mockResolvedValue(mockSellerUser);
        await expect(service.createStoreWithProducts(dtoWithoutStoreName, mockUserId)).rejects.toThrow(BadRequestException);
    });

     it('should throw BadRequestException if a product imageUrl is missing', async () => {
       const dtoWithMissingImage = {
         ...createStoreDto,
         products: [{ ...mockProductDto1, imageUrl: '' }]
       };
        userRepository.findOne?.mockResolvedValue(mockSellerUser);
        await expect(service.createStoreWithProducts(dtoWithMissingImage, mockUserId)).rejects.toThrow(BadRequestException);
        expect(productRepository.save).not.toHaveBeenCalled(); // Ensure save wasn't called
    });
  });

  // --- Tests for getStoreByUserId ---
  describe('getStoreByUserId', () => {
    it('should return store name and products for a user', async () => {
        const mockProducts = [mockProductEntity1, mockProductEntity2];
        productRepository.find?.mockResolvedValue(mockProducts);

        const result = await service.getStoreByUserId(mockUserId);

        expect(productRepository.find).toHaveBeenCalledWith({
            where: { userId: mockUserId },
            order: { prodId: 'ASC' }
        });
        expect(userRepository.findOne).not.toHaveBeenCalled(); // Shouldn't need to check user if products found
        expect(result).toEqual({
            storeName: mockStoreName,
            products: mockProducts
        });
    });

     it('should throw NotFoundException (No store...) if user exists but has no products', async () => {
        productRepository.find?.mockResolvedValue([]); // No products found
        userRepository.findOne?.mockResolvedValue(mockSellerUser); // User does exist

        await expect(service.getStoreByUserId(mockUserId)).rejects.toThrow(NotFoundException);
        await expect(service.getStoreByUserId(mockUserId)).rejects.toThrow('No store or products found for this user.');
        expect(productRepository.find).toHaveBeenCalledWith({ where: { userId: mockUserId }, order: { prodId: 'ASC' } });
        expect(userRepository.findOne).toHaveBeenCalledWith({ where: { userID: mockUserId } });
     });

     it('should throw NotFoundException (User not found) if user does not exist', async () => {
        productRepository.find?.mockResolvedValue([]); // No products found
        userRepository.findOne?.mockResolvedValue(null); // User does NOT exist

        await expect(service.getStoreByUserId('unknown-user')).rejects.toThrow(NotFoundException);
        await expect(service.getStoreByUserId('unknown-user')).rejects.toThrow('User not found');
        expect(productRepository.find).toHaveBeenCalledWith({ where: { userId: 'unknown-user' }, order: { prodId: 'ASC' } });
        expect(userRepository.findOne).toHaveBeenCalledWith({ where: { userID: 'unknown-user' } });
     });
  });

  // --- Tests for addProduct ---
  describe('addProduct', () => {
    it('should add a product successfully when storeName is provided', async () => {
        const dtoWithStoreName = { ...mockProductDto1 }; // Already has storeName
        userRepository.findOne?.mockResolvedValue(mockSellerUser);
        productRepository.create?.mockImplementation((prod) => ({ ...prod }));
        productRepository.save?.mockResolvedValue(mockProductEntity1);

        const result = await service.addProduct(mockUserId, dtoWithStoreName);

        expect(userRepository.findOne).toHaveBeenCalledWith({ where: { userID: mockUserId } });
        expect(productRepository.find).not.toHaveBeenCalled(); // Should not need to find existing products
        expect(productRepository.create).toHaveBeenCalledWith(expect.objectContaining({ ...dtoWithStoreName, userId: mockUserId, isActive: true }));
        expect(productRepository.save).toHaveBeenCalled();
        expect(result).toEqual(mockProductEntity1);
    });

    it('should add a product successfully and infer storeName if not provided', async () => {
        const dtoWithoutStoreName = { ...mockProductDto1, storeName: undefined };
        const existingProduct = { ...mockProductEntity2 }; // Use a different product to simulate existing one

        userRepository.findOne?.mockResolvedValue(mockSellerUser);
        productRepository.find?.mockResolvedValue([existingProduct]); // Simulate existing product
        productRepository.create?.mockImplementation((prod) => ({ ...prod }));
        productRepository.save?.mockResolvedValue({ ...mockProductEntity1, storeName: existingProduct.storeName }); // Simulate saved with inferred name

        const result = await service.addProduct(mockUserId, dtoWithoutStoreName);

        expect(userRepository.findOne).toHaveBeenCalledWith({ where: { userID: mockUserId } });
        expect(productRepository.find).toHaveBeenCalledWith({ where: { userId: mockUserId } }); // Called to infer name
        expect(productRepository.create).toHaveBeenCalledWith(expect.objectContaining({
            ...dtoWithoutStoreName,
            userId: mockUserId,
            storeName: existingProduct.storeName, // Check inferred name
            isActive: true
        }));
        expect(productRepository.save).toHaveBeenCalled();
        expect(result.storeName).toEqual(existingProduct.storeName);
    });

    it('should throw NotFoundException if user not found', async () => {
        userRepository.findOne?.mockResolvedValue(null);
        await expect(service.addProduct('unknown-user', mockProductDto1)).rejects.toThrow(NotFoundException);
    });

     it('should throw BadRequestException if user is not a seller', async () => {
        userRepository.findOne?.mockResolvedValue(mockBuyerUser);
        await expect(service.addProduct(mockBuyerUser.userID, mockProductDto1)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if storeName is required (first product)', async () => {
        const dtoWithoutStoreName = { ...mockProductDto1, storeName: undefined };
        userRepository.findOne?.mockResolvedValue(mockSellerUser);
        productRepository.find?.mockResolvedValue([]); // NO existing products

        await expect(service.addProduct(mockUserId, dtoWithoutStoreName)).rejects.toThrow(BadRequestException);
        await expect(service.addProduct(mockUserId, dtoWithoutStoreName)).rejects.toThrow('Store name is required when adding the first product.');
    });

     it('should throw BadRequestException if imageUrl is missing', async () => {
        const dtoWithoutImage = { ...mockProductDto1, imageUrl: '' };
        userRepository.findOne?.mockResolvedValue(mockSellerUser);
        // Mock find to simulate store name inference if needed, or just let it proceed
        productRepository.find?.mockResolvedValue([mockProductEntity2]);

        await expect(service.addProduct(mockUserId, dtoWithoutImage)).rejects.toThrow(BadRequestException);
        await expect(service.addProduct(mockUserId, dtoWithoutImage)).rejects.toThrow('Image URL is missing for the new product.');
        expect(productRepository.save).not.toHaveBeenCalled();
    });
  });

  // --- Tests for updateProduct ---
  describe('updateProduct', () => {
     const productId = 1;
     const updateDto: UpdateProductDto = {
       name: 'Updated Name',
       price: 99.99
     };
     const existingProduct = { ...mockProductEntity1, prodId: productId }; // Ensure ID and owner match
     const updatedProduct = { ...existingProduct, ...updateDto };

    it('should update a product successfully', async () => {
        productRepository.findOne?.mockResolvedValue(existingProduct);
        // merge doesn't return, it modifies the first arg
        productRepository.merge?.mockImplementation((target, source) => Object.assign(target, source));
        productRepository.save?.mockResolvedValue(updatedProduct); // Return the merged+saved object

        const result = await service.updateProduct(productId, updateDto, mockUserId);

        expect(productRepository.findOne).toHaveBeenCalledWith({ where: { prodId: productId } });
        expect(productRepository.merge).toHaveBeenCalledWith(existingProduct, updateDto);
        expect(productRepository.save).toHaveBeenCalledWith(existingProduct); // Save the merged object
        expect(result).toEqual(updatedProduct);
    });

     it('should throw NotFoundException if product not found', async () => {
        productRepository.findOne?.mockResolvedValue(null);
        await expect(service.updateProduct(999, updateDto, mockUserId)).rejects.toThrow(NotFoundException);
     });

     it('should throw ForbiddenException if user does not own the product', async () => {
        const productOwnedByOther = { ...existingProduct, userId: 'other-user-id' };
        productRepository.findOne?.mockResolvedValue(productOwnedByOther);

        await expect(service.updateProduct(productId, updateDto, mockUserId)).rejects.toThrow(ForbiddenException);
        expect(productRepository.save).not.toHaveBeenCalled();
     });
  });

  // --- Tests for deleteProduct ---
  describe('deleteProduct', () => {
      const productId = 1;
      const existingProduct = { ...mockProductEntity1, prodId: productId };

     it('should delete a product successfully', async () => {
        productRepository.findOne?.mockResolvedValue(existingProduct);
        productRepository.delete?.mockResolvedValue({ affected: 1, raw: {} }); // Simulate successful delete

        await service.deleteProduct(productId, mockUserId);

        expect(productRepository.findOne).toHaveBeenCalledWith({ where: { prodId: productId } });
        expect(productRepository.delete).toHaveBeenCalledWith(productId);
     });

      it('should throw NotFoundException if product not found', async () => {
        productRepository.findOne?.mockResolvedValue(null);
        await expect(service.deleteProduct(999, mockUserId)).rejects.toThrow(NotFoundException);
        expect(productRepository.delete).not.toHaveBeenCalled();
     });

      it('should throw ForbiddenException if user does not own the product', async () => {
        const productOwnedByOther = { ...existingProduct, userId: 'other-user-id' };
        productRepository.findOne?.mockResolvedValue(productOwnedByOther);

        await expect(service.deleteProduct(productId, mockUserId)).rejects.toThrow(ForbiddenException);
        expect(productRepository.delete).not.toHaveBeenCalled();
     });

     it('should throw NotFoundException if delete result affected is 0', async () => {
        productRepository.findOne?.mockResolvedValue(existingProduct);
        productRepository.delete?.mockResolvedValue({ affected: 0, raw: {} }); // Simulate delete failing

        await expect(service.deleteProduct(productId, mockUserId)).rejects.toThrow(NotFoundException);
        await expect(service.deleteProduct(productId, mockUserId)).rejects.toThrow(/could not be deleted/);
     });
  });
});

