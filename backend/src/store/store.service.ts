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
    // ... (user verification remains the same) ...
     const user = await this.userRepository.findOne({ where: { userID } });
     if (!user) {
       throw new NotFoundException('User not found');
     }
     if (user.role !== 'seller') {
       throw new BadRequestException('User must be a seller to create products');
     }

    // Create product entities, now including imageURL
    const productEntities = createStoreDto.products.map(productDto => {
      if (!createStoreDto.storeName) {
          throw new BadRequestException('Store name is required when creating products.');
      }
      // --- Ensure imageURL is included ---
      if (!productDto.imageURL) {
          // This validation should ideally happen at the DTO level, but double-check here
          throw new BadRequestException(`Image URL is missing for product: ${productDto.productName}`);
      }
      return this.productRepository.create({
        productName: productDto.productName,
        productDescription: productDto.productDescription,
        productPrice: productDto.productPrice,
        productCategory: productDto.productCategory,
        imageURL: productDto.imageURL, // <--- ADDED
        userID: userID,
        storeName: createStoreDto.storeName // Assign store name from main DTO
      });
    });

    return this.productRepository.save(productEntities);
  }

  // Get Store Details by User ID
  async getStoreByUserId(userID: string): Promise<{ storeName: string; products: Product[] }> {
    // The find operation automatically includes all columns defined in the entity,
    // including the newly added imageURL. No change needed here.
    const products = await this.productRepository.find({ where: { userID }, order: { productID: 'ASC' } });

    if (!products || products.length === 0) {
      // ... (logic remains the same) ...
       const user = await this.userRepository.findOne({ where: { userID } });
       if (!user) throw new NotFoundException('User not found');
       throw new NotFoundException('No store or products found for this user.');
    }

    const storeName = products[0].storeName;

    return {
      storeName,
      products // This array now includes products with imageURL
    };
  }

  // Add a Product to existing store
  async addProduct(userID: string, productDto: CreateProductDto): Promise<Product> {
    // ... (user/role verification remains the same) ...
     const user = await this.userRepository.findOne({ where: { userID } });
     if (!user) {
       throw new NotFoundException('User not found');
     }
     if (user.role !== 'seller') {
       throw new BadRequestException('User must be a seller to add products');
     }

    // ... (storeName inference logic remains the same) ...
    let storeName = productDto.storeName;
    if (!storeName) {
        const existingProducts = await this.productRepository.find({ where: { userID } });
        if (existingProducts.length > 0) {
            storeName = existingProducts[0].storeName; // Use existing store name
        } else {
            throw new BadRequestException('Store name is required when adding the first product.');
        }
    }

    // --- Ensure imageURL is included ---
    if (!productDto.imageURL) {
        throw new BadRequestException(`Image URL is missing for the new product.`);
    }

    // Create and save the new product, now including imageURL
    const product = this.productRepository.create({
      ...productDto, // Spreads productName, description, price, category, imageURL
      userID,
      storeName // Ensure storeName is set
    });

    return this.productRepository.save(product);
  }

  // Update an existing product
  async updateProduct(productId: number, updateProductDto: UpdateProductDto, userId: string): Promise<Product> {
    const product = await this.productRepository.findOne({ where: { productID: productId } });
    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }
    if (product.userID !== userId) {
      throw new ForbiddenException('You are not authorized to update this product');
    }

    // Merge will automatically handle the optional imageURL from the DTO
    this.productRepository.merge(product, updateProductDto);

    return this.productRepository.save(product);
  }

  // Delete a product
  async deleteProduct(productId: number, userId: string): Promise<void> {
     // ... (logic remains the same) ...
     const product = await this.productRepository.findOne({ where: { productID: productId } });
     if (!product) {
       throw new NotFoundException(`Product with ID ${productId} not found`);
     }
     if (product.userID !== userId) {
       throw new ForbiddenException('You are not authorized to delete this product');
     }
     const deleteResult = await this.productRepository.delete(productId);
     if (deleteResult.affected === 0) {
       throw new NotFoundException(`Product with ID ${productId} could not be deleted.`);
     }
  }
}