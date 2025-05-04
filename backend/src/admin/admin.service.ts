// src/admin/admin.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductsService } from '../products/products.service';
import { Product } from '../products/entities/product.entity';
import { User } from '../auth/user.entity';

import {
    NotFoundException,
    InternalServerErrorException,
    ConflictException,
    ForbiddenException,
    BadRequestException,
  } from '@nestjs/common';

@Injectable()

export class AdminService {
  constructor(
    private readonly productsService: ProductsService,
    @InjectRepository(Product) 
    private readonly productRepository: Repository<Product>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async getAllUsers() {
    return this.userRepository.find();
  }

  async deactivateUser(userId: string) {
    const user = await this.userRepository.findOne({ where: { userID: userId } });
    if (!user) {
      throw new Error('User not found');
    }
    user.role = 'inactive';
    await this.userRepository.save(user);
    return { message: 'User deactivated successfully' };
  }

  async findAllProducts()
  {
    return this.productRepository.find();
  }

  async deleteProduct(productId: number): Promise<void> {
    const product = await this.productRepository.findOne({ where: { prodId: productId} });
    if (!product) throw new NotFoundException(`Product ID ${productId} not found or you do not have permission to delete it.`);

    const deleteResult = await this.productRepository.delete(productId);

    if (deleteResult.affected === 0) {
        console.warn(`Attempted to delete product ID ${productId}, but no rows were affected.`);
        throw new InternalServerErrorException(`Failed to delete product ID ${productId}.`);
    }
  }

  }