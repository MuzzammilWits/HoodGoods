// src/admin/admin.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsModule } from '../products/products.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { Product } from '../products/entities/product.entity';
import { User } from '../auth/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, User]),
    ProductsModule
  ],
  controllers: [AdminController],
  providers: [AdminService]
})
export class AdminModule {}