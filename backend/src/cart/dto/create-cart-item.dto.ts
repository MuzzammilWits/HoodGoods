import { IsString, IsNumber, IsPositive, IsOptional } from 'class-validator';

export class CreateCartItemDto {
  @IsString()
  productId: string;

  @IsString()
  name: string;

  @IsNumber()
  @IsPositive()
  price: number;

  @IsNumber()
  @IsPositive()
  quantity: number;

  @IsString()
  @IsOptional()
  image?: string;
}