// frontend/src/pages/MyStore.tsx
import React, { useState, useEffect, useCallback, useRef, ChangeEvent, Fragment } from 'react'; // Added Fragment
import { useAuth0 } from '@auth0/auth0-react'; // Assuming useAuth0 provides getAccessTokenSilently
import './myStore.css'; // Your component's CSS

// --- Frontend Type Definitions ---

// Product interface aligned with backend PRODUCT entity (excluding store/delivery info)
interface Product {
    prodId: number;         // Primary Key
    name: string;
    description: string;
    price: number;          // Stored as number (float4/real)
    category: string;
    productquantity: number; // Stored as number (int)
    imageUrl?: string | null; // Optional image URL
    storeId: string;        // Foreign Key to Store
    userId: string;         // Foreign Key to User (Owner)
    isActive?: boolean;
    // Delivery fields and storeName REMOVED - they are part of the Store object
}

// Store interface aligned with backend STORE entity
interface Store {
    storeId: string;        // Primary Key
    userId: string;         // Foreign Key to User
    storeName: string;
    standardPrice: number | null; // Stored as number (float4/real)
    standardTime: string | null;
    expressPrice: number | null; // Stored as number (float4/real)
    expressTime: string | null;
}

// State for editing (uses string for form inputs)
type EditableProductFields = Omit<Product,
    'prodId' | 'imageUrl' | 'storeId' | 'userId' | 'isActive' | // Non-editable IDs/meta
    'price' | 'productquantity' // Omit original number types
> & {
    price: string;          // Price as string for input
    productQuantity: string; // Quantity as string for input
};

// State for adding new product (uses string for form inputs)
type NewProductFields = Partial<Omit<Product, 'prodId' | 'imageUrl' | 'storeId' | 'userId' | 'isActive' | 'price' | 'productquantity' >> & {
    price?: string;
    productQuantity?: string;
    imageFile?: File | null;
    imagePreviewUrl?: string | null;
};

// --- Component ---
const MyStore: React.FC = () => {
    // --- Hooks ---
    const { loginWithRedirect, isAuthenticated, getAccessTokenSilently } = useAuth0();
    const baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

    // --- State ---
    const [checkingAuth, setCheckingAuth] = useState(true);
    const [loading, setLoading] = useState(true);
    const [storeData, setStoreData] = useState<{ store: Store; products: Product[] } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null); // Specific errors for add/edit/delete actions

    // Add Product State
    const initialNewProductState: NewProductFields = { name: '', description: '', price: '', category: '', productQuantity: '', imageFile: null, imagePreviewUrl: null };
    const [isAddingProductFormVisible, setIsAddingProductFormVisible] = useState(false);
    const [isAddingProductLoading, setIsAddingProductLoading] = useState(false);
    const [newProduct, setNewProduct] = useState<NewProductFields>(initialNewProductState);
    const addFileInputRef = useRef<HTMLInputElement>(null);

    // Edit Product State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null); // The original product being edited
    const [editFormData, setEditFormData] = useState<Partial<EditableProductFields>>({}); // Form data (strings)
    const [editProductImage, setEditProductImage] = useState<File | null>(null); // New image file for edit
    const [editProductPreview, setEditProductPreview] = useState<string>(''); // Preview URL (existing or new)
    const [isSavingEdit, setIsSavingEdit] = useState(false);
    const editFileInputRef = useRef<HTMLInputElement>(null);
    const editDialogRef = useRef<HTMLDialogElement>(null);

    // Delete Product State
    const [deletingProductId, setDeletingProductId] = useState<number | null>(null);

    // --- Constants --- (Assuming PRODUCT_CATEGORIES is defined/imported)
    const PRODUCT_CATEGORIES = [ 'Home & Living', 'Jewellery & Accessories', /* ... other categories */ ];

    // --- Utility & Fetching Functions ---
    const getToken = useCallback(async (): Promise<string | null> => {
        try {
            // Prefer sessionStorage first if available and recent
            const storedToken = sessionStorage.getItem('access_token');
            // Add check for token expiry if you store expiry time
            if (storedToken) return storedToken;

            // If not authenticated via Auth0, redirect (or handle as appropriate)
            if (!isAuthenticated) {
                console.log("User not authenticated, redirecting to login.");
                await loginWithRedirect({ appState: { returnTo: window.location.pathname } });
                return null; // Should not reach here after redirect
            }
            // Get fresh token using Auth0 SDK
            const freshToken = await getAccessTokenSilently();
            sessionStorage.setItem('access_token', freshToken); // Store fresh token
            return freshToken;
        } catch (error) {
            console.error('Error getting access token:', error);
            sessionStorage.removeItem('access_token'); // Clear potentially invalid token
             // Optionally redirect to login if token fetch fails critically
             if (error instanceof Error && (error.message.includes('consent_required') || error.message.includes('login_required'))) {
                 await loginWithRedirect({ appState: { returnTo: window.location.pathname } });
             }
            return null;
        }
    }, [getAccessTokenSilently, isAuthenticated, loginWithRedirect]);

    // Upload Image (Ensure implementation matches backend endpoint)
    const uploadImageToBackend = async (file: File, token: string): Promise<string> => {
        const imgFormData = new FormData();
        imgFormData.append('file', file);
        const res = await fetch(`${baseUrl}/upload/image`, { // Assuming this is your upload endpoint
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: imgFormData,
        });
        if (!res.ok) {
            const errorData = await res.json().catch(() => ({ message: 'Failed to parse upload error response' }));
            throw new Error(`Failed to upload image: ${errorData.message || res.statusText}`);
        }
        const data = await res.json();
        if (!data.url) {
            throw new Error(`Image upload succeeded but response did not contain a URL.`);
        }
        return data.url;
    };

    // Fetch Store and Product Data
    const fetchStoreData = useCallback(async (currentToken?: string) => {
        setLoading(true);
        setError(null);
        setActionError(null); // Clear action errors on refresh
        const token = currentToken || await getToken();
        if (!token) {
            setError("Authentication failed. Please try logging in again.");
            setLoading(false);
            setCheckingAuth(false); // Finished auth check (failed)
            return;
        }
        try {
            const response = await fetch(`${baseUrl}/stores/my-store`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (!response.ok) {
                if (response.status === 404) {
                    // Specific handling for 404 (Store not found for user)
                     setError("Store not found. You might need to create your store first.");
                     setStoreData(null); // Explicitly set to null
                } else {
                     const errorData = await response.json().catch(() => ({ message: 'Failed to fetch store data' }));
                    throw new Error(errorData.message || `Error fetching store data: ${response.statusText}`);
                }
            } else {
                 const fetchedData: { store: Store; products: Product[] } = await response.json();
                 if (!fetchedData || !fetchedData.store) { throw new Error("Invalid data received from server."); }
                 // Ensure products is always an array
                 fetchedData.products = Array.isArray(fetchedData.products) ? fetchedData.products : [];
                 setStoreData(fetchedData);
            }
        } catch (err: any) {
            console.error("Error in fetchStoreData:", err);
             if (error !== "Store not found. You might need to create your store first."){ // Avoid overwriting specific 404 error
                 setError(err.message || "An unknown error occurred while fetching store data.");
             }
             setStoreData(null); // Clear data on error
        } finally {
            setLoading(false);
            setCheckingAuth(false); // Finished auth check (success or failure)
        }
    }, [baseUrl, getToken, error]); // Added error dependency to avoid loop if error is set to the 404 message

    // Effect for Initial Auth Check and Data Load
    useEffect(() => {
        const checkAuthAndLoad = async () => {
            if (!isAuthenticated) {
                // If Auth0 reports not authenticated, wait briefly or redirect
                console.log("Auth0 not ready or user not logged in.");
                // Optional: Add a small delay or check status before redirecting immediately
                // setTimeout(() => { if (!isAuthenticated) loginWithRedirect(...) }, 1000);
                setCheckingAuth(false); // Stop checking auth display
                setLoading(false);      // Stop loading display
                return; // Don't fetch data if not authenticated
            }
            setCheckingAuth(false); // Auth0 is ready (or thinks it is)
            await fetchStoreData(); // Fetch data now that we expect to be authenticated
        };
        checkAuthAndLoad();
    }, [isAuthenticated, loginWithRedirect, fetchStoreData]); // Rerun if isAuthenticated changes


    // Effect to control the dialog modal state
    useEffect(() => {
        const dialog = editDialogRef.current;
        if (dialog) {
            if (isEditModalOpen) {
                dialog.showModal();
            } else {
                dialog.close();
            }
        }
    }, [isEditModalOpen]);

    // --- CRUD Handlers ---

    const handleNewProductChange = (field: keyof Omit<NewProductFields, 'imageFile' | 'imagePreviewUrl'>, value: string) => {
        setNewProduct(prev => ({ ...prev, [field]: value }));
    };

    const handleNewProductImageChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setNewProduct(prev => ({ ...prev, imageFile: file, imagePreviewUrl: reader.result as string }));
            };
            reader.readAsDataURL(file);
        } else {
            setNewProduct(prev => ({ ...prev, imageFile: null, imagePreviewUrl: null }));
        }
    };

    const handleAddProduct = async () => {
        if (!storeData || !storeData.store) {
            setActionError("Cannot add product: Store data is missing.");
            return;
        }
        setActionError(null);
        setIsAddingProductLoading(true);
        const token = await getToken();
        if (!token) { setActionError("Authentication error."); setIsAddingProductLoading(false); return; }

        // Validate required fields
        if (!newProduct.name || !newProduct.price || !newProduct.category || !newProduct.productQuantity || !newProduct.imageFile) {
            setActionError("Please fill in all required fields (Name, Price, Category, Quantity) and select an image.");
            setIsAddingProductLoading(false);
            return;
        }

        // Parse price and quantity
        const priceNum = parseFloat(newProduct.price);
        const quantityNum = parseInt(newProduct.productQuantity, 10);
        if (isNaN(priceNum) || priceNum <= 0 || isNaN(quantityNum) || quantityNum < 0) {
             setActionError("Please enter valid positive numbers for Price and Quantity.");
             setIsAddingProductLoading(false);
             return;
        }


        try {
            // 1. Upload Image
            const imageUrl = await uploadImageToBackend(newProduct.imageFile, token);

            // 2. Prepare Payload (matches CreateProductDto backend)
            const payload = {
                name: newProduct.name,
                description: newProduct.description || '', // Ensure description is string or empty string
                price: priceNum,
                category: newProduct.category,
                imageUrl: imageUrl,
                productquantity: quantityNum,
                // storeId and userId are handled by the backend controller/service context
            };

            // 3. Send API Request
            const response = await fetch(`${baseUrl}/stores/products`, { // POST to /stores/products
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Failed to add product' }));
                throw new Error(errorData.message || `Error adding product: ${response.statusText}`);
            }

            // 4. Success: Reset form, hide it, and refresh data
            setNewProduct(initialNewProductState);
            setIsAddingProductFormVisible(false);
            await fetchStoreData(token); // Refresh store data to show new product

        } catch (err: any) {
            console.error("Error adding product:", err);
            setActionError(err.message || "An unknown error occurred while adding the product.");
        } finally {
            setIsAddingProductLoading(false);
        }
    };

    const openEditModal = (product: Product) => {
        setEditingProduct(product);
        setEditFormData({ // Populate form with string versions
            name: product.name,
            description: product.description,
            price: product.price.toString(),
            category: product.category,
            productQuantity: product.productquantity.toString()
        });
        setEditProductImage(null); // Reset new image file input
        setEditProductPreview(product.imageUrl || ''); // Show existing image
        setActionError(null); // Clear previous action errors
        setIsEditModalOpen(true);
    };

    const closeEditModal = () => {
        setIsEditModalOpen(false);
        setEditingProduct(null);
        setEditFormData({});
        setEditProductImage(null);
        setEditProductPreview('');
    };

    const handleEditFormChange = (field: keyof EditableProductFields, value: string) => {
        setEditFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleEditImageChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setEditProductImage(file); // Store the new file
            const reader = new FileReader();
            reader.onloadend = () => {
                setEditProductPreview(reader.result as string); // Update preview
            };
            reader.readAsDataURL(file);
        } else {
             // Optional: Revert preview if file is cleared, or keep showing existing?
             // setEditProductImage(null);
             // setEditProductPreview(editingProduct?.imageUrl || '');
        }
    };

    const handleUpdateProduct = async () => {
         if (!editingProduct) { setActionError("No product selected for editing."); return; }
         setActionError(null);
         setIsSavingEdit(true);
         const token = await getToken();
         if (!token) { setActionError("Authentication error."); setIsSavingEdit(false); return; }

         // Validate and parse required fields from editFormData
         const priceNum = parseFloat(editFormData.price ?? '');
         const quantityNum = parseInt(editFormData.productQuantity ?? '', 10);
         if (isNaN(priceNum) || priceNum <= 0 || isNaN(quantityNum) || quantityNum < 0) {
            setActionError("Please enter valid positive numbers for Price and Quantity.");
            setIsSavingEdit(false);
            return;
         }


         try {
             let imageUrl = editingProduct.imageUrl; // Start with existing URL

             // 1. Upload new image ONLY if a new one was selected
             if (editProductImage) {
                 imageUrl = await uploadImageToBackend(editProductImage, token);
             }

             // 2. Prepare Payload (matches UpdateProductDto backend - only send changed fields + maybe image)
             const payload: Partial<Product & { imageUrl?: string | null }> = {}; // Use Partial<Product> for update DTO shape
             // Compare with original editingProduct state to only send changes
             if (editFormData.name !== editingProduct.name) payload.name = editFormData.name;
             if (editFormData.description !== editingProduct.description) payload.description = editFormData.description;
             if (priceNum !== editingProduct.price) payload.price = priceNum;
             if (editFormData.category !== editingProduct.category) payload.category = editFormData.category;
             if (quantityNum !== editingProduct.productquantity) payload.productquantity = quantityNum;
             if (imageUrl !== editingProduct.imageUrl) payload.imageUrl = imageUrl; // Send image URL only if it changed

             // Check if any data actually changed
              if (Object.keys(payload).length === 0) {
                  setActionError("No changes detected.");
                  setIsSavingEdit(false);
                  // Optionally close modal here if desired: closeEditModal();
                  return;
              }

             // 3. Send API Request
             const response = await fetch(`${baseUrl}/stores/products/${editingProduct.prodId}`, { // PATCH to /stores/products/:id
                 method: 'PATCH',
                 headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                 body: JSON.stringify(payload),
             });

             if (!response.ok) {
                 const errorData = await response.json().catch(() => ({ message: 'Failed to update product' }));
                 throw new Error(errorData.message || `Error updating product: ${response.statusText}`);
             }

             // 4. Success: Close modal and refresh data
             closeEditModal();
             await fetchStoreData(token); // Refresh store data

         } catch (err: any) {
             console.error(`Error updating product ${editingProduct.prodId}:`, err);
             setActionError(err.message || "An unknown error occurred while saving changes.");
         } finally {
             setIsSavingEdit(false);
         }
     };


    const handleDeleteClick = (prodId: number) => {
        // Optional: Show a confirmation dialog before setting state
        if (window.confirm("Are you sure you want to delete this product? This cannot be undone.")) {
            setDeletingProductId(prodId); // Set the ID to trigger the delete effect/function
            confirmDelete(prodId); // Call the delete function immediately
        }
    };

    const confirmDelete = async (prodId: number) => {
        setActionError(null);
        const token = await getToken();
        if (!token) { setActionError("Authentication error."); setDeletingProductId(null); return; }

        try {
            const response = await fetch(`${baseUrl}/stores/products/${prodId}`, { // DELETE to /stores/products/:id
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
            });

            if (!response.ok) { // Status 204 (No Content) is also OK here
                 if (response.status === 204) {
                    // Success case for DELETE
                 } else {
                     const errorData = await response.json().catch(() => ({ message: 'Failed to delete product' }));
                     throw new Error(errorData.message || `Error deleting product: ${response.statusText}`);
                 }
            }

            // Success: Refresh data
            await fetchStoreData(token); // Refresh store data

        } catch (err: any) {
            console.error(`Error deleting product ${prodId}:`, err);
            setActionError(err.message || "An unknown error occurred while deleting the product.");
        } finally {
            setDeletingProductId(null); // Clear deleting state regardless of outcome
        }
    };


    // --- Render Logic ---
    if (checkingAuth) return <p>Checking Authentication...</p>; // Improved message
    if (loading) return <p>Loading Your Store...</p>; // Improved message

    // Handle case where user is authenticated but has no store (specific error set in fetch)
     if (error && error.includes("Store not found")) {
         return (
             <section className="my-store-container my-store-error">
                 <h2>Store Not Found</h2>
                 <p>It looks like you haven't created your store yet.</p>
                 {/* Link/Button to navigate to the Create Store page */}
                 <a href="/create-store" className="button-primary">Create Your Store</a>
             </section>
         );
     }

     // Handle other general errors during initial load
     if (error) {
         return (
             <section className="my-store-container my-store-error">
                 <h2>Error Loading Store</h2>
                 <p>{error}</p>
                 <button onClick={() => fetchStoreData()} className="button-secondary">Retry</button>
             </section>
         );
     }

    // If loading is finished and no error, but storeData is still null (shouldn't happen often with new logic)
     if (!storeData) {
        return (
            <section className="my-store-container">
                <p>Initializing store data... If this persists, please try refreshing.</p>
            </section>
         );
     }

    // Destructure store and products after checks
    const { store, products } = storeData;

    // --- Main Component JSX ---
    return (
        <main className="my-store-container">
            <header className="store-header">
                 <h1>{store.storeName}</h1>

                 {/* --- Display Delivery Info --- */}
                 <section className="delivery-info-display">
                    <h2>Delivery Settings</h2>
                    <dl> {/* Definition List for semantics */}
                        <Fragment>
                            <dt>Standard Delivery:</dt>
                            <dd>
                                {/* USE 'R' for Rand */}
                                {store.standardPrice !== null ? `R${store.standardPrice.toFixed(2)}` : 'N/A'}
                                {' / '}
                                {store.standardTime ? `${store.standardTime} Days` : 'N/A'}
                            </dd>
                        </Fragment>
                         <Fragment>
                            <dt>Express Delivery:</dt>
                            <dd>
                                {/* USE 'R' for Rand */}
                                {store.expressPrice !== null ? `R${store.expressPrice.toFixed(2)}` : 'N/A'}
                                {' / '}
                                {store.expressTime ? `${store.expressTime} Days` : 'N/A'}
                            </dd>
                        </Fragment>
                    </dl>
                    <p className="info-text">Delivery options are set during store creation and cannot be edited here.</p>
                 </section>
                 {/* --- End Delivery Info --- */}

                 <button
                     onClick={() => setIsAddingProductFormVisible(prev => !prev)}
                     className="button-primary add-product-toggle-btn"
                    >
                    {isAddingProductFormVisible ? 'Cancel Add Product' : 'Add New Product'}
                 </button>
            </header>

            {/* Add Product Form */}
            {isAddingProductFormVisible && (
                <section className="add-product-form-section">
                    <h2>Add New Product</h2>
                    <form onSubmit={(e) => { e.preventDefault(); handleAddProduct(); }}>
                        {/* Name */}
                        <label htmlFor="newProdName">Product Name:</label>
                        <input id="newProdName" type="text" value={newProduct.name ?? ''} onChange={(e) => handleNewProductChange('name', e.target.value)} required disabled={isAddingProductLoading} />

                         {/* Description */}
                        <label htmlFor="newProdDesc">Description:</label>
                        <textarea id="newProdDesc" value={newProduct.description ?? ''} onChange={(e) => handleNewProductChange('description', e.target.value)} disabled={isAddingProductLoading}></textarea>

                         {/* Price */}
                        <label htmlFor="newProdPrice">Price (R):</label> {/* Updated Label */}
                        <input id="newProdPrice" type="number" value={newProduct.price ?? ''} onChange={(e) => handleNewProductChange('price', e.target.value)} required min="0.01" step="0.01" disabled={isAddingProductLoading} />

                         {/* Quantity */}
                        <label htmlFor="newProdQuantity">Quantity:</label>
                        <input id="newProdQuantity" type="number" value={newProduct.productQuantity ?? ''} onChange={(e) => handleNewProductChange('productQuantity', e.target.value)} required min="0" step="1" disabled={isAddingProductLoading} />

                         {/* Category */}
                         <label htmlFor="newProdCategory">Category:</label>
                         <select id="newProdCategory" value={newProduct.category ?? ''} onChange={(e) => handleNewProductChange('category', e.target.value)} required disabled={isAddingProductLoading}>
                             <option value="" disabled>Select a category...</option>
                             {PRODUCT_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                         </select>

                        {/* Image Upload */}
                        <label htmlFor="newProdImage">Image:</label>
                        <input id="newProdImage" type="file" accept="image/*" ref={addFileInputRef} onChange={handleNewProductImageChange} required disabled={isAddingProductLoading} />
                        {newProduct.imagePreviewUrl && <img src={newProduct.imagePreviewUrl} alt="New product preview" className="image-preview" />}

                        {actionError && <p className="error-message">{actionError}</p>}

                        <button type="submit" disabled={isAddingProductLoading} className="button-confirm">
                            {isAddingProductLoading ? 'Adding...' : 'Confirm Add Product'}
                        </button>
                         <button type="button" onClick={() => setIsAddingProductFormVisible(false)} disabled={isAddingProductLoading} className="button-cancel">Cancel</button>
                    </form>
                </section>
            )}

            {/* Product List Section */}
            <section className="products-section">
                  <h2>Your Products</h2>
                 {(products && products.length > 0) ? (
                     <ul className="product-list">
                         {products.map((product) => (
                             <li key={product.prodId} className="product-list-item">
                                 <article className="product-card">
                                     <img src={product.imageUrl || '/placeholder-image.png'} alt={product.name} className="product-image"/>
                                     <div className="product-details">
                                         <h3>{product.name}</h3>
                                         <p className="product-description">{product.description}</p>
                                         <p className="product-category">Category: {product.category}</p>
                                         {/* Use R for Product Price */}
                                         <p className="product-price">Price: R{product.price.toFixed(2)}</p>
                                         <p className="product-quantity">Quantity: {product.productquantity}</p>
                                         {/* Add other details like isActive if needed */}
                                     </div>
                                     <div className="product-actions">
                                         <button onClick={() => openEditModal(product)} className="button-edit" disabled={deletingProductId === product.prodId}>Edit</button>
                                         <button
                                             onClick={() => handleDeleteClick(product.prodId)}
                                             className="button-delete"
                                             disabled={deletingProductId === product.prodId} // Disable while deleting this specific item
                                            >
                                            {deletingProductId === product.prodId ? 'Deleting...' : 'Delete'}
                                         </button>
                                     </div>
                                 </article>
                             </li>
                         ))}
                     </ul>
                 ) : (
                     <p>You haven't added any products yet.</p>
                 )}
             </section>

            {/* Edit Product Modal */}
             {/* Using standard dialog element */}
            <dialog ref={editDialogRef} onClose={closeEditModal} className="edit-product-modal">
                 {editingProduct && (
                    <form onSubmit={(e) => { e.preventDefault(); handleUpdateProduct(); }} method="dialog">
                        <h2>Edit Product: {editingProduct.name}</h2>

                        {/* Name */}
                        <label htmlFor="editProdName">Product Name:</label>
                        <input id="editProdName" type="text" value={editFormData.name || ''} onChange={(e) => handleEditFormChange('name', e.target.value)} required disabled={isSavingEdit}/>

                        {/* Description */}
                         <label htmlFor="editProdDesc">Description:</label>
                        <textarea id="editProdDesc" value={editFormData.description || ''} onChange={(e) => handleEditFormChange('description', e.target.value)} disabled={isSavingEdit}></textarea>

                         {/* Price */}
                        <label htmlFor="editProdPrice">Price (R):</label> {/* Updated Label */}
                        <input id="editProdPrice" type="number" value={editFormData.price || ''} onChange={(e) => handleEditFormChange('price', e.target.value)} required min="0.01" step="0.01" disabled={isSavingEdit}/>

                         {/* Quantity */}
                        <label htmlFor="editProdQuantity">Quantity:</label>
                        <input id="editProdQuantity" type="number" value={editFormData.productQuantity || ''} onChange={(e) => handleEditFormChange('productQuantity', e.target.value)} required min="0" step="1" disabled={isSavingEdit}/>

                         {/* Category */}
                         <label htmlFor="editProdCategory">Category:</label>
                         <select id="editProdCategory" value={editFormData.category || ''} onChange={(e) => handleEditFormChange('category', e.target.value)} required disabled={isSavingEdit}>
                             <option value="" disabled>Select category...</option>
                             {PRODUCT_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                         </select>

                        {/* Image Upload */}
                        <label htmlFor="editProdImage">Replace Image (Optional):</label>
                        <input id="editProdImage" type="file" accept="image/*" ref={editFileInputRef} onChange={handleEditImageChange} disabled={isSavingEdit}/>
                         {editProductPreview && <img src={editProductPreview} alt="Product preview" className="image-preview" />}

                        {actionError && <p className="error-message">{actionError}</p>}

                        <footer className="modal-actions">
                            <button type="submit" disabled={isSavingEdit} className="button-confirm">
                                {isSavingEdit ? 'Saving...' : 'Save Changes'}
                            </button>
                             {/* Use button type="button" for cancel or method="dialog" form attribute */}
                             <button type="button" onClick={closeEditModal} disabled={isSavingEdit} className="button-cancel">Cancel</button>
                         </footer>
                    </form>
                 )}
             </dialog>
        </main>
    );
};

export default MyStore;