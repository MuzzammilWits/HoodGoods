// backend/src/recommendations/recommendations.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
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
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>, // May not be directly used if query starts from SellerOrderItem and joins up
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>, // For fetching product details if needed separately, or as part of QueryBuilder
  ) {}

  async getBestSellingProducts(
    limit: number = 10,
    timeWindowDays: number = 30,
  ): Promise<PopularProductDto[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - timeWindowDays);

    // Construct the TypeORM query using QueryBuilder
    // We will build this query in the next step.
    // For now, let's return an empty array.
    console.log(`Workspaceing best sellers from: ${startDate.toISOString()}`); // For debugging

    const queryBuilder = this.sellerOrderItemRepository.createQueryBuilder('soi');

    queryBuilder
      .select('p.prodId', 'productId')
      .addSelect('p.name', 'name')
      .addSelect('p.imageUrl', 'imageUrl')
      .addSelect('p.storeName', 'storeName') // Directly from Product entity
      .addSelect('SUM(soi.quantityOrdered)', 'salesCount')
      .innerJoin('soi.product', 'p') // Join SellerOrderItem to Product
      .innerJoin('soi.sellerOrder', 'sellerOrder') // Join SellerOrderItem to SellerOrder
      .innerJoin('sellerOrder.order', 'o') // Join SellerOrder to Order
      .where('o.orderDate >= :startDate', { startDate })
      .andWhere('p.isActive = :isActive', { isActive: true }) // Assuming you only want active products
      .groupBy('p.prodId')
      .addGroupBy('p.name')
      .addGroupBy('p.imageUrl')
      .addGroupBy('p.storeName')
      .orderBy('"salesCount"', 'DESC') // Use quotes for alias in orderBy with PostgreSQL
      .limit(limit);

    const popularProductsRaw = await queryBuilder.getRawMany();

    // Map the raw results to PopularProductDto[]
    // TypeORM's getRawMany returns objects with snake_case keys if not aliased correctly or based on DB driver.
    // We aliased them to camelCase in the select, so it should be fine.
    return popularProductsRaw.map(product => ({
      productId: product.productId,
      name: product.name,
      imageUrl: product.imageUrl,
      storeName: product.storeName,
      salesCount: parseInt(product.salesCount, 10), // SUM might return a string in some DBs/configs
    }));
  }
}