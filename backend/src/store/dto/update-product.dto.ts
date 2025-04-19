// src/store/dto/update-product.dto.ts

export interface UpdateProductDto {
  productName?: string;
  productDescription?: string;
  productPrice?: number;
  productCategory?: string;
  imageURL?: string;
}
