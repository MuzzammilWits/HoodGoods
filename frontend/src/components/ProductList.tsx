// src/components/ProductList.tsx
import React from 'react';
import ProductForm from './ProductForm';
import { ProductFormData } from '../types/createStore'; // Adjust path if needed

interface ProductListProps {
  products: ProductFormData[];
  productCategories: string[];
  onProductChange: (index: number, field: keyof Omit<ProductFormData, 'image' | 'imagePreview' | 'imageURL'>, value: string) => void;
  onImageChange: (index: number, e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveProduct: (index: number) => void;
  onAddProduct: () => void;
  isSubmitting: boolean;
}

const ProductList: React.FC<ProductListProps> = ({
  products,
  productCategories,
  onProductChange,
  onImageChange,
  onRemoveProduct,
  onAddProduct,
  isSubmitting,
}) => {
  return (
    <>
      <h2>Products</h2>
      <p>Add at least one product. Ensure all fields are filled and an image is selected.</p>

      {products.map((product, index) => (
        <ProductForm
          key={index} // Consider a more stable unique key if available/needed
          product={product}
          index={index}
          productCategories={productCategories}
          onProductChange={onProductChange}
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
    </>
  );
};

export default ProductList;