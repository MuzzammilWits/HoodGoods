// src/store/dto/update-product.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateProductDto } from './create-product.dto';

// All fields from CreateProductDto will be optional here
export class UpdateProductDto extends PartialType(CreateProductDto) {}

// Note: CreateProductDto already had imageURL removed. 
// If you need to specifically disallow changing the storeName during an update, 
// you might need a more specific DTO or add logic in the service.
// For now, this allows updating name, description, price, category, and potentially storeName.