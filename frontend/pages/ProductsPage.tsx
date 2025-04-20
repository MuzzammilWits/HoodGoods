import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import ProductCard from '../pages/ProductCard';
//import FiltersSidebar from '../components/FiltersSidebar';
import './ProductsPage.css';

// Define the Product interface
interface Product {
  productID: string;
  productName: string;
  productdescription: string;
  productCategory: string;
  productprice: number;
  userID: string;
  imageURL: string;
  storeName: string;
}

const ProductsPage = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError('');
        
        // Get all query parameters
        const params = Object.fromEntries(searchParams.entries());
        
        // Construct query string
        const queryString = new URLSearchParams(params).toString();
        
        // Using your environment variable for the API URL
        const apiUrl = (import.meta as any).env.VITE_API_URL || 'http://localhost:3000';
        const response = await fetch(`${apiUrl}/products?${queryString}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Handle both { data: Product[] } and Product[] response formats
        setProducts(Array.isArray(data) ? data : data.data || []);
        
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch products');
        console.error('Error fetching products:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [searchParams]);

  if (loading) {
    return <div className="loading-state">Loading products...</div>;
  }

  if (error) {
    return <div className="error-state">Error: {error}</div>;
  }

  return (
    <div className="products-container">
      
      
      <div className="products-content">
        <div className="products-header">
          <h1>All Products</h1>
          <span className="products-count">{products.length} products found</span>
        </div>
        
        <div className="products-grid">
          {products.map((product) => (
            <ProductCard key={product.productID} product={product} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProductsPage;