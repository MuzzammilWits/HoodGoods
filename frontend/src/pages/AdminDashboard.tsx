import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './AdminDashboard.css'; // Create this CSS file for styling

interface Product {
  prodId: number;
  name: string;
  description: string;
  category: string;
  price: number;
  imageUrl: string;
  storeName: string;
  isActive: boolean;
}

interface ApiResponse {
  success: boolean;
  data: Product[];
  message?: string;
}

const AdminDashboard: React.FC = () => {
  const [pendingProducts, setPendingProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingProducts();
  }, []);

  const fetchPendingProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get<ApiResponse>('/products/pending');
      if (response.data.success) {
        setPendingProducts(response.data.data);
      } else {
        setError(response.data.message || "Invalid data received from server.");
      }
    } catch (error: any) {
      console.error('Error fetching pending products:', error);
      setError(error.response?.data?.message || error.message || "Failed to fetch pending products.");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (prodId: number) => {
    try {
      setError(null);
      setSuccessMessage(null);
      const response = await axios.patch<ApiResponse>(`/products/${prodId}/approve`);
      if (response.data.success) {
        // setSuccessMessage(`Product "${response.data.data.name}" approved successfully!`);
        setPendingProducts(prevProducts =>
          prevProducts.filter(product => product.prodId !== prodId)
        );
      } else {
        setError(response.data.message || 'Failed to approve product.');
      }
    } catch (error: any) {
      console.error('Error approving product:', error);
      setError(error.response?.data?.message || "Failed to approve product.");
    }
  };

  const handleDisapprove = async (prodId: number) => {
    try {
      setError(null);
      setSuccessMessage(null);
      const response = await axios.delete<ApiResponse>(`/products/${prodId}/disapprove`);
      if (response.data.success) {
        setSuccessMessage('Product disapproved successfully.');
        setPendingProducts(prevProducts =>
          prevProducts.filter(product => product.prodId !== prodId)
        );
      } else {
        setError(response.data.message || 'Failed to disapprove product.');
      }
    } catch (error: any) {
      console.error('Error disapproving product:', error);
      setError(error.response?.data?.message || "Failed to disapprove product.");
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading pending products...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <h2>Error</h2>
        <p>{error}</p>
        <button onClick={fetchPendingProducts} className="retry-button">
          Retry
        </button>
      </div>
    );
  }

  return (
    <main className="admin-dashboard">
      <h1>Admin Dashboard - Pending Products</h1>
      
      {successMessage && (
        <div className="success-message">
          {successMessage}
        </div>
      )}

      {pendingProducts.length === 0 ? (
        <div className="no-products">No products pending approval.</div>
      ) : (
        <div className="products-table-container">
          <table className="products-table">
            <thead>
              <tr>
                <th>Product ID</th>
                <th>Image</th>
                <th>Name</th>
                <th>Category</th>
                <th>Price</th>
                <th>Store</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingProducts.map((product) => (
                <tr key={product.prodId}>
                  <td>{product.prodId}</td>
                  <td>
                    <img 
                      src={product.imageUrl || '/placeholder-image.png'} 
                      alt={product.name} 
                      className="product-image"
                    />
                  </td>
                  <td>{product.name}</td>
                  <td>{product.category}</td>
                  <td>R{product.price.toFixed(2)}</td>
                  <td>{product.storeName}</td>
                  <td className="actions-cell">
                    <button
                      onClick={() => handleApprove(product.prodId)}
                      className="approve-button"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleDisapprove(product.prodId)}
                      className="disapprove-button"
                    >
                      Disapprove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
};

export default AdminDashboard;