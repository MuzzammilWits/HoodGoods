// frontend/src/pages/AdminPages/AdminProductApproval.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './AdminProductApproval.css';

// Interface defining the structure of a product object
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

const AdminProductApproval: React.FC = () => {
  // State variables for managing product data, loading status, errors, and notifications
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate(); // Hook for programmatic navigation
  const baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'; // Base URL for API calls
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error' | null}>({message: '', type: null});

  // State for the selected store name in the filter dropdown
  const [selectedStoreName, setSelectedStoreName] = useState<string>('');

  // Function to display temporary notifications (success or error)
  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({message, type});
    // Hide the notification after 3 seconds
    setTimeout(() => {
      setNotification({message: '', type: null});
    }, 3000);
  };

  // Effect hook to fetch inactive products when the component mounts or baseUrl changes
  useEffect(() => {
    const fetchInactiveProducts = async () => {
      setLoading(true); // Set loading to true while fetching
      setError(null); // Clear any previous errors
      try {
        const response = await axios.get<Product[]>(`${baseUrl}/products/inactive`);
        setProducts(response.data); // Update products with fetched data
      } catch (err) {
        // Determine the error message based on the error type
        const errorMessage = axios.isAxiosError(err)
          ? err.response?.data?.message || err.message
          : err instanceof Error
          ? err.message
          : 'Failed to load products';
        setError(errorMessage); // Set the error message
        setProducts([]); // Clear products on error
      } finally {
        setLoading(false); // Set loading to false after fetch attempt
      }
    };

    fetchInactiveProducts(); // Call the fetch function
  }, [baseUrl]); // Dependency array: re-run effect if baseUrl changes

  // Handler for approving a product
  const handleApproveProduct = async (productId: number) => {
    try {
      await axios.patch(`${baseUrl}/products/${productId}/approve`); // API call to approve product
      // Optimistically update the UI by removing the approved product from the list
      setProducts(prevProducts => prevProducts.filter(p => p.prodId !== productId));
      showNotification('Product approved successfully!', 'success'); // Show success notification
    } catch (error) {
      // Handle errors during approval
      const errorMsg = error instanceof Error ? error.message : 'Failed to approve product';
      showNotification(errorMsg, 'error'); // Show error notification
    }
  };

  // Handler for deleting/rejecting a product
  const handleDeleteProduct = async (productId: number) => {
    try {
      await axios.delete(`${baseUrl}/products/${productId}`); // API call to delete product
      // Optimistically update the UI by removing the deleted product from the list
      setProducts(prevProducts => prevProducts.filter(p => p.prodId !== productId));
      showNotification('Product rejected and deleted successfully!', 'success'); // Show success notification
    } catch (error) {
      // Handle errors during deletion
      const errorMsg = error instanceof Error ? error.message : 'Failed to delete product';
      showNotification(errorMsg, 'error'); // Show error notification
    }
  };

  // Memoized list of unique store names for the filter dropdown
  const uniqueStoreNames = useMemo(() => {
    // Extract store names, filter out falsy values, create a Set for uniqueness, then sort alphabetically
    const storeNames = products.map(product => product.storeName).filter(Boolean);
    return [...new Set(storeNames)].sort((a, b) => a.localeCompare(b));
  }, [products]); // Re-calculate only when 'products' array changes

  // Memoized list of products filtered by the selected store name
  const filteredProducts = useMemo(() => {
    if (!selectedStoreName) {
      return products; // If no store selected, return all products
    }
    // Filter products where storeName matches the selected store name
    return products.filter(product => product.storeName === selectedStoreName);
  }, [products, selectedStoreName]); // Re-calculate only when 'products' or 'selectedStoreName' changes

  // Render loading state with skeleton UI
  if (loading) {
    return (
      <main className="admin-products-container" aria-busy="true">
        <header className="admin-header">
          <h1>Product Management</h1>
          <button onClick={() => navigate('/admin-dashboard')} className="back-button">
            Back to Dashboard
          </button>
        </header>
        {/* Skeleton for filter section */}
        <section className="filters-section" aria-labelledby="store-filter-heading">
          <h2 id="store-filter-heading" className="sr-only">Filter Products by Store</h2>
          <label htmlFor="store-filter-select" className="skeleton-item skeleton-label" style={{width: '120px', height: '1.2rem', marginRight: '1rem'}} aria-hidden="true"></label>
          <select
            id="store-filter-select"
            className="store-filter-select skeleton-item skeleton-select"
            disabled // Disable select during loading
            aria-hidden="true" // Hide from screen readers during skeleton state
            style={{width: '220px', height: '48px'}}
          >
            <option></option> {/* Empty option for skeleton */}
          </select>
        </section>
        {/* Skeleton for products table */}
        <section className="products-table-container">
          <table className="products-table" aria-label="Product Approval Table Skeleton">
            <thead>
              <tr>
                <th>Image</th>
                <th>Product Name</th>
                <th>Store</th>
                <th>Description</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {/* Render multiple skeleton rows */}
              {Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  <td>
                    <figure className="skeleton-item skeleton-thumbnail" aria-hidden="true" style={{width: '70px', height: '70px', borderRadius: '4px'}}></figure>
                  </td>
                  <td>
                    <section className="skeleton-item skeleton-text" aria-hidden="true" style={{width: '90%', height: '1.2rem', margin: '0.5rem 0'}}></section>
                  </td>
                  <td>
                    <section className="skeleton-item skeleton-text" aria-hidden="true" style={{width: '80%', height: '1.2rem', margin: '0.5rem 0'}}></section>
                  </td>
                  <td>
                    <section className="skeleton-item skeleton-description" aria-hidden="true" style={{width: '95%', height: '2.2rem', margin: '0.5rem 0'}}></section>
                  </td>
                  <td>
                    <section className="actions-cell" aria-hidden="true" style={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'flex-end',
                      gap: '1.2rem',
                      minHeight: '100px',
                      paddingLeft: 0,
                    }}>
                      <button className="skeleton-item skeleton-button" disabled aria-hidden="true" style={{minWidth: '85px', height: '38px', borderRadius: '4px'}}></button>
                      <button className="skeleton-item skeleton-button" disabled aria-hidden="true" style={{minWidth: '85px', height: '38px', borderRadius: '4px'}}></button>
                    </section>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    );
  }

  // Render error message if there's an error and not loading
  if (error && !loading) {
    return (
      <section className="error-message-container" role="alert" aria-live="assertive">
        <h2>Error Loading Products</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()} className="retry-button">
          Retry
        </button>
      </section>
    );
  }

  // Main render for the Admin Product Approval page
  return (
    <main className="admin-products-container">
      {/* Notification display area */}
      {notification.type && (
        <aside className={`notification-modal ${notification.type}`} role={notification.type === 'error' ? 'alert' : 'status'}>
          {notification.message}
        </aside>
      )}

      {/* Page header with title and back button */}
      <header className="admin-header">
        <h1>Product Management</h1>
        <button onClick={() => navigate('/admin-dashboard')} className="back-button">
          Back to Dashboard
        </button>
      </header>

      {/* Store Filter UI section */}
      <section className="filters-section" aria-labelledby="store-filter-heading">
        {/* Screen-reader only heading for accessibility */}
        <h2 id="store-filter-heading" className="sr-only">Filter Products by Store</h2>
        <label htmlFor="store-filter-select">Filter by Store:</label>
        <select
          id="store-filter-select"
          value={selectedStoreName}
          onChange={(e) => setSelectedStoreName(e.target.value)}
          className="store-filter-select"
        >
          <option value="">All Stores</option> {/* Option to view all stores */}
          {/* Map unique store names to options in the dropdown */}
          {uniqueStoreNames.map(storeName => (
            <option key={storeName} value={storeName}>
              {storeName}
            </option>
          ))}
        </select>
      </section>

      {/* Conditional rendering based on filtered products availability */}
      {filteredProducts.length === 0 ? (
        // Message displayed when no products match the filter or none are awaiting approval
        <p className="no-products-message">
          {selectedStoreName ? `No products awaiting approval for ${selectedStoreName}.` : 'No products are currently awaiting approval.'}
        </p>
      ) : (
        // Table container for displaying product details
        <section className="products-table-container">
          <table className="products-table" aria-label="Products awaiting approval">
            <thead>
              <tr>
                <th>Store Name</th>
                <th>Image</th>
                <th>Name</th>
                <th>Description</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {/* Map through filtered products to render each row */}
              {filteredProducts.map((product) => (
                <tr key={product.prodId}>
                  <td>{product.storeName || 'N/A'}</td> {/* Display store name or 'N/A' */}
                  <td>
                    <img
                      src={product.imageUrl || '/placeholder-product.jpg'} // Use placeholder if image URL is missing
                      alt={product.name}
                      className="product-thumbnail"
                    />
                  </td>
                  <td>{product.name}</td>
                  <td className="product-description-cell">
                    {product.description}
                  </td>
                  <td className="actions-cell">
                    {/* Approve button */}
                    <button
                      onClick={() => handleApproveProduct(product.prodId)}
                      className="edit-button2 action-button2"
                      aria-label={`Approve product ${product.name}`}
                    >
                      Approve
                    </button>
                    {/* Reject button */}
                    <button
                      onClick={() => handleDeleteProduct(product.prodId)}
                      className="remove-button2 action-button2"
                      aria-label={`Reject product ${product.name}`}
                    >
                      Reject
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </main>
  );
};

export default AdminProductApproval;