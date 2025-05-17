// src/admin/admin.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductsService } from '../products/products.service';
import { Product } from '../products/entities/product.entity';
import { Store } from '../store/entities/store.entity';

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
    //private readonly AdminService: AdminService,
    @InjectRepository(Product) 
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Store)
    private readonly storeRepository :Repository<Store>,
  ) {}

  //Product Funcitons
  async findAllProducts()
  {
    return this.productRepository.find();
  }

  async findApprovalProducts()
  {
   // return this.productRepository.findAll({where: {status}})
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