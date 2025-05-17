// backend/src/reporting/reporting.service.ts
import { Injectable, NotFoundException, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm'; // Removed unused LessThan, MoreThanOrEqual
import { Store } from '../store/entities/store.entity';
import { Product } from '../products/entities/product.entity';
import { SellerOrder } from '../orders/entities/seller-order.entity';
import { SellerOrderItem } from '../orders/entities/seller-order-item.entity';
import { Order } from '../orders/entities/order.entity';
import { User } from '../auth/user.entity';
import { SalesDataDto, SalesReportDto, TimePeriod } from './dto/sales-report.dto';
import {
  InventoryStatusResponseDto,
  LowStockItemDto,
  OutOfStockItemDto,
  FullInventoryItemDto,
  StockBreakdownDto
} from './dto/inventory-status.dto';
import {
  AdminPlatformMetricsResponseDto,
  OverallPlatformMetricsDto,
  PlatformMetricPointDto, // Ensure this is imported
} from './dto/admin-platform-metrics.dto';

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
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async getStoreIdForSeller(auth0UserId: string): Promise<string> {
    this.logger.log(`Workspaceing store ID for seller with Auth0 User ID: ${auth0UserId}`);
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
      return { /* ... existing empty response ... */ reportGeneratedAt: new Date(), lowStockItems, outOfStockItems, fullInventory, stockBreakdown: { inStockPercent:0, lowStockPercent:0, outOfStockPercent:0, totalProducts:0 } };
    }

    products.forEach(product => {
      fullInventory.push({ /* ... existing logic ... */ prodId: product.prodId, productName: product.name, quantity: product.productquantity, price: product.price, category: product.category });
      if (product.productquantity === 0) {
        outOfStockItems.push({ prodId: product.prodId, productName: product.name });
      } else if (product.productquantity < LOW_STOCK_THRESHOLD) {
        lowStockItems.push({ prodId: product.prodId, productName: product.name, currentQuantity: product.productquantity });
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
    return { lowStockItems, outOfStockItems, fullInventory, stockBreakdown, reportGeneratedAt: new Date() };
  }

  async getSalesTrends(auth0UserId: string, period: TimePeriod, date?: string): Promise<SalesReportDto> {
    const storeId = await this.getStoreIdForSeller(auth0UserId);
    this.logger.log(`Workspaceing sales trends for store ${storeId}, period: ${period}, date: ${date}`);
    const { startDate, endDate } = this.calculateDateRange(period, date);
    this.logger.log(`Calculated date range for query - Start: ${startDate.toISOString()}, End: ${endDate.toISOString()}`);

    try {
      const queryBuilder = this.orderRepository
        .createQueryBuilder('order')
        .innerJoin('order.sellerOrders', 'sellerOrder')
        .innerJoin('sellerOrder.items', 'sellerOrderItem')
        .innerJoin('sellerOrderItem.product', 'product')
        .where('product.storeId = :storeId', { storeId })
        .andWhere('order.orderDate >= :startDate', { startDate: startDate })
        .andWhere('order.orderDate < :endDate', { endDate: endDate });

      queryBuilder.select([
          'order.orderDate AS "orderDate"',
          'SUM(sellerOrderItem.quantityOrdered * sellerOrderItem.pricePerUnit) AS "dailySales"',
        ])
        .groupBy('order.orderDate')
        .orderBy('order.orderDate', 'ASC');

      const ordersForStore = await queryBuilder.getRawMany();
      this.logger.log(`Raw sales data fetched from DB for seller trends. Count: ${ordersForStore.length}`);

      const salesData: SalesDataDto[] = ordersForStore.map(orderItem => ({
        date: new Date(orderItem.orderDate).toISOString().split('T')[0],
        sales: parseFloat(orderItem.dailySales) || 0,
      }));
      const totalSales = salesData.reduce((sum, currentItem) => sum + currentItem.sales, 0);
      const averageDailySales = salesData.length > 0 ? totalSales / salesData.length : 0;

      return {
        salesData,
        summary: {
          totalSales: parseFloat(totalSales.toFixed(2)),
          averageDailySales: parseFloat(averageDailySales.toFixed(2)),
          period: period,
          startDate: startDate.toISOString().split('T')[0],
          endDate: new Date(endDate.getTime() - (24 * 60 * 60 * 1000)).toISOString().split('T')[0],
        },
        reportGeneratedAt: new Date(),
      };
    } catch (error: any) { /* ... existing error handling ... */  this.logger.error(`Error during getSalesTrends: ${error.message}`, error.stack); throw new InternalServerErrorException('Could not retrieve sales trends.'); }
  }

  async getAdminPlatformMetrics(
    periodInput: TimePeriod | 'allTime' | 'custom' = 'allTime',
    customStartDateStr?: string,
    customEndDateStr?: string,
  ): Promise<AdminPlatformMetricsResponseDto> {
    this.logger.log(
      `Workspaceing admin platform metrics. Period: ${periodInput}, StartDate: ${customStartDateStr || 'N/A'}, EndDate: ${customEndDateStr || 'N/A'}`,
    );

    let queryStartDate: Date | undefined;
    let queryEndDate: Date | undefined; // Exclusive end date for queries
    let periodCoveredType: TimePeriod | 'allTime' | 'custom' = periodInput;

    // Determine queryStartDate and queryEndDate
    if (periodInput !== 'allTime') {
        if (periodInput === TimePeriod.DAILY && customStartDateStr) {
            const range = this.calculateDateRange(TimePeriod.DAILY, customStartDateStr);
            queryStartDate = range.startDate;
            queryEndDate = range.endDate;
        } else if (periodInput === TimePeriod.WEEKLY && customStartDateStr) {
             const range = this.calculateDateRange(TimePeriod.WEEKLY, customStartDateStr);
             queryStartDate = range.startDate;
             queryEndDate = range.endDate;
        } else if (periodInput === TimePeriod.MONTHLY && customStartDateStr) {
             const monthDate = new Date(customStartDateStr + "T00:00:00Z"); // Treat as UTC
             queryStartDate = new Date(Date.UTC(monthDate.getUTCFullYear(), monthDate.getUTCMonth(), 1));
             queryEndDate = new Date(Date.UTC(monthDate.getUTCFullYear(), monthDate.getUTCMonth() + 1, 1));
        } else if (periodInput === TimePeriod.YEARLY && customStartDateStr) {
             const yearDate = new Date(customStartDateStr + "T00:00:00Z"); // Treat as UTC
             queryStartDate = new Date(Date.UTC(yearDate.getUTCFullYear(), 0, 1));
             queryEndDate = new Date(Date.UTC(yearDate.getUTCFullYear() + 1, 0, 1));
        } else if (customStartDateStr && customEndDateStr && periodInput === 'custom') {
            queryStartDate = new Date(customStartDateStr + "T00:00:00.000Z"); // Treat as UTC start of day
            const tempEndDate = new Date(customEndDateStr + "T00:00:00.000Z"); // Treat as UTC start of day
            queryEndDate = new Date(Date.UTC(tempEndDate.getUTCFullYear(), tempEndDate.getUTCMonth(), tempEndDate.getUTCDate() + 1)); // Make exclusive
            periodCoveredType = 'custom';
        } else if (Object.values(TimePeriod).includes(periodInput as TimePeriod)) { // Default range for non-custom, non-'allTime' if specific start date not given
            const range = this.calculateDateRange(periodInput as TimePeriod);
            queryStartDate = range.startDate;
            queryEndDate = range.endDate;
        } else {
            this.logger.warn(`Invalid period combination for admin metrics: ${periodInput}. Defaulting to allTime effectively.`);
            periodCoveredType = 'allTime'; // Fallback if period logic is not met
        }
    }


    try {
      // --- Overall Metrics ---
      const overallOrderWhereConditions: any = {};
      if (queryStartDate && queryEndDate) {
        // For .sum and .count, the 'where' is directly inside the options for .count, or part of the condition for .sum
        // The `Between` operator is inclusive, so for an exclusive `queryEndDate`, subtract 1ms
        overallOrderWhereConditions.orderDate = Between(queryStartDate, new Date(queryEndDate.getTime() - 1));
      }

      const totalSales = await this.orderRepository.sum('grandTotal', overallOrderWhereConditions.orderDate ? { orderDate: overallOrderWhereConditions.orderDate } : undefined) || 0;
      const totalOrders = await this.orderRepository.count({ where: overallOrderWhereConditions.orderDate ? overallOrderWhereConditions : undefined });
      const averageOrderValue = totalOrders > 0 ? parseFloat((totalSales / totalOrders).toFixed(2)) : 0;
      const totalActiveSellers = await this.userRepository.count({ where: { role: 'seller' } });
      const totalRegisteredBuyers = await this.userRepository.count({ where: { role: 'buyer' } });

      const overallMetrics: OverallPlatformMetricsDto = {
        totalSales, totalOrders, averageOrderValue, totalActiveSellers, totalRegisteredBuyers,
      };

      // --- Time Series Metrics ---
      let timeSeriesMetrics: PlatformMetricPointDto[] = [];
      const timeSeriesQuery = this.orderRepository.createQueryBuilder('order')
        .select('DATE(order.orderDate)', 'date') // Use DATE() to group by day part of timestamp
        .addSelect('SUM(order.grandTotal)', 'totalSales')
        .addSelect('COUNT(order.orderId)', 'totalOrders')
        .groupBy('DATE(order.orderDate)')
        .orderBy('DATE(order.orderDate)', 'ASC');

      if (queryStartDate && queryEndDate) {
        timeSeriesQuery
          .where('order.orderDate >= :queryStartDate', { queryStartDate })
          .andWhere('order.orderDate < :queryEndDate', { queryEndDate });
      }

      const rawTimeSeriesData = await timeSeriesQuery.getRawMany();
      timeSeriesMetrics = rawTimeSeriesData.map(item => ({
        date: item.date, // This will be YYYY-MM-DD string from DB
        totalSales: parseFloat(item.totalSales) || 0,
        totalOrders: parseInt(item.totalOrders, 10) || 0,
      }));

      // --- Determine Display Dates for periodCovered ---
      let displayStartDateStr: string | undefined;
      let displayEndDateStr: string | undefined;

      if (queryStartDate) {
        displayStartDateStr = queryStartDate.toISOString().split('T')[0];
      }
      if (queryEndDate) { // queryEndDate is exclusive
        displayEndDateStr = new Date(queryEndDate.getTime() - (24*60*60*1000)).toISOString().split('T')[0];
      }

      if (periodInput === 'allTime' && totalOrders > 0) {
          const firstOrderArr = await this.orderRepository.find({ order: { orderDate: 'ASC' }, select: { orderDate: true }, take: 1 });
          const lastOrderArr = await this.orderRepository.find({ order: { orderDate: 'DESC' }, select: { orderDate: true }, take: 1 });
          if (firstOrderArr.length > 0 && firstOrderArr[0].orderDate) {
            const firstDate = firstOrderArr[0].orderDate;
            displayStartDateStr = (firstDate instanceof Date) ? firstDate.toISOString().split('T')[0] : String(firstDate).split('T')[0];
          }
          if (lastOrderArr.length > 0 && lastOrderArr[0].orderDate) {
            const lastDate = lastOrderArr[0].orderDate;
            displayEndDateStr = (lastDate instanceof Date) ? lastDate.toISOString().split('T')[0] : String(lastDate).split('T')[0];
          }
      } else if (periodInput === 'allTime' && totalOrders === 0) {
        // No orders, no date range to display
        displayStartDateStr = undefined;
        displayEndDateStr = undefined;
      }


      this.logger.log(`Admin platform metrics processed: ${JSON.stringify(overallMetrics)}, TimeSeries Points: ${timeSeriesMetrics.length}`);

      return {
        overallMetrics,
        timeSeriesMetrics, // Include the time series data
        reportGeneratedAt: new Date(),
        periodCovered: {
          period: periodCoveredType,
          startDate: displayStartDateStr,
          endDate: displayEndDateStr,
        },
      };
    } catch (error: any) {
      this.logger.error(`Error fetching admin platform metrics: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Could not retrieve admin platform metrics.');
    }
  }

  private calculateDateRange(period: TimePeriod, dateStr?: string): { startDate: Date; endDate: Date } {
    let now: Date;
    if (dateStr) {
      const parts = dateStr.split('-').map(Number);
      now = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
    } else {
      const tempNow = new Date();
      now = new Date(Date.UTC(tempNow.getUTCFullYear(), tempNow.getUTCMonth(), tempNow.getUTCDate()));
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
        this.logger.warn(`Invalid time period: ${period}. Defaulting to daily for 'now'.`);
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
          if (value === null || value === undefined) return '';
          const stringValue = String(value);
          return (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n'))
            ? `"${stringValue.replace(/"/g, '""')}"`
            : stringValue;
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