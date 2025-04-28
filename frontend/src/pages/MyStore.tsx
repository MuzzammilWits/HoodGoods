// frontend/src/pages/MyStore.tsx
import React, { useState, useEffect, useCallback, useRef, ChangeEvent, Fragment } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import './myStore.css'; // Your component's CSS
// Import delivery time constants and categories
import { PRODUCT_CATEGORIES, STANDARD_DELIVERY_TIMES, EXPRESS_DELIVERY_TIMES } from '../types/createStore';

// --- Frontend Type Definitions ---

interface Product {
    prodId: number; name: string; description: string; price: number; category: string;
    productquantity: number; imageUrl?: string | null; storeId: string; userId: string; isActive?: boolean;
}

interface Store {
    storeId: string; userId: string; storeName: string;
    standardPrice: number | null; standardTime: string | null;
    expressPrice: number | null; expressTime: string | null;
}

// State for editing product (uses string for form inputs)
type EditableProductFields = Omit<Product, 'prodId' | 'imageUrl' | 'storeId' | 'userId' | 'isActive' | 'price' | 'productquantity'> & {
    price: string; productQuantity: string;
};

// State for adding new product (uses string for form inputs)
type NewProductFields = Partial<Omit<Product, 'prodId' | 'imageUrl' | 'storeId' | 'userId' | 'isActive' | 'price' | 'productquantity' >> & {
    price?: string; productQuantity?: string; imageFile?: File | null; imagePreviewUrl?: string | null;
};

// --- NEW: Type for Delivery Edit Form State ---
interface EditableDeliveryFields {
    standardPrice: string;
    standardTime: string;
    expressPrice: string;
    expressTime: string;
}
// --- End NEW Type ---


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
    const [actionError, setActionError] = useState<string | null>(null);

    // Add Product State
    const initialNewProductState: NewProductFields = { name: '', description: '', price: '', category: '', productQuantity: '', imageFile: null, imagePreviewUrl: null };
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
    const editDialogRef = useRef<HTMLDialogElement>(null);

    // Delete Product State
    const [deletingProductId, setDeletingProductId] = useState<number | null>(null);

    // --- NEW: Edit Delivery State ---
    const [isEditingDelivery, setIsEditingDelivery] = useState(false);
    const [isSavingDelivery, setIsSavingDelivery] = useState(false);
    const [editDeliveryData, setEditDeliveryData] = useState<EditableDeliveryFields>({
        standardPrice: '', standardTime: '', expressPrice: '', expressTime: ''
    });
    // --- End NEW State ---


    // --- Utility & Fetching Functions ---
    const getToken = useCallback(async (): Promise<string | null> => {
        // ... (getToken implementation - unchanged) ...
        try {
            const storedToken = sessionStorage.getItem('access_token');
            if (storedToken) return storedToken;
            if (!isAuthenticated) {
                await loginWithRedirect({ appState: { returnTo: window.location.pathname } });
                return null;
            }
            const freshToken = await getAccessTokenSilently();
            sessionStorage.setItem('access_token', freshToken);
            return freshToken;
        } catch (error) {
            console.error('Error getting access token:', error);
            sessionStorage.removeItem('access_token');
             if (error instanceof Error && (error.message.includes('consent_required') || error.message.includes('login_required'))) {
                 await loginWithRedirect({ appState: { returnTo: window.location.pathname } });
             }
            return null;
        }
    }, [getAccessTokenSilently, isAuthenticated, loginWithRedirect]);

    const uploadImageToBackend = async (file: File, token: string): Promise<string> => {
        // ... (uploadImageToBackend implementation - unchanged) ...
        const imgFormData = new FormData();
        imgFormData.append('file', file);
        const res = await fetch(`${baseUrl}/upload/image`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: imgFormData,
        });
        if (!res.ok) {
            const errorData = await res.json().catch(() => ({ message: 'Failed to parse upload error response' }));
            throw new Error(`Failed to upload image: ${errorData.message || res.statusText}`);
        }
        const data = await res.json();
        if (!data.url) throw new Error(`Image upload succeeded but response did not contain a URL.`);
        return data.url;
    };

    const fetchStoreData = useCallback(async (currentToken?: string) => {
        // ... (fetchStoreData implementation - unchanged) ...
        setLoading(true); setError(null); setActionError(null);
        const token = currentToken || await getToken();
        if (!token) { setError("Authentication failed."); setLoading(false); setCheckingAuth(false); return; }
        try {
            const response = await fetch(`${baseUrl}/stores/my-store`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) {
                if (response.status === 404) { setError("Store not found. You might need to create your store first."); setStoreData(null); }
                else { const e = await response.json().catch(()=>(null)); throw new Error(e?.message || `Error fetching store data: ${response.statusText}`); }
            } else {
                 const fetchedData: { store: Store; products: Product[] } = await response.json();
                 if (!fetchedData || !fetchedData.store) { throw new Error("Invalid data received."); }
                 fetchedData.products = Array.isArray(fetchedData.products) ? fetchedData.products : [];
                 setStoreData(fetchedData);
                 // Ensure delivery edit state is reset if fetch happens while editing
                 setIsEditingDelivery(false);
            }
        } catch (err: any) {
            console.error("Error fetching store data:", err);
             if (error !== "Store not found. You might need to create your store first."){ setError(err.message || "Unknown error fetching store data."); }
             setStoreData(null);
        } finally { setLoading(false); setCheckingAuth(false); }
    }, [baseUrl, getToken, error]); // Keep error dependency

    // Effect for Initial Auth Check and Data Load
    useEffect(() => {
        // ... (initial load effect - unchanged) ...
        const checkAuthAndLoad = async () => {
            if (!isAuthenticated) { console.log("Auth0 not ready."); setCheckingAuth(false); setLoading(false); return; }
            setCheckingAuth(false); await fetchStoreData();
        };
        checkAuthAndLoad();
    }, [isAuthenticated, loginWithRedirect, fetchStoreData]);

    // Effect to control the product edit dialog modal state
    useEffect(() => {
        // ... (product edit modal effect - unchanged) ...
         const dialog = editDialogRef.current; if (dialog) { if (isEditModalOpen) dialog.showModal(); else dialog.close(); }
    }, [isEditModalOpen]);


    // --- Delivery Edit Handlers ---
    const toggleEditDeliveryMode = () => {
        if (!storeData) return; // Should not happen if button is visible
        if (!isEditingDelivery) {
            // Entering edit mode: populate form from current store data
            setEditDeliveryData({
                standardPrice: storeData.store.standardPrice?.toString() ?? '',
                standardTime: storeData.store.standardTime ?? STANDARD_DELIVERY_TIMES[0], // Default if null
                expressPrice: storeData.store.expressPrice?.toString() ?? '',
                expressTime: storeData.store.expressTime ?? EXPRESS_DELIVERY_TIMES[0], // Default if null
            });
            setActionError(null); // Clear previous errors
            setIsEditingDelivery(true);
        } else {
            // Cancelling edit mode
            setIsEditingDelivery(false);
            setActionError(null);
        }
    };

    const handleDeliveryFieldChange = (field: keyof EditableDeliveryFields, value: string) => {
        setEditDeliveryData(prev => ({ ...prev, [field]: value }));
    };

    const handleSaveDeliveryOptions = async () => {
        if (!storeData) { setActionError("Store data not available."); return; }
        setActionError(null);
        setIsSavingDelivery(true);
        const token = await getToken();
        if (!token) { setActionError("Authentication error."); setIsSavingDelivery(false); return; }

        // --- Frontend Validation ---
        const standardPriceNum = parseFloat(editDeliveryData.standardPrice);
        const expressPriceNum = parseFloat(editDeliveryData.expressPrice);

        if (isNaN(standardPriceNum) || standardPriceNum < 0) {
            setActionError("Standard delivery price must be a non-negative number.");
            setIsSavingDelivery(false); return;
        }
        if (isNaN(expressPriceNum) || expressPriceNum < 0) {
             setActionError("Express delivery price must be a non-negative number.");
             setIsSavingDelivery(false); return;
        }
         if (!editDeliveryData.standardTime) {
            setActionError("Please select a standard delivery time.");
            setIsSavingDelivery(false); return;
        }
         if (!editDeliveryData.expressTime) {
            setActionError("Please select an express delivery time.");
            setIsSavingDelivery(false); return;
        }
        // --- End Validation ---

        // --- Prepare Payload (matches UpdateStoreDto) ---
        // Optimization: Only send fields that have actually changed
        const payload: Partial<Store> = {}; // Use Partial<Store> for Update DTO shape
        const originalStore = storeData.store;

        if (standardPriceNum !== originalStore.standardPrice) payload.standardPrice = standardPriceNum;
        if (editDeliveryData.standardTime !== originalStore.standardTime) payload.standardTime = editDeliveryData.standardTime;
        if (expressPriceNum !== originalStore.expressPrice) payload.expressPrice = expressPriceNum;
        if (editDeliveryData.expressTime !== originalStore.expressTime) payload.expressTime = editDeliveryData.expressTime;

        // If no changes, inform user and exit
         if (Object.keys(payload).length === 0) {
             setActionError("No changes were made to delivery options.");
             setIsSavingDelivery(false);
             setIsEditingDelivery(false); // Optionally exit edit mode
             return;
         }
        // --- End Payload Preparation ---

        try {
            // --- Send API Request ---
            const response = await fetch(`${baseUrl}/stores/my-store/delivery`, { // PATCH to the new endpoint
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Failed to save delivery options' }));
                throw new Error(errorData.message || `Error saving delivery options: ${response.statusText}`);
            }

            const updatedStore: Store = await response.json();

            // --- Success: Update local state and exit edit mode ---
            setStoreData(prevData => prevData ? { ...prevData, store: updatedStore } : null);
            setIsEditingDelivery(false);
            // Optionally show a success message briefly
            // setActionSuccess("Delivery options updated successfully!"); setTimeout(()=>setActionSuccess(null), 3000);

        } catch (err: any) {
            console.error("Error saving delivery options:", err);
            setActionError(err.message || "An unknown error occurred while saving delivery options.");
        } finally {
            setIsSavingDelivery(false);
        }
    };

    const handleCancelEditDelivery = () => {
        setIsEditingDelivery(false);
        setActionError(null);
        // No need to reset editDeliveryData, toggleEditDeliveryMode will repopulate it next time
    };
    // --- End Delivery Edit Handlers ---


    // --- Product CRUD Handlers (Add, Edit, Delete - Unchanged) ---
    const handleNewProductChange = (field: keyof Omit<NewProductFields, 'imageFile' | 'imagePreviewUrl'>, value: string) => {
        // ... (implementation unchanged) ...
         setNewProduct(prev => ({ ...prev, [field]: value }));
    };
    const handleNewProductImageChange = (e: ChangeEvent<HTMLInputElement>) => {
        // ... (implementation unchanged) ...
        const file = e.target.files?.[0]; if(file){ const r=new FileReader(); r.onloadend=()=>setNewProduct(p=>({...p, imageFile:file, imagePreviewUrl:r.result as string})); r.readAsDataURL(file); } else { setNewProduct(p=>({...p, imageFile:null, imagePreviewUrl:null})); }
    };
    const handleAddProduct = async () => {
        // ... (implementation unchanged - ensures price/qty parsed to number) ...
        if (!storeData?.store) { setActionError("Store data missing."); return; }
        setActionError(null); setIsAddingProductLoading(true);
        const token = await getToken(); if (!token) { setActionError("Auth error."); setIsAddingProductLoading(false); return; }
        if (!newProduct.name||!newProduct.price||!newProduct.category||!newProduct.productQuantity||!newProduct.imageFile) { setActionError("Fill required fields & image."); setIsAddingProductLoading(false); return; }
        const priceNum=parseFloat(newProduct.price); const quantityNum=parseInt(newProduct.productQuantity,10);
        if(isNaN(priceNum)||priceNum<=0||isNaN(quantityNum)||quantityNum<0){ setActionError("Valid price/quantity needed."); setIsAddingProductLoading(false); return; }
        try {
            const imageUrl = await uploadImageToBackend(newProduct.imageFile, token);
            const payload={name:newProduct.name,description:newProduct.description||'',price:priceNum,category:newProduct.category,imageUrl:imageUrl,productquantity:quantityNum};
            const res = await fetch(`${baseUrl}/stores/products`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (!res.ok) { const e=await res.json().catch(()=>({message:'Failed to add product'})); throw new Error(e.message || `Error: ${res.statusText}`); }
            setNewProduct(initialNewProductState); setIsAddingProductFormVisible(false); await fetchStoreData(token);
        } catch (err: any) { console.error("Error adding product:", err); setActionError(err.message || "Unknown error adding product."); }
        finally { setIsAddingProductLoading(false); }
    };
    const openEditModal = (product: Product) => {
        // ... (implementation unchanged - sets strings in editFormData) ...
         setEditingProduct(product); setEditFormData({ name: product.name, description: product.description, price: product.price.toString(), category: product.category, productQuantity: product.productquantity.toString() }); setEditProductImage(null); setEditProductPreview(product.imageUrl || ''); setActionError(null); setIsEditModalOpen(true);
    };
    const closeEditModal = () => {
        // ... (implementation unchanged) ...
         setIsEditModalOpen(false); setEditingProduct(null); setEditFormData({}); setEditProductImage(null); setEditProductPreview('');
    };
    const handleEditFormChange = (field: keyof EditableProductFields, value: string) => {
        // ... (implementation unchanged) ...
         setEditFormData(prev => ({ ...prev, [field]: value }));
    };
    const handleEditImageChange = (e: ChangeEvent<HTMLInputElement>) => {
        // ... (implementation unchanged) ...
         const file = e.target.files?.[0]; if(file){ setEditProductImage(file); const r=new FileReader(); r.onloadend=()=>setEditProductPreview(r.result as string); r.readAsDataURL(file); }
    };
    const handleUpdateProduct = async () => {
        // ... (implementation unchanged - parses price/qty, sends only changed fields) ...
         if (!editingProduct) { setActionError("No product selected."); return; } setActionError(null); setIsSavingEdit(true);
         const token = await getToken(); if (!token) { setActionError("Auth error."); setIsSavingEdit(false); return; }
         const priceNum=parseFloat(editFormData.price??''); const quantityNum=parseInt(editFormData.productQuantity??'',10);
         if(isNaN(priceNum)||priceNum<=0||isNaN(quantityNum)||quantityNum<0){ setActionError("Valid price/quantity."); setIsSavingEdit(false); return; }
         try {
             let imageUrl = editingProduct.imageUrl; if (editProductImage) { imageUrl = await uploadImageToBackend(editProductImage, token); }
             const payload: Partial<Product & { imageUrl?: string | null }> = {};
             if (editFormData.name !== editingProduct.name) payload.name = editFormData.name; if (editFormData.description !== editingProduct.description) payload.description = editFormData.description; if (priceNum !== editingProduct.price) payload.price = priceNum; if (editFormData.category !== editingProduct.category) payload.category = editFormData.category; if (quantityNum !== editingProduct.productquantity) payload.productquantity = quantityNum; if (imageUrl !== editingProduct.imageUrl) payload.imageUrl = imageUrl;
             if (Object.keys(payload).length === 0) { setActionError("No changes detected."); setIsSavingEdit(false); return; }
             const res = await fetch(`${baseUrl}/stores/products/${editingProduct.prodId}`, { method: 'PATCH', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
             if (!res.ok) { const e=await res.json().catch(()=>({message:'Failed update'})); throw new Error(e.message || `Error: ${res.statusText}`); }
             closeEditModal(); await fetchStoreData(token);
         } catch (err: any) { console.error(`Error updating product ${editingProduct.prodId}:`, err); setActionError(err.message || "Unknown error saving."); }
         finally { setIsSavingEdit(false); }
    };
    const handleDeleteClick = (prodId: number) => {
        // ... (implementation unchanged) ...
        if (window.confirm("Delete product?")) { setDeletingProductId(prodId); confirmDelete(prodId); }
    };
    const confirmDelete = async (prodId: number) => {
        // ... (implementation unchanged) ...
        setActionError(null); const token = await getToken(); if (!token) { setActionError("Auth error."); setDeletingProductId(null); return; }
        try {
            const res = await fetch(`${baseUrl}/stores/products/${prodId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
            if (!res.ok && res.status !== 204) { const e = await res.json().catch(()=>({message:'Failed delete'})); throw new Error(e.message || `Error: ${res.statusText}`); }
            await fetchStoreData(token);
        } catch (err: any) { console.error(`Error deleting product ${prodId}:`, err); setActionError(err.message || "Unknown error deleting."); }
        finally { setDeletingProductId(null); }
    };
    // --- End CRUD Handlers ---


    // --- Render Logic ---
    if (checkingAuth) return <p>Checking Authentication...</p>;
    if (loading) return <p>Loading Your Store...</p>;

    if (error && error.includes("Store not found")) {
        return ( <section className="my-store-container my-store-error"> <h2>Store Not Found</h2> <p>It looks like you haven't created your store yet.</p> <a href="/create-store" className="button-primary">Create Your Store</a> </section> );
    }
    if (error) {
        return ( <section className="my-store-container my-store-error"> <h2>Error Loading Store</h2> <p>{error}</p> <button onClick={() => fetchStoreData()} className="button-secondary">Retry</button> </section> );
    }
    if (!storeData) {
        return ( <section className="my-store-container"> <p>Initializing store data...</p> </section> );
    }

    const { store, products } = storeData;

    // --- Main Component JSX ---
    return (
        <main className="my-store-container">
            <header className="store-header">
                 <h1>{store.storeName}</h1>
                 {/* --- Delivery Info Section --- */}
                 <section className="delivery-info-display">
                    {/* Title and Edit Button container */}
                    <div className="delivery-header">
                        <h2>Delivery Settings</h2>
                        {!isEditingDelivery && (
                            <button onClick={toggleEditDeliveryMode} className="button-edit button-small">Edit Delivery</button>
                        )}
                    </div>

                    {/* Conditional Rendering: Display or Edit Form */}
                    {!isEditingDelivery ? (
                        <Fragment> {/* Display Mode */}
                            <dl>
                                <Fragment> <dt>Standard Delivery:</dt> <dd> {store.standardPrice !== null ? `R${store.standardPrice.toFixed(2)}` : 'N/A'} {' / '} {store.standardTime ? `${store.standardTime} Days` : 'N/A'} </dd> </Fragment>
                                <Fragment> <dt>Express Delivery:</dt> <dd> {store.expressPrice !== null ? `R${store.expressPrice.toFixed(2)}` : 'N/A'} {' / '} {store.expressTime ? `${store.expressTime} Days` : 'N/A'} </dd> </Fragment>
                            </dl>
                            <p className="info-text">Use the 'Edit Delivery' button to modify settings.</p>
                        </Fragment>
                    ) : (
                        <form onSubmit={(e) => { e.preventDefault(); handleSaveDeliveryOptions(); }} className="delivery-edit-form"> {/* Edit Mode Form */}
                            {/* Standard Delivery Inputs */}
                            <label htmlFor="editStdPrice">Standard Price (R):</label>
                            <input
                                id="editStdPrice"
                                type="number"
                                value={editDeliveryData.standardPrice}
                                onChange={(e) => handleDeliveryFieldChange('standardPrice', e.target.value)}
                                required min="0" step="0.01" disabled={isSavingDelivery}
                            />
                            <label htmlFor="editStdTime">Standard Time:</label>
                            <select
                                id="editStdTime"
                                value={editDeliveryData.standardTime}
                                onChange={(e) => handleDeliveryFieldChange('standardTime', e.target.value)}
                                required disabled={isSavingDelivery}
                            >
                                {STANDARD_DELIVERY_TIMES.map(time => <option key={`std-${time}`} value={time}>{time} Days</option>)}
                            </select>

                            {/* Express Delivery Inputs */}
                            <label htmlFor="editExpPrice">Express Price (R):</label>
                            <input
                                id="editExpPrice"
                                type="number"
                                value={editDeliveryData.expressPrice}
                                onChange={(e) => handleDeliveryFieldChange('expressPrice', e.target.value)}
                                required min="0" step="0.01" disabled={isSavingDelivery}
                            />
                             <label htmlFor="editExpTime">Express Time:</label>
                            <select
                                id="editExpTime"
                                value={editDeliveryData.expressTime}
                                onChange={(e) => handleDeliveryFieldChange('expressTime', e.target.value)}
                                required disabled={isSavingDelivery}
                            >
                                {EXPRESS_DELIVERY_TIMES.map(time => <option key={`exp-${time}`} value={time}>{time} Days</option>)}
                            </select>

                            {/* Action Buttons & Error */}
                            {actionError && <p className="error-message">{actionError}</p>}
                            <div className="delivery-edit-actions">
                                <button type="submit" className="button-confirm" disabled={isSavingDelivery}>
                                    {isSavingDelivery ? 'Saving...' : 'Save Delivery Options'}
                                </button>
                                <button type="button" className="button-cancel" onClick={handleCancelEditDelivery} disabled={isSavingDelivery}>
                                    Cancel
                                </button>
                            </div>
                        </form>
                    )}
                 </section>
                 {/* --- End Delivery Info Section --- */}

                 {/* Add Product Toggle Button */}
                 <button
                     onClick={() => setIsAddingProductFormVisible(prev => !prev)}
                     className="button-primary add-product-toggle-btn"
                     style={{ alignSelf: 'flex-start', marginTop: '10px' }} // Adjust positioning if needed
                    >
                    {isAddingProductFormVisible ? 'Cancel Add Product' : 'Add New Product'}
                 </button>
            </header>

            {/* Add Product Form (Unchanged Structure) */}
            {isAddingProductFormVisible && (
                <section className="add-product-form-section">
                    {/* ... (add product form JSX - unchanged) ... */}
                     <h2>Add New Product</h2> <form onSubmit={(e)=>{e.preventDefault();handleAddProduct();}}> <label htmlFor="newProdName">Product Name:</label> <input id="newProdName" type="text" value={newProduct.name??''} onChange={(e)=>handleNewProductChange('name',e.target.value)} required disabled={isAddingProductLoading}/> <label htmlFor="newProdDesc">Description:</label> <textarea id="newProdDesc" value={newProduct.description??''} onChange={(e)=>handleNewProductChange('description',e.target.value)} disabled={isAddingProductLoading}></textarea> <label htmlFor="newProdPrice">Price (R):</label> <input id="newProdPrice" type="number" value={newProduct.price??''} onChange={(e)=>handleNewProductChange('price',e.target.value)} required min="0.01" step="0.01" disabled={isAddingProductLoading}/> <label htmlFor="newProdQuantity">Quantity:</label> <input id="newProdQuantity" type="number" value={newProduct.productQuantity??''} onChange={(e)=>handleNewProductChange('productQuantity',e.target.value)} required min="0" step="1" disabled={isAddingProductLoading}/> <label htmlFor="newProdCategory">Category:</label> <select id="newProdCategory" value={newProduct.category??''} onChange={(e)=>handleNewProductChange('category',e.target.value)} required disabled={isAddingProductLoading}> <option value="" disabled>Select...</option> {PRODUCT_CATEGORIES.map(cat=><option key={cat} value={cat}>{cat}</option>)} </select> <label htmlFor="newProdImage">Image:</label> <input id="newProdImage" type="file" accept="image/*" ref={addFileInputRef} onChange={handleNewProductImageChange} required disabled={isAddingProductLoading}/> {newProduct.imagePreviewUrl && <img src={newProduct.imagePreviewUrl} alt="Preview" className="image-preview"/>} {actionError && <p className="error-message">{actionError}</p>} <button type="submit" disabled={isAddingProductLoading} className="button-confirm">{isAddingProductLoading?'Adding...':'Confirm Add'}</button> <button type="button" onClick={()=>setIsAddingProductFormVisible(false)} disabled={isAddingProductLoading} className="button-cancel">Cancel</button> </form>
                </section>
            )}

            {/* Product List Section (Unchanged Structure) */}
            <section className="products-section">
                  <h2>Your Products</h2>
                 {(products && products.length > 0) ? (
                     <ul className="product-list">
                         {products.map((product) => (
                            // ... (product list item JSX - unchanged) ...
                             <li key={product.prodId} className="product-list-item"> <article className="product-card"> <img src={product.imageUrl||'/placeholder-image.png'} alt={product.name} className="product-image"/> <div className="product-details"> <h3>{product.name}</h3> <p className="product-description">{product.description}</p> <p className="product-category">Category: {product.category}</p> <p className="product-price">Price: R{product.price.toFixed(2)}</p> <p className="product-quantity">Quantity: {product.productquantity}</p> </div> <div className="product-actions"> <button onClick={()=>openEditModal(product)} className="button-edit" disabled={deletingProductId===product.prodId}>Edit</button> <button onClick={()=>handleDeleteClick(product.prodId)} className="button-delete" disabled={deletingProductId===product.prodId}> {deletingProductId===product.prodId?'Deleting...':'Delete'} </button> </div> </article> </li>
                         ))}
                     </ul>
                 ) : (
                     <p>You haven't added any products yet.</p>
                 )}
             </section>

            {/* Edit Product Modal (Unchanged Structure) */}
            <dialog ref={editDialogRef} onClose={closeEditModal} className="edit-product-modal">
                 {editingProduct && (
                    // ... (edit product form JSX - unchanged) ...
                     <form onSubmit={(e)=>{e.preventDefault();handleUpdateProduct();}} method="dialog"> <h2>Edit: {editingProduct.name}</h2> <label htmlFor="editProdName">Name:</label> <input id="editProdName" type="text" value={editFormData.name||''} onChange={(e)=>handleEditFormChange('name',e.target.value)} required disabled={isSavingEdit}/> <label htmlFor="editProdDesc">Desc:</label> <textarea id="editProdDesc" value={editFormData.description||''} onChange={(e)=>handleEditFormChange('description',e.target.value)} disabled={isSavingEdit}></textarea> <label htmlFor="editProdPrice">Price (R):</label> <input id="editProdPrice" type="number" value={editFormData.price||''} onChange={(e)=>handleEditFormChange('price',e.target.value)} required min="0.01" step="0.01" disabled={isSavingEdit}/> <label htmlFor="editProdQuantity">Quantity:</label> <input id="editProdQuantity" type="number" value={editFormData.productQuantity||''} onChange={(e)=>handleEditFormChange('productQuantity',e.target.value)} required min="0" step="1" disabled={isSavingEdit}/> <label htmlFor="editProdCategory">Category:</label> <select id="editProdCategory" value={editFormData.category||''} onChange={(e)=>handleEditFormChange('category',e.target.value)} required disabled={isSavingEdit}> <option value="" disabled>Select...</option> {PRODUCT_CATEGORIES.map(cat=><option key={cat} value={cat}>{cat}</option>)} </select> <label htmlFor="editProdImage">Replace Image:</label> <input id="editProdImage" type="file" accept="image/*" ref={editFileInputRef} onChange={handleEditImageChange} disabled={isSavingEdit}/> {editProductPreview && <img src={editProductPreview} alt="Preview" className="image-preview"/>} {actionError && <p className="error-message">{actionError}</p>} <footer className="modal-actions"> <button type="submit" disabled={isSavingEdit} className="button-confirm">{isSavingEdit?'Saving...':'Save Changes'}</button> <button type="button" onClick={closeEditModal} disabled={isSavingEdit} className="button-cancel">Cancel</button> </footer> </form>
                 )}
             </dialog>
        </main>
    );
};

export default MyStore;