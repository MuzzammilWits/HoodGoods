// src/reporting/dto/__tests__/admin-platform-metrics.dto.spec.ts
import { PlatformMetricPointDto, OverallPlatformMetricsDto, AdminPlatformMetricsResponseDto } from './admin-platform-metrics.dto';
import { TimePeriod } from './sales-report.dto'; // Assuming this is the correct path

describe('Admin Platform Metrics DTOs', () => {
  describe('PlatformMetricPointDto', () => {
    it('should correctly create an instance with valid data', () => {
      const data = {
        date: '2023-10-26',
        totalSales: 1500.75,
        totalOrders: 30,
        // newBuyers: 5, // Optional, testing without it first
        // newSellers: 2, // Optional, testing without it first
      };
      const dto = new PlatformMetricPointDto();
      Object.assign(dto, data);

      expect(dto).toBeInstanceOf(PlatformMetricPointDto);
      expect(dto.date).toEqual(data.date);
      expect(dto.totalSales).toEqual(data.totalSales);
      expect(dto.totalOrders).toEqual(data.totalOrders);
      // expect(dto.newBuyers).toEqual(data.newBuyers);
      // expect(dto.newSellers).toEqual(data.newSellers);
    });

    it('should allow optional fields to be undefined if not provided', () => {
        const data = {
            date: '2023-11-01',
            totalSales: 2000,
            totalOrders: 50,
        };
        const dto = new PlatformMetricPointDto();
        Object.assign(dto, data);

        expect(dto.date).toEqual(data.date);
        expect(dto.totalSales).toEqual(data.totalSales);
        expect(dto.totalOrders).toEqual(data.totalOrders);
        // Since newBuyers and newSellers are commented out in the DTO,
        // they won't exist on the instance unless explicitly added.
        // If they were defined as optional (e.g., newBuyers?: number),
        // then we would check:
        // expect(dto.newBuyers).toBeUndefined();
        // expect(dto.newSellers).toBeUndefined();
    });
  });

  describe('OverallPlatformMetricsDto', () => {
    it('should correctly create an instance with valid data', () => {
      const data = {
        totalSales: 100000.50,
        totalOrders: 1200,
        averageOrderValue: 83.75,
        totalActiveSellers: 50,
        totalRegisteredBuyers: 5000,
      };
      const dto = new OverallPlatformMetricsDto();
      Object.assign(dto, data);

      expect(dto).toBeInstanceOf(OverallPlatformMetricsDto);
      expect(dto.totalSales).toEqual(data.totalSales);
      expect(dto.totalOrders).toEqual(data.totalOrders);
      expect(dto.averageOrderValue).toEqual(data.averageOrderValue);
      expect(dto.totalActiveSellers).toEqual(data.totalActiveSellers);
      expect(dto.totalRegisteredBuyers).toEqual(data.totalRegisteredBuyers);
    });
  });

  describe('AdminPlatformMetricsResponseDto', () => {
    let mockOverallMetrics: OverallPlatformMetricsDto;
    let mockTimeSeriesMetric: PlatformMetricPointDto;

    beforeEach(() => {
      mockOverallMetrics = new OverallPlatformMetricsDto();
      Object.assign(mockOverallMetrics, {
        totalSales: 50000,
        totalOrders: 600,
        averageOrderValue: 83.33,
        totalActiveSellers: 25,
        totalRegisteredBuyers: 2500,
      });

      mockTimeSeriesMetric = new PlatformMetricPointDto();
      Object.assign(mockTimeSeriesMetric, {
        date: '2023-10-01',
        totalSales: 1200,
        totalOrders: 15,
      });
    });

    it('should correctly create an instance with all fields', () => {
      const reportDate = new Date('2023-10-27T10:00:00.000Z');
      const data = {
        overallMetrics: mockOverallMetrics,
        timeSeriesMetrics: [mockTimeSeriesMetric, { ...mockTimeSeriesMetric, date: '2023-10-02', totalSales: 1300, totalOrders: 18 }],
        reportGeneratedAt: reportDate,
        periodCovered: {
          period: 'last7Days',
        },
      };
      const dto = new AdminPlatformMetricsResponseDto();
      Object.assign(dto, data);

      expect(dto).toBeInstanceOf(AdminPlatformMetricsResponseDto);
      expect(dto.overallMetrics).toEqual(mockOverallMetrics);
      expect(dto.timeSeriesMetrics).toEqual(data.timeSeriesMetrics);
      expect(dto.reportGeneratedAt).toEqual(reportDate);
      expect(dto.periodCovered).toEqual(data.periodCovered);
    });

    it('should allow timeSeriesMetrics to be undefined', () => {
      const reportDate = new Date();
      const data = {
        overallMetrics: mockOverallMetrics,
        // timeSeriesMetrics is omitted, so it should be undefined
        reportGeneratedAt: reportDate,
        periodCovered: {
          period: 'allTime' as 'allTime', // Cast for type safety
        },
      };
      const dto = new AdminPlatformMetricsResponseDto();
      Object.assign(dto, data);

      expect(dto.overallMetrics).toEqual(mockOverallMetrics);
      expect(dto.timeSeriesMetrics).toBeUndefined();
      expect(dto.reportGeneratedAt).toEqual(reportDate);
      expect(dto.periodCovered.period).toEqual('allTime');
    });

    it('should correctly handle "custom" period with startDate and endDate', () => {
      const data = {
        overallMetrics: mockOverallMetrics,
        reportGeneratedAt: new Date(),
        periodCovered: {
          period: 'custom' as 'custom',
          startDate: '2023-01-01',
          endDate: '2023-01-31',
        },
      };
      const dto = new AdminPlatformMetricsResponseDto();
      Object.assign(dto, data);

      expect(dto.periodCovered.period).toEqual('custom');
      expect(dto.periodCovered.startDate).toEqual('2023-01-01');
      expect(dto.periodCovered.endDate).toEqual('2023-01-31');
    });

    it('should allow startDate and endDate to be undefined for non-custom periods', () => {
        const data = {
            overallMetrics: mockOverallMetrics,
            reportGeneratedAt: new Date(),
            periodCovered: {
                     period: 'last30Days',
                // startDate and endDate are not applicable here
            },
        };
        const dto = new AdminPlatformMetricsResponseDto();
        Object.assign(dto, data);

        expect(dto.periodCovered.period).toEqual('last30Days');
        expect(dto.periodCovered.startDate).toBeUndefined();
        expect(dto.periodCovered.endDate).toBeUndefined();
    });
  });
});
