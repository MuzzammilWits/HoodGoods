// frontend/src/pages/ProductsPage.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { useCart } from '../context/ContextCart';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import axios from 'axios';
import './ProductsPage.css';

const normalizeSearchTerm = (term: string) => {
  if (!term) return '';
  return term
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

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

interface AddToCartItem {
  productId: number;
  productName: string;
  productPrice: number;
  imageUrl?: string;
  storeId: string;
  storeName: string;
}

const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const { addToCart } = useCart();
  const { user, isAuthenticated, getAccessTokenSilently, isLoading: isAuth0Loading } = useAuth0();
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error' | null}>({message: '', type: null});
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [isRoleFetching, setIsRoleFetching] = useState(true);

  const selectedCategory = searchParams.get('category') || '';
  const selectedStore = searchParams.get('store') || '';
  const searchQuery = searchParams.get('search') || '';

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
    if (value) { newParams.set(filterType, value); } 
    else { newParams.delete(filterType); }
    setSearchParams(newParams, { replace: true });
  };

  const handleCategoryChange = (category: string) => handleFilterChange('category', category);
  const handleStoreChange = (store: string) => handleFilterChange('store', store);
  const handleSearchChange = (query: string) => handleFilterChange('search', query);

  const handleAddToCart = async (product: Product) => {
    if (isAuth0Loading || isRoleFetching) {
      showNotification("Please wait, verifying user permissions...", "error");
      return;
    }
    if (currentUserRole === 'admin') {
      alert("An admin cannot add products to cart.");
      return;
    }
    try {
      if (!isAuthenticated) {
        showNotification('Please sign in or create an account to add items to your cart', 'error');
        return;
      }
      if (!product || typeof product.prodId === 'undefined') { throw new Error('Product data is invalid or missing ID'); }
      const price = Number(product.price);
      if (isNaN(price)) { throw new Error('Product price is invalid'); }
      if (!product.storeId || product.storeId === 'unknown') { console.error("Product missing valid storeId:", product); throw new Error('Product is missing store information.'); }
      if (product.productquantity <= 0) { showNotification(`${product.name} is currently out of stock.`, 'error'); return; }
      if (user?.sub === product.userId) { showNotification("You cannot add your own product to the cart.", 'error'); return; }

      const itemToAdd: AddToCartItem = {
        productId: product.prodId, productName: product.name, productPrice: price,
        storeId: product.storeId, storeName: product.storeName, imageUrl: product.imageUrl || undefined
      };
      await addToCart(itemToAdd);
      showNotification(`${product.name} added to cart!`, 'success');
    } catch (error) {
      console.error('Error adding to cart:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to add item to cart';
      showNotification(errorMsg, 'error');
    }
  };

  const categories = useMemo(() => [...new Set(products.map(product => product.category))], [products]);
  const stores = useMemo(() => [...new Set(products.map(product => product.storeName).filter(Boolean))], [products]);

  if (isLoading || isAuth0Loading || (isAuthenticated && isRoleFetching)) {
    return (
      <section className="loading-container" aria-label="Loading products and user data"> {/* Changed div to section */}
        <figure className="spinner" role="img" aria-label="Loading animation"></figure> {/* Changed div to figure */}
        <p>Loading products and user data...</p>
      </section>
    );
  }

  if (error && !isLoading) {
    return (
      <section className="error-message" role="alert" aria-live="assertive">
        <h2>Error Loading Products</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()} className="retry-button">
          Retry
        </button>
      </section>
    );
  }

  return (
    <>
      <main className="products-container">
        {notification.type && (
          <aside className={`notification-modal ${notification.type}`} role={notification.type === 'error' ? 'alert' : 'status'}> {/* Changed div to aside */}
            {notification.message}
          </aside>
        )}

        <section className="filters-container" aria-labelledby="filters-heading">
          <h2 id="filters-heading" className="visually-hidden">Product Filters</h2> {/* Added for accessibility */}
          <section className="filter-row-search-recs"> {/* Changed div to section */}
            <section className="search-bar filters"> {/* Changed div to section */}
              <label htmlFor="product-search">Search Products:</label>
              <input
                id="product-search" type="search" placeholder="Search by name, description, store..."
                value={searchQuery} onChange={(e) => handleSearchChange(e.target.value)}
                aria-label="Search products"
              />
            </section>
            <section className="recommendations-link-container"> {/* Changed div to section */}
              <Link to="/recommendations" className="products-page-cta-button">
                Recommendations
              </Link>
            </section>
          </section>

          <section className="category-filter filters"> {/* Changed div to section */}
            <label htmlFor="category-select">Filter by Category:</label>
            <select id="category-select" value={selectedCategory} onChange={(e) => handleCategoryChange(e.target.value)}>
              <option value="">All Categories</option>
              {categories.map(category => (<option key={category} value={category}>{category}</option>))}
            </select>
          </section>
          
          <section className="store-filter filters"> {/* Changed div to section */}
            <label htmlFor="store-select">Filter by Store:</label>
            <select id="store-select" value={selectedStore} onChange={(e) => handleStoreChange(e.target.value)}>
              <option value="">All Stores</option>
              {stores.map(store => (<option key={store} value={store}>{store}</option>))}
            </select>
          </section>
        </section>

        <ul className="products-grid">
          {filteredProducts.length > 0 ? (
            filteredProducts.map((product) => {
              const isOwner = isAuthenticated && product.userId === user?.sub;
              const isOutOfStock = product.productquantity <= 0;
              let isDisabled = isOutOfStock || isOwner || (isAuth0Loading || isRoleFetching); 
              if (!isDisabled && currentUserRole === 'admin') { isDisabled = true; }
              let buttonText = 'Add to Cart';
              if (isAuth0Loading || isRoleFetching) { buttonText = 'Verifying...'; } 
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
                        aria-label={ currentUserRole === 'admin' ? `Admin cannot add ${product.name} to cart` : isOwner ? `Cannot add own product ${product.name}` : isOutOfStock ? `${product.name} is out of stock` : `Add ${product.name} to cart`}
                        type="button" disabled={isDisabled}
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

      <figure className="section-divider" role="presentation"> {/* Changed div to figure */}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path d="M0,100 L 0,40 L 15,75 L 30,25 L 50,85 L 70,20 L 85,70 L 100,40 L 100,100 Z" fill="#432C53"></path>
        </svg>
      </figure>
    </>
  );
};

export default ProductsPage;