// backend/src/common/pipes/parse-period.pipe.ts
import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { TimePeriod } from '../../reporting/dto/sales-report.dto'; // Adjust path to your TimePeriod enum

@Injectable()
export class ParsePeriodPipe implements PipeTransform<string, TimePeriod | 'allTime'> {
  transform(value: string, metadata: ArgumentMetadata): TimePeriod | 'allTime' {
    if (!value) { // Should be handled by DefaultValuePipe if used before this
        return 'allTime';
    }
    if (value === 'allTime') {
      return 'allTime';
    }
    const enumValues = Object.values(TimePeriod) as string[];
    if (enumValues.includes(value)) {
      return value as TimePeriod;
    }
    // Optional: Throw an error for invalid period values not caught by enum parsing
    // This depends on how strict you want to be. The service layer also has defaults.
    // For now, we let it pass through and the service can default.
    // OR:
    // throw new BadRequestException(`Invalid period: <span class="math-inline">\{value\}\. Must be 'allTime' or one of \[</span>{enumValues.join(', ')}]`);
    return value as TimePeriod | 'allTime'; // Return as is if not an exact match, service will handle default
  }
}