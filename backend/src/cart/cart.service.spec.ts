import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, EntityManager, DeleteResult, ObjectLiteral } from 'typeorm';
import { HttpException, HttpStatus } from '@nestjs/common';
import { CartService } from './cart.service';
import { CartItem } from './entities/cart-item.entity';
import { CreateCartItemDto } from './dto/create-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

// *** ADJUSTED TYPES ***
// Type for standard repository methods (excluding 'manager')
type MockRepositoryMethods<T extends ObjectLiteral = any> = Partial<Record<Exclude<keyof Repository<T>, 'manager'>, jest.Mock>>;
// Type for our specific manager mock structure
type MockManagerWithTransaction = { manager: { transaction: jest.Mock } };
// Combined type describing the actual return value of createMockRepository
type MockRepositoryType<T extends ObjectLiteral = any> = MockRepositoryMethods<T> & MockManagerWithTransaction;

// Define a simpler type for the mock entity manager used in transactions
type MockEntityManager = Partial<Record<'delete' | 'create' | 'save', jest.Mock>>;

// createMockRepository now returns the explicitly defined combined type
const createMockRepository = <T extends ObjectLiteral = any>(): MockRepositoryType<T> => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findOneOrFail: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
  // manager is an OBJECT containing the transaction mock function
  manager: {
    transaction: jest.fn(),
  },
});

const createMockEntityManager = (): MockEntityManager => ({
    delete: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
});


describe('CartService', () => {
  let service: CartService;
  // Use the adjusted combined type for the repository variable
  let repository: MockRepositoryType<CartItem>;
  let mockEntityManager: MockEntityManager;

  const userId = 'user-123';
  const productId = 'product-abc';
  const mockDate = new Date('2025-04-26T20:33:03.000Z'); // Updated time

  const mockCartItem: CartItem = {
    id: 'item-id-1',
    userId,
    productId,
    name: 'Test Product',
    price: 10.99,
    image: 'test.jpg',
    quantity: 1,
    createdAt: mockDate,
    updatedAt: mockDate,
  };

  beforeAll(() => {
     jest.useFakeTimers();
     jest.setSystemTime(mockDate);
  });

  afterAll(() => {
     jest.useRealTimers();
  });


  beforeEach(async () => {
    mockEntityManager = createMockEntityManager();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        {
          provide: getRepositoryToken(CartItem),
          useValue: createMockRepository<CartItem>(),
        },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
    // Get the repository mock using the adjusted type
    repository = module.get<MockRepositoryType<CartItem>>(getRepositoryToken(CartItem));

    repository.manager.transaction!.mockImplementation(async (cb) => {
        return await cb(mockEntityManager as unknown as EntityManager);
    });
  });

   afterEach(() => {
        jest.clearAllMocks();
   });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  //----------------------------------
  // getCart Tests
  //----------------------------------
  describe('getCart', () => {
    it('should return an array of cart items for a user', async () => {
      const cartItems = [mockCartItem, { ...mockCartItem, id: 'item-id-2', productId: 'prod-xyz'}];
      repository.find!.mockResolvedValue(cartItems);

      const result = await service.getCart(userId);

      expect(result).toEqual(cartItems);
      expect(repository.find).toHaveBeenCalledWith({
        where: { userId },
        order: { createdAt: 'DESC' }
      });
    });

    it('should return an empty array if the cart is empty', async () => {
      repository.find!.mockResolvedValue([]);

      const result = await service.getCart(userId);

      expect(result).toEqual([]);
      expect(repository.find).toHaveBeenCalledWith({
        where: { userId },
        order: { createdAt: 'DESC' }
      });
    });
  });

  //----------------------------------
  // addToCart Tests
  //----------------------------------
  describe('addToCart', () => {
    const createDto: CreateCartItemDto = {
        productId,
        quantity: 2,
        name: 'Test Product DTO',
        price: 10.99
    };

    it('should add a new item to the cart if it does not exist', async () => {
      const newItemData = {
        ...createDto,
        userId,
        createdAt: mockDate,
        updatedAt: mockDate,
      };
      const createArg = { ...newItemData };
      const savedItem = { ...createArg, id: 'new-item-id', image: 'test.jpg' };

      repository.findOne!.mockResolvedValue(null);
      repository.create!.mockReturnValue(createArg as any);
      repository.save!.mockResolvedValue(savedItem as any);

      const result = await service.addToCart(userId, createDto);

      expect(result).toEqual(savedItem);
      expect(repository.findOne).toHaveBeenCalledWith({ where: { userId, productId } });
       expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({
           userId,
           productId: createDto.productId,
           quantity: createDto.quantity,
           name: createDto.name,
           price: createDto.price,
       }));
      expect(repository.save).toHaveBeenCalledWith(expect.objectContaining(createArg));
    });

    it('should update the quantity of an existing item', async () => {
      const existingItem = { ...mockCartItem, quantity: 1 };
      const addedQuantity = createDto.quantity;
      const expectedUpdatedItem = { ...existingItem, quantity: existingItem.quantity + addedQuantity, updatedAt: mockDate };

      repository.findOne!.mockResolvedValue(existingItem);
      repository.save!.mockResolvedValue(expectedUpdatedItem as any);

      const result = await service.addToCart(userId, createDto);

      expect(result).toEqual(expectedUpdatedItem);
      expect(repository.findOne).toHaveBeenCalledWith({ where: { userId, productId } });
      expect(repository.save).toHaveBeenCalledWith(expectedUpdatedItem);
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  //----------------------------------
  // updateCartItem Tests
  //----------------------------------
  describe('updateCartItem', () => {
    const updateDto: UpdateCartItemDto = { quantity: 5 };

    it('should update the quantity of a specific cart item', async () => {
      const itemToUpdate = { ...mockCartItem };
      const expectedUpdatedItem = { ...itemToUpdate, quantity: updateDto.quantity };

      repository.findOneOrFail!.mockResolvedValue(itemToUpdate);
      repository.save!.mockResolvedValue(expectedUpdatedItem as any);

      const result = await service.updateCartItem(userId, productId, updateDto);

      expect(result).toEqual(expectedUpdatedItem);
      expect(repository.findOneOrFail).toHaveBeenCalledWith({ where: { userId, productId } });
      expect(repository.save).toHaveBeenCalledWith(expectedUpdatedItem);
    });

    it('should throw an error if the item to update is not found', async () => {
      const error = new Error('Item not found');
      repository.findOneOrFail!.mockRejectedValue(error);

      await expect(service.updateCartItem(userId, productId, updateDto)).rejects.toThrow(error);

      expect(repository.findOneOrFail).toHaveBeenCalledWith({ where: { userId, productId } });
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  //----------------------------------
  // removeFromCart Tests
  //----------------------------------
  describe('removeFromCart', () => {
    it('should remove an item from the cart and return true', async () => {
      const deleteResult: DeleteResult = { affected: 1, raw: {} };
      repository.delete!.mockResolvedValue(deleteResult);

      const result = await service.removeFromCart(userId, productId);

      expect(result).toBe(true);
      expect(repository.delete).toHaveBeenCalledWith({ userId, productId });
    });

    it('should return false if no item was removed', async () => {
      const deleteResult: DeleteResult = { affected: 0, raw: {} };
      repository.delete!.mockResolvedValue(deleteResult);

      const result = await service.removeFromCart(userId, productId);

      expect(result).toBe(false);
      expect(repository.delete).toHaveBeenCalledWith({ userId, productId });
    });
  });

  //----------------------------------
  // clearCart Tests
  //----------------------------------
  describe('clearCart', () => {
    it('should remove all items for a user and return true', async () => {
      const deleteResult: DeleteResult = { affected: 3, raw: {} };
      repository.delete!.mockResolvedValue(deleteResult);

      const result = await service.clearCart(userId);

      expect(result).toBe(true);
      expect(repository.delete).toHaveBeenCalledWith({ userId });
    });

    it('should return false if the cart was already empty', async () => {
      const deleteResult: DeleteResult = { affected: 0, raw: {} };
      repository.delete!.mockResolvedValue(deleteResult);

      const result = await service.clearCart(userId);

      expect(result).toBe(false);
      expect(repository.delete).toHaveBeenCalledWith({ userId });
    });
  });

   //----------------------------------
  // syncCart Tests
  //----------------------------------
  describe('syncCart', () => {
    const syncItemsDto: CreateCartItemDto[] = [
      { productId: 'prod-1', quantity: 1, name: 'Sync Prod 1', price: 5 },
      { productId: 'prod-2', quantity: 3, name: 'Sync Prod 2', price: 8 },
    ];

    const itemsToCreate = syncItemsDto.map(item => ({
       ...item,
       userId,
       createdAt: mockDate,
    }));

    const createdCartItems = itemsToCreate.map((item, index) => ({
      id: `sync-item-${index}`,
      ...item,
      image: 'sync-img.jpg',
      updatedAt: mockDate
    }));

    it('should clear existing cart and add new items within a transaction', async () => {
        mockEntityManager.delete!.mockResolvedValue({ affected: 2, raw: {} });
        mockEntityManager.create!.mockImplementation((entity, itemData) => ({ ...itemData }));
        mockEntityManager.save!.mockResolvedValue(createdCartItems);

        await service.syncCart(userId, syncItemsDto);

        expect(repository.manager.transaction).toHaveBeenCalledTimes(1);
        expect(mockEntityManager.delete).toHaveBeenCalledWith(CartItem, { userId });
        expect(mockEntityManager.create).toHaveBeenCalledTimes(syncItemsDto.length);
        itemsToCreate.forEach(item => {
            expect(mockEntityManager.create).toHaveBeenCalledWith(CartItem, item);
        });
        expect(mockEntityManager.save).toHaveBeenCalledWith(
           itemsToCreate.map(item => expect.objectContaining(item))
        );
        expect(repository.delete).not.toHaveBeenCalled();
    });

     it('should handle potential errors during transaction', async () => {
        const transactionError = new Error('Database transaction failed');

        repository.manager.transaction!.mockImplementation(async (cb) => {
             mockEntityManager.delete!.mockRejectedValue(new Error('Delete failed'));
             try {
                 await cb(mockEntityManager as unknown as EntityManager);
             } catch(e) {
                throw transactionError;
             }
        });

        await expect(service.syncCart(userId, syncItemsDto)).rejects.toThrow(transactionError);

        expect(repository.manager.transaction).toHaveBeenCalledTimes(1);
        expect(mockEntityManager.delete).toHaveBeenCalledWith(CartItem, { userId });
        expect(mockEntityManager.create).not.toHaveBeenCalled();
        expect(mockEntityManager.save).not.toHaveBeenCalled();
    });
  });
});