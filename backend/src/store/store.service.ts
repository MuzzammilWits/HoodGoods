// backend/src/store/store.service.ts
import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager, In } from 'typeorm';
import { Product } from '../products/entities/product.entity';
import { Store } from './entities/store.entity';
import { User } from '../auth/user.entity';
import { CreateStoreDto } from './dto/create-store.dto';
import { CreateProductDto } from '../products/dto/create-product.dto';
import { UpdateProductDto } from '../products/dto/update-product.dto';
import { UpdateStoreDto } from './dto/update-store.dto';

export interface StoreDeliveryDetails {
    storeId: string;
    standardPrice: number;
    standardTime: string;
    expressPrice: number;
    expressTime: string;
    storeName?: string;
}

@Injectable()
export class StoreService {
  private readonly logger = new Logger(StoreService.name);

  constructor(
    @InjectRepository(Store) private readonly storeRepository: Repository<Store>,
    @InjectRepository(Product) private readonly productRepository: Repository<Product>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly entityManager: EntityManager,
  ) {}

  async createStoreWithProducts(createStoreDto: CreateStoreDto, userId: string): Promise<Store> {
    return this.entityManager.transaction(async transactionalEntityManager => {
      const storeRepo = transactionalEntityManager.getRepository(Store);
      const productRepo = transactionalEntityManager.getRepository(Product);
      const userRepo = transactionalEntityManager.getRepository(User);

      const user = await userRepo.findOne({ where: { userID: userId } });
      if (!user) throw new NotFoundException('User not found');

      const existingStore = await storeRepo.findOne({ where: { userId: userId } });
      if (existingStore) throw new ConflictException(`User already has a store named '${existingStore.storeName}'.`);

      const newStore = storeRepo.create({
        userId: userId,
        storeName: createStoreDto.storeName,
        standardPrice: createStoreDto.standardPrice,
        standardTime: createStoreDto.standardTime,
        expressPrice: createStoreDto.expressPrice,
        expressTime: createStoreDto.expressTime,
      });
      const savedStore = await storeRepo.save(newStore);

      const productEntities = createStoreDto.products.map(productDto => {
        return productRepo.create({
          name: productDto.name,
          description: productDto.description,
          price: productDto.price,
          category: productDto.category,
          imageUrl: productDto.imageUrl,
          productquantity: productDto.productquantity,
          userId: userId,
          storeId: savedStore.storeId,
          storeName: savedStore.storeName,
          isActive: false,
        });
      });

      await productRepo.save(productEntities);
      return await storeRepo.findOneOrFail({ where: { storeId: savedStore.storeId }});

    }).catch(error => {
        if (error instanceof ConflictException || error instanceof NotFoundException || error instanceof BadRequestException) {
            throw error;
        }
        // this.logger.error(...); // Logging removed
        throw new InternalServerErrorException("Failed to create store due to an internal error.");
    });
  }

  async getStoreByUserId(userId: string): Promise<{ store: Store; products: Product[] }> {
     const store = await this.storeRepository.findOne({ where: { userId: userId }});
     if (!store) {
       const user = await this.userRepository.findOne({ where: { userID: userId } });
       if (!user) throw new NotFoundException('User not found');
       throw new NotFoundException(`No store found for this user. Please create a store.`);
     }
     const products = await this.productRepository.find({
         where: { storeId: store.storeId },
         order: { prodId: 'ASC' }
     });
     return { store, products };
  }

  async getAllStoresWithProducts(): Promise<Store[]> {
    return this.storeRepository.find({
      relations: ['products'],
      order: { storeName: 'ASC', products: { prodId: 'ASC' } },
    });
  }

  async getInactiveStoresWithProducts(): Promise<Store[]> {
    const stores = await this.storeRepository.find({
      where: { isActive: false },
      relations: ['products'],
      order: { storeName: 'ASC' }
    });
    return stores.map(store => ({
      ...store,
      products: store.products ? store.products.filter(product => !product.isActive) : [],
    }));
  }

  async approveStore(storeId: string): Promise<Store> {
    const store = await this.storeRepository.findOne({ where: { storeId } });
    if (!store) throw new NotFoundException(`Store with ID ${storeId} not found.`);
    store.isActive = true;
    return this.storeRepository.save(store);
  }

  async rejectStore(storeId: string): Promise<void> {
    const store = await this.storeRepository.findOne({ where: { storeId } });
    if (!store) throw new NotFoundException(`Store with ID ${storeId} not found.`);
    await this.entityManager.transaction(async transactionalEntityManager => {
        await transactionalEntityManager.remove(Store, store);
        const user = await transactionalEntityManager.findOne(User, { where: { userID: store.userId }});
        if (user && user.role === 'seller') {
            await transactionalEntityManager.update(User, { userID: store.userId }, { role: 'buyer' });
        }
    }).catch(error => {
        // this.logger.error(...); // Logging removed
        throw new InternalServerErrorException('Failed to reject store due to an internal error.');
    });
  }

  async updateStoreDeliveryOptions(userId: string, updateStoreDto: UpdateStoreDto): Promise<Store> {
    const store = await this.storeRepository.findOne({ where: { userId: userId } });
    if (!store) {
      throw new NotFoundException(`Store not found for user ID ${userId}. Cannot update.`);
    }
    this.storeRepository.merge(store, updateStoreDto);
    try {
      const updatedStoreData = await this.storeRepository.save(store);
      return updatedStoreData;
    } catch (error) {
      // this.logger.error(...); // Logging removed
      throw new InternalServerErrorException('Failed to update store delivery options.');
    }
  }

  async addProduct(userId: string, productDto: CreateProductDto): Promise<Product> {
    const store = await this.storeRepository.findOne({ where: { userId: userId } });
    if (!store) {
      throw new NotFoundException(`Cannot add product: No Store found for user ID ${userId}. Create a store first.`);
    }
    const newProduct = this.productRepository.create({
        ...productDto,
        userId: userId,
        storeId: store.storeId,
        storeName: store.storeName,
        isActive: false,
    });
    try {
        const savedProduct = await this.productRepository.save(newProduct);
        return savedProduct;
    } catch (error) {
        // this.logger.error(...); // Logging removed
        throw new InternalServerErrorException("Failed to add product.");
    }
  }

  async updateProduct(productId: number, updateProductDto: UpdateProductDto, userId: string): Promise<Product> {
     const product = await this.productRepository.findOne({ where: { prodId: productId } });

     if (!product) {
        throw new NotFoundException(`Product with ID ${productId} not found.`);
     }
     if (product.userId !== userId) {
        throw new ForbiddenException('You are not authorized to update this product.');
     }

     const { isActive: dtoIsActive, ...otherUpdates } = updateProductDto;
     this.productRepository.merge(product, otherUpdates);

     if (dtoIsActive !== undefined) {
         product.isActive = dtoIsActive;
     }
     // If dtoIsActive is undefined, product.isActive remains as it was after the merge (or its original value if not in otherUpdates)

     try {
         const updatedProduct = await this.productRepository.save(product);
         return updatedProduct;
     } catch (error) {
         // this.logger.error(...); // Logging removed
         throw new InternalServerErrorException("Failed to update product.");
     }
   }

  async deleteProduct(productId: number, userId: string): Promise<void> {
     const product = await this.productRepository.findOne({ where: { prodId: productId, userId: userId } });
     if (!product) {
        throw new NotFoundException(`Product ID ${productId} not found or you do not have permission to delete it.`);
     }
     const deleteResult = await this.productRepository.delete(productId);
     if (deleteResult.affected === 0) {
         throw new InternalServerErrorException(`Failed to delete product ID ${productId}.`);
     }
   }

  async getDeliveryOptionsForStores(storeIds: string[]): Promise<Record<string, StoreDeliveryDetails>> {
    if (!storeIds || storeIds.length === 0) return {};
    try {
      const stores = await this.storeRepository.find({
        where: { storeId: In(storeIds) },
        select: ['storeId', 'storeName', 'standardPrice', 'standardTime', 'expressPrice', 'expressTime'],
      });
      const deliveryOptionsMap: Record<string, StoreDeliveryDetails> = {};
      stores.forEach(store => {
        deliveryOptionsMap[store.storeId] = {
          storeId: store.storeId,
          storeName: store.storeName,
          standardPrice: store.standardPrice,
          standardTime: store.standardTime,
          expressPrice: store.expressPrice,
          expressTime: store.expressTime,
        };
      });
      // Removed warning log for missing storeIds for brevity in production
      return deliveryOptionsMap;
    } catch (error) {
      // this.logger.error(...); // Logging removed
      throw new InternalServerErrorException('Failed to retrieve store delivery options.');
    }
  }
}