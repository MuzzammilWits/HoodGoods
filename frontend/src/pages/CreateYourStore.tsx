// src/pages/CreateYourStore.tsx (or component path)
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import supabase from '../supabaseClient';
import StoreInfoForm from '../components/StoreInfoForm'; // Adjust path
import ProductList from '../components/ProductList'; // Adjust path
import SubmissionStatus from '../components/SubmissionStatus'; // Adjust path
import ImageGalleryDisplay from '../components/ImageGalleryDisplay'; // Adjust path (Optional)
import { ProductFormData, StoreFormData, PRODUCT_CATEGORIES } from '../types/createStore'; // Adjust path
import './CreateYourStore.css'; // Ensure CSS path is correct

const initialProductState: ProductFormData = {
    productName: '', productDescription: '', productPrice: '',
    productCategory: '', image: null, imagePreview: ''
};

const CreateYourStore: React.FC = () => {
    const { loginWithRedirect, isAuthenticated } = useAuth0();
    const baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

    const [checkingAuth, setCheckingAuth] = useState(true);
    const [galleryImages, setGalleryImages] = useState<string[]>([]);
    const [formData, setFormData] = useState<StoreFormData>({
        storeName: '',
        products: [initialProductState]
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // --- Effects (Auth Check, Gallery Fetch) ---
    useEffect(() => {
        const fetchImages = async () => { /* ... fetch logic ... */
            const { data, error } = await supabase.storage.from('images').list('uploads', {
                limit: 100, sortBy: { column: 'created_at', order: 'desc' }
            });
            if (error) { console.error('Error fetching images:', error.message); return; }
            const urls = data?.map((file) =>
                supabase.storage.from('images').getPublicUrl(`uploads/${file.name}`).data.publicUrl
            ) || [];
            setGalleryImages(urls);
        };
        fetchImages();
    }, []);

    useEffect(() => {
        const checkAuth = () => { /* ... auth check logic ... */
            const token = sessionStorage.getItem('access_token');
            if (!token && !isAuthenticated) {
                loginWithRedirect({ appState: { returnTo: window.location.pathname } });
                return false;
            } return true;
        };
        setCheckingAuth(!checkAuth());
    }, [loginWithRedirect, isAuthenticated]);

    // --- Form State Update Handlers ---
    const handleStoreNameChange = useCallback((name: string) => {
        setFormData(prev => ({ ...prev, storeName: name }));
    }, []);

    const handleProductChange = useCallback((index: number, field: keyof Omit<ProductFormData, 'image' | 'imagePreview' | 'imageURL'>, value: string) => {
        setFormData(prev => {
            const updatedProducts = [...prev.products];
            updatedProducts[index] = { ...updatedProducts[index], [field]: value };
            return { ...prev, products: updatedProducts };
        });
    }, []);

    const handleImageUpload = useCallback((index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) { /* ... clear image logic ... */
            setFormData(prev => {
                const prods = [...prev.products];
                prods[index] = { ...prods[index], image: null, imagePreview: '', imageURL: undefined };
                return { ...prev, products: prods };
            }); return;
        }
        const reader = new FileReader();
        reader.onloadend = () => { /* ... set image and preview ... */
            setFormData(prev => {
                const prods = [...prev.products];
                prods[index] = { ...prods[index], image: file, imagePreview: reader.result as string, imageURL: undefined };
                return { ...prev, products: prods };
            });
        };
        reader.readAsDataURL(file);
    }, []);

    const addProduct = useCallback(() => {
        setFormData(prev => ({ ...prev, products: [...prev.products, initialProductState] }));
    }, []);

    const removeProduct = useCallback((index: number) => {
        if (formData.products.length <= 1) { /* ... set error ... */
            setError("You need at least one product..."); setTimeout(() => setError(null), 3000); return;
        }
        setFormData(prev => ({ ...prev, products: prev.products.filter((_, i) => i !== index) }));
    }, [formData.products.length]);

    // --- Backend Interaction Logic ---
    const uploadImageToBackend = async (file: File, token: string): Promise<string> => {
        /* ... identical upload logic as before ... */
        const imgFormData = new FormData();
        imgFormData.append('file', file);
        const res = await fetch(`${baseUrl}/upload/image`, {
            method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: imgFormData,
        });
        if (!res.ok) {
            const errorData = await res.json().catch(() => ({ message: 'Failed to parse upload error' }));
            throw new Error(`Failed to upload image ${file.name}: ${errorData.message || res.statusText}`);
        }
        const data = await res.json();
        if (!data.url) { throw new Error(`Upload success but no URL for ${file.name}`); }
        return data.url;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true); setError(null); setSuccess(null);
        const token = sessionStorage.getItem('access_token');
        if (!token) { /* ... handle auth error ... */
            setError('Auth error...'); setIsSubmitting(false); return;
        }

        try {
            // 1. Validate
             if (!formData.storeName.trim()) throw new Error('Store name is required');
             if (formData.products.length === 0) throw new Error('At least one product is required');
             /* ... rest of validation loop ... */
            for (let i = 0; i < formData.products.length; i++) {
                 const p = formData.products[i];
                 if (!p.productName.trim()) throw new Error(`P#${i+1} name required`);
                 if (!p.productDescription.trim()) throw new Error(`P#${i+1} desc required`);
                 if (!p.productPrice.trim() || isNaN(parseFloat(p.productPrice))) throw new Error(`P#${i+1} valid price required`);
                 if (!p.productCategory) throw new Error(`P#${i+1} category required`);
                 if (!p.image) throw new Error(`P#${i+1} image required`);
            }

            // 2. Promote User (Optional)
             /* ... identical promote logic ... */
             const promoteRes = await fetch(`${baseUrl}/auth/promote-to-seller`, { /* ... */ });
             if (!promoteRes.ok && promoteRes.status !== 400) console.warn('Promotion might have failed');

            // 3. Upload Images
             /* ... identical image upload map/Promise.all ... */
             const productsWithUrls = await Promise.all(
                 formData.products.map(async (p, i) => {
                     if (!p.image) throw new Error(`P#${i+1} missing image file.`);
                     try {
                         const url = await uploadImageToBackend(p.image, token); return { ...p, imageURL: url };
                     } catch (err) { throw err; /* Re-throw to stop submission */ }
                 })
             );

            // 4. Prepare Store Data
             /* ... identical store data preparation ... */
             const storeData = {
                 storeName: formData.storeName,
                 products: productsWithUrls.map(p => ({
                     productName: p.productName, productDescription: p.productDescription,
                     productPrice: parseFloat(p.productPrice), productCategory: p.productCategory,
                     imageURL: p.imageURL,
                 })),
             };

            // 5. Create Store
             /* ... identical create store fetch ... */
             const createRes = await fetch(`${baseUrl}/stores`, {
                 method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                 body: JSON.stringify(storeData),
             });
             if (!createRes.ok) {
                 const errData = await createRes.json().catch(() => ({ message: 'Failed to parse create error' }));
                 throw new Error(`Failed to create store: ${errData.message || createRes.statusText}`);
             }

            // 6. Success & Cleanup
             /* ... identical success handling and redirect ... */
             const createdStore = await createRes.json();
             console.log("Store created:", createdStore);
             setSuccess('Store created successfully!');
             sessionStorage.removeItem('clicked_become_seller');
             setTimeout(() => { window.location.href = '/my-store'; }, 2000);

        } catch (err) {
            console.error("Store creation error:", err);
            setError(err instanceof Error ? err.message : 'Unknown error during creation.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- Render ---
    if (checkingAuth) {
        return <div className="loading-container">Checking authentication...</div>;
    }

    const isSubmitDisabled = isSubmitting || !formData.storeName || formData.products.some(p => !p.image || !p.productName || !p.productPrice || !p.productCategory);

    return (
        <div className="create-store-container">
            <h1>Create Your Artisan Store</h1>
            <p className="instructions">...</p>

            <SubmissionStatus error={error} success={success} />
            <ImageGalleryDisplay galleryImages={galleryImages} /> {/* Optional */}

            <form onSubmit={handleSubmit}>
                <StoreInfoForm
                    storeName={formData.storeName}
                    onStoreNameChange={handleStoreNameChange}
                    isSubmitting={isSubmitting}
                />

                <ProductList
                    products={formData.products}
                    productCategories={PRODUCT_CATEGORIES}
                    onProductChange={handleProductChange}
                    onImageChange={handleImageUpload}
                    onRemoveProduct={removeProduct}
                    onAddProduct={addProduct}
                    isSubmitting={isSubmitting}
                />

                <div className="actions">
                    <button type="submit" className="create-store-btn" disabled={isSubmitDisabled}>
                        {isSubmitting ? 'Creating Store...' : 'Create Your Store'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CreateYourStore;