import { Injectable, NotFoundException, InternalServerErrorException, BadRequestException, Logger } from '@nestjs/common'; // Import Logger
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
}


@Injectable()
export class CartService {
  // Add a logger instance for better logging
  private readonly logger = new Logger(CartService.name);

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
            this.logger.log(`getCart: No cart items found for user ${userId}`);
            return [];
        }
        this.logger.log(`getCart: Found ${cartItems.length} cart items for user ${userId}. Product IDs: [${productIds.join(', ')}]`);

        // Fetch corresponding products efficiently
        const products = await this.productRepository.findByIds(productIds);
        this.logger.log(`getCart: Fetched ${products.length} products matching IDs.`);

        const productMap = new Map<number, Product>();
        products.forEach(product => productMap.set(product.prodId, product));

        const cartWithDetails: CartItemWithProductDetails[] = cartItems.map(item => {
            const product = productMap.get(item.productId);
            if (!product) {
                this.logger.warn(`getCart: Product with ID ${item.productId} not found for cart item ${item.cartID}. Excluding item.`);
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
            };
        }).filter(item => item !== null) as CartItemWithProductDetails[];

        this.logger.log(`getCart: Returning ${cartWithDetails.length} items with details for user ${userId}`);
        return cartWithDetails;

    } catch (error) {
        this.logger.error(`getCart: Error fetching cart for user ${userId}`, error.stack);
        throw new InternalServerErrorException("Failed to retrieve cart.");
    }
  }


  async addToCart(userId: string, dto: CreateCartItemDto): Promise<CartItem> {
    this.logger.log(`addToCart: User ${userId}, DTO: ${JSON.stringify(dto)}`);
    // ... (rest of addToCart logic remains the same)
    // 1. Find the product and check general availability
    const product = await this.productRepository.findOne({ where: { prodId: dto.productId } });
    if (!product) {
        throw new NotFoundException(`Product with ID ${dto.productId} not found.`);
    }
    // Ensure productquantity is treated as a number, handle null/undefined if necessary
    const availableStock = Number(product.productquantity);
    if (isNaN(availableStock) || availableStock < 0) {
        console.warn(`Product ${dto.productId} has invalid quantity: ${product.productquantity}`);
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
      this.logger.log(`addToCart: Updating existing item for product ${dto.productId} to quantity ${existingItem.quantity}`);
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
      this.logger.log(`addToCart: Creating new cart item for product ${dto.productId} with quantity ${dto.quantity}`);
      return this.cartRepository.save(newItem);
    }
  }

  async updateCartItem(userId: string, productId: number, dto: UpdateCartItemDto): Promise<CartItem> {
     this.logger.log(`updateCartItem: User ${userId}, Product ${productId}, DTO: ${JSON.stringify(dto)}`);
     // ... (rest of updateCartItem logic remains the same)
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
     this.logger.log(`updateCartItem: Updating product ${productId} to quantity ${item.quantity}`);
     return this.cartRepository.save(item);
   }

  // --- CORRECTED syncCart Method with Logging ---
  async syncCart(userId: string, items: CreateCartItemDto[]): Promise<void> {
    this.logger.log(`syncCart: Starting sync for user ${userId}. Received ${items.length} items.`);
    this.logger.debug(`syncCart: Received items payload: ${JSON.stringify(items)}`); // Log incoming data

    // Use TypeORM's transaction method for atomicity
    await this.cartRepository.manager.transaction(async (transactionalEntityManager: EntityManager) => {
        this.logger.log(`syncCart [Transaction]: Deleting existing cart items for user ${userId}...`);
        const deleteResult = await transactionalEntityManager.delete(CartItem, { userId });
        this.logger.log(`syncCart [Transaction]: Deleted ${deleteResult.affected ?? 0} items.`);

        if (items.length === 0) {
            this.logger.log(`syncCart [Transaction]: No items in payload, sync complete after delete.`);
            return; // Stop if sync list is empty
        }

        // --- Step 2: Get product details ---
        const productIds = items.map(item => item.productId);
        this.logger.log(`syncCart [Transaction]: Fetching product details for IDs: [${productIds.join(', ')}]`);
        let products: Product[];
        try {
             // Use the transactional entity manager
            products = await transactionalEntityManager.findByIds(Product, productIds);
            this.logger.log(`syncCart [Transaction]: Successfully fetched ${products.length} products.`);
            if(products.length !== productIds.length) {
                this.logger.warn(`syncCart [Transaction]: Mismatch between requested IDs (${productIds.length}) and fetched products (${products.length}).`);
            }
        } catch (error) {
            this.logger.error(`syncCart [Transaction]: Error fetching products by IDs`, error.stack);
            throw new InternalServerErrorException('Failed to fetch product details during sync.'); // Throw specific error
        }

        // --- Step 3: Validate products and build map ---
        const productMap = new Map<number, Product>();
        products.forEach(product => productMap.set(product.prodId, product));
        const missingIds = productIds.filter(id => !productMap.has(id));
        if (missingIds.length > 0) {
            this.logger.error(`syncCart [Transaction]: Products not found with IDs: ${missingIds.join(', ')}`);
            throw new NotFoundException(`Sync failed: Products not found with IDs: ${missingIds.join(', ')}.`);
        }
        this.logger.log(`syncCart [Transaction]: Product map created successfully.`);

        // --- Step 4: Create new cart items ---
        this.logger.log(`syncCart [Transaction]: Mapping ${items.length} incoming items to new CartItem entities...`);
        const newItems = items.map(item => {
            this.logger.debug(`syncCart [Transaction]: Processing item: ${JSON.stringify(item)}`);
            const product = productMap.get(item.productId);
            // Basic check (should always pass due to missingIds check, but good practice)
            if (!product) {
                 this.logger.error(`syncCart [Transaction]: Product ${item.productId} unexpectedly not found in map.`);
                 // Throw error here as this indicates a logic flaw
                 throw new InternalServerErrorException(`Sync failed: Product ${item.productId} missing during mapping.`);
            }

            const availableStock = Number(product.productquantity);
            if (isNaN(availableStock) || availableStock < 0) {
                this.logger.warn(`syncCart [Transaction]: Product ID ${item.productId} has invalid stock data (${product.productquantity}). Throwing error.`);
                throw new BadRequestException(`Product ID ${item.productId} has invalid stock data during sync.`);
            }

            let quantityToSave = item.quantity;
            if (quantityToSave > availableStock) {
                this.logger.log(`syncCart [Transaction]: Capping quantity for product ${item.productId} from ${quantityToSave} to ${availableStock} due to stock limit.`);
                quantityToSave = availableStock;
            }

            if (quantityToSave <= 0) {
                this.logger.log(`syncCart [Transaction]: Skipping product ${item.productId} as effective quantity is ${quantityToSave}.`);
                return null; // Filter this out later
            }

            // Use the transactional entity manager to create the entity instance
            const newItemEntity = transactionalEntityManager.create(CartItem, {
                userId,
                productId: item.productId,
                quantity: quantityToSave,
            });
            this.logger.debug(`syncCart [Transaction]: Created CartItem entity for product ${item.productId}, quantity ${quantityToSave}`);
            return newItemEntity;

        }).filter(item => item !== null) as CartItem[]; // Filter out null items

        this.logger.log(`syncCart [Transaction]: Mapped to ${newItems.length} valid new CartItem entities.`);

        // --- Step 5: Save the valid, potentially capped items ---
        if (newItems.length > 0) {
            this.logger.log(`syncCart [Transaction]: Attempting to save ${newItems.length} new cart items...`);
            try {
                // Use the transactional entity manager to save
                const savedItems = await transactionalEntityManager.save(newItems);
                this.logger.log(`syncCart [Transaction]: Successfully saved ${savedItems.length} new cart items.`);
            } catch (error) {
                this.logger.error(`syncCart [Transaction]: Error saving new cart items`, error.stack);
                 // Log the specific items it tried to save
                this.logger.error(`syncCart [Transaction]: Items attempted to save: ${JSON.stringify(newItems)}`);
                throw new InternalServerErrorException('Failed to save cart items during sync.'); // Throw specific error
            }
        } else {
            this.logger.log(`syncCart [Transaction]: No valid new items to save.`);
        }

        this.logger.log(`syncCart [Transaction]: Transaction completed successfully.`);
    }); // End of transaction block

    this.logger.log(`syncCart: Sync finished for user ${userId}.`);
  }

  // ... (rest of the service methods like removeFromCart, clearCart remain the same)
  async removeFromCart(userId: string, productId: number): Promise<boolean> {
    this.logger.log(`removeFromCart: User ${userId}, Product ${productId}`);
    const result = await this.cartRepository.delete({ userId, productId });
    this.logger.log(`removeFromCart: Deleted ${result.affected ?? 0} items.`);
    return (result.affected ?? 0) > 0;
  }

  async clearCart(userId: string): Promise<boolean> {
    this.logger.log(`clearCart: User ${userId}`);
    const result = await this.cartRepository.delete({ userId });
    this.logger.log(`clearCart: Deleted ${result.affected ?? 0} items.`);
    return (result.affected ?? 0) > 0;
  }
}
