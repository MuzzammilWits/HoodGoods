import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Delete,
  Param,
  UseGuards,
  Req,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { CreateCartItemDto } from './dto/create-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SyncCartDto } from './dto/sync-cart.dto';

@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController { 
  constructor(private readonly cartService: CartService) {}

  @Get()
  async getCart(@Req() req) {
    return await this.cartService.getCart(req.user.sub);
  }

  @Post()
  async addToCart(@Req() req, @Body() createCartItemDto: CreateCartItemDto) {
    return await this.cartService.addToCart(req.user.sub, createCartItemDto);
  }

  @Post('sync')
  async syncCart(@Req() req, @Body() syncCartDto: SyncCartDto) {
    try {
      await this.cartService.syncCart(req.user.sub, syncCartDto.items);
      return { message: 'Cart synced successfully' };
    } catch (error) {
      throw new HttpException('Failed to sync cart', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Patch(':productId')
  async updateCartItem(
    @Req() req,
    @Param('productId') productId: string,
    @Body() updateCartItemDto: UpdateCartItemDto,
  ) {
    return await this.cartService.updateCartItem(
      req.user.sub,
      productId,
      updateCartItemDto,
    );
  }

  @Delete(':productId')
  async removeFromCart(@Req() req, @Param('productId') productId: string) {
    const success = await this.cartService.removeFromCart(req.user.sub, productId);
    if (!success) {
      throw new HttpException('Item not found in cart', HttpStatus.NOT_FOUND);
    }
    return { message: 'Item removed from cart' };
  }

  @Delete()
  async clearCart(@Req() req) {
    const success = await this.cartService.clearCart(req.user.sub);
    if (!success) {
      throw new HttpException('No items found in cart', HttpStatus.NOT_FOUND);
    }
    return { message: 'Cart cleared successfully' };
  }
}