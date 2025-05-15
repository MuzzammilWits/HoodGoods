// src/pages/AdminProductsApproval.tsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';

const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

interface Product {
  prodId: number;
  name: string;
  description: string;
  category: string;
  price: number;
  storeName: string;
  imageUrl: string;
}

const AdminProductsApproval = () => {
  const [pendingProducts, setPendingProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { getAccessTokenSilently } = useAuth0();

  useEffect(() => {
    const fetchPendingProducts = async () => {
      try {
        const token = await getAccessTokenSilently();
        const response = await axios.get(`${backendUrl}/products/pending`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        setPendingProducts(response.data);
      } catch (err) {
        setError('Failed to fetch pending products');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPendingProducts();
  }, [getAccessTokenSilently]);

  const handleApprove = async (productId: number) => {
    try {
      const token = await getAccessTokenSilently();
      await axios.post(
        `${backendUrl}/products/${productId}/approve`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPendingProducts(pendingProducts.filter(p => p.prodId !== productId));
    } catch (err) {
      console.error('Failed to approve product:', err);
    }
  };

  const handleReject = async (productId: number, reason: string) => {
    try {
      const token = await getAccessTokenSilently();
      await axios.post(
        `${backendUrl}/products/${productId}/reject`,
        { reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPendingProducts(pendingProducts.filter(p => p.prodId !== productId));
    } catch (err) {
      console.error('Failed to reject product:', err);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div className="container">
      <h1>Pending Product Approvals</h1>
      {pendingProducts.length === 0 ? (
        <p>No products pending approval</p>
      ) : (
        <ul className="product-list">
          {pendingProducts.map(product => (
            <li key={product.prodId} className="product-card">
              <img 
                src={product.imageUrl || '/placeholder.jpg'} 
                alt={product.name}
                className="product-image"
              />
              <div className="product-details">
                <h3>{product.name}</h3>
                <p>Store: {product.storeName}</p>
                <p>Category: {product.category}</p>
                <p>Price: R{product.price.toFixed(2)}</p>
                <p>{product.description}</p>
                <div className="approval-actions">
                  <button 
                    onClick={() => handleApprove(product.prodId)}
                    className="approve-btn"
                  >
                    Approve
                  </button>
                  <button 
                    onClick={() => {
                      const reason = prompt('Enter rejection reason:');
                      if (reason) handleReject(product.prodId, reason);
                    }}
                    className="reject-btn"
                  >
                    Reject
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AdminProductsApproval;