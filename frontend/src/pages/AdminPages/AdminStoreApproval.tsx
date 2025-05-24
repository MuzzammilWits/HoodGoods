// src/pages/AdminPages/AdminStoreApproval.tsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './AdminStoreApproval.css';
import { useNavigate } from 'react-router-dom';

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

interface Store {
    storeId: string;
    userId: string;
    storeName: string;
    standardPrice: number | null;
    standardTime: string | null;
    expressPrice: number | null;
    expressTime: string | null;
    isActiveStore: boolean;
    products?: Product[]; // Assuming products might be loaded later
}

const AdminStoreApproval: React.FC = () => {
    const [stores, setStores] = useState<Store[]>([]);
    const [loading, setLoading] = useState(true);
    const [notification, setNotification] = useState<{ 
        message: string; 
        type: 'success' | 'error' | null 
    }>({ message: '', type: null });
    const navigate = useNavigate();
    const baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
    const [expandedStoreId, setExpandedStoreId] = useState<string | null>(null);

    const showNotification = (message: string, type: 'success' | 'error') => {
        setNotification({ message, type });
        setTimeout(() => setNotification({ message: '', type: null }), 3000);
    };

    useEffect(() => {
        const fetchStores = async () => {
            setLoading(true);
            try {
                const response = await axios.get<Store[]>(`${baseUrl}/stores/inactive`);
                setStores(response.data);
            } catch (err) {
                console.error("Error fetching stores:", err);
                showNotification(
                    axios.isAxiosError(err) 
                        ? err.response?.data?.message || err.message 
                        : 'Failed to load stores',
                    'error'
                );
                setStores([]);
            } finally {
                setLoading(false);
            }
        };

        fetchStores();
    }, [baseUrl]);

    const toggleStoreExpand = (storeId: string) => {
        setExpandedStoreId(expandedStoreId === storeId ? null : storeId);
        // In a full implementation, you might fetch store.products here if not already loaded
    };
    
    const handleKeyDownOnStoreHeader = (
        event: React.KeyboardEvent<HTMLElement>,
        storeId: string
      ) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          toggleStoreExpand(storeId);
        }
      };

    const handleApproveStore = async (storeId: string) => {
        try {
            await axios.patch(`${baseUrl}/stores/${storeId}/approve`);
            setStores(stores.filter(s => s.storeId !== storeId));
            showNotification('Store approved successfully!', 'success');
        } catch (error) {
            showNotification('Failed to approve store', 'error');
        }
    };

    const handleRejectStore = async (storeId: string) => {
        try {
            await axios.delete(`${baseUrl}/stores/${storeId}`);
            setStores(stores.filter(s => s.storeId !== storeId));
            showNotification('Store rejected and deleted successfully!', 'success');
        } catch (error) {
            showNotification('Failed to reject store', 'error');
        }
    };

    if (loading) {
        return (
            <section className="loading-container" aria-label="Loading stores for approval">
                <figure className="spinner" role="img" aria-label="Loading animation"></figure>
                <p>Loading stores...</p>
            </section>
        );
    }

    return (
        <main className="admin-stores-container">
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

            {stores.length === 0 ? (
                 <p className="no-stores-message">No stores are currently awaiting approval.</p>
            ) : (
                <ul className="stores-list">
                    {stores.map(store => (
                        <li className="store-card" key={store.storeId}>
                            <section 
                                className="store-header" 
                                onClick={() => toggleStoreExpand(store.storeId)}
                                onKeyDown={(e) => handleKeyDownOnStoreHeader(e, store.storeId)}
                                tabIndex={0}
                                role="button"
                                aria-expanded={expandedStoreId === store.storeId}
                                aria-controls={`products-${store.storeId}`}
                            >
                                <article className="store-info">
                                    <h2>{store.storeName}</h2>
                                    <section className="pricing-info">
                                        <section>
                                            <h4>Standard Service</h4>
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