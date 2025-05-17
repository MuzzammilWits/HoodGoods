// backend/src/recommendations/dto/popular-product.dto.ts

export class PopularProductDto {
  productId: number; // Matches Product.prodId type
  name: string; // Matches Product.name type
  imageUrl?: string; // Matches Product.imageUrl type (optional as it's nullable in entity)
  storeName?: string; // Matches Product.storeName type (optional if not always present or if we decide to make it so)
  salesCount: number; // Sum of SellerOrderItem.quantityOrdered
  // revenueGenerated?: number; // Optional, if ranking by revenue - we can add this later if needed
}