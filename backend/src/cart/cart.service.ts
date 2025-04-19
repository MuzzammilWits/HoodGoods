import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeleteResult, Repository } from 'typeorm';
import { CartItem } from './entities/cart-item.entity';
import { CreateCartItemDto } from './dto/create-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(CartItem)
    private readonly cartItemRepository: Repository<CartItem>,
  ) {}

  async getCart(userId: string): Promise<CartItem[]> {
    return await this.cartItemRepository.find({ where: { userId } });
  }

  async addToCart(userId: string, createCartItemDto: CreateCartItemDto): Promise<CartItem> {
    const existingItem = await this.cartItemRepository.findOne({
      where: {
        userId,
        productId: createCartItemDto.productId,
      },
    });

    if (existingItem) {
      existingItem.quantity += createCartItemDto.quantity;
      return await this.cartItemRepository.save(existingItem);
    }

    const cartItem = this.cartItemRepository.create({
      ...createCartItemDto,
      userId,
    });
    return await this.cartItemRepository.save(cartItem);
  }

  async updateCartItem(
    userId: string,
    productId: string,
    updateCartItemDto: UpdateCartItemDto,
  ): Promise<CartItem> {
    const cartItem = await this.cartItemRepository.findOneOrFail({
      where: {
        userId,
        productId,
      },
    });

    cartItem.quantity = updateCartItemDto.quantity;
    return await this.cartItemRepository.save(cartItem);
  }

  async removeFromCart(userId: string, productId: string): Promise<boolean> {
    const result: DeleteResult = await this.cartItemRepository.delete({
      userId,
      productId,
    });
    return (result.affected ?? 0) > 0;
  }

  async clearCart(userId: string): Promise<boolean> {
    const result: DeleteResult = await this.cartItemRepository.delete({ userId });
    return (result.affected ?? 0) > 0;
  }
}