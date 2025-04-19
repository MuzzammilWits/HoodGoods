// frontend/src/components/CreateYourStore.tsx
import React, { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import './CreateYourStore.css';
import supabase from '../supabaseClient'; // adjust path if needed

// Define product categories (assuming this is correct)
const PRODUCT_CATEGORIES = [
  'Home & Living', 'Jewellery & Accessories', 'Clothing', 'Bags & Purses',
  'Art', 'Crafts & Collectibles', 'Beauty & Wellness', 'Kids & Baby',
  'Pet Goods', 'Stationery & Paper Goods', 'Food & Beverage', 'Other'
];

// Interface for form data
interface ProductFormData {
  productName: string;
  productDescription: string;
  productPrice: string;
  productCategory: string;
  image: File | null; // Keep the File object in state
  imagePreview: string; // For the preview
  imageURL?: string; // To store the URL *after* upload
}

interface StoreFormData {
  storeName: string;
  products: ProductFormData[];
}

const CreateYourStore: React.FC = () => {
  const { loginWithRedirect, isAuthenticated } = useAuth0();
  const baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'; // Provide a fallback

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);

  // --- Authentication and Gallery useEffects (Keep as they are) ---
  useEffect(() => {
    const fetchImages = async () => {
      // Your existing fetchImages logic...
        const { data, error } = await supabase.storage.from('images').list('uploads', {
            limit: 100,
            sortBy: { column: 'created_at', order: 'desc' }
        });

        if (error) {
            console.error('Error fetching images:', error.message);
            return;
        }

        const urls = data?.map((file: { name: any; }) =>
            supabase.storage.from('images').getPublicUrl(`uploads/${file.name}`).data.publicUrl
        ) || [];

        setGalleryImages(urls);
    };
    fetchImages();
  }, []);


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

  // Initial state
  const [formData, setFormData] = useState<StoreFormData>({
    storeName: '',
    products: [
      {
        productName: '', productDescription: '', productPrice: '',
        productCategory: '', image: null, imagePreview: ''
      }
    ]
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Handle store name change
  const handleStoreNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, storeName: e.target.value });
  };

  // Handle product field changes (excluding image)
  const handleProductChange = (index: number, field: keyof Omit<ProductFormData, 'image' | 'imagePreview' | 'imageURL'>, value: string) => {
    const updatedProducts = [...formData.products];
    updatedProducts[index] = { ...updatedProducts[index], [field]: value };
    setFormData({ ...formData, products: updatedProducts });
  };

  // Handle image selection and preview generation
  const handleImageUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
        // Clear image if file selection is cancelled
        const updatedProducts = [...formData.products];
        updatedProducts[index].image = null;
        updatedProducts[index].imagePreview = '';
        updatedProducts[index].imageURL = undefined; // Also clear any previously uploaded URL if re-selecting
        setFormData({ ...formData, products: updatedProducts });
        return;
    };

    const reader = new FileReader();
    reader.onloadend = () => {
      const updatedProducts = [...formData.products];
      updatedProducts[index].image = file; // Store the File object
      updatedProducts[index].imagePreview = reader.result as string; // Store the Data URL for preview
      updatedProducts[index].imageURL = undefined; // Clear any old URL before new upload attempt
      setFormData({ ...formData, products: updatedProducts });
    };
    reader.readAsDataURL(file); // Generate preview
  };

  // Add another product
  const addProduct = () => {
    setFormData({
      ...formData,
      products: [
        ...formData.products,
        { // Reset new product fields
          productName: '', productDescription: '', productPrice: '',
          productCategory: '', image: null, imagePreview: ''
        }
      ]
    });
  };

  // Remove a product
  const removeProduct = (index: number) => {
    if (formData.products.length > 1) {
      const updatedProducts = formData.products.filter((_, i) => i !== index);
      setFormData({ ...formData, products: updatedProducts });
    } else {
      setError("You need at least one product to create a store.");
       // Optionally clear the error after a few seconds
       setTimeout(() => setError(null), 3000);
    }
  };

  // --- Helper function to upload a single image ---
  const uploadImageToBackend = async (file: File, token: string): Promise<string> => {
    const imgFormData = new FormData();
    imgFormData.append('file', file); // Key must match backend (@UploadedFile('file'))

    const res = await fetch(`${baseUrl}/upload/image`, { // Use your dedicated image upload route
      method: 'POST',
      headers: {
        // Don't set 'Content-Type': 'multipart/form-data', browser does it better with boundary
        'Authorization': `Bearer ${token}`, // Add auth if your upload endpoint needs it
      },
      body: imgFormData,
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to parse upload error response' })); // Handle cases where response isn't JSON
      console.error("Image upload failed:", errorData);
      throw new Error(`Failed to upload image ${file.name}: ${errorData.message || res.statusText}`);
    }

    const data = await res.json();
    if (!data.url) {
        console.error("Image upload response missing URL:", data);
        throw new Error(`Image upload for ${file.name} succeeded but response did not contain a URL.`);
    }
    console.log(`Image ${file.name} uploaded, URL:`, data.url); // Log success
    return data.url; // Assuming backend returns { url: '...' }
  };


  // Submit the form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    const token = sessionStorage.getItem('access_token');
    if (!token) {
      setError('Authentication error. Please log in again.');
      setIsSubmitting(false);
      // Optionally redirect to login
      // loginWithRedirect({ appState: { returnTo: window.location.pathname } });
      return;
    }

    try {
      // --- 1. Validate form data ---
      if (!formData.storeName.trim()) throw new Error('Store name is required');
      if (formData.products.length === 0) throw new Error('At least one product is required');

      for (let i = 0; i < formData.products.length; i++) {
        const product = formData.products[i];
        if (!product.productName.trim()) throw new Error(`Product #${i + 1} name is required`);
        if (!product.productDescription.trim()) throw new Error(`Product #${i + 1} description is required`);
        if (!product.productPrice.trim() || isNaN(parseFloat(product.productPrice))) throw new Error(`Product #${i + 1} needs a valid price`);
        if (!product.productCategory) throw new Error(`Product #${i + 1} category is required`);
        // Require an image for each product
        if (!product.image) throw new Error(`Product #${i + 1} image is required`);
      }

      // --- 2. Promote user (optional, keep if needed) ---
      const promoteResponse = await fetch(`${baseUrl}/auth/promote-to-seller`, {
          method: 'PATCH',
          headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!promoteResponse.ok && promoteResponse.status !== 400) { // Allow 400 (e.g., already seller)
          const errorData = await promoteResponse.json().catch(() => ({ message: 'Failed to parse promotion error' }));
          console.warn('Promotion to seller might have failed:', errorData);
          // Decide if this is critical
          // throw new Error(`Failed to ensure seller status: ${errorData.message || promoteResponse.statusText}`);
      } else if (promoteResponse.ok) {
          console.log("User promoted to seller (or already was).");
      } else {
           console.log("User was already a seller (status 400 assumed).");
      }


      // --- 3. Upload Images ---
      console.log("Starting image uploads...");
      const productsWithImageUrls = await Promise.all(
        formData.products.map(async (product, index) => {
          if (product.image) {
            console.log(`Uploading image for product ${index + 1}: ${product.image.name}`);
            try {
              const imageURL = await uploadImageToBackend(product.image, token);
              return { ...product, imageURL }; // Return product data with the new URL
            } catch(uploadError) {
                // Log the specific error from uploadImageToBackend
                console.error(`Error uploading image for product #${index + 1}:`, uploadError);
                // Re-throw the error to stop the Promise.all and the submission
                throw new Error(`Failed to upload image for product "${product.productName || `Product #${index + 1}`}". ${uploadError instanceof Error ? uploadError.message : 'Unknown upload error'}`);
            }
          } else {
             // This case should be caught by validation earlier if image is required
             console.warn(`Product #${index + 1} has no image file selected.`);
             return { ...product, imageURL: undefined }; // Or handle as needed, maybe throw error
          }
        })
      );
      console.log("Image uploads completed.");

      // --- 4. Prepare Store Data for Backend ---
      const storeData = {
        storeName: formData.storeName,
        products: productsWithImageUrls.map(product => ({
          productName: product.productName,
          productDescription: product.productDescription,
          productPrice: parseFloat(product.productPrice), // Ensure price is number
          productCategory: product.productCategory,
          imageURL: product.imageURL, // Send the URL received from the backend
          // Add storeName only if your backend Product DTO needs it explicitly here
          // storeName: formData.storeName
        })),
      };

      // --- 5. Create Store via Backend ---
      console.log("Sending store data to backend:", JSON.stringify(storeData, null, 2)); // Log the data being sent
      const createStoreResponse = await fetch(`${baseUrl}/stores`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(storeData),
      });

      if (!createStoreResponse.ok) {
        const errorData = await createStoreResponse.json().catch(() => ({ message: 'Failed to parse store creation error response' }));
        console.error("Store creation failed:", errorData);
        throw new Error(`Failed to create store: ${errorData.message || createStoreResponse.statusText}`);
      }

      const createdStore = await createStoreResponse.json(); // Get response if needed
      console.log("Store created successfully:", createdStore);
      setSuccess('Your store has been created successfully!');

      // --- 6. Cleanup and Redirect ---
      sessionStorage.removeItem('clicked_become_seller');
      setTimeout(() => {
        window.location.href = '/my-store'; // Or wherever you want to redirect
      }, 2000);

    } catch (err) {
      console.error("Error during store creation process:", err); // Log the full error
      setError(err instanceof Error ? err.message : 'An unknown error occurred during store creation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Authentication check rendering
  if (checkingAuth) {
    return <div className="loading-container">Checking authentication...</div>;
  }

  // --- JSX Structure (Mostly unchanged, ensure image input calls handleImageUpload) ---
  return (
    <div className="create-store-container">
      <h1>Create Your Artisan Store</h1>
      <p className="instructions">
        Set up your store information and add your products below. An image is required for each product.
      </p>

      {/* Error/Success Messages */}
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {/* Image Gallery (Keep as is) */}
       {galleryImages.length > 0 && (
            <div className="image-gallery">
                <h2>Recently Uploaded Images (via Supabase)</h2>
                <div className="gallery-grid">
                {galleryImages.map((url, index) => (
                    <img key={index} src={url} alt={`Uploaded ${index}`} className="gallery-image" />
                ))}
                </div>
            </div>
        )}

      <form onSubmit={handleSubmit}>
        {/* Store Info Section (Keep as is) */}
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
                     disabled={isSubmitting}
                 />
             </div>
         </div>

        <h2>Products</h2>
        <p>Add at least one product. Ensure all fields are filled and an image is selected.</p>

        {formData.products.map((product, index) => (
          <div key={index} className="product-section">
            <h3>Product #{index + 1}</h3>

            {/* Product Name, Description, Price, Category (Keep as is, ensure disabled={isSubmitting}) */}
             <div className="form-group">
                 <label htmlFor={`product-name-${index}`}>Product Name</label>
                 <input
                     type="text"
                     id={`product-name-${index}`}
                     value={product.productName}
                     onChange={(e) => handleProductChange(index, 'productName', e.target.value)}
                     placeholder="Enter product name"
                     required
                     disabled={isSubmitting}
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
                     disabled={isSubmitting}
                 />
             </div>
              <div className="form-row">
                  <div className="form-group">
                      <label htmlFor={`product-price-${index}`}>Price (R)</label>
                      <input
                          type="number"
                          id={`product-price-${index}`}
                          value={product.productPrice}
                          onChange={(e) => handleProductChange(index, 'productPrice', e.target.value)}
                          placeholder="0.00"
                          step="0.01"
                          min="0.01"
                          required
                          disabled={isSubmitting}
                      />
                  </div>
                  <div className="form-group">
                      <label htmlFor={`product-category-${index}`}>Category</label>
                      <select
                          id={`product-category-${index}`}
                          value={product.productCategory}
                          onChange={(e) => handleProductChange(index, 'productCategory', e.target.value)}
                          required
                          disabled={isSubmitting}
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


            {/* --- Image Upload Section --- */}
            <div className="form-group">
              <label htmlFor={`product-image-${index}`}>Product Image *</label>
              <input
                type="file"
                id={`product-image-${index}`}
                accept="image/png, image/jpeg, image/webp, image/gif" // Be specific
                onChange={(e) => handleImageUpload(index, e)} // Correct handler
                required // Make the input itself required
                disabled={isSubmitting}
              />
              {product.imagePreview && (
                <div className="image-preview">
                  <img src={product.imagePreview} alt={`Preview for product ${index + 1}`} />
                </div>
              )}
               {!product.image && !product.imagePreview && <small>Please select an image.</small>}
            </div>
            {/* End Image Upload Section */}


            {/* Remove Button (Keep as is) */}
            {formData.products.length > 1 && (
                <button
                    type="button"
                    className="remove-product-btn"
                    onClick={() => removeProduct(index)}
                    disabled={isSubmitting}
                >
                    Remove Product
                </button>
            )}
          </div>
        ))}

         {/* Add Product Button (Keep as is) */}
         <button
             type="button"
             className="add-product-btn"
             onClick={addProduct}
             disabled={isSubmitting}
         >
             + Add Another Product
         </button>

        {/* Submit Button (Keep as is) */}
         <div className="actions">
             <button
                 type="submit"
                 className="create-store-btn"
                 disabled={isSubmitting || !formData.storeName || formData.products.some(p => !p.image)} // Basic check
             >
                 {isSubmitting ? 'Creating Store...' : 'Create Your Store'}
             </button>
         </div>
      </form>
    </div>
  );
};

export default CreateYourStore;