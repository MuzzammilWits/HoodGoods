// backend/src/reporting/reporting.controller.ts
import { Controller, Get, Query, UseGuards, Req, Res, Header, ParseEnumPipe, DefaultValuePipe, Optional, StreamableFile } from '@nestjs/common'; // Added StreamableFile just in case, though string return is primary
import { ReportingService } from './reporting.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { SalesReportDto, TimePeriod } from './dto/sales-report.dto';
import { InventoryStatusResponseDto, FullInventoryItemDto } from './dto/inventory-status.dto';
import { AdminPlatformMetricsResponseDto } from './dto/admin-platform-metrics.dto';
import { Response } from 'express'; // Still needed for existing methods
import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';

@Injectable()
export class ParsePeriodPipe implements PipeTransform<string, TimePeriod | 'allTime'> {
  transform(value: string, metadata: ArgumentMetadata): TimePeriod | 'allTime' {
    if (!value) {
        return 'allTime';
    }
    if (value === 'allTime') {
      return 'allTime';
    }
    const enumValues = Object.values(TimePeriod) as string[];
    if (enumValues.includes(value)) {
      return value as TimePeriod;
    }
    // Consider throwing BadRequestException for truly invalid values not handled by service defaults
    // For now, pass through; service has robust defaulting.
    return value as TimePeriod | 'allTime';
  }
}

function formatCsvCell(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }
  const stringValue = String(value);
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

@Controller('api/reporting')
@UseGuards(JwtAuthGuard)
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  // --- Seller Specific Reports ---
  // Method: getInventoryStatusReport (No changes)
  @Get('seller/inventory/status')
  async getInventoryStatusReport(@Req() req): Promise<InventoryStatusResponseDto> {
    return this.reportingService.getInventoryStatus(req.user.sub);
  }

  // Method: getInventoryStatusCsv (Line 108 error was on this one previously)
  // Let's refactor this one as well to return string, to be consistent and avoid @Res if it's causing issues globally
  @Get('seller/inventory/csv')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename=inventory_status_report.csv')
  async getInventoryStatusCsv(
    @Req() req,
  ): Promise<string> { // Changed return type
    const inventoryData: InventoryStatusResponseDto = await this.reportingService.getInventoryStatus(req.user.sub);
    const fullInventoryMap = new Map<number, FullInventoryItemDto>();
    inventoryData.fullInventory.forEach(item => fullInventoryMap.set(item.prodId, item));
    const header = 'Product ID,Product Name,Category,Price,Current Quantity\n';
    let csvData = header;
    const formatProductDataRow = (details: FullInventoryItemDto) => [
        formatCsvCell(details.prodId), formatCsvCell(details.productName),
        formatCsvCell(details.category), formatCsvCell(details.price),
        formatCsvCell(details.quantity)
    ].join(',') + '\n';
    csvData += '# Full Inventory\n';
    inventoryData.fullInventory.forEach(item => csvData += formatProductDataRow(item));
    csvData += '\n# Low Stock Items\n';
    inventoryData.lowStockItems.forEach(item => {
        const fullDetails = fullInventoryMap.get(item.prodId);
        if (fullDetails) {
             // Ensure fullDetails has all necessary fields matching FullInventoryItemDto
            const tempDetails = { ...fullDetails, quantity: item.currentQuantity }; // Use currentQuantity for low stock
            csvData += formatProductDataRow(tempDetails);
        } else {
             csvData += [
                formatCsvCell(item.prodId), formatCsvCell(item.productName), 'N/A_Category', 'N/A_Price', formatCsvCell(item.currentQuantity)
            ].join(',') + '\n';
        }
    });
    csvData += '\n# Out of Stock Items\n';
    inventoryData.outOfStockItems.forEach(item => {
        const fullDetails = fullInventoryMap.get(item.prodId);
         if (fullDetails) {
            // For out of stock, quantity in fullDetails should be 0.
            csvData += formatProductDataRow(fullDetails);
        } else {
            csvData += [
                formatCsvCell(item.prodId), formatCsvCell(item.productName), 'N/A_Category', 'N/A_Price', formatCsvCell(0)
            ].join(',') + '\n';
        }
    });
    csvData += '\n# Stock Breakdown\n';
    csvData += `Total Products,${inventoryData.stockBreakdown.totalProducts}\n`;
    csvData += `In Stock (%),${inventoryData.stockBreakdown.inStockPercent}\n`;
    csvData += `Low Stock (%),${inventoryData.stockBreakdown.lowStockPercent}\n`;
    csvData += `Out of Stock (%),${inventoryData.stockBreakdown.outOfStockPercent}\n`;
    csvData += `\nReport Generated At:,${inventoryData.reportGeneratedAt.toISOString()}\n`;
    return csvData; // Return string
  }

  // Method: getSalesTrends (No changes)
  @Get('seller/sales-trends')
  async getSalesTrends(
    @Req() req,
    @Query('period', new DefaultValuePipe(TimePeriod.WEEKLY), new ParseEnumPipe(TimePeriod)) period: TimePeriod,
    @Query('date') @Optional() date?: string,
  ): Promise<SalesReportDto> {
    return this.reportingService.getSalesTrends(req.user.sub, period, date);
  }

  // Method: getSalesTrendsCsv (Line 146 error was on this one previously referring to @Res in admin method)
  // Refactoring this one as well to return string
  @Get('seller/sales-trends/csv')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename=sales_trends.csv')
  async getSalesTrendsCsv(
    @Req() req,
    @Query('period', new DefaultValuePipe(TimePeriod.WEEKLY), new ParseEnumPipe(TimePeriod)) period: TimePeriod,
    @Query('date') @Optional() date?: string,
  ): Promise<string> { // Changed return type
    const reportData: SalesReportDto = await this.reportingService.getSalesTrends(req.user.sub, period, date);
    const salesCsvRows = this.reportingService.generateCSVData(reportData.salesData, 'Sales Trends');
    let summaryCsv = '\n# Report Summary\n';
    summaryCsv += `Total Sales,${reportData.summary.totalSales}\n`;
    summaryCsv += `Average Daily Sales,${reportData.summary.averageDailySales}\n`;
    summaryCsv += `Period,${reportData.summary.period}\n`;
    summaryCsv += `Start Date,${reportData.summary.startDate}\n`;
    summaryCsv += `End Date,${reportData.summary.endDate}\n`;
    summaryCsv += `Report Generated At,${reportData.reportGeneratedAt.toISOString()}\n`;
    return salesCsvRows + summaryCsv; // Return string
  }


  // --- Admin Specific Reports ---
  // Method: getAdminPlatformMetrics (This should be fine)
  @Get('admin/platform-metrics')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async getAdminPlatformMetrics(
    @Query('period', ParsePeriodPipe) period?: TimePeriod | 'allTime',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<AdminPlatformMetricsResponseDto> {
    const effectivePeriod = period || 'allTime';
    return this.reportingService.getAdminPlatformMetrics(effectivePeriod, startDate, endDate);
  }

  // Method: getAdminPlatformMetricsCsv (Line 183 error was on this one previously for @Res)
  // THIS IS THE MAIN CHANGE: NO @Res(), RETURN STRING
  @Get('admin/platform-metrics/csv')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename=admin_platform_metrics.csv')
  async getAdminPlatformMetricsCsv(
    @Query('period', ParsePeriodPipe) period?: TimePeriod | 'allTime',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<string> { // Return string
    const effectivePeriod = period || 'allTime';
    const reportData: AdminPlatformMetricsResponseDto = await this.reportingService.getAdminPlatformMetrics(
      effectivePeriod,
      startDate,
      endDate,
    );

    let csvData = '# Platform Overall Metrics\n';
    csvData += `Total Sales,${formatCsvCell(reportData.overallMetrics.totalSales)}\n`;
    csvData += `Total Orders,${formatCsvCell(reportData.overallMetrics.totalOrders)}\n`;
    csvData += `Average Order Value,${formatCsvCell(reportData.overallMetrics.averageOrderValue)}\n`;
    csvData += `Total Active Sellers,${formatCsvCell(reportData.overallMetrics.totalActiveSellers)}\n`;
    csvData += `Total Registered Buyers,${formatCsvCell(reportData.overallMetrics.totalRegisteredBuyers)}\n`;
    csvData += '\n# Report Details\n';
    csvData += `Period Covered,${formatCsvCell(reportData.periodCovered.period)}\n`;
    if (reportData.periodCovered.startDate) {
      csvData += `Start Date,${formatCsvCell(reportData.periodCovered.startDate)}\n`;
    }
    if (reportData.periodCovered.endDate) {
      csvData += `End Date,${formatCsvCell(reportData.periodCovered.endDate)}\n`;
    }
    csvData += `Report Generated At,${formatCsvCell(reportData.reportGeneratedAt.toISOString())}\n`;
    return csvData; // Return string directly
  }
}