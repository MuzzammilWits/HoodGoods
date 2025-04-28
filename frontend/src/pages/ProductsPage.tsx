import { useEffect, useState, useMemo } from 'react'; // Added React import
import { useCart } from '../context/ContextCart'; // Ensure path is correct
import { useSearchParams } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react'; // Import useAuth0
import axios from 'axios';
import './ProductsPage.css';

// Search normalizer function
const normalizeSearchTerm = (term: string) => {
  if (!term) return ''; // Handle null/undefined input
  return term
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^\w\s]/g, '')  // Remove punctuation
    .replace(/\b(s|es|ies|ing|ed|er)\b/g, '') // Basic suffix stripping
    .replace(/\s+/g, ' ')  // Collapse multiple spaces
    .trim();
};

// --- INTERFACE CHANGES ---
// Product interface matching backend entity (storeId as string)
interface Product {
  prodId: number;
  name: string;
  description: string;
  category: string;
  price: number;
  productquantity: number;
  userId: string;
  imageUrl: string;
  storeId: string; // <<< CHANGED to string
  storeName: string;
  isActive: boolean;
}

// Interface for item passed to addToCart context function (storeId as string)
interface AddToCartItem {
  productId: number;
  productName: string;
  productPrice: number;
  imageUrl?: string;
  storeId: string;   // <<< CHANGED to string
  storeName: string;
}
// --- END INTERFACE CHANGES ---


const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

const ProductsPage = () => {
  const [products, setProducts] = useState<Product[]>([]);
  // filteredProducts state is not strictly needed if filtering is done in render or memoized
  // const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const { addToCart } = useCart();
  const { user, isAuthenticated } = useAuth0();

  const selectedCategory = searchParams.get('category') || '';
  const selectedStore = searchParams.get('store') || '';
  const searchQuery = searchParams.get('search') || '';

  // Fetch products once on mount
  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await axios.get<{ products: Product[] } | Product[]>(`${backendUrl}/products`);

        let fetchedProducts: Product[] = [];
        if (Array.isArray(response.data)) {
            fetchedProducts = response.data;
        } else if (typeof response.data === 'object' && response.data !== null && Array.isArray(response.data.products)) {
            fetchedProducts = response.data.products;
        } else {
            console.error("Unexpected data format:", response.data);
            throw new Error('Invalid data format received from server');
        }

        // Validate fetched products (optional but good practice)
        // Ensure storeId is treated as a string if necessary after fetching
        const validatedProducts = fetchedProducts.map(p => ({
            ...p,
            storeId: String(p.storeId ?? 'unknown') // Ensure storeId is a string
        }));

        console.log("Validated Fetched Products:", validatedProducts);
        setProducts(validatedProducts);

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
  }, []); // Empty dependency array ensures fetch runs only once

  // Memoize the filtering logic
  const filteredProducts = useMemo(() => {
      let result = [...products];

      if (selectedCategory) {
        result = result.filter(product => product.category === selectedCategory);
      }
      if (selectedStore) {
        result = result.filter(product => product.storeName === selectedStore);
      }
      if (searchQuery) {
        const normalizedQuery = normalizeSearchTerm(searchQuery);
        if (normalizedQuery) {
          result = result.filter(product => {
            const searchFields = [
              product.name,
              product.description,
              product.storeName,
              product.category
            ].map(field => normalizeSearchTerm(field || ''));
            return searchFields.some(field => field.includes(normalizedQuery));
          });
        }
      }
      return result;
  }, [selectedCategory, selectedStore, searchQuery, products]);


  // --- Event Handlers for Filters ---
  const handleFilterChange = (filterType: 'category' | 'store' | 'search', value: string) => {
      const newParams = new URLSearchParams(searchParams);
      if (value) {
          newParams.set(filterType, value);
      } else {
          newParams.delete(filterType);
      }
      setSearchParams(newParams, { replace: true });
  };

  const handleCategoryChange = (category: string) => handleFilterChange('category', category);
  const handleStoreChange = (store: string) => handleFilterChange('store', store);
  const handleSearchChange = (query: string) => handleFilterChange('search', query);
  // --- End Event Handlers ---


  const handleAddToCart = async (product: Product) => {
    try {
      // Validate product basic info
      if (!product || typeof product.prodId === 'undefined') {
        throw new Error('Product data is invalid or missing ID');
      }
      // Validate price
      const price = Number(product.price);
      if (isNaN(price)) {
        throw new Error('Product price is invalid');
      }
      // Validate storeId (should be a non-empty string now)
      if (!product.storeId || product.storeId === 'unknown') {
         console.error("Product missing valid storeId:", product);
         throw new Error('Product is missing store information.');
      }


      // Check stock
      if (product.productquantity <= 0) {
          alert(`${product.name} is currently out of stock.`); // Use better notification
          return;
      }
      // Check ownership
      if (isAuthenticated && user?.sub === product.userId) {
          alert("You cannot add your own product to the cart."); // Use better notification
          return;
      }

      // Prepare item with required string storeId
      const itemToAdd: AddToCartItem = {
        productId: product.prodId,
        productName: product.name,
        productPrice: price,
        storeId: product.storeId, // Pass string storeId
        storeName: product.storeName,
        imageUrl: product.imageUrl || undefined
      };

      await addToCart(itemToAdd);
      alert(`${product.name} added to cart!`); // Use better notification

    } catch (error) {
      console.error('Error adding to cart:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to add item to cart';
      setError(errorMsg);
      setTimeout(() => setError(null), 5000); // Auto-clear error
    }
  };


  // Memoize category and store lists
  const categories = useMemo(() => [...new Set(products.map(product => product.category))], [products]);
  const stores = useMemo(() => [...new Set(products.map(product => product.storeName))], [products]);

  // --- Render Logic ---

  if (isLoading) {
    return <p className="loading-spinner">Loading products...</p>;
  }

  if (error && !isLoading) {
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
    <main className="products-container">
      <h1>Artisan Products</h1>

      {/* Filters Section */}
      <section className="filters-container" aria-labelledby="filters-heading">
         <h2 id="filters-heading" className="sr-only">Product Filters</h2> {/* Screen-reader only heading */}
          {/* Search Bar */}
          <div className="search-bar filters">
            <label htmlFor="product-search">Search Products:</label>
            <input
              id="product-search"
              type="search"
              placeholder="Search by name, description, store..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              aria-label="Search products"
            />
          </div>

          {/* Category Filter */}
          <div className="category-filter filters">
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

          {/* Store Filter */}
          <div className="store-filter filters">
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
          </div>
      </section>


      {/* Products Grid */}
      <ul className="products-grid">
        {filteredProducts.length > 0 ? (
          filteredProducts.map((product) => {
            const isOwner = isAuthenticated && product.userId === user?.sub;
            const isOutOfStock = product.productquantity <= 0;
            const isDisabled = isOutOfStock || isOwner;
            const buttonText = isOwner ? 'Your Product' : (isOutOfStock ? 'Out of Stock' : 'Add to Cart');

            return (
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
                    <p className="product-quantity">
                      {isOutOfStock ? 'Out of Stock' : `Available: ${product.productquantity}`}
                    </p>
                    <button
                      onClick={() => handleAddToCart(product)}
                      className="add-to-cart-btn"
                      aria-label={isOwner ? `Cannot add own product ${product.name}` : (isOutOfStock ? `${product.name} is out of stock` : `Add ${product.name} to cart`)}
                      type="button"
                      disabled={isDisabled}
                    >
                      {buttonText}
                    </button>
                  </section>
                </article>
              </li>
            );
          })
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
