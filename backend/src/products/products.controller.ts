import { Body, Controller, Get, Patch, Delete, Param } from '@nestjs/common';
import { ProductsService } from './products.service';

@Controller('products')// Base Route: '/products'
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  //Delegates to productService to find all products which are active
  @Get()
  async findAll() {
    return this.productsService.findAllActive();
  }

  //Delegated to productService to find all products which are inactive
  @Get('inactive')
  async findAllInactive() {
    return this.productsService.findAllInactive();
  }

  @Patch(':id/approve')
  async approveProduct(@Param('id') id: string) {
    return this.productsService.approveProduct(+id);
  }

  //Delegates to productService to delete a product with the fetched 'id'
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.productsService.remove(+id);
  }
}