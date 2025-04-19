import React, { useState, useEffect, useCallback } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import './MyStore.css'; // Make sure this includes modal and button styles

// Product interface (no imageURL)
interface Product {
  productID: number;
  productName: string;
  productDescription: string;
  productPrice: number;
  productCategory: string;
}

interface Store {
  storeName: string;
  products: Product[];
}

// Type for editable fields (excluding ID)
type EditableProductFields = Omit<Product, 'productID'>;

const MyStore: React.FC = () => {
  const { loginWithRedirect, isAuthenticated, getAccessTokenSilently } = useAuth0();
  const baseUrl = import.meta.env.VITE_BACKEND_URL;

  // --- State Variables ---
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loading, setLoading] = useState(true); // Loading store data
  const [store, setStore] = useState<Store | null>(null);
  const [error, setError] = useState<string | null>(null); // General fetch error
  const [actionError, setActionError] = useState<string | null>(null); // Errors from CRUD actions

  // Add Product State
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [newProduct, setNewProduct] = useState<Partial<EditableProductFields>>({
    productName: '', productDescription: '', productPrice: 0, productCategory: '',
  });

  // Edit Product State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<EditableProductFields>>({});
  const [isSavingEdit, setIsSavingEdit] = useState(false); // Loading state for edit save

  // Delete Product State
  const [deletingProductId, setDeletingProductId] = useState<number | null>(null); // Track which product is being deleted

  // --- Constants ---
  const PRODUCT_CATEGORIES = [
    'Home & Living', 'Jewellery & Accessories', 'Clothing', 'Bags & Purses',
    'Art', 'Crafts & Collectibles', 'Beauty & Wellness', 'Kids & Baby',
    'Pet Goods', 'Stationery & Paper Goods', 'Food & Beverage', 'Other'
  ];

  // --- Utility Functions ---
  const getToken = useCallback(async () => {
    try {
      const token = await getAccessTokenSilently();
      sessionStorage.setItem('access_token', token);
      return token;
    } catch (e) {
      console.error("Error getting access token silently", e);
      // Fallback to redirect login if silent auth fails
      loginWithRedirect({ appState: { returnTo: window.location.pathname } });
      return null;
    }
  }, [getAccessTokenSilently, loginWithRedirect]);

  // --- Data Fetching ---
  const fetchStoreData = useCallback(async (currentToken?: string) => {
    console.log("Attempting to fetch store data...");
    setLoading(true);
    setError(null);
    setActionError(null); // Clear action errors on refresh

    const token = currentToken || sessionStorage.getItem('access_token') || await getToken();
    if (!token) {
      setError("Authentication required to view store.");
      setLoading(false);
      setCheckingAuth(false); // Ensure auth check completes
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
          // Check if component is still mounted before redirecting (optional but good practice)
          // In this simple case, direct redirect is likely okay.
          window.location.href = '/create-store';
          return; // Stop execution
        }
         const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(`Failed to fetch store data: ${errorData.message || response.statusText} (Status: ${response.status})`);
      }

      const storeData: Store = await response.json();
      console.log("Store data successfully fetched:", storeData);
      setStore(storeData);
    } catch (err) {
      console.error('Error during fetchStoreData:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred while loading your store.');
      setStore(null); // Clear store data on error
    } finally {
      setLoading(false);
      setCheckingAuth(false); // Ensure auth check completes even on error
    }
  }, [baseUrl, getToken]);

  // --- Authentication and Initial Load Effect ---
  useEffect(() => {
    const checkAuthAndLoad = async () => {
        setCheckingAuth(true); // Indicate checking start
        const sessionToken = sessionStorage.getItem('access_token');

        if (!sessionToken && isAuthenticated) {
            // Logged in via Auth0 but no token in session, get it
            console.log("Auth0 authenticated, getting session token...");
            const currentToken = await getToken();
             if(currentToken) {
                 await fetchStoreData(currentToken);
             } else {
                 setCheckingAuth(false); // Failed to get token
                 setError("Could not retrieve authentication token.");
             }
        } else if (sessionToken) {
            // Token exists in session, proceed to fetch data
            console.log("Session token found, fetching data...");
            await fetchStoreData(sessionToken);
        } else if (!sessionToken && !isAuthenticated) {
             // Not logged in, redirect (or show login prompt)
             console.log("Not authenticated, redirecting to login...");
             setCheckingAuth(false); // Stop checking before redirect
             loginWithRedirect({ appState: { returnTo: window.location.pathname } });
        } else {
            // Edge case: Not authenticated but session token exists? Unlikely.
            console.log("Auth state unclear, checking complete.");
            setCheckingAuth(false);
        }
    };

    checkAuthAndLoad();
    // Exclude fetchStoreData/getToken from deps array here if they cause loops
    // Rely on manual calls after actions or initial load logic
  }, [isAuthenticated, loginWithRedirect, getToken]); // Only re-run if auth state changes

  // --- CRUD Handlers ---

  // Add Product
  const handleNewProductChange = (field: keyof EditableProductFields, value: string | number) => {
    setNewProduct(prev => ({ ...prev, [field]: value }));
  };

  const handleAddProduct = async () => {
     if (!store) return;
    setActionError(null);
    if (!newProduct.productName || !newProduct.productDescription || !newProduct.productPrice || !newProduct.productCategory) {
      setActionError('Please fill in all product fields.');
      return;
    }

    const token = sessionStorage.getItem('access_token') || await getToken();
    if (!token) { setActionError("Authentication required."); return; }

    setIsAddingProduct(true); // Indicate loading/adding state

    try {
      const response = await fetch(`${baseUrl}/stores/products`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newProduct, storeName: store.storeName }),
      });
      if (!response.ok) { throw await response.json().catch(() => new Error(response.statusText)); }

      setIsAddingProduct(false); // Turn off form
      setNewProduct({ productName: '', productDescription: '', productPrice: 0, productCategory: '' }); // Reset form
      await fetchStoreData(token); // Refresh data
    } catch (err: any) {
      console.error('Error adding product:', err);
      setActionError(`Failed to add product: ${err.message || 'Unknown error'}`);
      setIsAddingProduct(false); // Reset loading state on error
    }
  };

  // Edit Product
  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setEditFormData({ // Pre-fill form with product data
      productName: product.productName,
      productDescription: product.productDescription,
      productPrice: product.productPrice,
      productCategory: product.productCategory,
    });
    setIsEditModalOpen(true);
    setActionError(null);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingProduct(null);
    setEditFormData({});
    setActionError(null); // Clear errors when closing
    setIsSavingEdit(false); // Reset save loading state
  };

  const handleEditFormChange = (field: keyof EditableProductFields, value: string | number) => {
    setEditFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleUpdateProduct = async () => {
    if (!editingProduct) return;
    setActionError(null);
    setIsSavingEdit(true); // Indicate saving

    const token = sessionStorage.getItem('access_token') || await getToken();
    if (!token) {
        setActionError("Authentication required.");
        setIsSavingEdit(false);
        return;
    }

    // Basic validation for edit form (optional, add if needed)
    if (!editFormData.productName || !editFormData.productDescription || !editFormData.productPrice || !editFormData.productCategory) {
       setActionError('All fields are required during edit.');
       setIsSavingEdit(false);
       return;
    }


    try {
      const response = await fetch(`${baseUrl}/stores/products/${editingProduct.productID}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData), // Send only changed fields implicitly via PartialType DTO
      });
      if (!response.ok) { throw await response.json().catch(() => new Error(response.statusText)); }

      closeEditModal(); // Close modal on success
      await fetchStoreData(token); // Refresh data
    } catch (err: any) {
      console.error('Error updating product:', err);
      setActionError(`Failed to update product: ${err.message || 'Unknown error'}`);
      // Keep modal open on error to show message
    } finally {
        setIsSavingEdit(false); // Reset saving indicator
    }
  };

  // Delete Product
  const handleDeleteClick = (productId: number) => {
    if (window.confirm("Are you sure you want to delete this product? This action cannot be undone.")) {
      confirmDelete(productId);
    }
  };

  const confirmDelete = async (productId: number) => {
    setDeletingProductId(productId); // Show loading state on the specific button
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
      // Check for explicit failure; 204 No Content is success for DELETE
      if (!response.ok && response.status !== 204) {
        throw await response.json().catch(() => new Error(response.statusText));
      }

      await fetchStoreData(token); // Refresh data
    } catch (err: any) {
      console.error('Error deleting product:', err);
      setActionError(`Failed to delete product: ${err.message || 'Unknown error'}`);
    } finally {
      setDeletingProductId(null); // Reset loading state for the button
    }
  };

  // --- Render Logic ---
  if (checkingAuth) {
    return <div className="loading-container">Checking Authentication...</div>;
  }
  if (loading) {
    return <div className="loading-container">Loading Your Store...</div>;
  }
  if (error) { // Display general fetch error if loading is done
    return (
      <div className="store-error">
        <h2>Error Loading Store</h2>
        <p>{error}</p>
        <button onClick={() => fetchStoreData()}>Try Again</button>
      </div>
    );
  }
  if (!store) { // Should be caught by 404 redirect or error state, but as fallback
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
        <button className="add-product-button" onClick={() => { setIsAddingProduct(true); setActionError(null); }}>
          + Add Product
        </button>
      </div>

      {/* Action Error Display Area */}
      {actionError && !isEditModalOpen && <div className="error-message action-error">{actionError}</div>}

      {/* Add Product Form */}
      {isAddingProduct && (
        <div className="add-product-form">
          <h2>Add New Product</h2>
          {/* ... (Inputs bound to newProduct state) ... */}
           <div className="form-group"><label>Name:</label><input type="text" value={newProduct.productName || ''} onChange={(e) => handleNewProductChange('productName', e.target.value)} /></div>
           <div className="form-group"><label>Description:</label><textarea value={newProduct.productDescription || ''} onChange={(e) => handleNewProductChange('productDescription', e.target.value)} /></div>
           <div className="form-row">
               <div className="form-group"><label>Price (R):</label><input type="number" step="0.01" min="0.01" value={newProduct.productPrice || 0} onChange={(e) => handleNewProductChange('productPrice', parseFloat(e.target.value) || 0)} /></div>
               <div className="form-group"><label>Category:</label><select value={newProduct.productCategory || ''} onChange={(e) => handleNewProductChange('productCategory', e.target.value)}> <option value="">Select</option> {PRODUCT_CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
           </div>
          <div className="form-actions">
            <button className="cancel-button" onClick={() => setIsAddingProduct(false)}>Cancel</button>
            <button className="submit-button" onClick={handleAddProduct}>Add Product</button>
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
                <div className="product-image-placeholder"><span>No Image</span></div>
                <div className="product-details">
                  <h3>{product.productName}</h3>
                  <p className="product-price">R{product.productPrice.toFixed(2)}</p>
                  <p className="product-category">{product.productCategory}</p>
                  <p className="product-description">{product.productDescription}</p>
                  <div className="product-actions">
                    <button className="edit-button" onClick={() => openEditModal(product)}>Edit</button>
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
          </div>
        )}
      </div>

      {/* Edit Product Modal */}
      {isEditModalOpen && editingProduct && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h2>Edit Product: {editingProduct.productName}</h2>
            {actionError && <div className="error-message modal-error">{actionError}</div>}
            {/* ... (Inputs bound to editFormData state) ... */}
             <div className="form-group"><label>Name:</label><input type="text" value={editFormData.productName || ''} onChange={(e) => handleEditFormChange('productName', e.target.value)} /></div>
             <div className="form-group"><label>Description:</label><textarea value={editFormData.productDescription || ''} onChange={(e) => handleEditFormChange('productDescription', e.target.value)} /></div>
             <div className="form-row">
               <div className="form-group"><label>Price (R):</label><input type="number" step="0.01" min="0.01" value={editFormData.productPrice || 0} onChange={(e) => handleEditFormChange('productPrice', parseFloat(e.target.value) || 0)} /></div>
               <div className="form-group"><label>Category:</label><select value={editFormData.productCategory || ''} onChange={(e) => handleEditFormChange('productCategory', e.target.value)}> <option value="">Select</option> {PRODUCT_CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
            </div>
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