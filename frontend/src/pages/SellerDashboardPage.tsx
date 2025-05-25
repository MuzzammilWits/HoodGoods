// src/pages/SellerDashboardPage.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth0 } from '@auth0/auth0-react'; // For authentication
import axios, { AxiosError } from 'axios'; // For making HTTP requests
import './SellerDashboardPage.css';
import { Link } from 'react-router-dom'; // Import Link

// --- Helper Types ---
// ... (your existing interface definitions)
interface ProductSummary { prodId: number; name: string; imageUrl?: string; }
interface SellerOrderItemWithProduct { sellerOrderItemId: number; productId: number; quantityOrdered: number; pricePerUnit: number; productNameSnapshot: string; product: ProductSummary; createdAt: string | null; updatedAt: string | null; }
interface NestedOrderDetails { orderId: number; userId: string; orderDate: string; pickupArea: string; pickupPoint: string; }
interface SellerOrderDetails { sellerOrderId: number; orderId: number; order: NestedOrderDetails; userId: string; storeName?: string; deliveryMethod: string; deliveryPrice: number; deliveryTimeEstimate: string; itemsSubtotal: number; sellerTotal: number; status: string; createdAt: string | null; updatedAt: string | null; items: SellerOrderItemWithProduct[]; }
interface EarningsResponse { totalEarnings: number; }
// --- End Helper Types ---


const api = axios.create({ baseURL: import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000', });

// Possible statuses for filtering orders
const ORDER_FILTER_STATUSES = ['Processing', 'Packaging', 'Shipped', 'Ready for Pickup', 'Delivered', 'Cancelled'];

const ORDER_UPDATE_STATUSES = ['Processing', 'Packaging', 'Shipped', 'Ready for Pickup', 'Delivered'];

// Maps order status to a CSS class for styling
const statusClassMap: Record<string, string> = { Processing: 'status-processing', Packaging: 'status-packaging', 'Ready for Pickup': 'status-ready', Shipped: 'status-shipped', Delivered: 'status-delivered', Cancelled: 'status-cancelled', };

export default function SellerDashboardPage() {
    // Auth0 hook for user authentication details
    const { user, isAuthenticated, isLoading: isAuthLoading, getAccessTokenSilently } = useAuth0();

    const [allSellerOrders, setAllSellerOrders] = useState<SellerOrderDetails[]>([]);
    const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('All');
    const [earnings, setEarnings] = useState<number | null>(null);
    const [isLoadingOrders, setIsLoadingOrders] = useState(true);
    const [isLoadingEarnings, setIsLoadingEarnings] = useState(true);
    const [ordersError, setOrdersError] = useState<string | null>(null);
    const [earningsError, setEarningsError] = useState<string | null>(null);
    const [updateError, setUpdateError] = useState<string | null>(null);
    const [updatingStatusOrderId, setUpdatingStatusOrderId] = useState<number | null>(null); // Tracks which order is currently being updated

    // Fetches the seller's orders from the backend
    const fetchSellerOrders = useCallback(async () => {
        if (!isAuthenticated) return;
        setIsLoadingOrders(true); setOrdersError(null);
        try {
            const token = await getAccessTokenSilently();
            const response = await api.get<SellerOrderDetails[]>('/orders/my-seller-orders', { headers: { Authorization: `Bearer ${token}` }, });
            setAllSellerOrders(response.data);
        } catch (error) {
            console.error("Failed to fetch seller orders:", error);
            const errorMsg = error instanceof AxiosError ? error.response?.data?.message || error.message : 'Could not load seller orders.';
            setOrdersError(errorMsg); setAllSellerOrders([]);
        } finally { setIsLoadingOrders(false); }
    }, [isAuthenticated, getAccessTokenSilently]);

    // Fetches the seller's total earnings
    const fetchSellerEarnings = useCallback(async () => {
        if (!isAuthenticated) return; setIsLoadingEarnings(true); setEarningsError(null);
        try {
            const token = await getAccessTokenSilently();
            const response = await api.get<EarningsResponse>('/orders/my-seller-earnings', { headers: { Authorization: `Bearer ${token}` }, });
            setEarnings(response.data.totalEarnings);
        } catch (error) {
            console.error("Failed to fetch seller earnings:", error);
            const errorMsg = error instanceof AxiosError ? error.response?.data?.message || error.message : 'Could not load earnings.';
            setEarningsError(errorMsg);
        } finally { setIsLoadingEarnings(false); }
    }, [isAuthenticated, getAccessTokenSilently]);

    // Fetch data when user is authenticated
    useEffect(() => {
        if (isAuthenticated && !isAuthLoading) { fetchSellerOrders(); fetchSellerEarnings(); }
        else if (!isAuthLoading && !isAuthenticated) { // Clear data if user logs out or isn't authenticated
            setIsLoadingOrders(false); setIsLoadingEarnings(false); setAllSellerOrders([]); setEarnings(null); }
    }, [isAuthenticated, isAuthLoading, fetchSellerOrders, fetchSellerEarnings]);

    // Handles changes to the order status filter dropdown
    const handleFilterChange = (event: React.ChangeEvent<HTMLSelectElement>) => { setSelectedStatusFilter(event.target.value); };

    // Updates the status of a specific order
    const handleStatusUpdate = async (sellerOrderId: number, newStatus: string) => {
        setUpdateError(null); setUpdatingStatusOrderId(sellerOrderId);
        try {
            const token = await getAccessTokenSilently();
            await api.patch<SellerOrderDetails>( `/orders/seller/${sellerOrderId}/status`, { status: newStatus }, { headers: { Authorization: `Bearer ${token}` } } );
            // Update local state immediately for better UX
            setAllSellerOrders(currentOrders => currentOrders.map(order => order.sellerOrderId === sellerOrderId ? { ...order, status: newStatus, updatedAt: new Date().toISOString() } : order ));
        } catch (error) {
            console.error(`Failed to update status for order ${sellerOrderId}:`, error);
            const errorMsg = error instanceof AxiosError ? error.response?.data?.message || error.message : 'Could not update order status.';
            setUpdateError(`Failed for Order #${sellerOrderId}: ${errorMsg}`);
        } finally { setUpdatingStatusOrderId(null); }
    };

    // Memoized calculation for filtered orders based on selected status
    const filteredSellerOrders = useMemo(() => {
        if (selectedStatusFilter === 'All') return allSellerOrders;
        return allSellerOrders.filter(order => order.status === selectedStatusFilter);
    }, [allSellerOrders, selectedStatusFilter]);

    if (isAuthLoading) {
        return (
            <main className="seller-dashboard-container">
                <section className="main-titles"><h1>Seller Dashboard</h1></section>
                <p className="auth-loading-message">Loading authentication...</p>
            </main>
        );
    }
    // Prompt to login if not authenticated
    if (!isAuthenticated) {
        return (
            <main className="seller-dashboard-container">

                <section className="main-titles">
                    <h1>Orders</h1>
                </section>
                <header className="page-main-header">
                  {/* Intentionally empty or could have other non-H1 content if needed */}
                </header>

                <p className="login-prompt-message">Please log in to view your dashboard.</p>
            </main>
        );
    }

    // Main dashboard content
    return (
        <main className="seller-dashboard-container">

            <section className="main-titles">
                <h1>Orders</h1>
            </section>

            <header className="page-main-header">
                <p className="welcome-message">Welcome, {user?.name ?? 'Seller'}!</p>
            </header>


            {/* --- Back Button Added Here --- */}
            <section className="dashboard-navigation-bar">
                <Link to="/my-store" className="button-back-to-store">
                    Back to My Store
                </Link>
            </section>
            {/* --- End Back Button --- */}


            <section className="dashboard-section earnings-summary">
                <h2>Earnings</h2>
                {isLoadingEarnings && <p className="loading-text">Loading earnings...</p>}
                {earningsError && <p className="error-message">Error loading earnings: {earningsError}</p>}
                {earnings !== null && !isLoadingEarnings && !earningsError && (
                    <p className="earnings-display">Total Earnings (All Orders): R{earnings.toFixed(2)}</p>
                )}
            </section>

            {/* Orders Management Section */}
            <section className="dashboard-section orders-management">
                <header className="orders-header">
                    <h2>Your Orders</h2>
                    {/* Filter for orders by status */}
                    <section className="order-filter-container">
                        <label htmlFor="status-filter">Filter by Status:</label>
                        <select id="status-filter" value={selectedStatusFilter} onChange={handleFilterChange} disabled={isLoadingOrders} className="status-filter-select">
                            <option value="All">All Statuses</option>
                            {ORDER_FILTER_STATUSES.map(status => (<option key={status} value={status}>{status}</option>))}
                        </select>
                    </section>
                </header>


                {/* ... rest of your orders rendering logic ... */}
                {isLoadingOrders && (

                    <section className="loading-container orders-loading-inline" aria-label="Loading orders">
                        <figure className="spinner" role="img" aria-label="Loading animation"></figure>
                        <p>Loading orders...</p>
                    </section>
                )}
                {ordersError && !isLoadingOrders && <p className="error-message">Error loading orders: {ordersError}</p>}
                {!isLoadingOrders && filteredSellerOrders.length === 0 && !ordersError && (
                    <p className="no-orders-message">
                        {selectedStatusFilter === 'All' ? "You have no orders yet." : `No orders found with status "${selectedStatusFilter}".`}
                    </p>
                )}
                {updateError && <p className="error-message update-error">Update Error: {updateError}</p>}

                {/* Display list of orders if available */}
                {!isLoadingOrders && filteredSellerOrders.length > 0 && (
                    <ul className="order-list">
                        {filteredSellerOrders.map((sellerOrder) => (
                            <li key={sellerOrder.sellerOrderId} className="order-card-item">
                                <article className="order-card">
                                    <header className="order-header-card">
                                        <h3>Order #{sellerOrder.orderId} (Shipment #{sellerOrder.sellerOrderId})</h3>
                                        <p className="status-line">Status: <strong className={`status-badge ${statusClassMap[sellerOrder.status] || 'status-unknown'}`}>{sellerOrder.status}</strong></p>
                                    </header>
                                    <section className="order-details">
                                        <p><strong>Order Date:</strong> {new Date(sellerOrder.order.orderDate).toLocaleDateString()}</p>
                                        <p><strong>Pickup Area:</strong> {sellerOrder.order.pickupArea}</p>
                                        <p><strong>Pickup Point:</strong> {sellerOrder.order.pickupPoint}</p>
                                        <p><strong>Delivery Method:</strong> {sellerOrder.deliveryMethod} (R{sellerOrder.deliveryPrice.toFixed(2)})</p>
                                        <p><strong>Delivery Deadline:</strong> {sellerOrder.deliveryTimeEstimate} days</p>
                                        <p className="order-total"><strong>Your Total for this Shipment:</strong> R{sellerOrder.sellerTotal.toFixed(2)}</p>
                                    </section>
                                    <section className="items-section">
                                        <h4>Items in this Shipment:</h4>
                                        <ul className="item-list">
                                            {sellerOrder.items.map((item) => (
                                                <li key={item.sellerOrderItemId} className="item">
                                                    <figure className="item-image-figure">
                                                        <img src={item.product.imageUrl || 'https://placehold.co/60x60/eee/ccc?text=No+Image'} alt={item.product.name} className="item-image" onError={(e) => (e.currentTarget.src = 'https://placehold.co/60x60/eee/ccc?text=Error')} />
                                                    </figure>
                                                    <article className="item-details-info">
                                                        <p className="item-name-id">{item.productNameSnapshot} (ID: {item.productId})</p>
                                                        <p className="item-qty-price">Qty: {item.quantityOrdered} @ R{item.pricePerUnit.toFixed(2)} each</p>
                                                        <p className="item-line-total">Item Total: R{(item.pricePerUnit * item.quantityOrdered).toFixed(2)}</p>
                                                    </article>
                                                </li>
                                            ))}
                                        </ul>
                                    </section>
                                    {/* Form to update order status */}
                                    <form className="status-update-section" onSubmit={(e) => e.preventDefault()}>
                                        <label htmlFor={`status-${sellerOrder.sellerOrderId}`}>Update Status:</label>
                                        <select

                                            id={`status-${sellerOrder.sellerOrderId}`}
                                            value={sellerOrder.status}
                                            onChange={(e) => handleStatusUpdate(sellerOrder.sellerOrderId, e.target.value)}
                                            className="status-select"
                                            disabled={updatingStatusOrderId === sellerOrder.sellerOrderId || !ORDER_UPDATE_STATUSES.includes(sellerOrder.status)}
                                            aria-label={`Update status for shipment ${sellerOrder.sellerOrderId}`}
                                        >

                                            {!ORDER_UPDATE_STATUSES.includes(sellerOrder.status) ? (
                                                <option value={sellerOrder.status} disabled>{sellerOrder.status}</option>
                                            ) : (
                                                ORDER_UPDATE_STATUSES.map(status => (<option key={status} value={status}>{status}</option>))
                                            )}
                                        </select>
                                        {updatingStatusOrderId === sellerOrder.sellerOrderId && <output className="updating-indicator" aria-live="polite"> Updating...</output>}
                                    </form>
                                </article>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </main>
    );
}