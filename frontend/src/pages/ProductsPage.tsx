import { useEffect, useState } from 'react';
import { useCart } from '../context/ContextCart';
import { useSearchParams } from 'react-router-dom';//change for filter
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


const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
const ProductsPage = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]); //changes for filter
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams(); //changes for filter
  const { addToCart } = useCart();

  const selectedCategory = searchParams.get('category') || '';//changes for filter

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await axios.get(`${backendUrl}/products`);

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

//start changes for filter
  useEffect(() => {
    if (selectedCategory) {
      setFilteredProducts(
        products.filter(product => product.category === selectedCategory)
      );
    } else {
      setFilteredProducts(products);
    }
  }, [selectedCategory, products]);

  const handleCategoryChange = (category: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (category) {
      newParams.set('category', category);
    } else {
      newParams.delete('category');
    }
    setSearchParams(newParams);
  };
//end changes for filter


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

  const categories = [...new Set(products.map(product => product.category))];//changes for filter

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

      {/* Category Filter */}
      <div className="category-filter">
        <label htmlFor="category-select">Filter by Category:</label>
        <select
          id="category-select"
          value={selectedCategory}
          onChange={(e) => handleCategoryChange(e.target.value)}
        >
          <option value="">All Categories</option>
          {categories.map(category => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>

      <div className="products-grid">
        {filteredProducts.length > 0 ? (
          filteredProducts.map((product) => (
            <div key={product.prodId} className="product-card">
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
                <p className="product-store">Sold by: {product.storeName}</p>
                <p className="product-description">{product.description}</p>
                <p className="product-category">Category: {product.category}</p>
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
          ))
        ) : (
          <div className="no-products">
            {selectedCategory 
              ? `No products found in ${selectedCategory} category`
              : 'No products available'}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductsPage;
