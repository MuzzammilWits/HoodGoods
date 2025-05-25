import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './AdminStoreApproval.css';
import { useNavigate } from 'react-router-dom';

// --- Type Definitions ---
// Defines the structure for a single product associated with a store.
interface Product {
    prodId: number;
    name: string;
    description: string;
    category: string;
    price: number;
    productquantity: number;
    userId: string;
    imageUrl: string;
    storeId: string;
    storeName: string;
    isActive: boolean;
}

// Defines the structure for a store awaiting approval.
interface Store {
    storeId: string;
    userId: string;
    storeName: string;
    standardPrice: number | null;
    standardTime: string | null;
    expressPrice: number | null;
    expressTime: string | null;
    isActiveStore: boolean;
    products?: Product[]; // Products are optional as they might be loaded on-demand.
}


const AdminStoreApproval: React.FC = () => {
    // --- State Management ---
    // Holds the list of stores fetched from the backend that are awaiting approval
    const [stores, setStores] = useState<Store[]>([]);
    // Manages the loading state to show a skeleton UI while fetching data
    const [loading, setLoading] = useState(true);
    // State for displaying success or error messages to the admin
    const [notification, setNotification] = useState<{ 
        message: string; 
        type: 'success' | 'error' | null 
    }>({ message: '', type: null });
    // Tracks which store is currently expanded to show its products
    const [expandedStoreId, setExpandedStoreId] = useState<string | null>(null);

    // --- Hooks and Constants ---
    const navigate = useNavigate();
    // Retrieves the backend URL from environment variables, with a fallback for local development
    const baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

    /**
     * Displays a notification message for a short duration
     * @param message - The message to display
     * @param type - The type of notification ('success' or 'error'), which styles the message
     */
    const showNotification = (message: string, type: 'success' | 'error') => {
        setNotification({ message, type });
        // The notification will automatically disappear after 3 seconds.
        setTimeout(() => setNotification({ message: '', type: null }), 3000);
    };

    // Fetches the list of inactive stores when the component mounts
    useEffect(() => {
        const fetchStores = async () => {
            setLoading(true);
            try {
                // Makes a GET request to the endpoint that returns stores pending approval
                const response = await axios.get<Store[]>(`${baseUrl}/stores/inactive`);
                setStores(response.data);
            } catch (err) {
                console.error("Error fetching stores:", err);
                // Displays a user-friendly error message if the API call fails
                showNotification(
                    axios.isAxiosError(err) 
                        ? err.response?.data?.message || err.message 
                        : 'Failed to load stores',
                    'error'
                );
                setStores([]); // Ensure stores list is empty on error
            } finally {
                setLoading(false); // Stop the loading state whether the fetch succeeded or failed
            }
        };

        fetchStores();
    }, [baseUrl]); // Dependency array ensures this effect runs only when the component mounts

    /**
     * Toggles the expanded view of a store to show or hide its products.
     * @param storeId - The ID of the store to expand/collapse.
     */
    const toggleStoreExpand = (storeId: string) => {
        setExpandedStoreId(prevId => (prevId === storeId ? null : storeId));
        // In a more complex app, you might fetch the store's products here.
    };
    
    /**
     * Handles keyboard events for accessibility, allowing users to expand/collapse
     * @param event
     * @param storeId 
     */
    const handleKeyDownOnStoreHeader = (
        event: React.KeyboardEvent<HTMLElement>,
        storeId: string
      ) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault(); // Prevent default browser action (e.g., scrolling).
          toggleStoreExpand(storeId);
        }
      };

    /**
     * Handles the approval of a store.
     * @param storeId - The ID of the store to approve.
     */
    const handleApproveStore = async (storeId: string) => {
        try {
            await axios.patch(`${baseUrl}/stores/${storeId}/approve`);
            // Optimistically remove the store from the UI list for immediate feedback.
            setStores(stores.filter(s => s.storeId !== storeId));
            showNotification('Store approved successfully!', 'success');
        } catch (error) {
            console.error("Approval Error:", error);
            showNotification('Failed to approve store', 'error');
        }
    };

    /**
     * Handles the rejection and deletion of a store.
     * Sends a DELETE request to the backend.
     * @param storeId - The ID of the store to reject.
     */
    const handleRejectStore = async (storeId: string) => {
        try {
            await axios.delete(`${baseUrl}/stores/${storeId}`);
            // Optimistically remove the store from the list.
            setStores(stores.filter(s => s.storeId !== storeId));
            showNotification('Store rejected and deleted successfully!', 'success');
        } catch (error) {
            console.error("Rejection Error:", error);
            showNotification('Failed to reject store', 'error');
        }
    };

    // --- Render Logic ---
    // Displays a skeleton loading screen while data is being fetched.
    // This improves user experience by providing visual feedback that content is on its way.
    if (loading) {
        return (
            <main className="admin-stores-container" aria-busy="true">
                <header className="admin-header">
                    <h1>Store Management</h1>
                    <button onClick={() => navigate('/admin-dashboard')} className="back-button">
                        Back to Dashboard
                    </button>
                </header>
                <ul className="stores-list">
                    {/* Render 5 skeleton loaders as placeholders */}
                    {Array.from({ length: 5 }).map((_, i) => (
                        <li className="store-card" key={i}>
                            <section className="store-header" aria-hidden="true">
                                <article className="store-info">
                                    <section className="skeleton-item skeleton-store-name" style={{width: '40%', height: '1.5rem', marginBottom: '1rem'}}></section>
                                    <section className="pricing-info" style={{display: 'flex', gap: '2rem'}}>
                                        <section>
                                            <section className="skeleton-item skeleton-pricing-title" style={{width: '80px', height: '1rem', marginBottom: '0.5rem'}}></section>
                                            <section className="skeleton-item skeleton-pricing-value" style={{width: '60px', height: '1rem', marginBottom: '0.3rem'}}></section>
                                            <section className="skeleton-item skeleton-pricing-value" style={{width: '90px', height: '1rem'}}></section>
                                        </section>
                                        <section>
                                            <section className="skeleton-item skeleton-pricing-title" style={{width: '80px', height: '1rem', marginBottom: '0.5rem'}}></section>
                                            <section className="skeleton-item skeleton-pricing-value" style={{width: '60px', height: '1rem', marginBottom: '0.3rem'}}></section>
                                            <section className="skeleton-item skeleton-pricing-value" style={{width: '90px', height: '1rem'}}></section>
                                        </section>
                                    </section>
                                </article>
                                <section className="store-actions" style={{display: 'flex', gap: '1.2rem', alignItems: 'flex-end'}}>
                                    <button className="skeleton-item skeleton-button" disabled aria-hidden="true" style={{minWidth: '120px', height: '38px', borderRadius: '4px'}}></button>
                                    <button className="skeleton-item skeleton-button" disabled aria-hidden="true" style={{minWidth: '120px', height: '38px', borderRadius: '4px'}}></button>
                                </section>
                            </section>
                        </li>
                    ))}
                </ul>
            </main>
        );
    }

    // Main component render after data is loaded.
    return (
        <main className="admin-stores-container">
            {/* Conditionally render the notification modal when there's a message */}
            {notification.type && (
                <aside className={`notification-modal ${notification.type}`} role={notification.type === 'error' ? 'alert' : 'status'}>
                    {notification.message}
                </aside>
            )}

            <header className="admin-header">
                <h1>Store Management</h1>
                <button onClick={() => navigate('/admin-dashboard')} className="back-button">
                    Back to Dashboard
                </button>
            </header>

            {/* Display a message if there are no stores to approve, otherwise, render the list. */}
            {stores.length === 0 ? (
                 <p className="no-stores-message">No stores are currently awaiting approval.</p>
            ) : (
                <ul className="stores-list">
                    {stores.map(store => (
                        <li className="store-card" key={store.storeId}>
                            {/* The main header for each store card, clickable to expand */}
                            <section 
                                className="store-header" 
                                onClick={() => toggleStoreExpand(store.storeId)}
                                onKeyDown={(e) => handleKeyDownOnStoreHeader(e, store.storeId)}
                                tabIndex={0} // Makes the element focusable
                                role="button"
                                aria-expanded={expandedStoreId === store.storeId}
                                aria-controls={`products-${store.storeId}`}
                            >
                                <article className="store-info">
                                    <h2>{store.storeName}</h2>
                                    <section className="pricing-info">
                                        <section>
                                            <h4>Standard Service</h4>
                                            {/* Display N/A gracefully if values are null */}
                                            <p>Price: R {store.standardPrice !== null ? store.standardPrice.toFixed(2) : 'N/A'}</p>
                                            <p>Time: {store.standardTime || 'Not specified'}</p>
                                        </section>
                                        <section>
                                            <h4>Express Service</h4>
                                            <p>Price: R {store.expressPrice !== null ? store.expressPrice.toFixed(2) : 'N/A'}</p>
                                            <p>Time: {store.expressTime || 'Not specified'}</p>
                                        </section>
                                    </section>
                                </article>
                                <section className="store-actions">
                                    {/* Stop propagation to prevent the card from expanding when a button is clicked */}
                                    <button
                                        className="approve-button"
                                        onClick={e => {
                                            e.stopPropagation();
                                            handleApproveStore(store.storeId);
                                        }}
                                        aria-label={`Approve store ${store.storeName}`}
                                    >
                                        Approve Store
                                    </button>
                                    <button
                                        className="reject-button"
                                        onClick={e => {
                                            e.stopPropagation();
                                            handleRejectStore(store.storeId);
                                        }}
                                        aria-label={`Reject store ${store.storeName}`}
                                    >
                                        Reject Store
                                    </button>
                                </section>
                            </section>
                            
                            {/* Conditionally render the products section when the store is expanded */}
                            {expandedStoreId === store.storeId && store.products && store.products.length > 0 && (
                                <section className="store-products" id={`products-${store.storeId}`}>
                                    <h3>Products in this Store</h3>
                                    <ul className="products-grid">
                                        {store.products.map(product => (
                                            <li key={product.prodId} className="product-card-item">
                                                <figure className="product-image">
                                                    <img src={product.imageUrl || '/placeholder-product.jpg'} alt={product.name} />
                                                </figure>
                                                <article className="product-details-item">
                                                    <h4>{product.name}</h4>
                                                    <p>Price: R {product.price.toFixed(2)}</p>
                                                    <p>Quantity: {product.productquantity}</p>
                                                    <p>Category: {product.category}</p>
                                                </article>
                                            </li>
                                        ))}
                                    </ul>
                                </section>
                            )}
                            {/* Show a message if the store is expanded but has no products */}
                             {expandedStoreId === store.storeId && (!store.products || store.products.length === 0) && (
                                <section className="store-products" id={`products-${store.storeId}`}>
                                    <p className="no-products">No products found for this store or products are active.</p>
                                </section>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </main>
    );
};

export default AdminStoreApproval;