import { Body, Controller, Get, Param, Patch, Delete, ParseIntPipe, Post, HttpStatus } from '@nestjs/common';
import { ProductsService } from './products.service';
import { Product } from '../products/entities/product.entity';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  async findAll() {
    return this.productsService.findAllActive();
  }

  // approval
  @Get('pending')
async getPendingProducts() {
  try {
    const products = await this.productsService.findAllPending();
    return { 
      success: true, 
      data: products.map(p => ({
        prodId: p.prodId,
        name: p.name,
        description: p.description,
        category: p.category,
        price: p.price,
        imageUrl: p.imageUrl,
        storeName: p.storeName,
        isActive: p.isActive
      })),
      message: 'Pending products retrieved successfully.' 
    };
  } catch (error) {
    return { 
      success: false, 
      data: [], 
      message: error.message || 'Failed to retrieve pending products.' 
    };
  }
}

@Patch(':id/approve')
async approveProduct(@Param('id', ParseIntPipe) id: number) {
  try {
    const updatedProduct = await this.productsService.updateProductStatus(id, true);
    return { 
      success: true, 
      data: {
        prodId: updatedProduct.prodId,
        name: updatedProduct.name,
        isActive: updatedProduct.isActive
      },
      message: 'Product approved successfully.' 
    };
  } catch (error) {
    return { 
      success: false, 
      message: error.message || 'Failed to approve product.' 
    };
  }
}

@Delete(':id/disapprove')
async disapproveProduct(@Param('id', ParseIntPipe) id: number) {
  try {
    await this.productsService.deleteProduct(id);
    return { 
      success: true, 
      message: 'Product disapproved successfully.' 
    };
  } catch (error) {
    return { 
      success: false, 
      message: error.message || 'Failed to disapprove product.' 
    };
  }
}
  // end

  @Get()
  async getProducts(@Body('category') category?: string) {
    return this.productsService.findAll({ category });
  }
}
