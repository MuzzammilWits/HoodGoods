// src/pages/SellerDashboardPage.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import axios, { AxiosError } from 'axios';
import { Link } from 'react-router-dom';
// *** Import the CSS file ***
import './SellerDashboardPage.css';

// --- Helper Types (Keep as defined before) ---
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
interface NestedOrderDetails {
    orderId: number;
    userId: string;
    orderDate: string;
    pickupArea: string;
    pickupPoint: string;
}
interface SellerOrderDetails {
    sellerOrderId: number;
    orderId: number;
    order: NestedOrderDetails;
    userId: string;
    deliveryMethod: string;
    deliveryPrice: number;
    deliveryTimeEstimate: string;
    itemsSubtotal: number;
    sellerTotal: number;
    status: string;
    createdAt: string | null;
    updatedAt: string | null;
    items: SellerOrderItemWithProduct[];
}
interface EarningsResponse {
    totalEarnings: number;
}
// --- End Helper Types ---

// Create Axios instance outside the component
const api = axios.create({
    baseURL: import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000',
});

// Define allowed statuses for mapping CSS classes (optional, but can be useful)
const statusClassMap: Record<string, string> = {
    Processing: 'status-processing',
    Packaging: 'status-packaging',
    'Ready for Pickup': 'status-ready',
    Shipped: 'status-shipped',
    Delivered: 'status-delivered',
    Cancelled: 'status-cancelled',
};


export default function SellerDashboardPage() {
    const { user, isAuthenticated, isLoading: isAuthLoading, getAccessTokenSilently } = useAuth0();
    const [sellerOrders, setSellerOrders] = useState<SellerOrderDetails[]>([]);
    const [earnings, setEarnings] = useState<number | null>(null);
    const [isLoadingOrders, setIsLoadingOrders] = useState(true);
    const [isLoadingEarnings, setIsLoadingEarnings] = useState(true);
    const [ordersError, setOrdersError] = useState<string | null>(null);
    const [earningsError, setEarningsError] = useState<string | null>(null);
    const [updateError, setUpdateError] = useState<string | null>(null);
    const [updatingStatusOrderId, setUpdatingStatusOrderId] = useState<number | null>(null);


    // --- Fetch Seller Orders ---
    const fetchSellerOrders = useCallback(async () => {
        // ... (fetch logic remains the same) ...
         if (!isAuthenticated) return;
        setIsLoadingOrders(true);
        setOrdersError(null);
        try {
            const token = await getAccessTokenSilently();
            const response = await api.get<SellerOrderDetails[]>('/orders/my-seller-orders', {
                headers: { Authorization: `Bearer ${token}` },
            });
            setSellerOrders(response.data);
        } catch (error) {
            console.error("Failed to fetch seller orders:", error);
            const errorMsg = error instanceof AxiosError
                ? error.response?.data?.message || error.message
                : 'Could not load seller orders.';
            setOrdersError(errorMsg);
            setSellerOrders([]);
        } finally {
            setIsLoadingOrders(false);
        }
    }, [isAuthenticated, getAccessTokenSilently]);


    // --- Fetch Seller Earnings ---
    const fetchSellerEarnings = useCallback(async (statusFilter?: string) => {
        // ... (fetch logic remains the same) ...
         if (!isAuthenticated) return;
        setIsLoadingEarnings(true);
        setEarningsError(null);
        try {
            const token = await getAccessTokenSilently();
            const params = statusFilter ? { status: statusFilter } : {};
            const response = await api.get<EarningsResponse>('/orders/my-seller-earnings', {
                headers: { Authorization: `Bearer ${token}` },
                params: params
            });
            setEarnings(response.data.totalEarnings);
        } catch (error) {
            console.error("Failed to fetch seller earnings:", error);
            const errorMsg = error instanceof AxiosError
                ? error.response?.data?.message || error.message
                : 'Could not load seller earnings.';
            setEarningsError(errorMsg);
            setEarnings(null);
        } finally {
            setIsLoadingEarnings(false);
        }
    }, [isAuthenticated, getAccessTokenSilently]);


    // --- Initial Data Fetch Effect ---
    useEffect(() => {
        // ... (effect logic remains the same) ...
         console.log("SellerDashboardPage Effect: Running data fetch.");
        if (isAuthenticated && !isAuthLoading) {
            console.log("SellerDashboardPage Effect: User authenticated, fetching data...");
            fetchSellerOrders();
            fetchSellerEarnings(); // Fetch total earnings initially
        } else if (!isAuthLoading && !isAuthenticated) {
             console.log("SellerDashboardPage Effect: User not authenticated.");
            setIsLoadingOrders(false);
            setIsLoadingEarnings(false);
            setSellerOrders([]);
            setEarnings(null);
        } else {
             console.log("SellerDashboardPage Effect: Auth still loading...");
        }
    }, [isAuthenticated, isAuthLoading, fetchSellerOrders, fetchSellerEarnings]);


    // --- Handler for Status Update ---
    const handleStatusUpdate = async (sellerOrderId: number, newStatus: string) => {
        // ... (handler logic remains the same) ...
         setUpdateError(null);
        setUpdatingStatusOrderId(sellerOrderId);
        console.log(`Attempting to update seller order ${sellerOrderId} to status ${newStatus}`);

        try {
            const token = await getAccessTokenSilently();
            const response = await api.patch<SellerOrderDetails>(
                `/orders/seller/${sellerOrderId}/status`,
                { status: newStatus },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            console.log(`Successfully updated status for order ${sellerOrderId}`, response.data);
            setSellerOrders(currentOrders =>
                currentOrders.map(order =>
                    order.sellerOrderId === sellerOrderId
                        ? { ...order, status: newStatus, updatedAt: new Date().toISOString() }
                        : order
                )
            );
        } catch (error) {
            console.error(`Failed to update status for order ${sellerOrderId}:`, error);
            const errorMsg = error instanceof AxiosError
                ? error.response?.data?.message || error.message
                : 'Could not update order status.';
            setUpdateError(`Failed for Order #${sellerOrderId}: ${errorMsg}`);
        } finally {
            setUpdatingStatusOrderId(null);
        }
    };


    // --- Render Logic ---
    if (isAuthLoading) { /* ... */ }
    if (!isAuthenticated) { /* ... */ }

    return (
        // *** Use classNames matching the CSS file ***
        <main className="seller-dashboard-container">
            <h1>Seller Dashboard</h1>
            <p>Welcome, {user?.name ?? 'Seller'}!</p>

            {/* --- Earnings Section --- */}
            <section className="dashboard-section">
                <h2>Earnings</h2>
                {isLoadingEarnings && <p>Loading earnings...</p>}
                {earningsError && <p className="error-message">Error loading earnings: {earningsError}</p>}
                {earnings !== null && !isLoadingEarnings && !earningsError && (
                    <p className="earnings-display">Total Earnings (All Orders): R{earnings.toFixed(2)}</p>
                )}
            </section>

            {/* --- Orders Section --- */}
            <section className="dashboard-section">
                <h2>Your Orders</h2>
                {isLoadingOrders && <p>Loading orders...</p>}
                {ordersError && <p className="error-message">Error loading orders: {ordersError}</p>}
                {!isLoadingOrders && sellerOrders.length === 0 && !ordersError && (
                    <p>You have no orders yet.</p>
                )}
                {updateError && <p className="error-message update-error">Update Error: {updateError}</p>}

                {/* Order List */}
                <div className="order-list">
                    {sellerOrders.map((sellerOrder) => (
                        <article key={sellerOrder.sellerOrderId} className="order-card">
                            <header className="order-header">
                                <h3>Order #{sellerOrder.orderId} </h3>
                                {/* Apply dynamic status class */}
                                <p>Status: <strong className={`status-badge ${statusClassMap[sellerOrder.status] || 'status-unknown'}`}>{sellerOrder.status}</strong></p>
                            </header>
                            <div className="order-details">
                                <p><strong>Order Date:</strong> {new Date(sellerOrder.order.orderDate).toLocaleDateString()}</p>
                                <p><strong>Buyer User ID:</strong> {sellerOrder.order.userId}</p>
                                <p><strong>Pickup Area:</strong> {sellerOrder.order.pickupArea}</p>
                                <p><strong>Pickup Point:</strong> {sellerOrder.order.pickupPoint}</p>
                                <p><strong>Delivery Method:</strong> {sellerOrder.deliveryMethod} (R{sellerOrder.deliveryPrice.toFixed(2)})</p>
                                <p><strong>Est. Delivery Time:</strong> {sellerOrder.deliveryTimeEstimate}</p>
                                <p><strong>Your Total for this Order:</strong> R{sellerOrder.sellerTotal.toFixed(2)}</p>
                            </div>

                            {/* Items in this SellerOrder */}
                            <div className="items-section">
                                <h4>Items in this Shipment:</h4>
                                <ul className="item-list">
                                    {sellerOrder.items.map((item) => (
                                        <li key={item.sellerOrderItemId} className="item">
                                            <img
                                                src={item.product.imageUrl || 'https://placehold.co/60x60/eee/ccc?text=No+Image'}
                                                alt={item.product.name}
                                                className="item-image"
                                                onError={(e) => (e.currentTarget.src = 'https://placehold.co/60x60/eee/ccc?text=Error')}
                                            />
                                            <div className="item-details">
                                                <span>{item.productNameSnapshot} (ID: {item.productId})</span>
                                                <span>Qty: {item.quantityOrdered} @ R{item.pricePerUnit.toFixed(2)} each</span>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Status Update Section */}
                             <div className="status-update-section">
                                 <label htmlFor={`status-${sellerOrder.sellerOrderId}`}>Update Status: </label>
                                 <select
                                     id={`status-${sellerOrder.sellerOrderId}`}
                                     value={sellerOrder.status}
                                     onChange={(e) => handleStatusUpdate(sellerOrder.sellerOrderId, e.target.value)}
                                     className="status-select"
                                     disabled={updatingStatusOrderId === sellerOrder.sellerOrderId}
                                 >
                                     <option value="Processing">Processing</option>
                                     <option value="Packaging">Packaging</option>
                                     <option value="Shipped">Shipped</option>
                                     <option value="Ready for Pickup">Ready for Pickup</option>
                                     
                                     
                                 </select>
                                 {updatingStatusOrderId === sellerOrder.sellerOrderId && <span className="updating-indicator"> Updating...</span>}
                             </div>
                        </article>
                    ))}
                </div>
            </section>
        </main>
    );
}
