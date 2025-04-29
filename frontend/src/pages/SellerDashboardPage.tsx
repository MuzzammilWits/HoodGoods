// src/pages/SellerDashboardPage.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import axios, { AxiosError } from 'axios';
import { Link } from 'react-router-dom'; // For potential links

// --- Helper Types (Define based on backend response structure) ---

// Interface for the nested Product within SellerOrderItem
interface ProductSummary {
    prodId: number;
    name: string;
    imageUrl?: string; // Optional image URL
}

// Interface for SellerOrderItem including the nested Product
interface SellerOrderItemWithProduct {
    sellerOrderItemId: number;
    productId: number;
    quantityOrdered: number;
    pricePerUnit: number;
    productNameSnapshot: string;
    product: ProductSummary; // Nested product details
    createdAt: string | null; // Assuming string format for now, adjust if Date object
    updatedAt: string | null; // Assuming string format for now, adjust if Date object
}

// Interface for the main Order details nested within SellerOrder
interface NestedOrderDetails {
    orderId: number;
    userId: string; // Buyer's User ID
    orderDate: string; // Assuming string format
    pickupArea: string;
    pickupPoint: string;
    // Add buyer details if needed/available from backend relation (e.g., user.email)
}

// Interface for the SellerOrder structure received from the backend
interface SellerOrderDetails {
    sellerOrderId: number;
    orderId: number;
    order: NestedOrderDetails; // Nested main order details
    userId: string; // Seller's User ID (should match logged-in user)
    deliveryMethod: string;
    deliveryPrice: number;
    deliveryTimeEstimate: string;
    itemsSubtotal: number;
    sellerTotal: number;
    status: string;
    createdAt: string | null; // Assuming string format for now
    updatedAt: string | null; // Assuming string format for now
    items: SellerOrderItemWithProduct[]; // Array of items with nested products
}

// Interface for the Earnings response
interface EarningsResponse {
    totalEarnings: number;
}

// --- End Helper Types ---

// Create Axios instance outside the component
const api = axios.create({
    baseURL: import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000',
});


export default function SellerDashboardPage() {
    const { user, isAuthenticated, isLoading: isAuthLoading, getAccessTokenSilently } = useAuth0();
    const [sellerOrders, setSellerOrders] = useState<SellerOrderDetails[]>([]);
    const [earnings, setEarnings] = useState<number | null>(null);
    const [isLoadingOrders, setIsLoadingOrders] = useState(true);
    const [isLoadingEarnings, setIsLoadingEarnings] = useState(true);
    const [ordersError, setOrdersError] = useState<string | null>(null);
    const [earningsError, setEarningsError] = useState<string | null>(null);
    const [updateError, setUpdateError] = useState<string | null>(null);
    // Add state to track which order is currently being updated
    const [updatingStatusOrderId, setUpdatingStatusOrderId] = useState<number | null>(null);


    // --- Fetch Seller Orders ---
    const fetchSellerOrders = useCallback(async () => {
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
    }, [isAuthenticated, getAccessTokenSilently]); // Dependencies


    // --- Fetch Seller Earnings ---
    const fetchSellerEarnings = useCallback(async (statusFilter?: string) => {
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
    }, [isAuthenticated, getAccessTokenSilently]); // Dependencies


    // --- Initial Data Fetch Effect ---
    useEffect(() => {
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
        setUpdateError(null); // Clear previous update errors
        setUpdatingStatusOrderId(sellerOrderId); // Indicate which order is being updated
        console.log(`Attempting to update seller order ${sellerOrderId} to status ${newStatus}`);

        try {
            // 1. Get token
            const token = await getAccessTokenSilently();

            // 2. Call PATCH /orders/seller/:sellerOrderId/status
            const response = await api.patch<SellerOrderDetails>(
                `/orders/seller/${sellerOrderId}/status`, // Correct endpoint URL
                { status: newStatus }, // Request body matching UpdateOrderStatusDto
                { headers: { Authorization: `Bearer ${token}` } }
            );

            console.log(`Successfully updated status for order ${sellerOrderId}`, response.data);

            // 3. Handle success: Refresh the orders list to show the change
            // Alternatively, update the specific order in the state directly for better UX
            // Option A: Refetch all orders
            // fetchSellerOrders();

            // Option B: Update state directly (more immediate feedback)
            setSellerOrders(currentOrders =>
                currentOrders.map(order =>
                    order.sellerOrderId === sellerOrderId
                        ? { ...order, status: newStatus, updatedAt: new Date().toISOString() } // Update status and maybe timestamp locally
                        : order
                )
            );

        } catch (error) {
            // 4. Handle error
            console.error(`Failed to update status for order ${sellerOrderId}:`, error);
            const errorMsg = error instanceof AxiosError
                ? error.response?.data?.message || error.message
                : 'Could not update order status.';
            setUpdateError(`Failed for Order #${sellerOrderId}: ${errorMsg}`);
        } finally {
            setUpdatingStatusOrderId(null); // Finish updating status for this order
        }
    };


    // --- Render Logic ---
    if (isAuthLoading) {
        return <p>Loading authentication...</p>;
    }

    if (!isAuthenticated) {
        return <p>Please log in to view your seller dashboard.</p>;
    }

    return (
        <main className="seller-dashboard-container" style={styles.container}>
            <h1>Seller Dashboard</h1>
            <p>Welcome, {user?.name ?? 'Seller'}!</p>

            {/* --- Earnings Section --- */}
            <section style={styles.section}>
                <h2>Earnings</h2>
                {isLoadingEarnings && <p>Loading earnings...</p>}
                {earningsError && <p style={styles.error}>Error loading earnings: {earningsError}</p>}
                {earnings !== null && !isLoadingEarnings && !earningsError && (
                    <p style={styles.earnings}>Total Earnings (All Orders): R{earnings.toFixed(2)}</p>
                    // TODO: Add UI for filtering earnings by status (e.g., 'Completed')
                )}
            </section>

            {/* --- Orders Section --- */}
            <section style={styles.section}>
                <h2>Your Orders</h2>
                {isLoadingOrders && <p>Loading orders...</p>}
                {ordersError && <p style={styles.error}>Error loading orders: {ordersError}</p>}
                {!isLoadingOrders && sellerOrders.length === 0 && !ordersError && (
                    <p>You have no orders yet.</p>
                )}
                {/* Display general update error or specific order update error */}
                {updateError && <p style={styles.error}>Update Error: {updateError}</p>}

                {/* Order List */}
                <div style={styles.orderList}>
                    {sellerOrders.map((sellerOrder) => (
                        <article key={sellerOrder.sellerOrderId} style={styles.orderCard}>
                            <header style={styles.orderHeader}>
                                <h3>Order #{sellerOrder.orderId} </h3>
                                <p>Status: <strong style={styles.status[sellerOrder.status as keyof typeof styles.status] as React.CSSProperties || {}}>{sellerOrder.status}</strong></p>
                            </header>
                            <div style={styles.orderDetails}>
                                <p><strong>Order Date:</strong> {new Date(sellerOrder.order.orderDate).toLocaleDateString()}</p>
                                <p><strong>Buyer User ID:</strong> {sellerOrder.order.userId}</p>
                                <p><strong>Pickup Area:</strong> {sellerOrder.order.pickupArea}</p>
                                <p><strong>Pickup Point:</strong> {sellerOrder.order.pickupPoint}</p>
                                <p><strong>Delivery Method:</strong> {sellerOrder.deliveryMethod} (R{sellerOrder.deliveryPrice.toFixed(2)})</p>
                                <p><strong>Est. Delivery Time:</strong> {sellerOrder.deliveryTimeEstimate}</p>
                                <p><strong>Your Total for this Order:</strong> R{sellerOrder.sellerTotal.toFixed(2)}</p>
                            </div>

                            {/* Items in this SellerOrder */}
                            <div style={styles.itemsSection}>
                                <h4>Items in this Shipment:</h4>
                                <ul style={styles.itemList}>
                                    {sellerOrder.items.map((item) => (
                                        <li key={item.sellerOrderItemId} style={styles.item}>
                                            <img
                                                src={item.product.imageUrl || 'https://placehold.co/60x60/eee/ccc?text=No+Image'}
                                                alt={item.product.name}
                                                style={styles.itemImage}
                                                onError={(e) => (e.currentTarget.src = 'https://placehold.co/60x60/eee/ccc?text=Error')}
                                            />
                                            <div style={styles.itemDetails}>
                                                <span>{item.productNameSnapshot} (ID: {item.productId})</span>
                                                <span>Qty: {item.quantityOrdered} @ R{item.pricePerUnit.toFixed(2)} each</span>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Status Update Section */}
                             <div style={styles.statusUpdateSection}>
                                 <label htmlFor={`status-${sellerOrder.sellerOrderId}`}>Update Status: </label>
                                 <select
                                     id={`status-${sellerOrder.sellerOrderId}`}
                                     value={sellerOrder.status} // Use value for controlled component
                                     onChange={(e) => handleStatusUpdate(sellerOrder.sellerOrderId, e.target.value)}
                                     style={styles.statusSelect}
                                     // Disable dropdown while this specific order is updating
                                     disabled={updatingStatusOrderId === sellerOrder.sellerOrderId}
                                 >
                                     {/* Populate with allowed statuses */}
                                     <option value="Processing">Processing</option>
                                     <option value="Packaging">Packaging</option>
                                     <option value="Ready for Pickup">Ready for Pickup</option>
                                     <option value="Shipped">Shipped</option>
                                     <option value="Delivered">Delivered</option>
                                     <option value="Cancelled">Cancelled</option>
                                 </select>
                                 {/* Show indicator when updating */}
                                 {updatingStatusOrderId === sellerOrder.sellerOrderId && <span style={{marginLeft: '10px'}}> Updating...</span>}
                             </div>
                        </article>
                    ))}
                </div>
            </section>
        </main>
    );
}


// --- Basic Inline Styles ---
const styles: { [key: string]: React.CSSProperties | Record<string, React.CSSProperties> } = {
    container: {
        padding: '2rem',
        fontFamily: 'Arial, sans-serif',
        maxWidth: '1200px',
        margin: '0 auto',
    },
    section: {
        marginBottom: '2rem',
        padding: '1.5rem',
        backgroundColor: '#f9f9f9',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    },
    error: {
        color: 'red',
        fontWeight: 'bold',
        marginTop: '0.5rem',
        fontSize: '0.9em',
    },
    earnings: {
        fontSize: '1.2em',
        fontWeight: 'bold',
        color: '#28a745',
    },
    orderList: {
        display: 'grid',
        gap: '1.5rem',
        gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    },
    orderCard: {
        border: '1px solid #ddd',
        borderRadius: '8px',
        padding: '1rem',
        backgroundColor: '#fff',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.8rem',
    },
    orderHeader: {
        borderBottom: '1px solid #eee',
        paddingBottom: '0.8rem',
        marginBottom: '0.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
    },
    orderDetails: {
        fontSize: '0.9em',
        lineHeight: '1.5',
    },
    itemsSection: {
        marginTop: '1rem',
        borderTop: '1px solid #eee',
        paddingTop: '1rem',
    },
    itemList: {
        listStyle: 'none',
        padding: 0,
        margin: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.8rem',
    },
    item: {
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        paddingBottom: '0.5rem',
        borderBottom: '1px dashed #eee',
    },
    itemImage: {
        width: '60px',
        height: '60px',
        objectFit: 'cover',
        borderRadius: '4px',
        border: '1px solid #eee',
        backgroundColor: '#eee', // Background for placeholder/error
    },
    itemDetails: {
        display: 'flex',
        flexDirection: 'column',
        fontSize: '0.9em',
    },
    statusUpdateSection: {
        marginTop: '1rem',
        paddingTop: '1rem',
        borderTop: '1px solid #eee',
        display: 'flex', // Align label, select, and indicator
        alignItems: 'center', // Center items vertically
        gap: '0.5rem', // Space between elements
    },
    statusSelect: {
        padding: '0.5rem',
        borderRadius: '4px',
        border: '1px solid #ccc',
        minWidth: '150px', // Give dropdown some width
    },
    // Basic status styling
    status: {
        Processing: { fontWeight: 'bold', color: '#ffc107' },
        Packaging: { fontWeight: 'bold', color: '#17a2b8' },
        'Ready for Pickup': { fontWeight: 'bold', color: '#007bff' },
        Shipped: { fontWeight: 'bold', color: '#fd7e14' },
        Delivered: { fontWeight: 'bold', color: '#28a745' },
        Cancelled: { fontWeight: 'bold', color: '#dc3545', textDecoration: 'line-through' },
    } as Record<string, React.CSSProperties>,
};
