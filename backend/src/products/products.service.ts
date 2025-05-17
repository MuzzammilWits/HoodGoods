import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
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
  async findAllPending(): Promise<Product[]> {
    return this.productRepository.find({ 
      where: { isActive: false },
      order: { prodId: 'ASC' }
    });
  }

  async updateProductStatus(id: number, isActive: boolean): Promise<Product> {
    const result = await this.productRepository.update(id, { isActive });
    if (result.affected === 0) {
      throw new InternalServerErrorException(`Product with ID ${id} not found`);
    }
    const product = await this.productRepository.findOneBy({ prodId: id });
    if (!product) {
      throw new InternalServerErrorException(`Product with ID ${id} not found after update`);
    }
    return product;
  }

  async deleteProduct(id: number): Promise<void> {
    const result = await this.productRepository.delete(id);
    if (result.affected === 0) {
      throw new InternalServerErrorException(`Product with ID ${id} not found`);
    }
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
}