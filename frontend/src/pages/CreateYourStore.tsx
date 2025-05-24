// src/pages/CreateYourStore.tsx
import React, { useState, useEffect, useCallback, Fragment } from 'react';
import supabase from '../supabaseClient';
import ProductList from '../components/ProductList';
import SubmissionStatus from '../components/SubmissionStatus'; // Assumes refactored version
import ImageGalleryDisplay from '../components/ImageGalleryDisplay';
import {
    ProductFormData,
    StoreFormData,
    PRODUCT_CATEGORIES,
    STANDARD_DELIVERY_TIMES,
    EXPRESS_DELIVERY_TIMES
} from '../types/createStore';
import './CreateYourStore.css';

const initialProductState: ProductFormData = {
    productName: '',
    productDescription: '',
    productPrice: '',
    productQuantity: '',
    productCategory: '',
    image: null,
    imagePreview: null,
};

const initialStoreState: StoreFormData = {
    storeName: '',
    standardPrice: '',
    standardTime: STANDARD_DELIVERY_TIMES[0],
    expressPrice: '',
    expressTime: EXPRESS_DELIVERY_TIMES[0],
    isActiveStore: false,
    products: [initialProductState]
};

const CreateYourStore: React.FC = () => {
    const baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
    const [galleryImages, setGalleryImages] = useState<string[]>([]);
    const [formData, setFormData] = useState<StoreFormData>(initialStoreState);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        const fetchImages = async () => {
            const { data, error: fetchError } = await supabase.storage.from('images').list('uploads', {
                limit: 100, sortBy: { column: 'created_at', order: 'desc' }
            });
            if (fetchError) { console.error('Error fetching gallery images:', fetchError.message); return; }
            const urls = data?.map((file) =>
                supabase.storage.from('images').getPublicUrl(`uploads/${file.name}`).data.publicUrl
            ) || [];
            setGalleryImages(urls);
        };
        fetchImages();
    }, []);

    const handleStoreNameChange = useCallback((name: string) => {
        setFormData(prev => ({ ...prev, storeName: name }));
    }, []);

    const handleStoreFieldChange = useCallback((field: keyof Omit<StoreFormData, 'products'>, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    }, []);

    const handleProductChange = useCallback((index: number, field: keyof Omit<ProductFormData, 'image' | 'imagePreview' | 'imageURL'>, value: string) => {
        setFormData(prev => {
            const updatedProducts = [...prev.products];
            if(updatedProducts[index]) {
                updatedProducts[index] = { ...updatedProducts[index], [field]: value };
            }
            return { ...prev, products: updatedProducts };
        });
    }, []);

    const handleImageUpload = useCallback((index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        setFormData(prev => {
            const prods = [...prev.products];
            if (!prods[index]) return prev;

            if (!file) {
                prods[index] = { ...prods[index], image: null, imagePreview: null, imageURL: undefined };
            } else {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setFormData(currentFormData => {
                        const updatedProds = [...currentFormData.products];
                        if(updatedProds[index]){
                            updatedProds[index] = {
                                ...updatedProds[index],
                                image: file,
                                imagePreview: reader.result as string,
                                imageURL: undefined
                            };
                        }
                        return { ...currentFormData, products: updatedProds };
                    });
                };
                reader.readAsDataURL(file);
                return prev; 
            }
            return { ...prev, products: prods };
        });
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
            throw new Error(`Failed to upload image ${file.name}: ${errorData.message || res.statusText}`);
        }
        const data = await res.json();
        if (!data.url) {
            throw new Error(`Image upload for ${file.name} succeeded but response did not contain a URL.`);
        }
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
            setIsSubmitting(false);
            return;
        }

        try {
            if (!formData.storeName.trim()) throw new Error('Store name is required');
            const standardPriceNum = parseFloat(formData.standardPrice);
            if (isNaN(standardPriceNum) || standardPriceNum < 0) throw new Error('Valid standard delivery price required (must be 0 or greater).');
            const expressPriceNum = parseFloat(formData.expressPrice);
            if (isNaN(expressPriceNum) || expressPriceNum < 0) throw new Error('Valid express delivery price required (must be 0 or greater).');
            if (!formData.standardTime) throw new Error('Standard delivery time selection is required.');
            if (!formData.expressTime) throw new Error('Express delivery time selection is required.');

            if (formData.products.length === 0) throw new Error('At least one product is required');
            for (let i = 0; i < formData.products.length; i++) {
                const p = formData.products[i];
                const price = parseFloat(p.productPrice);
                const quantity = parseInt(p.productQuantity, 10);
                if (!p.productName.trim()) throw new Error(`Product #${i + 1} name is required`);
                if (!p.productDescription.trim()) throw new Error(`Product #${i + 1} description is required`);
                if (!p.productPrice.trim() || isNaN(price) || price <= 0) throw new Error(`Product #${i + 1} needs a valid positive price`);
                if (!p.productQuantity.trim() || isNaN(quantity) || quantity < 0) throw new Error(`Product #${i + 1} needs a valid non-negative quantity`);
                if (!p.productCategory) throw new Error(`Product #${i + 1} category is required`);
                if (!p.image) throw new Error(`Product #${i + 1} image is required`);
            }

            const promoteRes = await fetch(`${baseUrl}/auth/promote-to-seller`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (!promoteRes.ok && promoteRes.status !== 400) { console.warn('Promotion to seller might have failed. Status:', promoteRes.status); }
            else if (promoteRes.ok) { console.log("User promoted to seller."); }
            else { console.log("User already a seller or promotion not applicable."); }

            const productsWithImageUrls = await Promise.all(
                formData.products.map(async (product, index) => {
                    if (!product.image) throw new Error(`Product #${index + 1} is missing an image file for upload.`);
                    try {
                        const uploadedUrl = await uploadImageToBackend(product.image, token);
                        return { ...product, imageURL: uploadedUrl };
                    } catch (uploadError) {
                        throw new Error(`Failed to upload image for product "${product.productName || `Product #${index + 1}`}". ${uploadError instanceof Error ? uploadError.message : 'Unknown upload error'}`);
                    }
                })
            );

            const storeData = {
                storeName: formData.storeName,
                standardPrice: parseFloat(formData.standardPrice),
                standardTime: formData.standardTime,
                expressPrice: parseFloat(formData.expressPrice),
                expressTime: formData.expressTime,
                products: productsWithImageUrls.map(product => {
                    if (!product.imageURL) throw new Error(`Image URL missing for product: ${product.productName}.`);
                    const price = parseFloat(product.productPrice);
                    const quantity = parseInt(product.productQuantity, 10);
                    if (isNaN(price) || isNaN(quantity)) {
                        throw new Error(`Invalid number format for price or quantity in product: ${product.productName}`);
                    }
                    return {
                        name: product.productName,
                        description: product.productDescription,
                        price: price,
                        category: product.productCategory,
                        imageUrl: product.imageURL,
                        productquantity: quantity
                    };
                }),
            };

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
                throw new Error(`Failed to create store: ${errorData.message || createStoreResponse.statusText}`);
            }

            const createdStore = await createStoreResponse.json();
            console.log("Store created successfully:", createdStore);
            setSuccess('Your store has been created successfully! Redirecting to your store...');
            sessionStorage.removeItem('clicked_become_seller');
            setTimeout(() => { window.location.href = '/my-store'; }, 2000);

        } catch (err) {
            console.error("Error during store creation process:", err);
            setError(err instanceof Error ? err.message : 'An unknown error occurred during store creation.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const isSubmitDisabled = isSubmitting || !formData.storeName ||
        !formData.standardPrice || !formData.standardTime ||
        !formData.expressPrice || !formData.expressTime ||
        formData.products.some(
            p => !p.image || !p.productName || !p.productPrice || !p.productQuantity || !p.productCategory
        );

    return (
        <section className="create-store-container">
            <header>
                <h1 className="main-titles">Create Your Artisan Store</h1>
                <p className="instructions">
                    Set up your store information, delivery options, and add your initial products below.
                </p>
            </header>

            <ImageGalleryDisplay galleryImages={galleryImages} />

            <form onSubmit={handleSubmit}>
                <section className="store-info-section">
                  <h2 className="section-title">Store Name</h2>
                  <section className="store-name-box">
                    <fieldset className="form-group">
                      <input
                        type="text"
                        id="storeName"
                        value={formData.storeName}
                        onChange={(e) => handleStoreNameChange(e.target.value)}
                        placeholder="Enter your store name"
                        required
                        disabled={isSubmitting}
                      />
                    </fieldset>
                  </section>
                </section>

                <h2 className="delivery-options-title">Delivery Options</h2>
                <fieldset className="delivery-options">
                    <section style={{ marginBottom: '18px' }}>
                      <h4 style={{ margin: '0 0 12px 0', fontWeight: 600 }}>Standard delivery</h4>
                      <label htmlFor="standardPrice">Price (R)</label>
                      <input
                        type="number"
                        id="standardPrice"
                        name="standardPrice"
                        value={formData.standardPrice}
                        onChange={(e) => handleStoreFieldChange('standardPrice', e.target.value)}
                        placeholder="e.g., 50.00"
                        min="0"
                        step="0.01"
                        required
                        disabled={isSubmitting}
                        aria-required="true"
                      />
                      <label htmlFor="standardTime">Time</label>
                      <select
                        id="standardTime"
                        name="standardTime"
                        value={formData.standardTime}
                        onChange={(e) => handleStoreFieldChange('standardTime', e.target.value)}
                        required
                        disabled={isSubmitting}
                        aria-required="true"
                      >
                        {STANDARD_DELIVERY_TIMES.map(time => (
                          <option key={`std-${time}`} value={time}>{time} Days</option>
                        ))}
                      </select>
                    </section>
                    <hr className="delivery-separator" />
                    <section>
                      <h4 style={{ margin: '0 0 12px 0', fontWeight: 600 }}>Express delivery</h4>
                      <label htmlFor="expressPrice">Price (R)</label>
                      <input
                        type="number"
                        id="expressPrice"
                        name="expressPrice"
                        value={formData.expressPrice}
                        onChange={(e) => handleStoreFieldChange('expressPrice', e.target.value)}
                        placeholder="e.g., 100.00"
                        min="0"
                        step="0.01"
                        required
                        disabled={isSubmitting}
                        aria-required="true"
                      />
                      <label htmlFor="expressTime">Time</label>
                      <select
                        id="expressTime"
                        name="expressTime"
                        value={formData.expressTime}
                        onChange={(e) => handleStoreFieldChange('expressTime', e.target.value)}
                        required
                        disabled={isSubmitting}
                        aria-required="true"
                      >
                        {EXPRESS_DELIVERY_TIMES.map(time => (
                          <option key={`exp-${time}`} value={time}>{time} Days</option>
                        ))}
                      </select>
                    </section>
                </fieldset>

                <ProductList
                    products={formData.products}
                    productCategories={PRODUCT_CATEGORIES}
                    onProductChange={handleProductChange}
                    onImageChange={handleImageUpload}
                    onRemoveProduct={removeProduct}
                    onAddProduct={addProduct}
                    isSubmitting={isSubmitting}
                />

                {/* SubmissionStatus and button are now direct children of form, grouped by Fragment */}
                <Fragment> 
                    <SubmissionStatus error={error} success={success} />
                    <button
                        type="submit"
                        className="create-store-btn"
                        disabled={isSubmitDisabled}
                    >
                        {isSubmitting ? 'Creating Store...' : 'Create Your Store'}
                    </button>
                </Fragment> 
            </form>
        </section>
    );
};

export default CreateYourStore;