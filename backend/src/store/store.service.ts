// src/store/store.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException // Added for authorization checks
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './product.entity';
import { User } from '../auth/user.entity'; // Assuming User entity is correctly imported
import { CreateProductDto, CreateStoreWithProductsDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto'; // Added

@Injectable()
export class StoreService {
constructor(
  @InjectRepository(Product)
  private readonly productRepository: Repository<Product>,

  @InjectRepository(User)
  private readonly userRepository: Repository<User>, // Keep if needed for user checks
) {}

// Create Store (assuming user must be 'seller')
async createStoreWithProducts(createStoreDto: CreateStoreWithProductsDto, userID: string): Promise<Product[]> {
  // Verify user exists (optional, depends if user creation is separate)
  const user = await this.userRepository.findOne({ where: { userID } });
  if (!user) {
    throw new NotFoundException('User not found');
  }
  // Ensure user has 'seller' role - adjust role check if needed
  if (user.role !== 'seller') {
    throw new BadRequestException('User must be a seller to create products');
  }

  // Create product entities (without imageURL)
  const productEntities = createStoreDto.products.map(productDto => {
    if (!createStoreDto.storeName) {
        throw new BadRequestException('Store name is required when creating products.');
    }
    return this.productRepository.create({
      productName: productDto.productName,
      productDescription: productDto.productDescription,
      productPrice: productDto.productPrice,
      productCategory: productDto.productCategory,
      userID: userID,
      storeName: createStoreDto.storeName // Assign store name from main DTO
    });
  });

  return this.productRepository.save(productEntities);
}

// Get Store Details by User ID
async getStoreByUserId(userID: string): Promise<{ storeName: string; products: Product[] }> {
  const products = await this.productRepository.find({ where: { userID }, order: { productID: 'ASC' } }); // Order for consistency

  if (!products || products.length === 0) {
    // If user exists but has no products, maybe return empty store?
    // Check if user exists first?
    const user = await this.userRepository.findOne({ where: { userID } });
    if (!user) throw new NotFoundException('User not found');

    // User exists but no products found, implying no store created this way yet.
    // Throwing 404 is reasonable if 'my-store' implies an existing store.
    throw new NotFoundException('No store or products found for this user.');
  }

  // Assume all products for a user belong to the same store
  const storeName = products[0].storeName;

  return {
    storeName,
    products // Products list (without imageURL)
  };
}

// Add a Product to existing store
async addProduct(userID: string, productDto: CreateProductDto): Promise<Product> {
  // Verify user exists and is a seller
  const user = await this.userRepository.findOne({ where: { userID } });
  if (!user) {
    throw new NotFoundException('User not found');
  }
  if (user.role !== 'seller') {
    throw new BadRequestException('User must be a seller to add products');
  }

  // If productDto doesn't include storeName, try to find it from existing products
  let storeName = productDto.storeName;
  if (!storeName) {
      const existingProducts = await this.productRepository.find({ where: { userID } });
      if (existingProducts.length > 0) {
          storeName = existingProducts[0].storeName; // Use existing store name
      } else {
          // Cannot add product if store name is missing and no other products exist
          throw new BadRequestException('Store name is required when adding the first product.');
      }
  }

  // Create and save the new product (without imageURL)
  const product = this.productRepository.create({
    ...productDto,
    userID,
    storeName // Ensure storeName is set
  });

  return this.productRepository.save(product);
}

// --- NEW Methods for Edit/Delete ---

// Update an existing product
async updateProduct(productId: number, updateProductDto: UpdateProductDto, userId: string): Promise<Product> {
  // Find the product by its ID
  const product = await this.productRepository.findOne({ where: { productID: productId } });

  // If product doesn't exist, throw 404
  if (!product) {
    throw new NotFoundException(`Product with ID ${productId} not found`);
  }

  // Check if the requesting user owns this product
  if (product.userID !== userId) {
    throw new ForbiddenException('You are not authorized to update this product');
  }

  // Merge the changes from DTO into the existing product entity
  // TypeORM handles updating only the provided fields
  this.productRepository.merge(product, updateProductDto);

  // Save the updated entity back to the database
  // TypeORM generates an UPDATE statement
  return this.productRepository.save(product);
}

// Delete a product
async deleteProduct(productId: number, userId: string): Promise<void> {
   // Find the product first to check ownership
   const product = await this.productRepository.findOne({ where: { productID: productId } });

   // If product doesn't exist, throw 404
   if (!product) {
     throw new NotFoundException(`Product with ID ${productId} not found`);
   }

   // Check if the requesting user owns this product
   if (product.userID !== userId) {
     throw new ForbiddenException('You are not authorized to delete this product');
   }

  // Perform the delete operation
  const deleteResult = await this.productRepository.delete(productId);

  // Check if any row was actually deleted
  if (deleteResult.affected === 0) {
      // This might happen in a race condition or if ID was invalid despite findOne check
      throw new NotFoundException(`Product with ID ${productId} could not be deleted.`);
  }
  // No return value needed, controller sends 204 No Content
}
}