// src/reporting/dto/__tests__/inventory-status.dto.spec.ts
import {
  LowStockItemDto,
  OutOfStockItemDto,
  FullInventoryItemDto,
  StockBreakdownDto,
  InventoryStatusResponseDto,
} from './inventory-status.dto';

describe('Inventory Status DTOs', () => {
  describe('LowStockItemDto', () => {
    it('should correctly create an instance with valid data', () => {
      const data = {
        productName: 'Product A',
        currentQuantity: 5,
        prodId: 101,
      };
      const dto = new LowStockItemDto();
      Object.assign(dto, data);

      expect(dto).toBeInstanceOf(LowStockItemDto);
      expect(dto.productName).toEqual(data.productName);
      expect(dto.currentQuantity).toEqual(data.currentQuantity);
      expect(dto.prodId).toEqual(data.prodId);
    });
  });

  describe('OutOfStockItemDto', () => {
    it('should correctly create an instance with valid data', () => {
      const data = {
        productName: 'Product B',
        prodId: 102,
      };
      const dto = new OutOfStockItemDto();
      Object.assign(dto, data);

      expect(dto).toBeInstanceOf(OutOfStockItemDto);
      expect(dto.productName).toEqual(data.productName);
      expect(dto.prodId).toEqual(data.prodId);
    });
  });

  describe('FullInventoryItemDto', () => {
    it('should correctly create an instance with valid data', () => {
      const data = {
        prodId: 103,
        productName: 'Product C',
        quantity: 50,
        price: 19.99,
        category: 'Electronics',
      };
      const dto = new FullInventoryItemDto();
      Object.assign(dto, data);

      expect(dto).toBeInstanceOf(FullInventoryItemDto);
      expect(dto.prodId).toEqual(data.prodId);
      expect(dto.productName).toEqual(data.productName);
      expect(dto.quantity).toEqual(data.quantity);
      expect(dto.price).toEqual(data.price);
      expect(dto.category).toEqual(data.category);
    });
  });

  describe('StockBreakdownDto', () => {
    it('should correctly create an instance with valid data', () => {
      const data = {
        inStockPercent: 70.5,
        lowStockPercent: 20.0,
        outOfStockPercent: 9.5,
        totalProducts: 200,
      };
      const dto = new StockBreakdownDto();
      Object.assign(dto, data);

      expect(dto).toBeInstanceOf(StockBreakdownDto);
      expect(dto.inStockPercent).toEqual(data.inStockPercent);
      expect(dto.lowStockPercent).toEqual(data.lowStockPercent);
      expect(dto.outOfStockPercent).toEqual(data.outOfStockPercent);
      expect(dto.totalProducts).toEqual(data.totalProducts);
    });
  });

  describe('InventoryStatusResponseDto', () => {
    let mockLowStockItem: LowStockItemDto;
    let mockOutOfStockItem: OutOfStockItemDto;
    let mockFullInventoryItem: FullInventoryItemDto;
    let mockStockBreakdown: StockBreakdownDto;

    beforeEach(() => {
      mockLowStockItem = new LowStockItemDto();
      Object.assign(mockLowStockItem, { productName: 'Low Product', currentQuantity: 3, prodId: 1 });

      mockOutOfStockItem = new OutOfStockItemDto();
      Object.assign(mockOutOfStockItem, { productName: 'OOS Product', prodId: 2 });

      mockFullInventoryItem = new FullInventoryItemDto();
      Object.assign(mockFullInventoryItem, { prodId: 3, productName: 'Full Product', quantity: 100, price: 10.00, category: 'Books' });

      mockStockBreakdown = new StockBreakdownDto();
      Object.assign(mockStockBreakdown, { inStockPercent: 80, lowStockPercent: 10, outOfStockPercent: 10, totalProducts: 100 });
    });

    it('should correctly create an instance with all fields', () => {
      const reportDate = new Date('2023-11-15T14:30:00.000Z');
      const data = {
        lowStockItems: [mockLowStockItem, { ...mockLowStockItem, productName: 'Another Low', prodId: 4 }],
        outOfStockItems: [mockOutOfStockItem],
        fullInventory: [mockFullInventoryItem, { ...mockFullInventoryItem, prodId: 5, productName: 'Another Full'}],
        stockBreakdown: mockStockBreakdown,
        reportGeneratedAt: reportDate,
      };
      const dto = new InventoryStatusResponseDto();
      Object.assign(dto, data);

      expect(dto).toBeInstanceOf(InventoryStatusResponseDto);
      expect(dto.lowStockItems).toEqual(data.lowStockItems);
      expect(dto.outOfStockItems).toEqual(data.outOfStockItems);
      expect(dto.fullInventory).toEqual(data.fullInventory);
      expect(dto.stockBreakdown).toEqual(data.stockBreakdown);
      expect(dto.reportGeneratedAt).toEqual(reportDate);
    });

    it('should correctly handle empty arrays for item lists', () => {
        const reportDate = new Date();
        const data = {
          lowStockItems: [],
          outOfStockItems: [],
          fullInventory: [],
          stockBreakdown: mockStockBreakdown, // Assuming breakdown is always present
          reportGeneratedAt: reportDate,
        };
        const dto = new InventoryStatusResponseDto();
        Object.assign(dto, data);

        expect(dto.lowStockItems).toEqual([]);
        expect(dto.outOfStockItems).toEqual([]);
        expect(dto.fullInventory).toEqual([]);
        expect(dto.stockBreakdown).toEqual(data.stockBreakdown);
        expect(dto.reportGeneratedAt).toEqual(reportDate);
      });
  });
});
