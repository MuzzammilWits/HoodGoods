import React, { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import './MyStore.css';

// Define interfaces for store data (imageURL removed from Product)
interface Product {
  productID: number;
  productName: string;
  productDescription: string;
  productPrice: number;
  productCategory: string;
  // REMOVED: imageURL: string;
}

interface Store {
  storeName: string;
  products: Product[]; // Now uses Product interface without imageURL
}

const MyStore: React.FC = () => {
  const { loginWithRedirect, isAuthenticated } = useAuth0();
  const baseUrl = import.meta.env.VITE_BACKEND_URL;
  // Supabase variables REMOVED
  // const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  // const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  
  // Initial state for new product (without imageURL)
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    productName: '',
    productDescription: '',
    productPrice: 0,
    productCategory: '',
    // REMOVED: imageURL: ''
  });
  
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  // Image state REMOVED
  // const [productImage, setProductImage] = useState<File | null>(null);
  // const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Categories for dropdown
  const PRODUCT_CATEGORIES = [
    'Home & Living', 'Jewellery & Accessories', 'Clothing', 'Bags & Purses', 
    'Art', 'Crafts & Collectibles', 'Beauty & Wellness', 'Kids & Baby', 
    'Pet Goods', 'Stationery & Paper Goods', 'Food & Beverage', 'Other'
  ];

  // Check authentication using the token in sessionStorage
  useEffect(() => {
    const checkAuth = () => {
      const token = sessionStorage.getItem('access_token');
      if (!token && !isAuthenticated) {
        loginWithRedirect({ appState: { returnTo: window.location.pathname } });
        return false;
      }
      return true;
    };

    const isAuthed = checkAuth();
    setCheckingAuth(!isAuthed);
    
    if (isAuthed) {
      fetchStoreData();
    }
  }, [loginWithRedirect, isAuthenticated]); // Removed fetchStoreData from deps array to avoid potential loops if it wasn't memoized

  const fetchStoreData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = sessionStorage.getItem('access_token');
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      const response = await fetch(`${baseUrl}/stores/my-store`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        if (response.status === 404) {
          // Store not found - redirect to create store page
          window.location.href = '/create-store';
          return;
        }
        const errorData = await response.json();
        throw new Error(`Failed to fetch store data: ${errorData.message || response.statusText}`);
      }

      const storeData = await response.json();
      setStore(storeData); // Backend now returns data without imageURL
    } catch (err) {
      console.error('Error fetching store data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load your store. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleNewProductChange = (field: string, value: string | number) => {
    setNewProduct(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // handleImageUpload function REMOVED
  // const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => { /* ... */ };

  // uploadImageToSupabase function REMOVED
  // const uploadImageToSupabase = async (file: File, userId: string): Promise<string> => { /* ... */ };

  const handleAddProduct = async () => {
    if (!store) return;
    
    try {
      setError(null);
      
      // Validate form (image check removed)
      if (!newProduct.productName || !newProduct.productDescription || !newProduct.productPrice || !newProduct.productCategory) {
        setError('Please fill in all product fields'); // Updated message
        return;
      }

      const token = sessionStorage.getItem('access_token');
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      // Image upload logic REMOVED
      // const userInfoResponse = await fetch(...);
      // const userInfo = await userInfoResponse.json();
      // const userId = userInfo.sub;
      // const imageURL = await uploadImageToSupabase(productImage!, userId);

      // Add product to the store (without imageURL)
      const response = await fetch(`${baseUrl}/stores/products`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newProduct,
          // imageURL property REMOVED
          // imageURL,
          storeName: store.storeName // Ensure backend service/DTO expects this if needed
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to add product: ${errorData.message || response.statusText}`);
      }

      // Refresh store data to show the new product
      fetchStoreData(); // Call fetchStoreData to update the list
      
      // Reset the form (image state reset removed)
      setNewProduct({
        productName: '', productDescription: '', productPrice: 0, productCategory: '',
        // REMOVED: imageURL: ''
      });
      // REMOVED: setProductImage(null);
      // REMOVED: setImagePreview(null);
      setIsAddingProduct(false);
    } catch (err) {
      console.error('Error adding product:', err);
      setError(err instanceof Error ? err.message : 'Failed to add product. Please try again.');
    }
  };

  // --- Render Logic ---

  if (checkingAuth) {
    return <div className="loading-container">Checking authentication...</div>;
  }

  if (loading) {
    return <div className="loading">Loading your store...</div>;
  }

  if (error && !store) {
    return (
      <div className="store-error">
        <h2>Error</h2>
        <p>{error}</p>
        <button onClick={fetchStoreData}>Try Again</button>
      </div>
    );
  }

  // Handle case where fetch was successful but no store exists (e.g., after redirect from 404)
  // This might overlap with the 404 redirect logic, review if needed
  if (!store) {
    return (
      <div className="no-store">
        <h2>No Store Found</h2>
        <p>You don't seem to have a store yet.</p>
        <a href="/create-store" className="create-store-link">Create Your Store</a>
      </div>
    );
  }

  // --- JSX Structure ---
  return (
    <div className="my-store-container">
      <div className="store-header">
        <h1>{store.storeName}</h1>
        <button 
          className="add-product-button"
          onClick={() => setIsAddingProduct(true)}
        >
          Add New Product
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Add Product Form */}
      {isAddingProduct && (
        <div className="add-product-form">
          <h2>Add New Product</h2>
          
          <div className="form-group">
            <label htmlFor="product-name">Product Name</label>
            <input
              type="text"
              id="product-name"
              value={newProduct.productName || ''}
              onChange={(e) => handleNewProductChange('productName', e.target.value)}
              placeholder="Enter product name"
            />
          </div>

          <div className="form-group">
            <label htmlFor="product-description">Description</label>
            <textarea
              id="product-description"
              value={newProduct.productDescription || ''}
              onChange={(e) => handleNewProductChange('productDescription', e.target.value)}
              placeholder="Describe your product..."
              rows={4}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="product-price">Price ($)</label>
              <input
                type="number"
                id="product-price"
                value={newProduct.productPrice || 0}
                onChange={(e) => handleNewProductChange('productPrice', parseFloat(e.target.value) || 0)}
                step="0.01"
                min="0.01"
              />
            </div>

            <div className="form-group">
              <label htmlFor="product-category">Category</label>
              <select
                id="product-category"
                value={newProduct.productCategory || ''}
                onChange={(e) => handleNewProductChange('productCategory', e.target.value)}
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

          {/* Image Input and Preview REMOVED */}
          {/* <div className="form-group">
            <label htmlFor="product-image">Product Image</label>
            <input type="file" ... />
            {imagePreview && <div className="image-preview">...</div>}
          </div> */}

          <div className="form-actions">
            <button 
              className="cancel-button"
              onClick={() => {
                setIsAddingProduct(false);
                setNewProduct({ productName: '', productDescription: '', productPrice: 0, productCategory: '' });
                // Image state reset REMOVED
                // setProductImage(null);
                // setImagePreview(null);
              }}
            >
              Cancel
            </button>
            <button 
              className="submit-button"
              onClick={handleAddProduct}
            >
              Add Product
            </button>
          </div>
        </div>
      )}

      {/* Products Display Section */}
      <div className="products-section">
        <h2>Your Products</h2>
        
        {store.products.length === 0 ? (
          <div className="no-products">
            <p>You don't have any products in your store yet.</p>
            {!isAddingProduct && (
              <button 
                onClick={() => setIsAddingProduct(true)}
                className="add-first-product"
              >
                Add Your First Product
              </button>
            )}
          </div>
        ) : (
          <div className="products-grid">
            {store.products.map((product) => (
              <div key={product.productID} className="product-card">
                {/* Product Image Display REMOVED - Placeholder Added */}
                {/* <div className="product-image">
                  <img src={product.imageURL} alt={product.productName} />
                </div> */}
                <div className="product-image-placeholder"> 
                  <span>No Image Available</span> {/* Style this class in CSS */}
                </div>
                
                <div className="product-details">
                  <h3>{product.productName}</h3>
                  <p className="product-price">${product.productPrice.toFixed(2)}</p>
                  <p className="product-category">{product.productCategory}</p>
                  <p className="product-description">{product.productDescription}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyStore;