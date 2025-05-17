// backend/src/reporting/reporting.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportingController } from './reporting.controller';
import { ReportingService } from './reporting.service';
import { AuthModule } from '../auth/auth.module';
import { SupabaseService } from '../supabase.service';

import { Store } from '../store/entities/store.entity';
import { Product } from '../products/entities/product.entity';
import { SellerOrder } from '../orders/entities/seller-order.entity';
import { SellerOrderItem } from '../orders/entities/seller-order-item.entity';
import { Order } from '../orders/entities/order.entity';
import { User } from '../auth/user.entity'; // Import the User entity

@Module({
  imports: [
    AuthModule, // Provides AuthService, which can also get user roles
    TypeOrmModule.forFeature([
      Store,
      Product,
      SellerOrder,
      SellerOrderItem,
      Order,
      User, // Add User entity here
    ]),
  ],
  controllers: [ReportingController],
  providers: [ReportingService, SupabaseService],
})
export class ReportingModule {}