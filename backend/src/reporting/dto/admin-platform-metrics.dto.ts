// backend/src/reporting/dto/admin-platform-metrics.dto.ts
import { TimePeriod } from './sales-report.dto'; // Re-use TimePeriod if applicable

export class PlatformMetricPointDto {
  date: string; // e.g., "2023-10-26"
  totalSales: number;
  totalOrders: number; // Now required
  // newBuyers?: number;
  // newSellers?: number;
}

export class OverallPlatformMetricsDto {
  totalSales: number;
  totalOrders: number;
  averageOrderValue: number;
  totalActiveSellers: number;
  totalRegisteredBuyers: number;
}

export class AdminPlatformMetricsResponseDto {
  overallMetrics: OverallPlatformMetricsDto;
  timeSeriesMetrics?: PlatformMetricPointDto[]; // This is active
  reportGeneratedAt: Date;
  periodCovered: {
    period: TimePeriod | 'allTime' | 'custom';
    startDate?: string;
    endDate?: string;
  };
}