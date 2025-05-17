// src/admin/dto/delete-product.dto.ts
import { IsInt, IsPositive } from 'class-validator';

export class DeleteProductDto {
  @IsInt()
  @IsPositive()
  productId: number;
}