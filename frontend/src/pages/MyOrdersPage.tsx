// src/pages/MyOrdersPage.tsx
import  { useState, useEffect, useCallback } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import axios, { AxiosError } from 'axios';
import './MyOrdersPage.css';

// --- Helper Types ---
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
    // Added for displaying store name easily in the shipment card
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
};

export default function MyOrdersPage() {
    const { isAuthenticated, isLoading: isAuthLoading, getAccessTokenSilently } = useAuth0();
    const [orders, setOrders] = useState<BuyerOrderDetails[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchMyOrders = useCallback(async () => {
        setIsLoading(true);
        setError(null);
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
            setIsLoading(false);
        }
    }, [getAccessTokenSilently]);

    useEffect(() => {
        if (!isAuthLoading && isAuthenticated) {
            fetchMyOrders();
        } else if (!isAuthLoading && !isAuthenticated) {
            setIsLoading(false);
            setOrders([]);
            setError(null);
        }
    }, [isAuthenticated, isAuthLoading, fetchMyOrders]);

    if (isAuthLoading) {
        return (
            <main className="my-orders-container">
                <p className="auth-loading-message">Loading authentication...</p>
            </main>
        );
    }

    if (!isAuthenticated) {
        return (
            <main className="my-orders-container">
                 <header className="page-top-header"><h1>My Orders</h1></header>
                <p className="login-prompt-message">Please log in to view your order history.</p>
            </main>
        );
    }

    return (
        <main className="my-orders-container">
            <header className="page-top-header"><h1>My Orders</h1></header>

            {isLoading && (
                <section className="loading-container" style={{ minHeight: '150px', padding: '1rem 0' }} aria-label="Loading your orders">
                    <figure className="spinner" role="img" aria-label="Loading animation"></figure>
                    <p>Loading your orders...</p>
                </section>
            )}

            {error && !isLoading && <p className="error-message">Error loading orders: {error}</p>}

            {!isLoading && orders.length === 0 && !error && (
                <p className="no-orders-message">You haven't placed any orders yet.</p>
            )}

            {!isLoading && orders.length > 0 && (
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
                                                {/* Assuming sellerOrder.storeName is populated from backend or via a join */}
                                                <h4>Shipment from {sellerOrder.storeName || `Store ID ${sellerOrder.userId}`}</h4> 
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