// src/store/dto/create-product.dto.ts
import { IsString, IsNotEmpty, IsNumber, Min, IsOptional, IsUrl } from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  productName: string;

  @IsString()
  @IsNotEmpty()
  productDescription: string;

  @IsNumber()
  @Min(0.01)
  productPrice: number;

  @IsString()
  @IsNotEmpty()
  productCategory: string;

  @IsString()
  @IsOptional() // Make optional if storeName can be inferred sometimes (like in addProduct service)
  storeName?: string;

  // --- ADD THIS ---
  @IsUrl() // Validate that it's a URL
  @IsNotEmpty() // Make it required for new products based on the flow
  imageURL: string;
  // --- END ADD ---
}

// Used for the initial store creation
export class CreateStoreWithProductsDto {
    @IsString()
    @IsNotEmpty()
    storeName: string;

    // Ensure products within this DTO also validate the imageURL
    // You might need to use @ValidateNested() and @Type(() => CreateProductDto) if you haven't already
    products: CreateProductDto[];
}