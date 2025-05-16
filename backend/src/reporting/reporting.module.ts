// backend/src/reporting/reporting.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm'; // ✅ Needed for repository injection
import { ReportingController } from './reporting.controller';
import { ReportingService } from './reporting.service';
import { AuthModule } from '../auth/auth.module';
import { SupabaseService } from '../supabase.service';

import { Store } from '../store/entities/store.entity';
import { Product } from '../products/entities/product.entity';
import { SellerOrder } from '../orders/entities/seller-order.entity';
import { SellerOrderItem } from '../orders/entities/seller-order-item.entity';
import { Order } from '../orders/entities/order.entity';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([
      Store,
      Product,
      SellerOrder,
      SellerOrderItem,
      Order,
    ]),
  ],
  controllers: [ReportingController],
  providers: [ReportingService, SupabaseService],
})
export class ReportingModule {}
