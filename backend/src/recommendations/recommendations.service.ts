// backend/src/recommendations/recommendations.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../products/entities/product.entity';
import { Order } from '../orders/entities/order.entity';
import { SellerOrder } from '../orders/entities/seller-order.entity';
import { SellerOrderItem } from '../orders/entities/seller-order-item.entity';
import { PopularProductDto } from './dto/popular-product.dto';

@Injectable()
export class RecommendationsService {
  constructor(
    @InjectRepository(SellerOrderItem)
    private readonly sellerOrderItemRepository: Repository<SellerOrderItem>,
    // ProductRepository might be needed if we need to fetch more details not suitable for the grouped query
    // For now, we'll try to get everything from the joined Product entity 'p'
  ) {}

  async getBestSellingProducts(
    limit: number = 10,
    timeWindowDays: number = 30,
  ): Promise<PopularProductDto[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - timeWindowDays);

    const queryBuilder = this.sellerOrderItemRepository.createQueryBuilder('soi');

    queryBuilder
      .select('p.prodId', 'productId')
      .addSelect('p.name', 'name')
      .addSelect('p.imageUrl', 'imageUrl')
      .addSelect('p.storeName', 'storeName')
      // --- ADDING NEW FIELDS FOR CART FUNCTIONALITY ---
      .addSelect('p.price', 'productPrice')             // Product price
      .addSelect('p.productquantity', 'productquantity') // Available stock
      .addSelect('p.storeId', 'storeId')                 // Store ID (already string in Product entity)
      .addSelect('p.userId', 'userId')                   // Seller's User ID
      // --- END OF NEW FIELDS ---
      .addSelect('SUM(soi.quantityOrdered)', 'salesCount')
      .innerJoin('soi.product', 'p') // Join SellerOrderItem to Product
      .innerJoin('soi.sellerOrder', 'sellerOrder') // Join SellerOrderItem to SellerOrder
      .innerJoin('sellerOrder.order', 'o') // Join SellerOrder to Order
      .where('o.orderDate >= :startDate', { startDate })
      .andWhere('p.isActive = :isActive', { isActive: true }) // Only active products
      .andWhere('p.productquantity > 0') // Only products that are in stock
      .groupBy('p.prodId') // Group by product primary key
      .addGroupBy('p.name')
      .addGroupBy('p.imageUrl')
      .addGroupBy('p.storeName')
      // --- ADDING NEW FIELDS TO GROUP BY ---
      .addGroupBy('p.price')
      .addGroupBy('p.productquantity')
      .addGroupBy('p.storeId')
      .addGroupBy('p.userId')
      // --- END OF GROUP BY ADDITIONS ---
      .orderBy('"salesCount"', 'DESC') // Order by the alias for SUM
      .limit(limit);

    const popularProductsRaw = await queryBuilder.getRawMany();

    // Map the raw results to PopularProductDto[]
    return popularProductsRaw.map(product => ({
      productId: product.productId,
      name: product.name,
      imageUrl: product.imageUrl,
      storeName: product.storeName,
      salesCount: parseInt(product.salesCount, 10), // SUM might return a string
      // --- MAPPING NEW FIELDS ---
      productPrice: parseFloat(product.productPrice), // Ensure price is a number
      productquantity: parseInt(product.productquantity, 10), // Ensure quantity is an integer
      storeId: String(product.storeId), // Ensure storeId is a string (it should be from entity)
      userId: product.userId, // userId is already a string
    }));
  }
}
