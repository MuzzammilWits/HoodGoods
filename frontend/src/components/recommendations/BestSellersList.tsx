// frontend/src/components/recommendations/BestSellersList.tsx
import React, { useState, useEffect } from 'react';
import { getBestSellingProducts } from '../../services/recommendationsService';
import { PopularProductDto } from '../../types'; // Or your specific path to types
import './BestSellersList.css'; // We'll create this CSS file for basic styling

interface BestSellersListProps {
  limit?: number;
  timeWindowDays?: number; // Optional: if you want to make it configurable from where it's used
  title?: string; // Optional: to allow customizing the title like "Top Selling Products" or "Popular Right Now"
}

const BestSellersList: React.FC<BestSellersListProps> = ({
  limit = 5, // Default to 5 products
  timeWindowDays = 30, // Default to last 30 days
  title = 'Best Selling Products',
}) => {
  const [products, setProducts] = useState<PopularProductDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getBestSellingProducts(limit, timeWindowDays);
        setProducts(data);
      } catch (err) {
        console.error('Failed to fetch best sellers:', err);
        setError('Could not load best selling products. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [limit, timeWindowDays]); // Re-fetch if limit or timeWindowDays change

  if (loading) {
    return <div className="best-sellers-loading">Loading best sellers...</div>;
  }

  if (error) {
    return <div className="best-sellers-error">Error: {error}</div>;
  }

  if (products.length === 0) {
    return <div className="best-sellers-empty">No best selling products found.</div>;
  }

  return (
    <div className="best-sellers-container">
      <h2>{title}</h2>
      <div className="best-sellers-grid">
        {products.map((product) => (
          <div key={product.productId} className="best-seller-card">
            <img
              src={product.imageUrl || '/placeholder-image.png'} // Provide a fallback placeholder image
              alt={product.name}
              className="best-seller-image"
            />
            <div className="best-seller-info">
              <h3 className="best-seller-name">{product.name}</h3>
              {product.storeName && (
                <p className="best-seller-store">Sold by: {product.storeName}</p>
              )}
              <p className="best-seller-sales">Sold: {product.salesCount} units</p>
              {/* You could add a link to the product page here if you have routing set up */}
              {/* e.g., <Link to={`/products/${product.productId}`}>View Product</Link> */}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BestSellersList;