// src/pages/SellerDashboardPage.tsx

import React, { useState, useEffect, useCallback, useMemo } from 'react'; // Import useMemo
import { useAuth0 } from '@auth0/auth0-react';
import axios, { AxiosError } from 'axios';
// import { Link } from 'react-router-dom';
import './SellerDashboardPage.css'; // Ensure CSS is linked

// --- Helper Types (Keep as defined before) ---
interface ProductSummary { prodId: number; name: string; imageUrl?: string; }
interface SellerOrderItemWithProduct { sellerOrderItemId: number; productId: number; quantityOrdered: number; pricePerUnit: number; productNameSnapshot: string; product: ProductSummary; createdAt: string | null; updatedAt: string | null; }
interface NestedOrderDetails { orderId: number; userId: string; orderDate: string; pickupArea: string; pickupPoint: string; }
interface SellerOrderDetails { sellerOrderId: number; orderId: number; order: NestedOrderDetails; userId: string; deliveryMethod: string; deliveryPrice: number; deliveryTimeEstimate: string; itemsSubtotal: number; sellerTotal: number; status: string; createdAt: string | null; updatedAt: string | null; items: SellerOrderItemWithProduct[]; }
interface EarningsResponse { totalEarnings: number; }
// --- End Helper Types ---

// Create Axios instance outside the component
const api = axios.create({
    baseURL: import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000',
});

// --- Define Possible Order Statuses ---
// Use the list you provided for filtering
const ORDER_FILTER_STATUSES = [
    'Processing',
    'Packaging',
    'Shipped',
    'Ready for Pickup',
];

// Statuses available in the update dropdown (can be the same or include others)
const ORDER_UPDATE_STATUSES = [
    'Processing',
    'Packaging',
    'Shipped',
    'Ready for Pickup',
    // 'Delivered', // Add others if sellers can set them
    // 'Cancelled',
];
// --- End Order Statuses ---


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
    // --- State for ALL fetched orders ---
    const [allSellerOrders, setAllSellerOrders] = useState<SellerOrderDetails[]>([]); // Renamed from sellerOrders
    // --- State for the selected filter ---
    const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('All'); // Default to 'All'
    // --- Other existing state ---
    const [earnings, setEarnings] = useState<number | null>(null);
    const [isLoadingOrders, setIsLoadingOrders] = useState(true);
    const [isLoadingEarnings, setIsLoadingEarnings] = useState(true);
    const [ordersError, setOrdersError] = useState<string | null>(null);
    const [earningsError, setEarningsError] = useState<string | null>(null);
    const [updateError, setUpdateError] = useState<string | null>(null);
    const [updatingStatusOrderId, setUpdatingStatusOrderId] = useState<number | null>(null);


    // --- Fetch Seller Orders (Fetches ALL orders) ---
    const fetchSellerOrders = useCallback(async () => {
         if (!isAuthenticated) return;
        setIsLoadingOrders(true);
        setOrdersError(null);
        try {
            const token = await getAccessTokenSilently();
            // This endpoint fetches ALL seller orders (no filter param needed)
            const response = await api.get<SellerOrderDetails[]>('/orders/my-seller-orders', {
                headers: { Authorization: `Bearer ${token}` },
            });
            setAllSellerOrders(response.data); // Store the full list
        } catch (error) {
            console.error("Failed to fetch seller orders:", error);
            const errorMsg = error instanceof AxiosError
                ? error.response?.data?.message || error.message
                : 'Could not load seller orders.';
            setOrdersError(errorMsg);
            setAllSellerOrders([]); // Clear list on error
        } finally {
            setIsLoadingOrders(false);
        }
    }, [isAuthenticated, getAccessTokenSilently]); // Doesn't depend on filter


    // --- Fetch Seller Earnings (Unchanged) ---
    const fetchSellerEarnings = useCallback(async () => {
        // ... (fetch logic remains the same - fetches total earnings) ...
         if (!isAuthenticated) return;
         setIsLoadingEarnings(true); setEarningsError(null);
         try {
             const token = await getAccessTokenSilently();
             const response = await api.get<EarningsResponse>('/orders/my-seller-earnings', {
                 headers: { Authorization: `Bearer ${token}` },
             });
             setEarnings(response.data.totalEarnings);
         } catch (error) { /* ... error handling ... */ }
         finally { setIsLoadingEarnings(false); }
    }, [isAuthenticated, getAccessTokenSilently]);


    // --- Initial Data Fetch Effect (Unchanged) ---
    useEffect(() => {
         console.log("SellerDashboardPage Effect: Running initial data fetch.");
        if (isAuthenticated && !isAuthLoading) {
            console.log("SellerDashboardPage Effect: User authenticated, fetching data...");
            fetchSellerOrders(); // Fetch all orders on initial load/auth ready
            fetchSellerEarnings();
        } else if (!isAuthLoading && !isAuthenticated) {
             console.log("SellerDashboardPage Effect: User not authenticated.");
             setIsLoadingOrders(false); setIsLoadingEarnings(false);
             setAllSellerOrders([]); setEarnings(null); // Reset all orders state
        } else {
             console.log("SellerDashboardPage Effect: Auth still loading...");
        }
        // Fetch only depends on auth state now, not the filter
    }, [isAuthenticated, isAuthLoading, fetchSellerOrders, fetchSellerEarnings]);


    // --- Handler for Filter Change ---
    const handleFilterChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedStatusFilter(event.target.value);
        // No fetch needed here, filtering happens in useMemo
    };

    // --- Handler for Status Update (Optimistic Update) ---
    const handleStatusUpdate = async (sellerOrderId: number, newStatus: string) => {
         setUpdateError(null);
        setUpdatingStatusOrderId(sellerOrderId);
        console.log(`Attempting to update seller order ${sellerOrderId} to status ${newStatus}`);
        try {
            const token = await getAccessTokenSilently();
            // Call backend to update status
            await api.patch<SellerOrderDetails>(
                `/orders/seller/${sellerOrderId}/status`,
                { status: newStatus },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            console.log(`Successfully updated status for order ${sellerOrderId}`);
            // Update the *main* list (allSellerOrders) optimistically
            setAllSellerOrders(currentOrders =>
                currentOrders.map(order =>
                    order.sellerOrderId === sellerOrderId
                        ? { ...order, status: newStatus, updatedAt: new Date().toISOString() }
                        : order
                )
            );
            // The filtered list will update automatically due to useMemo dependency
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

    // --- Filtered List Calculation using useMemo ---
    const filteredSellerOrders = useMemo(() => {
        console.log(`Filtering orders. Filter: ${selectedStatusFilter}, Total orders: ${allSellerOrders.length}`);
        if (selectedStatusFilter === 'All') {
            return allSellerOrders; // Return the full list
        }
        // Filter the allSellerOrders list based on the selected status
        return allSellerOrders.filter(order => order.status === selectedStatusFilter);
    }, [allSellerOrders, selectedStatusFilter]); // Re-run only when all orders or the filter changes


    // --- Render Logic ---
    if (isAuthLoading) { return <p>Loading authentication...</p>; }
    if (!isAuthenticated) { return <main className="seller-dashboard-container"><h1>Seller Dashboard</h1><p>Please log in to view your dashboard.</p></main>; }

    return (
        <main className="seller-dashboard-container">
            <h1>Seller Dashboard</h1>
            <p>Welcome, {user?.name ?? 'Seller'}!</p>

            {/* --- Earnings Section (Unchanged) --- */}
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
                {/* Header with Title and Filter */}
                <div className="orders-header">
                    <h2>Your Orders</h2>
                    <div className="order-filter-container">
                        <label htmlFor="status-filter">Filter by Status:</label>
                        <select
                            id="status-filter"
                            value={selectedStatusFilter}
                            onChange={handleFilterChange}
                            disabled={isLoadingOrders} // Still disable during initial load
                            className="status-filter-select"
                        >
                            <option value="All">All Statuses</option>
                            {/* Populate with filterable statuses */}
                            {ORDER_FILTER_STATUSES.map(status => (
                                <option key={status} value={status}>{status}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Loading/Error/Empty States */}
                {isLoadingOrders && <p>Loading orders...</p>}
                {ordersError && <p className="error-message">Error loading orders: {ordersError}</p>}
                {/* Check the *filtered* list length for the "no orders" message */}
                {!isLoadingOrders && filteredSellerOrders.length === 0 && !ordersError && (
                    <p className="no-orders-message">
                        {selectedStatusFilter === 'All'
                            ? "You have no orders yet."
                            : `No orders found with status "${selectedStatusFilter}".`}
                    </p>
                )}
                {updateError && <p className="error-message update-error">Update Error: {updateError}</p>}

                {/* Order List - Map over the FILTERED list */}
                {!isLoadingOrders && filteredSellerOrders.length > 0 && (
                     <div className="order-list">
                        {filteredSellerOrders.map((sellerOrder) => ( // <<< Use filteredSellerOrders
                            <article key={sellerOrder.sellerOrderId} className="order-card">
                                <header className="order-header">
                                    <h3>Order #{sellerOrder.orderId} </h3>
                                    <p>Status: <strong className={`status-badge ${statusClassMap[sellerOrder.status] || 'status-unknown'}`}>{sellerOrder.status}</strong></p>
                                </header>
                                <div className="order-details">
                                    <p><strong>Order Date:</strong> {new Date(sellerOrder.order.orderDate).toLocaleDateString()}</p>
                                    <p><strong>Pickup Area:</strong> {sellerOrder.order.pickupArea}</p>
                                    <p><strong>Pickup Point:</strong> {sellerOrder.order.pickupPoint}</p>
                                    <p><strong>Delivery Method:</strong> {sellerOrder.deliveryMethod} (R{sellerOrder.deliveryPrice.toFixed(2)})</p>
                                    <p><strong>Delivery Deadline:</strong> {sellerOrder.deliveryTimeEstimate} days</p>
                                    <p><strong>Your Total for this Order:</strong> R{sellerOrder.sellerTotal.toFixed(2)}</p>
                                </div>
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
                                                    <span>Item Total: R{(item.pricePerUnit * item.quantityOrdered).toFixed(2)}</span>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                {/* Status Update Dropdown - uses ORDER_UPDATE_STATUSES */}
                                 <div className="status-update-section">
                                     <label htmlFor={`status-${sellerOrder.sellerOrderId}`}>Update Status:</label>
                                     <select
                                         id={`status-${sellerOrder.sellerOrderId}`}
                                         value={sellerOrder.status}
                                         onChange={(e) => handleStatusUpdate(sellerOrder.sellerOrderId, e.target.value)}
                                         className="status-select"
                                         disabled={updatingStatusOrderId === sellerOrder.sellerOrderId}
                                     >
                                         {/* Use ORDER_UPDATE_STATUSES here */}
                                         {ORDER_UPDATE_STATUSES.map(status => (
                                             <option key={status} value={status}>{status}</option>
                                         ))}
                                     </select>
                                     {updatingStatusOrderId === sellerOrder.sellerOrderId && <span className="updating-indicator"> Updating...</span>}
                                 </div>
                            </article>
                        ))}
                    </div>
                )}
            </section>
        </main>
    );
}