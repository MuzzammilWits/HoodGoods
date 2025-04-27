// src/store/store.service.ts
import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { Product } from '../products/entities/product.entity';
import { Store } from './entities/store.entity';
import { User } from '../auth/user.entity';
import { CreateStoreDto } from './dto/create-store.dto';
import { CreateProductDto } from '../products/dto/create-product.dto';
import { UpdateProductDto } from '../products/dto/update-product.dto';

@Injectable()
export class StoreService {
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

      // Create Store
      const newStore = storeRepo.create({
        userId: userId,
        storeName: createStoreDto.storeName, // Get storeName from DTO
        standardPrice: createStoreDto.standardPrice,
        standardTime: createStoreDto.standardTime,
        expressPrice: createStoreDto.expressPrice,
        expressTime: createStoreDto.expressTime,
      });
      const savedStore = await storeRepo.save(newStore);

      // Prepare and Create Products
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
          storeName: savedStore.storeName, // <-- Add this line: Copy storeName from saved Store
          isActive: true,
        });
      });

      await productRepo.save(productEntities);

      return await storeRepo.findOneOrFail({ where: { storeId: savedStore.storeId }});

    }).catch(error => {
        if (error instanceof ConflictException || error instanceof NotFoundException || error instanceof BadRequestException) {
            throw error;
        }
        console.error("Transaction failed in createStoreWithProducts:", error);
         // Log the detailed TypeORM error if available
         if (error.driverError) {
             console.error("Database Driver Error:", JSON.stringify(error.driverError, null, 2));
         }
        throw new InternalServerErrorException("Failed to create store due to an internal error.");
    });
  }

  // --- Method to get store remains the same ---
  async getStoreByUserId(userId: string): Promise<{ store: Store; products: Product[] }> {
     const store = await this.storeRepository.findOne({ where: { userId: userId }});
     if (!store) {
        const user = await this.userRepository.findOne({ where: { userID: userId } });
        if (!user) throw new NotFoundException('User not found');
        throw new NotFoundException(`No store found for this user.`);
     }
     const products = await this.productRepository.find({
         where: { storeId: store.storeId },
         order: { prodId: 'ASC' }
     });
     return { store, products };
  }

  // --- Method to add product needs storeName added ---
  async addProduct(userId: string, productDto: CreateProductDto): Promise<Product> {
    const store = await this.storeRepository.findOne({ where: { userId: userId } });
    if (!store) {
      throw new NotFoundException(`Cannot add product: No Store found for user ID ${userId}. Create a store first.`);
    }

    const newProduct = this.productRepository.create({
        name: productDto.name,
        description: productDto.description,
        price: productDto.price,
        category: productDto.category,
        imageUrl: productDto.imageUrl,
        productquantity: productDto.productquantity,
        userId: userId,
        storeId: store.storeId,
        storeName: store.storeName, // <-- Add this line: Copy storeName from fetched Store
        isActive: true,
    });

    try {
        const savedProduct = await this.productRepository.save(newProduct);
        return savedProduct;
    } catch (error) {
         console.error("Error adding product:", error);
          // Log the detailed TypeORM error if available
         if (error.driverError) {
             console.error("Database Driver Error:", JSON.stringify(error.driverError, null, 2));
         }
        throw new InternalServerErrorException("Failed to add product.");
    }
  }

  // --- Update method doesn't need changes unless you want to update the redundant storeName ---
   async updateProduct(productId: number, updateProductDto: UpdateProductDto, userId: string): Promise<Product> {
     // If you ever allow store name changes, you'd need extra logic here
     // to update the redundant storeName in all associated products.
     // For now, we assume storeName in Products doesn't get updated after creation.
     const product = await this.productRepository.findOne({ where: { prodId: productId } });
     if (!product) throw new NotFoundException(`Product ID ${productId} not found`);
     if (product.userId !== userId) throw new ForbiddenException('You are not authorized to update this product.');

     // Only merge fields from UpdateProductDto (which shouldn't include storeName)
     this.productRepository.merge(product, updateProductDto);

     try {
         return await this.productRepository.save(product);
     } catch (error) {
         console.error(`Error updating product ${productId}:`, error);
          if (error.driverError) {
             console.error("Database Driver Error:", JSON.stringify(error.driverError, null, 2));
         }
         throw new InternalServerErrorException("Failed to update product.");
     }
   }


  // --- Delete method remains the same ---
   async deleteProduct(productId: number, userId: string): Promise<void> {
      const product = await this.productRepository.findOne({ where: { prodId: productId, userId: userId } });
      if (!product) throw new NotFoundException(`Product ID ${productId} not found or you do not have permission to delete it.`);
      const deleteResult = await this.productRepository.delete(productId);
      if (deleteResult.affected === 0) throw new InternalServerErrorException(`Failed to delete product ID ${productId}.`);
   }

}