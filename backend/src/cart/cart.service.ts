import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CartItem } from './entities/cart-item.entity';
import { CreateCartItemDto } from './dto/create-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(CartItem)
    private readonly cartRepository: Repository<CartItem>,
  ) {}

  async getCart(userId: string): Promise<CartItem[]> {
    return this.cartRepository.find({ 
      where: { userId },
      order: { createdAt: 'DESC' }
    });
  }

  async addToCart(userId: string, dto: CreateCartItemDto): Promise<CartItem> {
    // First check if product exists (optional but recommended)
    const existingItem = await this.cartRepository.findOne({
      where: { 
        userId, 
        productId: dto.productId 
      }
    });
  
    if (existingItem) {
      existingItem.quantity += dto.quantity || 1;
      existingItem.updatedAt = new Date();
      return this.cartRepository.save(existingItem);
    }
  
    const newItem = this.cartRepository.create({
      ...dto,
      userId,
      quantity: dto.quantity || 1, // Default to 1 if not specified
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    return this.cartRepository.save(newItem);
  }

  async updateCartItem(userId: string, productId: string, dto: UpdateCartItemDto): Promise<CartItem> {
    const item = await this.cartRepository.findOneOrFail({
      where: { userId, productId }
    });
    item.quantity = dto.quantity;
    return this.cartRepository.save(item);
  }

  async removeFromCart(userId: string, productId: string): Promise<boolean> {
    const result = await this.cartRepository.delete({ userId, productId });
    return (result.affected ?? 0) > 0;
  }
  
  async clearCart(userId: string): Promise<boolean> {
    const result = await this.cartRepository.delete({ userId });
    return (result.affected ?? 0) > 0;
  }
  async syncCart(userId: string, items: CreateCartItemDto[]): Promise<void> {
    await this.cartRepository.manager.transaction(async (manager) => {
      await manager.delete(CartItem, { userId });
      const newItems = items.map(item => manager.create(CartItem, {
        ...item,
        userId,
        createdAt: new Date()
      }));
      await manager.save(newItems);
    });
  }
}