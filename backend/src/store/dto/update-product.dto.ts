// src/store/dto/update-product.dto.ts
import { IsString, IsOptional, IsNumber, Min, IsUrl } from 'class-validator';
// You might want to use PartialType if you haven't already
// import { PartialType } from '@nestjs/mapped-types';
// import { CreateProductDto } from './create-product.dto';
// export class UpdateProductDto extends PartialType(CreateProductDto) {}
// If not using PartialType, define explicitly:

export class UpdateProductDto {
  @IsString()
  @IsOptional()
  productName?: string;

  @IsString()
  @IsOptional()
  productDescription?: string;

  @IsNumber()
  @Min(0.01)
  @IsOptional()
  productPrice?: number;

  @IsString()
  @IsOptional()
  productCategory?: string;

  // --- ADD THIS ---
  @IsUrl()
  @IsOptional() // Optional during updates
  imageURL?: string;
  // --- END ADD ---

  // storeName is generally not updated per product
  // userID is derived from the token, not the body
}
