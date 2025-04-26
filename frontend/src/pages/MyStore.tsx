// frontend/src/pages/MyStore.tsx
import React, { useState, useEffect, useCallback, useRef, ChangeEvent } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import './myStore.css'; // Your updated CSS

// --- Frontend Type Definitions (UNCHANGED) ---
// ... (keep existing interfaces: AddProductPayload, UpdateProductPayload, Product, Store, etc.)
interface AddProductPayload {
    name: string;
    description: string;
    price: number;
    category: string;
    imageUrl: string;
    storeName?: string;
}
interface UpdateProductPayload {
    name?: string;
    description?: string;
    price?: number;
    category?: string;
    imageUrl?: string;
}
interface Product {
    prodId: number;
    name: string;
    description: string;
    price: number;
    category: string;
    imageUrl?: string | null;
    storeName?: string;
    isActive?: boolean;
}
interface Store {
    storeName: string;
    products: Product[];
}
type EditableProductFields = Omit<Product, 'prodId' | 'imageUrl' | 'storeName' | 'isActive'>;
type NewProductFields = Partial<Omit<Product, 'prodId' | 'imageUrl' | 'storeName' | 'isActive'>> & {
    imageFile?: File | null;
    imagePreviewUrl?: string | null;
};


// --- Component ---
const MyStore: React.FC = () => {
    // --- Hooks (UNCHANGED) ---
    const { loginWithRedirect, isAuthenticated, getAccessTokenSilently } = useAuth0();
    const baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

    // --- State (UNCHANGED) ---
    const [checkingAuth, setCheckingAuth] = useState(true);
    const [loading, setLoading] = useState(true);
    const [store, setStore] = useState<Store | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const initialNewProductState: NewProductFields = { name: '', description: '', price: 0, category: '', imageFile: null, imagePreviewUrl: null };
    const [isAddingProductFormVisible, setIsAddingProductFormVisible] = useState(false);
    const [isAddingProductLoading, setIsAddingProductLoading] = useState(false);
    const [newProduct, setNewProduct] = useState<NewProductFields>(initialNewProductState);
    const addFileInputRef = useRef<HTMLInputElement>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [editFormData, setEditFormData] = useState<Partial<EditableProductFields>>({});
    const [editProductImage, setEditProductImage] = useState<File | null>(null);
    const [editProductPreview, setEditProductPreview] = useState<string>('');
    const [isSavingEdit, setIsSavingEdit] = useState(false);
    const editFileInputRef = useRef<HTMLInputElement>(null);
    const editDialogRef = useRef<HTMLDialogElement>(null); // Keep this ref!
    const [deletingProductId, setDeletingProductId] = useState<number | null>(null);

    // --- Constants (UNCHANGED) ---
    const PRODUCT_CATEGORIES = [
        'Home & Living', 'Jewellery & Accessories', 'Clothing', 'Bags & Purses', 'Art',
        'Crafts & Collectibles', 'Beauty & Wellness', 'Kids & Baby', 'Pet Goods',
        'Stationery & Paper Goods', 'Food & Beverage', 'Other'
    ];

    // --- Utility & Fetching Functions (UNCHANGED) ---
    const getToken = useCallback(async (): Promise<string | null> => {
        // ... (implementation unchanged)
        try {
            const token = await getAccessTokenSilently();
            sessionStorage.setItem('access_token', token);
            return token;
        } catch (e) {
            console.error("Error getting access token silently:", e);
            if (!window.location.search.includes('code=') && !window.location.search.includes('state=')) {
                loginWithRedirect({ appState: { returnTo: window.location.pathname } });
            }
            return null;
        }
    }, [getAccessTokenSilently, loginWithRedirect]);

    const uploadImageToBackend = async (file: File, token: string): Promise<string> => {
       // ... (implementation unchanged)
       const imgFormData = new FormData();
        imgFormData.append('file', file);

        const res = await fetch(`${baseUrl}/upload/image`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: imgFormData,
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({ message: 'Failed to parse upload error response' }));
            throw new Error(`Image upload failed: ${errorData.message || res.statusText}`);
        }
        const data = await res.json();
        if (!data.url) {
            throw new Error(`Image upload succeeded but response missing URL.`);
        }
        console.log("Image uploaded successfully, URL:", data.url);
        return data.url;
    };

    const fetchStoreData = useCallback(async (currentToken?: string) => {
       // ... (implementation unchanged)
       console.log("Attempting to fetch store data...");
        setLoading(true);
        setError(null);
        setActionError(null);
        const token = currentToken || sessionStorage.getItem('access_token') || await getToken();
        if (!token) {
            setError("Authentication required to view your store.");
            setLoading(false);
            setCheckingAuth(false);
            return;
        }
        try {
            const response = await fetch(`${baseUrl}/stores/my-store`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                if (response.status === 404) {
                    console.log("Store not found (404). User may need to create one.");
                    window.location.href = '/create-store';
                    return;
                }
                const errorData = await response.json().catch(() => ({ message: `Server error: ${response.statusText}` }));
                throw new Error(errorData.message || `Failed to fetch store data (${response.status})`);
            }
            const storeData: Store = await response.json();
            if (storeData && !storeData.products) {
                storeData.products = [];
            }
            console.log("Fetched Store Data:", storeData);
            setStore(storeData);
        } catch (err: any) {
            console.error('Error fetching store data:', err);
            setError(err.message || 'Failed to load store data.');
            setStore(null);
        } finally {
            setLoading(false);
            setCheckingAuth(false);
        }
    }, [baseUrl, getToken]);

    // --- Effect for Initial Auth Check and Data Load (UNCHANGED) ---
    useEffect(() => {
      // ... (implementation unchanged)
      const checkAuthAndLoad = async () => {
          console.log("Running auth check and load effect...");
          setCheckingAuth(true);
          const sessionToken = sessionStorage.getItem('access_token');

          if (isAuthenticated) {
              console.log("Auth0 authenticated. Getting token and fetching data...");
              const currentToken = sessionToken || await getToken();
              if (currentToken) {
                  await fetchStoreData(currentToken);
              } else {
                  console.error("Authenticated according to Auth0, but failed to get token.");
                  setError("Authentication issue: Could not retrieve access token.");
                  setCheckingAuth(false);
                  setLoading(false);
              }
          } else if (!sessionToken) {
              console.log("Not authenticated and no session token. Redirecting to login...");
               if (!window.location.search.includes('code=') && !window.location.search.includes('state=')) {
                   loginWithRedirect({ appState: { returnTo: window.location.pathname } });
               } else {
                   console.log("On Auth0 callback path but not authenticated state.");
                   setError("Processing login callback...");
                   setCheckingAuth(false);
                   setLoading(false);
               }
          } else if (sessionToken) {
              console.log("Auth0 not authenticated, but session token exists. Attempting fetch...");
              await fetchStoreData(sessionToken);
          } else {
              console.log("Auth check fell through to fallback case.");
              setError("Could not determine authentication status.");
              setCheckingAuth(false);
              setLoading(false);
          }
      };
      checkAuthAndLoad();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated, loginWithRedirect, getToken]);

    // *** NEW: useEffect to control the dialog modal state ***
    useEffect(() => {
        const dialogElement = editDialogRef.current;
        if (!dialogElement) {
            return; // Exit if the ref is not attached yet
        }

        if (isEditModalOpen) {
            // Check if the dialog is not already open before calling showModal
            if (!dialogElement.hasAttribute('open')) {
                dialogElement.showModal(); // Use showModal() for centering, backdrop, focus trap
            }
        } else {
            // Check if the dialog is not already closed before calling close
            if (dialogElement.hasAttribute('open')) {
                dialogElement.close(); // Use close() to dismiss the dialog
            }
        }
        // No cleanup needed here, as close() handles dismissal
    }, [isEditModalOpen]); // Re-run this effect whenever isEditModalOpen changes

    // --- CRUD Handlers ---

    // --- Add Product (UNCHANGED) ---
    const handleNewProductChange = (field: keyof Omit<NewProductFields, 'imageFile' | 'imagePreviewUrl'>, value: string | number) => {
       // ... (implementation unchanged)
        setNewProduct(prev => ({ ...prev, [field]: value }));
    };
    const handleNewProductImageChange = (e: ChangeEvent<HTMLInputElement>) => {
       // ... (implementation unchanged)
       const file = e.target.files?.[0] || null;
        setNewProduct(prev => ({ ...prev, imageFile: file }));
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setNewProduct(prev => ({ ...prev, imagePreviewUrl: reader.result as string }));
            reader.readAsDataURL(file);
        } else {
            setNewProduct(prev => ({ ...prev, imagePreviewUrl: null }));
        }
    };
    const handleAddProduct = async () => {
       // ... (implementation unchanged)
       if (!store) return;
        setActionError(null);
        setIsAddingProductLoading(true);
        if (!newProduct.name || !newProduct.description || !newProduct.price || newProduct.price <= 0 || !newProduct.category || !newProduct.imageFile) {
            setActionError('All fields (Name, Description, Price > 0, Category) and an image are required.');
            setIsAddingProductLoading(false);
            return;
        }
        const token = sessionStorage.getItem('access_token') || await getToken();
        if (!token) {
            setActionError("Authentication required to add product.");
            setIsAddingProductLoading(false);
            return;
        }
        try {
            console.log("Uploading new product image...");
            const imageUrl = await uploadImageToBackend(newProduct.imageFile, token);
            console.log("New product image uploaded, URL:", imageUrl);
            const productDataToSend: AddProductPayload = {
                name: newProduct.name, description: newProduct.description,
                price: newProduct.price, category: newProduct.category,
                imageUrl: imageUrl, storeName: store.storeName,
            };
            console.log("Sending Add Product Payload:", JSON.stringify(productDataToSend));
            const response = await fetch(`${baseUrl}/stores/products`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(productDataToSend),
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: `Server error: ${response.statusText}` }));
                throw new Error(errorData.message || `Failed to add product (${response.status})`);
            }
            console.log("Product added successfully.");
            setIsAddingProductFormVisible(false);
            setNewProduct(initialNewProductState);
            if (addFileInputRef.current) addFileInputRef.current.value = "";
            await fetchStoreData(token);
        } catch (err: any) {
            console.error("Add product error:", err);
            setActionError(`Add product failed: ${err.message || 'Unknown error'}`);
        } finally {
            setIsAddingProductLoading(false);
        }
    };

    // --- Edit Product ---
    // openEditModal just sets the state now
    const openEditModal = (product: Product) => {
        console.log("Setting state to open edit modal for product:", product.prodId);
        setEditingProduct(product);
        setEditFormData({
            name: product.name, description: product.description,
            price: product.price, category: product.category
        });
        setEditProductImage(null);
        setEditProductPreview(product.imageUrl || '');
        setActionError(null);
        setIsEditModalOpen(true); // Trigger the useEffect to call showModal()
    };

    // closeEditModal resets state and triggers the useEffect to call close()
    const closeEditModal = () => {
        console.log("Setting state to close edit modal.");
        setIsEditModalOpen(false); // Trigger the useEffect
        // Reset form fields slightly later or within the onClose handler if needed
        // Note: The useEffect handles calling dialogElement.close()
         setEditingProduct(null); // Can reset these immediately
         setEditFormData({});
         setEditProductImage(null);
         setEditProductPreview('');
         setActionError(null); // Clear errors specific to the modal
         setIsSavingEdit(false); // Reset saving state
         if (editFileInputRef.current) {
              editFileInputRef.current.value = ""; // Clear file input
         }
    };

    const handleEditFormChange = (field: keyof EditableProductFields, value: string | number) => {
       // ... (implementation unchanged)
        setEditFormData(prev => ({ ...prev, [field]: value }));
    };
    const handleEditImageChange = (e: ChangeEvent<HTMLInputElement>) => {
       // ... (implementation unchanged)
       const file = e.target.files?.[0] || null;
        setEditProductImage(file);
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setEditProductPreview(reader.result as string);
            reader.readAsDataURL(file);
        } else {
            setEditProductPreview(editingProduct?.imageUrl || '');
        }
    };
    const handleUpdateProduct = async () => {
       // ... (implementation unchanged)
       if (!editingProduct) return;
        setActionError(null);
        setIsSavingEdit(true);
        const token = sessionStorage.getItem('access_token') || await getToken();
        if (!token) {
            setActionError("Authentication required to update product.");
            setIsSavingEdit(false);
            return;
        }
        if (!editFormData.name || !editFormData.description || !editFormData.price || editFormData.price <= 0 || !editFormData.category) {
            setActionError('All fields (Name, Description, Price > 0, Category) are required during edit.');
            setIsSavingEdit(false);
            return;
        }
        try {
            let imageUrlToSave = editingProduct.imageUrl;
            if (editProductImage) {
                console.log("New image selected for update. Uploading...");
                imageUrlToSave = await uploadImageToBackend(editProductImage, token);
                console.log("New image uploaded, URL:", imageUrlToSave);
            } else {
                 console.log("No new image selected, keeping existing URL:", imageUrlToSave);
            }
            const updatePayload: UpdateProductPayload = {
                name: editFormData.name, description: editFormData.description,
                price: editFormData.price, category: editFormData.category,
                imageUrl: imageUrlToSave ?? undefined
            };
            const cleanedPayload: UpdateProductPayload = {};
            let hasChanges = false;
            if (updatePayload.name !== editingProduct.name) { cleanedPayload.name = updatePayload.name; hasChanges = true; }
            if (updatePayload.description !== editingProduct.description) { cleanedPayload.description = updatePayload.description; hasChanges = true; }
            if (updatePayload.price !== editingProduct.price) { cleanedPayload.price = updatePayload.price; hasChanges = true; }
            if (updatePayload.category !== editingProduct.category) { cleanedPayload.category = updatePayload.category; hasChanges = true; }
            if (updatePayload.imageUrl !== editingProduct.imageUrl) { cleanedPayload.imageUrl = updatePayload.imageUrl; hasChanges = true; }

             if (!hasChanges) {
                 console.log("No changes detected in edit form.");
                 closeEditModal(); // Close modal (sets state, useEffect handles .close())
                 //setIsSavingEdit(false); // Already handled in closeEditModal
                 return;
             }
             console.log("Sending Update Payload (changed fields only):", JSON.stringify(cleanedPayload));
            const response = await fetch(`${baseUrl}/stores/products/${editingProduct.prodId}`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(cleanedPayload),
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: `Server error: ${response.statusText}` }));
                throw new Error(errorData.message || `Failed to update product (${response.status})`);
            }
            console.log("Product updated successfully.");
            closeEditModal(); // Close modal on success
            await fetchStoreData(token); // Refresh store data
        } catch (err: any) {
            console.error('Error updating product:', err);
            setActionError(`Update failed: ${err.message || 'Unknown error'}`);
            // Keep modal open by not calling closeEditModal on error
        } finally {
            setIsSavingEdit(false); // Clear loading state regardless of success/error
        }
    };

    // --- Delete Product (UNCHANGED) ---
    const handleDeleteClick = (prodId: number) => {
       // ... (implementation unchanged)
       setActionError(null);
        if (store?.products && store.products.length <= 1) {
            console.warn(`Attempt blocked: Trying to delete the last product (ID: ${prodId}).`);
            setActionError("You cannot delete the last product in your store. Add another product first.");
             setTimeout(() => {
                 if (actionError === "You cannot delete the last product in your store. Add another product first.") {
                    setActionError(null);
                 }
             }, 7000);
            return;
        }
        if (window.confirm("Are you sure you want to delete this product? This cannot be undone.")) {
            confirmDelete(prodId);
        }
    };
    const confirmDelete = async (prodId: number) => {
        // ... (implementation unchanged)
        setActionError(null);
        setDeletingProductId(prodId);
        const token = sessionStorage.getItem('access_token') || await getToken();
        if (!token) {
             setActionError("Authentication required to delete.");
             setDeletingProductId(null);
             return;
        }
        try {
            console.log(`Attempting to delete product with ID: ${prodId}`);
            const response = await fetch(`${baseUrl}/stores/products/${prodId}`, {
                 method: 'DELETE',
                 headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok && response.status !== 204) {
                 const errorData = await response.json().catch(() => ({ message: `Server error: ${response.statusText}` }));
                 throw new Error(`Product ID ${prodId}: ${errorData.message || `Failed to delete product (${response.status})`}`);
            }
            console.log(`Successfully deleted product ID: ${prodId} (Status: ${response.status})`);
            await fetchStoreData(token);
        } catch (err: any) {
             console.error("Delete error:", err);
             setActionError(`Delete failed: ${err.message || 'Unknown error'}`);
        }
        finally {
            setDeletingProductId(null);
        }
    };

    // --- Render Logic (Initial loading/error states UNCHANGED) ---
    if (checkingAuth) {
        return <p className="status-message loading">Checking Authentication...</p>;
    }
    if (loading) {
        return <p className="status-message loading">Loading Store Data...</p>;
    }
    if (error) {
        return (
            <section aria-labelledby="error-heading" className="store-error">
                <h2 id="error-heading">Error Loading Store</h2>
                <p>{error}</p>
                <button onClick={() => fetchStoreData()}>Try Again</button>
            </section>
        );
    }
    if (!store && !checkingAuth && !loading) {
        return (
            <section aria-labelledby="no-store-heading" className="no-store">
                <h2 id="no-store-heading">Store Not Found or Access Denied</h2>
                <p>You might need to create a store first, or check your permissions.</p>
                <a href="/create-store" className="button-link">Create a Store</a>
            </section>
        );
    }
    if (!store) {
        return <p className="status-message loading">Initializing Store...</p>;
    }


    // --- Main Component JSX ---
    return (
        <main className="my-store-container">

            {/* Store Header (UNCHANGED) */}
            <header className="store-header">
                <h1>{store.storeName}</h1>
                <button
                    className="add-product-button"
                    onClick={() => { /* ... */ setIsAddingProductFormVisible(prev => !prev); /* ... */ }}
                    disabled={isAddingProductLoading}
                    aria-expanded={isAddingProductFormVisible}
                    aria-controls="add-product-form-section"
                >
                    {isAddingProductFormVisible ? 'Cancel Add' : '+ Add Product'}
                </button>
            </header>

            {/* Action Errors (UNCHANGED) */}
            {actionError && !isEditModalOpen && !isAddingProductFormVisible && (
                <p role="alert" className="error-message action-error">{actionError}</p>
            )}

            {/* Add Product Form (UNCHANGED) */}
            {isAddingProductFormVisible && (
                <form id="add-product-form-section" className="add-product-form" onSubmit={(e) => e.preventDefault()}>
                    {/* ... form content unchanged ... */}
                     <h2>Add New Product</h2>
                    {actionError && <p role="alert" className="error-message action-error">{actionError}</p>}

                    <label htmlFor="add-prod-name">Name *</label>
                    <input id="add-prod-name" type="text" value={newProduct.name || ''} onChange={(e) => handleNewProductChange('name', e.target.value)} disabled={isAddingProductLoading} required />

                    <label htmlFor="add-prod-desc">Description *</label>
                    <textarea id="add-prod-desc" value={newProduct.description || ''} onChange={(e) => handleNewProductChange('description', e.target.value)} disabled={isAddingProductLoading} required />

                    <label htmlFor="add-prod-price">Price (R) *</label>
                    <input id="add-prod-price" type="number" step="0.01" min="0.01" value={newProduct.price || ''} onChange={(e) => handleNewProductChange('price', parseFloat(e.target.value) || 0)} disabled={isAddingProductLoading} required />

                    <label htmlFor="add-prod-cat">Category *</label>
                    <select id="add-prod-cat" value={newProduct.category || ''} onChange={(e) => handleNewProductChange('category', e.target.value)} disabled={isAddingProductLoading} required>
                        <option value="">Select Category</option>
                        {PRODUCT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>

                    <label htmlFor="new-product-image">Image *</label>
                    <input id="new-product-image" type="file" ref={addFileInputRef} onChange={handleNewProductImageChange} accept="image/*" required disabled={isAddingProductLoading} />
                    {newProduct.imagePreviewUrl && (
                        <img src={newProduct.imagePreviewUrl} alt="New product preview" className="image-preview add-preview" />
                    )}
                    <footer className="form-actions">
                        <button type="button" className="cancel-button" onClick={() => setIsAddingProductFormVisible(false)} disabled={isAddingProductLoading}>Cancel</button>
                        <button type="button" className="submit-button" onClick={handleAddProduct} disabled={isAddingProductLoading}>
                            {isAddingProductLoading ? 'Adding...' : 'Add Product'}
                        </button>
                    </footer>
                </form>
            )}

            {/* Product List Section (UNCHANGED) */}
            <section className="products-section" aria-labelledby="products-heading">
                 {/* ... h2, products-grid ul/li/article structure unchanged ... */}
                  <h2 id="products-heading">Your Products</h2>
                {(store.products && store.products.length > 0) ? (
                    <ul className="products-grid">
                        {store.products.map((product) => (
                            <li key={product.prodId}>
                                <article className="product-card">
                                    <figure className="product-image">
                                        {product.imageUrl ? (
                                            <img
                                                src={product.imageUrl}
                                                alt={product.name}
                                                onError={(e) => {
                                                    e.currentTarget.style.display = 'none';
                                                    const placeholder = e.currentTarget.nextElementSibling as HTMLElement;
                                                    if (placeholder) placeholder.style.display = 'flex';
                                                }}
                                            />
                                        ) : null}
                                        <p className="product-image-placeholder" style={{ display: product.imageUrl ? 'none' : 'flex' }}>
                                            No Image Available
                                        </p>
                                    </figure>
                                    <header>
                                       <h3>{product.name}</h3>
                                       <p className="product-price">R{product.price.toFixed(2)}</p>
                                    </header>
                                    <p className="product-category">{product.category}</p>
                                    <p className="product-description">{product.description}</p>
                                    <footer className="product-actions">
                                        <button
                                            className="edit-button"
                                            onClick={() => openEditModal(product)} // Triggers state change
                                            disabled={deletingProductId !== null || isSavingEdit}
                                            aria-label={`Edit ${product.name}`}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            className="delete-button"
                                            onClick={() => handleDeleteClick(product.prodId)}
                                            disabled={deletingProductId === product.prodId || isSavingEdit}
                                             aria-label={`Delete ${product.name}`}
                                        >
                                            {deletingProductId === product.prodId ? 'Deleting...' : 'Delete'}
                                        </button>
                                    </footer>
                                </article>
                            </li>
                        ))}
                    </ul>
                ) : (
                     <p className="no-products">
                        You haven't added any products to your store yet.
                        {!isAddingProductFormVisible && (
                            <button
                                className="add-first-product"
                                onClick={() => { /* ... */ setIsAddingProductFormVisible(true); /* ... */ }}
                                aria-controls="add-product-form-section"
                            >
                                Add Your First Product
                            </button>
                        )}
                    </p>
                )}
            </section>

            {/* Edit Product Modal */}
            {/* REMOVED the 'open' attribute - visibility controlled by useEffect/showModal */}
            {/* ADDED onClose handler to sync state if ESC is pressed */}
            <dialog
                ref={editDialogRef}
                className="modal-content"
                aria-labelledby="edit-modal-title"
                onClose={closeEditModal} // Sync state if dialog is closed via ESC
            >
                {/* Conditional rendering of content based on editingProduct still needed */}
                {editingProduct && (
                     // method="dialog" helps with form submission closing dialog, but we handle via buttons/state
                    <form method="dialog" onSubmit={(e) => e.preventDefault()}>
                         {/* Keep form content the same */}
                        <h2 id="edit-modal-title">Edit: {editingProduct.name}</h2>
                        {actionError && <p role="alert" className="error-message modal-error">{actionError}</p>}

                        <label htmlFor="edit-prod-name">Name *</label>
                        <input id="edit-prod-name" type="text" value={editFormData.name || ''} onChange={(e) => handleEditFormChange('name', e.target.value)} disabled={isSavingEdit} required />

                        <label htmlFor="edit-prod-desc">Description *</label>
                        <textarea id="edit-prod-desc" value={editFormData.description || ''} onChange={(e) => handleEditFormChange('description', e.target.value)} disabled={isSavingEdit} required />

                        <label htmlFor="edit-prod-price">Price (R) *</label>
                        <input id="edit-prod-price" type="number" step="0.01" min="0.01" value={editFormData.price || ''} onChange={(e) => handleEditFormChange('price', parseFloat(e.target.value) || 0)} disabled={isSavingEdit} required />

                        <label htmlFor="edit-prod-cat">Category *</label>
                        <select id="edit-prod-cat" value={editFormData.category || ''} onChange={(e) => handleEditFormChange('category', e.target.value)} disabled={isSavingEdit} required>
                            <option value="">Select Category</option>
                            {PRODUCT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>

                        <label htmlFor="edit-product-image">Replace Image (Optional)</label>
                        <input id="edit-product-image" type="file" ref={editFileInputRef} onChange={handleEditImageChange} accept="image/png, image/jpeg, image/webp, image/gif" disabled={isSavingEdit} />
                        {editProductPreview && (
                            <figure className="image-preview edit-preview">
                                <figcaption>Current/New Image Preview:</figcaption>
                                <img src={editProductPreview} alt="Edit preview" />
                            </figure>
                        )}

                        <footer className="form-actions modal-actions">
                            {/* Cancel button explicitly calls closeEditModal (which sets state) */}
                            <button type="button" className="cancel-button" onClick={closeEditModal} disabled={isSavingEdit}>Cancel</button>
                            {/* Save button triggers custom logic */}
                            <button type="button" className="submit-button" onClick={handleUpdateProduct} disabled={isSavingEdit}>
                                {isSavingEdit ? 'Saving...' : 'Save Changes'}
                            </button>
                        </footer>
                    </form>
                )}
            </dialog>

        </main>
    );
};

export default MyStore;
