// backend/src/reporting/reporting.service.ts
import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { SupabaseService } from '../supabase.service';

// Make sure this is exported or defined in a shared types file accessible by the controller too
export interface SalesTrendDataPoint {
  order_date: string;
  total_revenue: number;
  order_count: number;
}

@Injectable()
export class ReportingService {
  constructor(private readonly supabase: SupabaseService) {}

  private async getStoreIdForSeller(auth0UserId: string): Promise<string> {
    const client = this.supabase.getClient();
    // Your User entity uses 'userID' to store the Auth0 'sub'.
    // Your Stores entity uses 'userID' to link to User entity's 'userID'.
    const { data: storeData, error: storeError } = await client
      .from('Stores') // DB Table Name
      .select('store_id') // DB Column Name
      .eq('userID', auth0UserId) // DB Column Name in Stores, matches User.userID (Auth0 sub)
      .single();

    if (storeError || !storeData) {
      console.error(`Error fetching store for seller (Auth0 User ID: ${auth0UserId}):`, storeError);
      throw new NotFoundException(`Store not found for user ${auth0UserId}. Please ensure a store is created for this seller.`);
    }
    return storeData.store_id;
  }

  async getSalesTrendsForSeller(auth0UserId: string): Promise<SalesTrendDataPoint[]> {
    const storeId = await this.getStoreIdForSeller(auth0UserId);
    const client = this.supabase.getClient();

    // This query structure reflects your TypeORM entity relationships:
    // SellerOrderItem -> SellerOrder -> Order
    // SellerOrderItem -> Product
    const { data, error } = await client
      .from('SellerOrderItems') // DB Table Name
      .select(`
        quantityOrdered:quantity_ordered, 
        pricePerUnit:price_per_unit, 
        sellerOrder:SellerOrders!inner ( 
          order:Orders!inner ( 
            orderId:order_id,        
            orderDate:order_date    
          )
        ),
        product:Products!inner ( 
          store_id  
        )
      `)
      // Filter on the store_id from the joined Products table
      // Using the alias 'product' and then the DB column name 'store_id'
      .eq('product.store_id', storeId);


    if (error) {
      // Log the detailed error from Supabase
      console.error('SUPABASE QUERY ERROR in getSalesTrendsForSeller:', JSON.stringify(error, null, 2));
      throw new InternalServerErrorException('Could not fetch sales trends due to a database query error.');
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Type 'data' as 'any[]' for now if not using fully generated Supabase types for this complex select.
    // Ideally, you'd have a precise interface for the shape of 'item'.
    const items = data as any[];

    const dailyData: Record<string, { total_revenue: number; order_ids: Set<string> }> = {};

    for (const item of items) {
      // Access data based on the nested structure and aliases defined in the select query
      if (
        !item.sellerOrder ||
        !item.sellerOrder.order ||
        !item.product
      ) {
        console.warn('Skipping item due to missing nested data from Supabase query:', item);
        continue;
      }

      const orderDateFromOrder = item.sellerOrder.order.orderDate; // Access using JS property name from your select aliases
      const mainOrderIdFromOrder = item.sellerOrder.order.orderId; // Access using JS property name

      if (typeof orderDateFromOrder !== 'string' && !(orderDateFromOrder instanceof Date)) {
        console.warn('Skipping item due to invalid order_date type:', orderDateFromOrder);
        continue;
      }
      
      const dateStr = (orderDateFromOrder instanceof Date ? orderDateFromOrder.toISOString() : String(orderDateFromOrder)).split('T')[0];

      if (!dateStr) {
          console.warn('Skipping item due to empty date string after processing:', item);
          continue;
      }

      if (!dailyData[dateStr]) {
        dailyData[dateStr] = { total_revenue: 0, order_ids: new Set() };
      }

      // Use JS property names as aliased in the select or as direct columns from SellerOrderItems
      const quantity = typeof item.quantityOrdered === 'number' ? item.quantityOrdered : 0;
      const price = typeof item.pricePerUnit === 'number' ? item.pricePerUnit : 0;

      dailyData[dateStr].total_revenue += quantity * price;
      if (mainOrderIdFromOrder != null) {
        dailyData[dateStr].order_ids.add(mainOrderIdFromOrder);
      }
    }

    const result: SalesTrendDataPoint[] = Object.entries(dailyData)
      .map(([date, totals]) => ({
        order_date: date,
        total_revenue: parseFloat(totals.total_revenue.toFixed(2)),
        order_count: totals.order_ids.size,
      }))
      .sort((a, b) => new Date(a.order_date).getTime() - new Date(b.order_date).getTime());

    return result;
  }

  // Helper for CSV generation
  generateCsvData(data: SalesTrendDataPoint[]): string { // Typed the input for consistency
    if (!data || data.length === 0) {
      // Return headers even for an empty report for consistency
      return 'order_date,total_revenue,order_count\n';
    }
    const header = Object.keys(data[0]).join(',') + '\n';
    const rows = data.map(row =>
      Object.values(row)
        .map(String) 
        .map(val => `"${val.replace(/"/g, '""')}"`) 
        .join(',') + '\n'
    );
    return header + rows.join('');
  }
}