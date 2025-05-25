// backend/src/common/pipes/parse-period.pipe.ts
import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { TimePeriod } from '../../reporting/dto/sales-report.dto'; 

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
    
    return value as TimePeriod | 'allTime'; // Return as is if not an exact match, service will handle default
  }
}