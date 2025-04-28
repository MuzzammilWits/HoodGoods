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
import { Repository, EntityManager, In } from 'typeorm'; // <<< Ensure 'In' is imported
import { Product } from '../products/entities/product.entity';
import { Store } from './entities/store.entity';
import { User } from '../auth/user.entity';
import { CreateStoreDto } from './dto/create-store.dto';
import { CreateProductDto } from '../products/dto/create-product.dto';
import { UpdateProductDto } from '../products/dto/update-product.dto';

// --- NEW INTERFACE ---
// Define an interface for the delivery details we want to return
export interface StoreDeliveryDetails {
    storeId: string;
    standardPrice: number;
    standardTime: string;
    expressPrice: number;
    expressTime: string;
    storeName?: string; // Optional: Include storeName for display/confirmation
}
// --- END NEW INTERFACE ---


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
        storeName: createStoreDto.storeName,
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
          storeName: savedStore.storeName, // Ensure storeName is set here
          isActive: true,
        });
      });

      await productRepo.save(productEntities);

      // Return the store details (might not include products by default unless relation is eager loaded)
      // Fetch again to be sure or adjust return type/logic if needed
      return await storeRepo.findOneOrFail({ where: { storeId: savedStore.storeId }});

    }).catch(error => {
        if (error instanceof ConflictException || error instanceof NotFoundException || error instanceof BadRequestException) {
            throw error;
        }
        console.error("Transaction failed in createStoreWithProducts:", error);
        if (error.driverError) {
            console.error("Database Driver Error:", JSON.stringify(error.driverError, null, 2));
        }
        throw new InternalServerErrorException("Failed to create store due to an internal error.");
    });
  }

  async getStoreByUserId(userId: string): Promise<{ store: Store; products: Product[] }> {
     const store = await this.storeRepository.findOne({ where: { userId: userId }});
     if (!store) {
       const user = await this.userRepository.findOne({ where: { userID: userId } });
       if (!user) throw new NotFoundException('User not found');
       // If user exists but has no store, throw specific error
       throw new NotFoundException(`No store found for this user.`);
     }
     // Fetch products associated with the found store
     const products = await this.productRepository.find({
         where: { storeId: store.storeId }, // Use the storeId from the fetched store
         order: { prodId: 'ASC' }
     });
     return { store, products };
  }

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
        userId: userId, // The user adding the product
        storeId: store.storeId, // Link to the found store's ID
        storeName: store.storeName, // Copy store name from the store
        isActive: true, // Default to active
    });

    try {
        const savedProduct = await this.productRepository.save(newProduct);
        return savedProduct;
    } catch (error) {
        console.error("Error adding product:", error);
        if (error.driverError) {
            console.error("Database Driver Error:", JSON.stringify(error.driverError, null, 2));
        }
        throw new InternalServerErrorException("Failed to add product.");
    }
  }

  async updateProduct(productId: number, updateProductDto: UpdateProductDto, userId: string): Promise<Product> {
     // Fetch the product first to check ownership and existence
     const product = await this.productRepository.findOne({ where: { prodId: productId } });
     if (!product) throw new NotFoundException(`Product ID ${productId} not found`);
     // Check if the user requesting the update is the owner of the product
     if (product.userId !== userId) throw new ForbiddenException('You are not authorized to update this product.');

     // Merge the changes from DTO into the fetched product entity
     // This only updates fields present in updateProductDto
     this.productRepository.merge(product, updateProductDto);

     // Save the updated product
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

  async deleteProduct(productId: number, userId: string): Promise<void> {
     // Find the product first to ensure it exists and belongs to the user
     const product = await this.productRepository.findOne({ where: { prodId: productId, userId: userId } });
     if (!product) throw new NotFoundException(`Product ID ${productId} not found or you do not have permission to delete it.`);

     // Perform the delete operation
     const deleteResult = await this.productRepository.delete(productId);

     // Check if the deletion was successful
     if (deleteResult.affected === 0) {
         // This might happen in a race condition or if the product was already deleted
         console.warn(`Attempted to delete product ID ${productId}, but no rows were affected.`);
         // Optionally re-throw NotFoundException if consistency is critical
         // throw new NotFoundException(`Product ID ${productId} could not be deleted.`);
         // Or throw InternalServerErrorException as before
         throw new InternalServerErrorException(`Failed to delete product ID ${productId}.`);
     }
     // No return value needed for void
   }

  // --- NEW METHOD ---
  /**
   * Fetches delivery option details for a given list of store IDs.
   * @param storeIds - An array of store IDs (as strings).
   * @returns A Promise resolving to a Record (object/map) where keys are store IDs
   * and values are objects containing delivery details.
   */
  async getDeliveryOptionsForStores(storeIds: string[]): Promise<Record<string, StoreDeliveryDetails>> {
    if (!storeIds || storeIds.length === 0) {
      return {}; // Return empty object if no IDs are provided
    }

    try {
      // Fetch stores matching the provided IDs using the 'In' operator
      const stores = await this.storeRepository.find({
        where: {
          storeId: In(storeIds), // Find stores where storeId is in the provided array
        },
        // Select only the necessary columns for delivery options
        select: [
          'storeId',
          'storeName',
          'standardPrice',
          'standardTime',
          'expressPrice',
          'expressTime',
        ],
      });

      // Transform the array of stores into a map (Record) keyed by storeId
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

      // Optional: Log if some requested storeIds were not found
      if (stores.length !== storeIds.length) {
          const foundIds = stores.map(s => s.storeId);
          const missingIds = storeIds.filter(id => !foundIds.includes(id));
          console.warn(`Delivery options requested for stores, but some were not found: ${missingIds.join(', ')}`);
      }

      return deliveryOptionsMap;

    } catch (error) {
      console.error(`Error fetching delivery options for stores [${storeIds.join(', ')}]:`, error);
      throw new InternalServerErrorException('Failed to retrieve store delivery options.');
    }
  }
  // --- END NEW METHOD ---

} // End of StoreService class
