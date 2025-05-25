// Reusable product categories
export const PRODUCT_CATEGORIES = [
    'Home & Living', 'Jewellery & Accessories', 'Clothing', 'Bags & Purses',
    'Art', 'Crafts & Collectibles', 'Beauty & Wellness', 'Kids & Baby',
    'Pet Goods', 'Stationery & Paper Goods', 'Food & Beverage', 'Other'
  ];

// Delivery Time Options
export const STANDARD_DELIVERY_TIMES = ['3-5', '5-7', '7-9']; // Corrected (Matches backend) 
export const EXPRESS_DELIVERY_TIMES = ['0-1', '1-2', '2-3']; // In days


// Interface for individual product form state within Create Store page
// Contains only fields specific to the product input row
export interface ProductFormData {
    productName: string;
    productDescription: string;
    productPrice: string; //  parse on submit
    productQuantity: string; // parse on submit
    productCategory: string;
    image: File | null; // File object for upload
    imagePreview: string |null; // Data URL string for preview
    imageURL?: string; // Final URL from backend 
}

// Interface for the overall store creation form state
export interface StoreFormData {
    // Store-level fields
    storeName: string;
    standardPrice: string; // Keep as string for input, parse on submit
    standardTime: string; // Selected time range string (e.g., "3-4")
    expressPrice: string; // Keep as string for input, parse on submit
    expressTime: string; // Selected time range string (e.g., "1-2")
    isActiveStore: boolean;
    // Array of initial products (using the simplified ProductFormData above)
    products: ProductFormData[];
}