// src/store/store.controller.ts
import {
  Controller, Post, Body, Get, UseGuards, Req,
  Param, Patch, Delete, ParseIntPipe, HttpCode, HttpStatus,
  // Removed BadRequestException
} from '@nestjs/common';
import { StoreService, StoreDeliveryDetails } from './store.service'; // <<< Import StoreDeliveryDetails
import { AuthGuard } from '@nestjs/passport'; // Assuming JWT guard

// --- DTO Imports ---
import { CreateStoreDto } from './dto/create-store.dto';
import { CreateProductDto } from '../products/dto/create-product.dto';
import { UpdateProductDto } from '../products/dto/update-product.dto';
import { GetDeliveryOptionsDto } from './dto/get-delivery-options.dto'; // <<< Import the new DTO
// --- End DTO Imports ---

import { Product } from '../products/entities/product.entity';
import { Store } from './entities/store.entity';

// Interface for Request object with user payload
interface RequestWithUser extends Request {
  user: {
    sub: string; // User ID from JWT subject
  };
}

@Controller('stores')
export class StoreController {
  constructor(private readonly storeService: StoreService) {}

  // --- Existing Endpoints ---
  // POST /stores - Create Store
  @UseGuards(AuthGuard('jwt'))
  @Post()
  async createStore(
    @Body() createStoreDto: CreateStoreDto,
    @Req() req: RequestWithUser
  ): Promise<Store> {
    const userId = req.user.sub;
    return this.storeService.createStoreWithProducts(createStoreDto, userId);
  }

  // GET /stores/my-store - Get User's Store & Products
  @UseGuards(AuthGuard('jwt'))
  @Get('my-store')
  async getMyStore(@Req() req: RequestWithUser): Promise<{ store: Store; products: Product[] }> {
    const userId = req.user.sub;
    return this.storeService.getStoreByUserId(userId);
  }

  // POST /stores/products - Add Product to Store
  @UseGuards(AuthGuard('jwt'))
  @Post('products')
  async addProduct(
    @Body() productDto: CreateProductDto,
    @Req() req: RequestWithUser
  ): Promise<Product> {
    const userId = req.user.sub;
    return this.storeService.addProduct(userId, productDto);
  }

  // PATCH /stores/products/:id - Update Product
  @UseGuards(AuthGuard('jwt'))
  @Patch('products/:id')
  async updateProduct(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProductDto: UpdateProductDto,
    @Req() req: RequestWithUser,
  ): Promise<Product> {
    const userId = req.user.sub;
    return this.storeService.updateProduct(id, updateProductDto, userId);
  }

  // DELETE /stores/products/:id - Delete Product
  @UseGuards(AuthGuard('jwt'))
  @Delete('products/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteProduct(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: RequestWithUser
  ): Promise<void> {
    const userId = req.user.sub;
    await this.storeService.deleteProduct(id, userId);
  }
  // --- End Existing Endpoints ---


  // ***** START: NEW ENDPOINT *****
  /**
   * Endpoint to fetch delivery options for multiple stores based on their IDs.
   * Expects a POST request with a body like: { "storeIds": ["1", "5", "10"] }
   * @param getDeliveryOptionsDto - DTO containing the array of store IDs.
   * @returns An object mapping store IDs to their delivery details.
   */
  @UseGuards(AuthGuard('jwt')) // Keep authentication for now
  @Post('delivery-options') // Route: POST /stores/delivery-options
  async getDeliveryOptions(
    @Body() getDeliveryOptionsDto: GetDeliveryOptionsDto // Use the DTO and ValidationPipe (if enabled globally)
  ): Promise<Record<string, StoreDeliveryDetails>> {
    // The DTO ensures body has { storeIds: ["id1", "id2", ...] }
    return this.storeService.getDeliveryOptionsForStores(getDeliveryOptionsDto.storeIds);
  }
  // ***** END: NEW ENDPOINT *****

}
