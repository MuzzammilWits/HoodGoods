// src/store/store.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './product.entity'; // Uses the provided entity definition
import { User } from '../auth/user.entity'; // Assuming User entity definition is compatible
import { CreateProductDto, CreateStoreWithProductsDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class StoreService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>, // Assuming User entity has a 'userID' property/column used for lookup
  ) {}

  // Create Store with initial products
  async createStoreWithProducts(createStoreDto: CreateStoreWithProductsDto, userId: string): Promise<Product[]> {
    // Find the user (Assuming User entity has userID as primary key)
    const user = await this.userRepository.findOne({ where: { userID: userId } }); // Adjust 'userID' if User entity uses a different property name
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.role !== 'seller') {
      throw new BadRequestException('User must be a seller to create products');
    }

    if (!createStoreDto.storeName) {
        throw new BadRequestException('Store name is required when creating a store with products.');
    }

    // Create product entities using the new property names
    const productEntities = createStoreDto.products.map(productDto => {
      // --- Ensure imageUrl is included ---
      if (!productDto.imageUrl) { // Changed from imageURL
        throw new BadRequestException(`Image URL is missing for product: ${productDto.name}`); // Changed from productName
      }
      return this.productRepository.create({
        name: productDto.name,                 // Changed from productName
        description: productDto.description,   // Changed from productDescription
        price: productDto.price,               // Changed from productPrice
        category: productDto.category,         // Changed from productCategory
        imageUrl: productDto.imageUrl,         // Changed from imageURL
        userId: userId,                        // Changed from userID (matches entity property)
        storeName: createStoreDto.storeName,   // Matches entity property
        isActive: true                         // Matches entity property
      });
    });

    return this.productRepository.save(productEntities);
  }

  // Get Store Details by User ID
  async getStoreByUserId(userId: string): Promise<{ storeName: string; products: Product[] }> {
    // Find products using the 'userId' property name from the Product entity
    const products = await this.productRepository.find({
        where: { userId: userId },          // Use entity property 'userId'
        order: { prodId: 'ASC' }            // Use entity property 'prodId'
    });

    if (!products || products.length === 0) {
      // Check if user exists to differentiate between 'no user' and 'user with no store'
      const user = await this.userRepository.findOne({ where: { userID: userId } }); // Adjust 'userID' if User entity uses a different property name
      if (!user) throw new NotFoundException('User not found');
      throw new NotFoundException('No store or products found for this user.');
    }

    // All products for a user should belong to the same store
    const storeName = products[0].storeName;

    // The 'products' array automatically contains entities with the updated property names
    return {
      storeName,
      products
    };
  }

  // Add a Product to an existing store
  async addProduct(userId: string, productDto: CreateProductDto): Promise<Product> {
    // Find the user (Assuming User entity has userID as primary key)
    const user = await this.userRepository.findOne({ where: { userID: userId } }); // Adjust 'userID' if User entity uses a different property name
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.role !== 'seller') {
      throw new BadRequestException('User must be a seller to add products');
    }

    // Infer storeName if not provided in DTO
    let storeName = productDto.storeName;
    if (!storeName) {
      const existingProducts = await this.productRepository.find({ where: { userId: userId } }); // Use entity property 'userId'
      if (existingProducts.length > 0) {
        storeName = existingProducts[0].storeName; // Use existing store name
      } else {
        // This case implies a user is adding their *very first* product via this endpoint
        // instead of createStoreWithProducts. Require storeName explicitly here.
        throw new BadRequestException('Store name is required when adding the first product.');
      }
    }

    // --- Ensure imageUrl is included ---
    if (!productDto.imageUrl) { // Changed from imageURL
      throw new BadRequestException(`Image URL is missing for the new product.`);
    }

    // Create and save the new product using the new property names
    const product = this.productRepository.create({
      // Spread properties from DTO (name, description, price, category, imageUrl)
      ...productDto,
      userId: userId,         // Changed from userID (matches entity property)
      storeName: storeName,   // Ensure inferred or provided storeName is set
      isActive: true          // Default to active, matches entity property
    });

    return this.productRepository.save(product);
  }

  // Update an existing product
  async updateProduct(productId: number, updateProductDto: UpdateProductDto, userId: string): Promise<Product> {
    // Find product using 'prodId' property name from the Product entity
    const product = await this.productRepository.findOne({ where: { prodId: productId } }); // Use entity property 'prodId'
    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    // Authorization check using 'userId' property from Product entity
    if (product.userId !== userId) { // Use entity property 'userId'
      throw new ForbiddenException('You are not authorized to update this product');
    }

    // Merge automatically handles optional fields from the updated DTO
    // It maps updateProductDto properties (name, description, etc.) to product properties
    this.productRepository.merge(product, updateProductDto);

    return this.productRepository.save(product);
  }

  // Delete a product
  async deleteProduct(productId: number, userId: string): Promise<void> {
    // Find product using 'prodId' property name from the Product entity
    const product = await this.productRepository.findOne({ where: { prodId: productId } }); // Use entity property 'prodId'
    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    // Authorization check using 'userId' property from Product entity
    if (product.userId !== userId) { // Use entity property 'userId'
      throw new ForbiddenException('You are not authorized to delete this product');
    }

    // Delete uses the primary key value, which TypeORM maps correctly
    const deleteResult = await this.productRepository.delete(productId);
    if (deleteResult.affected === 0) {
      // Should ideally not happen if findOne succeeded, but good practice to check
      throw new NotFoundException(`Product with ID ${productId} could not be deleted (might have been deleted already).`);
    }
  }
}