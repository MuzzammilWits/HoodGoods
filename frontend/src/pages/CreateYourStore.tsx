// src/pages/CreateYourStore.tsx
import React, { useState, useEffect, useCallback } from 'react';
import supabase from '../supabaseClient'; // Ensure path is correct
import StoreInfoForm from '../components/StoreInfoForm'; // Ensure path is correct
import ProductList from '../components/ProductList'; // Ensure path is correct
import SubmissionStatus from '../components/SubmissionStatus'; // Ensure path is correct
import ImageGalleryDisplay from '../components/ImageGalleryDisplay'; // Ensure path is correct (Optional)
// Ensure ProductFormData includes productQuantity: string
import { ProductFormData, StoreFormData, PRODUCT_CATEGORIES } from '../types/createStore';
import './CreateYourStore.css'; // Ensure path is correct

// Initial state for a new product form entry - ADD productQuantity
const initialProductState: ProductFormData = {
    productName: '',
    productDescription: '',
    productPrice: '',
    productQuantity: '', // Added quantity field
    productCategory: '',
    image: null,
    imagePreview: ''
};

const CreateYourStore: React.FC = () => {
    // Base URL for backend API calls
    const baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

    // State variables (as before)
    const [galleryImages, setGalleryImages] = useState<string[]>([]);
    const [formData, setFormData] = useState<StoreFormData>({
        storeName: '',
        products: [initialProductState] // Uses updated initial state
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // useEffect for fetching gallery images (as before)
    useEffect(() => {
        const fetchImages = async () => {
            // ... (implementation unchanged)
            const { data, error: fetchError } = await supabase.storage.from('images').list('uploads', {
                limit: 100, sortBy: { column: 'created_at', order: 'desc' }
            });
            if (fetchError) {
                console.error('Error fetching gallery images:', fetchError.message);
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

    // handleProductChange should work for productQuantity due to dynamic field update
    const handleProductChange = useCallback((index: number, field: keyof Omit<ProductFormData, 'image' | 'imagePreview' | 'imageURL'>, value: string) => {
        setFormData(prev => {
            const updatedProducts = [...prev.products];
            updatedProducts[index] = { ...updatedProducts[index], [field]: value };
            return { ...prev, products: updatedProducts };
        });
    }, []);

    const handleImageUpload = useCallback((index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        // ... (implementation unchanged)
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
            // Ensure new product added also uses the updated initial state
            products: [...prev.products, initialProductState]
        }));
    }, []);

    const removeProduct = useCallback((index: number) => {
        // ... (implementation unchanged)
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

    // Backend Interaction Logic (uploadImageToBackend remains unchanged)
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
            // 1. Validation - ADD productQuantity validation
            if (!formData.storeName.trim()) throw new Error('Store name is required');
            if (formData.products.length === 0) throw new Error('At least one product is required');
            for (let i = 0; i < formData.products.length; i++) {
                const p = formData.products[i];
                const price = parseFloat(p.productPrice);
                const quantity = parseInt(p.productQuantity, 10); // Parse quantity

                if (!p.productName.trim()) throw new Error(`Product #${i + 1} name is required`);
                if (!p.productDescription.trim()) throw new Error(`Product #${i + 1} description is required`);
                if (!p.productPrice.trim() || isNaN(price) || price <= 0) throw new Error(`Product #${i + 1} needs a valid positive price`);
                // Add quantity check
                if (!p.productQuantity.trim() || isNaN(quantity) || quantity < 0) throw new Error(`Product #${i + 1} needs a valid non-negative quantity`);
                if (!p.productCategory) throw new Error(`Product #${i + 1} category is required`);
                if (!p.image) throw new Error(`Product #${i + 1} image is required`);
            }

            // 2. Promote (optional) - Unchanged
            const promoteRes = await fetch(`${baseUrl}/auth/promote-to-seller`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (!promoteRes.ok && promoteRes.status !== 400) {
                 console.warn('Promotion to seller might have failed. Status:', promoteRes.status);
             } else if (promoteRes.ok) {
                 console.log("User promoted to seller.");
             } else {
                 console.log("User already a seller or promotion not applicable.");
             }


            // 3. Upload Images - Unchanged logic, relies on updated form data
            console.log("Starting image uploads...");
            const productsWithImageUrls = await Promise.all(
                formData.products.map(async (product, index) => {
                     // ... (upload logic unchanged)
                     if (!product.image) throw new Error(`Product #${index + 1} is missing an image file for upload.`);
                    try {
                        const uploadedUrl = await uploadImageToBackend(product.image, token);
                        return { ...product, imageURL: uploadedUrl }; // Pass full product data including quantity string
                    } catch (uploadError) {
                        console.error(`Error uploading image for product #${index + 1}:`, uploadError);
                        throw new Error(`Failed to upload image for product "${product.productName || `Product #${index + 1}`}". ${uploadError instanceof Error ? uploadError.message : 'Unknown upload error'}`);
                    }
                })
            );
            console.log("Image uploads completed.");

            // 4. Prepare final data - ADD parsing and include productquantity
            const storeData = {
                storeName: formData.storeName,
                products: productsWithImageUrls.map(product => {
                    if (!product.imageURL) throw new Error(`Image URL failed to process for product: ${product.productName}. Cannot proceed.`);
                    const price = parseFloat(product.productPrice);
                    const quantity = parseInt(product.productQuantity, 10); // Parse quantity here

                    // Double-check parsing just before sending
                    if (isNaN(price) || isNaN(quantity)) {
                        console.error("Parsing failed before sending:", product);
                        throw new Error(`Invalid number format for price or quantity in product: ${product.productName}`);
                    }

                    return {
                        name: product.productName,
                        description: product.productDescription,
                        price: price, // Send parsed price
                        category: product.productCategory,
                        imageUrl: product.imageURL,
                        productquantity: quantity // Send parsed quantity
                    };
                }),
            };

            // 5. Create Store - Unchanged logic, sends updated data structure
            console.log("Sending Create Store Payload:", JSON.stringify(storeData, null, 2)); // Kept log for now

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

            // 6. Success - Unchanged
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
    // ADD !p.productQuantity to disabled check
    const isSubmitDisabled = isSubmitting || !formData.storeName || formData.products.some(
        p => !p.image || !p.productName || !p.productPrice || !p.productQuantity || !p.productCategory
    );

    return (
        <section className="create-store-container">
            <header>
                <h1>Create Your Artisan Store</h1>
                <p className="instructions">
                    Set up your store information and add your products below. An image and quantity are required for each product.
                </p>
            </header>

            {/* --- SubmissionStatus component MOVED from here --- */}

            <ImageGalleryDisplay galleryImages={galleryImages} />

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

                {/* --- Actions section at the bottom --- */}
                <div className="actions">
                    {/* --- SubmissionStatus component MOVED TO HERE --- */}
                    <SubmissionStatus error={error} success={success} />
                    {/* --- End moved component --- */}

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