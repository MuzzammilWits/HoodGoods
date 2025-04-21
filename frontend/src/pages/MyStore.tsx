// frontend/src/pages/MyStore.tsx
import React, { useState, useEffect, useCallback, useRef, ChangeEvent } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import './myStore.css'; // Make sure this CSS file exists and is styled appropriately

// --- Frontend Type Definitions (Matching Backend Structure) ---

// Payload for adding a product
interface AddProductPayload {
    name: string;
    description: string;
    price: number;
    category: string;
    imageUrl: string; // Correct key from backend upload response
    storeName?: string; // Optional, backend might infer from authenticated user
}

// Payload for updating a product (all fields optional for PATCH)
interface UpdateProductPayload {
    name?: string;
    description?: string;
    price?: number;
    category?: string;
    imageUrl?: string; // Correct key
}

// Frontend representation of a Product (as received from GET /stores/my-store)
interface Product {
    prodId: number; // Matches backend Product entity primary key name
    name: string;
    description: string;
    price: number;
    category: string;
    imageUrl?: string | null; // Matches backend Product entity field name
    storeName?: string; // If backend includes it
    isActive?: boolean; // If backend includes it
}

// Frontend representation of the Store
interface Store {
    storeName: string;
    products: Product[]; // Array of products using the Product interface
}

// Types for form state management
// Fields directly editable in the modal (excluding ID, image URL, etc.)
type EditableProductFields = Omit<Product, 'prodId' | 'imageUrl' | 'storeName' | 'isActive'>;
// Fields for the "Add New Product" form state
type NewProductFields = Partial<Omit<Product, 'prodId' | 'imageUrl' | 'storeName' | 'isActive'>> & {
    imageFile?: File | null; // To hold the selected image file
    imagePreviewUrl?: string | null; // To hold the data URL for preview
};

// --- Component ---
const MyStore: React.FC = () => {
    // --- Hooks ---
    const { loginWithRedirect, isAuthenticated, getAccessTokenSilently } = useAuth0();
    const baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'; // Get base URL from environment variables

    // --- State ---
    // General loading/error state
    const [checkingAuth, setCheckingAuth] = useState(true); // Initial auth check state
    const [loading, setLoading] = useState(true); // Data loading state
    const [store, setStore] = useState<Store | null>(null); // Holds the fetched store data
    const [error, setError] = useState<string | null>(null); // For general fetch errors
    const [actionError, setActionError] = useState<string | null>(null); // For errors during CRUD actions (add, edit, delete)

    // Add Product State
    const initialNewProductState: NewProductFields = { name: '', description: '', price: 0, category: '', imageFile: null, imagePreviewUrl: null };
    const [isAddingProductFormVisible, setIsAddingProductFormVisible] = useState(false); // Toggle for add form
    const [isAddingProductLoading, setIsAddingProductLoading] = useState(false); // Loading state for add action
    const [newProduct, setNewProduct] = useState<NewProductFields>(initialNewProductState); // State for the new product form fields
    const addFileInputRef = useRef<HTMLInputElement>(null); // Ref to clear file input

    // Edit Product State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false); // Toggle for edit modal
    const [editingProduct, setEditingProduct] = useState<Product | null>(null); // Holds the product being edited
    const [editFormData, setEditFormData] = useState<Partial<EditableProductFields>>({}); // State for the edit form fields
    const [editProductImage, setEditProductImage] = useState<File | null>(null); // Holds the *new* image file selected during edit
    const [editProductPreview, setEditProductPreview] = useState<string>(''); // Holds preview URL for current or new image in edit modal
    const [isSavingEdit, setIsSavingEdit] = useState(false); // Loading state for save action
    const editFileInputRef = useRef<HTMLInputElement>(null); // Ref to clear file input

    // Delete Product State
    const [deletingProductId, setDeletingProductId] = useState<number | null>(null); // Tracks which product ID is currently being deleted (for loading state)

    // --- Constants ---
    // Product categories for dropdowns
    const PRODUCT_CATEGORIES = [
        'Home & Living', 'Jewellery & Accessories', 'Clothing', 'Bags & Purses', 'Art',
        'Crafts & Collectibles', 'Beauty & Wellness', 'Kids & Baby', 'Pet Goods',
        'Stationery & Paper Goods', 'Food & Beverage', 'Other'
    ];

    // --- Utility & Fetching Functions ---

    /**
     * Gets the Auth0 access token silently, storing it in session storage.
     * Redirects to login if token acquisition fails and not already on callback.
     */
    const getToken = useCallback(async (): Promise<string | null> => {
      try {
          const token = await getAccessTokenSilently();
          sessionStorage.setItem('access_token', token); // Store token for subsequent requests
          return token;
      } catch (e) {
          console.error("Error getting access token silently:", e);
          // Avoid redirect loop if Auth0 callback parameters are present
          if (!window.location.search.includes('code=') && !window.location.search.includes('state=')) {
              loginWithRedirect({ appState: { returnTo: window.location.pathname } }); // Redirect to login
          }
          return null; // Return null if token couldn't be obtained
      }
    }, [getAccessTokenSilently, loginWithRedirect]); // Dependencies for useCallback

    /**
     * Uploads an image file to the backend /upload/image endpoint.
     * @param file The image File object.
     * @param token The Auth0 access token.
     * @returns A promise resolving to the uploaded image URL.
     * @throws If the upload fails or the response doesn't contain a URL.
     */
    const uploadImageToBackend = async (file: File, token: string): Promise<string> => {
        const imgFormData = new FormData(); // Use FormData for file uploads
        imgFormData.append('file', file); // 'file' should match the key expected by backend (@UploadedFile('file'))

        const res = await fetch(`${baseUrl}/upload/image`, { // Target the image upload endpoint
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`, // Authentication header
                // 'Content-Type' is automatically set by the browser for FormData
            },
            body: imgFormData,
        });

        if (!res.ok) {
            // Try to parse error message from backend response
            const errorData = await res.json().catch(() => ({ message: 'Failed to parse upload error response' }));
            throw new Error(`Image upload failed: ${errorData.message || res.statusText}`);
        }

        const data = await res.json(); // Parse successful response
        if (!data.url) {
            // Ensure the expected URL property is present
            throw new Error(`Image upload succeeded but response missing URL.`);
        }
        console.log("Image uploaded successfully, URL:", data.url);
        return data.url; // Return the URL of the uploaded image
    };

    /**
     * Fetches the user's store data (including products) from the backend.
     * Handles authentication and potential 404 (store not found).
     * @param currentToken Optional token to use; otherwise, gets from session or Auth0.
     */
    const fetchStoreData = useCallback(async (currentToken?: string) => {
        console.log("Attempting to fetch store data...");
        setLoading(true); // Set loading state
        setError(null); // Clear previous general errors
        setActionError(null); // Clear previous action errors

        // Get token if not provided
        const token = currentToken || sessionStorage.getItem('access_token') || await getToken();
        if (!token) {
            // If no token can be obtained, set error and stop
            setError("Authentication required to view your store.");
            setLoading(false);
            setCheckingAuth(false); // Ensure auth check completes
            return;
        }

        try {
            const response = await fetch(`${baseUrl}/stores/my-store`, { // Target the endpoint for the user's own store
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                // Handle specific 404 error (store not created yet)
                if (response.status === 404) {
                    console.log("Store not found (404). User may need to create one.");
                    // Redirect to create store page or show appropriate message
                    window.location.href = '/create-store'; // Example redirect
                    // Alternatively: setError("You haven't created a store yet."); setStore(null);
                    return; // Stop further processing
                }
                // Handle other errors
                const errorData = await response.json().catch(() => ({ message: `Server error: ${response.statusText}` }));
                throw new Error(errorData.message || `Failed to fetch store data (${response.status})`);
            }

            // Parse the store data from the successful response
            const storeData: Store = await response.json();
            // Ensure the products array exists, even if empty
            if (storeData && !storeData.products) {
                storeData.products = [];
            }
            console.log("Fetched Store Data:", storeData);
            setStore(storeData); // Update state with fetched data

        } catch (err: any) {
            console.error('Error fetching store data:', err);
            setError(err.message || 'Failed to load store data.'); // Set general error message
            setStore(null); // Clear potentially stale store data on error
        } finally {
            setLoading(false); // Clear loading state
            setCheckingAuth(false); // Mark auth check as complete
        }
    }, [baseUrl, getToken]); // Dependencies for useCallback

    // --- Effect for Initial Authentication Check and Data Load ---
    useEffect(() => {
      /**
       * Checks Auth0 authentication status and fetches store data accordingly.
       * Handles redirects for login if necessary.
       */
      const checkAuthAndLoad = async () => {
          console.log("Running auth check and load effect...");
          setCheckingAuth(true); // Start auth check
          const sessionToken = sessionStorage.getItem('access_token'); // Check for existing token in session

          if (isAuthenticated) { // If Auth0 hook indicates user is authenticated
              console.log("Auth0 authenticated. Getting token and fetching data...");
              const currentToken = sessionToken || await getToken(); // Use session token or fetch a new one
              if (currentToken) {
                  await fetchStoreData(currentToken); // Fetch data if token is available
              } else {
                  // Should be rare if isAuthenticated is true, but handle defensively
                  console.error("Authenticated according to Auth0, but failed to get token.");
                  setError("Authentication issue: Could not retrieve access token.");
                  setCheckingAuth(false); // Stop loading indicators
                  setLoading(false);
              }
          } else if (!sessionToken) { // If not authenticated by Auth0 AND no token in session
              console.log("Not authenticated and no session token. Redirecting to login...");
              // Redirect to login, avoiding loops if already on callback URL
               if (!window.location.search.includes('code=') && !window.location.search.includes('state=')) {
                   loginWithRedirect({ appState: { returnTo: window.location.pathname } });
               } else {
                   // On callback path but not authenticated? Show processing message.
                   console.log("On Auth0 callback path but not authenticated state.");
                   setError("Processing login callback...");
                   setCheckingAuth(false); // Stop loading indicators
                   setLoading(false);
               }
          } else if (sessionToken) { // Has session token, but Auth0 state might be stale (e.g., expired)
              // Attempt to fetch data using the session token.
              // If the token is invalid, fetchStoreData -> getToken might trigger login redirect.
              console.log("Auth0 not authenticated, but session token exists. Attempting fetch...");
              await fetchStoreData(sessionToken);
          } else {
              // Fallback case - should not normally be reached
              console.log("Auth check fell through to fallback case.");
              setError("Could not determine authentication status.");
              setCheckingAuth(false); // Stop loading indicators
              setLoading(false);
          }
      };
      checkAuthAndLoad();
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, loginWithRedirect, getToken]); // Rerun effect if auth state changes


    // --- CRUD Handlers ---

    // --- Add Product ---

    /** Handles changes in the text/number/select inputs for the "Add New Product" form */
    const handleNewProductChange = (field: keyof Omit<NewProductFields, 'imageFile' | 'imagePreviewUrl'>, value: string | number) => {
        setNewProduct(prev => ({ ...prev, [field]: value }));
    };

    /** Handles the file input change for the "Add New Product" form */
    const handleNewProductImageChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null; // Get the selected file
        setNewProduct(prev => ({ ...prev, imageFile: file })); // Store the file object

        // Generate and store a preview URL if a file is selected
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setNewProduct(prev => ({ ...prev, imagePreviewUrl: reader.result as string }));
            };
            reader.readAsDataURL(file); // Read file as Data URL for preview
        } else {
            // Clear preview if no file is selected
            setNewProduct(prev => ({ ...prev, imagePreviewUrl: null }));
        }
    };

    /** Handles the submission of the "Add New Product" form */
    const handleAddProduct = async () => {
        if (!store) return; // Should not happen if component rendered correctly
        setActionError(null); // Clear previous action errors
        setIsAddingProductLoading(true); // Set loading state for add button

        // --- Validation ---
        if (!newProduct.name || !newProduct.description || !newProduct.price || newProduct.price <= 0 || !newProduct.category || !newProduct.imageFile) {
            setActionError('All fields (Name, Description, Price > 0, Category) and an image are required.');
            setIsAddingProductLoading(false);
            return;
        }

        // --- Authentication ---
        const token = sessionStorage.getItem('access_token') || await getToken();
        if (!token) {
            setActionError("Authentication required to add product.");
            setIsAddingProductLoading(false);
            return;
        }

        try {
            // --- Image Upload ---
            console.log("Uploading new product image...");
            const imageUrl = await uploadImageToBackend(newProduct.imageFile, token);
            console.log("New product image uploaded, URL:", imageUrl);

            // --- Prepare Payload ---
            // Ensure payload matches the backend DTO structure (AddProductDto)
            const productDataToSend: AddProductPayload = {
                name: newProduct.name,
                description: newProduct.description,
                price: newProduct.price,
                category: newProduct.category,
                imageUrl: imageUrl, // Use the URL returned from the upload
                storeName: store.storeName, // Include store name if backend needs it
            };

            console.log("Sending Add Product Payload:", JSON.stringify(productDataToSend));

            // --- API Call ---
            const response = await fetch(`${baseUrl}/stores/products`, { // POST to the products endpoint
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json' // Set content type for JSON payload
                },
                body: JSON.stringify(productDataToSend), // Send the prepared data
            });

            if (!response.ok) {
                // Handle API errors
                const errorData = await response.json().catch(() => ({ message: `Server error: ${response.statusText}` }));
                throw new Error(errorData.message || `Failed to add product (${response.status})`);
            }

            // --- Success ---
            console.log("Product added successfully.");
            setIsAddingProductFormVisible(false); // Hide the form
            setNewProduct(initialNewProductState); // Reset form fields
            if (addFileInputRef.current) addFileInputRef.current.value = ""; // Clear the file input visually
            await fetchStoreData(token); // Refresh the store data to show the new product

        } catch (err: any) {
            console.error("Add product error:", err);
            setActionError(`Add product failed: ${err.message || 'Unknown error'}`); // Show error message
        } finally {
            setIsAddingProductLoading(false); // Clear loading state
        }
    };

    // --- Edit Product ---

    /** Opens the edit modal and populates it with the selected product's data */
    const openEditModal = (product: Product) => {
        console.log("Opening edit modal for product:", product.prodId);
        setEditingProduct(product); // Store the product being edited
        // Pre-fill form data from the product object
        setEditFormData({
            name: product.name,
            description: product.description,
            price: product.price,
            category: product.category
        });
        setEditProductImage(null); // Reset any previously selected new image file
        setEditProductPreview(product.imageUrl || ''); // Set initial preview to the product's current image URL
        setIsEditModalOpen(true); // Show the modal
        setActionError(null); // Clear any previous action errors
    };

    /** Closes the edit modal and resets related state */
    const closeEditModal = () => {
        setIsEditModalOpen(false);
        setEditingProduct(null);
        setEditFormData({});
        setEditProductImage(null);
        setEditProductPreview('');
        setActionError(null); // Clear errors specific to the modal
        setIsSavingEdit(false); // Reset saving state
    };

    /** Handles changes in the text/number/select inputs for the "Edit Product" modal */
    const handleEditFormChange = (field: keyof EditableProductFields, value: string | number) => {
        setEditFormData(prev => ({ ...prev, [field]: value }));
    };

    /** Handles the file input change for the "Edit Product" modal */
    const handleEditImageChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        setEditProductImage(file); // Store the *newly selected* file (or null if cleared)

        // Update preview based on selection
        if (file) {
            // Show preview of the *new* file
            const reader = new FileReader();
            reader.onloadend = () => setEditProductPreview(reader.result as string);
            reader.readAsDataURL(file);
        } else {
            // If file input is cleared, revert preview to the *original* product image
            setEditProductPreview(editingProduct?.imageUrl || '');
        }
    };

    /** Handles the submission of the "Edit Product" modal form */
    const handleUpdateProduct = async () => {
        if (!editingProduct) return; // Should not happen if modal is open correctly
        setActionError(null); // Clear previous modal errors
        setIsSavingEdit(true); // Set loading state for save button

        // --- Authentication ---
        const token = sessionStorage.getItem('access_token') || await getToken();
        if (!token) {
            setActionError("Authentication required to update product.");
            setIsSavingEdit(false);
            return;
        }

        // --- Validation ---
        // Basic validation for required fields during edit
        if (!editFormData.name || !editFormData.description || !editFormData.price || editFormData.price <= 0 || !editFormData.category) {
            setActionError('All fields (Name, Description, Price > 0, Category) are required during edit.');
            setIsSavingEdit(false);
            return;
        }

        try {
            let imageUrlToSave = editingProduct.imageUrl; // Start with the existing image URL

            // --- Image Upload (if new image selected) ---
            if (editProductImage) { // Check if a new file was actually selected
                console.log("New image selected for update. Uploading...");
                imageUrlToSave = await uploadImageToBackend(editProductImage, token); // Upload the new image
                console.log("New image uploaded, URL:", imageUrlToSave);
                // Optional: Implement backend logic to delete the OLD image (editingProduct.imageUrl) if desired
            } else {
                 console.log("No new image selected, keeping existing URL:", imageUrlToSave);
            }

            // --- Prepare Payload ---
            // Initial payload with all potentially changed fields
            const updatePayload: UpdateProductPayload = {
                name: editFormData.name,
                description: editFormData.description,
                price: editFormData.price,
                category: editFormData.category,
                // Use the potentially updated image URL. Send undefined if it becomes null/empty.
                imageUrl: imageUrlToSave ?? undefined
            };

            // --- Create Cleaned Payload (Send Only Changed Fields - Good Practice for PATCH) ---
             const cleanedPayload: UpdateProductPayload = {};
             let hasChanges = false; // Flag to track if any field actually changed

             // Compare each field in the form data/new image URL with the original product data
             if (updatePayload.name !== editingProduct.name) { cleanedPayload.name = updatePayload.name; hasChanges = true; }
             if (updatePayload.description !== editingProduct.description) { cleanedPayload.description = updatePayload.description; hasChanges = true; }
             if (updatePayload.price !== editingProduct.price) { cleanedPayload.price = updatePayload.price; hasChanges = true; }
             if (updatePayload.category !== editingProduct.category) { cleanedPayload.category = updatePayload.category; hasChanges = true; }
             if (updatePayload.imageUrl !== editingProduct.imageUrl) { cleanedPayload.imageUrl = updatePayload.imageUrl; hasChanges = true; }

             // If no changes were detected, close the modal and inform the user (optional)
             if (!hasChanges) {
                 console.log("No changes detected in edit form.");
                 closeEditModal(); // Close modal as nothing needs saving
                 // Optionally set a temporary success/info message
                 // setActionError("No changes were made.");
                 // setTimeout(() => setActionError(null), 3000);
                 setIsSavingEdit(false); // Ensure loading state is reset
                 return; // Stop execution
             }

             console.log("Sending Update Payload (changed fields only):", JSON.stringify(cleanedPayload));

            // --- API Call ---
            const response = await fetch(`${baseUrl}/stores/products/${editingProduct.prodId}`, { // PATCH to specific product ID
                method: 'PATCH', // Use PATCH for partial updates
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(cleanedPayload), // Send only the properties that changed
            });

            if (!response.ok) {
                // Handle API errors
                const errorData = await response.json().catch(() => ({ message: `Server error: ${response.statusText}` }));
                throw new Error(errorData.message || `Failed to update product (${response.status})`);
            }

            // --- Success ---
            console.log("Product updated successfully.");
            closeEditModal(); // Close the modal
            await fetchStoreData(token); // Refresh store data to show updated product

        } catch (err: any) {
            console.error('Error updating product:', err);
            setActionError(`Update failed: ${err.message || 'Unknown error'}`); // Show error within the modal
            // Keep modal open when error occurs so user can see the message
        } finally {
            setIsSavingEdit(false); // Clear loading state
        }
    };


    // --- Delete Product ---

    /**
     * Initiates the delete process. Checks if it's the last product before confirming.
     * @param prodId The ID of the product to delete.
     */
    const handleDeleteClick = (prodId: number) => {
        // Clear any previous action errors first
        setActionError(null);

        // *** Check if it's the last product ***
        // Use optional chaining for safety, though `store` and `store.products` should exist if cards are rendered
        if (store?.products && store.products.length <= 1) {
            // Prevent deletion if it's the only product left
            console.warn(`Attempt blocked: Trying to delete the last product (ID: ${prodId}).`);
            setActionError("You cannot delete the last product in your store. Add another product first.");
             // Optionally clear the error after a delay
             setTimeout(() => {
                 // Only clear if this specific error is still showing
                 if (actionError === "You cannot delete the last product in your store. Add another product first.") {
                    setActionError(null);
                 }
             }, 7000); // Clear after 7 seconds
            return; // Exit the function, do not show confirmation
        }

        // If not the last product, proceed with confirmation dialog
        if (window.confirm("Are you sure you want to delete this product? This cannot be undone.")) {
            confirmDelete(prodId); // Call the function that performs the API request
        }
    };

    /**
     * Performs the actual DELETE request to the backend after confirmation.
     * @param prodId The ID of the product to delete.
     */
    const confirmDelete = async (prodId: number) => {
        // Reset error at the beginning of the actual delete attempt
        setActionError(null);
        setDeletingProductId(prodId); // Set loading state for the specific product being deleted

        // --- Authentication ---
        const token = sessionStorage.getItem('access_token') || await getToken();
        if (!token) {
             setActionError("Authentication required to delete.");
             setDeletingProductId(null); // Reset loading state
             return;
        }

        try {
            // Optional: Find product details *before* deleting if you need them (e.g., image URL for cleanup)
            // const productToDelete = store?.products.find(p => p.prodId === prodId);
            // const imageUrlToDelete = productToDelete?.imageUrl;

            console.log(`Attempting to delete product with ID: ${prodId}`); // Log the ID being targeted

            // --- API Call ---
            const response = await fetch(`${baseUrl}/stores/products/${prodId}`, { // DELETE request to specific product ID
                 method: 'DELETE',
                 headers: { 'Authorization': `Bearer ${token}` }
            });

            // Check response status (200 OK or 204 No Content are usually success for DELETE)
            if (!response.ok && response.status !== 204) {
                 // Handle API errors
                 const errorData = await response.json().catch(() => ({ message: `Server error: ${response.statusText}` }));
                 // Include product ID in error for easier debugging
                 throw new Error(`Product ID ${prodId}: ${errorData.message || `Failed to delete product (${response.status})`}`);
            }

            console.log(`Successfully deleted product ID: ${prodId} (Status: ${response.status})`);

            // Optional: If delete from DB was successful, trigger image cleanup if needed
            // if (imageUrlToDelete) {
            //     console.log("Attempting to delete image from storage:", imageUrlToDelete);
            //     // Example: await fetch(`${baseUrl}/upload/delete-image`, { method: 'POST', ... body: { url: imageUrlToDelete } });
            // }

            // --- Success ---
            await fetchStoreData(token); // Refresh the store data to remove the deleted product from the list

        } catch (err: any) {
             console.error("Delete error:", err);
             // Display the specific error message from the catch block
             setActionError(`Delete failed: ${err.message || 'Unknown error'}`);
        }
        finally {
            setDeletingProductId(null); // Ensure loading state is reset regardless of success/failure
        }
    };

    // --- Render Logic ---

    // Display loading indicator during initial auth check
    if (checkingAuth) {
        return <div className="loading-container">Checking Authentication...</div>;
    }
    // Display loading indicator while fetching store data
    if (loading) {
        return <div className="loading-container">Loading Store Data...</div>;
    }
    // Display general error message if fetching failed
    if (error) {
        return (
            <div className="store-error">
                <h2>Error Loading Store</h2>
                <p>{error}</p>
                {/* Provide a way to retry fetching */}
                <button onClick={() => fetchStoreData()}>Try Again</button>
            </div>
        );
    }
    // Handle case where store data is null after loading/auth checks (e.g., user needs to create store but wasn't redirected)
    if (!store && !checkingAuth && !loading) {
        return (
            <div className="no-store">
                <h2>Store Not Found or Access Denied</h2>
                <p>You might need to create a store first, or check your permissions.</p>
                <a href="/create-store" className="button-link">Create a Store</a>
            </div>
        );
    }
     // Fallback loading state (should ideally not be reached if logic above is sound)
    if (!store) {
        return <div className="loading-container">Initializing Store...</div>;
    }


    // --- Main Component JSX ---
    return (
        <div className="my-store-container"> {/* Main container for styling */}

            {/* Store Header */}
            <div className="store-header">
                <h1>{store.storeName}</h1> {/* Display store name */}
                {/* Button to toggle the "Add Product" form */}
                <button
                    className="add-product-button"
                    onClick={() => {
                        setIsAddingProductFormVisible(prev => !prev); // Toggle visibility
                        setActionError(null); // Clear errors when toggling
                        // Reset form state only when opening the form
                        if (!isAddingProductFormVisible) {
                            setNewProduct(initialNewProductState);
                            if (addFileInputRef.current) addFileInputRef.current.value = ""; // Clear file input
                        }
                    }}
                    disabled={isAddingProductLoading} // Disable while adding
                >
                    {isAddingProductFormVisible ? 'Cancel Add' : '+ Add Product'}
                </button>
            </div>

            {/* Area for displaying action errors (outside modal/add form) */}
            {actionError && !isEditModalOpen && !isAddingProductFormVisible && (
                <div className="error-message action-error">{actionError}</div>
            )}

            {/* Add Product Form (Conditional Rendering) */}
            {isAddingProductFormVisible && (
                <div className="add-product-form">
                    <h2>Add New Product</h2>
                    {/* Display add-specific errors within the form */}
                    {actionError && <div className="error-message action-error">{actionError}</div>}

                    {/* Form Fields */}
                    <div className="form-group">
                        <label htmlFor="add-prod-name">Name *</label>
                        <input id="add-prod-name" type="text" value={newProduct.name || ''} onChange={(e) => handleNewProductChange('name', e.target.value)} disabled={isAddingProductLoading} required />
                    </div>
                    <div className="form-group">
                        <label htmlFor="add-prod-desc">Description *</label>
                        <textarea id="add-prod-desc" value={newProduct.description || ''} onChange={(e) => handleNewProductChange('description', e.target.value)} disabled={isAddingProductLoading} required />
                    </div>
                    {/* Row for Price and Category */}
                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="add-prod-price">Price (R) *</label>
                            <input id="add-prod-price" type="number" step="0.01" min="0.01" value={newProduct.price || ''} onChange={(e) => handleNewProductChange('price', parseFloat(e.target.value) || 0)} disabled={isAddingProductLoading} required />
                        </div>
                        <div className="form-group">
                            <label htmlFor="add-prod-cat">Category *</label>
                            <select id="add-prod-cat" value={newProduct.category || ''} onChange={(e) => handleNewProductChange('category', e.target.value)} disabled={isAddingProductLoading} required>
                                <option value="">Select Category</option>
                                {PRODUCT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    </div>
                    {/* Image Input & Preview */}
                    <div className="form-group">
                        <label htmlFor="new-product-image">Image *</label>
                        <input id="new-product-image" type="file" ref={addFileInputRef} onChange={handleNewProductImageChange} accept="image/*" required disabled={isAddingProductLoading} />
                        {/* Show preview if available */}
                        {newProduct.imagePreviewUrl && (
                            <div className="image-preview add-preview">
                                <img src={newProduct.imagePreviewUrl} alt="New product preview" />
                            </div>
                        )}
                    </div>

                    {/* Form Actions (Add/Cancel Buttons) */}
                    <div className="form-actions">
                        <button type="button" className="cancel-button" onClick={() => setIsAddingProductFormVisible(false)} disabled={isAddingProductLoading}>Cancel</button>
                        <button type="button" className="submit-button" onClick={handleAddProduct} disabled={isAddingProductLoading}>
                            {isAddingProductLoading ? 'Adding...' : 'Add Product'}
                        </button>
                    </div>
                </div>
            )}

            {/* Product List Section */}
            <div className="products-section">
                <h2>Your Products</h2>
                {(store.products && store.products.length > 0) ? (
                    // Display grid if products exist
                    <div className="products-grid">
                        {store.products.map((product) => (
                            // --- Product Card ---
                            <div key={product.prodId} className="product-card"> {/* Use prodId for key */}
                                {/* Product Image */}
                                <div className="product-image">
                                    {product.imageUrl ? (
                                        <img
                                            src={product.imageUrl}
                                            alt={product.name}
                                            // Basic fallback if image fails to load
                                            onError={(e) => {
                                                e.currentTarget.style.display = 'none'; // Hide broken image icon
                                                const placeholder = e.currentTarget.nextElementSibling as HTMLElement; // Find placeholder div
                                                if (placeholder) placeholder.style.display = 'flex'; // Show placeholder
                                            }}
                                        />
                                    ) : null}
                                    {/* Placeholder shown if imageUrl is null/empty OR if image onError triggers */}
                                    <div className="product-image-placeholder" style={{ display: product.imageUrl ? 'none' : 'flex' }}>
                                        <span>No Image</span>
                                    </div>
                                </div>
                                {/* Product Details */}
                                <div className="product-details">
                                    <h3>{product.name}</h3>
                                    <p className="product-price">R{product.price.toFixed(2)}</p> {/* Format price */}
                                    <p className="product-category">{product.category}</p>
                                    <p className="product-description">{product.description}</p>
                                    {/* Action Buttons for Edit/Delete */}
                                    <div className="product-actions">
                                        <button
                                            className="edit-button"
                                            onClick={() => openEditModal(product)}
                                            // Disable edit if any delete or save is in progress
                                            disabled={deletingProductId !== null || isSavingEdit}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            className="delete-button"
                                            // Call the modified handler which checks for last product
                                            onClick={() => handleDeleteClick(product.prodId)}
                                            // Disable if this specific product is being deleted OR if an edit is being saved
                                            disabled={deletingProductId === product.prodId || isSavingEdit}
                                        >
                                            {/* Show loading state specific to this button */}
                                            {deletingProductId === product.prodId ? 'Deleting...' : 'Delete'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                            // --- End Product Card ---
                        ))}
                    </div>
                ) : (
                    // Display message if no products exist
                    <div className="no-products">
                        <p>You haven't added any products to your store yet.</p>
                        {/* Show button to add first product only if the add form isn't already visible */}
                        {!isAddingProductFormVisible && (
                            <button
                                className="add-first-product"
                                onClick={() => {
                                    setIsAddingProductFormVisible(true);
                                    setNewProduct(initialNewProductState);
                                    if (addFileInputRef.current) addFileInputRef.current.value = "";
                                }}
                            >
                                Add Your First Product
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Edit Product Modal (Conditional Rendering) */}
            {isEditModalOpen && editingProduct && (
                // Modal backdrop for background dimming/click outside (optional)
                <div className="modal-backdrop">
                    {/* Actual modal content */}
                    <div className="modal-content">
                        <h2>Edit: {editingProduct.name}</h2> {/* Show product name being edited */}
                        {/* Display edit-specific errors within the modal */}
                        {actionError && <div className="error-message modal-error">{actionError}</div>}

                        {/* Edit Form Fields */}
                        <div className="form-group">
                            <label htmlFor="edit-prod-name">Name *</label>
                            <input id="edit-prod-name" type="text" value={editFormData.name || ''} onChange={(e) => handleEditFormChange('name', e.target.value)} disabled={isSavingEdit} required />
                        </div>
                        <div className="form-group">
                            <label htmlFor="edit-prod-desc">Description *</label>
                            <textarea id="edit-prod-desc" value={editFormData.description || ''} onChange={(e) => handleEditFormChange('description', e.target.value)} disabled={isSavingEdit} required />
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="edit-prod-price">Price (R) *</label>
                                <input id="edit-prod-price" type="number" step="0.01" min="0.01" value={editFormData.price || ''} onChange={(e) => handleEditFormChange('price', parseFloat(e.target.value) || 0)} disabled={isSavingEdit} required />
                            </div>
                            <div className="form-group">
                                <label htmlFor="edit-prod-cat">Category *</label>
                                <select id="edit-prod-cat" value={editFormData.category || ''} onChange={(e) => handleEditFormChange('category', e.target.value)} disabled={isSavingEdit} required>
                                    <option value="">Select Category</option>
                                    {PRODUCT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                        </div>
                        {/* Image Edit Input & Preview */}
                        <div className="form-group">
                            <label htmlFor="edit-product-image">Replace Image (Optional)</label>
                            <input id="edit-product-image" type="file" ref={editFileInputRef} onChange={handleEditImageChange} accept="image/png, image/jpeg, image/webp, image/gif" disabled={isSavingEdit} />
                            {/* Show preview of current or newly selected image */}
                            {editProductPreview && (
                                <div className="image-preview edit-preview">
                                    <p>Current/New Image Preview:</p>
                                    <img src={editProductPreview} alt="Edit preview" />
                                </div>
                            )}
                        </div>

                        {/* Modal Action Buttons (Save/Cancel) */}
                        <div className="form-actions modal-actions">
                            <button type="button" className="cancel-button" onClick={closeEditModal} disabled={isSavingEdit}>Cancel</button>
                            <button type="button" className="submit-button" onClick={handleUpdateProduct} disabled={isSavingEdit}>
                                {isSavingEdit ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div> // End my-store-container
    );
};

export default MyStore; // Export the component
