import { useEffect, useState, useMemo } from 'react'; // Added useMemo
import { useCart } from '../context/ContextCart'; // Ensure path is correct
import { useSearchParams } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react'; // Import useAuth0
import axios from 'axios';
import './ProductsPage.css';

// NEW: Search normalizer function (from second snippet)
const normalizeSearchTerm = (term: string) => {
  if (!term) return ''; // Handle null/undefined input
  return term
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^\w\s]/g, '')  // Remove punctuation
    // Basic suffix stripping (adjust if needed for more complex cases)
    .replace(/\b(s|es|ies|ing|ed|er)\b/g, '')
    .replace(/\s+/g, ' ')  // Collapse multiple spaces
    .trim();
};

// Combined Product interface
interface Product {
  prodId: number;
  name: string;
  description: string;
  category: string;
  price: number;
  productquantity: number; // Stock level
  userId: string; // Owner ID
  imageUrl: string;
  storeId: number; // Store ID
  storeName: string; // Store Name
  isActive: boolean;
}

// Interface for item passed to addToCart context function
interface AddToCartItem {
  productId: number;
  productName: string;
  productPrice: number;
  imageUrl?: string;
  storeId: number;   // Include storeId
  storeName: string; // Include storeName
}


const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

const ProductsPage = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const { addToCart } = useCart();
  const { user, isAuthenticated } = useAuth0(); // Get user info and auth status

  // Get filter values from URL parameters
  const selectedCategory = searchParams.get('category') || '';
  const selectedStore = searchParams.get('store') || '';
  const searchQuery = searchParams.get('search') || '';

  // Fetch products once on mount
  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);
      setError(null); // Clear previous errors
      try {
        // Expect backend to return array or object with products array
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

        // Basic validation
        if (fetchedProducts.some(p => typeof p.prodId === 'undefined' || typeof p.name === 'undefined')) {
            console.warn("Some fetched products might be missing required fields.");
        }
        console.log("Fetched Products (check for userId, storeName, productquantity):", fetchedProducts);

        setProducts(fetchedProducts);
      } catch (err) {
        const errorMessage = axios.isAxiosError(err)
          ? err.response?.data?.message || err.message
          : err instanceof Error
          ? err.message
          : 'Failed to load products';
        console.error("Fetch products error:", errorMessage, err);
        setError(errorMessage);
        setProducts([]); // Clear products on error
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, []); // Empty dependency array means fetch runs once on mount

  // Combined filtering logic (Category + Store + Search)
  useEffect(() => {
    let result = [...products]; // Start with all fetched products

    // Apply category filter
    if (selectedCategory) {
      result = result.filter(product => product.category === selectedCategory);
    }

    // Apply store filter
    if (selectedStore) {
      result = result.filter(product => product.storeName === selectedStore);
    }

    // Apply search filter
    if (searchQuery) {
      const normalizedQuery = normalizeSearchTerm(searchQuery);
      if (normalizedQuery) { // Only filter if normalized query is not empty
          result = result.filter(product => {
            // Normalize fields to search within
            const searchFields = [
              product.name,
              product.description,
              product.storeName,
              product.category
            ].map(field => normalizeSearchTerm(field || '')); // Handle potential null/undefined fields

            // Check if any normalized field includes the normalized query
            return searchFields.some(field => field.includes(normalizedQuery));
            // Alternative: Check if query includes field (less common for search bars)
            // return searchFields.some(field => field.includes(normalizedQuery) || normalizedQuery.includes(field));
          });
      }
    }

    setFilteredProducts(result);
  }, [selectedCategory, selectedStore, searchQuery, products]); // Re-run filter when any dependency changes

  // --- Event Handlers for Filters ---
  const handleFilterChange = (filterType: 'category' | 'store' | 'search', value: string) => {
      const newParams = new URLSearchParams(searchParams);
      if (value) {
          newParams.set(filterType, value);
      } else {
          newParams.delete(filterType);
      }
      // Optional: Reset other filters when one changes?
      // if (filterType === 'category') newParams.delete('store');
      setSearchParams(newParams, { replace: true }); // Use replace to avoid cluttering history
  };

  // Specific handlers calling the generic one
  const handleCategoryChange = (category: string) => handleFilterChange('category', category);
  const handleStoreChange = (store: string) => handleFilterChange('store', store);
  const handleSearchChange = (query: string) => handleFilterChange('search', query);
  // --- End Event Handlers ---


  const handleAddToCart = async (product: Product) => {
    try {
      if (!product || typeof product.prodId === 'undefined') {
        console.error('Attempted to add invalid product to cart:', product);
        throw new Error('Product data is invalid or missing ID');
      }

      const price = Number(product.price);
      if (isNaN(price)) {
        console.error('Product price is not a valid number:', product.price);
        throw new Error('Product price is invalid');
      }

      // Check stock (from first snippet)
      if (product.productquantity <= 0) {
          alert(`${product.name} is currently out of stock.`); // Use a better notification system than alert
          return;
      }

      // Check ownership (from first snippet)
      if (isAuthenticated && user?.sub === product.userId) {
          alert("You cannot add your own product to the cart.");
          return;
      }

      // Prepare item with necessary details (including store info)
      const itemToAdd: AddToCartItem = {
        productId: product.prodId,
        productName: product.name,
        productPrice: price,
        storeId: product.storeId, // Pass storeId
        storeName: product.storeName, // Pass storeName
        imageUrl: product.imageUrl || undefined
      };

      await addToCart(itemToAdd);
      alert(`${product.name} added to cart!`); // Consider a less intrusive notification

    } catch (error) {
      console.error('Error adding to cart:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to add item to cart';
      setError(errorMsg);
      // Optional: Auto-clear error after a delay
      setTimeout(() => setError(null), 5000);
    }
  };


  // Memoize category and store lists
  const categories = useMemo(() => [...new Set(products.map(product => product.category))], [products]);
  const stores = useMemo(() => [...new Set(products.map(product => product.storeName))], [products]);

  // --- Render Logic ---

  if (isLoading) {
    return <p className="loading-spinner">Loading products...</p>;
  }

  if (error && !isLoading) { // Show error only when not loading
    return (
      <section className="error-message" role="alert" aria-live="assertive">
        <h2>Error Loading Products</h2>
        <p>{error}</p>
        <button
          onClick={() => window.location.reload()} // Simple reload for retry
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

      {/* --- Filters Section --- */}
      <section className="filters-container"> {/* Optional wrapper for filters */}
          {/* Search Bar */}
          <div className="search-bar filters"> {/* Use div or fieldset */}
            <label htmlFor="product-search">Search Products:</label>
            <input
              id="product-search"
              type="search" // Use type="search" for semantics
              placeholder="Search by name, description, store..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              aria-label="Search products" // Add aria-label
            />
          </div>

          {/* Category Filter */}
          <div className="category-filter filters"> {/* Use div or fieldset */}
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
          <div className="store-filter filters"> {/* Use div or fieldset */}
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
      {/* --- End Filters Section --- */}


      {/* Products Grid */}
      <ul className="products-grid">
        {filteredProducts.length > 0 ? (
          filteredProducts.map((product) => {
            // Determine button state (from first snippet)
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
                    {/* Quantity Display (from first snippet) */}
                    <p className="product-quantity">
                      {isOutOfStock ? 'Out of Stock' : `Available: ${product.productquantity}`}
                    </p>
                    {/* Add to Cart Button (from first snippet, using dynamic state) */}
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
          // Updated No products message (from second snippet)
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
