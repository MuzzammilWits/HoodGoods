// src/store/store.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StoreController } from './store.controller';
import { StoreService } from './store.service';
import { Product } from './product.entity';
import { User } from '../auth/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, User]),
  ],
  controllers: [StoreController],
  providers: [StoreService],
})
export class StoreModule {}