// src/pages/AdminProducts.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate , Link} from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import axios from 'axios';
import './AdminProducts.css'; 

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


const AdminProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [deletingProductId, setDeletingProductId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const { getAccessTokenSilently } = useAuth0();

  //const { loginWithRedirect, isAuthenticated, getAccessTokenSilently } = useAuth0();

  const baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await axios.get(`${baseUrl}/products`);
        setProducts(response.data);
      } catch (err) {
        setError('Failed to fetch products');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const handleEdit = (prodId: number) => {
    navigate(`/admin/products/edit/${prodId}`);
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

  const handleDeleteClick = (prodId: number) => {
    // ... (implementation unchanged) ...
     if (window.confirm("Delete product?")) 
      { setDeletingProductId(prodId); 
        confirmDelete(prodId); 
      }
  };
  const confirmDelete = async (prodId: number) => {
    // ... (implementation unchanged) ...
     setActionError(null); 
     const token = await getAccessTokenSilently(); 
     if (!token) { setActionError("Auth error."); 
      setDeletingProductId(null); return; }

     try {
         const res = await fetch(`${baseUrl}/admin/products/${prodId}`, {method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }});
         if (!res.ok && res.status !== 204) 
          { const e = await res.json().catch(()=>({message:'Failed delete'})); 
         throw new Error(e.message || `Error: ${res.statusText}`); 
        }
         //await fetchStoreData(token);
      
         const updatedProducts = await fetch(`${baseUrl}/products`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }).then(res => res.json());
    
        setProducts(updatedProducts);

     } catch (err: any) 
     { console.error(`Error deleting product ${prodId}:`, err); 
     setActionError(err.message || "Unknown error deleting."); 
    }
     finally { 
      setDeletingProductId(null); 
    }
  };
  //Admin Remove Product - End

  if (loading) return <div className="loading">Loading products...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="admin-products-container">
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
                    onClick={() => handleEdit(product.prodId)}
                    className="edit-button2"
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => handleDeleteClick(product.prodId)}
                    className="remove-button2"
                  >
                    Remove
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

export default AdminProducts;