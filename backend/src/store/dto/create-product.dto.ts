// src/store/dto/create-product.dto.ts
export class CreateProductDto {
  productName: string;
  productDescription: string;
  productPrice: number;
  productCategory: string;
  // REMOVE THIS LINE:
  // imageURL: string;
  storeName: string; // Keep storeName if needed for adding individual products
}

export class CreateStoreWithProductsDto {
  storeName: string;
  products: CreateProductDto[]; // This will now use the modified CreateProductDto
}