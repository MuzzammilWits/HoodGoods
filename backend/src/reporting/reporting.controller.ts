// backend/src/reporting/reporting.controller.ts
import { Controller, Get, Query, UseGuards, Req, Res, Header, ParseEnumPipe, DefaultValuePipe, Optional } from '@nestjs/common';
import { ReportingService } from './reporting.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SalesReportDto, TimePeriod } from './dto/sales-report.dto';
// ---- NEW IMPORTS ----
import { InventoryStatusResponseDto } from './dto/inventory-status.dto';
// ---- END NEW IMPORTS ----
import { Response } from 'express'; // Import Response from express

@Controller('api/reporting')
@UseGuards(JwtAuthGuard) // Apply to all routes in this controller
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  // ---- NEW ENDPOINT FOR INVENTORY STATUS ----
  @Get('seller/inventory/status')
  async getInventoryStatusReport(
    @Req() req,
  ): Promise<InventoryStatusResponseDto> {
    // req.user.sub will contain the Auth0 user ID from the JwtAuthGuard
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
    
    // Combine all lists for a comprehensive CSV or create separate CSVs/sections
    // For this example, let's create a CSV from the full inventory list primarily
    // and mention others. A more complex CSV might require more structure.

    let csvData = 'Report Section,Product ID,Product Name,Quantity,Price,Category\n';

    csvData += '# Full Inventory\n';
    inventoryData.fullInventory.forEach(item => {
        csvData += `Full Inventory,${item.prodId},"${item.productName.replace(/"/g, '""')}",${item.quantity},${item.price},"${item.category.replace(/"/g, '""')}"\n`;
    });

    csvData += '\n# Low Stock Items\n';
    csvData += 'Product ID,Product Name,Current Quantity\n';
    inventoryData.lowStockItems.forEach(item => {
        csvData += `${item.prodId},"${item.productName.replace(/"/g, '""')}",${item.currentQuantity}\n`;
    });

    csvData += '\n# Out of Stock Items\n';
    csvData += 'Product ID,Product Name\n';
    inventoryData.outOfStockItems.forEach(item => {
        csvData += `${item.prodId},"${item.productName.replace(/"/g, '""')}"\n`;
    });
    
    csvData += '\n# Stock Breakdown\n';
    csvData += `Total Products,${inventoryData.stockBreakdown.totalProducts}\n`;
    csvData += `In Stock (%),${inventoryData.stockBreakdown.inStockPercent}\n`;
    csvData += `Low Stock (%),${inventoryData.stockBreakdown.lowStockPercent}\n`;
    csvData += `Out of Stock (%),${inventoryData.stockBreakdown.outOfStockPercent}\n`;

    csvData += `\nReport Generated At:,${inventoryData.reportGeneratedAt.toISOString()}\n`;

    res.send(csvData);
  }
  // ---- END NEW ENDPOINT ----


  @Get('seller/sales-trends')
  async getSalesTrends(
    @Req() req,
    @Query('period', new DefaultValuePipe(TimePeriod.WEEKLY), new ParseEnumPipe(TimePeriod)) period: TimePeriod,
    @Query('date') @Optional() date?: string, // Make date optional
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
    // Use generic CSV generation for sales data
    const csvData = this.reportingService.generateCSVData(reportData.salesData, 'Sales Trends');
    // Add summary to CSV
    let summaryCsv = '\n# Report Summary\n';
    summaryCsv += `Total Sales,${reportData.summary.totalSales}\n`;
    summaryCsv += `Average Daily Sales,${reportData.summary.averageDailySales}\n`;
    summaryCsv += `Period,${reportData.summary.period}\n`;
    summaryCsv += `Start Date,${reportData.summary.startDate}\n`;
    summaryCsv += `End Date,${reportData.summary.endDate}\n`;
    summaryCsv += `Report Generated At,${reportData.reportGeneratedAt.toISOString()}\n`;

    res.send(csvData + summaryCsv);
  }
}