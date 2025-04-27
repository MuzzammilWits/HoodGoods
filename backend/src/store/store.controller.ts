// src/store/store.controller.ts
import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Req,
  BadRequestException,
  Param,
  Patch, // Added
  Delete, // Added
  ParseIntPipe, // Added
  HttpCode, // Added
  HttpStatus // Added
} from '@nestjs/common';
import { StoreService } from './store.service';
import { AuthGuard } from '@nestjs/passport'; // Assuming default 'jwt' strategy
import { CreateProductDto, CreateStoreWithProductsDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto'; // Added

@Controller('stores')
export class StoreController {
constructor(private readonly storeService: StoreService) {}

// Create Store with initial products
@UseGuards(AuthGuard('jwt'))
@Post()
async createStore(@Body() createStoreDto: CreateStoreWithProductsDto, @Req() req: any) {
  // >>> ADD CONSOLE LOG HERE <<<
  console.log('CTRL: Received CreateStore DTO:', JSON.stringify(createStoreDto, null, 2));
  // >>> END CONSOLE LOG <<<

  // Ensure user ID exists in the request (added by AuthGuard)
  // Adjust req.user.sub if your token payload uses a different field (e.g., req.user.userId)
  if (!req.user || !req.user.sub) {
    throw new BadRequestException('User ID not found in token');
  }
  return this.storeService.createStoreWithProducts(createStoreDto, req.user.sub);
}

// Get the user's own store details
@UseGuards(AuthGuard('jwt'))
@Get('my-store')
async getMyStore(@Req() req: any) {
  // Adjust req.user.sub if your token payload uses a different field (e.g., req.user.userId)
  if (!req.user || !req.user.sub) {
    throw new BadRequestException('User ID not found in token');
  }
  return this.storeService.getStoreByUserId(req.user.sub);
}

// Add a new product to the user's existing store
@UseGuards(AuthGuard('jwt'))
@Post('products')
async addProduct(@Body() productDto: CreateProductDto, @Req() req: any) {
  // >>> ADD CONSOLE LOG HERE <<<
  console.log('CTRL: Received AddProduct DTO:', JSON.stringify(productDto, null, 2));
  // >>> END CONSOLE LOG <<<

  // Adjust req.user.sub if your token payload uses a different field (e.g., req.user.userId)
  if (!req.user || !req.user.sub) {
    throw new BadRequestException('User ID not found in token');
  }
  return this.storeService.addProduct(req.user.sub, productDto);
}

// --- NEW Endpoints for Edit/Delete ---

// Update an existing product
@UseGuards(AuthGuard('jwt'))
@Patch('products/:id') // Use PATCH for partial updates
async updateProduct(
  @Param('id', ParseIntPipe) id: number, // Get product ID from URL param, ensure it's a number
  @Body() updateProductDto: UpdateProductDto, // Get update data from request body
  @Req() req: any, // Get user info from request
) {
  // >>> ADD CONSOLE LOG HERE <<<
  console.log(`CTRL: Received UpdateProduct DTO for ID ${id}:`, JSON.stringify(updateProductDto, null, 2));
  // >>> END CONSOLE LOG <<<

  // Adjust req.user.sub if your token payload uses a different field (e.g., req.user.userId)
  if (!req.user || !req.user.sub) {
    throw new BadRequestException('User ID not found in token');
  }
  // Delegate to the service, passing product ID, update data, and user ID for authorization check
  return this.storeService.updateProduct(id, updateProductDto, req.user.sub);
}

// Delete a product
@UseGuards(AuthGuard('jwt'))
@Delete('products/:id')
@HttpCode(HttpStatus.NO_CONTENT) // Return 204 No Content on successful deletion
async deleteProduct(
  @Param('id', ParseIntPipe) id: number, // Get product ID from URL param
  @Req() req: any, // Get user info
) {
  // Adjust req.user.sub if your token payload uses a different field (e.g., req.user.userId)
  if (!req.user || !req.user.sub) {
    throw new BadRequestException('User ID not found in token');
  }
  // Delegate deletion to the service, passing product ID and user ID for authorization check
  await this.storeService.deleteProduct(id, req.user.sub);
  // No explicit return needed due to @HttpCode decorator
}
}