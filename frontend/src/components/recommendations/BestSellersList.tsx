// frontend/src/components/recommendations/BestSellersList.tsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getBestSellingProducts } from '../../services/recommendationsService';
import { PopularProductDto } from '../../types';
import { AddToCartItem, useCart } from '../../context/ContextCart';
import { useAuth0 } from '@auth0/auth0-react';
import './BestSellersList.css';

interface BestSellersListProps {
  limit?: number;
  timeWindowDays?: number;
  title?: string;
}

const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

const BestSellersList: React.FC<BestSellersListProps> = ({
  limit = 5,
  timeWindowDays = 30,
  title = 'Best Selling Products',
}) => {
  const [products, setProducts] = useState<PopularProductDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' | null }>({ message: '', type: null });

  const { addToCart, cartItems } = useCart();
  const { user, isAuthenticated, getAccessTokenSilently, isLoading: isAuth0Loading } = useAuth0();

  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [isRoleFetching, setIsRoleFetching] = useState(true);

  // Effect to fetch best-selling products
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
  }, [limit, timeWindowDays]);

  // Effect to fetch user role for authentication and authorization
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
          console.error("Failed to fetch user role in BestSellersList:", e);
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
  }, [isAuthenticated, user, getAccessTokenSilently, isAuth0Loading]);

  // Function to display temporary notifications
  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification({ message: '', type: null });
    }, 3000);
  };

  // Handler for adding a product to the cart
  const handleAddToCartFromRecommendation = async (product: PopularProductDto) => {
    // Prevent action if Auth0 or role is still loading
    if (isAuth0Loading || isRoleFetching) {
      showNotification("Please wait, verifying user permissions...", "error");
      return;
    }

    // Check if the user is an admin
    if (currentUserRole === 'admin') {
      alert("An admin cannot add products to cart.");
      return;
    }

    try {
      if (!isAuthenticated) {
        showNotification('Please sign in to add items to your cart.', 'error');
        return;
      }

      // Validate product data before adding to cart
      if (!product || typeof product.productId === 'undefined') {
        throw new Error('Product data is invalid or missing ID.');
      }
      if (typeof product.productPrice !== 'number' || isNaN(product.productPrice)) {
        throw new Error('Product price is invalid.');
      }
      if (!product.storeId || product.storeId === 'unknown') {
        console.error("Product missing valid storeId:", product);
        throw new Error('Product is missing store information.');
      }
      if (typeof product.productquantity !== 'number' || product.productquantity <= 0) {
        showNotification(`${product.name} is currently out of stock.`, 'error');
        return;
      }
      // Prevent users from adding their own products to the cart
      if (user?.sub === product.userId) {
        showNotification("You cannot add your own product to the cart.", 'error');
        return;
      }

      // Check existing quantity in cart to prevent exceeding stock
      const existingItemInCart = cartItems.find(item => item.productId === product.productId);
      const currentQuantityInCart = existingItemInCart ? existingItemInCart.quantity : 0;

      if (currentQuantityInCart + 1 > product.productquantity) {
        showNotification(`Cannot add more ${product.name}. Stock limit reached (${product.productquantity} available).`, 'error');
        return;
      }

      // Prepare item for adding to cart
      const itemToAdd: AddToCartItem = {
        productId: product.productId,
        productName: product.name,
        productPrice: product.productPrice,
        storeId: String(product.storeId),
        storeName: product.storeName || 'Unknown Store',
        imageUrl: product.imageUrl || undefined,
      };

      await addToCart(itemToAdd);
      showNotification(`${product.name} added to cart!`, 'success');

    } catch (error) {
      console.error('Error adding recommended product to cart:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to add item to cart.';
      showNotification(errorMsg, 'error');
    }
  };

  return (
    <section className="best-sellers-container">
      <h2>{title}</h2>
      {loading ? (
        <article className="skeleton-container-active" style={{ width: '100%', minHeight: 220 }}>
          {/* Skeleton UI for loading state */}
          <ul style={{ display: 'flex', gap: '20px', justifyContent: 'center', listStyle: 'none', padding: 0, margin: 0 }}>
            {[...Array(limit)].map((_, i) => (
              <li key={i} className="skeleton-item" style={{ width: 200, height: 320, borderRadius: 8, background: '#F5F2F8' }} />
            ))}
          </ul>
        </article>
      ) : error ? (
        <p className="best-sellers-error">Error: {error}</p>
      ) : products.length === 0 ? (
        <p className="best-sellers-empty">No best selling products found for the selected period.</p>
      ) : (
        <>
          {/* Notification display */}
          {notification.type && (
            <aside className={`recommendation-notification ${notification.type} notification-modal`} aria-live="polite">
              {notification.message}
            </aside>
          )}
          {/* List of best-selling products */}
          <ol className="best-sellers-grid">
            {products.map((product) => {
              const isOwner = isAuthenticated && product.userId === user?.sub;
              const isOutOfStock = typeof product.productquantity === 'number' && product.productquantity <= 0;
              
              const existingItemInCart = cartItems.find(item => item.productId === product.productId);
              const currentQuantityInCart = existingItemInCart ? existingItemInCart.quantity : 0;
              const canAddMore = typeof product.productquantity === 'number' && currentQuantityInCart < product.productquantity;

              // Determine if the add to cart button should be disabled
              let isDisabled = isOutOfStock || isOwner || !canAddMore || (isAuth0Loading || isRoleFetching);
              if (!isDisabled && currentUserRole === 'admin') {
                isDisabled = true;
              }

              // Determine the text for the add to cart button
              let buttonText = 'Add to Cart';
              if (isAuth0Loading || isRoleFetching) {
                  buttonText = 'Verifying...';
              } else if (currentUserRole === 'admin') {
                  buttonText = 'Admin View';
              } else if (isOwner) {
                  buttonText = 'Your Product';
              } else if (isOutOfStock) {
                  buttonText = 'Out of Stock';
              } else if (!canAddMore) {
                  buttonText = 'Max in Cart';
              }

              return (
                <li key={product.productId} className="best-seller-card" aria-labelledby={`product-name-${product.productId}`}>
                  <img
                    src={product.imageUrl || '/placeholder-image.png'}
                    alt={product.name}
                    className="best-seller-image"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      if (target.src.includes('placeholder-image.png') === false) {
                        target.src = '/placeholder-image.png';
                      }
                    }}
                  />
                  <article className="best-seller-info">
                    <h3 id={`product-name-${product.productId}`} className="best-seller-name">{product.name}</h3>
                    {product.storeName && (
                      <p className="best-seller-store">Sold by: {product.storeName}</p>
                    )}
                    <p className="best-seller-price">R{product.productPrice.toFixed(2)}</p>
                    <p className="best-seller-stock">
                      {isOutOfStock ? 'Out of Stock' : `Available: ${product.productquantity}`}
                    </p>
                  </article>
                  <button
                    onClick={() => handleAddToCartFromRecommendation(product)}
                    className="btn-add-to-cart-recommendation"
                    disabled={isDisabled}
                    aria-label={
                      isAuth0Loading || isRoleFetching ? 'Verifying user permissions'
                      : currentUserRole === 'admin' ? `Admin cannot add ${product.name} to cart`
                      : isOwner ? `Cannot add own product ${product.name}` 
                      : isOutOfStock ? `${product.name} is out of stock` 
                      : !canAddMore ? `Maximum quantity of ${product.name} already in cart`
                      : `Add ${product.name} to cart`
                    }
                  >
                    {buttonText}
                  </button>
                </li>
              );
            })}
          </ol>
        </>
      )}
    </section>
  );
};

export default BestSellersList;