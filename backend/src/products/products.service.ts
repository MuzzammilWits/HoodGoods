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

  //Returns all product which have isActive status as 'true'
  async findAllActive(): Promise<Product[]> {
    return this.productRepository.find({ 
      where: { isActive: true },
      order: { prodId: 'ASC' }
    });
  }

  //Returns all products from the repository, irrespective of their active status
  async findAll(filters?: { category?: string }): Promise<Product[]> {
    const query = this.productRepository.createQueryBuilder('product');
    
    if (filters?.category) {
      query.andWhere('product.productCategory = :category', { 
        category: filters.category 
      });
    }
    
    return query.getMany();
  }

  //Finds all products which have an inactive status BUT from a store which has an active status
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

//Changes isActive status of the product from 'false' to 'true', indicating its been set as 'Active' from being 'Inactive' due to admin approval.
  async approveProduct(id: number): Promise<Product> {
    const product = await this.productRepository.findOneBy({ prodId: id });
    if (!product) {
      throw new Error('Product not found');
    }
    product.isActive = true;
    return this.productRepository.save(product);
  }

  //Removes a product from the repository based on the given productId
  async remove(id: number): Promise<void> {
    await this.productRepository.delete(id);
  }

}
