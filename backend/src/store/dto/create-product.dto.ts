// src/store/dto/create-product.dto.ts
import { IsString, IsNotEmpty, IsNumber, Min, IsUrl } from 'class-validator';

export class CreateProductDto {
  @IsString()
  productName!: string;

  @IsString()
  productDescription!: string;

  @IsNumber()
  @Min(0.01)
  productPrice!: number;

  @IsString()
  productCategory!: string;

  @IsUrl()
  imageURL!: string;

  @IsString()
  storeName!: string;

  products!: any[]; // Adjust type as needed
}

// Used for the initial store creation
export class CreateStoreWithProductsDto {
    @IsString()
    @IsNotEmpty()
    storeName!: string;

    // Ensure products within this DTO also validate the imageURL
    // You might need to use @ValidateNested() and @Type(() => CreateProductDto) if you haven't already
    products!: CreateProductDto[];
}