import React, { useState, useEffect, useCallback } from 'react';
// NOTE: useAuth0 is removed as it's no longer needed for the deleted auth check
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

    // State for fetched gallery images (optional display)
    const [galleryImages, setGalleryImages] = useState<string[]>([]);
    // State for the main form data (store name and list of products)
    const [formData, setFormData] = useState<StoreFormData>({
        storeName: '',
        products: [initialProductState] // Start with one empty product form
    });
    // State to track form submission status
    const [isSubmitting, setIsSubmitting] = useState(false);
    // State for displaying errors to the user
    const [error, setError] = useState<string | null>(null);
    // State for displaying success messages to the user
    const [success, setSuccess] = useState<string | null>(null);

    // Effect to fetch gallery images on component mount
    useEffect(() => {
        const fetchImages = async () => {
            const { data, error } = await supabase.storage.from('images').list('uploads', {
                limit: 100, sortBy: { column: 'created_at', order: 'desc' }
            });
            if (error) {
                console.error('Error fetching gallery images:', error.message);
                return; // Exit if fetch fails
            }
            // Generate public URLs for fetched images
            const urls = data?.map((file) =>
                supabase.storage.from('images').getPublicUrl(`uploads/${file.name}`).data.publicUrl
            ) || [];
            setGalleryImages(urls);
        };
        fetchImages();
    }, []); // Empty dependency array: run only once on mount

    // *** The problematic useEffect checking auth has been REMOVED ***
    // This component now assumes it's rendered only when the user is authenticated (handled by routing)

    // --- Form State Update Handlers ---

    // Update store name state
    const handleStoreNameChange = useCallback((name: string) => {
        setFormData(prev => ({ ...prev, storeName: name }));
    }, []);

    // Update a specific field within a product object in the products array
    const handleProductChange = useCallback((index: number, field: keyof Omit<ProductFormData, 'image' | 'imagePreview' | 'imageURL'>, value: string) => {
        setFormData(prev => {
            const updatedProducts = [...prev.products]; // Create a copy of the products array
            // Update the specific product at the given index
            updatedProducts[index] = { ...updatedProducts[index], [field]: value };
            return { ...prev, products: updatedProducts }; // Return new state object
        });
    }, []);

    // Handle image file selection for a specific product
    const handleImageUpload = useCallback((index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; // Get the selected file
        // Handle case where file selection is cancelled or no file is selected
        if (!file) {
            setFormData(prev => {
                const prods = [...prev.products];
                // Clear image-related fields for the specific product
                prods[index] = { ...prods[index], image: null, imagePreview: '', imageURL: undefined };
                return { ...prev, products: prods };
            });
            return; // Exit if no file
        }
        // Use FileReader to generate a preview URL
        const reader = new FileReader();
        reader.onloadend = () => {
            setFormData(prev => {
                const prods = [...prev.products];
                // Update the specific product with the file object and preview URL
                prods[index] = {
                    ...prods[index],
                    image: file, // Store the File object itself for later upload
                    imagePreview: reader.result as string, // Store the data URL for preview
                    imageURL: undefined // Clear any previous final URL
                };
                return { ...prev, products: prods };
            });
        };
        reader.readAsDataURL(file); // Read the file to trigger onloadend
    }, []);

    // Add a new empty product form to the list
    const addProduct = useCallback(() => {
        setFormData(prev => ({
            ...prev,
            products: [...prev.products, initialProductState] // Append a new initial product state
        }));
    }, []);

    // Remove a product form from the list by index
    const removeProduct = useCallback((index: number) => {
        // Prevent removing the last product
        if (formData.products.length <= 1) {
            setError("You need at least one product to create a store.");
            setTimeout(() => setError(null), 3000); // Clear error after 3 seconds
            return;
        }
        // Filter out the product at the specified index
        setFormData(prev => ({
            ...prev,
            products: prev.products.filter((_, i) => i !== index)
        }));
    }, [formData.products.length]); // Dependency ensures check uses current length

    // --- Backend Interaction Logic ---

    // Helper function to upload a single image file to the backend
    const uploadImageToBackend = async (file: File, token: string): Promise<string> => {
        const imgFormData = new FormData(); // Use FormData for file uploads
        imgFormData.append('file', file); // Key 'file' must match backend expectation

        const res = await fetch(`${baseUrl}/upload/image`, { // Use specific image upload endpoint
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }, // Send auth token
            body: imgFormData, // Send the FormData object
        });

        if (!res.ok) {
            // Handle upload errors
            const errorData = await res.json().catch(() => ({ message: 'Failed to parse upload error response' }));
            console.error("Image upload failed:", errorData);
            throw new Error(`Failed to upload image ${file.name}: ${errorData.message || res.statusText}`);
        }

        const data = await res.json();
        // Ensure the backend response includes the image URL
        if (!data.url) {
            console.error("Image upload response missing URL:", data);
            throw new Error(`Image upload for ${file.name} succeeded but response did not contain a URL.`);
        }
        console.log(`Image ${file.name} uploaded, URL:`, data.url);
        return data.url; // Return the uploaded image URL
    };

    // Handle the main form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); // Prevent default form submission
        setIsSubmitting(true); // Set submitting state
        setError(null); // Clear previous errors
        setSuccess(null); // Clear previous success messages

        // **CRITICAL**: Get the token directly from sessionStorage
        // This component assumes the Navbar has already fetched and stored it.
        const token = sessionStorage.getItem('access_token');
        if (!token) {
            // If no token found, authentication is missing or failed earlier.
            setError('Authentication error: No token found. Please log in again.');
            console.error("Submit Error: No access token found in sessionStorage.");
            setIsSubmitting(false);
            // Optionally redirect to login or show a more persistent error message
            // window.location.href = '/'; // Example redirect
            return; // Stop the submission process
        }

        try {
            // --- 1. Validate form data ---
            if (!formData.storeName.trim()) throw new Error('Store name is required');
            if (formData.products.length === 0) throw new Error('At least one product is required');
            // Loop through products for validation
            for (let i = 0; i < formData.products.length; i++) {
                const p = formData.products[i];
                if (!p.productName.trim()) throw new Error(`Product #${i + 1} name is required`);
                if (!p.productDescription.trim()) throw new Error(`Product #${i + 1} description is required`);
                if (!p.productPrice.trim() || isNaN(parseFloat(p.productPrice))) throw new Error(`Product #${i + 1} needs a valid price`);
                if (!p.productCategory) throw new Error(`Product #${i + 1} category is required`);
                if (!p.image) throw new Error(`Product #${i + 1} image is required`); // Ensure image file exists
            }

            // --- 2. Promote user to seller (Optional backend step) ---
            const promoteRes = await fetch(`${baseUrl}/auth/promote-to-seller`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}` }, // Use the retrieved token
            });
            // Handle non-critical promotion errors (e.g., user already a seller - status 400)
            if (!promoteRes.ok && promoteRes.status !== 400) {
                console.warn('Promotion to seller might have failed. Status:', promoteRes.status);
            } else {
                 console.log("User promoted or already seller.");
            }

            // --- 3. Upload Images for all products ---
            console.log("Starting image uploads...");
            const productsWithImageUrls = await Promise.all(
                // Map over products, upload image for each, return product data with new URL
                formData.products.map(async (product, index) => {
                    if (!product.image) { // Should be caught by validation, but double-check
                        throw new Error(`Product #${index + 1} is missing an image file for upload.`);
                    }
                    try {
                        console.log(`Uploading image for product ${index + 1}: ${product.image.name}`);
                        // Pass the retrieved token to the upload function
                        const imageURL = await uploadImageToBackend(product.image, token);
                        // Return the product data along with the successfully obtained image URL
                        return { ...product, imageURL };
                    } catch (uploadError) {
                        // Log and re-throw upload errors to stop the entire submission
                        console.error(`Error uploading image for product #${index + 1}:`, uploadError);
                        throw new Error(`Failed to upload image for product "${product.productName || `Product #${index + 1}`}". ${uploadError instanceof Error ? uploadError.message : 'Unknown upload error'}`);
                    }
                })
            );
            console.log("Image uploads completed.");

            // --- 4. Prepare final store data for backend ---
            const storeData = {
                storeName: formData.storeName,
                // Map products to the format expected by the backend API
                products: productsWithImageUrls.map(product => ({
                    productName: product.productName,
                    productDescription: product.productDescription,
                    productPrice: parseFloat(product.productPrice), // Convert price string to number
                    productCategory: product.productCategory,
                    imageURL: product.imageURL, // Use the URL returned from the image upload
                })),
            };

            // --- 5. Send request to create the store ---
            console.log("Sending store data to backend:", JSON.stringify(storeData, null, 2));
            const createStoreResponse = await fetch(`${baseUrl}/stores`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`, // Use the retrieved token
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(storeData), // Send the prepared data
            });

            // Handle errors from the store creation endpoint
            if (!createStoreResponse.ok) {
                const errorData = await createStoreResponse.json().catch(() => ({ message: 'Failed to parse store creation error response' }));
                console.error("Store creation failed:", errorData);
                throw new Error(`Failed to create store: ${errorData.message || createStoreResponse.statusText}`);
            }

            // --- 6. Handle successful store creation ---
            const createdStore = await createStoreResponse.json();
            console.log("Store created successfully:", createdStore);
            setSuccess('Your store has been created successfully!'); // Show success message

            // Cleanup session storage flag
            sessionStorage.removeItem('clicked_become_seller');
            // Redirect to the user's store page after a short delay
            setTimeout(() => { window.location.href = '/my-store'; }, 2000);

        } catch (err) {
            // Catch any errors from validation, image upload, or store creation
            console.error("Error during store creation process:", err);
            // Display the error message to the user
            setError(err instanceof Error ? err.message : 'An unknown error occurred during store creation.');
        } finally {
            // Reset submitting state regardless of success or failure
            setIsSubmitting(false);
        }
    };

    // --- Render Logic ---

    // Calculate if submit button should be disabled based on form validity
    const isSubmitDisabled = isSubmitting || !formData.storeName || formData.products.some(p => !p.image || !p.productName || !p.productPrice || !p.productCategory);

    return (
        <div className="create-store-container">
            <h1>Create Your Artisan Store</h1>
            <p className="instructions">
                Set up your store information and add your products below. An image is required for each product.
            </p>

            {/* Display Submission Status (Errors or Success) */}
            <SubmissionStatus error={error} success={success} />

            {/* Optional: Display Fetched Image Gallery */}
            <ImageGalleryDisplay galleryImages={galleryImages} />

            {/* Main Store Creation Form */}
            <form onSubmit={handleSubmit}>
                {/* Store Information Component */}
                <StoreInfoForm
                    storeName={formData.storeName}
                    onStoreNameChange={handleStoreNameChange}
                    isSubmitting={isSubmitting}
                />

                {/* Product List Component */}
                <ProductList
                    products={formData.products}
                    productCategories={PRODUCT_CATEGORIES}
                    onProductChange={handleProductChange}
                    onImageChange={handleImageUpload}
                    onRemoveProduct={removeProduct}
                    onAddProduct={addProduct}
                    isSubmitting={isSubmitting}
                />

                {/* Form Actions (Submit Button) */}
                <div className="actions">
                    <button
                        type="submit"
                        className="create-store-btn"
                        disabled={isSubmitDisabled} // Disable button based on validation/submitting state
                    >
                        {isSubmitting ? 'Creating Store...' : 'Create Your Store'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CreateYourStore;
