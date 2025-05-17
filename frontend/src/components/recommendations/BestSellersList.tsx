// frontend/src/components/recommendations/BestSellersList.tsx
import React, { useState, useEffect } from 'react';
import { getBestSellingProducts } from '../../services/recommendationsService';
import { PopularProductDto } from '../../types';
import { AddToCartItem, useCart } from '../../context/ContextCart';
import { useAuth0 } from '@auth0/auth0-react';
import './BestSellersList.css'; // Will update this CSS

interface BestSellersListProps {
  limit?: number;
  timeWindowDays?: number;
  title?: string;
}

const BestSellersList: React.FC<BestSellersListProps> = ({
  limit = 5,
  timeWindowDays = 30,
  title = 'Best Selling Products',
}) => {
  const [products, setProducts] = useState<PopularProductDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' | null }>({ message: '', type: null });

  const { addToCart, cartItems } = useCart(); // Get addToCart function and cartItems from context
  const { user, isAuthenticated } = useAuth0();

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

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification({ message: '', type: null });
    }, 3000);
  };

  const handleAddToCartFromRecommendation = async (product: PopularProductDto) => {
    try {
      if (!isAuthenticated) {
        showNotification('Please sign in to add items to your cart.', 'error');
        return;
      }

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
      if (user?.sub === product.userId) {
        showNotification("You cannot add your own product to the cart.", 'error');
        return;
      }

      // --- STOCK LIMIT CHECK ---
      const existingItemInCart = cartItems.find(item => item.productId === product.productId);
      const currentQuantityInCart = existingItemInCart ? existingItemInCart.quantity : 0;

      if (currentQuantityInCart + 1 > product.productquantity) {
        showNotification(`Cannot add more ${product.name}. Stock limit reached (${product.productquantity} available).`, 'error');
        return;
      }
      // --- END STOCK LIMIT CHECK ---

      const itemToAdd: AddToCartItem = {
        productId: product.productId,
        productName: product.name,
        productPrice: product.productPrice,
        storeId: String(product.storeId),
        storeName: product.storeName || 'Unknown Store',
        imageUrl: product.imageUrl || undefined,
        // Pass availableQuantity so CartContext can potentially use it if enhanced
        // availableQuantity: product.productquantity 
      };

      await addToCart(itemToAdd); // Note: addToCart in ContextCart currently doesn't use availableQuantity for its internal logic
      showNotification(`${product.name} added to cart!`, 'success');

    } catch (error) {
      console.error('Error adding recommended product to cart:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to add item to cart.';
      showNotification(errorMsg, 'error');
    }
  };

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
      {notification.type && (
        <div className={`recommendation-notification ${notification.type}`}>
          {notification.message}
        </div>
      )}
      <div className="best-sellers-grid">
        {products.map((product) => {
          const isOwner = isAuthenticated && product.userId === user?.sub;
          // Backend already filters for productquantity > 0, but this is a good client-side fallback
          const isOutOfStock = product.productquantity <= 0; 
          
          const existingItemInCart = cartItems.find(item => item.productId === product.productId);
          const currentQuantityInCart = existingItemInCart ? existingItemInCart.quantity : 0;
          const canAddMore = currentQuantityInCart < product.productquantity;

          const isDisabled = isOutOfStock || isOwner || !canAddMore;
          let buttonText = 'Add to Cart';
          if (isOwner) buttonText = 'Your Product';
          else if (isOutOfStock) buttonText = 'Out of Stock';
          else if (!canAddMore) buttonText = 'Max in Cart';


          return (
            <div key={product.productId} className="best-seller-card">
              <img
                src={product.imageUrl || '/placeholder-image.png'}
                alt={product.name}
                className="best-seller-image"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  if (target.src !== '/placeholder-image.png') {
                    target.src = '/placeholder-image.png';
                  }
                }}
              />
              <div className="best-seller-info">
                <h3 className="best-seller-name">{product.name}</h3>
                {product.storeName && (
                  <p className="best-seller-store">Sold by: {product.storeName}</p>
                )}
                <p className="best-seller-price">R{product.productPrice.toFixed(2)}</p>
                {/* --- DISPLAY AVAILABLE QUANTITY --- */}
                <p className="best-seller-stock">
                  {isOutOfStock ? 'Out of Stock' : `Available: ${product.productquantity}`}
                </p>
              </div>
              <button
                onClick={() => handleAddToCartFromRecommendation(product)}
                className="btn-add-to-cart-recommendation"
                disabled={isDisabled}
                aria-label={
                  isOwner ? `Cannot add own product ${product.name}` 
                  : isOutOfStock ? `${product.name} is out of stock` 
                  : !canAddMore ? `Maximum quantity of ${product.name} already in cart`
                  : `Add ${product.name} to cart`
                }
              >
                {buttonText}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BestSellersList;
