import { useEffect, useState } from 'react';
import axios from 'axios';
import './AdminStoreApproval.css';
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
    const [products, setProducts] = useState<Product[]>([]);
    const [notification, setNotification] = useState<{ 
        message: string; 
        type: 'success' | 'error' | null 
    }>({ message: '', type: null });
    const navigate = useNavigate();
    const baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
    const [expandedStoreId, setExpandedStoreId] = useState<string | null>(null);

    const showNotification = (message: string, type: 'success' | 'error') => {
        setNotification({ message, type });
        setTimeout(() => setNotification({ message: '', type: null }), 3000);
    };

    useEffect(() => {
        const fetchStores = async () => {
            setLoading(true);
            try {
                const response = await axios.get<Store[]>(`${baseUrl}/stores/inactive`);
                setStores(response.data);
            } catch (err) {
                console.error("Error fetching stores:", err);
                showNotification(
                    axios.isAxiosError(err) 
                        ? err.response?.data?.message || err.message 
                        : 'Failed to load stores',
                    'error'
                );
                setStores([]);
            } finally {
                setLoading(false);
            }
        };

        fetchStores();
    }, [baseUrl]);

    const toggleStoreExpand = (storeId: string) => {
        setExpandedStoreId(expandedStoreId === storeId ? null : storeId);
    };

    const handleApproveStore = async (storeId: string) => {
        try {
            await axios.patch(`${baseUrl}/stores/${storeId}/approve`);
            setStores(stores.filter(s => s.storeId !== storeId));
            showNotification('Store approved successfully!', 'success');
        } catch (error) {
            showNotification('Failed to approve store', 'error');
        }
    };

    const handleRejectStore = async (storeId: string) => {
        try {
            await axios.delete(`${baseUrl}/stores/${storeId}`);
            setStores(stores.filter(s => s.storeId !== storeId));
            showNotification('Store rejected successfully!', 'success');
        } catch (error) {
            showNotification('Failed to reject store', 'error');
        }
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
                <p>Loading stores...</p>
            </div>
        );
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

              <button
                className="approve-button"
                onClick={e => {
                  e.stopPropagation();
                  handleApproveStore(store.storeId);
                 
                }}
              >
                Approve Store
              </button>
              <button
                className="reject-button"
                onClick={e => {
                  e.stopPropagation();
                  handleRejectStore(store.storeId);
                }}
              >
                Reject Store
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminStoreApproval;
