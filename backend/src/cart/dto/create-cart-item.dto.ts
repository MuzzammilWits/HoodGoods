import { IsNumber, IsPositive, Min } from 'class-validator';

export class CreateCartItemDto {
  @IsNumber()
  productId: number; 

  @IsNumber()
  @IsPositive() 
  @Min(1) // Quantity must be at least 1
  quantity: number;
}