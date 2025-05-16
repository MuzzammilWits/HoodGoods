// backend/src/reporting/dto/inventory-status.dto.ts

export class LowStockItemDto {
  productName: string;
  currentQuantity: number;
  prodId: number; // Added for potential linking in frontend
}

export class OutOfStockItemDto {
  productName: string;
  prodId: number; // Added for potential linking in frontend
}

export class FullInventoryItemDto {
  prodId: number;
  productName: string;
  quantity: number;
  price: number;
  category: string; // Added for filtering
}

export class StockBreakdownDto {
  inStockPercent: number;
  lowStockPercent: number;
  outOfStockPercent: number;
  totalProducts: number;
}

export class InventoryStatusResponseDto {
  lowStockItems: LowStockItemDto[];
  outOfStockItems: OutOfStockItemDto[];
  fullInventory: FullInventoryItemDto[];
  stockBreakdown: StockBreakdownDto;
  reportGeneratedAt: Date;
}