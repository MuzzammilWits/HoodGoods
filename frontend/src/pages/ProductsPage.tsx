import { useEffect, useState } from 'react';
import { useCart } from '../context/ContextCart';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import './ProductsPage.css';

// NEW: Search normalizer function
const normalizeSearchTerm = (term: string) => {
  return term
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^\w\s]/g, '')  // Remove punctuation
    .replace(/\b(s|es|ies|ing|ed|er)\b/g, '')  // Better suffix stripping
    .replace(/\s+/g, ' ')  // Collapse multiple spaces
    .trim();
};

interface Product {
  prodId: number;
  name: string;
  description: string;
  category: string;
  price: number;
  userId: string;
  imageUrl: string;
  storeName: string;
  isActive: boolean;
}

const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

const ProductsPage = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const { addToCart } = useCart();

  // NEW: Added store and search URL params
  const selectedCategory = searchParams.get('category') || '';
  const selectedStore = searchParams.get('store') || '';
  const searchQuery = searchParams.get('search') || '';

  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);
      try {
        const response = await axios.get(`${backendUrl}/products`);
        
        if (!Array.isArray(response.data)) {
          if (typeof response.data === 'object' && response.data !== null && Array.isArray(response.data.products)) {
            setProducts(response.data.products);
          } else {
            console.error("Unexpected data format:", response.data);
            throw new Error('Invalid data format received from server');
          }
        } else {
          setProducts(response.data);
        }
        setError(null);
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
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // NEW: Updated filtering logic for category + store + search
  useEffect(() => {
    let result = [...products];
    
    // Category filter (unchanged)
    if (selectedCategory) {
      result = result.filter(product => product.category === selectedCategory);
    }
    
    // Store filter (unchanged)
    if (selectedStore) {
      result = result.filter(product => product.storeName === selectedStore);
    }
    
    // NEW improved search
    if (searchQuery) {
      const normalizedQuery = normalizeSearchTerm(searchQuery);
      result = result.filter(product => {
        const searchFields = [
          product.name,
          product.description,
          product.storeName,
          product.category
        ].map(field => normalizeSearchTerm(field));
  
        return searchFields.some(field => 
          field.includes(normalizedQuery) || 
          normalizedQuery.includes(field)
        );
      });
    }
  
    setFilteredProducts(result);
  }, [selectedCategory, selectedStore, searchQuery, products]);

  const handleCategoryChange = (category: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (category) {
      newParams.set('category', category);
    } else {
      newParams.delete('category');
    }
    // newParams.delete('store'); // NEW: Reset store when changing category
    setSearchParams(newParams, { replace: true });
  };

  // NEW: Store filter handler
  const handleStoreChange = (store: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (store) {
      newParams.set('store', store);
    } else {
      newParams.delete('store');
    }
    setSearchParams(newParams, { replace: true });
  };

  // NEW: Search handler
  const handleSearchChange = (query: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (query) {
      newParams.set('search', query);
    } else {
      newParams.delete('search');
    }
    setSearchParams(newParams, { replace: true });
  };


// Inside ProductsPage component...

  const handleAddToCart = async (product: Product) => {
    try {
      if (!product || typeof product.prodId === 'undefined') { // Added check for product existence
        console.error('Attempted to add invalid product to cart:', product);
        throw new Error('Product data is invalid or missing ID');
      }

      // Ensure price is a number before adding
      const price = Number(product.price);
      if (isNaN(price)) {
         console.error('Product price is not a valid number:', product.price);
         throw new Error('Product price is invalid');
      }

    // Prepare the item object for the context's addToCart function
    const itemToAdd = {
      productId: product.prodId,
      productName: product.name, // Updated to match AddToCartItem type
      productPrice: price,       // Updated to match AddToCartItem type
      image: product.imageUrl || '/placeholder-product.jpg'
    };

    // Call the context function (which expects productId: number)
    await addToCart(itemToAdd);

    alert(`${product.name} added to cart!`);

  } catch (error) {
     console.error('Error adding to cart:', error);
     // Display error to user (consider using the context's error state)
     setError(error instanceof Error ? error.message : 'Failed to add item to cart');
  }
};

// ... rest of the component
      const cartItem = {
        productId: String(product.prodId),
        name: product.name,
        price: price,
        image: product.imageUrl || '/placeholder-product.jpg'
      };

      await addToCart(cartItem);
      alert(`${product.name} added to cart!`);
    } catch (error) {
      console.error('Error adding to cart:', error);
      setError(error instanceof Error ? error.message : 'Failed to add item to cart');
    }
  };

// ... rest of the component

  const categories = [...new Set(products.map(product => product.category))];
  const stores = [...new Set(products.map(product => product.storeName))]; // NEW: Store list

  if (isLoading) {
    return <p className="loading-spinner">Loading products...</p>;
  }

  if (error) {
    return (
      <section className="error-message" role="alert" aria-live="polite">
        <p>{error}</p>
        <button
          onClick={() => {
            setError(null);
            setProducts([]);
            window.location.reload();
          }}
          className="retry-button"
        >
          Retry
        </button>
      </section>
    );
  }

  return (
    <main className="products-container">
      <h1>Artisan Products</h1>

      {/* NEW: Search bar section */}
      <section className="search-bar filters">
        <label htmlFor="product-search">Search Products:</label>
        <input
          id="product-search"
          type="text"
          placeholder="Search by name, description, or store..."
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
      </section>

      <section className="category-filter filters">
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
      </section>

      {/* NEW: Store filter section */}
      <section className="store-filter filters">
        <label htmlFor="store-select">Filter by Store:</label>
        <select
          id="store-select"
          value={selectedStore}
          onChange={(e) => handleStoreChange(e.target.value)}
        >
          <option value="">All Stores</option>
          {stores.map(store => (
            <option key={store} value={store}>
              {store}
            </option>
          ))}
        </select>
      </section>

      <ul className="products-grid">
        {filteredProducts.length > 0 ? (
          filteredProducts.map((product) => (
            <li key={product.prodId} className="product-card">
              <article>
                <figure className="product-image-container">
                  <img
                    src={product.imageUrl || '/placeholder-product.jpg'}
                    alt={product.name || 'Product image'}
                    className="product-image"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      if (target.src !== '/placeholder-product.jpg') {
                        target.src = '/placeholder-product.jpg';
                        target.alt = 'Placeholder image';
                        target.classList.add('placeholder');
                      }
                    }}
                    loading="lazy"
                  />
                </figure>
                <section className="product-details">
                  <h2 className="product-name">{product.name}</h2>
                  <p className="product-store">Sold by: {product.storeName || 'Unknown Store'}</p>
                  <p className="product-description">{product.description}</p>
                  <p className="product-category">Category: {product.category}</p>
                  <p className="product-price">R{(Number(product.price) || 0).toFixed(2)}</p>
                  <button
                    onClick={() => handleAddToCart(product)}
                    className="add-to-cart-btn"
                    aria-label={`Add ${product.name} to cart`}
                    type="button"
                  >
                    Add to Cart
                  </button>
                </section>
              </article>
            </li>
          ))
        ) : (
          <li className="no-products">
            <p>
              {selectedCategory || selectedStore || searchQuery
                ? 'No products found matching your criteria.'
                : 'No products available at the moment.'}
            </p>
          </li>
        )}
      </ul>
    </main>
  );
};

export default ProductsPage;