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
}