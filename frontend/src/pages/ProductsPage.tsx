import { useEffect, useState } from 'react';
import { useCart } from '../context/ContextCart';
import axios from 'axios';
import './ProductsPage.css';

interface Product {
  id: number;
  name: string;
  price: number;
  description: string;
  imageUrl: string;
}

interface CartItem {
  productId: string;
  name: string;
  price: number;
  image: string;
}

const ProductsPage = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { addToCart } = useCart();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await axios.get('http://localhost:3000/products');
        
        if (!Array.isArray(response.data)) {
          throw new Error('Invalid data format received from server');
        }

        setProducts(response.data);
        setError(null);
      } catch (err) {
        const errorMessage = axios.isAxiosError(err)
          ? err.response?.data?.message || err.message
          : err instanceof Error
          ? err.message
          : 'Failed to load products';
          
        setError(errorMessage);
        setProducts([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const handleAddToCart = (product: Product) => {
    const cartItem: CartItem = {
      productId: product.id.toString(),
      name: product.name,
      price: product.price,
      image: product.imageUrl
    };
    addToCart(cartItem);
  };

  if (isLoading) {
    return <div className="loading-spinner">Loading products...</div>;
  }

  if (error) {
    return (
      <div className="error-message">
        {error}
        <button 
          onClick={() => {
            setIsLoading(true);
            setError(null);
            setProducts([]);
          }}
          className="retry-button"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="products-container">
      <h1>Artisan Products</h1>
      <div className="products-grid">
        {products.map((product) => (
          <div key={product.id} className="product-card">
            <div className="product-image-container">
              <img
                src={product.imageUrl}
                alt={product.name}
                className="product-image"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/placeholder-product.jpg';
                  (e.target as HTMLImageElement).className = 'product-image placeholder';
                }}
              />
            </div>
            <div className="product-details">
              <h3 className="product-name">{product.name}</h3>
              <p className="product-description">{product.description}</p>
              <p className="product-price">R{product.price.toFixed(2)}</p>
              <button
                onClick={() => handleAddToCart(product)}
                className="add-to-cart-btn"
                aria-label={`Add ${product.name} to cart`}
              >
                Add to Cart
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProductsPage;