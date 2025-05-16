// backend/src/reporting/reporting.controller.ts
import { Controller, Get, Query, UseGuards, Req, Res, Header, ParseEnumPipe, DefaultValuePipe, Optional } from '@nestjs/common';
import { ReportingService } from './reporting.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SalesReportDto, TimePeriod } from './dto/sales-report.dto';
import { InventoryStatusResponseDto, FullInventoryItemDto } from './dto/inventory-status.dto'; // Ensure FullInventoryItemDto is exported if used here explicitly
import { Response } from 'express';

// Helper function to safely format CSV cell content
function formatCsvCell(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }
  const stringValue = String(value);
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`; // Escape double quotes
  }
  return stringValue;
}

@Controller('api/reporting')
@UseGuards(JwtAuthGuard)
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  @Get('seller/inventory/status')
  async getInventoryStatusReport(
    @Req() req,
  ): Promise<InventoryStatusResponseDto> {
    return this.reportingService.getInventoryStatus(req.user.sub);
  }

  @Get('seller/inventory/csv')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename=inventory_status_report.csv')
  async getInventoryStatusCsv(
    @Req() req,
    @Res() res: Response,
  ): Promise<void> {
    const inventoryData: InventoryStatusResponseDto = await this.reportingService.getInventoryStatus(req.user.sub);

    // Create a map for easy lookup of full product details by prodId from the fullInventory list
    // This ensures we can get category and price for low/out-of-stock items.
    const fullInventoryMap = new Map<number, FullInventoryItemDto>();
    inventoryData.fullInventory.forEach(item => {
      fullInventoryMap.set(item.prodId, item);
    });

    // Define the single, unified header row (5 columns)
    const header = 'Product ID,Product Name,Category,Price,Current Quantity\n';
    let csvData = header;

    // Function to format a product row according to the unified header
    // It expects an item that has all the necessary fields (prodId, productName, category, price, quantity)
    const formatProductDataRow = (productDetails: FullInventoryItemDto): string => {
      return [
        formatCsvCell(productDetails.prodId),
        formatCsvCell(productDetails.productName),
        formatCsvCell(productDetails.category),
        formatCsvCell(productDetails.price),
        formatCsvCell(productDetails.quantity), // 'quantity' from FullInventoryItemDto is current quantity
      ].join(',') + '\n';
    };
    
    // # Full Inventory section
    csvData += '# Full Inventory\n';
    inventoryData.fullInventory.forEach(item => {
      csvData += formatProductDataRow(item);
    });

    // # Low Stock Items section
    csvData += '\n# Low Stock Items\n';
    if (inventoryData.lowStockItems.length > 0) {
      inventoryData.lowStockItems.forEach(lowStockItem => {
        const fullDetailItem = fullInventoryMap.get(lowStockItem.prodId);
        if (fullDetailItem) {
          // Use fullDetailItem to ensure all 5 columns are populated correctly
          csvData += formatProductDataRow(fullDetailItem);
        } else {
          // Fallback: This should ideally not happen if data is consistent.
          // Log this server-side if it occurs.
          // For CSV, provide what we have for the lowStockItem, with placeholders for missing full details.
          csvData += [
            formatCsvCell(lowStockItem.prodId),
            formatCsvCell(lowStockItem.productName),
            formatCsvCell('N/A_Category'), // Category missing from LowStockItemDto
            formatCsvCell('N/A_Price'),   // Price missing from LowStockItemDto
            formatCsvCell(lowStockItem.currentQuantity)
          ].join(',') + '\n';
        }
      });
    } else {
      // Do not add "No items..." to the CSV data itself, the empty section under the marker is enough.
    }

    // # Out of Stock Items section
    csvData += '\n# Out of Stock Items\n';
    if (inventoryData.outOfStockItems.length > 0) {
      inventoryData.outOfStockItems.forEach(outOfStockItem => {
        const fullDetailItem = fullInventoryMap.get(outOfStockItem.prodId);
        if (fullDetailItem) {
          // Use fullDetailItem to ensure all 5 columns are populated correctly
          // (quantity will be 0 for these items as per FullInventoryItemDto)
          csvData += formatProductDataRow(fullDetailItem);
        } else {
          // Fallback
          csvData += [
            formatCsvCell(outOfStockItem.prodId),
            formatCsvCell(outOfStockItem.productName),
            formatCsvCell('N/A_Category'),
            formatCsvCell('N/A_Price'),
            formatCsvCell(0) // Current Quantity is 0
          ].join(',') + '\n';
        }
      });
    } else {
      // Do not add "No items..." to the CSV
    }
    
    // # Stock Breakdown section
    csvData += '\n# Stock Breakdown\n';
    csvData += `Total Products,${inventoryData.stockBreakdown.totalProducts}\n`;
    csvData += `In Stock (%),${inventoryData.stockBreakdown.inStockPercent}\n`;
    csvData += `Low Stock (%),${inventoryData.stockBreakdown.lowStockPercent}\n`;
    csvData += `Out of Stock (%),${inventoryData.stockBreakdown.outOfStockPercent}\n`;

    // Report Generated At
    csvData += `\nReport Generated At:,${inventoryData.reportGeneratedAt.toISOString()}\n`;

    res.send(csvData);
  }

  // Sales Trends Endpoints (remain unchanged from your provided file)
  @Get('seller/sales-trends')
  async getSalesTrends(
    @Req() req,
    @Query('period', new DefaultValuePipe(TimePeriod.WEEKLY), new ParseEnumPipe(TimePeriod)) period: TimePeriod,
    @Query('date') @Optional() date?: string,
  ): Promise<SalesReportDto> {
    return this.reportingService.getSalesTrends(req.user.sub, period, date);
  }

  @Get('seller/sales-trends/csv')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename=sales_trends.csv')
  async getSalesTrendsCsv(
    @Req() req,
    @Query('period', new DefaultValuePipe(TimePeriod.WEEKLY), new ParseEnumPipe(TimePeriod)) period: TimePeriod,
    @Res() res: Response,
    @Query('date') @Optional() date?: string,
  ): Promise<void> {
    const reportData: SalesReportDto = await this.reportingService.getSalesTrends(req.user.sub, period, date);
    const salesCsvRows = this.reportingService.generateCSVData(reportData.salesData, 'Sales Trends');
    
    let summaryCsv = '\n# Report Summary\n';
    summaryCsv += `Total Sales,${reportData.summary.totalSales}\n`;
    summaryCsv += `Average Daily Sales,${reportData.summary.averageDailySales}\n`;
    summaryCsv += `Period,${reportData.summary.period}\n`;
    summaryCsv += `Start Date,${reportData.summary.startDate}\n`;
    summaryCsv += `End Date,${reportData.summary.endDate}\n`;
    summaryCsv += `Report Generated At,${reportData.reportGeneratedAt.toISOString()}\n`;

    res.send(salesCsvRows + summaryCsv);
  }
}