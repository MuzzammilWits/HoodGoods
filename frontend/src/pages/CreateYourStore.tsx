import React, { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import './CreateYourStore.css';

// Define product categories
const PRODUCT_CATEGORIES = [
  'Home & Living',
  'Jewellery & Accessories',
  'Clothing',
  'Bags & Purses',
  'Art',
  'Crafts & Collectibles',
  'Beauty & Wellness',
  'Kids & Baby',
  'Pet Goods',
  'Stationery & Paper Goods',
  'Food & Beverage',
  'Other'
];

// Interface for form data (image fields removed)
interface ProductFormData {
  productName: string;
  productDescription: string;
  productPrice: string;
  productCategory: string;
  // REMOVED: image: File | null;
  // REMOVED: imagePreview: string;
}

interface StoreFormData {
  storeName: string;
  products: ProductFormData[];
}

const CreateYourStore: React.FC = () => {
  const { loginWithRedirect, isAuthenticated } = useAuth0();
  const baseUrl = import.meta.env.VITE_BACKEND_URL;
  // Supabase variables REMOVED as they are commented out in .env and unused
  // const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  // const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const [checkingAuth, setCheckingAuth] = useState(true);

  // Check authentication using the token in sessionStorage
  useEffect(() => {
    const checkAuth = () => {
      const token = sessionStorage.getItem('access_token');
      if (!token && !isAuthenticated) {
        loginWithRedirect({
          appState: { returnTo: window.location.pathname }
        });
        return false;
      }
      return true;
    };
    const isAuthed = checkAuth();
    setCheckingAuth(!isAuthed);
  }, [loginWithRedirect, isAuthenticated]);

  // Initial state without image fields
  const [formData, setFormData] = useState<StoreFormData>({
    storeName: '',
    products: [
      {
        productName: '',
        productDescription: '',
        productPrice: '',
        productCategory: '',
        // REMOVED: image: null,
        // REMOVED: imagePreview: ''
      }
    ]
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Handle store name change
  const handleStoreNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      storeName: e.target.value
    });
  };

  // Handle product field changes
  const handleProductChange = (index: number, field: keyof ProductFormData, value: string) => {
    const updatedProducts = [...formData.products];
    updatedProducts[index] = {
      ...updatedProducts[index],
      [field]: value
    };
    setFormData({
      ...formData,
      products: updatedProducts
    });
  };

  // handleImageUpload function REMOVED
  // const handleImageUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => { /* ... */ };

  // Add another product (without image fields)
  const addProduct = () => {
    setFormData({
      ...formData,
      products: [
        ...formData.products,
        {
          productName: '',
          productDescription: '',
          productPrice: '',
          productCategory: '',
          // REMOVED: image: null,
          // REMOVED: imagePreview: ''
        }
      ]
    });
  };

  // Remove a product
  const removeProduct = (index: number) => {
    if (formData.products.length > 1) {
      const updatedProducts = formData.products.filter((_, i) => i !== index);
      setFormData({
        ...formData,
        products: updatedProducts
      });
    } else {
      // Update error message if needed
      setError("You need at least one product to create a store.");
    }
  };

  // uploadImageToSupabase function REMOVED
  // const uploadImageToSupabase = async (file: File, userId: string, productIndex: number): Promise<string> => { /* ... */ };

  // Submit the form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Validate form data (image check removed)
      if (!formData.storeName.trim()) {
        throw new Error('Store name is required');
      }

      for (let i = 0; i < formData.products.length; i++) {
        const product = formData.products[i];
        if (!product.productName.trim()) throw new Error(`Product ${i + 1} name is required`);
        if (!product.productDescription.trim()) throw new Error(`Product ${i + 1} description is required`);
        if (!product.productPrice.trim() || isNaN(parseFloat(product.productPrice))) throw new Error(`Product ${i + 1} needs a valid price`);
        if (!product.productCategory) throw new Error(`Product ${i + 1} category is required`);
        // Image check REMOVED
        // if (!product.image) throw new Error(`Product ${i + 1} image is required`);
      }

      const token = sessionStorage.getItem('access_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // First, promote user to seller
      const promoteResponse = await fetch(`${baseUrl}/auth/promote-to-seller`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!promoteResponse.ok) {
          // Handle potential errors from promotion, e.g., already a seller
          const errorData = await promoteResponse.json();
          console.warn('Promotion to seller might have failed or was redundant:', errorData);
          // Decide if this is a critical error or can be ignored
          // For now, let's assume it's not critical if the user is already a seller
          if (promoteResponse.status !== 400) { // Example: Allow 400 Bad Request (maybe 'already seller')
             throw new Error(`Failed to ensure seller status: ${errorData.message || promoteResponse.statusText}`);
          }
      }

      // User info fetch for userId REMOVED as Supabase upload is gone.
      // If userId is needed elsewhere later, re-add this block.
      // const userInfoResponse = await fetch(`${baseUrl}/auth/me`, { /* ... */ });
      // const userInfo = await userInfoResponse.json();
      // const userId = userInfo.sub; 

      // Create store with product data (no image upload or imageURL)
      const storeData = {
        storeName: formData.storeName,
        // Removed Promise.all as image uploads are gone
        products: formData.products.map((product) => {
          // Image upload call REMOVED
          // const imageURL = await uploadImageToSupabase(product.image!, userId, index);
          
          return {
            productName: product.productName,
            productDescription: product.productDescription,
            productPrice: parseFloat(product.productPrice), // Ensure price is number
            productCategory: product.productCategory,
            // imageURL property REMOVED
            // imageURL: imageURL,
            storeName: formData.storeName // Send storeName if backend product DTO needs it
          };
        })
      };

      // Send the store data to backend (expects no imageURL now)
      const createStoreResponse = await fetch(`${baseUrl}/stores`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(storeData),
      });

      if (!createStoreResponse.ok) {
        const errorData = await createStoreResponse.json();
        throw new Error(`Failed to create store: ${errorData.message || createStoreResponse.statusText}`);
      }

      setSuccess('Your store has been created successfully!');
      
      // Clear the session flag for becoming a seller
      sessionStorage.removeItem('clicked_become_seller');
      
      // Redirect after a short delay
      setTimeout(() => {
        window.location.href = '/my-store';
      }, 2000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      console.error("Error during store creation:", err); // Log error details
    } finally {
      setIsSubmitting(false);
    }
  };

  // Authentication check rendering
  if (checkingAuth) {
    return <div className="loading-container">Checking authentication...</div>;
  }

  // JSX Structure
  return (
    <div className="create-store-container">
      <h1>Create Your Artisan Store</h1>
      <p className="instructions">
        Set up your store information and add at least one product to get started.
      </p>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <form onSubmit={handleSubmit}>
        <div className="store-info-section">
          <h2>Store Information</h2>
          <div className="form-group">
            <label htmlFor="storeName">Store Name</label>
            <input
              type="text"
              id="storeName"
              value={formData.storeName}
              onChange={handleStoreNameChange}
              placeholder="Enter your store name"
              required
            />
          </div>
        </div>

        <h2>Products</h2>
        <p>Add at least one product to start your store.</p>

        {formData.products.map((product, index) => (
          <div key={index} className="product-section">
            <h3>Product #{index + 1}</h3>
            
            <div className="form-group">
              <label htmlFor={`product-name-${index}`}>Product Name</label>
              <input
                type="text"
                id={`product-name-${index}`}
                value={product.productName}
                onChange={(e) => handleProductChange(index, 'productName', e.target.value)}
                placeholder="Enter product name"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor={`product-description-${index}`}>Description</label>
              <textarea
                id={`product-description-${index}`}
                value={product.productDescription}
                onChange={(e) => handleProductChange(index, 'productDescription', e.target.value)}
                placeholder="Describe your product..."
                rows={4}
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor={`product-price-${index}`}>Price ($)</label>
                <input
                  type="number"
                  id={`product-price-${index}`}
                  value={product.productPrice}
                  onChange={(e) => handleProductChange(index, 'productPrice', e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  min="0.01"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor={`product-category-${index}`}>Category</label>
                <select
                  id={`product-category-${index}`}
                  value={product.productCategory}
                  onChange={(e) => handleProductChange(index, 'productCategory', e.target.value)}
                  required
                >
                  <option value="">Select a category</option>
                  {PRODUCT_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Image input and preview section REMOVED */}
            {/* <div className="form-group">
              <label htmlFor={`product-image-${index}`}>Product Image</label>
              <input type="file" ... />
              {product.imagePreview && <div className="image-preview">...</div>}
            </div> */}

            {formData.products.length > 1 && (
              <button 
                type="button" 
                className="remove-product-btn" 
                onClick={() => removeProduct(index)}
              >
                Remove Product
              </button>
            )}
          </div>
        ))}

        <button 
          type="button" 
          className="add-product-btn" 
          onClick={addProduct}
        >
          + Add Another Product
        </button>

        <div className="actions">
          <button
            type="submit"
            className="create-store-btn"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating Store...' : 'Create Your Store'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateYourStore;