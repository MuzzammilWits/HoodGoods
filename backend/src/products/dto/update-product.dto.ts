
export interface UpdateProductDto {
  name?: string;                 // Changes from productName
  description?: string;          // Changes from productDescription
  price?: number;                // Changes from productPrice
  category?: string;             // Changes from productCategory
  imageUrl?: string;             // Changes from imageURL
  productquantity?: number; // Added optional product quantity field
  isActive?: boolean;           
  // storeName is typically not updated individually here, but managed at the store level
  // isActive might be handled by separate activate/deactivate endpoints
}
