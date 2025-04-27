// src/types/createStore.ts

// Reusable product categories
export const PRODUCT_CATEGORIES = [
    'Home & Living', 'Jewellery & Accessories', 'Clothing', 'Bags & Purses',
    'Art', 'Crafts & Collectibles', 'Beauty & Wellness', 'Kids & Baby',
    'Pet Goods', 'Stationery & Paper Goods', 'Food & Beverage', 'Other'
  ];

// Interface for individual product form state
export interface ProductFormData {
    productName: string;
    productDescription: string;
    productPrice: string; // Keep as string for input control, parse on submit
    productQuantity: string; // Added: Keep as string for input control, parse on submit
    productCategory: string;
    image: File | null; // File object for upload
    imagePreview: string |null; // Data URL string for preview
    imageURL?: string; // Final URL from backend (added after upload)
}

// Interface for the overall store form state
export interface StoreFormData {
    storeName: string;
    products: ProductFormData[];
}