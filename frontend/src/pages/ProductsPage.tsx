// frontend/src/pages/ProductsPage.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { useCart } from '../context/ContextCart';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import axios from 'axios';
import './ProductsPage.css';

// Helper function to normalize search terms for more effective searching
const normalizeSearchTerm = (term: string) => {
  if (!term) return '';
  return term
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

// Interface defining the structure of a Product object
interface Product {
  prodId: number;
  name: string;
  description: string;
  category: string;
  price: number;
  productquantity: number;
  userId: string; // ID of the seller
  imageUrl: string;
  storeId: string;
  storeName: string;
  isActive: boolean; // To ensure only active products are shown
}

// Interface for items being added to the cart
interface AddToCartItem {
  productId: number;
  productName: string;
  productPrice: number;
  imageUrl?: string;
  storeId: string;
  storeName: string;
}

// Backend URL, dynamically set from environment variables or defaults to localhost
const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true); // For overall page load
  const [error, setError] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const { addToCart } = useCart();
  const { user, isAuthenticated, getAccessTokenSilently, isLoading: isAuth0Loading } = useAuth0();
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error' | null}>({message: '', type: null});
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [isRoleFetching, setIsRoleFetching] = useState(true);

  // --- NEW STATE: Track which product is currently being added to cart ---
  const [addingProductId, setAddingProductId] = useState<number | null>(null);

  const selectedCategory = searchParams.get('category') || '';
  const selectedStore = searchParams.get('store') || '';
  const searchQuery = searchParams.get('search') || '';

  const [searchInput, setSearchInput] = useState(searchQuery);

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({message, type});
    setTimeout(() => {
      setNotification({message: '', type: null});
    }, 3000);
  };

  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);
      setError(null);
      try {
        await new Promise(resolve => setTimeout(resolve, 300)); 

        const response = await axios.get<{ products: Product[] } | Product[]>(`${backendUrl}/products`);
        let fetchedProducts: Product[] = [];

        if (Array.isArray(response.data)) {
            fetchedProducts = response.data;
        } else if (typeof response.data === 'object' && response.data !== null && Array.isArray(response.data.products)) {
            fetchedProducts = response.data.products;
        } else {
            console.error("Unexpected data format for products:", response.data);
            throw new Error('Invalid data format received from server for products');
        }

        const validatedProducts = fetchedProducts
          .map(p => ({
              ...p,
              storeId: String(p.storeId ?? 'unknown'),
              productquantity: Number(p.productquantity) || 0
          }))
          .filter(p => p.productquantity > 0 && p.isActive);
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
  }, []);

  useEffect(() => {
    const fetchRole = async () => {
      if (isAuthenticated && user && !isAuth0Loading) {
        setIsRoleFetching(true);
        try {
          const token = await getAccessTokenSilently();
          const response = await axios.get(`${backendUrl}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setCurrentUserRole(response.data.role);
        } catch (e) {
          console.error("Failed to fetch user role:", e);
          setCurrentUserRole(null);
        } finally {
          setIsRoleFetching(false);
        }
      } else if (!isAuth0Loading) {
        setCurrentUserRole(null);
        setIsRoleFetching(false);
      }
    };
    if (!isAuth0Loading) {
        fetchRole();
    }
  }, [isAuthenticated, user, getAccessTokenSilently, isAuth0Loading, backendUrl]);

  useEffect(() => {
    setSearchInput(searchQuery);
  }, [searchQuery]);

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
            product.name, product.description, product.storeName, product.category
          ].map(field => normalizeSearchTerm(field || ''));
          return searchFields.some(field => field.includes(normalizedQuery));
        });
      }
    }
    return result;
  }, [selectedCategory, selectedStore, searchQuery, products]);

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

  const handleAddToCart = async (product: Product) => {
    if (addingProductId === product.prodId) return; // Prevent multiple clicks while already adding

    if (isAuth0Loading || isRoleFetching) {
      showNotification("Please wait, verifying user permissions...", "error");
      return;
    }
    if (currentUserRole === 'admin') {
      alert("An admin cannot add products to cart.");
      return;
    }
    
    setAddingProductId(product.prodId); // Set loading state for this specific product

    try {
      if (!isAuthenticated) {
        showNotification('Please sign in or create an account to add items to your cart', 'error');
        setAddingProductId(null); // Reset loading state
        return;
      }
      if (!product || typeof product.prodId === 'undefined') {
        throw new Error('Product data is invalid or missing ID');
      }
      const price = Number(product.price);
      if (isNaN(price)) {
        throw new Error('Product price is invalid');
      }
      if (!product.storeId || product.storeId === 'unknown') {
        console.error("Product missing valid storeId:", product);
        throw new Error('Product is missing store information.');
      }
      if (product.productquantity <= 0) {
        showNotification(`${product.name} is currently out of stock.`, 'error');
        setAddingProductId(null); // Reset loading state
        return;
      }
      if (user?.sub === product.userId) {
        showNotification("You cannot add your own product to the cart.", 'error');
        setAddingProductId(null); // Reset loading state
        return;
      }

      const itemToAdd: AddToCartItem = {
        productId: product.prodId,
        productName: product.name,
        productPrice: price,
        storeId: product.storeId,
        storeName: product.storeName,
        imageUrl: product.imageUrl || undefined
      };
      
      // --- IMPORTANT: Wait for the addToCart operation to complete ---
      await addToCart(itemToAdd); 
      showNotification(`${product.name} added to cart!`, 'success');

    } catch (error) {
      console.error('Error adding to cart:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to add item to cart';
      showNotification(errorMsg, 'error');
    } finally {
      setAddingProductId(null); // Reset loading state for this product in all cases
    }
  };

  const categories = useMemo(() => [...new Set(products.map(product => product.category))], [products]);
  const stores = useMemo(() => [...new Set(products.map(product => product.storeName).filter(Boolean))], [products]);

  const isPageLoading = isLoading || isAuth0Loading || (isAuthenticated && isRoleFetching);

  if (isPageLoading) {
    return (
      <main className="products-container" aria-busy="true" aria-label="Loading products...">
        <section className="filters-container">
          <p className="skeleton-item skeleton-header" aria-hidden="true"></p>
          <section className="search-bar-in-filters">
              <form className="search-input-group" onSubmit={(e) => e.preventDefault()}>
                  <label htmlFor="skeleton-search" className="visually-hidden">Search products placeholder</label>
                  <input type="text" id="skeleton-search" className="skeleton-item skeleton-input" disabled aria-hidden="true" />
                  <button type="button" className="skeleton-item skeleton-search-btn" disabled aria-hidden="true"></button>
              </form>
          </section>
          <section className="filter-row-sidebyside">
              <section className="category-filter filters">
                <label htmlFor="skeleton-cat-filter" className="visually-hidden">Category filter placeholder</label>
                <select id="skeleton-cat-filter" className="skeleton-item skeleton-input" disabled aria-hidden="true"><option></option></select>
              </section>
              <section className="store-filter filters">
                <label htmlFor="skeleton-store-filter" className="visually-hidden">Store filter placeholder</label>
                <select id="skeleton-store-filter" className="skeleton-item skeleton-input" disabled aria-hidden="true"><option></option></select>
              </section>
          </section>
        </section>
        
        <section className="recommendations-link-below">
            <button className="skeleton-item skeleton-cta-button" disabled aria-hidden="true"></button>
        </section>

        <ul className="products-grid">
            {Array.from({ length: 6 }).map((_, index) => (
                <li key={index} className="product-card skeleton-card">
                    <article className="product-card-content">
                        <figure className="skeleton-item skeleton-image" aria-hidden="true"></figure>
                        <section className="skeleton-details">
                            <p className="skeleton-item skeleton-text" aria-hidden="true"></p>
                            <p className="skeleton-item skeleton-text short" aria-hidden="true"></p>
                            <button className="skeleton-item skeleton-button" disabled aria-hidden="true"></button>
                        </section>
                    </article>
                </li>
            ))}
        </ul>
      </main>
    );
  }

  if (error && !isPageLoading) {
    return (
      <main className="products-container">
        <section className="error-message" role="alert" aria-live="assertive">
          <h2>Error Loading Products</h2>
          <p>{error}</p>
          <button onClick={() => window.location.reload()} className="retry-button">
            Retry
          </button>
        </section>
      </main>
    );
  }

  return (
    <>
      <main className="products-container">
        {notification.type && (
          <aside className={`notification-modal ${notification.type}`} role={notification.type === 'error' ? 'alert' : 'status'}>
            {notification.message}
          </aside>
        )}

        <section className="filters-container" aria-labelledby="filters-heading">
          <h2 id="filters-heading" className="search-label">Search Products:</h2>
          <section className="search-bar-in-filters">
            <form className="search-input-group" onSubmit={(e) => { e.preventDefault(); handleSearchChange(searchInput);}}>
              <label htmlFor="product-search" className="visually-hidden">Search by name, description, store</label>
              <input
                id="product-search"
                type="search"
                placeholder="Search by name, description, store..."
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                aria-label="Search products"
              />
              <button
                className="search-products-btn"
                type="submit"
                aria-label="Search"
              >
                Search
              </button>
            </form>
          </section>

          <section className="filter-row-sidebyside">
            <section className="category-filter filters">
              <h3 className="filter-label" id="category-filter-label">Filter by Category:</h3>
              <label htmlFor="category-select" className="visually-hidden">Select Category</label>
              <select id="category-select" value={selectedCategory} onChange={(e) => handleCategoryChange(e.target.value)} aria-labelledby="category-filter-label">
                <option value="">All Categories</option>
                {categories.map(category => (<option key={category} value={category}>{category}</option>))}
              </select>
            </section>
            <section className="store-filter filters">
              <h3 className="filter-label" id="store-filter-label">Filter by Store:</h3>
              <label htmlFor="store-select" className="visually-hidden">Select Store</label>
              <select id="store-select" value={selectedStore} onChange={(e) => handleStoreChange(e.target.value)} aria-labelledby="store-filter-label">
                <option value="">All Stores</option>
                {stores.map(store => (<option key={store} value={store}>{store}</option>))}
              </select>
            </section>
          </section>
        </section>
        
        <section className="recommendations-link-below">
          <Link to="/recommendations" className="products-page-cta-button">
            Recommended for you
          </Link>
        </section>

        <ul className="products-grid">
          {filteredProducts.length > 0 ? (
            filteredProducts.map((product) => {
              const isOwner = isAuthenticated && product.userId === user?.sub;
              const isOutOfStock = product.productquantity <= 0;
              // --- MODIFIED: Check if this specific product is being added ---
              const isCurrentlyAdding = addingProductId === product.prodId;
              
              let isDisabled = isOutOfStock || isOwner || (isAuth0Loading || isRoleFetching) || isCurrentlyAdding; 
              if (!isDisabled && currentUserRole === 'admin') { isDisabled = true; }
              
              let buttonText = 'Add to Cart';
              if (isCurrentlyAdding) { buttonText = 'Adding...'; }
              else if (isAuth0Loading || isRoleFetching) { buttonText = 'Verifying...'; } 
              else if (currentUserRole === 'admin') { buttonText = 'Admin View'; } 
              else if (isOwner) { buttonText = 'Your Product'; } 
              else if (isOutOfStock) { buttonText = 'Out of Stock'; }

              return (
                <li key={product.prodId} className="product-card">
                  <article className="product-card-content">
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
                        aria-label={ 
                            isCurrentlyAdding ? `Adding ${product.name} to cart`
                            : currentUserRole === 'admin' ? `Admin cannot add ${product.name} to cart` 
                            : isOwner ? `Cannot add own product ${product.name}` 
                            : isOutOfStock ? `${product.name} is out of stock` 
                            : `Add ${product.name} to cart`
                        }
                        type="button" 
                        disabled={isDisabled} // Button is disabled if any of these conditions are true
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
    </>
  );
};
 
export default ProductsPage;