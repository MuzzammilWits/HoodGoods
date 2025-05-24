// frontend/src/context/ContextCart.tsx
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import axios from 'axios';

// --- MOVE API CREATION OUTSIDE THE COMPONENT ---
const api = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000',
});

// --- INTERFACE DEFINITIONS ---
export interface CartItemUI {
  cartID?: number;
  productId: number;
  productName: string;
  productPrice: number;
  quantity: number;
  storeId: string;
  storeName: string;
  imageUrl?: string;
  availableQuantity?: number;
}

export interface AddToCartItem {
  productId: number;
  productName: string;
  productPrice: number;
  storeId: string;
  storeName: string;
  imageUrl?: string;
}
// --- END INTERFACE DEFINITIONS ---

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
  cartError?: string;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const { user, getAccessTokenSilently, isAuthenticated, isLoading: isAuth0Loading } = useAuth0();
  const [cartItems, setCartItems] = useState<CartItemUI[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cartLoaded, setCartLoaded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [cartError, setCartError] = useState<string | undefined>(undefined);

  const fetchedForUserRef = useRef<string | null | undefined>(undefined);

  // The 'api' object is now stable and doesn't need to be in dependency arrays,
  // but we remove it for correctness.
  const fetchCart = useCallback(async () => {
    const currentUserId = user?.sub;
    if (!isAuthenticated || isAuth0Loading || !currentUserId) {
      if (!isAuth0Loading) {
        setIsLoading(false);
        setCartLoaded(true);
        setCartItems([]);
        fetchedForUserRef.current = null;
      }
      return;
    }

    setIsLoading(true);
    setCartError(undefined);
    try {
      const token = await getAccessTokenSilently();
      const response = await api.get('/cart', {
        headers: { Authorization: `Bearer ${token}` }
      });

      const fetchedItemsData: CartItemUI[] = response.data.map((item: any) => ({
        cartID: item.cartID,
        productId: item.productId,
        productName: item.productName,
        productPrice: item.productPrice,
        quantity: item.quantity,
        imageUrl: item.imageUrl,
        availableQuantity: item.availableQuantity,
        storeName: item.storeName || 'Unknown Store',
        storeId: String(item.storeId ?? 'unknown'),
      }));
      setCartItems(fetchedItemsData);
      fetchedForUserRef.current = currentUserId;
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || "Failed to fetch cart items.";
      setCartError(message);
      setCartItems([]);
      fetchedForUserRef.current = currentUserId;
    } finally {
      setIsLoading(false);
      setCartLoaded(true);
    }
  }, [isAuthenticated, isAuth0Loading, user?.sub, getAccessTokenSilently]);


  // --- "Auth Effect": Handles initial cart fetch on authentication changes ---
  // The dependency 'fetchCart' is now stable, breaking the infinite loop.
  useEffect(() => {
    const currentUserId = user?.sub;
    if (isAuth0Loading) {
      if (!isLoading) setIsLoading(true);
      if (cartLoaded) setCartLoaded(false);
      return;
    }

    if (isAuthenticated && currentUserId) {
      if (fetchedForUserRef.current !== currentUserId || !cartLoaded) {
        fetchCart();
      } else {
        if (isLoading) {
          setIsLoading(false);
        }
      }
    } else {
      setCartItems([]);
      setIsLoading(false);
      setCartLoaded(false);
      fetchedForUserRef.current = null;
    }
  }, [isAuthenticated, isAuth0Loading, user?.sub, fetchCart]);


  // Other functions (syncCart, addToCart, etc.) remain largely the same,
  // but their dependency on 'api' is now stable.
  const syncCart = useCallback(async (currentCartItemsToSync: CartItemUI[]) => {
    const currentUserId = user?.sub;
    if (!isAuthenticated || !currentUserId || isSyncing) {
      return;
    }

    setIsSyncing(true);
    setCartError(undefined);
    try {
      const token = await getAccessTokenSilently();
      const payload = {
        items: currentCartItemsToSync.map(item => ({
          productId: item.productId,
          quantity: Number(item.quantity),
        }))
      };
      await api.post('/cart/sync', payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || "Failed to sync cart with server.";
      setCartError(message);
    } finally {
      setIsSyncing(false);
    }
  }, [isAuthenticated, user?.sub, getAccessTokenSilently, isSyncing]);

  useEffect(() => {
    const currentUserId = user?.sub;
    if (!cartLoaded || !isAuthenticated || !currentUserId || isAuth0Loading || isLoading || isSyncing) {
      return;
    }

    const timer = setTimeout(() => {
      if (cartLoaded && !isLoading && !isSyncing && isAuthenticated && currentUserId) {
        syncCart(cartItems);
      }
    }, 1500);

    return () => {
      clearTimeout(timer);
    }
  }, [cartItems, cartLoaded, isAuthenticated, isAuth0Loading, isLoading, isSyncing, syncCart, user?.sub]);

  const addToCart = async (itemToAdd: AddToCartItem) => {
    const currentUserId = user?.sub;
    if (!isAuthenticated || !currentUserId) {
      setCartError("Please log in to add items to your cart.");
      return Promise.reject(new Error("User not authenticated"));
    }

    setIsLoading(true);
    setCartError(undefined);

    try {
      const token = await getAccessTokenSilently();
      const payload = {
        productId: itemToAdd.productId,
        quantity: 1,
      };
      await api.post('/cart', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchCart();
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || "Failed to add item to cart.";
      setCartError(message);
      setIsLoading(false);
      return Promise.reject(new Error(message));
    }
  };

  const removeFromCart = async (productId: number) => {
    const currentUserId = user?.sub;
    if(!isAuthenticated || !currentUserId) return;

    setCartError(undefined);
    const previousCartItems = [...cartItems];

    setCartItems(prev => prev.filter(item => item.productId !== productId));

    try {
      const token = await getAccessTokenSilently();
      await api.delete(`/cart/${productId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (error: any) {
      setCartItems(previousCartItems);
      const message = error.response?.data?.message || error.message || "Failed to remove item.";
      setCartError(message);
    }
  };

  const updateQuantity = async (productId: number, quantity: number) => {
    const currentUserId = user?.sub;
    if(!isAuthenticated || !currentUserId) return;

    setCartError(undefined);
    if (quantity <= 0) {
      await removeFromCart(productId);
    } else {
      const previousCartItems = [...cartItems];
      setCartItems(prev =>
        prev.map(item =>
          item.productId === productId ? { ...item, quantity } : item
        )
      );
      try {
        const token = await getAccessTokenSilently();
        await api.patch(`/cart/${productId}`, { quantity }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (error: any) {
        setCartItems(previousCartItems);
        const message = error.response?.data?.message || error.message || "Failed to update quantity.";
        setCartError(message);
      }
    }
  };

  const clearCart = async () => {
    const currentUserId = user?.sub;
    if(!isAuthenticated || !currentUserId) return;

    setCartError(undefined);
    const previousCartItems = [...cartItems];
    setCartItems([]);

    try {
      const token = await getAccessTokenSilently();
      await api.delete('/cart', { headers: { Authorization: `Bearer ${token}` }});
    } catch (error: any) {
      setCartItems(previousCartItems);
      const message = error.response?.data?.message || error.message || "Failed to clear cart.";
      setCartError(message);
    }
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
      fetchCart,
      cartError
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};