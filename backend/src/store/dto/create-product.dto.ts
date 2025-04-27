// src/store/dto/create-product.dto.ts

// Define the shape for creating a single product
export interface CreateProductDto {
  name: string;                  // Changed from productName
  description: string;           // Changed from productDescription
  price: number;                 // Changed from productPrice
  category: string;              // Changed from productCategory
  imageUrl: string;              // Changed from imageURL
  productquantity: number;       // Added product quantity field
  storeName?: string;            // Remains the same, still optional here
}

// Define the shape for creating a store along with its initial products
export interface CreateStoreWithProductsDto {
  storeName: string;             // Remains the same
  products: CreateProductDto[];  // Uses the updated CreateProductDto
}