// src/store/store.controller.ts
import {
  Controller, Post, Body, Get, UseGuards, Req,
  Param, Patch, Delete, ParseIntPipe, HttpCode, HttpStatus,
  // Removed BadRequestException as user check might be handled by AuthGuard / Passport strategy
} from '@nestjs/common';
import { StoreService } from './store.service';
import { AuthGuard } from '@nestjs/passport';

// --- Corrected DTO Imports ---
import { CreateStoreDto } from './dto/create-store.dto'; // Use the main store DTO
import { CreateProductDto } from '../products/dto/create-product.dto'; // Use the product DTO from products module
import { UpdateProductDto } from '../products/dto/update-product.dto'; // Assuming path is correct
// --- End DTO Imports ---

import { Product } from '../products/entities/product.entity';
import { Store } from './entities/store.entity';

// Interface to represent the expected user structure from JWT payload
interface RequestWithUser extends Request {
  user: {
    sub: string; // User ID from JWT subject
    // Add other properties like email/role if they are in your JWT payload
  };
}

@Controller('stores') // Base route for this controller
export class StoreController {
  constructor(private readonly storeService: StoreService) {}

  // POST /stores - Create Store with initial products
  @UseGuards(AuthGuard('jwt'))
  @Post()
  async createStore(
    // Use the correct DTO class - ValidationPipe will validate this body
    @Body() createStoreDto: CreateStoreDto,
    @Req() req: RequestWithUser // Use typed request
  ): Promise<Store> {
    // The AuthGuard('jwt') should ensure req.user exists if authentication succeeds
    // The JWT strategy should ensure req.user.sub exists
    const userId = req.user.sub;
    return this.storeService.createStoreWithProducts(createStoreDto, userId);
  }

  // GET /stores/my-store - Get the user's own store details AND products
  @UseGuards(AuthGuard('jwt'))
  @Get('my-store')
  async getMyStore(@Req() req: RequestWithUser): Promise<{ store: Store; products: Product[] }> {
    const userId = req.user.sub;
    return this.storeService.getStoreByUserId(userId);
  }

  // POST /stores/products - Add a new product to the user's existing store
  @UseGuards(AuthGuard('jwt'))
  @Post('products')
  async addProduct(
    // Use the correct DTO class here for ValidationPipe to work
    // Note: Even though the service uses CreateProductDto, consider if a more specific AddProductDto is better long-term
    @Body() productDto: CreateProductDto,
    @Req() req: RequestWithUser
  ): Promise<Product> {
    const userId = req.user.sub;
    // The service method 'addProduct' now expects CreateProductDto directly
    return this.storeService.addProduct(userId, productDto);
  }

  // PATCH /stores/products/:id - Update an existing product
  @UseGuards(AuthGuard('jwt'))
  @Patch('products/:id')
  async updateProduct(
    @Param('id', ParseIntPipe) id: number, // Validate 'id' is an integer
    @Body() updateProductDto: UpdateProductDto, // ValidationPipe validates this body
    @Req() req: RequestWithUser,
  ): Promise<Product> {
    const userId = req.user.sub;
    return this.storeService.updateProduct(id, updateProductDto, userId);
  }

  // DELETE /stores/products/:id - Delete a product
  @UseGuards(AuthGuard('jwt'))
  @Delete('products/:id')
  @HttpCode(HttpStatus.NO_CONTENT) // Return 204 No Content on success
  async deleteProduct(
    @Param('id', ParseIntPipe) id: number, // Validate 'id' is an integer
    @Req() req: RequestWithUser
  ): Promise<void> {
    const userId = req.user.sub;
    await this.storeService.deleteProduct(id, userId);
    // No explicit return needed due to Promise<void> and @HttpCode
  }
}