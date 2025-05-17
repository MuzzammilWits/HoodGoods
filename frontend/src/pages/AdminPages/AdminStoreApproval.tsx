import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './AdminStoreApproval.css'; // Reuse existing styles
import { useNavigate } from 'react-router-dom';

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

  interface Store {
    storeId: string;
    userId: string;
    storeName: string;
    standardPrice: number | null;
    standardTime: string | null;
    expressPrice: number | null;
    expressTime: string | null;
    isActiveStore: boolean;
    products?: Product[];
  }

const AdminStoreApproval = () => {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | null }>({ message: '', type: null });
  const navigate = useNavigate();
  const baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
  //const [expandedStores, setExpandedStores] = useState<Set<string>>(new Set());
  const [expandedStoreId, setExpandedStoreId] = useState<string | null>(null);

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification({ message: '', type: null }), 3000);
  };

  useEffect(() => {
    const fetchStores = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await axios.get<Store[]>(`${baseUrl}/stores/inactive`);
        setStores(response.data);
      } catch (err) {
        const errorMessage = axios.isAxiosError(err)
          ? err.response?.data?.message || err.message
          : err instanceof Error
          ? err.message
          : 'Failed to load stores';
        console.error("Fetch stores error:", errorMessage, err);
        setError(errorMessage);
        setStores([]);
      } finally {
        setLoading(false);
      }
    };

    fetchStores();
  }, []);

  const toggleStoreExpand = (storeId: string) => {
    setExpandedStoreId(expandedStoreId === storeId ? null : storeId);
  };

  const handleApprove = async (storeId: string) => {
    try {
      await axios.patch(`${baseUrl}/stores/${storeId}/approve`);
      setStores(stores.filter(s => s.storeId !== storeId));
      showNotification('Store approved successfully!', 'success');
    } catch (error) {
      showNotification('Failed to approve store', 'error');
    }
  };

  const handleReject = async (storeId: string) => {
    //if (!window.confirm('Are you sure you want to reject this store?')) return;
    try {
      await axios.delete(`${baseUrl}/stores/${storeId}`);
      setStores(stores.filter(s => s.storeId !== storeId));
      showNotification('Store rejected successfully!', 'success');
    } catch (error) {
      showNotification('Failed to reject store', 'error');
    }
  };

  const handleApproveProduct = async (productId: number) => {
    try {
      await axios.patch(`${baseUrl}/products/${productId}/approve`);
      setProducts(products.filter(p => p.prodId !== productId));
      showNotification('Product approved successfully!', 'success');
    } catch (error) {
      console.error('Error approving product:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to approve product';
      showNotification(errorMsg, 'error');
    }
  };

  const handleRejectProduct = async (productId: number) => {
    try {
      await axios.delete(`${baseUrl}/products/${productId}`);
      setProducts(products.filter(p => p.prodId !== productId));
      showNotification('Product deleted successfully!', 'success');
    } catch (error) {
      console.error('Error deleting product:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to delete product';
      showNotification(errorMsg, 'error');
    }
  };


  if (loading) {
    return <div className="loading-container"><div className="spinner"></div><p>Loading stores...</p></div>;
  }

  return (
    <div className="admin-stores-container">

        {/* Notification Modal */}
        {notification.type && (
        <div className={`notification-modal ${notification.type}`}>
          {notification.message}
        </div>
        )}

      <header className="admin-header">
        <h1>Store Management</h1>
        <button onClick={() => navigate('/admin-dashboard')} className="back-button">
          Back to Dashboard
        </button>
      </header>

      <div className="stores-list">
        {stores.map(store => (
          <div className="store-card" key={store.storeId}>
            <div className="store-header" onClick={() => toggleStoreExpand(store.storeId)}>
              <div className="store-info">
                <h2>{store.storeName}</h2>
                <div className="pricing-info">
                  <div>
                    <h4>Standard Service</h4>
                    <p>Price: {store.standardPrice}</p>
                    <p>Time: {store.standardTime || 'Not specified'}</p>
                  </div>
                  <div>
                    <h4>Express Service</h4>
                    <p>Price: {store.expressPrice}</p>
                    <p>Time: {store.expressTime || 'Not specified'}</p>
                  </div>
                </div>
              </div>

              {/* Toggle Arrow */}
  <div className={`toggle-arrow ${expandedStoreId === store.storeId ? 'expanded' : ''}`}>
    ▼
  </div>

              <button
                className="approve-button"
                onClick={e => {
                  e.stopPropagation();
                  handleApprove(store.storeId);
                 
                }}
              >
                Approve Store
              </button>
              <button
                className="reject-button"
                onClick={e => {
                  e.stopPropagation();
                  handleReject(store.storeId);
                }}
              >
                Reject Store
              </button>
            </div>
            {expandedStoreId === store.storeId && store.products && (
              <div className="store-products">
                <h3>Pending Products</h3>
                {store.products.length === 0 ? (
                  <p className="no-products">No pending products.</p>
                ) : (
                  <div className="products-grid">
                    {store.products.map(product => (
                      <div className="product-card" key={product.prodId}>
                        <div className="product-image">
                          <img
                            src={product.imageUrl || '/placeholder-product.jpg'}
                            alt={product.name}
                          />
                        </div>
                        <div className="product-details">
                          <h4>{product.name}</h4>
                          <p>R{product.price.toFixed(2)}</p>
                          <p>{product.category}</p>
                          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                            <button
                              className="edit-button2"
                              onClick={() => handleApproveProduct(product.prodId)}
                            >
                              Approve
                            </button>
                            <button
                              className="remove-button2"
                              onClick={() => handleRejectProduct(product.prodId)}
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
  
};

export default AdminStoreApproval;