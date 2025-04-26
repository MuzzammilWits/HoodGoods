import { Injectable, NotFoundException, InternalServerErrorException, BadRequestException } from '@nestjs/common'; // Added BadRequestException
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CartItem } from './entities/cart-item.entity';
import { CreateCartItemDto } from './dto/create-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { Product } from '../products/entities/product.entity'; // Adjusted path to match the correct location of product.entity

// Interface for the structure returned to the frontend remains the same
export interface CartItemWithProductDetails extends Omit<CartItem, 'user' | 'product'> {
    productName: string;
    productPrice: number;
    imageUrl: string | null;
    availableQuantity: number; // Optional: This could be added if needed by the frontend
    // You could potentially add availableQuantity here if needed by the frontend
}


@Injectable()
export class CartService {
  constructor(
    @InjectRepository(CartItem)
    private readonly cartRepository: Repository<CartItem>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  // getCart remains largely the same, but could optionally include available quantity
  async getCart(userId: string): Promise<CartItemWithProductDetails[]> {
    try {
        const cartItems = await this.cartRepository.find({
            where: { userId },
            order: { cartID: 'ASC' } // Example: order by cartID if needed
        });

        const productIds = cartItems.map(item => item.productId);
        if (productIds.length === 0) return [];

        const products = await this.productRepository.findByIds(productIds);
        const productMap = new Map<number, Product>();
        products.forEach(product => productMap.set(product.prodId, product));

        const cartWithDetails: CartItemWithProductDetails[] = cartItems.map(item => {
            const product = productMap.get(item.productId);
            if (!product) {
                console.warn(`Product with ID ${item.productId} not found for cart item ${item.cartID}. Consider removing this item.`);
                // Optionally remove the orphaned item here:
                // this.cartRepository.delete({ cartID: item.cartID });
                return null;
            }
            const { userId, productId: itemProduct, ...cartItemData } = item;
            return {
                ...cartItemData,
                productName: product.name,
                productPrice: product.price,
                imageUrl: product.imageUrl,
                 availableQuantity: product.productquantity,
            };
        }).filter(item => item !== null) as CartItemWithProductDetails[];

        return cartWithDetails;

    } catch (error) {
        console.error("Error fetching cart with product details:", error);
        throw new InternalServerErrorException("Failed to retrieve cart.");
    }
  }


  async addToCart(userId: string, dto: CreateCartItemDto): Promise<CartItem> {
    // 1. Find the product and check general availability
    const product = await this.productRepository.findOne({ where: { prodId: dto.productId } });
    if (!product) {
        throw new NotFoundException(`Product with ID ${dto.productId} not found.`);
    }
    if (product.productquantity == null || product.productquantity < 0) {
         console.warn(`Product ${dto.productId} has invalid quantity: ${product.productquantity}`);
         throw new BadRequestException(`Product with ID ${dto.productId} is currently unavailable (invalid stock).`);
    }
    if (product.productquantity === 0) {
        throw new BadRequestException(`Product "${product.name}" is out of stock.`);
    }


    // 2. Check if item already exists in the cart
    const existingItem = await this.cartRepository.findOne({
      where: { userId, productId: dto.productId }
    });

    if (existingItem) {
      // 3a. Item exists: Check if *adding* quantity exceeds stock
      const newQuantity = existingItem.quantity + dto.quantity;
      if (newQuantity > product.productquantity) {
          // Option 1: Throw error (Implemented below)
           throw new BadRequestException(`Cannot add ${dto.quantity} more items. Only ${product.productquantity - existingItem.quantity} left in stock for "${product.name}". Total available: ${product.productquantity}.`);
          // Option 2: Cap quantity (Alternative)
          // existingItem.quantity = product.productquantity;
          // console.log(`Quantity capped at ${product.productquantity} for product ${dto.productId} due to stock limit.`);
      } else {
          existingItem.quantity = newQuantity;
      }
      return this.cartRepository.save(existingItem);

    } else {
      // 3b. New item: Check if requested quantity exceeds stock
      if (dto.quantity > product.productquantity) {
         throw new BadRequestException(`Cannot add ${dto.quantity} items. Only ${product.productquantity} available for "${product.name}".`);
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
        // This case should ideally not happen if product existed when added to cart,
        // but good to handle defensively. Could also remove the cart item here.
        throw new NotFoundException(`Product with ID ${productId} not found (might have been deleted).`);
     }
     if (product.productquantity == null || product.productquantity < 0) {
         throw new BadRequestException(`Product with ID ${productId} is currently unavailable (invalid stock).`);
     }

     // 3. Check if the requested quantity exceeds available stock
     if (dto.quantity > product.productquantity) {
        throw new BadRequestException(`Cannot set quantity to ${dto.quantity}. Only ${product.productquantity} available for "${product.name}".`);
     }

     // 4. Update quantity if valid
     item.quantity = dto.quantity;
     return this.cartRepository.save(item);
  }

  // removeFromCart and clearCart do not need stock checks

  async removeFromCart(userId: string, productId: number): Promise<boolean> {
    // ... (previous implementation is fine)
    const result = await this.cartRepository.delete({ userId, productId });
    return (result.affected ?? 0) > 0;
  }

  async clearCart(userId: string): Promise<boolean> {
    // ... (previous implementation is fine)
    const result = await this.cartRepository.delete({ userId });
    return (result.affected ?? 0) > 0;
  }

  async syncCart(userId: string, items: CreateCartItemDto[]): Promise<void> {
    await this.cartRepository.manager.transaction(async (manager) => {
      // 1. Clear existing cart
      await manager.delete(CartItem, { userId });

      if (items.length === 0) return; // Stop if sync list is empty

      // 2. Get product details for all items being synced
      const productIds = items.map(item => item.productId);
      const products = await manager.findByIds(Product, productIds.map(id => ({ prodId: id }))); // Use transaction manager
      const productMap = new Map<number, Product>();

      // 3. Validate products and build map
      products.forEach(product => productMap.set(product.prodId, product));
      const missingIds = productIds.filter(id => !productMap.has(id));
      if (missingIds.length > 0) {
          console.warn(`Sync failed: Products not found with IDs: ${missingIds.join(', ')}`);
          throw new NotFoundException(`Sync failed: Products not found with IDs: ${missingIds.join(', ')}.`);
      }


      // 4. Create new cart items, checking and capping quantity against stock
      const newItems = items.map(item => {
        const product = productMap.get(item.productId);
        // We know product exists from the check above, but double-check quantity validity
        if (!product || product.productquantity == null || product.productquantity < 0) {
             throw new BadRequestException(`Product ID ${item.productId} has invalid stock data during sync.`);
        }

        let quantityToSave = item.quantity;

        // Check and cap quantity
        if (quantityToSave > product.productquantity) {
            console.log(`Sync: Capping quantity for product ${item.productId} from ${quantityToSave} to ${product.productquantity} due to stock limit.`);
            quantityToSave = product.productquantity;
        }

        // Skip adding if capped quantity is zero (or less, though should be positive)
        if (quantityToSave <= 0) {
            console.log(`Sync: Skipping product ${item.productId} as available quantity is zero or capped quantity is zero.`);
            return null; // Filter this out later
        }


        return manager.create(CartItem, { // Use transaction manager
          userId,
          productId: item.productId,
          quantity: quantityToSave, // Use potentially capped quantity
        });
      }).filter(item => item !== null) as CartItem[]; // Filter out null items (skipped due to 0 quantity)


      // 5. Save the valid, potentially capped items
      if (newItems.length > 0) {
          await manager.save(newItems); // Use transaction manager
      }
    });
  }
}