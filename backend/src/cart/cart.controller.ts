import { Controller, Get, Post, Delete, Param, Body, UseGuards, Req, HttpStatus, HttpException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CartService } from './cart.service';
import { CreateCartItemDto } from './dto/create-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { SyncCartDto } from './dto/sync-cart.dto';

@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  async getCart(@Req() req) {
    try {
      return await this.cartService.getCart(req.user.sub);
    } catch (error) {
      throw new HttpException('Failed to fetch cart', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post()
  async addToCart(@Req() req, @Body() dto: CreateCartItemDto) {
    try {
      return await this.cartService.addToCart(req.user.sub, dto);
    } catch (error) {
      throw new HttpException('Failed to add to cart', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('sync')
  async syncCart(@Req() req, @Body() dto: SyncCartDto) {
    try {
      await this.cartService.syncCart(req.user.sub, dto.items);
      return { message: 'Cart synced successfully' };
    } catch (error) {
      throw new HttpException('Failed to sync cart', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post(':productId')
  async updateCartItem(@Req() req, @Param('productId') productId: string, @Body() dto: UpdateCartItemDto) {
    try {
      return await this.cartService.updateCartItem(req.user.sub, productId, dto);
    } catch (error) {
      throw new HttpException('Failed to update cart item', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Delete(':productId')
  async removeFromCart(@Req() req, @Param('productId') productId: string) {
    try {
      const success = await this.cartService.removeFromCart(req.user.sub, productId);
      if (!success) throw new HttpException('Item not found', HttpStatus.NOT_FOUND);
      return { message: 'Item removed from cart' };
    } catch (error) {
      throw new HttpException('Failed to remove item', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Delete()
  async clearCart(@Req() req) {
    try {
      const success = await this.cartService.clearCart(req.user.sub);
      if (!success) throw new HttpException('Cart already empty', HttpStatus.NOT_FOUND);
      return { message: 'Cart cleared' };
    } catch (error) {
      throw new HttpException('Failed to clear cart', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}