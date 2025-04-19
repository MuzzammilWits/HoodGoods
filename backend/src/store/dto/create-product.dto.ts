// src/store/dto/create-product.dto.ts

export interface CreateProductDto {
  productName: string;
  productDescription: string;
  productPrice: number;
  productCategory: string;
  imageURL: string;
  storeName: string;
  products: any[]; // You can refine this type
}

export interface CreateStoreWithProductsDto {
  storeName: string;
  products: CreateProductDto[];
}
