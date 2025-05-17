// backend/src/recommendations/recommendations.controller.ts
import { Controller, Get, Query, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { RecommendationsService } from './recommendations.service';
import { PopularProductDto } from './dto/popular-product.dto';

@Controller('api/recommendations') // Base path for recommendations
export class RecommendationsController {
  constructor(private readonly recommendationsService: RecommendationsService) {}

  @Get('best-sellers')
  async getBestSellingProducts(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('timeWindowDays', new DefaultValuePipe(30), ParseIntPipe) timeWindowDays: number,
  ): Promise<PopularProductDto[]> {
    return this.recommendationsService.getBestSellingProducts(limit, timeWindowDays);
  }
}