// src/admin/admin.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsModule } from '../products/products.module';
import { StoreModule } from 'src/store/store.module';
import { AdminController } from './admin.controller';
//import { AdminStoresController } from '../admin/adminStore/admin-store.controller';
import { AdminService } from './admin.service';
import { Product } from '../products/entities/product.entity';
import { User } from '../auth/user.entity';
import { Store } from '../store/entities/store.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, User,Store]),
    ProductsModule,
    StoreModule
  ],
  controllers: [AdminController],
  providers: [AdminService]
})
export class AdminModule {}