// src/pages/MyOrdersPage.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import axios, { AxiosError } from 'axios';
import { Link } from 'react-router-dom'; // For potential links

// --- Helper Types (Matching backend response for GET /orders/my-orders) ---

// Define interfaces based on the nested structure returned by the backend
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

// SellerOrder nested within the main Order object
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
    // Optional: Add seller/store details if included in backend relation
    // seller?: { userId: string; /* other user fields */ };
    // store?: { storeId: string; storeName: string; /* other store fields */ };
}

// Main Order structure received from the backend
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

export default function MyOrdersPage() {
    const { user, isAuthenticated, isLoading: isAuthLoading, getAccessTokenSilently } = useAuth0();
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
        <main className="my-orders-container" style={styles.container}>
            <h1>My Orders</h1>

            {isLoading && <p>Loading your orders...</p>}
            {error && <p style={styles.error}>Error loading orders: {error}</p>}

            {!isLoading && orders.length === 0 && !error && (
                <p>You haven't placed any orders yet.</p>
            )}

            {!isLoading && orders.length > 0 && (
                <div style={styles.orderList}>
                    {orders.map((order) => (
                        <article key={order.orderId} style={styles.orderCard}>
                            <header style={styles.orderHeader}>
                                <h2>Order #{order.orderId}</h2>
                                <span>Placed on: {new Date(order.orderDate).toLocaleDateString()}</span>
                            </header>
                            <div style={styles.orderDetailsOverall}>
                                <p><strong>Grand Total:</strong> R{order.grandTotal.toFixed(2)}</p>
                                <p><strong>Pickup Location:</strong> {order.pickupPoint} ({order.pickupArea})</p>
                                {/* Add other overall order details if needed */}
                            </div>

                            {/* Section for Shipments from different sellers */}
                            <div style={styles.shipmentsSection}>
                                <h3>Shipments in this Order:</h3>
                                {order.sellerOrders.map((sellerOrder) => (
                                    <section key={sellerOrder.sellerOrderId} style={styles.shipmentCard}>
                                        <header style={styles.shipmentHeader}>
                                            <h4>Shipment #{sellerOrder.sellerOrderId}</h4>
                                            {/* TODO: Display Seller/Store Name if available */}
                                            {/* <p>From: {sellerOrder.store?.storeName || `Seller ID: ${sellerOrder.userId}`}</p> */}
                                            <p>Status: <strong style={styles.status[sellerOrder.status as keyof typeof styles.status] as React.CSSProperties || {}}>{sellerOrder.status}</strong></p>
                                        </header>
                                        <div style={styles.shipmentDetails}>
                                            <p><strong>Delivery:</strong> {sellerOrder.deliveryMethod} (Est: {sellerOrder.deliveryTimeEstimate})</p>
                                            <p><strong>Shipment Total:</strong> R{sellerOrder.sellerTotal.toFixed(2)}</p>
                                        </div>
                                        <ul style={styles.itemList}>
                                            {sellerOrder.items.map((item) => (
                                                <li key={item.sellerOrderItemId} style={styles.item}>
                                                    <img
                                                        src={item.product.imageUrl || 'https://placehold.co/50x50/eee/ccc?text=N/A'}
                                                        alt={item.product.name}
                                                        style={styles.itemImage}
                                                        onError={(e) => (e.currentTarget.src = 'https://placehold.co/50x50/eee/ccc?text=Err')}
                                                    />
                                                    <div style={styles.itemDetails}>
                                                        <span>{item.productNameSnapshot}</span>
                                                        <span>Qty: {item.quantityOrdered} @ R{item.pricePerUnit.toFixed(2)}</span>
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


// --- Basic Inline Styles (Consider moving to CSS) ---
const styles: { [key: string]: React.CSSProperties | Record<string, React.CSSProperties> } = {
    container: { padding: '2rem', fontFamily: 'Arial, sans-serif', maxWidth: '900px', margin: '0 auto' },
    error: { color: 'red', fontWeight: 'bold' },
    orderList: { display: 'flex', flexDirection: 'column', gap: '2rem' },
    orderCard: { border: '1px solid #ccc', borderRadius: '8px', padding: '1.5rem', backgroundColor: '#fff', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' },
    orderHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '1rem', marginBottom: '1rem', flexWrap: 'wrap' },
    orderDetailsOverall: { marginBottom: '1.5rem', lineHeight: '1.6' },
    shipmentsSection: { marginTop: '1rem' },
    shipmentCard: { border: '1px solid #e0e0e0', borderRadius: '6px', padding: '1rem', marginBottom: '1rem', backgroundColor: '#f9f9f9' },
    shipmentHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', borderBottom: '1px dashed #ddd', paddingBottom: '0.5rem', flexWrap: 'wrap' },
    shipmentDetails: { fontSize: '0.9em', marginBottom: '1rem' },
    itemList: { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.8rem' },
    item: { display: 'flex', alignItems: 'center', gap: '1rem', paddingBottom: '0.5rem' },
    itemImage: { width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #eee', backgroundColor: '#eee' },
    itemDetails: { display: 'flex', flexDirection: 'column', fontSize: '0.9em' },
    // Status styles copied from SellerDashboard (adjust if needed)
    status: {
        Processing: { fontWeight: 'bold', color: '#ffc107' },
        Packaging: { fontWeight: 'bold', color: '#17a2b8' },
        'Ready for Pickup': { fontWeight: 'bold', color: '#007bff' },
        Shipped: { fontWeight: 'bold', color: '#fd7e14' },
        Delivered: { fontWeight: 'bold', color: '#28a745' },
        Cancelled: { fontWeight: 'bold', color: '#dc3545', textDecoration: 'line-through' },
    } as Record<string, React.CSSProperties>,
};
// --- End Styles ---