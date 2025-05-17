// src/pages/AdminDashboard.tsx
import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import './AdminDashboard.css'; // Create this CSS file similar to ProductsPage.css

const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

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

const AdminDashboard = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error' | null}>({message: '', type: null});

  // Show notification and auto-hide after delay
  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({message, type});
    setTimeout(() => {
      setNotification({message: '', type: null});
    }, 3000);
  };

  useEffect(() => {
    const fetchInactiveProducts = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await axios.get<Product[]>(`${backendUrl}/products/inactive`);
        setProducts(response.data);
      } catch (err) {
        const errorMessage = axios.isAxiosError(err)
          ? err.response?.data?.message || err.message
          : err instanceof Error
          ? err.message
          : 'Failed to load products';
        console.error("Fetch products error:", errorMessage, err);
        setError(errorMessage);
        setProducts([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInactiveProducts();
  }, []);

  const handleApproveProduct = async (productId: number) => {
    try {
      await axios.patch(`${backendUrl}/products/${productId}/approve`);
      setProducts(products.filter(p => p.prodId !== productId));
      showNotification('Product approved successfully!', 'success');
    } catch (error) {
      console.error('Error approving product:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to approve product';
      showNotification(errorMsg, 'error');
    }
  };

  const handleDeleteProduct = async (productId: number) => {
    try {
      await axios.delete(`${backendUrl}/products/${productId}`);
      setProducts(products.filter(p => p.prodId !== productId));
      showNotification('Product deleted successfully!', 'success');
    } catch (error) {
      console.error('Error deleting product:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to delete product';
      showNotification(errorMsg, 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading products...</p>
      </div>
    );
  }

  if (error && !isLoading) {
    return (
      <section className="error-message" role="alert" aria-live="assertive">
        <h2>Error Loading Products</h2>
        <p>{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="retry-button"
        >
          Retry
        </button>
      </section>
    );
  }

  return (
    <main className="admin-container">
      {/* Notification Modal */}
      {notification.type && (
        <div className={`notification-modal ${notification.type}`}>
          {notification.message}
        </div>
      )}

      <h1>Admin Dashboard - Pending Product Approvals</h1>
      <p>Review and approve or reject products submitted by sellers.</p>

      <ul className="products-grid">
        {products.length > 0 ? (
          products.map((product) => (
            <li key={product.prodId} className="product-card">
              <article>
                <figure className="product-image-container">
                  <img
                    src={product.imageUrl || '/placeholder-product.jpg'}
                    alt={product.name || 'Product image'}
                    className="product-image"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      if (target.src !== '/placeholder-product.jpg') {
                        target.src = '/placeholder-product.jpg';
                        target.alt = 'Placeholder image';
                        target.classList.add('placeholder');
                      }
                    }}
                    loading="lazy"
                  />
                </figure>
                <section className="product-details">
                  <h2 className="product-name">{product.name}</h2>
                  <p className="product-store">Sold by: {product.storeName || 'Unknown Store'}</p>
                  <p className="product-description">{product.description}</p>
                  <p className="product-category">Category: {product.category}</p>
                  <p className="product-price">R{(Number(product.price) || 0).toFixed(2)}</p>
                  <p className="product-quantity">Available: {product.productquantity}</p>
                  <div className="admin-actions">
                    <button
                      onClick={() => handleApproveProduct(product.prodId)}
                      className="approve-btn"
                      aria-label={`Approve ${product.name}`}
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(product.prodId)}
                      className="delete-btn"
                      aria-label={`Delete ${product.name}`}
                    >
                      Delete
                    </button>
                  </div>
                </section>
              </article>
            </li>
          ))
        ) : (
          <li className="no-products">
            <p>No products pending approval.</p>
          </li>
        )}
      </ul>
    </main>
  );
};

export default AdminDashboard;