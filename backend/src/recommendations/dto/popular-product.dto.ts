// backend/src/recommendations/dto/popular-product.dto.ts

export class PopularProductDto {
  productId: number; // Matches Product.prodId type
  name: string; // Matches Product.name type
  imageUrl?: string; // Matches Product.imageUrl type (optional as it's nullable in entity)
  storeName?: string; // Matches Product.storeName type
  salesCount: number; // Sum of SellerOrderItem.quantityOrdered

  // --- NEW FIELDS FOR ADD TO CART ---
  productPrice: number; // From Product.price
  productquantity: number; // Available stock, from Product.productquantity
  storeId: string; // From Product.storeId (ensure it's a string)
  userId: string; // Seller's ID, from Product.userId
}
