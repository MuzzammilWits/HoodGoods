import React from 'react';
// Ensure ProductFormData from this import includes 'productQuantity: string;'
import { ProductFormData } from '../types/createStore';

interface ProductFormProps {
  product: ProductFormData;
  index: number;
  productCategories: string[];
  // Ensure the keyof type includes 'productQuantity'
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
    // Using <section> which is semantic and not a div/span
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

      {/* Price, Quantity & Category Row */}
      {/* Using <article> which is semantic and not a div/span */}
      <article className="form-row">
        {/* Price Fieldset */}
        <fieldset className="form-group">
          <label htmlFor={`product-price-${index}`}>Price (R)</label>
          <input
            type="number"
            id={`product-price-${index}`}
            value={product.productPrice}
            onChange={(e) => onProductChange(index, 'productPrice', e.target.value)}
            placeholder="0.00"
            step="0.01"
            min="0.01" // Products usually have a price > 0
            required
            disabled={isSubmitting}
          />
        </fieldset>

        {/* --- Added Quantity Fieldset --- */}
        <fieldset className="form-group">
          <label htmlFor={`product-quantity-${index}`}>Quantity Available</label>
          <input
            type="number"
            id={`product-quantity-${index}`}
            value={product.productQuantity}
            onChange={(e) => onProductChange(index, 'productQuantity', e.target.value)}
            placeholder="0"
            step="1" // Whole numbers for quantity
            min="0"  // Quantity can be 0 or more
            required
            disabled={isSubmitting}
          />
        </fieldset>
        {/* --- End Added Quantity Fieldset --- */}

        {/* Category Fieldset */}
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
          required // Usually required, adjust if editing allows keeping old image
          disabled={isSubmitting}
        />
        {/* Using <figure> and <img> which are semantic */}
        {product.imagePreview && (
          <figure className="image-preview">
            <img src={product.imagePreview} alt={`Preview for product ${index + 1}`} />
          </figure>
        )}
         {/* Using <small> which is semantic */}
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