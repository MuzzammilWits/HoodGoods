import { useEffect, useState } from 'react';
import { useCart } from '../context/ContextCart';
import axios from 'axios';
import './ProductsPage.css';

interface Product {
  prodId: number;
  name: string;
  description: string;
  category: string;
  price: number;
  userId: string;
  imageUrl: string;
  storeName : string;
  isActive : boolean;
}
// "prodId": "10",
//   "name": "Corn",
//   "description": "WTF",
//   "category": "Clothing",
//   "price": 1000,
//   "userId": "auth0|6802e4ee8773a9cc0ae23d94",
//   "imageUrl": "https://euudlgzarnvbsvzlizcu.supabase.co/storage/v1/object/public/images/uploads/1745066194700-interior.jpg",
//   "storeName": "Testing Editing WIth Images",
//   "isActive": true

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

  const handleAddToCart = async (product: Product) => {
    try {
      if (!product.prodId) {
        throw new Error('Product ID is missing');
      }
  
      const cartItem = {
        productId: product.prodId.toString(),
        name: product.name,
        price: product.price,
        image: product.imageUrl
      };
      
      await addToCart(cartItem);
      alert(`${product.name} added to cart!`);
    } catch (error) {
      console.error('Error adding to cart:', error);
      setError(error instanceof Error ? error.message : 'Failed to add item to cart');
    }
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
          <div key={product.prodId || `${product.name}-${product.price}`} className="product-card">
            <div className="product-image-container">
              <img
                src={product.imageUrl}
                alt={product.name}
                className="product-image"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/placeholder-product.jpg';
                  target.classList.add('placeholder');
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
