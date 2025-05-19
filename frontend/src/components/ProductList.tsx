// src/components/ProductList.tsx
import React from 'react';
import ProductForm from './ProductForm';
// Ensure ProductFormData is the simplified version (no storeName/delivery)
import { ProductFormData } from '../types/createStore';

interface ProductListProps {
  products: ProductFormData[];
  productCategories: string[];
  // --- UPDATE the type for the 'field' parameter ---
  onProductChange: (
      index: number,
      // Omit image fields AND delivery fields
      field: keyof Omit<ProductFormData,
          'image' | 'imagePreview' | 'imageURL' |
          'standardPrice' | 'standardTime' | 'expressPrice' | 'expressTime'
      >,
      value: string
  ) => void;
  // --- End Update ---
  onImageChange: (index: number, e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveProduct: (index: number) => void;
  onAddProduct: () => void;
  isSubmitting: boolean;
}

const ProductList: React.FC<ProductListProps> = ({
  products,
  productCategories,
  onProductChange, // Now expects the correct type
  onImageChange,
  onRemoveProduct,
  onAddProduct,
  isSubmitting,
}) => {
  return (
    // Using section for structure
    <section className="product-list-section">
      <h2>Products</h2>
      <div className="product-requirements-note">
        <h4>PLEASE NOTE:</h4>
        <p>In order to successfully create a store: Add at least one product, ensure all required fields are completed and include an image for each product.</p>
      </div>

      {products.map((product, index) => (
        <ProductForm
          key={index} // Consider a more stable unique key if available/needed
          product={product} // Pass simplified ProductFormData
          index={index}
          productCategories={productCategories}
          onProductChange={onProductChange} // Pass down the correctly typed handler
          onImageChange={onImageChange}
          onRemove={onRemoveProduct}
          isSubmitting={isSubmitting}
          canRemove={products.length > 1}
        />
      ))}

      <button
        type="button"
        className="add-product-btn"
        onClick={onAddProduct}
        disabled={isSubmitting}
      >
        + Add Another Product
      </button>
    </section>
  );
};

export default ProductList;