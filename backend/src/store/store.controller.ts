// src/store/store.controller.ts
import { Controller, Post, Body, Get, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { StoreService } from './store.service';
import { AuthGuard } from '@nestjs/passport';
import { CreateProductDto, CreateStoreWithProductsDto } from './dto/create-product.dto';

@Controller('stores')
export class StoreController {
  constructor(private readonly storeService: StoreService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  async createStore(@Body() createStoreDto: CreateStoreWithProductsDto, @Req() req: any) {
    if (!req.user || !req.user.sub) {
      throw new BadRequestException('User ID not found in token');
    }
    
    return this.storeService.createStoreWithProducts(createStoreDto, req.user.sub);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('my-store')
  async getMyStore(@Req() req: any) {
    if (!req.user || !req.user.sub) {
      throw new BadRequestException('User ID not found in token');
    }
    
    return this.storeService.getStoreByUserId(req.user.sub);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('products')
  async addProduct(@Body() productDto: CreateProductDto, @Req() req: any) {
    if (!req.user || !req.user.sub) {
      throw new BadRequestException('User ID not found in token');
    }
    
    return this.storeService.addProduct(req.user.sub, productDto);
  }
}