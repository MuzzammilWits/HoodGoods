// backend/src/reporting/dto/sales-report.dto.ts

export enum TimePeriod {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

export class SalesDataDto {
  date: string; // e.g., "2023-10-26"
  sales: number;
}

export class SalesReportSummaryDto {
  totalSales: number;
  averageDailySales: number;
  period: TimePeriod;
  startDate: string;
  endDate: string;
}

export class SalesReportDto {
  salesData: SalesDataDto[];
  summary: SalesReportSummaryDto;
  reportGeneratedAt: Date;
}