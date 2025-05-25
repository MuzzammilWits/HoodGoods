
import { IsString, IsNotEmpty, IsNumber, IsUrl, IsOptional, Min, IsInt } from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional() // Make description optional
  description?: string;

  @IsNumber({ maxDecimalPlaces: 4 }) // Allow up to 4 decimal places
  @Min(0) // Price cannot be negative/cannot be less than '0'
  price: number;

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsUrl() // Validates if it's a valid URL format
  @IsOptional() // Make image URL optional during initial creation
  imageUrl?: string;

  @IsInt() // Ensure it's a whole number
  @Min(0) // Quantity cannot be negative/cannot be less than '0'
  productquantity: number;
}