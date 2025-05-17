// frontend/src/types/index.ts

// ... your existing exports
export * from './reporting';
export * from './createStore';

export interface ColorOption {
  id: number;
  color: string;
}

export interface Product { // This is your general Product type, ensure it's comprehensive
  prodId: number; // Changed from id to prodId to match backend Product entity
  name: string;
  description?: string;
  category?: string;
  price: number; // Changed from string to number
  productquantity: number;
  userId?: string; // Seller's ID
  imageUrl?: string; // Changed from image to imageUrl
  storeId: string; // Added storeId
  storeName?: string;
  isActive?: boolean;
  // colorOptions: ColorOption[]; // This field doesn't seem to exist in the backend Product entity for general products
}

export interface Shop {
  id: number;
  name: string;
  image: string;
  info: string;
}

export interface Feature {
  id: number;
  title: string;
  description: string;
  icon: string;
}

// --- UPDATED PopularProductDto ---
export interface PopularProductDto {
  productId: number; // Matches backend (Product.prodId)
  name: string; // Matches backend (Product.name)
  imageUrl?: string; // Matches backend (Product.imageUrl)
  storeName?: string; // Matches backend (Product.storeName)
  salesCount: number; // Calculated field

  // --- NEW FIELDS FOR ADD TO CART ---
  productPrice: number;    // From backend (Product.price)
  productquantity: number; // Available stock, from backend (Product.productquantity)
  storeId: string;         // From backend (Product.storeId)
  userId: string;          // Seller's ID, from backend (Product.userId)
}
