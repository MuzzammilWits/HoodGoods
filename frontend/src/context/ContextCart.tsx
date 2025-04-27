import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import axios from 'axios';

// Interfaces (same as you have)
interface CartItemUI {
  cartID?: number;
  productId: number;
  productName: string;
  productPrice: number;
  quantity: number;
  storeId?: number;   // Optional storeId
  storeName: string;
  imageUrl?: string;
  availableQuantity?: number;
}

interface AddToCartItem {
  productId: number;
  productName: string;
  productPrice: number;
  storeId?: number;   // Optional storeId
  storeName: string;
  imageUrl?: string;
}

interface CartContextType {
  cartItems: CartItemUI[];
  addToCart: (item: AddToCartItem) => Promise<void>;
  removeFromCart: (productId: number) => Promise<void>;
  updateQuantity: (productId: number, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  totalItems: number;
  totalPrice: number;
  isLoading: boolean;
  cartLoaded: boolean;
  fetchCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const { user, getAccessTokenSilently, isAuthenticated, isLoading: isAuthLoading } = useAuth0();
  const [cartItems, setCartItems] = useState<CartItemUI[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cartLoaded, setCartLoaded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const api = axios.create({
    baseURL: import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000',
  });

  const fetchCart = useCallback(async () => {
    if (!isAuthenticated || isAuthLoading || !user) {
      if (!isAuthLoading) {
        setIsLoading(false);
        setCartLoaded(true);
      }
      return;
    }

    setIsLoading(true);
    try {
      const token = await getAccessTokenSilently();
      const response = await api.get('/cart', {
        headers: { Authorization: `Bearer ${token}` }
      });

      // ***** Log raw response *****
      console.log('--- Frontend ContextCart.tsx ---');
      console.log('Raw response.data received from API:', JSON.stringify(response.data, null, 2));
      console.log('--- End Frontend Log ---');
      // ***** End Log *****


      // ***** START CHANGE HERE *****
      const fetchedItems: CartItemUI[] = response.data.map((item: any) => ({
        cartID: item.cartID,
        productId: item.productId,
        productName: item.productName,
        productPrice: item.productPrice,
        quantity: item.quantity,
        imageUrl: item.imageUrl,
        availableQuantity: item.availableQuantity,
        storeName: item.storeName, // <<< THIS LINE IS NOW ADDED
        // storeId: item.storeId, // Still leave this out until backend sends it
      }));
      // ***** END CHANGE HERE *****


      setCartItems(fetchedItems);
    } catch (error) {
      console.error('Failed to fetch cart:', error);
      setCartItems([]); // Safe fallback
    } finally {
      setIsLoading(false);
      setCartLoaded(true); // Always set this
    }
  }, [isAuthenticated, isAuthLoading, user, getAccessTokenSilently]);

  const syncCart = useCallback(async (currentCartItems: CartItemUI[]) => {
    if (!isAuthenticated || isAuthLoading || !user || isSyncing || isLoading) return;

    setIsSyncing(true);

    try {
      const token = await getAccessTokenSilently();
      const payload = {
        items: currentCartItems.map(item => ({
          productId: item.productId,
          quantity: Number(item.quantity)
        }))
      };
      await api.post('/cart/sync', payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      console.error('Failed to sync cart:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [isAuthenticated, isAuthLoading, user, getAccessTokenSilently, isSyncing, isLoading]); // Removed cartItems dependency from syncCart itself

  useEffect(() => {
    if (isAuthenticated && !isAuthLoading && user) {
      fetchCart();
    } else if (!isAuthenticated && !isAuthLoading) {
      setCartItems([]);
      setIsLoading(false);
      setCartLoaded(true);
    }
  }, [isAuthenticated, isAuthLoading, user, fetchCart]);

  useEffect(() => {
    // Only run sync if not loading, authenticated, cart loaded, and not already syncing
    if (isLoading || !isAuthenticated || isAuthLoading || !user || !cartLoaded || isSyncing) return;

    const timer = setTimeout(() => {
       syncCart(cartItems); // Pass current cartItems to sync
    }, 1000); // 1 second debounce

    return () => clearTimeout(timer);
    // Dependencies for the sync effect
  }, [cartItems, isLoading, isAuthenticated, isAuthLoading, user, cartLoaded, syncCart, isSyncing]);

  const addToCart = async (itemToAdd: AddToCartItem) => {
    if (!isAuthenticated) return;

    setCartItems(prev => {
      const existingItem = prev.find(i => i.productId === itemToAdd.productId);
      if (existingItem) {
        return prev.map(i =>
          i.productId === itemToAdd.productId
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      } else {
        // Ensure the item being added has storeName
        return [...prev, {
            ...itemToAdd, // Includes productId, productName, productPrice, storeName, etc.
            quantity: 1,
            cartID: undefined
        }];
      }
    });
  };

  const removeFromCart = async (productId: number) => {
    setCartItems(prev => prev.filter(item => item.productId !== productId));
  };

  const updateQuantity = async (productId: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
    } else {
      setCartItems(prev =>
        prev.map(item =>
          item.productId === productId ? { ...item, quantity } : item
        )
      );
    }
  };

  const clearCart = async () => {
    setCartItems([]);
    // Add backend clear logic here if needed
  };

  const totalItems = cartItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const totalPrice = cartItems.reduce((sum, item) => sum + (Number(item.productPrice || 0) * Number(item.quantity || 0)), 0);

  return (
    <CartContext.Provider value={{
      cartItems,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      totalItems,
      totalPrice,
      isLoading,
      cartLoaded,
      fetchCart
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
};
