import React from 'react';
import { ProductFormData } from '../types/createStore';

interface ProductFormProps {
  product: ProductFormData;
  index: number;
  productCategories: string[];
  onProductChange: (index: number, field: keyof Omit<ProductFormData, 'image' | 'imagePreview' | 'imageURL'>, value: string) => void;
  onImageChange: (index: number, e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: (index: number) => void;
  isSubmitting: boolean;
  canRemove: boolean;
}

const ProductForm: React.FC<ProductFormProps> = ({
  product,
  index,
  productCategories,
  onProductChange,
  onImageChange,
  onRemove,
  isSubmitting,
  canRemove,
}) => {
  return (
    <section className="product-section">
      <h3>Product #{index + 1}</h3>

      {/* Product Name */}
      <fieldset className="form-group">
        <label htmlFor={`product-name-${index}`}>Product Name</label>
        <input
          type="text"
          id={`product-name-${index}`}
          value={product.productName}
          onChange={(e) => onProductChange(index, 'productName', e.target.value)}
          placeholder="Enter product name"
          required
          disabled={isSubmitting}
        />
      </fieldset>

      {/* Description */}
      <fieldset className="form-group">
        <label htmlFor={`product-description-${index}`}>Description</label>
        <textarea
          id={`product-description-${index}`}
          value={product.productDescription}
          onChange={(e) => onProductChange(index, 'productDescription', e.target.value)}
          placeholder="Describe your product..."
          rows={4}
          required
          disabled={isSubmitting}
        />
      </fieldset>

      {/* Price & Category Row */}
      <article className="form-row">
        <fieldset className="form-group">
          <label htmlFor={`product-price-${index}`}>Price (R)</label>
          <input
            type="number"
            id={`product-price-${index}`}
            value={product.productPrice}
            onChange={(e) => onProductChange(index, 'productPrice', e.target.value)}
            placeholder="0.00"
            step="0.01"
            min="0.01"
            required
            disabled={isSubmitting}
          />
        </fieldset>
        <fieldset className="form-group">
          <label htmlFor={`product-category-${index}`}>Category</label>
          <select
            id={`product-category-${index}`}
            value={product.productCategory}
            onChange={(e) => onProductChange(index, 'productCategory', e.target.value)}
            required
            disabled={isSubmitting}
          >
            <option value="">Select a category</option>
            {productCategories.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </fieldset>
      </article>

      {/* Image Upload */}
      <fieldset className="form-group">
        <label htmlFor={`product-image-${index}`}>Product Image *</label>
        <input
          type="file"
          id={`product-image-${index}`}
          accept="image/png, image/jpeg, image/webp, image/gif"
          onChange={(e) => onImageChange(index, e)}
          required
          disabled={isSubmitting}
        />
        {product.imagePreview && (
          <figure className="image-preview">
            <img src={product.imagePreview} alt={`Preview for product ${index + 1}`} />
          </figure>
        )}
        {!product.image && !product.imagePreview && <small>Please select an image.</small>}
      </fieldset>

      {/* Remove Button */}
      {canRemove && (
        <button
          type="button"
          className="remove-product-btn"
          onClick={() => onRemove(index)}
          disabled={isSubmitting}
        >
          Remove Product
        </button>
      )}
    </section>
  );
};

export default ProductForm;