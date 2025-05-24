import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
  ) {}

  async findAllActive(): Promise<Product[]> {
    return this.productRepository.find({ 
      where: { isActive: true },
      order: { prodId: 'ASC' }
    });
  }

  async findAll(filters?: { category?: string }): Promise<Product[]> {
    const query = this.productRepository.createQueryBuilder('product');
    
    if (filters?.category) {
      query.andWhere('product.productCategory = :category', { 
        category: filters.category 
      });
    }
    
    return query.getMany();
  }

 async findAllInactive(): Promise<Product[]> {
    return this.productRepository.find({ 
      where: { 
        isActive: false, // Product's own isActive status
        store: { isActive: true }, // Ensure the parent Store's 'isActive' property is true
       },
       relations: ['store'], 
      order: { prodId: 'ASC' }
    });
  }

  async approveProduct(id: number): Promise<Product> {
    const product = await this.productRepository.findOneBy({ prodId: id });
    if (!product) {
      throw new Error('Product not found');
    }
    product.isActive = true;
    return this.productRepository.save(product);
  }

  async remove(id: number): Promise<void> {
    await this.productRepository.delete(id);
  }

}
