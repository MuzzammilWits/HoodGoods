// src/pages/AdminProductApproval.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate , Link} from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
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


const AdminProductApproval = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  //const [deletingProductId, setDeletingProductId] = useState<number | null>(null);
  //const [actionError, setActionError] = useState<string | null>(null);
  const { getAccessTokenSilently } = useAuth0();

  //const { loginWithRedirect, isAuthenticated, getAccessTokenSilently } = useAuth0();

  const baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

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
        console.error("Fetch products error:", errorMessage, err);
        setError(errorMessage);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchInactiveProducts();
  }, []);

  const handleEdit = (prodId: number) => {
    navigate(`/admin/products/edit/${prodId}`);
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

  const handleDeleteProduct = async (productId: number) => {
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


  //Admin Remove Product - Start
  const handleRemove = async (prodId: number) => {
    if (!window.confirm('Are you sure you want to remove this product?')) return;
    
    try {
      await axios.delete(`${baseUrl}/products/${prodId}`);
      setProducts(products.filter(p => p.prodId !== prodId));
    } catch (err) {
      setError('Failed to remove product');
      console.error(err);
    }
  };

  
  //Admin Remove Product - End

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading products...</p>
      </div>
    );
  }

  if (error && !loading) {
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
    <div className="admin-products-container">

        {/* Notification Modal */}
      {notification.type && (
        <div className={`notification-modal ${notification.type}`}>
          {notification.message}
        </div>
      )}

      <header className="admin-header">
        <h1>Product Management</h1>
        <button onClick={() => navigate('/admin-dashboard')} className="back-button">
          Back to Dashboard
        </button>
      </header>

      <div className="products-table-container">
        <table className="products-table">
          <thead>
            <tr>
              <th>Image</th>
              <th>Name</th>
              <th>Store</th>
              <th>Price</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.prodId}>
                <td>
                  <img 
                    src={product.imageUrl || '/placeholder-product.jpg'} 
                    alt={product.name}
                    className="product-thumbnail"
                  />
                </td>
                <td>{product.name}</td>
                <td>{product.storeName}</td>
                <td>R{product.price.toFixed(2)}</td>
                <td>
                  <span className={`status-badge ${product.isActive ? 'active' : 'inactive'}`}>
                    {product.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="actions-cell">
                  <button 
                    onClick={() => handleApproveProduct(product.prodId)}
                    className="edit-button2"
                  >
                    Approve
                  </button>
                  <button 
                    onClick={() => handleDeleteProduct(product.prodId)}
                    className="remove-button2"
                  >
                    Reject
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminProductApproval;