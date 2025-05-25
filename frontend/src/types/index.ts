export * from './reporting';
export * from './createStore';

export interface ColorOption {
  id: number;
  color: string;
}

export interface Product { 
  prodId: number;
  name: string;
  description?: string;
  category?: string;
  price: number; 
  productquantity: number;
  userId?: string; // Seller's ID
  imageUrl?: string; 
  storeId: string; 
  storeName?: string;
  isActive?: boolean;
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

// PopularProductDto
export interface PopularProductDto {
  productId: number; 
  name: string; 
  imageUrl?: string; 
  storeName?: string;
  salesCount: number;

  
  productPrice: number;    // From backend (Product.price)
  productquantity: number; // Available stock, from backend (Product.productquantity)
  storeId: string;         // From backend (Product.storeId)
  userId: string;          // Seller's ID, from backend (Product.userId)
}
