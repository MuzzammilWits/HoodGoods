//import { Body, Controller, Get } from '@nestjs/common';
import { Controller, Delete, Param, UseGuards, HttpCode, HttpStatus, Get, Body } from '@nestjs/common';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  async findAll() {
    return this.productsService.findAllActive();
  }

  @Get()
async getProducts(@Body('category') category?: string) {
  return this.productsService.findAll({ category });

}
}