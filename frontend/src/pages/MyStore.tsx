import React, { useState, useEffect, useCallback, useRef } from 'react'; // Added useRef
import { useAuth0 } from '@auth0/auth0-react';
import './MyStore.css'; // Make sure this includes modal and button styles
import { CreateProductDto } from '../../../backend/src/store/dto/create-product.dto'; // Corrected import path

// --- UPDATE Product interface ---
interface Product {
  productID: number;
  productName: string;
  productDescription: string;
  productPrice: number;
  productCategory: string;
  imageURL?: string | null; // Add imageURL (optional/nullable)
}
// --- END UPDATE ---

interface Store {
  storeName: string;
  products: Product[];
}

// Type for editable fields (excluding ID)
// Add imageURL here if you plan to allow editing it later
type EditableProductFields = Omit<Product, 'productID' | 'imageURL'>; // Exclude imageURL for now

// Type for new product fields (MUST include image handling)
type NewProductFields = Partial<Omit<Product, 'productID'>> & { imageFile?: File | null };


const MyStore: React.FC = () => {
  const { loginWithRedirect, isAuthenticated, getAccessTokenSilently } = useAuth0();
  const baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'; // Add fallback

  // --- State Variables ---
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loading, setLoading] = useState(true); // Loading store data
  const [store, setStore] = useState<Store | null>(null);
  const [error, setError] = useState<string | null>(null); // General fetch error
  const [actionError, setActionError] = useState<string | null>(null); // Errors from CRUD actions

  // --- UPDATE Add Product State ---
  const [isAddingProductFormVisible, setIsAddingProductFormVisible] = useState(false); // Control form visibility
  const [isAddingProductLoading, setIsAddingProductLoading] = useState(false); // Separate loading state for Add action
  const [newProduct, setNewProduct] = useState<NewProductFields>({ // Use the new type
    productName: '', productDescription: '', productPrice: 0, productCategory: '', imageFile: null, imageURL: ''
  });
  const fileInputRef = useRef<HTMLInputElement>(null); // Ref for the file input
  // --- END UPDATE ---


  // Edit Product State (remains mostly the same, no image edit for now)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<EditableProductFields>>({});
  const [isSavingEdit, setIsSavingEdit] = useState(false); // Loading state for edit save

  // Delete Product State
  const [deletingProductId, setDeletingProductId] = useState<number | null>(null);

  // --- Constants ---
  const PRODUCT_CATEGORIES = [ /* ... categories ... */
      'Home & Living', 'Jewellery & Accessories', 'Clothing', 'Bags & Purses',
      'Art', 'Crafts & Collectibles', 'Beauty & Wellness', 'Kids & Baby',
      'Pet Goods', 'Stationery & Paper Goods', 'Food & Beverage', 'Other'
  ];


  // --- Utility Functions ---
  const getToken = useCallback(async () => { /* ... getToken logic ... */
    try {
         const token = await getAccessTokenSilently();
         sessionStorage.setItem('access_token', token);
         return token;
     } catch (e) {
         console.error("Error getting access token silently", e);
         loginWithRedirect({ appState: { returnTo: window.location.pathname } });
         return null;
     }
  }, [getAccessTokenSilently, loginWithRedirect]);

   // --- Add Image Upload Helper (similar to CreateYourStore) ---
   const uploadImageToBackend = async (file: File, token: string): Promise<string> => {
    const imgFormData = new FormData();
    imgFormData.append('file', file);

    const res = await fetch(`${baseUrl}/upload/image`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
        body: imgFormData,
    });

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Failed to parse upload error response' }));
        console.error("Image upload failed:", errorData);
        throw new Error(`Failed to upload image ${file.name}: ${errorData.message || res.statusText}`);
    }
    const data = await res.json();
    if (!data.url) {
        console.error("Image upload response missing URL:", data);
        throw new Error(`Image upload for ${file.name} succeeded but response did not contain a URL.`);
    }
    console.log(`Image ${file.name} uploaded, URL:`, data.url);
    return data.url;
  };
  // --- End Image Upload Helper ---


  // --- Data Fetching (fetchStoreData - no changes needed) ---
  const fetchStoreData = useCallback(async (currentToken?: string) => { /* ... fetchStoreData logic ... */
      console.log("Attempting to fetch store data...");
      setLoading(true);
      setError(null);
      setActionError(null);

      const token = currentToken || sessionStorage.getItem('access_token') || await getToken();
      if (!token) {
          setError("Authentication required to view store.");
          setLoading(false);
          setCheckingAuth(false);
          console.error("No token available for fetching data.");
          return;
      }

      try {
          const response = await fetch(`${baseUrl}/stores/my-store`, {
              headers: { 'Authorization': `Bearer ${token}` },
          });

          if (!response.ok) {
              if (response.status === 404) {
                  console.log("Store not found (404), redirecting to create-store.");
                  window.location.href = '/create-store';
                  return;
              }
              const errorData = await response.json().catch(() => ({ message: response.statusText }));
              throw new Error(`Failed to fetch store data: ${errorData.message || response.statusText} (Status: ${response.status})`);
          }

          const storeData: Store = await response.json();
          console.log("Store data successfully fetched:", storeData); // Check if imageURL is present
          setStore(storeData);
      } catch (err) {
          console.error('Error during fetchStoreData:', err);
          setError(err instanceof Error ? err.message : 'An unknown error occurred while loading your store.');
          setStore(null);
      } finally {
          setLoading(false);
          setCheckingAuth(false);
      }
  }, [baseUrl, getToken]);

  // --- Authentication and Initial Load Effect (no changes needed) ---
  useEffect(() => { /* ... checkAuthAndLoad logic ... */
      const checkAuthAndLoad = async () => {
            setCheckingAuth(true);
            const sessionToken = sessionStorage.getItem('access_token');

            if (!sessionToken && isAuthenticated) {
                 console.log("Auth0 authenticated, getting session token...");
                 const currentToken = await getToken();
                  if(currentToken) {
                       await fetchStoreData(currentToken);
                  } else {
                       setCheckingAuth(false);
                       setError("Could not retrieve authentication token.");
                  }
            } else if (sessionToken) {
                 console.log("Session token found, fetching data...");
                 await fetchStoreData(sessionToken);
            } else if (!sessionToken && !isAuthenticated) {
                  console.log("Not authenticated, redirecting to login...");
                  setCheckingAuth(false);
                  loginWithRedirect({ appState: { returnTo: window.location.pathname } });
            } else {
                 console.log("Auth state unclear, checking complete.");
                 setCheckingAuth(false);
            }
      };

      checkAuthAndLoad();
  }, [isAuthenticated, loginWithRedirect, getToken, fetchStoreData]); // Added fetchStoreData

  // --- CRUD Handlers ---

  // --- UPDATE Add Product Handlers ---
  const handleNewProductChange = (field: keyof Omit<NewProductFields, 'imageFile'>, value: string | number) => {
    setNewProduct(prev => ({ ...prev, [field]: value }));
  };

  const handleNewProductImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setNewProduct(prev => ({ ...prev, imageFile: file }));
     // Optional: Generate preview if needed
  };

  const handleAddProduct = async () => {
      if (!store) return;
      setActionError(null);

      // Validate required fields INCLUDING the image file
      if (!newProduct.productName || !newProduct.productDescription || !newProduct.productPrice || !newProduct.productCategory || !newProduct.imageFile) {
          setActionError('Please fill in all product fields and select an image.');
          return;
      }

      const token = sessionStorage.getItem('access_token') || await getToken();
      if (!token) { setActionError("Authentication required."); return; }

      setIsAddingProductLoading(true); // Use the specific loading state

      try {
          // 1. Upload the image
          console.log("Uploading new product image...");
          const imageUrl = await uploadImageToBackend(newProduct.imageFile, token);
          console.log("Image uploaded, URL:", imageUrl);

          // 2. Prepare product data with the URL
          const productDataToSend: CreateProductDto = {
              productName: newProduct.productName,
              productDescription: newProduct.productDescription,
              productPrice: newProduct.productPrice,
              productCategory: newProduct.productCategory,
              imageURL: imageUrl, // Use the URL from upload
              storeName: store.storeName // Add store name
          };

          // 3. Send data to backend to create product record
          console.log("Sending product data to backend:", productDataToSend);
          const response = await fetch(`${baseUrl}/stores/products`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify(productDataToSend),
          });

          if (!response.ok) {
              // Try to parse error, provide fallback
              const errorResponse = await response.json().catch(() => ({ message: `Request failed with status ${response.status}` }));
              throw new Error(errorResponse.message || `HTTP error ${response.status}`);
          }

          // 4. Success: Reset form, hide it, refresh data
          setIsAddingProductFormVisible(false); // Hide form
          setNewProduct({ productName: '', productDescription: '', productPrice: 0, productCategory: '', imageFile: null, imageURL: '' }); // Reset form state
          if (fileInputRef.current) { // Clear file input visually
             fileInputRef.current.value = "";
          }
          await fetchStoreData(token); // Refresh data

      } catch (err: any) {
          console.error('Error adding product:', err);
          setActionError(`Failed to add product: ${err.message || 'Unknown error'}`);
          // Keep form visible on error
      } finally {
          setIsAddingProductLoading(false); // Reset loading state
      }
  };
  // --- END UPDATE Add Product Handlers ---


  // Edit Product Handlers (remain the same, no image edit functionality yet)
  const openEditModal = (product: Product) => { /* ... openEditModal logic ... */
      setEditingProduct(product);
      setEditFormData({
          productName: product.productName,
          productDescription: product.productDescription,
          productPrice: product.productPrice,
          productCategory: product.productCategory,
      });
      setIsEditModalOpen(true);
      setActionError(null);
  };
  const closeEditModal = () => { /* ... closeEditModal logic ... */
      setIsEditModalOpen(false);
      setEditingProduct(null);
      setEditFormData({});
      setActionError(null);
      setIsSavingEdit(false);
  };
  const handleEditFormChange = (field: keyof EditableProductFields, value: string | number) => { /* ... handleEditFormChange logic ... */
       setEditFormData(prev => ({ ...prev, [field]: value }));
  };
  const handleUpdateProduct = async () => { /* ... handleUpdateProduct logic ... */
      if (!editingProduct) return;
      setActionError(null);
      setIsSavingEdit(true);

      const token = sessionStorage.getItem('access_token') || await getToken();
      if (!token) {
           setActionError("Authentication required.");
           setIsSavingEdit(false);
           return;
      }
      if (!editFormData.productName || !editFormData.productDescription || !editFormData.productPrice || !editFormData.productCategory) {
           setActionError('All fields are required during edit.');
           setIsSavingEdit(false);
           return;
      }

      try {
           const response = await fetch(`${baseUrl}/stores/products/${editingProduct.productID}`, {
               method: 'PATCH',
               headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
               body: JSON.stringify(editFormData),
           });
           if (!response.ok) { throw await response.json().catch(() => new Error(response.statusText)); }

           closeEditModal();
           await fetchStoreData(token);
       } catch (err: any) {
           console.error('Error updating product:', err);
           setActionError(`Failed to update product: ${err.message || 'Unknown error'}`);
       } finally {
            setIsSavingEdit(false);
       }
  };

  // Delete Product Handlers (remain the same)
  const handleDeleteClick = (productId: number) => { /* ... handleDeleteClick logic ... */
      if (window.confirm("Are you sure you want to delete this product? This action cannot be undone.")) {
           confirmDelete(productId);
       }
  };
  const confirmDelete = async (productId: number) => { /* ... confirmDelete logic ... */
      setDeletingProductId(productId);
      setActionError(null);
      const token = sessionStorage.getItem('access_token') || await getToken();
      if (!token) {
           setActionError("Authentication required.");
           setDeletingProductId(null);
           return;
      }
      try {
           const response = await fetch(`${baseUrl}/stores/products/${productId}`, {
               method: 'DELETE',
               headers: { 'Authorization': `Bearer ${token}` },
           });
           if (!response.ok && response.status !== 204) {
               throw await response.json().catch(() => new Error(response.statusText));
           }
           await fetchStoreData(token);
       } catch (err: any) {
           console.error('Error deleting product:', err);
           setActionError(`Failed to delete product: ${err.message || 'Unknown error'}`);
       } finally {
           setDeletingProductId(null);
       }
  };

  // --- Render Logic ---
  if (checkingAuth) { /* ... loading ... */ return <div className="loading-container">Checking Authentication...</div>; }
  if (loading) { /* ... loading ... */ return <div className="loading-container">Loading Your Store...</div>;}
  if (error) { /* ... error display ... */
      return (
          <div className="store-error">
              <h2>Error Loading Store</h2>
              <p>{error}</p>
              <button onClick={() => fetchStoreData()}>Try Again</button>
          </div>
      );
  }
  if (!store) { /* ... no store display ... */
       return (
           <div className="no-store">
               <h2>Store Not Found</h2>
               <p>Create your store to get started.</p>
               <a href="/create-store" className="create-store-link">Create Store</a>
           </div>
       );
  }

  // --- JSX ---
  return (
    <div className="my-store-container">
      {/* Header */}
      <div className="store-header">
        <h1>{store.storeName}</h1>
        {/* --- UPDATE Add Product Button --- */}
        <button
            className="add-product-button"
            onClick={() => { setIsAddingProductFormVisible(prev => !prev); setActionError(null); }} // Toggle form visibility
            disabled={isAddingProductLoading} // Disable while add is in progress
        >
            {isAddingProductFormVisible ? 'Cancel Add Product' : '+ Add Product'}
        </button>
        {/* --- END UPDATE --- */}
      </div>

      {/* Action Error Display Area (outside modals/forms) */}
      {actionError && !isEditModalOpen && !isAddingProductFormVisible && <div className="error-message action-error">{actionError}</div>}

      {/* --- UPDATE Add Product Form --- */}
      {isAddingProductFormVisible && (
        <div className="add-product-form">
          <h2>Add New Product</h2>
           {/* Display error specific to add action here */}
           {actionError && <div className="error-message action-error">{actionError}</div>}

          <div className="form-group"><label>Name:</label><input type="text" value={newProduct.productName || ''} onChange={(e) => handleNewProductChange('productName', e.target.value)} disabled={isAddingProductLoading} /></div>
          <div className="form-group"><label>Description:</label><textarea value={newProduct.productDescription || ''} onChange={(e) => handleNewProductChange('productDescription', e.target.value)} disabled={isAddingProductLoading}/></div>
          <div className="form-row">
              <div className="form-group"><label>Price (R):</label><input type="number" step="0.01" min="0.01" value={newProduct.productPrice || ''} onChange={(e) => handleNewProductChange('productPrice', parseFloat(e.target.value) || 0)} disabled={isAddingProductLoading}/></div>
              <div className="form-group"><label>Category:</label><select value={newProduct.productCategory || ''} onChange={(e) => handleNewProductChange('productCategory', e.target.value)} disabled={isAddingProductLoading}> <option value="">Select</option> {PRODUCT_CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
          </div>
          {/* Image Input */}
          <div className="form-group">
              <label htmlFor="new-product-image">Image *</label>
              <input
                  id="new-product-image"
                  type="file"
                  accept="image/png, image/jpeg, image/webp, image/gif"
                  onChange={handleNewProductImageChange}
                  ref={fileInputRef} // Assign ref
                  required
                  disabled={isAddingProductLoading}
              />
              {/* Optional Preview */}
              {newProduct.imageFile && <img src={URL.createObjectURL(newProduct.imageFile)} alt="Preview" style={{maxWidth: '100px', marginTop: '10px'}}/>}
          </div>

          <div className="form-actions">
            <button type="button" className="cancel-button" onClick={() => setIsAddingProductFormVisible(false)} disabled={isAddingProductLoading}>Cancel</button>
            <button type="button" className="submit-button" onClick={handleAddProduct} disabled={isAddingProductLoading}>
                {isAddingProductLoading ? 'Adding...' : 'Add Product'}
            </button>
          </div>
        </div>
      )}
      {/* --- END UPDATE Add Product Form --- */}


      {/* Product List */}
      <div className="products-section">
        <h2>Your Products</h2>
        {(store.products && store.products.length > 0) ? (
          <div className="products-grid">
            {store.products.map((product) => (
              <div key={product.productID} className="product-card">
                {/* --- UPDATE Image Display --- */}
                {product.imageURL ? (
                    <img src={product.imageURL} alt={product.productName} className="product-image" onError={(e) => (e.currentTarget.src = '/placeholder-image.png')} /* Optional: fallback image */ />
                ) : (
                    <div className="product-image-placeholder"><span>No Image</span></div>
                )}
                {/* --- END UPDATE --- */}
                <div className="product-details">
                  <h3>{product.productName}</h3>
                  <p className="product-price">R{product.productPrice.toFixed(2)}</p>
                  <p className="product-category">{product.productCategory}</p>
                  <p className="product-description">{product.productDescription}</p>
                  <div className="product-actions">
                    <button className="edit-button" onClick={() => openEditModal(product)} disabled={deletingProductId !== null}>Edit</button>
                    <button
                      className="delete-button"
                      onClick={() => handleDeleteClick(product.productID)}
                      disabled={deletingProductId === product.productID}
                    >
                      {deletingProductId === product.productID ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-products">
            <p>You haven't added any products yet.</p>
            {!isAddingProductFormVisible && <button onClick={() => setIsAddingProductFormVisible(true)}>Add Your First Product</button>}
          </div>
        )}
      </div>

      {/* Edit Product Modal (JSX remains the same, functionality unchanged for image) */}
      {isEditModalOpen && editingProduct && ( /* ... modal jsx ... */
          <div className="modal-backdrop">
                <div className="modal-content">
                    <h2>Edit Product: {editingProduct.productName}</h2>
                    {actionError && <div className="error-message modal-error">{actionError}</div>}
                     <div className="form-group"><label>Name:</label><input type="text" value={editFormData.productName || ''} onChange={(e) => handleEditFormChange('productName', e.target.value)} disabled={isSavingEdit}/></div>
                     <div className="form-group"><label>Description:</label><textarea value={editFormData.productDescription || ''} onChange={(e) => handleEditFormChange('productDescription', e.target.value)} disabled={isSavingEdit}/></div>
                     <div className="form-row">
                        <div className="form-group"><label>Price (R):</label><input type="number" step="0.01" min="0.01" value={editFormData.productPrice || ''} onChange={(e) => handleEditFormChange('productPrice', parseFloat(e.target.value) || 0)} disabled={isSavingEdit}/></div>
                        <div className="form-group"><label>Category:</label><select value={editFormData.productCategory || ''} onChange={(e) => handleEditFormChange('productCategory', e.target.value)} disabled={isSavingEdit}> <option value="">Select</option> {PRODUCT_CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
                     </div>
                     {/* TODO: Add Image Edit Input Here if needed in future */}
                    <div className="form-actions modal-actions">
                        <button className="cancel-button" onClick={closeEditModal} disabled={isSavingEdit}>Cancel</button>
                        <button className="submit-button" onClick={handleUpdateProduct} disabled={isSavingEdit}>
                             {isSavingEdit ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>
          </div>
       )}
    </div> // end my-store-container
  );
};

export default MyStore;