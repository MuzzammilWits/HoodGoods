// backend/src/reporting/reporting.service.ts
import { Injectable, NotFoundException, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Store } from '../store/entities/store.entity';
import { Product } from '../products/entities/product.entity';
import { SellerOrder } from '../orders/entities/seller-order.entity';
import { SellerOrderItem } from '../orders/entities/seller-order-item.entity';
import { Order } from '../orders/entities/order.entity';
import { SalesDataDto, SalesReportDto, TimePeriod } from './dto/sales-report.dto';
import {
  InventoryStatusResponseDto,
  LowStockItemDto, 
  OutOfStockItemDto,
  FullInventoryItemDto,
  StockBreakdownDto
} from './dto/inventory-status.dto';

const LOW_STOCK_THRESHOLD = 5;

@Injectable()
export class ReportingService {
  private readonly logger = new Logger(ReportingService.name);

  constructor(
    @InjectRepository(Store)
    private readonly storeRepository: Repository<Store>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(SellerOrder)
    private readonly sellerOrderRepository: Repository<SellerOrder>,
    @InjectRepository(SellerOrderItem)
    private readonly sellerOrderItemRepository: Repository<SellerOrderItem>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
  ) {}

  async getStoreIdForSeller(auth0UserId: string): Promise<string> {
    this.logger.log(`Fetching store ID for seller with Auth0 User ID: ${auth0UserId}`);
    try {
      const store = await this.storeRepository.findOne({
        where: { userId: auth0UserId },
      });
      if (!store) {
        this.logger.warn(`No store found for Auth0 User ID: ${auth0UserId}`);
        throw new NotFoundException(`Store not found for user ${auth0UserId}.`);
      }
      this.logger.log(`Store ID ${store.storeId} found for Auth0 User ID: ${auth0UserId}`);
      return store.storeId;
    } catch (error: any) {
      this.logger.error(`Error fetching store ID for user ${auth0UserId}: ${error.message}`, error.stack);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not retrieve store information.');
    }
  }

  async getInventoryStatus(auth0UserId: string): Promise<InventoryStatusResponseDto> {
    this.logger.log(`Generating inventory status report for user ${auth0UserId}`);
    const storeId = await this.getStoreIdForSeller(auth0UserId);
    
    let products: Product[];
    try {
      products = await this.productRepository.find({
        where: { storeId: storeId, isActive: true },
      });
    } catch (error: any) {
      this.logger.error(`Error fetching products for store ${storeId}: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Could not retrieve products for inventory report.');
    }

    const lowStockItems: LowStockItemDto[] = [];
    const outOfStockItems: OutOfStockItemDto[] = [];
    const fullInventory: FullInventoryItemDto[] = [];
    let inStockCount = 0;

    if (!products || products.length === 0) {
      this.logger.log(`No products found for store ${storeId}. Returning empty inventory report.`);
      return {
        lowStockItems,
        outOfStockItems,
        fullInventory,
        stockBreakdown: {
          inStockPercent: 0,
          lowStockPercent: 0,
          outOfStockPercent: 0,
          totalProducts: 0,
        },
        reportGeneratedAt: new Date(),
      };
    }

    products.forEach(product => {
      fullInventory.push({
        prodId: product.prodId,
        productName: product.name,
        quantity: product.productquantity,
        price: product.price,
        category: product.category,
      });

      if (product.productquantity === 0) {
        outOfStockItems.push({
          prodId: product.prodId,
          productName: product.name,
        });
      } else if (product.productquantity < LOW_STOCK_THRESHOLD) {
        lowStockItems.push({
          prodId: product.prodId,
          productName: product.name,
          currentQuantity: product.productquantity,
        });
      } else {
        inStockCount++;
      }
    });

    const totalProducts = products.length;
    const stockBreakdown: StockBreakdownDto = {
      inStockPercent: totalProducts > 0 ? parseFloat(((inStockCount / totalProducts) * 100).toFixed(2)) : 0,
      lowStockPercent: totalProducts > 0 ? parseFloat(((lowStockItems.length / totalProducts) * 100).toFixed(2)) : 0,
      outOfStockPercent: totalProducts > 0 ? parseFloat(((outOfStockItems.length / totalProducts) * 100).toFixed(2)) : 0,
      totalProducts: totalProducts,
    };
    
    this.logger.log(`Inventory status report generated for store ${storeId}: ${totalProducts} total products.`);

    return {
      lowStockItems,
      outOfStockItems,
      fullInventory,
      stockBreakdown,
      reportGeneratedAt: new Date(),
    };
  }


  async getSalesTrends(auth0UserId: string, period: TimePeriod, date?: string): Promise<SalesReportDto> {
    const storeId = await this.getStoreIdForSeller(auth0UserId);
    this.logger.log(`Fetching sales trends for store ${storeId}, period: ${period}, date: ${date}`);

    const { startDate, endDate } = this.calculateDateRange(period, date);
    this.logger.log(`Calculated date range for query - Start: ${startDate.toISOString()}, End: ${endDate.toISOString()}`);

    let ordersForStore: any[] = []; // Initialize to empty array

    try {
      const queryBuilder = this.orderRepository 
        .createQueryBuilder('order') 
        .innerJoin('order.sellerOrders', 'sellerOrder') 
        .innerJoin('sellerOrder.items', 'sellerOrderItem') 
        .innerJoin('sellerOrderItem.product', 'product') 
        .where('product.storeId = :storeId', { storeId }) 
        .andWhere('order.orderDate >= :startDate', { startDate }) 
        .andWhere('order.orderDate < :endDate', { endDate })
       // .andWhere('sellerOrder.status = :status', { status: 'Processing' }) 
        .select([
          'order.orderDate AS "orderDate"', 
          'SUM(sellerOrderItem.quantityOrdered * sellerOrderItem.pricePerUnit) AS "dailySales"', 
        ])
        .groupBy('order.orderDate') 
        .orderBy('order.orderDate', 'ASC'); 

      this.logger.debug('>>> Sales Trends Query constructed. Attempting to execute...');
      const generatedSql = queryBuilder.getSql(); // Get the SQL for logging
      this.logger.debug(`>>> Generated SQL: ${generatedSql}`);
      this.logger.debug(`>>> Parameters: ${JSON.stringify({ storeId, startDate, endDate, status: 'completed' })}`);

      ordersForStore = await queryBuilder.getRawMany(); // Execute the query

      this.logger.log(`>>> Raw sales data fetched from DB. Count: ${ordersForStore.length}`); // Changed to .log to ensure visibility
      if (ordersForStore.length > 0) {
        this.logger.debug(`>>> First raw sales data item from DB: ${JSON.stringify(ordersForStore[0])}`);
      } else {
        this.logger.log('>>> No raw sales data items returned from the database query.');
      }

      const salesData: SalesDataDto[] = ordersForStore.map(orderItem => ({
        date: new Date(orderItem.orderDate).toISOString().split('T')[0],
        sales: parseFloat(orderItem.dailySales) || 0,
      }));

      const totalSales = salesData.reduce((sum, currentItem) => sum + currentItem.sales, 0);
      const averageDailySales = salesData.length > 0 ? totalSales / salesData.length : 0;

      this.logger.log(`Sales trends processed. Total sales: ${totalSales}, Average daily sales: ${averageDailySales}`);

      const displayStartDate = startDate.toISOString().split('T')[0];
      const displayEndDate = new Date(endDate.getTime() - (24 * 60 * 60 * 1000)).toISOString().split('T')[0];

      return {
        salesData,
        summary: {
          totalSales: parseFloat(totalSales.toFixed(2)),
          averageDailySales: parseFloat(averageDailySales.toFixed(2)),
          period: period,
          startDate: displayStartDate,
          endDate: displayEndDate,
        },
        reportGeneratedAt: new Date(),
      };
    } catch (error: any) { 
      this.logger.error(`Error during getSalesTrends execution for store ${storeId}: ${error.message}`, error.stack);
      // Log the generated SQL and parameters if an error occurs during query execution
      // This might be redundant if the error object itself contains query and parameters, but good for explicit logging
      if (error.query && error.parameters) { 
        this.logger.error(`Failed Query (from error object): ${error.query}`);
        this.logger.error(`Parameters (from error object): ${JSON.stringify(error.parameters)}`);
      } else {
        // If the error doesn't have query/parameters, try to log the one we constructed
        const tempQueryBuilder = this.orderRepository.createQueryBuilder('order') /* ... recreate query ... */ ;
        this.logger.error(`Failed Query (reconstructed for logging): ${tempQueryBuilder.getSql()}`);
      }
      throw new InternalServerErrorException('Could not retrieve sales trends.');
    }
  }

  private calculateDateRange(period: TimePeriod, dateStr?: string): { startDate: Date; endDate: Date } {
    let now: Date;
    if (dateStr) {
        const parts = dateStr.split('-').map(Number);
        now = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0));
    } else {
        const tempNow = new Date();
        now = new Date(Date.UTC(tempNow.getUTCFullYear(), tempNow.getUTCMonth(), tempNow.getUTCDate(), 0, 0, 0, 0));
    }
    this.logger.debug(`calculateDateRange initial 'now' (UTC start of day): ${now.toISOString()}`);

    let startDate = new Date(now); 
    let endDate = new Date(now);   

    switch (period) {
      case TimePeriod.DAILY:
        endDate.setUTCDate(startDate.getUTCDate() + 1);
        break;
      case TimePeriod.WEEKLY:
        const dayOfWeek = startDate.getUTCDay(); 
        const diffToMonday = (dayOfWeek === 0) ? -6 : (1 - dayOfWeek); 
        startDate.setUTCDate(startDate.getUTCDate() + diffToMonday);
        endDate = new Date(startDate);
        endDate.setUTCDate(startDate.getUTCDate() + 7);
        break;
      case TimePeriod.MONTHLY:
        startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
        endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
        break;
      case TimePeriod.YEARLY:
        startDate = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
        endDate = new Date(Date.UTC(now.getUTCFullYear() + 1, 0, 1));
        break;
      default:
        this.logger.warn(`Invalid time period: ${period}. Defaulting to daily based on 'now'.`);
        endDate.setUTCDate(startDate.getUTCDate() + 1);
        break;
    }
    this.logger.log(`Calculated date range (UTC) - Period: ${period}, InputDate: ${dateStr || 'N/A'}, Start: ${startDate.toISOString()}, End: ${endDate.toISOString()}`);
    return { startDate, endDate };
  }

  generateCSVData<T extends object>(data: T[], reportType: string): string {
    if (!data || data.length === 0) {
      return `No data available for ${reportType} report.`;
    }
    try {
      const headers = Object.keys(data[0]);
      const csvRows = [headers.join(',')]; 

      data.forEach(row => {
        const values = headers.map(header => {
          const value = row[header as keyof T];
          if (value === null || value === undefined) {
            return '';
          }
          const stringValue = String(value);
          if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        });
        csvRows.push(values.join(','));
      });

      return csvRows.join('\n');
    } catch (error: any) {
        this.logger.error(`Error generating CSV data for ${reportType}: ${error.message}`, error.stack);
        throw new InternalServerErrorException(`Could not generate CSV for ${reportType}.`);
    }
  }
}
