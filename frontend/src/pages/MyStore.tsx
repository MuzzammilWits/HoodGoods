// frontend/src/pages/MyStore.tsx
import React, { useState, useEffect, useCallback, useRef, ChangeEvent, Fragment } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { Link } from 'react-router-dom';
import './myStore.css'; // Assuming you have this CSS file
import { PRODUCT_CATEGORIES, STANDARD_DELIVERY_TIMES, EXPRESS_DELIVERY_TIMES } from '../types/createStore';

interface Product {
    prodId: number;
    name: string;
    description: string;
    price: number;
    category: string;
    productquantity: number;
    imageUrl?: string | null;
    storeId: string;
    userId: string;
    isActive?: boolean;
}

interface Store {
    storeId: string;
    userId: string;
    storeName: string;
    standardPrice: number | null;
    standardTime: string | null;
    expressPrice: number | null;
    expressTime: string | null;
    isActiveStore: boolean;
}

type EditableProductFields = Omit<Product, 'prodId' | 'imageUrl' | 'storeId' | 'userId' | 'isActive' | 'price' | 'productquantity'> & {
    price: string;
    productQuantity: string;
};

type NewProductFields = Partial<Omit<Product, 'prodId' | 'imageUrl' | 'storeId' | 'userId' | 'isActive' | 'price' | 'productquantity' >> & {
    price?: string;
    productQuantity?: string;
    imageFile?: File | null;
    imagePreviewUrl?: string | null;
};

interface EditableDeliveryFields {
    standardPrice: string;
    standardTime: string;
    expressPrice: string;
    expressTime: string;
}

const MyStore: React.FC = () => {
    const { isAuthenticated, isLoading: isAuthLoading, getAccessTokenSilently, loginWithRedirect } = useAuth0();
    const baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

    const [checkingAuth, setCheckingAuth] = useState(true);
    const [loading, setLoading] = useState(true);
    const [storeData, setStoreData] = useState<{ store: Store; products: Product[] } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [isAddingProductFormVisible, setIsAddingProductFormVisible] = useState(false);
    const [isAddingProductLoading, setIsAddingProductLoading] = useState(false);
    const [newProduct, setNewProduct] = useState<NewProductFields>({
        name: '', description: '', price: '', category: '', productQuantity: '', imageFile: null, imagePreviewUrl: null
    });
    const addFileInputRef = useRef<HTMLInputElement>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [editFormData, setEditFormData] = useState<Partial<EditableProductFields>>({});
    const [editProductImage, setEditProductImage] = useState<File | null>(null);
    const [editProductPreview, setEditProductPreview] = useState<string>('');
    const [isSavingEdit, setIsSavingEdit] = useState(false);
    const editFileInputRef = useRef<HTMLInputElement>(null);
    const editDialogRef = useRef<HTMLDialogElement>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [productToDelete, setProductToDelete] = useState<Product | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const deleteDialogRef = useRef<HTMLDialogElement>(null);
    const [isEditingDelivery, setIsEditingDelivery] = useState(false);
    const [isSavingDelivery, setIsSavingDelivery] = useState(false);
    const [editDeliveryData, setEditDeliveryData] = useState<EditableDeliveryFields>({
        standardPrice: '', standardTime: STANDARD_DELIVERY_TIMES[0], expressPrice: '', expressTime: EXPRESS_DELIVERY_TIMES[0]
    });

    const clearMessages = useCallback(() => {
        setActionError(null);
        setSuccessMessage(null);
    }, []);

    const getToken = useCallback(async (): Promise<string | null> => {
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
        } catch (fetchTokenError: any) {
            // console.error('Error getting access token:', fetchTokenError); // Logging removed
            sessionStorage.removeItem('access_token');
            if (fetchTokenError instanceof Error && (fetchTokenError.message.includes('consent_required') || fetchTokenError.message.includes('login_required'))) {
                try { await loginWithRedirect({ appState: { returnTo: window.location.pathname } }); }
                catch (redirectError: any) { console.error("Redirect to login failed:", redirectError); }
            }
            return null;
        }
    }, [getAccessTokenSilently, isAuthenticated, loginWithRedirect]);

    const uploadImageToBackend = async (file: File, token: string): Promise<string> => {
        const imgFormData = new FormData();
        imgFormData.append('file', file);
        const res = await fetch(`${baseUrl}/upload/image`, {
            method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: imgFormData,
        });
        if (!res.ok) {
            const errorData = await res.json().catch(() => ({ message: 'Failed to parse upload error response' }));
            throw new Error(`Failed to upload image: ${errorData.message || res.statusText}`);
        }
        const data = await res.json();
        if (!data.url || typeof data.url !== 'string') {
            throw new Error(`Image upload succeeded but response did not contain a valid URL string.`);
        }
        return data.url;
    };

    const fetchStoreData = useCallback(async (currentToken?: string) => {
        setLoading(true); setError(null); clearMessages();
        const token = currentToken || await getToken();
        if (!token) {
            setError("Authentication failed. Please log in."); setLoading(false); setCheckingAuth(false); return;
        }
        try {
            const response = await fetch(`${baseUrl}/stores/my-store`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) {
                if (response.status === 404) { setError("Store not found. You might need to create your store first."); setStoreData(null); }
                else { const e = await response.json().catch(()=>(null)); throw new Error(e?.message || `Error fetching store data: ${response.statusText}`); }
            } else {
                const fetchedData: { store: Store; products: Product[] } = await response.json();
                if (!fetchedData || !fetchedData.store) { throw new Error("Invalid data received for store."); }
                fetchedData.products = Array.isArray(fetchedData.products) ? fetchedData.products : [];
                setStoreData(fetchedData);
                setIsEditingDelivery(false);
            }
        } catch (err: any) {
            if (!(err instanceof Error && err.message.includes("Store not found"))) {
                setError(err.message || "Unknown error fetching store data.");
            }
            setStoreData(null);
        } finally { setLoading(false); setCheckingAuth(false); }
    }, [baseUrl, getToken, clearMessages]);

    useEffect(() => {
        const checkAuthAndLoad = async () => {
            if (!isAuthLoading && isAuthenticated) { await fetchStoreData(); }
            else if (!isAuthLoading && !isAuthenticated) { setCheckingAuth(false); setLoading(false); setError("Please log in to manage your store.");}
            else { setCheckingAuth(true); setLoading(true); }
        };
        checkAuthAndLoad();
    }, [isAuthenticated, isAuthLoading, fetchStoreData]);

    useEffect(() => { const dialog = editDialogRef.current; if (dialog) { if (isEditModalOpen) {clearMessages(); dialog.showModal();} else dialog.close(); } }, [isEditModalOpen, clearMessages]);
    useEffect(() => { const dialog = deleteDialogRef.current; if (dialog) { if (isDeleteModalOpen) {clearMessages(); dialog.showModal();} else dialog.close(); } }, [isDeleteModalOpen, clearMessages]);

    const toggleEditDeliveryMode = () => {
        if (!storeData) return;
        if (!isEditingDelivery) {
            setEditDeliveryData({
                standardPrice: storeData.store.standardPrice?.toString() ?? '',
                standardTime: storeData.store.standardTime ?? STANDARD_DELIVERY_TIMES[0],
                expressPrice: storeData.store.expressPrice?.toString() ?? '',
                expressTime: storeData.store.expressTime ?? EXPRESS_DELIVERY_TIMES[0],
            });
        }
        setIsEditingDelivery(!isEditingDelivery);
        clearMessages();
    };

    const handleDeliveryFieldChange = (field: keyof EditableDeliveryFields, value: string) => {
        setEditDeliveryData(prev => ({ ...prev, [field]: value }));
    };

    const handleSaveDeliveryOptions = async () => {
        if (!storeData) { setActionError("Store data not available."); return; }
        clearMessages(); setIsSavingDelivery(true);
        const token = await getToken(); if (!token) { setActionError("Authentication error."); setIsSavingDelivery(false); return; }
        const standardPriceNum = parseFloat(editDeliveryData.standardPrice); const expressPriceNum = parseFloat(editDeliveryData.expressPrice);
        if (isNaN(standardPriceNum) || standardPriceNum < 0) { setActionError("Standard price must be a non-negative number."); setIsSavingDelivery(false); return; }
        if (isNaN(expressPriceNum) || expressPriceNum < 0) { setActionError("Express price must be a non-negative number."); setIsSavingDelivery(false); return; }
        if (!editDeliveryData.standardTime) { setActionError("Please select a standard delivery time."); setIsSavingDelivery(false); return; }
        if (!editDeliveryData.expressTime) { setActionError("Please select an express delivery time."); setIsSavingDelivery(false); return; }

        const payload: Partial<Store> = {}; const originalStore = storeData.store;
        if (standardPriceNum !== originalStore.standardPrice) payload.standardPrice = standardPriceNum;
        if (editDeliveryData.standardTime !== originalStore.standardTime) payload.standardTime = editDeliveryData.standardTime;
        if (expressPriceNum !== originalStore.expressPrice) payload.expressPrice = expressPriceNum;
        if (editDeliveryData.expressTime !== originalStore.expressTime) payload.expressTime = editDeliveryData.expressTime;

        if (Object.keys(payload).length === 0) { setActionError("No changes made to delivery options."); setIsSavingDelivery(false); setIsEditingDelivery(false); return; }
        try {
            const response = await fetch(`${baseUrl}/stores/my-store/delivery`, {
                method: 'PATCH', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
            });
            if (!response.ok) { const e=await response.json().catch(()=>({message:'Failed to save delivery options'})); throw new Error(e.message || `Error: ${response.statusText}`); }
            const updatedStoreData: Store = await response.json();
            setStoreData(prevData => prevData ? { ...prevData, store: updatedStoreData } : null);
            setSuccessMessage("Delivery options updated successfully!");
            setIsEditingDelivery(false);
        } catch (err: any) {
            setActionError(err.message || "Unknown error saving delivery options.");
        }
        finally { setIsSavingDelivery(false); }
    };

    const handleCancelEditDelivery = () => { setIsEditingDelivery(false); clearMessages(); };

    const handleNewProductChange = (field: keyof Omit<NewProductFields, 'imageFile' | 'imagePreviewUrl'>, value: string) => {
        setNewProduct(prev => ({ ...prev, [field]: value }));
    };

    const handleNewProductImageChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if(file){ const r=new FileReader(); r.onloadend=()=>setNewProduct(p=>({...p, imageFile:file, imagePreviewUrl:r.result as string})); r.readAsDataURL(file); }
        else { setNewProduct(p=>({...p, imageFile:null, imagePreviewUrl:null})); }
    };

    const handleAddProduct = async () => {
        if (!storeData?.store) { setActionError("Store data missing. Cannot add product."); return; }
        clearMessages(); setIsAddingProductLoading(true);
        const token = await getToken(); if (!token) { setActionError("Authentication error."); setIsAddingProductLoading(false); return; }
        if (!newProduct.name||!newProduct.price||!newProduct.category||!newProduct.productQuantity||!newProduct.imageFile) { setActionError("Please fill all required product fields and select an image."); setIsAddingProductLoading(false); return; }
        const priceNum=parseFloat(newProduct.price); const quantityNum=parseInt(newProduct.productQuantity,10);
        if(isNaN(priceNum)||priceNum<=0||isNaN(quantityNum)||quantityNum<0){ setActionError("Price must be positive, quantity non-negative."); setIsAddingProductLoading(false); return; }
        try {
            const imageUrl = await uploadImageToBackend(newProduct.imageFile, token);
            const payload={ // isActive is NOT sent from here; backend defaults it to false
                name:newProduct.name,
                description:newProduct.description||'',
                price:priceNum,
                category:newProduct.category,
                imageUrl:imageUrl,
                productquantity:quantityNum
            };
            const res = await fetch(`${baseUrl}/stores/products`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (!res.ok) { const e=await res.json().catch(()=>({message:'Failed to add product'})); throw new Error(e.message || `Error: ${res.statusText}`); }
            setNewProduct({ name: '', description: '', price: '', category: '', productQuantity: '', imageFile: null, imagePreviewUrl: null });
            setIsAddingProductFormVisible(false);
            if (addFileInputRef.current) addFileInputRef.current.value = '';
            setSuccessMessage("Product added and submitted for approval!");
            await fetchStoreData(token);
        } catch (err: any) {
            setActionError(err.message || "Unknown error adding product.");
        }
        finally { setIsAddingProductLoading(false); }
    };

    const openEditModal = (product: Product) => {
        setEditingProduct(product);
        setEditFormData({ name: product.name, description: product.description, price: product.price.toString(), category: product.category, productQuantity: product.productquantity.toString() });
        setEditProductImage(null); setEditProductPreview(product.imageUrl || '');
        setIsEditModalOpen(true);
    };
    const closeEditModal = () => {
        setIsEditModalOpen(false); setEditingProduct(null); setEditFormData({}); setEditProductImage(null); setEditProductPreview('');
        if (editFileInputRef.current) editFileInputRef.current.value = '';
    };
    const handleEditFormChange = (field: keyof EditableProductFields, value: string) => {
        setEditFormData(prev => ({ ...prev, [field]: value }));
    };
    const handleEditImageChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if(file){ setEditProductImage(file); const r=new FileReader(); r.onloadend=()=>setEditProductPreview(r.result as string); r.readAsDataURL(file); }
    };

    const handleUpdateProduct = async () => {
        if (!editingProduct) { setActionError("No product selected for update."); return; }
        clearMessages();
        setIsSavingEdit(true);
        const token = await getToken();
        if (!token) {
            setActionError("Authentication error.");
            setIsSavingEdit(false);
            return;
        }

        const priceStr = editFormData.price ?? editingProduct.price.toString();
        const quantityStr = editFormData.productQuantity ?? editingProduct.productquantity.toString();
        const priceNum = parseFloat(priceStr);
        const quantityNum = parseInt(quantityStr, 10);

        if (isNaN(priceNum) || priceNum <= 0) { setActionError("Price must be a positive number."); setIsSavingEdit(false); return; }
        if (isNaN(quantityNum) || quantityNum < 0) { setActionError("Quantity must be a non-negative number."); setIsSavingEdit(false); return; }

        try {
            let newImageUrl = editingProduct.imageUrl;
            if (editProductImage) {
                newImageUrl = await uploadImageToBackend(editProductImage, token);
            }

            const payload: Partial<Product & { isActive?: boolean }> = {};
            let requiresApproval = false;

            if (editFormData.name !== undefined && editFormData.name !== editingProduct.name) {
                payload.name = editFormData.name;
                requiresApproval = true;
            }
            if (editFormData.description !== undefined && editFormData.description !== editingProduct.description) {
                payload.description = editFormData.description;
                requiresApproval = true;
            }
            if (editFormData.category !== undefined && editFormData.category !== editingProduct.category) {
                payload.category = editFormData.category;
                requiresApproval = true;
            }
            if (newImageUrl !== editingProduct.imageUrl) {
                payload.imageUrl = newImageUrl;
                requiresApproval = true;
            }

            if (priceNum !== editingProduct.price) {
                payload.price = priceNum;
            }
            if (quantityNum !== editingProduct.productquantity) {
                payload.productquantity = quantityNum;
            }

            if (Object.keys(payload).length === 0 && !editProductImage) {
                 setActionError("No changes detected.");
                 setIsSavingEdit(false);
                 return;
            }

            if (requiresApproval) {
                payload.isActive = false;
                setSuccessMessage("Your changes require admin approval and have been submitted.");
            } else {
                payload.isActive = editingProduct.isActive;
                setSuccessMessage("Product updated successfully.");
            }

            const res = await fetch(`${baseUrl}/stores/products/${editingProduct.prodId}`, {
                method: 'PATCH', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
            });

            if (!res.ok) {
                 const errorData = await res.json().catch(() => ({message: 'Failed to update product'}));
                 throw new Error(errorData.message || `Error: ${res.statusText}`);
            }

            closeEditModal();
            await fetchStoreData(token);

        } catch (err: any) {
            setActionError(err.message || "Unknown error saving product.");
            setSuccessMessage(null);
        }
        finally { setIsSavingEdit(false); }
    };

    const handleDeleteClick = (product: Product) => { setProductToDelete(product); setIsDeleteModalOpen(true); };
    const closeDeleteModal = () => { setIsDeleteModalOpen(false); setProductToDelete(null); };
    const executeDeleteProduct = async () => {
        if (!productToDelete) return;
        clearMessages();
        setIsDeleting(true);
        const prodIdToDelete = productToDelete.prodId; const token = await getToken();
        if (!token) { setActionError("Authentication error."); setIsDeleting(false); return; }
        try {
            const response = await fetch(`${baseUrl}/stores/products/${prodIdToDelete}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok && response.status !== 204) { const e = await response.json().catch(()=>({message:'Failed to delete product'})); throw new Error(e.message || `Error: ${response.statusText}`); }
            setSuccessMessage("Product deleted successfully.");
            closeDeleteModal();
            await fetchStoreData(token);
        } catch (err: any) {
            setActionError(err.message || "Unknown error deleting product.");
        }
        finally { setIsDeleting(false); }
    };

    if (checkingAuth || (isAuthLoading && !isAuthenticated)) {
        return ( <main className="my-store-container"> <section className="loading-container" aria-label="Checking authentication"> <figure className="spinner" role="img" aria-label="Loading animation"></figure> <p>Checking Authentication...</p> </section> </main> );
    }
    if (!isAuthenticated && !isAuthLoading) {
        return ( <main className="my-store-container no-store"> <header><h2>Access Denied</h2></header> <p>Please log in to manage your store.</p> <button onClick={() => loginWithRedirect({ appState: { returnTo: window.location.pathname }})} className="button-primary"> Log In / Sign Up </button> </main> );
    }
    if (loading) {
        return ( <main className="my-store-container"> <section className="loading-container" aria-label="Loading your store data"> <figure className="spinner" role="img" aria-label="Loading animation"></figure> <p>Loading Your Store...</p> </section> </main> );
    }
    if (error && error.includes("Store not found")) {
        return ( <main className="my-store-container no-store"> <header><h2>Store Not Found</h2></header> <p>It looks like you haven't created your store yet.</p> <Link to="/create-store" className="button-primary">Create Your Store</Link> </main> );
    }
    if (error) {
        return ( <main className="my-store-container my-store-error">  <header><h2>Error Loading Store</h2></header> <p>{error}</p> <button onClick={() => fetchStoreData()} className="button-secondary">Retry</button> </main> );
    }
    if (!storeData) {
        return ( <main className="my-store-container">  <header><h2>Store Unavailable</h2></header> <p>Store data could not be loaded. Please try again.</p> <button onClick={() => fetchStoreData()} className="button-secondary">Retry</button> </main> );
    }

    const { store, products } = storeData;
    const pendingProducts = products.filter(product => !product.isActive);
    const approvedProducts = products.filter(product => product.isActive);

    return (
        <Fragment>
            <main className="my-store-container">
                {actionError && <p className="error-message global-message" role="alert">{actionError}</p>}
                {successMessage && <p className="success-message global-message" role="status">{successMessage}</p>}

                <header className="store-header">
                    <h1>{store.storeName}</h1>
                    <section className="delivery-info-display">
                        <header className="delivery-header">
                            <h2>Delivery Settings</h2>
                            {!isEditingDelivery && ( <button onClick={toggleEditDeliveryMode} className="button-edit button-small"> Edit Delivery </button> )}
                        </header>
                        {!isEditingDelivery ? (
                            <Fragment>
                                <dl>
                                    <Fragment>
                                        <dt>Standard Delivery:</dt>
                                        <dd> {store.standardPrice !== null ? `R${store.standardPrice.toFixed(2)}` : 'N/A'} {' / '} {store.standardTime ? `${store.standardTime} Days` : 'N/A'} </dd>
                                    </Fragment>
                                    <Fragment>
                                        <dt>Express Delivery:</dt>
                                        <dd> {store.expressPrice !== null ? `R${store.expressPrice.toFixed(2)}` : 'N/A'} {' / '} {store.expressTime ? `${store.expressTime} Days` : 'N/A'} </dd>
                                    </Fragment>
                                </dl>
                                <p className="info-text">Use the 'Edit Delivery' button to modify settings.</p>
                            </Fragment>
                        ) : (
                            <form onSubmit={(e) => { e.preventDefault(); handleSaveDeliveryOptions(); }} className="delivery-edit-form">
                                <label htmlFor="editStdPrice">Standard Price (R):</label> <input id="editStdPrice" type="number" value={editDeliveryData.standardPrice} onChange={(e) => handleDeliveryFieldChange('standardPrice', e.target.value)} required min="0" step="0.01" disabled={isSavingDelivery} aria-required="true"/>
                                <label htmlFor="editStdTime">Standard Time:</label> <select id="editStdTime" value={editDeliveryData.standardTime} onChange={(e) => handleDeliveryFieldChange('standardTime', e.target.value)} required disabled={isSavingDelivery} aria-required="true"> {STANDARD_DELIVERY_TIMES.map(time => <option key={`std-${time}`} value={time}>{time} Days</option>)} </select>
                                <label htmlFor="editExpPrice">Express Price (R):</label> <input id="editExpPrice" type="number" value={editDeliveryData.expressPrice} onChange={(e) => handleDeliveryFieldChange('expressPrice', e.target.value)} required min="0" step="0.01" disabled={isSavingDelivery} aria-required="true"/>
                                <label htmlFor="editExpTime">Express Time:</label> <select id="editExpTime" value={editDeliveryData.expressTime} onChange={(e) => handleDeliveryFieldChange('expressTime', e.target.value)} required disabled={isSavingDelivery} aria-required="true"> {EXPRESS_DELIVERY_TIMES.map(time => <option key={`exp-${time}`} value={time}>{time} Days</option>)} </select>
                                <footer className="delivery-edit-actions"> <button type="submit" className="button-confirm" disabled={isSavingDelivery}> {isSavingDelivery ? 'Saving...' : 'Save Delivery Options'} </button> <button type="button" className="button-cancel" onClick={handleCancelEditDelivery} disabled={isSavingDelivery}> Cancel </button> </footer>
                            </form>
                        )}
                    </section>
                    <nav className="store-actions-container">
                        <button onClick={() => {setIsAddingProductFormVisible(prev => !prev); clearMessages();}} className="add-product-toggle-btn" aria-expanded={isAddingProductFormVisible} aria-controls="add-product-form"> {isAddingProductFormVisible ? 'Cancel Add Product' : 'Add New Product'} </button>
                        <Link to="/seller-dashboard" className="button-secondary view-orders-btn"> View Current Orders </Link>
                        <Link to="/seller/analytics" className="button-secondary view-orders-btn"> View Analytics </Link>
                    </nav>
                </header>

                {isAddingProductFormVisible && (
                    <section className="add-product-form-section" id="add-product-form" aria-labelledby="add-product-heading">
                        <h2 id="add-product-heading">Add New Product</h2>
                        <form onSubmit={(e)=>{e.preventDefault();handleAddProduct();}}>
                            <label htmlFor="newProdName">Product Name:</label> <input id="newProdName" type="text" value={newProduct.name??''} onChange={(e)=>handleNewProductChange('name',e.target.value)} required disabled={isAddingProductLoading} aria-required="true"/>
                            <label htmlFor="newProdDesc">Description:</label> <textarea id="newProdDesc" value={newProduct.description??''} onChange={(e)=>handleNewProductChange('description',e.target.value)} disabled={isAddingProductLoading}></textarea>
                            <label htmlFor="newProdPrice">Price (R):</label> <input id="newProdPrice" type="number" value={newProduct.price??''} onChange={(e)=>handleNewProductChange('price',e.target.value)} required min="0.01" step="0.01" disabled={isAddingProductLoading} aria-required="true"/>
                            <label htmlFor="newProdQuantity">Quantity:</label> <input id="newProdQuantity" type="number" value={newProduct.productQuantity??''} onChange={(e)=>handleNewProductChange('productQuantity',e.target.value)} required min="0" step="1" disabled={isAddingProductLoading} aria-required="true"/>
                            <label htmlFor="newProdCategory">Category:</label> <select id="newProdCategory" value={newProduct.category??''} onChange={(e)=>handleNewProductChange('category',e.target.value)} required disabled={isAddingProductLoading} aria-required="true"> <option value="" disabled>Select...</option> {PRODUCT_CATEGORIES.map(cat=> <option key={cat} value={cat}>{cat}</option> )} </select>
                            <label htmlFor="newProdImage">Image:</label> <input id="newProdImage" type="file" accept="image/*" ref={addFileInputRef} onChange={handleNewProductImageChange} required disabled={isAddingProductLoading} aria-required="true"/>
                            {newProduct.imagePreviewUrl && <img src={newProduct.imagePreviewUrl} alt="New product preview" className="image-preview"/> }
                            <footer className="add-form-actions"> <button type="submit" disabled={isAddingProductLoading} className="button-confirm"> {isAddingProductLoading?'Adding...':'Confirm Add Product'} </button> <button type="button" onClick={()=>{ setIsAddingProductFormVisible(false); clearMessages(); setNewProduct({ name: '', description: '', price: '', category: '', productQuantity: '', imageFile: null, imagePreviewUrl: null}); if (addFileInputRef.current) addFileInputRef.current.value = ''; }} disabled={isAddingProductLoading} className="button-cancel"> Cancel </button> </footer>
                        </form>
                    </section>
                )}

                <section className="products-section">
                    <section className="product-status-section" aria-labelledby="approved-products-heading">
                        <h2 id="approved-products-heading">Approved Products</h2>
                        {approvedProducts.length > 0 ? ( <ul className="product-list"> {approvedProducts.map((product) => ( <li key={product.prodId} className="product-list-item"> <article className="product-card active"> <figure className="product-image"> <img src={product.imageUrl || '/placeholder-image.png'} alt={product.name} /> </figure> <section className="product-details"> <h3>{product.name}</h3> <p className="product-description">{product.description}</p> <p className="product-category">Category: {product.category}</p> <p className="product-price">Price: R{product.price.toFixed(2)}</p> <p className="product-quantity">Quantity: {product.productquantity}</p> </section> <footer className="product-actions"> <button onClick={()=>openEditModal(product)} className="button-edit" disabled={isDeleting || isSavingEdit || isAddingProductLoading}> Edit </button> <button onClick={()=>handleDeleteClick(product)} className="button-delete" disabled={isDeleting || isSavingEdit || isAddingProductLoading}> {isDeleting && productToDelete?.prodId === product.prodId ? 'Deleting...' : 'Delete'} </button> </footer> </article> </li> ))} </ul> ) : ( <p className="no-products">No approved products yet.</p> )}
                    </section>

                    <section className="product-status-section" aria-labelledby="pending-products-heading">
                        <h2 id="pending-products-heading">Pending Approval</h2>
                        {pendingProducts.length > 0 ? ( <ul className="product-list"> {pendingProducts.map((product) => ( <li key={product.prodId} className="product-list-item"> <article className="product-card inactive"> <p className="product-status-badge">Pending Approval</p> <figure className="product-image"> <img src={product.imageUrl || '/placeholder-image.png'} alt={product.name} /> </figure> <section className="product-details"> <h3>{product.name}</h3> <p className="product-description">{product.description}</p> <p className="product-category">Category: {product.category}</p> <p className="product-price">Price: R{product.price.toFixed(2)}</p> <p className="product-quantity">Quantity: {product.productquantity}</p> </section> <footer className="product-actions"> <button onClick={()=>openEditModal(product)} className="button-edit" disabled={isDeleting || isSavingEdit || isAddingProductLoading}> Edit </button> <button onClick={()=>handleDeleteClick(product)} className="button-delete" disabled={isDeleting || isSavingEdit || isAddingProductLoading}> {isDeleting && productToDelete?.prodId === product.prodId ? 'Deleting...' : 'Delete'} </button> </footer> </article> </li> ))} </ul> ) : ( <p className="no-products">No products pending approval.</p> )}
                    </section>
                </section>

                <dialog ref={editDialogRef} onClose={closeEditModal} className="edit-product-modal" aria-labelledby="edit-product-dialog-title">
                    {editingProduct && (
                        <form onSubmit={(e)=>{e.preventDefault();handleUpdateProduct();}} method="dialog">
                            <h2 id="edit-product-dialog-title">Edit: {editingProduct.name}</h2>
                            <label htmlFor="editProdName">Name:</label> <input id="editProdName" type="text" value={editFormData.name||''} onChange={(e)=>handleEditFormChange('name',e.target.value)} required disabled={isSavingEdit} aria-required="true"/>
                            <label htmlFor="editProdDesc">Description:</label> <textarea id="editProdDesc" value={editFormData.description||''} onChange={(e)=>handleEditFormChange('description',e.target.value)} disabled={isSavingEdit}></textarea>
                            <label htmlFor="editProdPrice">Price (R):</label> <input id="editProdPrice" type="number" value={editFormData.price||''} onChange={(e)=>handleEditFormChange('price',e.target.value)} required min="0.01" step="0.01" disabled={isSavingEdit} aria-required="true"/>
                            <label htmlFor="editProdQuantity">Quantity:</label> <input id="editProdQuantity" type="number" value={editFormData.productQuantity||''} onChange={(e)=>handleEditFormChange('productQuantity',e.target.value)} required min="0" step="1" disabled={isSavingEdit} aria-required="true"/>
                            <label htmlFor="editProdCategory">Category:</label> <select id="editProdCategory" value={editFormData.category||''} onChange={(e)=>handleEditFormChange('category',e.target.value)} required disabled={isSavingEdit} aria-required="true"> <option value="" disabled>Select...</option> {PRODUCT_CATEGORIES.map(cat=> <option key={cat} value={cat}>{cat}</option> )} </select>
                            <label htmlFor="editProdImage">Replace Image (Optional):</label> <input id="editProdImage" type="file" accept="image/*" ref={editFileInputRef} onChange={handleEditImageChange} disabled={isSavingEdit}/>
                            {editProductPreview && <img src={editProductPreview} alt="Edit product preview" className="image-preview"/> }
                            <footer className="modal-actions"> <button type="submit" disabled={isSavingEdit} className="button-confirm"> {isSavingEdit?'Saving...':'Save Changes'} </button> <button type="button" onClick={closeEditModal} disabled={isSavingEdit} className="button-cancel"> Cancel </button> </footer>
                        </form>
                    )}
                </dialog>

                <dialog ref={deleteDialogRef} onClose={closeDeleteModal} className="delete-confirm-modal" aria-labelledby="delete-product-dialog-title">
                    {productToDelete && ( <Fragment> <h2 id="delete-product-dialog-title">Confirm Deletion</h2> <p>Are you sure you want to delete the product: <strong>{productToDelete.name}</strong>?</p> <p>This action cannot be undone.</p> <footer className="modal-actions"> <button onClick={executeDeleteProduct} className="button-delete" disabled={isDeleting}> {isDeleting ? 'Deleting...' : 'Yes, Delete Product'} </button> <button onClick={closeDeleteModal} className="button-cancel" disabled={isDeleting}> Cancel </button> </footer> </Fragment> )}
                </dialog>
            </main>

            <figure className="section-divider" role="presentation">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <path d="M0,100 L 0,40 L 15,75 L 30,25 L 50,85 L 70,20 L 85,70 L 100,40 L 100,100 Z" fill="#432C53"></path>
                </svg>
            </figure>
        </Fragment>
    );
};

export default MyStore;