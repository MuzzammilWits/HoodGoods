import { Controller, Get, Post, Delete, Param, Body, UseGuards, Req, HttpStatus, HttpException, ParseIntPipe, Patch } from '@nestjs/common'; // Added Patch, ParseIntPipe
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CartService, CartItemWithProductDetails } from './cart.service'; 
import { CreateCartItemDto } from './dto/create-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { SyncCartDto } from './dto/sync-cart.dto';
import { CartItem } from './entities/cart-item.entity'; 

@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  async getCart(@Req() req): Promise<CartItemWithProductDetails[]> { 
    try {
      return await this.cartService.getCart(req.user.sub);
    } catch (error) {
       console.error("Controller Error: Failed to fetch cart:", error);
       if (error instanceof HttpException) throw error;
       throw new HttpException('Failed to fetch cart', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post()
  async addToCart(@Req() req, @Body() dto: CreateCartItemDto): Promise<CartItem> { 
    try {
      
      return await this.cartService.addToCart(req.user.sub, dto);
    } catch (error) {
        console.error("Controller Error: Failed to add to cart:", error);
        if (error instanceof HttpException) throw error; 
        throw new HttpException('Failed to add item to cart', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('sync')
  async syncCart(@Req() req, @Body() dto: SyncCartDto) { 
    try {
      await this.cartService.syncCart(req.user.sub, dto.items);
      return { message: 'Cart synced successfully' };
    } catch (error) {
       console.error("Controller Error: Failed to sync cart:", error);
       if (error instanceof HttpException) throw error;
       throw new HttpException('Failed to sync cart', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  
  @Patch(':productId')
  async updateCartItem(
    @Req() req,
    @Param('productId', ParseIntPipe) productId: number, // Parse string param to number
    @Body() dto: UpdateCartItemDto
  ): Promise<CartItem> {
    try {
      return await this.cartService.updateCartItem(req.user.sub, productId, dto);
    } catch (error) {
      console.error("Controller Error: Failed to update cart item:", error);
      if (error instanceof HttpException) throw error; // Re-throw NotFoundException etc.
      throw new HttpException('Failed to update cart item', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Use ParseIntPipe for productId
  @Delete(':productId')
  async removeFromCart(
    @Req() req,
    @Param('productId', ParseIntPipe) productId: number // Parse string param to number
  ) {
    try {
      const success = await this.cartService.removeFromCart(req.user.sub, productId);
      if (!success) {
        throw new HttpException('Item not found in cart', HttpStatus.NOT_FOUND);
      }
     
      return { message: 'Item removed from cart' };
      
    } catch (error) {
      console.error("Controller Error: Failed to remove item:", error);
      if (error instanceof HttpException) throw error; 
      throw new HttpException('Failed to remove item from cart', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Delete() // Endpoint to clear the entire cart
  async clearCart(@Req() req) {
    try {
      const success = await this.cartService.clearCart(req.user.sub);
      if (!success) {
        // This might mean the cart was already empty, which isn't strictly an error.
         return { message: 'Cart cleared successfully (or was already empty)' };
        // Or throw 404 if you want to signal "nothing to clear":
      }
      return { message: 'Cart cleared successfully' };
    
    } catch (error) {
       console.error("Controller Error: Failed to clear cart:", error);
       if (error instanceof HttpException) throw error;
       throw new HttpException('Failed to clear cart', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}