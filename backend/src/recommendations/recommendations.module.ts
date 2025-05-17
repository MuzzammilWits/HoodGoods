// backend/src/recommendations/recommendations.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecommendationsController } from '../recommendations/recommendations.controller';
import { RecommendationsService } from '../recommendations/recommendations.service';
import { Product } from '../products/entities/product.entity';
import { Order } from '../orders/entities/order.entity';
import { SellerOrder } from '../orders/entities/seller-order.entity';
import { SellerOrderItem } from '../orders/entities/seller-order-item.entity';
// Import Store if you plan to directly join or use its repository, otherwise Product.storeName suffices
// import { Store } from '../store/entities/store.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Product,
      Order,
      SellerOrder,
      SellerOrderItem,
      // Store, // Uncomment if Store entity direct interaction is needed
    ]),
  ],
  controllers: [RecommendationsController],
  providers: [RecommendationsService],
})
export class RecommendationsModule {}