// frontend/src/pages/MyStore.tsx
import React, { useState, useEffect, useCallback, useRef, ChangeEvent } from 'react'; // Added ChangeEvent
import { useAuth0 } from '@auth0/auth0-react';
import './MyStore.css';
import { CreateProductDto } from '../../../backend/src/store/dto/create-product.dto'; // Adjust path if needed

// --- Interface (Ensure imageURL is defined) ---
interface Product {
  productID: number;
  productName: string;
  productDescription: string;
  productPrice: number;
  productCategory: string;
  imageURL?: string | null; // Ensure this exists and is nullable/optional
}
interface Store {
  storeName: string;
  products: Product[];
}
type EditableProductFields = Omit<Product, 'productID' | 'imageURL'>;
type NewProductFields = Partial<Omit<Product, 'productID'>> & { imageFile?: File | null };

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
  const [isAddingProductFormVisible, setIsAddingProductFormVisible] = useState(false);
  const [isAddingProductLoading, setIsAddingProductLoading] = useState(false);
  const [newProduct, setNewProduct] = useState<NewProductFields>({ productName: '', productDescription: '', productPrice: 0, productCategory: '', imageFile: null });
  const addFileInputRef = useRef<HTMLInputElement>(null); // Ref for add form file input

  // Edit Product State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<EditableProductFields>>({});
  const [editProductImage, setEditProductImage] = useState<File | null>(null); // State for the *new* file selected in edit modal
  const [editProductPreview, setEditProductPreview] = useState<string>(''); // State for the preview in edit modal
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const editFileInputRef = useRef<HTMLInputElement>(null); // Ref for edit form file input


  // Delete Product State
  const [deletingProductId, setDeletingProductId] = useState<number | null>(null);

  // --- Constants ---
  const PRODUCT_CATEGORIES = [
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
        loginWithRedirect({ appState: { returnTo: window.location.pathname } });
        return null;
    }
  }, [getAccessTokenSilently, loginWithRedirect]);

  // Upload Helper (using your backend /upload/image endpoint)
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
    return data.url;
  };

  const fetchStoreData = useCallback(async (currentToken?: string) => { /* ... same fetchStoreData ... */
      console.log("Fetching store data...");
      setLoading(true); setError(null); setActionError(null);
      const token = currentToken || sessionStorage.getItem('access_token') || await getToken();
      if (!token) { setError("Auth required."); setLoading(false); setCheckingAuth(false); return; }
      try {
          const response = await fetch(`${baseUrl}/stores/my-store`, { headers: { 'Authorization': `Bearer ${token}` } });
          if (!response.ok) {
              if (response.status === 404) { window.location.href = '/create-store'; return; }
              throw await response.json().catch(() => new Error(response.statusText));
          }
          const storeData: Store = await response.json();
          if (storeData && !storeData.products) { storeData.products = []; }
          setStore(storeData);
      } catch (err: any) { console.error('Error fetching store data:', err); setError(err.message || 'Failed to load store.'); setStore(null); }
      finally { setLoading(false); setCheckingAuth(false); }
  }, [baseUrl, getToken]);

  useEffect(() => { /* ... same auth check/load useEffect ... */
     const checkAuthAndLoad = async () => {
            setCheckingAuth(true);
            const sessionToken = sessionStorage.getItem('access_token');
            if (!sessionToken && isAuthenticated) {
                 const currentToken = await getToken();
                  if(currentToken) { await fetchStoreData(currentToken); }
                  else { setError("Failed to get token."); setCheckingAuth(false); }
            } else if (sessionToken) {
                 await fetchStoreData(sessionToken);
            } else if (!sessionToken && !isAuthenticated) {
                  setCheckingAuth(false);
                  loginWithRedirect({ appState: { returnTo: window.location.pathname } });
            } else { setCheckingAuth(false); }
        };
        checkAuthAndLoad();
  }, [isAuthenticated, loginWithRedirect, getToken, fetchStoreData]);

  // --- CRUD Handlers ---

  // Add Product
  const handleNewProductChange = (field: keyof Omit<NewProductFields, 'imageFile' | 'imageURL'>, value: string | number) => { /* ... */ setNewProduct(prev => ({ ...prev, [field]: value })); };
  const handleNewProductImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setNewProduct(prev => ({ ...prev, imageFile: file }));
    // Generate preview
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => setNewProduct(prev => ({ ...prev, imageURL: reader.result as string })); // Use imageURL for preview state temporarily
        reader.readAsDataURL(file);
    } else {
        setNewProduct(prev => ({ ...prev, imageURL: '' })); // Clear preview
    }
  };
  const handleAddProduct = async () => {
      if (!store) return; setActionError(null); setIsAddingProductLoading(true);
      if (!newProduct.productName || !newProduct.productDescription || !newProduct.productPrice || !newProduct.productCategory || !newProduct.imageFile) {
          setActionError('All fields and image required.'); setIsAddingProductLoading(false); return;
      }
      const token = sessionStorage.getItem('access_token') || await getToken(); if (!token) { setActionError("Auth required."); setIsAddingProductLoading(false); return; }
      // User ID is not needed for this operation

      try {
          const imageUrl = await uploadImageToBackend(newProduct.imageFile, token); // Upload image
          const productDataToSend: CreateProductDto = { // Prepare data for backend DTO
              productName: newProduct.productName,
              productDescription: newProduct.productDescription,
              productPrice: newProduct.productPrice,
              productCategory: newProduct.productCategory,
              imageURL: imageUrl, // Use uploaded URL
              storeName: store.storeName,
              products: [] // Add an empty array or appropriate value for 'products'
          };
          const response = await fetch(`${baseUrl}/stores/products`, { // Send to backend
              method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(productDataToSend),
          });
          if (!response.ok) { throw await response.json().catch(() => new Error(response.statusText)); }
          // Success
          setIsAddingProductFormVisible(false); setNewProduct({ /* Reset */ }); if (addFileInputRef.current) addFileInputRef.current.value = ""; await fetchStoreData(token);
      } catch (err: any) { setActionError(`Add failed: ${err.message || 'Unknown'}`); }
      finally { setIsAddingProductLoading(false); }
  };

  // Edit Product
  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setEditFormData({ productName: product.productName, productDescription: product.productDescription, productPrice: product.productPrice, productCategory: product.productCategory });
    setEditProductImage(null); // Reset file input state
    setEditProductPreview(product.imageURL || ''); // Show CURRENT image URL as initial preview
    setIsEditModalOpen(true); setActionError(null);
  };
  const closeEditModal = () => {
    setIsEditModalOpen(false); setEditingProduct(null); setEditFormData({}); setEditProductImage(null); setEditProductPreview(''); setActionError(null); setIsSavingEdit(false);
  };
  const handleEditFormChange = (field: keyof EditableProductFields, value: string | number) => { setEditFormData(prev => ({ ...prev, [field]: value })); };

  // --- UPDATE Handle Edit Image Change ---
  const handleEditImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setEditProductImage(file); // Store the selected file (or null)
    if (file) { // If a file is selected, show its preview
        const reader = new FileReader();
        reader.onloadend = () => setEditProductPreview(reader.result as string); // Update preview state
        reader.readAsDataURL(file);
    } else { // If selection is cancelled, revert preview to the original product image
        setEditProductPreview(editingProduct?.imageURL || '');
    }
  };
  // --- END UPDATE ---

  // --- UPDATE Handle Update Product Logic ---
  const handleUpdateProduct = async () => {
    if (!editingProduct) return; setActionError(null); setIsSavingEdit(true);
    const token = sessionStorage.getItem('access_token') || await getToken(); if (!token) { setActionError("Auth required."); setIsSavingEdit(false); return; }

    // Basic validation for text fields
    if (!editFormData.productName || !editFormData.productDescription || !editFormData.productPrice || !editFormData.productCategory) {
       setActionError('All text fields are required during edit.'); setIsSavingEdit(false); return;
    }

    try {
        let imageUrlToSave = editingProduct.imageURL; // Default to existing image URL

        // 1. Check if a *new* image file was selected in the modal
        if (editProductImage) {
            console.log("New image selected for edit, uploading...");
            // Upload the new image
            imageUrlToSave = await uploadImageToBackend(editProductImage, token);
            console.log("New image uploaded, URL:", imageUrlToSave);
            // Optional: Add logic here to delete the OLD image from storage
            // using editingProduct.imageURL if it existed.
        } else {
             console.log("No new image selected, keeping existing URL:", imageUrlToSave);
        }

        // 2. Prepare payload for backend PATCH request
        const updatePayload = {
            ...editFormData, // Include changed text fields
            imageURL: imageUrlToSave // Send either the new URL or the original one
        };

        // 3. Send PATCH request to backend
        console.log("Sending update payload:", updatePayload);
        const response = await fetch(`${baseUrl}/stores/products/${editingProduct.productID}`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(updatePayload), // Backend uses UpdateProductDto
        });
        if (!response.ok) { throw await response.json().catch(() => new Error(response.statusText)); }

        // Success
        closeEditModal(); await fetchStoreData(token); // Close modal and refresh data

    } catch (err: any) {
        console.error('Error updating product:', err);
        setActionError(`Update failed: ${err.message || 'Unknown error'}`);
        // Keep modal open to show error
    } finally { setIsSavingEdit(false); }
  };
  // --- END UPDATE ---


  // Delete Product
  const handleDeleteClick = (productId: number) => { /* ... same ... */ if (window.confirm("Delete this product? Cannot be undone.")) { confirmDelete(productId); } };
  const confirmDelete = async (productId: number) => { /* ... same ... */
       setDeletingProductId(productId); setActionError(null);
       const token = sessionStorage.getItem('access_token') || await getToken(); if (!token) { setActionError("Auth required."); setDeletingProductId(null); return; }
       try {
            // Optional: Get image URL and delete from storage BEFORE deleting DB record
            // const productToDelete = store?.products.find(p => p.productID === productId);
            // const imageUrlToDelete = productToDelete?.imageURL;
            // if (imageUrlToDelete) { /* Call backend endpoint or have logic here to delete from storage */ }

            const response = await fetch(`${baseUrl}/stores/products/${productId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok && response.status !== 204) { throw await response.json().catch(() => new Error(response.statusText)); }
            await fetchStoreData(token);
        } catch (err: any) { setActionError(`Delete failed: ${err.message || 'Unknown'}`); }
        finally { setDeletingProductId(null); }
  };

  // --- Render Logic ---
  if (checkingAuth || loading) { return <div className="loading-container">Loading Store...</div>; }
  if (error) { return ( <div className="store-error"><h2>Error</h2><p>{error}</p><button onClick={()=>fetchStoreData()}>Retry</button></div> ); }
  if (!store) { return ( <div className="no-store"><h2>Store Not Found</h2><p>Create a store first.</p><a href="/create-store">Create Store</a></div> ); }

  return (
    <div className="my-store-container">
      {/* Header */}
      <div className="store-header">
        <h1>{store.storeName}</h1>
        <button className="add-product-button" onClick={() => { setIsAddingProductFormVisible(prev => !prev); setActionError(null); }} disabled={isAddingProductLoading}>
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
          {/* ... Text Inputs ... */}
           <div className="form-group"><label htmlFor="add-prod-name">Name</label><input id="add-prod-name" type="text" value={newProduct.productName || ''} onChange={(e) => handleNewProductChange('productName', e.target.value)} disabled={isAddingProductLoading} required/></div>
           <div className="form-group"><label htmlFor="add-prod-desc">Description</label><textarea id="add-prod-desc" value={newProduct.productDescription || ''} onChange={(e) => handleNewProductChange('productDescription', e.target.value)} disabled={isAddingProductLoading} required/></div>
           <div className="form-row">
               <div className="form-group"><label htmlFor="add-prod-price">Price (R)</label><input id="add-prod-price" type="number" step="0.01" min="0.01" value={newProduct.productPrice || ''} onChange={(e) => handleNewProductChange('productPrice', parseFloat(e.target.value) || 0)} disabled={isAddingProductLoading} required/></div>
               <div className="form-group"><label htmlFor="add-prod-cat">Category</label><select id="add-prod-cat" value={newProduct.productCategory || ''} onChange={(e) => handleNewProductChange('productCategory', e.target.value)} disabled={isAddingProductLoading} required><option value="">Select</option>{PRODUCT_CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
           </div>
          {/* Image Input & Preview */}
          <div className="form-group">
            <label htmlFor="new-product-image">Image *</label>
            <input id="new-product-image" type="file" ref={addFileInputRef} onChange={handleNewProductImageChange} accept="image/*" required disabled={isAddingProductLoading} />
            {/* Use the imageURL state used for preview */}
            {newProduct.imageURL && <div className="image-preview"><img src={newProduct.imageURL} alt="New product preview"/></div>}
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
            {store.products.map((product) => (
              <div key={product.productID} className="product-card">
                {/* --- UPDATE Image Display with correct class --- */}
                <div className="product-image">
                  {product.imageURL ? (
                      <img src={product.imageURL} alt={product.productName} onError={(e) => { e.currentTarget.style.display = 'none'; /* Hide broken img */ const placeholder = e.currentTarget.nextElementSibling as HTMLElement; if(placeholder) placeholder.style.display='flex';}} /> /* Hide img on error */
                  ) : null /* Render nothing if no URL */}
                  {/* Placeholder shown by default or if image fails */}
                  <div className="product-image-placeholder" style={{display: product.imageURL ? 'none' : 'flex'}}><span>No Image</span></div>
                </div>
                {/* --- END UPDATE --- */}
                <div className="product-details">
                  <h3>{product.productName}</h3>
                  <p className="product-price">R{product.productPrice.toFixed(2)}</p>
                  <p className="product-category">{product.productCategory}</p>
                  <p className="product-description">{product.productDescription}</p>
                  <div className="product-actions">
                    <button className="edit-button" onClick={() => openEditModal(product)} disabled={deletingProductId !== null || isSavingEdit}>Edit</button>
                    <button className="delete-button" onClick={() => handleDeleteClick(product.productID)} disabled={deletingProductId === product.productID || isSavingEdit}>
                      {deletingProductId === product.productID ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : ( <div className="no-products"><p>No products yet.</p>{!isAddingProductFormVisible && <button className="add-first-product" onClick={() => setIsAddingProductFormVisible(true)}>Add First Product</button>}</div> )}
      </div>

      {/* Edit Product Modal */}
      {isEditModalOpen && editingProduct && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h2>Edit: {editingProduct.productName}</h2>
            {actionError && <div className="error-message modal-error">{actionError}</div>}
            {/* Text Inputs */}
             <div className="form-group"><label htmlFor="edit-prod-name">Name</label><input id="edit-prod-name" type="text" value={editFormData.productName || ''} onChange={(e) => handleEditFormChange('productName', e.target.value)} disabled={isSavingEdit} required /></div>
             <div className="form-group"><label htmlFor="edit-prod-desc">Description</label><textarea id="edit-prod-desc" value={editFormData.productDescription || ''} onChange={(e) => handleEditFormChange('productDescription', e.target.value)} disabled={isSavingEdit} required/></div>
             <div className="form-row">
                <div className="form-group"><label htmlFor="edit-prod-price">Price (R)</label><input id="edit-prod-price" type="number" step="0.01" min="0.01" value={editFormData.productPrice || ''} onChange={(e) => handleEditFormChange('productPrice', parseFloat(e.target.value) || 0)} disabled={isSavingEdit} required/></div>
                <div className="form-group"><label htmlFor="edit-prod-cat">Category</label><select id="edit-prod-cat" value={editFormData.productCategory || ''} onChange={(e) => handleEditFormChange('productCategory', e.target.value)} disabled={isSavingEdit} required><option value="">Select</option>{PRODUCT_CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
             </div>
             {/* --- ADD Image Edit Input --- */}
            <div className="form-group">
              <label htmlFor="edit-product-image">Replace Image (Optional)</label>
              <input
                  id="edit-product-image"
                  type="file"
                  ref={editFileInputRef}
                  onChange={handleEditImageChange}
                  accept="image/png, image/jpeg, image/webp, image/gif"
                  disabled={isSavingEdit}
              />
              {/* Show preview of original or newly selected image */}
              {editProductPreview && (
                  <div className="image-preview edit-preview">
                      <p>Current/New Image Preview:</p>
                      <img src={editProductPreview} alt="Edit preview"/>
                  </div>
              )}
            </div>
            {/* --- END ADD --- */}
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