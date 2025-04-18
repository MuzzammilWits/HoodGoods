// src/store/store.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './product.entity';
import { User } from '../auth/user.entity';
import { CreateProductDto, CreateStoreWithProductsDto } from './dto/create-product.dto';

@Injectable()
export class StoreService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async createStoreWithProducts(createStoreDto: CreateStoreWithProductsDto, userID: string): Promise<Product[]> {
    // Verify user exists and is a seller
    const user = await this.userRepository.findOne({ where: { userID } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    
    if (user.role !== 'seller') {
      throw new BadRequestException('User must be a seller to create products');
    }

    // Check if user already has products (optional check, depending on logic)
    // const existingProducts = await this.productRepository.find({ where: { userID } });
    
    // Create product entities without imageURL
    const productEntities = createStoreDto.products.map(productDto => {
      return this.productRepository.create({
        productName: productDto.productName,
        productDescription: productDto.productDescription,
        productPrice: productDto.productPrice,
        productCategory: productDto.productCategory,
        // imageURL Assignment REMOVED
        // imageURL: productDto.imageURL, 
        userID: userID,
        storeName: createStoreDto.storeName
      });
    });

    // Save products
    return this.productRepository.save(productEntities);
  }

  async getStoreByUserId(userID: string): Promise<{ storeName: string; products: Product[] }> {
    // No changes needed here
    const products = await this.productRepository.find({ where: { userID } });

    if (!products || products.length === 0) {
      // Consider creating an empty store or handling this differently if a user exists but has no store/products yet
      throw new NotFoundException('No products found for this user. Store may not exist.');
    }

    // Get the store name from the first product
    const storeName = products[0].storeName;

    return {
      storeName,
      products // Products fetched will not have imageURL
    };
  }

  async addProduct(userID: string, productDto: CreateProductDto): Promise<Product> {
    // Verify user exists and is a seller
    const user = await this.userRepository.findOne({ where: { userID } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    
    if (user.role !== 'seller') {
      throw new BadRequestException('User must be a seller to add products');
    }
    
    // Get existing products to check store name
    const existingProducts = await this.productRepository.find({ where: { userID } });
    
    // If no store name is provided but user has products, use the existing store name
    // Ensure productDto.storeName is properly handled if it's optional in the DTO
    if (!productDto.storeName && existingProducts.length > 0) {
      productDto.storeName = existingProducts[0].storeName;
    } else if (!productDto.storeName && existingProducts.length === 0) {
        // Handle case where it's the first product being added this way
        // Maybe throw an error or require storeName in DTO if this path is possible
        throw new BadRequestException('Store name is required when adding the first product.');
    }
    
    // Create and save the new product without imageURL
    const product = this.productRepository.create({
      ...productDto, // Spreads DTO which no longer contains imageURL
      userID
    });

    return this.productRepository.save(product);
  }
}