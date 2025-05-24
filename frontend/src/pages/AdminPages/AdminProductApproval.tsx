// frontend/src/pages/AdminPages/AdminProductApproval.tsx
import React, { useState, useEffect, useMemo } from 'react'; // Added useMemo
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './AdminProductApproval.css';

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
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error' | null}>({message: '', type: null});

  // --- New state for store name filter ---
  const [selectedStoreName, setSelectedStoreName] = useState<string>('');
  // --- End new state ---

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({message, type});
    setTimeout(() => {
      setNotification({message: '', type: null});
    }, 3000);
  };

  useEffect(() => {
    const fetchInactiveProducts = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await axios.get<Product[]>(`${baseUrl}/products/inactive`);
        setProducts(response.data);
      } catch (err) {
        const errorMessage = axios.isAxiosError(err)
          ? err.response?.data?.message || err.message
          : err instanceof Error
          ? err.message
          : 'Failed to load products';
        setError(errorMessage);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchInactiveProducts();
  }, [baseUrl]);

  const handleApproveProduct = async (productId: number) => {
    try {
      await axios.patch(`${baseUrl}/products/${productId}/approve`);
      // Refetch or filter locally after approval
      setProducts(prevProducts => prevProducts.filter(p => p.prodId !== productId));
      showNotification('Product approved successfully!', 'success');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to approve product';
      showNotification(errorMsg, 'error');
    }
  };

  const handleDeleteProduct = async (productId: number) => {
    try {
      await axios.delete(`${baseUrl}/products/${productId}`);
      // Refetch or filter locally after deletion
      setProducts(prevProducts => prevProducts.filter(p => p.prodId !== productId));
      showNotification('Product rejected and deleted successfully!', 'success');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to delete product';
      showNotification(errorMsg, 'error');
    }
  };

  // --- Derive unique store names for the filter dropdown ---
  const uniqueStoreNames = useMemo(() => {
    const storeNames = products.map(product => product.storeName).filter(Boolean); // filter(Boolean) removes null/undefined/empty strings
    return [...new Set(storeNames)].sort((a, b) => a.localeCompare(b)); // Alphabetical sort
  }, [products]);
  // --- End derive unique store names ---

  // --- Filter products based on selectedStoreName ---
  const filteredProducts = useMemo(() => {
    if (!selectedStoreName) {
      return products; // No filter applied or "All Stores" selected
    }
    return products.filter(product => product.storeName === selectedStoreName);
  }, [products, selectedStoreName]);
  // --- End filter products ---


  if (loading) {
    return (
      <section className="loading-container" aria-label="Loading products">
        <figure className="spinner" role="img" aria-label="Loading animation"></figure>
        <p>Loading products...</p>
      </section>
    );
  }

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

  return (
    <main className="admin-products-container">
      {notification.type && (
        <aside className={`notification-modal ${notification.type}`} role={notification.type === 'error' ? 'alert' : 'status'}>
          {notification.message}
        </aside>
      )}

      <header className="admin-header">
        <h1>Product Management</h1>
        <button onClick={() => navigate('/admin-dashboard')} className="back-button">
          Back to Dashboard
        </button>
      </header>

      {/* --- Store Filter UI --- */}
      <section className="filters-section" aria-labelledby="store-filter-heading">
        <h2 id="store-filter-heading" className="sr-only">Filter Products by Store</h2> {/* Screen-reader only heading */}
        <label htmlFor="store-filter-select">Filter by Store:</label>
        <select
          id="store-filter-select"
          value={selectedStoreName}
          onChange={(e) => setSelectedStoreName(e.target.value)}
          className="store-filter-select"
        >
          <option value="">All Stores</option>
          {uniqueStoreNames.map(storeName => (
            <option key={storeName} value={storeName}>
              {storeName}
            </option>
          ))}
        </select>
      </section>
      {/* --- End Store Filter UI --- */}


      {filteredProducts.length === 0 ? (
        <p className="no-products-message">
          {selectedStoreName ? `No products awaiting approval for ${selectedStoreName}.` : 'No products are currently awaiting approval.'}
        </p>
      ) : (
        <section className="products-table-container">
          <table className="products-table">
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
              {/* Use filteredProducts here */}
              {filteredProducts.map((product) => (
                <tr key={product.prodId}>
                  <td>{product.storeName || 'N/A'}</td>
                  <td>
                    <img
                      src={product.imageUrl || '/placeholder-product.jpg'}
                      alt={product.name}
                      className="product-thumbnail"
                    />
                  </td>
                  <td>{product.name}</td>
                  <td className="product-description-cell">
                    {product.description}
                  </td>
                  <td className="actions-cell">
                    <button
                      onClick={() => handleApproveProduct(product.prodId)}
                      className="edit-button2 action-button2"
                      aria-label={`Approve product ${product.name}`}
                    >
                      Approve
                    </button>
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