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
  
  @Controller('/cart')
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