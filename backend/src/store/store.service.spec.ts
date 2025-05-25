import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, EntityManager, In, DeleteResult } from 'typeorm';
import {
  NotFoundException,
  InternalServerErrorException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';

import { StoreService, StoreDeliveryDetails } from './store.service';
import { Store } from './entities/store.entity';
import { Product } from '../products/entities/product.entity';
import { User } from '../auth/user.entity';
import { CreateStoreDto } from './dto/create-store.dto';
import { CreateProductDto } from '../products/dto/create-product.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { UpdateProductDto } from '../products/dto/update-product.dto';

// Mock TypeORM repository methods
const mockRepository = () => ({
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
  findOneOrFail: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  remove: jest.fn(), // This is for the repository's remove
  merge: jest.fn((entity, dto) => Object.assign(entity, dto)),
  findAndCount: jest.fn(),
  query: jest.fn(),
});

// Mock EntityManager and its transaction capabilities
const mockEntityManager = {
  transaction: jest.fn(),
  getRepository: jest.fn().mockImplementation(() => mockRepository()),
  // Mock methods that are called directly on transactionalEntityManager
  remove: jest.fn(), // This is for entityManager.remove
  update: jest.fn(), // This is for entityManager.update
  findOne: jest.fn(), // This is for entityManager.findOne
};


describe('StoreService', () => {
  let service: StoreService;
  let storeRepository: Repository<Store>;
  let productRepository: Repository<Product>;
  let userRepository: Repository<User>;
  let entityManager: EntityManager;

  const mockUserId = 'user-uuid-123';
  const mockStoreId = 'store-uuid-456';
  const mockProductId = 1;

  const mockUser: User = {
    userID: mockUserId,
    role: 'seller',
    auth0Sub: 'auth0|sub123',
  } as User;

  const mockProductDto: CreateProductDto = {
    name: 'Test Product',
    description: 'A great test product',
    price: 19.99,
    category: 'Test Category',
    imageUrl: 'http://example.com/image.jpg',
    productquantity: 10,
  };

  const mockStore: Store = {
    storeId: mockStoreId,
    userId: mockUserId,
    storeName: 'Test Store',
    standardPrice: 50,
    standardTime: '3-5 days',
    expressPrice: 100,
    expressTime: '1-2 days',
    isActive: true,
    products: [],
    user: mockUser,
  } as Store;

   const mockProduct: Product = {
    prodId: mockProductId,
    name: 'Test Product',
    description: 'A great test product',
    price: 19.99,
    category: 'Test Category',
    imageUrl: 'http://example.com/image.jpg',
    productquantity: 10,
    userId: mockUserId,
    storeId: mockStoreId,
    storeName: mockStore.storeName,
    isActive: false,
    store: mockStore,
  } as Product;


  beforeEach(async () => {
    const transactionalRepoMock = {
      ...mockRepository(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      update: jest.fn(),
    };

    // Reset direct entityManager method mocks
    mockEntityManager.remove.mockReset();
    mockEntityManager.update.mockReset();
    mockEntityManager.findOne.mockReset();
    mockEntityManager.getRepository.mockImplementation(() => transactionalRepoMock);


    (mockEntityManager.transaction as jest.Mock).mockImplementation(async (cb) => {
      return cb(mockEntityManager);
    });


    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StoreService,
        { provide: getRepositoryToken(Store), useFactory: mockRepository },
        { provide: getRepositoryToken(Product), useFactory: mockRepository },
        { provide: getRepositoryToken(User), useFactory: mockRepository },
        { provide: EntityManager, useValue: mockEntityManager },
      ],
    }).compile();

    service = module.get<StoreService>(StoreService);
    storeRepository = module.get<Repository<Store>>(getRepositoryToken(Store));
    productRepository = module.get<Repository<Product>>(getRepositoryToken(Product));
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    entityManager = module.get<EntityManager>(EntityManager);

    jest.clearAllMocks();

    const freshTransactionalStoreRepoMock = mockRepository();
    const freshTransactionalProductRepoMock = mockRepository();
    const freshTransactionalUserRepoMock = mockRepository();

    (entityManager.getRepository as jest.Mock).mockImplementation((entity) => {
        if (entity === Store) return freshTransactionalStoreRepoMock;
        if (entity === Product) return freshTransactionalProductRepoMock;
        if (entity === User) return freshTransactionalUserRepoMock;
        return mockRepository();
    });
    (entityManager.transaction as jest.Mock).mockImplementation(async (cb) => cb(entityManager));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // --- Test Suite for createStoreWithProducts ---
  describe('createStoreWithProducts', () => {
    let createStoreDto: CreateStoreDto;
    let transactionalStoreRepoMock: ReturnType<typeof mockRepository>;
    let transactionalProductRepoMock: ReturnType<typeof mockRepository>;
    let transactionalUserRepoMock: ReturnType<typeof mockRepository>;

    beforeEach(() => {
        createStoreDto = {
            storeName: 'My New Online Store',
            standardPrice: 60,
            standardTime: '2-4 days',
            expressPrice: 120,
            expressTime: '1 day',
            products: [mockProductDto],
        };

        transactionalStoreRepoMock = mockRepository();
        transactionalProductRepoMock = mockRepository();
        transactionalUserRepoMock = mockRepository();

        (entityManager.getRepository as jest.Mock)
            .mockImplementation((entity) => {
                if (entity === Store) return transactionalStoreRepoMock;
                if (entity === Product) return transactionalProductRepoMock;
                if (entity === User) return transactionalUserRepoMock;
                return mockRepository();
            });

        (entityManager.transaction as jest.Mock).mockImplementation(async (callback) => {
            return callback(entityManager);
        });
    });

    it('should successfully create a store and products for a valid user without an existing store', async () => {
      transactionalUserRepoMock.findOne.mockResolvedValue(mockUser);
      transactionalStoreRepoMock.findOne.mockResolvedValue(null);

      const { products: productDtosForCreation, ...storePropertiesFromDto } = createStoreDto;

      const createdStoreEntity = {
        ...storePropertiesFromDto,
        storeId: 'new-store-id',
        userId: mockUserId,
        products: [],
      };
      transactionalStoreRepoMock.create.mockReturnValue(createdStoreEntity);
      transactionalStoreRepoMock.save.mockResolvedValue(createdStoreEntity);

      const createdProductEntities = productDtosForCreation.map(p => ({ ...mockProduct, name: p.name, storeId: createdStoreEntity.storeId, prodId: Math.random() }));
      transactionalProductRepoMock.create.mockImplementation(dto => ({...dto, prodId: Math.random()}));
      transactionalProductRepoMock.save.mockResolvedValue(createdProductEntities);

      transactionalStoreRepoMock.findOneOrFail.mockResolvedValue(createdStoreEntity);


      const result = await service.createStoreWithProducts(createStoreDto, mockUserId);

      expect(transactionalUserRepoMock.findOne).toHaveBeenCalledWith({ where: { userID: mockUserId } });
      expect(transactionalStoreRepoMock.findOne).toHaveBeenCalledWith({ where: { userId: mockUserId } });
      expect(transactionalStoreRepoMock.create).toHaveBeenCalledWith(expect.objectContaining({
        storeName: createStoreDto.storeName,
        userId: mockUserId,
        standardPrice: createStoreDto.standardPrice
      }));
      expect(transactionalStoreRepoMock.save).toHaveBeenCalledWith(createdStoreEntity);
      expect(transactionalProductRepoMock.create).toHaveBeenCalledTimes(productDtosForCreation.length);
       // Ensure product DTOs are correctly mapped and saved
      const expectedProductEntitiesToSave = productDtosForCreation.map(productDto => (
        expect.objectContaining({
          name: productDto.name,
          description: productDto.description,
          price: productDto.price,
          category: productDto.category,
          imageUrl: productDto.imageUrl,
          productquantity: productDto.productquantity,
          userId: mockUserId,
          storeId: createdStoreEntity.storeId,
          storeName: createdStoreEntity.storeName,
          isActive: false,
        })
      ));
      expect(transactionalProductRepoMock.save).toHaveBeenCalledWith(expectedProductEntitiesToSave);
      expect(transactionalStoreRepoMock.findOneOrFail).toHaveBeenCalledWith({ where: { storeId: createdStoreEntity.storeId } });
      expect(result).toEqual(createdStoreEntity);
    });

    it('should throw NotFoundException if user is not found', async () => {
      transactionalUserRepoMock.findOne.mockResolvedValue(null);

      await expect(service.createStoreWithProducts(createStoreDto, mockUserId))
        .rejects.toThrow(NotFoundException);
      expect(entityManager.transaction).toHaveBeenCalled();
    });

    it('should throw ConflictException if user already has a store', async () => {
      transactionalUserRepoMock.findOne.mockResolvedValue(mockUser);
      transactionalStoreRepoMock.findOne.mockResolvedValue(mockStore);

      await expect(service.createStoreWithProducts(createStoreDto, mockUserId))
        .rejects.toThrow(ConflictException);
      expect(entityManager.transaction).toHaveBeenCalled();
    });

    it('should throw InternalServerErrorException on transaction failure (e.g., product save fails)', async () => {
        transactionalUserRepoMock.findOne.mockResolvedValue(mockUser);
        transactionalStoreRepoMock.findOne.mockResolvedValue(null);

        const { products: _productDtos, ...storePropertiesFromDto } = createStoreDto;
        const createdStoreEntity = {
            ...storePropertiesFromDto,
            storeId: 'new-store-id',
            userId: mockUserId,
            products: []
        };
        transactionalStoreRepoMock.create.mockReturnValue(createdStoreEntity);
        transactionalStoreRepoMock.save.mockResolvedValue(createdStoreEntity);
        transactionalProductRepoMock.create.mockImplementation(dto => ({...dto}));
        transactionalProductRepoMock.save.mockRejectedValue(new Error("DB product save error"));

        await expect(service.createStoreWithProducts(createStoreDto, mockUserId))
            .rejects.toThrow(InternalServerErrorException);
        expect(entityManager.transaction).toHaveBeenCalled();
    });
  });

  // --- Test Suite for getStoreByUserId ---
  describe('getStoreByUserId', () => {
    it('should return store and products if store exists for user', async () => {
      (storeRepository.findOne as jest.Mock).mockResolvedValue(mockStore);
      (productRepository.find as jest.Mock).mockResolvedValue([mockProduct]);

      const result = await service.getStoreByUserId(mockUserId);

      expect(storeRepository.findOne).toHaveBeenCalledWith({ where: { userId: mockUserId } });
      expect(productRepository.find).toHaveBeenCalledWith({ where: { storeId: mockStore.storeId }, order: { prodId: 'ASC' } });
      expect(result).toEqual({ store: mockStore, products: [mockProduct] });
    });

    it('should throw NotFoundException (User not found) if user does not exist', async () => {
      (storeRepository.findOne as jest.Mock).mockResolvedValue(null);
      (userRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.getStoreByUserId(mockUserId)).rejects.toThrow(new NotFoundException('User not found'));
      expect(storeRepository.findOne).toHaveBeenCalledWith({ where: { userId: mockUserId } });
      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { userID: mockUserId } });
    });

    it('should throw NotFoundException (No store found) if user exists but has no store', async () => {
      (storeRepository.findOne as jest.Mock).mockResolvedValue(null);
      (userRepository.findOne as jest.Mock).mockResolvedValue(mockUser);

      await expect(service.getStoreByUserId(mockUserId)).rejects.toThrow(new NotFoundException(`No store found for this user. Please create a store.`));
      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { userID: mockUserId } });
    });
  });

  // --- Test Suite for getAllStoresWithProducts ---
  describe('getAllStoresWithProducts', () => {
    it('should return all stores with their products', async () => {
        const mockStoresWithProducts = [{ ...mockStore, products: [mockProduct] }];
        (storeRepository.find as jest.Mock).mockResolvedValue(mockStoresWithProducts);

        const result = await service.getAllStoresWithProducts();
        expect(storeRepository.find).toHaveBeenCalledWith({
            relations: ['products'],
            order: { storeName: 'ASC', products: { prodId: 'ASC' } },
        });
        expect(result).toEqual(mockStoresWithProducts);
    });

    it('should return an empty array if no stores exist', async () => {
        (storeRepository.find as jest.Mock).mockResolvedValue([]);
        const result = await service.getAllStoresWithProducts();
        expect(result).toEqual([]);
    });
  });

  // --- Test Suite for getInactiveStoresWithProducts ---
  describe('getInactiveStoresWithProducts', () => {
    it('should return only inactive stores with only their inactive products', async () => {
        const activeProduct = { ...mockProduct, prodId: 2, isActive: true };
        const inactiveProduct = { ...mockProduct, prodId: 3, isActive: false };
        const baseInactiveStore = { ...mockStore, storeId: 'inactive-store-1', isActive: false };
        const inactiveStoreWithProducts = { ...baseInactiveStore, products: [activeProduct, inactiveProduct] };

        (storeRepository.find as jest.Mock).mockResolvedValue([inactiveStoreWithProducts]);

        const result = await service.getInactiveStoresWithProducts();

        expect(storeRepository.find).toHaveBeenCalledWith({
            where: { isActive: false },
            relations: ['products'],
            order: { storeName: 'ASC' }
        });
        expect(result.length).toBe(1);
        expect(result[0].storeId).toBe(inactiveStoreWithProducts.storeId);
        expect(result[0].products.length).toBe(1);
        expect(result[0].products[0].prodId).toBe(inactiveProduct.prodId);
        expect(result[0].products[0].isActive).toBe(false);
    });
  });

  // --- Test Suite for approveStore ---
  describe('approveStore', () => {
    it('should approve an existing store', async () => {
        const inactiveStore = { ...mockStore, isActive: false };
        (storeRepository.findOne as jest.Mock).mockResolvedValue(inactiveStore);
        (storeRepository.save as jest.Mock).mockImplementation(async store => ({ ...store, isActive: true }));

        const result = await service.approveStore(mockStoreId);
        expect(storeRepository.findOne).toHaveBeenCalledWith({ where: { storeId: mockStoreId } });
        expect(storeRepository.save).toHaveBeenCalledWith({ ...inactiveStore, isActive: true });
        expect(result.isActive).toBe(true);
    });
    it('should throw NotFoundException if store to approve is not found', async () => {
        (storeRepository.findOne as jest.Mock).mockResolvedValue(null);
        await expect(service.approveStore(mockStoreId)).rejects.toThrow(NotFoundException);
    });
  });

  // --- Test Suite for rejectStore ---
  describe('rejectStore', () => {
    beforeEach(() => {
        // Ensure entityManager's direct methods are mocked for this describe block
        (entityManager.findOne as jest.Mock).mockReset();
        (entityManager.remove as jest.Mock).mockReset();
        (entityManager.update as jest.Mock).mockReset();

        (entityManager.transaction as jest.Mock).mockImplementation(async (callback) => {
            return callback(entityManager); // Pass the correctly mocked entityManager
        });
    });

    it('should reject (remove) an existing store and update user role if seller', async () => {
        (storeRepository.findOne as jest.Mock).mockResolvedValue(mockStore);
        (entityManager.findOne as jest.Mock).mockResolvedValue(mockUser); // For User findOne within transaction
        (entityManager.remove as jest.Mock).mockResolvedValue(undefined); // For Store remove within transaction
        (entityManager.update as jest.Mock).mockResolvedValue({ affected: 1 }); // For User update within transaction

        await service.rejectStore(mockStoreId);

        expect(storeRepository.findOne).toHaveBeenCalledWith({ where: { storeId: mockStoreId } });
        expect(entityManager.transaction).toHaveBeenCalled();
        expect(entityManager.remove).toHaveBeenCalledWith(Store, mockStore); // Corrected assertion
        expect(entityManager.findOne).toHaveBeenCalledWith(User, { where: { userID: mockStore.userId }});
        expect(entityManager.update).toHaveBeenCalledWith(User, { userID: mockStore.userId }, { role: 'buyer' });
    });

    it('should reject (remove) store and NOT update user role if not seller', async () => {
        const buyerUser = { ...mockUser, role: 'buyer' };
        const storeOfBuyer = { ...mockStore, user: buyerUser, userId: buyerUser.userID };
        (storeRepository.findOne as jest.Mock).mockResolvedValue(storeOfBuyer);
        (entityManager.findOne as jest.Mock).mockResolvedValue(buyerUser); // User is a buyer
        (entityManager.remove as jest.Mock).mockResolvedValue(undefined);

        await service.rejectStore(storeOfBuyer.storeId);

        expect(storeRepository.findOne).toHaveBeenCalledWith({ where: { storeId: storeOfBuyer.storeId } });
        expect(entityManager.transaction).toHaveBeenCalled();
        expect(entityManager.remove).toHaveBeenCalledWith(Store, storeOfBuyer); // Corrected assertion
        expect(entityManager.findOne).toHaveBeenCalledWith(User, { where: { userID: storeOfBuyer.userId }});
        expect(entityManager.update).not.toHaveBeenCalled();
    });


     it('should throw NotFoundException if store to reject is not found', async () => {
        (storeRepository.findOne as jest.Mock).mockResolvedValue(null);
        await expect(service.rejectStore(mockStoreId)).rejects.toThrow(NotFoundException);
        expect(entityManager.transaction).not.toHaveBeenCalled();
    });

    it('should throw InternalServerErrorException if transaction fails (e.g. entityManager.remove fails)', async () => {
        (storeRepository.findOne as jest.Mock).mockResolvedValue(mockStore);
        (entityManager.remove as jest.Mock).mockRejectedValue(new Error("DB remove error"));

        await expect(service.rejectStore(mockStoreId)).rejects.toThrow(InternalServerErrorException);
        expect(entityManager.transaction).toHaveBeenCalled();
    });
  });

  // --- Test Suite for updateStoreDeliveryOptions ---
  describe('updateStoreDeliveryOptions', () => {
    const updateDto: UpdateStoreDto = { standardPrice: 70, expressTime: '1 day' };
    it('should update delivery options for an existing store', async () => {
        const storeToUpdate = { ...mockStore };
        (storeRepository.findOne as jest.Mock).mockResolvedValue(storeToUpdate);
        (storeRepository.save as jest.Mock).mockImplementation(async (store) => {
            return { ...store, ...updateDto };
        });


        const result = await service.updateStoreDeliveryOptions(mockUserId, updateDto);

        expect(storeRepository.findOne).toHaveBeenCalledWith({ where: { userId: mockUserId } });
        expect(storeRepository.merge).toHaveBeenCalledWith(storeToUpdate, updateDto);
        expect(storeRepository.save).toHaveBeenCalledWith(storeToUpdate);
        expect(result.standardPrice).toBe(70);
        expect(result.expressTime).toBe('1 day');
    });
    it('should throw NotFoundException if store for user is not found', async () => {
        (storeRepository.findOne as jest.Mock).mockResolvedValue(null);
        await expect(service.updateStoreDeliveryOptions(mockUserId, updateDto)).rejects.toThrow(NotFoundException);
    });
     it('should throw InternalServerErrorException if save fails', async () => {
        (storeRepository.findOne as jest.Mock).mockResolvedValue(mockStore);
        (storeRepository.save as jest.Mock).mockRejectedValue(new Error("DB save error"));
        await expect(service.updateStoreDeliveryOptions(mockUserId, updateDto)).rejects.toThrow(InternalServerErrorException);
    });
  });

  // --- Test Suite for addProduct ---
  describe('addProduct', () => {
    it('should add a product to the user\'s store', async () => {
        (storeRepository.findOne as jest.Mock).mockResolvedValue(mockStore);
        const createdProductEntity = { ...mockProductDto, prodId: mockProductId, userId: mockUserId, storeId: mockStore.storeId, storeName: mockStore.storeName, isActive: false };
        (productRepository.create as jest.Mock).mockReturnValue(createdProductEntity);
        (productRepository.save as jest.Mock).mockResolvedValue(createdProductEntity);

        const result = await service.addProduct(mockUserId, mockProductDto);

        expect(storeRepository.findOne).toHaveBeenCalledWith({ where: { userId: mockUserId } });
        expect(productRepository.create).toHaveBeenCalledWith(expect.objectContaining({
            ...mockProductDto,
            userId: mockUserId,
            storeId: mockStore.storeId,
            storeName: mockStore.storeName,
            isActive: false,
        }));
        expect(productRepository.save).toHaveBeenCalledWith(createdProductEntity);
        expect(result).toEqual(createdProductEntity);
    });
    it('should throw NotFoundException if user has no store', async () => {
        (storeRepository.findOne as jest.Mock).mockResolvedValue(null);
        await expect(service.addProduct(mockUserId, mockProductDto)).rejects.toThrow(new NotFoundException(`Cannot add product: No Store found for user ID ${mockUserId}. Create a store first.`));
    });
    it('should throw InternalServerErrorException if product save fails', async () => {
        (storeRepository.findOne as jest.Mock).mockResolvedValue(mockStore);
        (productRepository.create as jest.Mock).mockReturnValue({ ...mockProductDto });
        (productRepository.save as jest.Mock).mockRejectedValue(new Error("DB save error"));

        await expect(service.addProduct(mockUserId, mockProductDto)).rejects.toThrow(InternalServerErrorException);
    });
  });

  // --- Test Suite for updateProduct ---
  describe('updateProduct', () => {
    const updateProductDto: UpdateProductDto = { name: "Updated Product Name", price: 25.00 };
    const updateProductDtoWithIsActive: UpdateProductDto = { name: "Updated Again", isActive: true };

    it('should update an existing product owned by the user, preserving isActive if DTO isActive is undefined', async () => {
        const existingProduct = { ...mockProduct, userId: mockUserId, isActive: false };
        (productRepository.findOne as jest.Mock).mockResolvedValue(existingProduct);

        (productRepository.save as jest.Mock).mockImplementation(async (prod) => {
            const updated = { ...prod, ...updateProductDto };
            return updated;
        });

        const result = await service.updateProduct(mockProductId, updateProductDto, mockUserId);

        expect(productRepository.findOne).toHaveBeenCalledWith({ where: { prodId: mockProductId } });
        expect(productRepository.merge).toHaveBeenCalledWith(existingProduct, updateProductDto);

        const expectedSavedProduct = { ...existingProduct, ...updateProductDto };
        expect(productRepository.save).toHaveBeenCalledWith(expectedSavedProduct);

        expect(result.name).toBe("Updated Product Name");
        expect(result.price).toBe(25.00);
        expect(result.isActive).toBe(false);
    });


    it('should update an existing product owned by the user, including isActive status if provided in DTO', async () => {
        const existingProduct = { ...mockProduct, userId: mockUserId, isActive: false };
        (productRepository.findOne as jest.Mock).mockResolvedValue(existingProduct);

        (productRepository.save as jest.Mock).mockImplementation(async (prod) => {
            // Simulate merge and separate isActive update
            const { isActive: dtoIsActiveTrue, ...otherUpdatesTrue } = updateProductDtoWithIsActive;
            let tempProd = { ...prod };
            Object.assign(tempProd, otherUpdatesTrue); // Apply other updates via merge
            if (dtoIsActiveTrue !== undefined) {
                tempProd.isActive = dtoIsActiveTrue; // Apply isActive separately
            }
            return tempProd;
        });


        const result = await service.updateProduct(mockProductId, updateProductDtoWithIsActive, mockUserId);

        expect(productRepository.findOne).toHaveBeenCalledWith({ where: { prodId: mockProductId } });
        const { isActive: dtoIsActive, ...otherUpdates } = updateProductDtoWithIsActive;
        expect(productRepository.merge).toHaveBeenCalledWith(existingProduct, otherUpdates);


        const expectedSavedProductAfterMergeAndIsActive = { ...existingProduct, ...otherUpdates, isActive: true };
        expect(productRepository.save).toHaveBeenCalledWith(expectedSavedProductAfterMergeAndIsActive);


        expect(result.name).toBe("Updated Again");
        expect(result.isActive).toBe(true);
    });

    it('should throw NotFoundException if product not found', async () => {
        (productRepository.findOne as jest.Mock).mockResolvedValue(null);
        await expect(service.updateProduct(mockProductId, updateProductDto, mockUserId)).rejects.toThrow(NotFoundException);
    });
    it('should throw ForbiddenException if user does not own the product', async () => {
        const existingProduct = { ...mockProduct, userId: 'another-user-id' };
        (productRepository.findOne as jest.Mock).mockResolvedValue(existingProduct);
        await expect(service.updateProduct(mockProductId, updateProductDto, mockUserId)).rejects.toThrow(ForbiddenException);
    });
    it('should throw InternalServerErrorException if product save fails', async () => {
        const existingProduct = { ...mockProduct, userId: mockUserId };
        (productRepository.findOne as jest.Mock).mockResolvedValue(existingProduct);
        (productRepository.save as jest.Mock).mockRejectedValue(new Error("DB save error"));
        await expect(service.updateProduct(mockProductId, updateProductDto, mockUserId)).rejects.toThrow(InternalServerErrorException);
    });
  });

  // --- Test Suite for deleteProduct ---
  describe('deleteProduct', () => {
    it('should delete a product owned by the user', async () => {
        const productToDelete = { ...mockProduct, userId: mockUserId };
        (productRepository.findOne as jest.Mock).mockResolvedValue(productToDelete);
        (productRepository.delete as jest.Mock).mockResolvedValue({ affected: 1, raw: {} } as DeleteResult);

        await expect(service.deleteProduct(mockProductId, mockUserId)).resolves.toBeUndefined();
        expect(productRepository.findOne).toHaveBeenCalledWith({ where: { prodId: mockProductId, userId: mockUserId } });
        expect(productRepository.delete).toHaveBeenCalledWith(mockProductId);
    });
    it('should throw NotFoundException if product not found or not owned by user', async () => {
        (productRepository.findOne as jest.Mock).mockResolvedValue(null);
        await expect(service.deleteProduct(mockProductId, mockUserId)).rejects.toThrow(new NotFoundException(`Product ID ${mockProductId} not found or you do not have permission to delete it.`));
    });
     it('should throw InternalServerErrorException if delete operation affects 0 rows', async () => {
        const productToDelete = { ...mockProduct, userId: mockUserId };
        (productRepository.findOne as jest.Mock).mockResolvedValue(productToDelete);
        (productRepository.delete as jest.Mock).mockResolvedValue({ affected: 0, raw: {} } as DeleteResult);
        await expect(service.deleteProduct(mockProductId, mockUserId)).rejects.toThrow(new InternalServerErrorException(`Failed to delete product ID ${mockProductId}.`));
    });
  });

  // --- Test Suite for getDeliveryOptionsForStores ---
  describe('getDeliveryOptionsForStores', () => {
    const storeIds = [mockStoreId, 'store-uuid-789'];
    const mockStore2: Store = { ...mockStore, storeId: 'store-uuid-789', storeName: 'Another Store' } as Store;


    it('should return delivery options for given store IDs', async () => {
        (storeRepository.find as jest.Mock).mockResolvedValue([mockStore, mockStore2]);
        const result = await service.getDeliveryOptionsForStores(storeIds);
        expect(storeRepository.find).toHaveBeenCalledWith({
            where: { storeId: In(storeIds) },
            select: ['storeId', 'storeName', 'standardPrice', 'standardTime', 'expressPrice', 'expressTime'],
        });
        expect(result[mockStoreId]).toBeDefined();
        expect(result[mockStoreId].storeName).toBe(mockStore.storeName);
        expect(result['store-uuid-789'].standardPrice).toBe(mockStore2.standardPrice);
    });
    it('should return an empty object if no store IDs are provided', async () => {
        const result = await service.getDeliveryOptionsForStores([]);
        expect(result).toEqual({});
        expect(storeRepository.find).not.toHaveBeenCalled();
    });
     it('should handle cases where some stores are not found and not log a warning', async () => {
        (storeRepository.find as jest.Mock).mockResolvedValue([mockStore]);

        const result = await service.getDeliveryOptionsForStores(storeIds);

        expect(result[mockStoreId]).toBeDefined();
        expect(result['store-uuid-789']).toBeUndefined();
    });
    it('should throw InternalServerErrorException if database query fails', async () => {
        (storeRepository.find as jest.Mock).mockRejectedValue(new Error("DB Error"));
        await expect(service.getDeliveryOptionsForStores(storeIds)).rejects.toThrow(InternalServerErrorException);
    });
  });

});