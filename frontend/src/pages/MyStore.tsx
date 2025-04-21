// frontend/src/pages/MyStore.tsx
import React, { useState, useEffect, useCallback, useRef, ChangeEvent } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import './myStore.css';
// REMOVED incorrect backend DTO import

// --- Frontend Type Definitions (Matching Backend Structure) ---
// Type for the data structure expected when adding a product via POST /stores/products
interface AddProductPayload {
    name: string;
    description: string;
    price: number;
    category: string;
    imageUrl: string; // Correct key
    storeName?: string; // Optional, backend can infer if needed
}

// Type for the data structure expected when updating a product via PATCH /stores/products/:id
interface UpdateProductPayload {
    name?: string;
    description?: string;
    price?: number;
    category?: string;
    imageUrl?: string; // Correct key
}

// Frontend interface for a Product object (as received from GET /stores/my-store)
interface Product {
    prodId: number; // Assuming backend transforms prodId to productID for frontend
    name: string;           // Changed from productName
    description: string;    // Changed from productDescription
    price: number;          // Changed from productPrice
    category: string;       // Changed from productCategory
    imageUrl?: string | null; // Changed from imageURL
    // Add other fields if the backend sends them (e.g., isActive, storeName)
    storeName?: string;
    isActive?: boolean;
}

interface Store {
    storeName: string;
    products: Product[]; // Uses the updated Product interface
}

// Types for form state management
type EditableProductFields = Omit<Product, 'productID' | 'imageUrl' | 'storeName' | 'isActive'>; // Fields editable in the modal
type NewProductFields = Partial<Omit<Product, 'productID' | 'imageUrl' | 'storeName' | 'isActive'>> & {
    imageFile?: File | null;
    imagePreviewUrl?: string | null; // Separate state for preview URL
};

// --- Component ---
const MyStore: React.FC = () => {
    const { loginWithRedirect, isAuthenticated, getAccessTokenSilently } = useAuth0();
    const baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

    // --- State ---
    const [checkingAuth, setCheckingAuth] = useState(true);
    const [loading, setLoading] = useState(true);
    const [store, setStore] = useState<Store | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);

    // Add Product State
    const initialNewProductState: NewProductFields = { name: '', description: '', price: 0, category: '', imageFile: null, imagePreviewUrl: null };
    const [isAddingProductFormVisible, setIsAddingProductFormVisible] = useState(false);
    const [isAddingProductLoading, setIsAddingProductLoading] = useState(false);
    const [newProduct, setNewProduct] = useState<NewProductFields>(initialNewProductState);
    const addFileInputRef = useRef<HTMLInputElement>(null);

    // Edit Product State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [editFormData, setEditFormData] = useState<Partial<EditableProductFields>>({});
    const [editProductImage, setEditProductImage] = useState<File | null>(null);
    const [editProductPreview, setEditProductPreview] = useState<string>('');
    const [isSavingEdit, setIsSavingEdit] = useState(false);
    const editFileInputRef = useRef<HTMLInputElement>(null);

    // Delete Product State
    const [deletingProductId, setDeletingProductId] = useState<number | null>(null);

    // --- Constants ---
    const PRODUCT_CATEGORIES = [ /* ... same categories ... */
        'Home & Living', 'Jewellery & Accessories', 'Clothing', 'Bags & Purses', 'Art',
        'Crafts & Collectibles', 'Beauty & Wellness', 'Kids & Baby', 'Pet Goods',
        'Stationery & Paper Goods', 'Food & Beverage', 'Other'
    ];

    // --- Utility & Fetching ---
    const getToken = useCallback(async () => { /* ... same getToken ... */
      try {
          const token = await getAccessTokenSilently();
          sessionStorage.setItem('access_token', token);
          return token;
      } catch (e) {
          console.error("Error getting access token silently", e);
          // Avoid redirect loop if already trying to log in
          if (!window.location.search.includes('code=') && !window.location.search.includes('state=')) {
              loginWithRedirect({ appState: { returnTo: window.location.pathname } });
          }
          return null;
      }
    }, [getAccessTokenSilently, loginWithRedirect]);

    const uploadImageToBackend = async (file: File, token: string): Promise<string> => { /* ... same uploadImageToBackend ... */
        const imgFormData = new FormData();
        imgFormData.append('file', file);
        const res = await fetch(`${baseUrl}/upload/image`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: imgFormData,
        });
        if (!res.ok) {
            const errorData = await res.json().catch(() => ({ message: 'Failed to parse upload error' }));
            throw new Error(`Image upload failed: ${errorData.message || res.statusText}`);
        }
        const data = await res.json();
        if (!data.url) throw new Error(`Upload succeeded but response missing URL.`);
        console.log("Image uploaded, URL:", data.url);
        return data.url;
    };

    const fetchStoreData = useCallback(async (currentToken?: string) => { /* ... same fetchStoreData logic ... */
        console.log("Fetching store data...");
        setLoading(true); setError(null); setActionError(null);
        const token = currentToken || sessionStorage.getItem('access_token') || await getToken();
        if (!token) { setError("Authentication required to view store."); setLoading(false); setCheckingAuth(false); return; }
        try {
            const response = await fetch(`${baseUrl}/stores/my-store`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) {
                if (response.status === 404) { console.log("Store not found, redirecting to create store."); window.location.href = '/create-store'; return; }
                const errorData = await response.json().catch(() => ({ message: `Server error: ${response.statusText}` }));
                throw new Error(errorData.message || `Failed to fetch store data (${response.status})`);
            }
            // Expecting backend to return data matching the updated `Store` and `Product` interfaces
            const storeData: Store = await response.json();
            if (storeData && !storeData.products) { storeData.products = []; } // Ensure products array exists
            console.log("Fetched Store Data:", storeData); // Log fetched data to check structure
            setStore(storeData);
        } catch (err: any) {
            console.error('Error fetching store data:', err);
            setError(err.message || 'Failed to load store data.');
            setStore(null); // Clear potentially stale data on error
        }
        finally { setLoading(false); setCheckingAuth(false); }
    }, [baseUrl, getToken]); // Removed fetchStoreData from its own dependencies

    useEffect(() => { /* ... same auth check/load useEffect logic ... */
      const checkAuthAndLoad = async () => {
          console.log("Checking auth and loading store...");
          setCheckingAuth(true);
          const sessionToken = sessionStorage.getItem('access_token');

          if (isAuthenticated) { // If Auth0 says authenticated
              const currentToken = sessionToken || await getToken(); // Get token (from session or fresh)
              if (currentToken) {
                  await fetchStoreData(currentToken); // Fetch data
              } else {
                  // This case might happen if getToken fails despite isAuthenticated being true
                  console.error("Authenticated but failed to get token.");
                  setError("Authentication issue: Could not retrieve token.");
                  setCheckingAuth(false);
              }
          } else if (!sessionToken) { // Not authenticated by Auth0 AND no session token
              console.log("Not authenticated, redirecting to login.");
              // Avoid redirect loop if already on callback path
               if (!window.location.search.includes('code=') && !window.location.search.includes('state=')) {
                   loginWithRedirect({ appState: { returnTo: window.location.pathname } });
               } else {
                   // If we are on the callback path but somehow not authenticated, show loading/error
                   console.log("On callback path but not authenticated.");
                   setCheckingAuth(false); // Stop infinite loading
                   setError("Processing login..."); // Or a more specific error
               }
          } else if (sessionToken) {
              // Has session token, but maybe Auth0 session expired? Attempt fetch anyway.
              // getToken might trigger redirect if refresh fails.
              console.log("Has session token, attempting fetch...");
              await fetchStoreData(sessionToken);
          } else {
              // Fallback, should ideally not be reached
              console.log("Auth check fallback case.");
              setCheckingAuth(false);
          }
      };
      checkAuthAndLoad();
  }, [isAuthenticated, loginWithRedirect, getToken, fetchStoreData]); // Dependencies


    // --- CRUD Handlers ---

    // Add Product
    const handleNewProductChange = (field: keyof Omit<NewProductFields, 'imageFile' | 'imagePreviewUrl'>, value: string | number) => {
        // Use new property names: name, description, price, category
        setNewProduct(prev => ({ ...prev, [field]: value }));
    };
    const handleNewProductImageChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        setNewProduct(prev => ({ ...prev, imageFile: file }));
        // Generate preview
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setNewProduct(prev => ({ ...prev, imagePreviewUrl: reader.result as string }));
            reader.readAsDataURL(file);
        } else {
            setNewProduct(prev => ({ ...prev, imagePreviewUrl: null })); // Clear preview
        }
    };
    const handleAddProduct = async () => {
        if (!store) return; setActionError(null); setIsAddingProductLoading(true);
        // Validate using new property names
        if (!newProduct.name || !newProduct.description || !newProduct.price || newProduct.price <= 0 || !newProduct.category || !newProduct.imageFile) {
            setActionError('All fields (Name, Description, Price > 0, Category) and an image are required.'); setIsAddingProductLoading(false); return;
        }
        const token = sessionStorage.getItem('access_token') || await getToken(); if (!token) { setActionError("Authentication required to add product."); setIsAddingProductLoading(false); return; }

        try {
            const imageUrl = await uploadImageToBackend(newProduct.imageFile, token); // Upload image

            // Prepare data matching backend AddProductPayload (uses name, description, imageUrl)
            const productDataToSend: AddProductPayload = {
                name: newProduct.name,                      // Use new property name
                description: newProduct.description,        // Use new property name
                price: newProduct.price,                    // Use new property name
                category: newProduct.category,              // Use new property name
                imageUrl: imageUrl,                         // Use correct key: imageUrl
                storeName: store.storeName,                 // Include store name
                // NO 'products: []' needed here for adding single product
            };

            console.log("Sending Add Product Payload:", productDataToSend);

            const response = await fetch(`${baseUrl}/stores/products`, { // Send to POST /stores/products
                method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(productDataToSend),
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: `Server error: ${response.statusText}` }));
                throw new Error(errorData.message || `Failed to add product (${response.status})`);
            }
            // Success
            setIsAddingProductFormVisible(false); setNewProduct(initialNewProductState); // Reset form
            if (addFileInputRef.current) addFileInputRef.current.value = ""; // Clear file input visually
            await fetchStoreData(token); // Refresh store data
        } catch (err: any) {
            console.error("Add product error:", err);
            setActionError(`Add product failed: ${err.message || 'Unknown error'}`);
        }
        finally { setIsAddingProductLoading(false); }
    };

    // Edit Product
    const openEditModal = (product: Product) => {
        setEditingProduct(product);
        // Initialize form data using new property names from the product object
        setEditFormData({
            name: product.name,                     // Use new property name
            description: product.description,       // Use new property name
            price: product.price,                   // Use new property name
            category: product.category              // Use new property name
        });
        setEditProductImage(null); // Reset selected file state
        setEditProductPreview(product.imageUrl || ''); // Show CURRENT image URL (use imageUrl)
        setIsEditModalOpen(true); setActionError(null);
    };
    const closeEditModal = () => { /* ... same closeEditModal ... */
        setIsEditModalOpen(false); setEditingProduct(null); setEditFormData({}); setEditProductImage(null); setEditProductPreview(''); setActionError(null); setIsSavingEdit(false);
    };
    const handleEditFormChange = (field: keyof EditableProductFields, value: string | number) => {
        // Update state using new property names: name, description, price, category
        setEditFormData(prev => ({ ...prev, [field]: value }));
    };
    const handleEditImageChange = (e: ChangeEvent<HTMLInputElement>) => { /* ... same handleEditImageChange ... */
        const file = e.target.files?.[0] || null;
        setEditProductImage(file); // Store the selected file (or null)
        if (file) { // If a file is selected, show its preview
            const reader = new FileReader();
            reader.onloadend = () => setEditProductPreview(reader.result as string); // Update preview state
            reader.readAsDataURL(file);
        } else { // If selection is cancelled, revert preview to the original product image
            setEditProductPreview(editingProduct?.imageUrl || ''); // Use imageUrl
        }
    };
    const handleUpdateProduct = async () => {
        if (!editingProduct) return; setActionError(null); setIsSavingEdit(true);
        const token = sessionStorage.getItem('access_token') || await getToken(); if (!token) { setActionError("Authentication required to update."); setIsSavingEdit(false); return; }

        // Validate using new property names from editFormData
        if (!editFormData.name || !editFormData.description || !editFormData.price || editFormData.price <= 0 || !editFormData.category) {
            setActionError('All fields (Name, Description, Price > 0, Category) are required during edit.'); setIsSavingEdit(false); return;
        }

        try {
            let imageUrlToSave = editingProduct.imageUrl; // Default to existing image URL (use imageUrl)

            // 1. Check if a *new* image file was selected
            if (editProductImage) {
                console.log("New image selected for edit, uploading...");
                imageUrlToSave = await uploadImageToBackend(editProductImage, token);
                console.log("New image uploaded, URL:", imageUrlToSave);
                // Optional: Add logic here to delete the OLD image (editingProduct.imageUrl) from storage if it existed.
            } else {
                 console.log("No new image selected, keeping existing URL:", imageUrlToSave);
            }

            // 2. Prepare payload matching backend UpdateProductPayload (uses name?, description?, imageUrl?)
            const updatePayload: UpdateProductPayload = {
                name: editFormData.name,                     // Use new property name
                description: editFormData.description,       // Use new property name
                price: editFormData.price,                   // Use new property name
                category: editFormData.category,             // Use new property name
                imageUrl: imageUrlToSave ?? undefined        // Use correct key: imageUrl. Send undefined if null/empty.
            };

            // Clean payload: Remove unchanged fields compared to original 'editingProduct'
            // This is optional but good practice for PATCH to only send changed data.
             const cleanedPayload: UpdateProductPayload = {};
             let hasChanges = false;
             if (updatePayload.name !== editingProduct.name) { cleanedPayload.name = updatePayload.name; hasChanges = true; }
             if (updatePayload.description !== editingProduct.description) { cleanedPayload.description = updatePayload.description; hasChanges = true; }
             if (updatePayload.price !== editingProduct.price) { cleanedPayload.price = updatePayload.price; hasChanges = true; }
             if (updatePayload.category !== editingProduct.category) { cleanedPayload.category = updatePayload.category; hasChanges = true; }
             if (updatePayload.imageUrl !== editingProduct.imageUrl) { cleanedPayload.imageUrl = updatePayload.imageUrl; hasChanges = true; }

             if (!hasChanges) {
                 console.log("No changes detected.");
                 closeEditModal(); // Close modal if no changes were made
                 setIsSavingEdit(false);
                 return;
             }

             console.log("Sending Update Payload:", cleanedPayload);


            // 3. Send PATCH request to backend
            const response = await fetch(`${baseUrl}/stores/products/${editingProduct.prodId}`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(cleanedPayload), // Send only changed fields
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: `Server error: ${response.statusText}` }));
                throw new Error(errorData.message || `Failed to update product (${response.status})`);
            }

            // Success
            closeEditModal(); await fetchStoreData(token); // Close modal and refresh data

        } catch (err: any) {
            console.error('Error updating product:', err);
            setActionError(`Update failed: ${err.message || 'Unknown error'}`);
            // Keep modal open to show error
        } finally { setIsSavingEdit(false); }
    };


    // Delete Product
    const handleDeleteClick = (prodId: number) => { if (window.confirm("Are you sure you want to delete this product? This cannot be undone.")) { confirmDelete(prodId); } };
    const confirmDelete = async (prodId: number) => { /* ... same delete logic ... */
        setDeletingProductId(prodId); setActionError(null);
        const token = sessionStorage.getItem('access_token') || await getToken(); if (!token) { setActionError("Authentication required to delete."); setDeletingProductId(null); return; }
        try {
            // Optional: Get image URL before deleting to clean up storage

            const response = await fetch(`${baseUrl}/stores/products/${prodId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok && response.status !== 204) { // 204 No Content is also OK for DELETE
                 const errorData = await response.json().catch(() => ({ message: `Server error: ${response.statusText}` }));
                 throw new Error(errorData.message || `Failed to delete product (${response.status})`);
            }

            // If successful delete from DB, attempt to delete image from storage (implement backend endpoint if needed)
            // if (imageUrlToDelete) {
            //     console.log("Attempting to delete image from storage:", imageUrlToDelete);
            //     // Example: await fetch(`${baseUrl}/upload/delete-image`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ url: imageUrlToDelete }) });
            // }

            await fetchStoreData(token); // Refresh list
        } catch (err: any) {
             console.error("Delete error:", err);
             setActionError(`Delete failed: ${err.message || 'Unknown error'}`);
        }
        finally { setDeletingProductId(null); }
    };

    // --- Render Logic ---
    if (checkingAuth) { return <div className="loading-container">Checking Authentication...</div>; } // Separate message for auth check
    if (loading) { return <div className="loading-container">Loading Store Data...</div>; }
    if (error) { return ( <div className="store-error"><h2>Error Loading Store</h2><p>{error}</p><button onClick={()=>fetchStoreData()}>Try Again</button></div> ); }
    if (!store && !checkingAuth && !loading) { return ( <div className="no-store"><h2>Store Not Found or Access Denied</h2><p>You might need to create a store or check your permissions.</p><a href="/create-store" className="button-link">Create a Store</a></div> ); }
    if (!store) { return <div className="loading-container">Initializing...</div>; } // Fallback if store is null


    return (
        <div className="my-store-container">
            {/* Header */}
            <div className="store-header">
                <h1>{store.storeName}</h1>
                <button className="add-product-button" onClick={() => { setIsAddingProductFormVisible(prev => !prev); setActionError(null); if (!isAddingProductFormVisible) { setNewProduct(initialNewProductState); if (addFileInputRef.current) addFileInputRef.current.value = ""; } }} disabled={isAddingProductLoading}>
                    {isAddingProductFormVisible ? 'Cancel Add' : '+ Add Product'}
                </button>
            </div>

            {/* Action Errors */}
            {actionError && !isEditModalOpen && !isAddingProductFormVisible && <div className="error-message action-error">{actionError}</div>}

            {/* Add Product Form */}
            {isAddingProductFormVisible && (
                <div className="add-product-form">
                    <h2>Add New Product</h2>
                    {actionError && <div className="error-message action-error">{actionError}</div>}
                    {/* Use new property names for value and onChange */}
                    <div className="form-group"><label htmlFor="add-prod-name">Name</label><input id="add-prod-name" type="text" value={newProduct.name || ''} onChange={(e) => handleNewProductChange('name', e.target.value)} disabled={isAddingProductLoading} required/></div>
                    <div className="form-group"><label htmlFor="add-prod-desc">Description</label><textarea id="add-prod-desc" value={newProduct.description || ''} onChange={(e) => handleNewProductChange('description', e.target.value)} disabled={isAddingProductLoading} required/></div>
                    <div className="form-row">
                        <div className="form-group"><label htmlFor="add-prod-price">Price (R)</label><input id="add-prod-price" type="number" step="0.01" min="0.01" value={newProduct.price || ''} onChange={(e) => handleNewProductChange('price', parseFloat(e.target.value) || 0)} disabled={isAddingProductLoading} required/></div>
                        <div className="form-group"><label htmlFor="add-prod-cat">Category</label><select id="add-prod-cat" value={newProduct.category || ''} onChange={(e) => handleNewProductChange('category', e.target.value)} disabled={isAddingProductLoading} required><option value="">Select</option>{PRODUCT_CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
                    </div>
                    {/* Image Input & Preview */}
                    <div className="form-group">
                        <label htmlFor="new-product-image">Image *</label>
                        <input id="new-product-image" type="file" ref={addFileInputRef} onChange={handleNewProductImageChange} accept="image/*" required disabled={isAddingProductLoading} />
                        {/* Use the dedicated imagePreviewUrl state */}
                        {newProduct.imagePreviewUrl && <div className="image-preview"><img src={newProduct.imagePreviewUrl} alt="New product preview"/></div>}
                    </div>
                    {/* Actions */}
                    <div className="form-actions">
                        <button type="button" className="cancel-button" onClick={() => setIsAddingProductFormVisible(false)} disabled={isAddingProductLoading}>Cancel</button>
                        <button type="button" className="submit-button" onClick={handleAddProduct} disabled={isAddingProductLoading}>{isAddingProductLoading ? 'Adding...' : 'Add Product'}</button>
                    </div>
                </div>
            )}

            {/* Product List */}
            <div className="products-section">
                <h2>Your Products</h2>
                {(store.products && store.products.length > 0) ? (
                    <div className="products-grid">
                        {/* Use new property names for display */}
                        {store.products.map((product) => (
                            <div key={product.prodId} className="product-card">
                                {/* Use imageUrl */}
                                <div className="product-image">
                                    {product.imageUrl ? (
                                        <img src={product.imageUrl} alt={product.name} onError={(e) => { e.currentTarget.style.display = 'none'; const placeholder = e.currentTarget.nextElementSibling as HTMLElement; if(placeholder) placeholder.style.display='flex';}} />
                                    ) : null }
                                    {/* Placeholder shown if imageUrl is missing or image fails */}
                                    <div className="product-image-placeholder" style={{display: product.imageUrl ? 'none' : 'flex'}}><span>No Image</span></div>
                                </div>
                                <div className="product-details">
                                    {/* Use name, price, category, description */}
                                    <h3>{product.name}</h3>
                                    <p className="product-price">R{product.price.toFixed(2)}</p>
                                    <p className="product-category">{product.category}</p>
                                    <p className="product-description">{product.description}</p>
                                    <div className="product-actions">
                                        <button className="edit-button" onClick={() => openEditModal(product)} disabled={deletingProductId !== null || isSavingEdit}>Edit</button>
                                        <button className="delete-button" onClick={() => handleDeleteClick(product.prodId)} disabled={deletingProductId === product.prodId || isSavingEdit}>
                                            {deletingProductId === product.prodId ? 'Deleting...' : 'Delete'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : ( <div className="no-products"><p>You haven't added any products to your store yet.</p>{!isAddingProductFormVisible && <button className="add-first-product" onClick={() => {setIsAddingProductFormVisible(true); setNewProduct(initialNewProductState); }}>Add Your First Product</button>}</div> )}
            </div>

            {/* Edit Product Modal */}
            {isEditModalOpen && editingProduct && (
                <div className="modal-backdrop">
                    <div className="modal-content">
                        {/* Use name for title */}
                        <h2>Edit: {editingProduct.name}</h2>
                        {actionError && <div className="error-message modal-error">{actionError}</div>}
                        {/* Use new property names for value and onChange */}
                        <div className="form-group"><label htmlFor="edit-prod-name">Name</label><input id="edit-prod-name" type="text" value={editFormData.name || ''} onChange={(e) => handleEditFormChange('name', e.target.value)} disabled={isSavingEdit} required /></div>
                        <div className="form-group"><label htmlFor="edit-prod-desc">Description</label><textarea id="edit-prod-desc" value={editFormData.description || ''} onChange={(e) => handleEditFormChange('description', e.target.value)} disabled={isSavingEdit} required/></div>
                        <div className="form-row">
                            <div className="form-group"><label htmlFor="edit-prod-price">Price (R)</label><input id="edit-prod-price" type="number" step="0.01" min="0.01" value={editFormData.price || ''} onChange={(e) => handleEditFormChange('price', parseFloat(e.target.value) || 0)} disabled={isSavingEdit} required/></div>
                            <div className="form-group"><label htmlFor="edit-prod-cat">Category</label><select id="edit-prod-cat" value={editFormData.category || ''} onChange={(e) => handleEditFormChange('category', e.target.value)} disabled={isSavingEdit} required><option value="">Select</option>{PRODUCT_CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
                        </div>
                        {/* Image Edit Input */}
                        <div className="form-group">
                            <label htmlFor="edit-product-image">Replace Image (Optional)</label>
                            <input id="edit-product-image" type="file" ref={editFileInputRef} onChange={handleEditImageChange} accept="image/png, image/jpeg, image/webp, image/gif" disabled={isSavingEdit} />
                            {/* Show preview */}
                            {editProductPreview && (
                                <div className="image-preview edit-preview">
                                    <p>Current/New Image Preview:</p>
                                    <img src={editProductPreview} alt="Edit preview"/>
                                </div>
                            )}
                        </div>
                        {/* Actions */}
                        <div className="form-actions modal-actions">
                            <button type="button" className="cancel-button" onClick={closeEditModal} disabled={isSavingEdit}>Cancel</button>
                            <button type="button" className="submit-button" onClick={handleUpdateProduct} disabled={isSavingEdit}>{isSavingEdit ? 'Saving...' : 'Save Changes'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyStore;