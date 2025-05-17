import { Body, Controller, Get, Patch, Delete, Param } from '@nestjs/common';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  async findAll() {
    return this.productsService.findAllActive();
  }

  @Get('inactive')
  async findAllInactive() {
    return this.productsService.findAllInactive();
  }

  @Patch(':id/approve')
  async approveProduct(@Param('id') id: string) {
    return this.productsService.approveProduct(+id);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.productsService.remove(+id);
  }
}