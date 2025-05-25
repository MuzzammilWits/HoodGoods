import { ParsePeriodPipe } from './parse-period.pipe'; 
import { TimePeriod } from '../../reporting/dto/sales-report.dto'; 
import { ArgumentMetadata, BadRequestException } from '@nestjs/common';

describe('ParsePeriodPipe', () => {
  let pipe: ParsePeriodPipe;
  const metadata: ArgumentMetadata = {
    type: 'param',
    data: 'period',
  };

  beforeEach(() => {
    pipe = new ParsePeriodPipe();
  });

  it('should return "allTime" when value is undefined', () => {
    expect(pipe.transform(undefined as any, metadata)).toBe('allTime');
  });

  it('should return "allTime" when value is "allTime"', () => {
    expect(pipe.transform('allTime', metadata)).toBe('allTime');
  });

  it('should return TimePeriod.DAILY when value is "daily"', () => {
    expect(pipe.transform('daily', metadata)).toBe(TimePeriod.DAILY);
  });

  it('should return TimePeriod.WEEKLY when value is "weekly"', () => {
    expect(pipe.transform('weekly', metadata)).toBe(TimePeriod.WEEKLY);
  });

  it('should return TimePeriod.MONTHLY when value is "monthly"', () => {
    expect(pipe.transform('monthly', metadata)).toBe(TimePeriod.MONTHLY);
  });

  it('should return TimePeriod.YEARLY when value is "yearly"', () => {
    expect(pipe.transform('yearly', metadata)).toBe(TimePeriod.YEARLY);
  });

  it('should return the invalid value when it is not a valid TimePeriod or "allTime"', () => {
    expect(pipe.transform('invalid-period', metadata)).toBe('invalid-period');
  });
});
