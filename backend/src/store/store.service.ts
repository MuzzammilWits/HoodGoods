// src/store/store.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../products/entities/product.entity'; // Adjusted path based on common NestJS structure
import { User } from '../auth/user.entity'; // Assuming User entity definition is compatible
import { CreateProductDto, CreateStoreWithProductsDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class StoreService {
  constructor(
    // Assuming Product entity is defined in 'products' module now based on previous file path
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>, // Assuming User entity has a 'userID' property/column used for lookup
  ) {}

  // Create Store with initial products
  async createStoreWithProducts(createStoreDto: CreateStoreWithProductsDto, userId: string): Promise<Product[]> {
    const user = await this.userRepository.findOne({ where: { userID: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.role !== 'seller') {
      throw new BadRequestException('User must be a seller to create products');
    }

    if (!createStoreDto.storeName) {
        throw new BadRequestException('Store name is required when creating a store with products.');
    }

    const productEntities = createStoreDto.products.map(productDto => {
      if (!productDto.imageUrl) {
        throw new BadRequestException(`Image URL is missing for product: ${productDto.name}`);
      }
      // --- Add validation for productquantity ---
      if (productDto.productquantity === undefined || productDto.productquantity === null || productDto.productquantity < 0) {
         throw new BadRequestException(`Valid product quantity is required for product: ${productDto.name}`);
      }
      // --- Include productquantity when creating entity ---
      // --- Prepare data object and log before .create() ---
       const productDataForDb = {
           name: productDto.name,
           description: productDto.description,
           price: productDto.price,
           category: productDto.category,
           imageUrl: productDto.imageUrl,
           productquantity: productDto.productquantity, // Check this value!
           userId: userId,
           storeName: createStoreDto.storeName,
           isActive: true
       };
       // >>> ADD CONSOLE LOG HERE <<<
       console.log(`SVC (createStore): Preparing entity data for product "${productDto.name}":`, JSON.stringify(productDataForDb, null, 2));
       // >>> END CONSOLE LOG <<<

       // Ensure you use the prepared object in the create call
       return this.productRepository.create(productDataForDb);
    });

    // Save all prepared product entities
    return this.productRepository.save(productEntities);
  }

  // Get Store Details by User ID
  async getStoreByUserId(userId: string): Promise<{ storeName: string; products: Product[] }> {
    const products = await this.productRepository.find({
        where: { userId: userId },
        order: { prodId: 'ASC' }
    });

    if (!products || products.length === 0) {
      const user = await this.userRepository.findOne({ where: { userID: userId } });
      if (!user) throw new NotFoundException('User not found');
      throw new NotFoundException('No store or products found for this user.');
    }

    const storeName = products[0].storeName;
    return {
      storeName,
      products
    };
  }

  // Add a Product to an existing store
  async addProduct(userId: string, productDto: CreateProductDto): Promise<Product> {
    const user = await this.userRepository.findOne({ where: { userID: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.role !== 'seller') {
      throw new BadRequestException('User must be a seller to add products');
    }

    let storeName = productDto.storeName;
    if (!storeName) {
      const existingProducts = await this.productRepository.find({ where: { userId: userId } });
      if (existingProducts.length > 0) {
        storeName = existingProducts[0].storeName;
      } else {
        throw new BadRequestException('Store name is required when adding the first product.');
      }
    }

    if (!productDto.imageUrl) {
      throw new BadRequestException(`Image URL is missing for the new product.`);
    }
    // --- Add validation for productquantity ---
    if (productDto.productquantity === undefined || productDto.productquantity === null || productDto.productquantity < 0) {
       throw new BadRequestException(`Valid product quantity is required for the new product.`);
    }

    // --- productquantity is included via spread operator ...productDto ---
    // --- Prepare data object and log before .create() ---
     const productDataForDb = {
       ...productDto, // Includes name, description, price, category, imageUrl, productquantity
       userId: userId,
       storeName: storeName,
       isActive: true
     };
     // >>> ADD CONSOLE LOG HERE <<<
     console.log(`SVC (addProduct): Preparing entity data:`, JSON.stringify(productDataForDb, null, 2));
     // >>> END CONSOLE LOG <<<

    const product = this.productRepository.create(productDataForDb);

    // Log before save (optional but good)
    console.log(`SVC (addProduct): Attempting to save product:`, JSON.stringify(product, null, 2));

    return this.productRepository.save(product);
  }

  // Update an existing product
  async updateProduct(productId: number, updateProductDto: UpdateProductDto, userId: string): Promise<Product> {
    const product = await this.productRepository.findOne({ where: { prodId: productId } });
    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    if (product.userId !== userId) {
      throw new ForbiddenException('You are not authorized to update this product');
    }

    // --- Add validation if productquantity is being updated ---
    if (updateProductDto.productquantity !== undefined && updateProductDto.productquantity !== null && updateProductDto.productquantity < 0) {
        throw new BadRequestException('Product quantity cannot be negative.');
    }

    // >>> ADD CONSOLE LOG HERE <<<
    console.log(`SVC (updateProduct): Merging DTO into entity ID ${productId}. DTO:`, JSON.stringify(updateProductDto, null, 2));
    // >>> END CONSOLE LOG <<<

    // Merge handles optional fields, including productquantity if present in DTO
    this.productRepository.merge(product, updateProductDto);

    // >>> ADD CONSOLE LOG HERE <<<
    console.log(`SVC (updateProduct): Entity data after merge, before save:`, JSON.stringify(product, null, 2));
    // >>> END CONSOLE LOG <<<

    return this.productRepository.save(product);
  }

  // Delete a product
  async deleteProduct(productId: number, userId: string): Promise<void> {
    const product = await this.productRepository.findOne({ where: { prodId: productId } });
    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    if (product.userId !== userId) {
      throw new ForbiddenException('You are not authorized to delete this product');
    }

    const deleteResult = await this.productRepository.delete(productId);
    if (deleteResult.affected === 0) {
      throw new NotFoundException(`Product with ID ${productId} could not be deleted (might have been deleted already).`);
    }
  }
}