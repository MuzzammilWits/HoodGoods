// src/pages/CreateYourStore.tsx
import React, { useState, useEffect, useCallback } from 'react';
import supabase from '../supabaseClient'; // Ensure path is correct
import StoreInfoForm from '../components/StoreInfoForm'; // Ensure path is correct
import ProductList from '../components/ProductList'; // Ensure path is correct
import SubmissionStatus from '../components/SubmissionStatus'; // Ensure path is correct
import ImageGalleryDisplay from '../components/ImageGalleryDisplay'; // Ensure path is correct (Optional)
import { ProductFormData, StoreFormData, PRODUCT_CATEGORIES } from '../types/createStore'; // Ensure path is correct
import './CreateYourStore.css'; // Ensure path is correct

// Initial state for a new product form entry
const initialProductState: ProductFormData = {
    productName: '',
    productDescription: '',
    productPrice: '',
    productCategory: '',
    image: null,
    imagePreview: ''
};

const CreateYourStore: React.FC = () => {
    // Base URL for backend API calls
    const baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'; // Fallback URL

    // State variables (as before)
    const [galleryImages, setGalleryImages] = useState<string[]>([]);
    const [formData, setFormData] = useState<StoreFormData>({
        storeName: '',
        products: [initialProductState]
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // useEffect for fetching gallery images (as before)
    useEffect(() => {
        const fetchImages = async () => {
            const { data, error } = await supabase.storage.from('images').list('uploads', {
                limit: 100, sortBy: { column: 'created_at', order: 'desc' }
            });
            if (error) {
                console.error('Error fetching gallery images:', error.message);
                return;
            }
            const urls = data?.map((file) =>
                supabase.storage.from('images').getPublicUrl(`uploads/${file.name}`).data.publicUrl
            ) || [];
            setGalleryImages(urls);
        };
        fetchImages();
    }, []);

    // Form State Update Handlers (as before)
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
        if (!file) {
            setFormData(prev => {
                const prods = [...prev.products];
                prods[index] = { ...prods[index], image: null, imagePreview: '', imageURL: undefined };
                return { ...prev, products: prods };
            });
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
            setFormData(prev => {
                const prods = [...prev.products];
                prods[index] = {
                    ...prods[index],
                    image: file,
                    imagePreview: reader.result as string,
                    imageURL: undefined
                };
                return { ...prev, products: prods };
            });
        };
        reader.readAsDataURL(file);
    }, []);

    const addProduct = useCallback(() => {
        setFormData(prev => ({
            ...prev,
            products: [...prev.products, initialProductState]
        }));
    }, []);

    const removeProduct = useCallback((index: number) => {
        if (formData.products.length <= 1) {
            setError("You need at least one product to create a store.");
            setTimeout(() => setError(null), 3000);
            return;
        }
        setFormData(prev => ({
            ...prev,
            products: prev.products.filter((_, i) => i !== index)
        }));
    }, [formData.products.length]);

    // Backend Interaction Logic (uploadImageToBackend, handleSubmit - as before)
    const uploadImageToBackend = async (file: File, token: string): Promise<string> => {
        const imgFormData = new FormData();
        imgFormData.append('file', file);
        const res = await fetch(`${baseUrl}/upload/image`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);
        setSuccess(null);
        const token = sessionStorage.getItem('access_token');
        if (!token) {
            setError('Authentication error: No token found. Please log in again.');
            console.error("Submit Error: No access token found in sessionStorage.");
            setIsSubmitting(false);
            return;
        }

        try {
            // 1. Validation
            if (!formData.storeName.trim()) throw new Error('Store name is required');
            if (formData.products.length === 0) throw new Error('At least one product is required');
            for (let i = 0; i < formData.products.length; i++) {
                const p = formData.products[i];
                if (!p.productName.trim()) throw new Error(`Product #${i + 1} name is required`);
                if (!p.productDescription.trim()) throw new Error(`Product #${i + 1} description is required`);
                if (!p.productPrice.trim() || isNaN(parseFloat(p.productPrice))) throw new Error(`Product #${i + 1} needs a valid price`);
                if (!p.productCategory) throw new Error(`Product #${i + 1} category is required`);
                if (!p.image) throw new Error(`Product #${i + 1} image is required`);
            }

            // 2. Promote (optional)
            const promoteRes = await fetch(`${baseUrl}/auth/promote-to-seller`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (!promoteRes.ok && promoteRes.status !== 400) {
                console.warn('Promotion to seller might have failed. Status:', promoteRes.status);
            } else {
                console.log("User promoted or already seller.");
            }

            // 3. Upload Images
            console.log("Starting image uploads...");
            const productsWithImageUrls = await Promise.all(
                formData.products.map(async (product, index) => {
                    if (!product.image) throw new Error(`Product #${index + 1} is missing an image file for upload.`);
                    try {
                        const uploadedUrl = await uploadImageToBackend(product.image, token);
                        return { ...product, imageURL: uploadedUrl };
                    } catch (uploadError) {
                        console.error(`Error uploading image for product #${index + 1}:`, uploadError);
                        throw new Error(`Failed to upload image for product "${product.productName || `Product #${index + 1}`}". ${uploadError instanceof Error ? uploadError.message : 'Unknown upload error'}`);
                    }
                })
            );
            console.log("Image uploads completed.");

            // 4. Prepare final data
            const storeData = {
                storeName: formData.storeName,
                products: productsWithImageUrls.map(product => {
                    if (!product.imageURL) throw new Error(`Image URL failed to process for product: ${product.productName}. Cannot proceed.`);
                    return {
                        name: product.productName,
                        description: product.productDescription,
                        price: parseFloat(product.productPrice),
                        category: product.productCategory,
                        imageUrl: product.imageURL // Correct key
                    };
                }),
            };

            // 5. Create Store
            console.log("Sending store data to backend:", JSON.stringify(storeData, null, 2));
            const createStoreResponse = await fetch(`${baseUrl}/stores`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(storeData),
            });
            if (!createStoreResponse.ok) {
                const errorData = await createStoreResponse.json().catch(() => ({ message: 'Failed to parse store creation error response' }));
                console.error("Store creation failed:", errorData);
                throw new Error(`Failed to create store: ${errorData.message || createStoreResponse.statusText}`);
            }

            // 6. Success
            const createdStore = await createStoreResponse.json();
            console.log("Store created successfully:", createdStore);
            setSuccess('Your store has been created successfully!');
            sessionStorage.removeItem('clicked_become_seller');
            setTimeout(() => { window.location.href = '/my-store'; }, 2000);

        } catch (err) {
            console.error("Error during store creation process:", err);
            setError(err instanceof Error ? err.message : 'An unknown error occurred during store creation.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- Render Logic ---
    const isSubmitDisabled = isSubmitting || !formData.storeName || formData.products.some(p => !p.image || !p.productName || !p.productPrice || !p.productCategory);

    return (
        // Use <section> as the main container for the page content
        <section className="create-store-container">
            {/* Use <header> for the main heading and introductory text */}
            <header>
                <h1>Create Your Artisan Store</h1>
                <p className="instructions">
                    Set up your store information and add your products below. An image is required for each product.
                </p>
            </header>

            {/* Submission status remains */}
            <SubmissionStatus error={error} success={success} />

            {/* Optional Image Gallery remains */}
            <ImageGalleryDisplay galleryImages={galleryImages} />

            {/* The <form> element is semantic */}
            <form onSubmit={handleSubmit}>
                {/* StoreInfoForm component (assuming internal semantics) */}
                <StoreInfoForm
                    storeName={formData.storeName}
                    onStoreNameChange={handleStoreNameChange}
                    isSubmitting={isSubmitting}
                />

                {/* ProductList component (assuming internal semantics) */}
                {/* Consider wrapping ProductList in a <fieldset> if appropriate */}
                <ProductList
                    products={formData.products}
                    productCategories={PRODUCT_CATEGORIES}
                    onProductChange={handleProductChange}
                    onImageChange={handleImageUpload}
                    onRemoveProduct={removeProduct}
                    onAddProduct={addProduct}
                    isSubmitting={isSubmitting}
                />

                {/* Actions - Using a fragment instead of div */}
                {/* If specific layout needed, a div might be required by the CSS */}
                <div className="actions"> {/* Kept div for potential CSS targeting */}
                    <button
                        type="submit"
                        className="create-store-btn"
                        disabled={isSubmitDisabled}
                    >
                        {isSubmitting ? 'Creating Store...' : 'Create Your Store'}
                    </button>
                </div>
            </form>
        </section>
    );
};

export default CreateYourStore;
