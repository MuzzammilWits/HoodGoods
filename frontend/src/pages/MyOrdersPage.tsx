// src/pages/MyOrdersPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import axios, { AxiosError } from 'axios';
import { Link, useLocation } from 'react-router-dom';
import './MyOrdersPage.css'; // Ensure this CSS file exists and is styled

// --- Helper Types (as provided in your MyOrdersPage.tsx) ---
interface ProductSummary {
    prodId: number;
    name: string;
    imageUrl?: string;
}
interface SellerOrderItemWithProduct {
    sellerOrderItemId: number;
    productId: number;
    quantityOrdered: number;
    pricePerUnit: number;
    productNameSnapshot: string;
    product: ProductSummary;
    createdAt: string | null;
    updatedAt: string | null;
}
interface NestedSellerOrder {
    sellerOrderId: number;
    orderId: number;
    userId: string; // Seller's User ID
    deliveryMethod: string;
    deliveryPrice: number;
    deliveryTimeEstimate: string;
    itemsSubtotal: number;
    sellerTotal: number;
    status: string;
    createdAt: string | null;
    updatedAt: string | null;
    items: SellerOrderItemWithProduct[];
    storeName?: string;
}
interface BuyerOrderDetails {
    orderId: number;
    userId: string; // Buyer's User ID
    orderDate: string;
    grandTotal: number;
    pickupArea: string;
    pickupPoint: string;
    createdAt: string | null;
    updatedAt: string | null;
    sellerOrders: NestedSellerOrder[];
}
// --- End Helper Types ---

const api = axios.create({
    baseURL: import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000',
});

const statusClassMap: Record<string, string> = {
    Processing: 'status-processing',
    Packaging: 'status-packaging',
    'Ready for Pickup': 'status-ready',
    Shipped: 'status-shipped',
    Delivered: 'status-delivered',
    Cancelled: 'status-cancelled',
    Unknown: 'status-unknown',
};

const MIN_SKELETON_DISPLAY_TIME_MS = 1500; // Make skeleton visible for at least 1.5 seconds

export default function MyOrdersPage() {
    const { isAuthenticated, isLoading: isAuthLoading, getAccessTokenSilently } = useAuth0();
    const [orders, setOrders] = useState<BuyerOrderDetails[]>([]);
    const [isLoading, setIsLoading] = useState(true); // Main data loading state for orders
    const [error, setError] = useState<string | null>(null);
    const location = useLocation();

    const [isPageRefreshing, setIsPageRefreshing] = useState(() => {
        const wasNavRefreshRequested = location.state?.refresh === true;
        if (wasNavRefreshRequested) {
            window.history.replaceState({}, document.title);
            return true;
        }
        return false;
    });

    const fetchMyOrders = useCallback(async () => {
        if (!isAuthenticated) {
            setIsLoading(false);
            setOrders([]);
            return;
        }
        setIsLoading(true);
        setError(null);
        
        const startTime = Date.now(); // Record start time for minimum display

        try {
            const token = await getAccessTokenSilently();
            const response = await api.get<BuyerOrderDetails[]>('/orders/my-orders', {
                headers: { Authorization: `Bearer ${token}` },
            });
            setOrders(response.data);
        } catch (err) {
            console.error("Failed to fetch buyer orders:", err);
            const errorMsg = err instanceof AxiosError
                ? err.response?.data?.message || err.message
                : 'Could not load your orders.';
            setError(errorMsg);
            setOrders([]);
        } finally {
            const elapsedTime = Date.now() - startTime;
            const remainingTime = MIN_SKELETON_DISPLAY_TIME_MS - elapsedTime;

            if (remainingTime > 0) {
                setTimeout(() => {
                    setIsLoading(false);
                }, remainingTime);
            } else {
                setIsLoading(false);
            }
        }
    }, [getAccessTokenSilently, isAuthenticated]);

    useEffect(() => {
        // Handles navigation-triggered refresh
        if (isPageRefreshing) {
            if (!isAuthLoading && isAuthenticated) {
                fetchMyOrders().finally(() => {
                    setIsPageRefreshing(false);
                });
            } else {
                setIsPageRefreshing(false);
                if (!isAuthenticated && !isAuthLoading) { 
                    setIsLoading(false);
                    setOrders([]);
                }
            }
        }
    }, [isPageRefreshing, isAuthLoading, isAuthenticated, fetchMyOrders]);

    useEffect(() => {
        // Handles initial load based on authentication, if not already refreshing
        // and if it's the very first load (isLoading is true)
        if (!isAuthLoading && isAuthenticated && !isPageRefreshing && isLoading) {
            fetchMyOrders();
        } else if (!isAuthLoading && !isAuthenticated) {
            setIsLoading(false);
            setOrders([]);
            setError(null);
        }
    }, [isAuthenticated, isAuthLoading, fetchMyOrders, isPageRefreshing, isLoading]);

    const containerStyle: React.CSSProperties = {
        minHeight: '70vh', 
        display: 'flex',
        flexDirection: 'column',
    };

    if (isAuthLoading) {
        return (
            <main className="my-orders-container" style={containerStyle}>
                <section className="main-titles">
                    <h1>My Orders</h1>
                </section>
                <p className="auth-loading-message">Loading authentication...</p>
            </main>
        );
    }

    if (!isAuthenticated) {
        return (
            <main className="my-orders-container" style={containerStyle}>
                <section className="main-titles">
                    <h1>My Orders</h1>
                </section>
                <p className="login-prompt-message">Please log in to view your order history.</p>
            </main>
        );
    }

    const showSkeleton = isLoading || isPageRefreshing;

    if (showSkeleton) {
        return (
            <main className="my-orders-container" style={containerStyle} aria-busy="true" aria-label="Loading your orders...">
                <section className="main-titles">
                    <h1>My Orders</h1>
                </section>
                
                <ul className="order-list"> {/* Matches your ul.order-list */}
                    {Array.from({ length: 2 }).map((_, orderIndex) => ( // Show 2 skeleton order cards
                        <li key={`skeleton-order-${orderIndex}`} className="order-card-item"> {/* Matches li.order-card-item */}
                           <article className="order-card skeleton-item"> {/* Matches article.order-card and adds shimmer */}
                                <header className="order-header"> {/* Matches header.order-header */}
                                    {/* Skeleton for Order # - H2 equivalent */}
                                    <h2 className="skeleton-item" style={{ width: '150px', height: '1.4em', borderRadius: '4px', backgroundClip: 'text', color: 'transparent' }}>&nbsp;</h2>
                                    {/* Skeleton for Placed on Date - P equivalent */}
                                    <p className="skeleton-item" style={{ width: '120px', height: '0.9em', borderRadius: '4px', backgroundClip: 'text', color: 'transparent' }}>&nbsp;</p>
                                </header>
                                <section className="order-details-overall"> {/* Matches section.order-details-overall */}
                                   {/* P equivalent */}
                                   <p className="skeleton-item" style={{ width: '200px', height: '1em', marginBottom: '0.5rem', borderRadius: '4px', backgroundClip: 'text', color: 'transparent' }}>&nbsp;</p>
                                   {/* P equivalent */}
                                   <p className="skeleton-item" style={{ width: '250px', height: '1em', borderRadius: '4px', backgroundClip: 'text', color: 'transparent' }}>&nbsp;</p>
                                </section>

                                <section className="shipments-section"> {/* Matches section.shipments-section */}
                                   {/* Skeleton for "Shipments in this Order:" - H3 equivalent */}
                                   <h3 className="skeleton-item" style={{ width: '220px', height: '1.2em', marginBottom: '1rem', borderRadius: '4px', backgroundClip: 'text', color: 'transparent' }}>&nbsp;</h3>
                                   
                                   {/* Skeleton for one shipment card */}
                                   <section className="shipment-card skeleton-item" style={{padding: '1.25rem'}}> {/* Matches section.shipment-card */}
                                        <header className="shipment-header"> {/* Matches header.shipment-header */}
                                            {/* H4 equivalent */}
                                            <h4 className="skeleton-item" style={{ width: '180px', height: '1.1em', borderRadius: '4px', backgroundClip: 'text', color: 'transparent' }}>&nbsp;</h4>
                                            {/* P equivalent for status line */}
                                            <p className="skeleton-item" style={{ width: '100px', height: '1em', borderRadius: '4px', backgroundClip: 'text', color: 'transparent' }}>&nbsp;</p>
                                        </header>
                                        <section className="shipment-details"> {/* Matches section.shipment-details */}
                                            {/* P equivalent */}
                                            <p className="skeleton-item" style={{ width: '220px', height: '0.9em', marginBottom: '0.3rem', borderRadius: '4px', backgroundClip: 'text', color: 'transparent' }}>&nbsp;</p>
                                            {/* P equivalent */}
                                            <p className="skeleton-item" style={{ width: '180px', height: '0.9em', marginBottom: '0.3rem', borderRadius: '4px', backgroundClip: 'text', color: 'transparent' }}>&nbsp;</p>
                                            {/* P equivalent */}
                                            <p className="skeleton-item" style={{ width: '200px', height: '0.9em', borderRadius: '4px', backgroundClip: 'text', color: 'transparent' }}>&nbsp;</p>
                                        </section>
                                        <ul className="item-list" style={{marginTop: '1rem'}}> {/* Matches ul.item-list */}
                                            {/* Skeleton for one item in shipment */}
                                            <li className="item" style={{display: 'flex', alignItems: 'center', gap: '1rem', paddingBottom: '0.75rem'}}>
                                                {/* Figure equivalent for image */}
                                                <figure className="item-image-figure skeleton-item" style={{width: '50px', height: '50px', borderRadius: '4px', flexShrink: 0}}></figure>
                                                {/* Article equivalent for item details info */}
                                                <article style={{flexGrow: 1}}>
                                                    {/* P equivalent */}
                                                    <p className="skeleton-item" style={{ width: '80%', height: '0.9em', marginBottom: '0.2rem', borderRadius: '4px', backgroundClip: 'text', color: 'transparent' }}>&nbsp;</p>
                                                    {/* P equivalent */}
                                                    <p className="skeleton-item" style={{ width: '60%', height: '0.85em', borderRadius: '4px', backgroundClip: 'text', color: 'transparent' }}>&nbsp;</p>
                                                </article>
                                            </li>
                                        </ul>
                                   </section>
                                </section>
                           </article>
                        </li>
                    ))}
                </ul>
            </main>
        );
    }

    if (error) {
        return (
            <main className="my-orders-container" style={containerStyle}>
                <section className="main-titles">
                    <h1>My Orders</h1>
                </section>
                <p className="error-message">{error}</p>
                <button onClick={fetchMyOrders} className="retry-button">Try Again</button>
            </main>
        );
    }
    
    return (
        <main className="my-orders-container" style={containerStyle}>
            <section className="main-titles">
                <h1>My Orders</h1>
            </section>

            {orders.length === 0 ? (
                <section className="empty-orders" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                    <p className="no-orders-message">You haven't placed any orders yet.</p>
                    <Link to="/products" className="continue-shopping-btn">
                        Start Shopping
                    </Link>
                </section>
            ) : (
                <ul className="order-list">
                    {orders.map((order) => (
                        <li key={order.orderId} className="order-card-item">
                            <article className="order-card">
                                <header className="order-header">
                                    <h2>Order #{order.orderId}</h2>
                                    <p className="order-placed-date">Placed on: {new Date(order.orderDate).toLocaleDateString()}</p>
                                </header>
                                <section className="order-details-overall">
                                    <p><strong>Grand Total:</strong> R{order.grandTotal.toFixed(2)}</p>
                                    <p><strong>Pickup Location:</strong> {order.pickupPoint} ({order.pickupArea})</p>
                                </section>

                                <section className="shipments-section">
                                    <h3>Shipments in this Order:</h3>
                                    {order.sellerOrders.map((sellerOrder) => (
                                        <section key={sellerOrder.sellerOrderId} className="shipment-card">
                                            <header className="shipment-header">
                                                <h4>Shipment # {sellerOrder.sellerOrderId}</h4> 
                                                <p className="status-line">Status: <strong className={`status-badge ${statusClassMap[sellerOrder.status] || 'status-unknown'}`}>{sellerOrder.status}</strong></p>
                                            </header>
                                            <section className="shipment-details">
                                                <p><strong>Delivery Method:</strong> {sellerOrder.deliveryMethod} (R{sellerOrder.deliveryPrice.toFixed(2)})</p>
                                                <p><strong>ETA:</strong> {sellerOrder.deliveryTimeEstimate} days</p>
                                                <p><strong>Shipment Total:</strong> R{sellerOrder.sellerTotal.toFixed(2)}</p>
                                            </section>
                                            <ul className="item-list">
                                                {sellerOrder.items.map((item) => (
                                                    <li key={item.sellerOrderItemId} className="item">
                                                        <figure className="item-image-figure">
                                                            <img
                                                                src={item.product.imageUrl || 'https://placehold.co/50x50/eee/ccc?text=N/A'}
                                                                alt={item.product.name}
                                                                className="item-image"
                                                                onError={(e) => (e.currentTarget.src = 'https://placehold.co/50x50/eee/ccc?text=Err')}
                                                            />
                                                        </figure>
                                                        <article className="item-details-info">
                                                            <p className="item-name-snapshot">{item.productNameSnapshot}</p>
                                                            <p className="item-qty-price">Qty: {item.quantityOrdered} @ R{item.pricePerUnit.toFixed(2)}</p>
                                                            <p className="item-line-total">Item Total: R{(item.pricePerUnit * item.quantityOrdered).toFixed(2)}</p>
                                                        </article>
                                                    </li>
                                                ))}
                                            </ul>
                                        </section>
                                    ))}
                                </section>
                            </article>
                        </li>
                    ))}
                </ul>
            )}
        </main>
    );
}
