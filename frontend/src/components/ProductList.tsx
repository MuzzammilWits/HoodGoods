import React from 'react';
import ProductForm from './ProductForm';
import { ProductFormData } from '../types/createStore';

interface ProductListProps {
  products: ProductFormData[];
  productCategories: string[];
  onProductChange: (
      index: number,
      // Omit image fields AND delivery fields
      field: keyof Omit<ProductFormData,
          'image' | 'imagePreview' | 'imageURL' |
          'standardPrice' | 'standardTime' | 'expressPrice' | 'expressTime'
      >,
      value: string
  ) => void;
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
    // Using section for structure
    <section className="product-list-section">
      <h2>Products</h2>
      <p className="product-disclaimer">Add at least one product. Ensure all fields are filled and an image is selected.</p>

      {products.map((product, index) => (
        <ProductForm
          key={index} // Considers a more stable unique key if available/needed
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