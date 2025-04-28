import { Injectable, NotFoundException, InternalServerErrorException, BadRequestException } from '@nestjs/common'; // Removed Logger
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm'; // Import EntityManager
import { CartItem } from './entities/cart-item.entity';
import { CreateCartItemDto } from './dto/create-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { Product } from '../products/entities/product.entity'; // Ensure this path is correct

// Interface for the structure returned to the frontend
export interface CartItemWithProductDetails extends Omit<CartItem, 'user' | 'product'> {
    productId: number;
    productName: string;
    productPrice: number;
    imageUrl: string | null;
    availableQuantity: number;
    storeName: string;
}


@Injectable()
export class CartService {
  // Removed logger instance

  constructor(
    @InjectRepository(CartItem)
    private readonly cartRepository: Repository<CartItem>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  // --- CORRECTED getCart Method ---
  async getCart(userId: string): Promise<CartItemWithProductDetails[]> {
    try {
        const cartItems = await this.cartRepository.find({
            where: { userId },
            order: { cartID: 'ASC' }
        });

        const productIds = cartItems.map(item => item.productId);
        if (productIds.length === 0) {
            return [];
        }

        // Fetch corresponding products efficiently
        const products = await this.productRepository.findByIds(productIds);

        const productMap = new Map<number, Product>();
        products.forEach(product => productMap.set(product.prodId, product));

        const cartWithDetails: CartItemWithProductDetails[] = cartItems.map(item => {
            const product = productMap.get(item.productId);
            if (!product) {
                // Optionally log a warning if a product is missing in production
                // console.warn(`Product with ID ${item.productId} not found for cart item ${item.cartID}. Excluding item.`);
                return null;
            }

            return {
                cartID: item.cartID,
                productId: item.productId,
                quantity: item.quantity,
                productName: product.name,
                productPrice: product.price,
                imageUrl: product.imageUrl,
                availableQuantity: product.productquantity,
                storeName: product.storeName,
            };
        }).filter(item => item !== null) as CartItemWithProductDetails[];

        return cartWithDetails as CartItemWithProductDetails[]; // Your existing return line
       

    } catch (error) {
        // Consider more specific error logging in production if needed
        console.error(`getCart: Error fetching cart for user ${userId}`, error.stack);
        throw new InternalServerErrorException("Failed to retrieve cart.");
    }
  }


  async addToCart(userId: string, dto: CreateCartItemDto): Promise<CartItem> {
    // 1. Find the product and check general availability
    const product = await this.productRepository.findOne({ where: { prodId: dto.productId } });
    if (!product) {
        throw new NotFoundException(`Product with ID ${dto.productId} not found.`);
    }
    const availableStock = Number(product.productquantity);
    if (isNaN(availableStock) || availableStock < 0) {
        // console.warn(`Product ${dto.productId} has invalid quantity: ${product.productquantity}`);
        throw new BadRequestException(`Product with ID ${dto.productId} is currently unavailable (invalid stock).`);
    }
    if (availableStock === 0) {
        throw new BadRequestException(`Product "${product.name}" is out of stock.`);
    }

    // 2. Check if item already exists in the cart
    const existingItem = await this.cartRepository.findOne({
      where: { userId, productId: dto.productId }
    });

    if (existingItem) {
      // 3a. Item exists: Check if *adding* quantity exceeds stock
      const newQuantity = existingItem.quantity + dto.quantity;
      if (newQuantity > availableStock) {
          throw new BadRequestException(`Cannot add ${dto.quantity} more items. Only ${availableStock - existingItem.quantity} left in stock for "${product.name}". Total available: ${availableStock}.`);
      } else {
          existingItem.quantity = newQuantity;
      }
      return this.cartRepository.save(existingItem);

    } else {
      // 3b. New item: Check if requested quantity exceeds stock
      if (dto.quantity > availableStock) {
         throw new BadRequestException(`Cannot add ${dto.quantity} items. Only ${availableStock} available for "${product.name}".`);
      }
      // Create new item if quantity is valid
      const newItem = this.cartRepository.create({
        userId,
        productId: dto.productId,
        quantity: dto.quantity,
      });
      return this.cartRepository.save(newItem);
    }
  }

  async updateCartItem(userId: string, productId: number, dto: UpdateCartItemDto): Promise<CartItem> {
     // Ensure quantity is positive
     if (dto.quantity <= 0) {
         throw new BadRequestException('Quantity must be greater than zero. Use remove endpoint to delete item.');
     }

     // 1. Find the cart item
     const item = await this.cartRepository.findOne({
       where: { userId, productId }
     });
     if (!item) {
       throw new NotFoundException(`Cart item with product ID ${productId} not found for this user.`);
     }

     // 2. Find the corresponding product to check stock
     const product = await this.productRepository.findOne({ where: { prodId: productId } });
     if (!product) {
       throw new NotFoundException(`Product with ID ${productId} not found (might have been deleted).`);
     }
     const availableStock = Number(product.productquantity);
     if (isNaN(availableStock) || availableStock < 0) {
         throw new BadRequestException(`Product with ID ${productId} is currently unavailable (invalid stock).`);
     }

     // 3. Check if the requested quantity exceeds available stock
     if (dto.quantity > availableStock) {
       throw new BadRequestException(`Cannot set quantity to ${dto.quantity}. Only ${availableStock} available for "${product.name}".`);
     }

     // 4. Update quantity if valid
     item.quantity = dto.quantity;
     return this.cartRepository.save(item);
   }

  // --- CORRECTED syncCart Method without Logging ---
  async syncCart(userId: string, items: CreateCartItemDto[]): Promise<void> {
    // Use TypeORM's transaction method for atomicity
    await this.cartRepository.manager.transaction(async (transactionalEntityManager: EntityManager) => {
        // Delete existing cart items
        await transactionalEntityManager.delete(CartItem, { userId });

        if (items.length === 0) {
            return; // Stop if sync list is empty
        }

        // Get product details
        const productIds = items.map(item => item.productId);
        let products: Product[];
        try {
            products = await transactionalEntityManager.findByIds(Product, productIds);
            // Optional: Check for mismatch if needed in production
            // if(products.length !== productIds.length) { ... }
        } catch (error) {
            console.error(`syncCart [Transaction]: Error fetching products by IDs`, error.stack); // Keep essential error logging
            throw new InternalServerErrorException('Failed to fetch product details during sync.');
        }

        // Validate products and build map
        const productMap = new Map<number, Product>();
        products.forEach(product => productMap.set(product.prodId, product));
        const missingIds = productIds.filter(id => !productMap.has(id));
        if (missingIds.length > 0) {
            throw new NotFoundException(`Sync failed: Products not found with IDs: ${missingIds.join(', ')}.`);
        }

        // Create new cart items
        const newItems = items.map(item => {
            const product = productMap.get(item.productId);
            if (!product) {
                 // This indicates a logic flaw if it happens after the missingIds check
                 console.error(`syncCart [Transaction]: Product ${item.productId} unexpectedly not found in map.`);
                 throw new InternalServerErrorException(`Sync failed: Product ${item.productId} missing during mapping.`);
            }

            const availableStock = Number(product.productquantity);
            if (isNaN(availableStock) || availableStock < 0) {
                throw new BadRequestException(`Product ID ${item.productId} has invalid stock data during sync.`);
            }

            let quantityToSave = item.quantity;
            if (quantityToSave > availableStock) {
                // Cap quantity silently or throw error based on requirements
                quantityToSave = availableStock;
            }

            if (quantityToSave <= 0) {
                return null; // Filter this out later
            }

            // Use the transactional entity manager to create the entity instance
            const newItemEntity = transactionalEntityManager.create(CartItem, {
                userId,
                productId: item.productId,
                quantity: quantityToSave,
            });
            return newItemEntity;

        }).filter(item => item !== null) as CartItem[]; // Filter out null items

        // Save the valid, potentially capped items
        if (newItems.length > 0) {
            try {
                await transactionalEntityManager.save(newItems);
            } catch (error) {
                console.error(`syncCart [Transaction]: Error saving new cart items`, error.stack); // Keep essential error logging
                // console.error(`syncCart [Transaction]: Items attempted to save: ${JSON.stringify(newItems)}`); // Optional detailed logging
                throw new InternalServerErrorException('Failed to save cart items during sync.');
            }
        }
    }); // End of transaction block
  }


  async removeFromCart(userId: string, productId: number): Promise<boolean> {
    const result = await this.cartRepository.delete({ userId, productId });
    return (result.affected ?? 0) > 0;
  }

  async clearCart(userId: string): Promise<boolean> {
    const result = await this.cartRepository.delete({ userId });
    return (result.affected ?? 0) > 0;
  }
}
