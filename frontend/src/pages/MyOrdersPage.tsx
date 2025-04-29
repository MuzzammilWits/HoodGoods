// src/pages/MyOrdersPage.tsx

import { useState, useEffect, useCallback } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import axios, { AxiosError } from 'axios';
// import { Link } from 'react-router-dom'; For potential links
// *** Import the CSS file ***
import './MyOrdersPage.css';

// --- Helper Types (Matching backend response for GET /orders/my-orders) ---
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
    status: string; // This is the tracking status for this part
    createdAt: string | null;
    updatedAt: string | null;
    items: SellerOrderItemWithProduct[];
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
    sellerOrders: NestedSellerOrder[]; // Array of seller orders within this main order
}
// --- End Helper Types ---

// Create Axios instance outside the component
const api = axios.create({
    baseURL: import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000',
});

// Define allowed statuses for mapping CSS classes
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

    // --- Fetch Buyer Orders ---
    const fetchMyOrders = useCallback(async () => {
        if (!isAuthenticated) return;
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
            setOrders([]); // Clear orders on error
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticated, getAccessTokenSilently]); // Dependencies

    // --- Initial Data Fetch Effect ---
    useEffect(() => {
        if (isAuthenticated && !isAuthLoading) {
            fetchMyOrders();
        } else if (!isAuthLoading && !isAuthenticated) {
            setIsLoading(false);
            setOrders([]);
        }
    }, [isAuthenticated, isAuthLoading, fetchMyOrders]); // Run when auth state changes


    // --- Render Logic ---
    if (isAuthLoading) {
        return <p>Loading authentication...</p>;
    }

    if (!isAuthenticated) {
        return <p>Please log in to view your order history.</p>;
    }

    return (
        // *** Use classNames matching the CSS file ***
        <main className="my-orders-container">
            <h1>My Orders</h1>

            {isLoading && <p>Loading your orders...</p>}
            {error && <p className="error-message">Error loading orders: {error}</p>}

            {!isLoading && orders.length === 0 && !error && (
                <p>You haven't placed any orders yet.</p>
            )}

            {!isLoading && orders.length > 0 && (
                <div className="order-list">
                    {orders.map((order) => (
                        <article key={order.orderId} className="order-card">
                            <header className="order-header">
                                <h2>Order #{order.orderId}</h2>
                                <span>Placed on: {new Date(order.orderDate).toLocaleDateString()}</span>
                            </header>
                            <div className="order-details-overall">
                                <p><strong>Grand Total:</strong> R{order.grandTotal.toFixed(2)}</p>
                                <p><strong>Pickup Location:</strong> {order.pickupPoint} ({order.pickupArea})</p>
                            </div>

                            <div className="shipments-section">
                                <h3>Shipments in this Order:</h3>
                                {order.sellerOrders.map((sellerOrder) => (
                                    <section key={sellerOrder.sellerOrderId} className="shipment-card">
                                        <header className="shipment-header">
                                            <h4>Shipment #{sellerOrder.sellerOrderId}</h4>
                                            {/* TODO: Display Seller/Store Name */}
                                            <p>Status: <strong className={`status-badge ${statusClassMap[sellerOrder.status] || 'status-unknown'}`}>{sellerOrder.status}</strong></p>
                                        </header>
                                        <div className="shipment-details">
                                            <p><strong>Delivery Method:</strong> {sellerOrder.deliveryMethod} (R{sellerOrder.deliveryPrice.toFixed(2)})</p>
                                            <p><strong>ETA:</strong> {sellerOrder.deliveryTimeEstimate} days</p>
                                            <p><strong>Shipment Total:</strong> R{sellerOrder.sellerTotal.toFixed(2)}</p>
                                        </div>
                                        <ul className="item-list">
                                            {sellerOrder.items.map((item) => (
                                                <li key={item.sellerOrderItemId} className="item">
                                                    <img
                                                        src={item.product.imageUrl || 'https://placehold.co/50x50/eee/ccc?text=N/A'}
                                                        alt={item.product.name}
                                                        className="item-image"
                                                        onError={(e) => (e.currentTarget.src = 'https://placehold.co/50x50/eee/ccc?text=Err')}
                                                    />
                                                    <div className="item-details">
                                                        <span>{item.productNameSnapshot}</span>
                                                        <span>Qty: {item.quantityOrdered} @ R{item.pricePerUnit.toFixed(2)}</span>
                                                        <span>Item Total: R{(item.pricePerUnit * item.quantityOrdered).toFixed(2)}</span>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    </section>
                                ))}
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </main>
    );
}
