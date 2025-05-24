import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import axios from 'axios';

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


  const api = axios.create({
    baseURL: import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000',
  });

  const fetchCart = useCallback(async () => {
    const currentUserId = user?.sub; 
    console.log(`[CartContext] fetchCart: Called. User: ${currentUserId}, Auth: ${isAuthenticated}, AuthLoading: ${isAuth0Loading}`);
    
    if (!isAuthenticated || isAuth0Loading || !currentUserId) {
      if (!isAuth0Loading) { 
        console.log('[CartContext] fetchCart: Conditions not met (not auth, or no user, or auth still loading). Setting isLoading=false, cartLoaded=true, clearing items.');
        setIsLoading(false);
        setCartLoaded(true); 
        setCartItems([]); 
        fetchedForUserRef.current = null; 
      } else {
         console.log('[CartContext] fetchCart: Bailing: Auth0 is still loading.');
      }
      return;
    }

    console.log(`[CartContext] fetchCart: Setting isLoading=TRUE for user: ${currentUserId}`);
    setIsLoading(true); 
    setCartError(undefined); 
    try {
      const token = await getAccessTokenSilently();
      console.log(`[CartContext] fetchCart: Token acquired. Fetching from /cart for user: ${currentUserId}`);
      const response = await api.get('/cart', { 
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log(`[CartContext] fetchCart: Response for user ${currentUserId}:`, response.data);
      
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
      console.log(`[CartContext] fetchCart: Cart items set for user: ${currentUserId}. fetchedForUserRef: ${fetchedForUserRef.current}`);
    } catch (error: any) {
      console.error(`[CartContext] fetchCart: Failed for user: ${currentUserId}`, error);
      const message = error.response?.data?.message || error.message || "Failed to fetch cart items.";
      setCartError(message); 
      setCartItems([]); 
      fetchedForUserRef.current = currentUserId; 
    } finally {
      console.log(`[CartContext] fetchCart: Setting isLoading=FALSE, cartLoaded=TRUE for user: ${currentUserId}`);
      setIsLoading(false); 
      setCartLoaded(true); 
    }
  }, [isAuthenticated, isAuth0Loading, user?.sub, getAccessTokenSilently, api]);


   const syncCart = useCallback(async (currentCartItemsToSync: CartItemUI[]) => {
    const currentUserId = user?.sub;
    console.log(`[CartContext] syncCart: Called. User: ${currentUserId}, isSyncing: ${isSyncing}, Items: ${currentCartItemsToSync.length}`);
    if (!isAuthenticated || !currentUserId || isSyncing) {
        console.log(`[CartContext] syncCart: Bailing. Auth: ${isAuthenticated}, User: ${currentUserId}, Syncing: ${isSyncing}`);
        return;
    }

    console.log(`[CartContext] syncCart: Setting isSyncing=TRUE for user: ${currentUserId}`);
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
      console.log(`[CartContext] syncCart: Syncing payload to /cart/sync for user: ${currentUserId}`, payload);
      await api.post('/cart/sync', payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      console.log(`[CartContext] syncCart: Sync successful for user: ${currentUserId}`);
    } catch (error: any) {
      console.error(`[CartContext] syncCart: Failed for user: ${currentUserId}`, error);
      const message = error.response?.data?.message || error.message || "Failed to sync cart with server.";
      setCartError(message);
    } finally {
      console.log(`[CartContext] syncCart: Setting isSyncing=FALSE for user: ${currentUserId}`);
      setIsSyncing(false);
    }
  }, [isAuthenticated, user?.sub, getAccessTokenSilently, api, isSyncing]); 

  // --- "Auth Effect": Handles initial cart fetch on authentication changes ---
  useEffect(() => {
    const currentUserId = user?.sub;
    console.log(`[CartContext] Auth Effect: Auth state check. Auth: ${isAuthenticated}, AuthLoading: ${isAuth0Loading}, UserID: ${currentUserId}, FetchedFor: ${fetchedForUserRef.current}`);

    if (isAuth0Loading) {
      console.log('[CartContext] Auth Effect: Auth0 is loading. Setting isLoading=true, cartLoaded=false.');
      // Ensure isLoading is true while Auth0 is loading, and cart is not considered loaded.
      if (!isLoading) setIsLoading(true); 
      if (cartLoaded) setCartLoaded(false); 
      return; 
    }

    if (isAuthenticated && currentUserId) {
      // User is authenticated, and we have a user ID.
      if (fetchedForUserRef.current !== currentUserId || !cartLoaded) { // Fetch if user changed OR cart hasn't been loaded yet for current user
        console.log(`[CartContext] Auth Effect: New/changed user (${currentUserId}) OR cart not loaded. FetchedFor: ${fetchedForUserRef.current}, CartLoaded: ${cartLoaded}. Fetching cart.`);
        fetchCart(); 
      } else {
        console.log(`[CartContext] Auth Effect: User ${currentUserId} already processed and cart loaded. IsLoading: ${isLoading}`);
        // If already fetched and loaded for this user, ensure loading is false if it isn't already.
        if (isLoading) { 
             console.log(`[CartContext] Auth Effect: Resetting isLoading to false for user ${currentUserId} as cart was already marked loaded and fetched.`);
             setIsLoading(false);
        }
      }
    } else {
      // Not authenticated (and Auth0 is done loading)
      console.log('[CartContext] Auth Effect: User not authenticated. Clearing cart states.');
      setCartItems([]);
      setIsLoading(false); 
      setCartLoaded(false); 
      fetchedForUserRef.current = null; 
    }
  // --- CORRECTED DEPENDENCIES: Removed isLoading and cartLoaded to prevent loops ---
  // fetchCart is stable due to useCallback and its own stable dependencies.
  }, [isAuthenticated, isAuth0Loading, user?.sub, fetchCart]); 


  // --- "Debounced Sync Effect": Syncs cart changes after a delay ---
  useEffect(() => {
    const currentUserId = user?.sub;
    // console.log(`[CartContext] Debounced Sync Effect: Check. User: ${currentUserId}, CartLoaded: ${cartLoaded}, Auth: ${isAuthenticated}, AuthLoading: ${isAuth0Loading}, Loading: ${isLoading}, Syncing: ${isSyncing}, Items: ${cartItems.length}`);
    
    // Only run if cart is loaded, user is authenticated, and not in other loading/syncing states
    if (!cartLoaded || !isAuthenticated || !currentUserId || isAuth0Loading || isLoading || isSyncing) {
        // console.log('[CartContext] Debounced Sync Effect: Bailing out due to pre-conditions.');
        return;
    }

    const timer = setTimeout(() => {
      // console.log(`[CartContext] Debounced Sync Effect: Timer fired. User: ${currentUserId}, CartLoaded: ${cartLoaded}, Loading: ${isLoading}, Syncing: ${isSyncing}`);
      // Check conditions again inside timeout, as state might have changed
      if (cartLoaded && !isLoading && !isSyncing && isAuthenticated && currentUserId) { 
         console.log('[CartContext] Debounced Sync Effect: Calling syncCart with items:', cartItems);
         syncCart(cartItems);
      } else {
         // console.log('[CartContext] Debounced Sync Effect: Conditions for sync not met inside timeout.');
      }
    }, 1500); 

    return () => {
        // console.log('[CartContext] Debounced Sync Effect: Clearing timer.');
        clearTimeout(timer);
    }
  }, [cartItems, cartLoaded, isAuthenticated, isAuth0Loading, isLoading, isSyncing, syncCart, user?.sub]); 


  const addToCart = async (itemToAdd: AddToCartItem) => {
    const currentUserId = user?.sub;
    console.log(`[CartContext] addToCart: Called for productId: ${itemToAdd.productId}, User: ${currentUserId}`);
    if (!isAuthenticated || !currentUserId) {
      setCartError("Please log in to add items to your cart.");
      console.log('[CartContext] addToCart: User not authenticated.');
      return Promise.reject(new Error("User not authenticated"));
    }
    
    console.log(`[CartContext] addToCart: Setting isLoading TRUE for user: ${currentUserId}`);
    setIsLoading(true); 
    setCartError(undefined); 

    try {
      const token = await getAccessTokenSilently();
      const payload = {
        productId: itemToAdd.productId,
        quantity: 1, 
      };
      console.log(`[CartContext] addToCart: Posting to /cart for user: ${currentUserId}, payload:`, payload);
      await api.post('/cart', payload, { 
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log(`[CartContext] addToCart: POST to /cart successful for user: ${currentUserId}. Calling fetchCart.`);
      await fetchCart(); 
      console.log(`[CartContext] addToCart: fetchCart completed for user: ${currentUserId}`);
      
    } catch (error: any) {
      console.error(`[CartContext] addToCart: Failed for user: ${currentUserId}`, error);
      const message = error.response?.data?.message || error.message || "Failed to add item to cart.";
      setCartError(message);
      console.log(`[CartContext] addToCart: Setting isLoading FALSE in error block for user: ${currentUserId}`);
      setIsLoading(false); 
      return Promise.reject(new Error(message)); 
    }
  };

  const removeFromCart = async (productId: number) => {
    const currentUserId = user?.sub;
    console.log(`[CartContext] removeFromCart: Called for productId: ${productId}, User: ${currentUserId}`);
    if(!isAuthenticated || !currentUserId) return;

    setCartError(undefined);
    const previousCartItems = [...cartItems]; 
    
    setCartItems(prev => prev.filter(item => item.productId !== productId));
    console.log(`[CartContext] removeFromCart: Optimistically updated UI for user: ${currentUserId}`);
    
    try {
        const token = await getAccessTokenSilently();
        console.log(`[CartContext] removeFromCart: Deleting from /cart/${productId} for user: ${currentUserId}`);
        await api.delete(`/cart/${productId}`, {
             headers: { Authorization: `Bearer ${token}` }
        });
        console.log(`[CartContext] removeFromCart: Delete successful for user: ${currentUserId}`);
    } catch (error: any) {
        console.error(`[CartContext] removeFromCart: Failed on backend for user: ${currentUserId}`, error);
        setCartItems(previousCartItems); 
        const message = error.response?.data?.message || error.message || "Failed to remove item.";
        setCartError(message);
    }
  };

  const updateQuantity = async (productId: number, quantity: number) => {
    const currentUserId = user?.sub;
    console.log(`[CartContext] updateQuantity: Called for productId: ${productId}, quantity: ${quantity}, User: ${currentUserId}`);
    if(!isAuthenticated || !currentUserId) return;

    setCartError(undefined);
    if (quantity <= 0) {
      console.log(`[CartContext] updateQuantity: Quantity <= 0, calling removeFromCart for user: ${currentUserId}`);
      await removeFromCart(productId); 
    } else {
      const previousCartItems = [...cartItems];
      setCartItems(prev =>
        prev.map(item =>
          item.productId === productId ? { ...item, quantity } : item
        )
      );
      console.log(`[CartContext] updateQuantity: Optimistically updated UI for user: ${currentUserId}`);
      try {
        const token = await getAccessTokenSilently();
        console.log(`[CartContext] updateQuantity: Patching to /cart/${productId} for user: ${currentUserId}, quantity: ${quantity}`);
        await api.patch(`/cart/${productId}`, { quantity }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log(`[CartContext] updateQuantity: Patch successful for user: ${currentUserId}`);
      } catch (error: any) {
        console.error(`[CartContext] updateQuantity: Failed on backend for user: ${currentUserId}`, error);
        setCartItems(previousCartItems); 
        const message = error.response?.data?.message || error.message || "Failed to update quantity.";
        setCartError(message);
      }
    }
  };

  const clearCart = async () => {
    const currentUserId = user?.sub;
    console.log(`[CartContext] clearCart: Called. User: ${currentUserId}`);
    if(!isAuthenticated || !currentUserId) return;

    setCartError(undefined);
    const previousCartItems = [...cartItems];
    setCartItems([]); 
    console.log(`[CartContext] clearCart: Optimistically cleared UI for user: ${currentUserId}`);
    
    try {
        const token = await getAccessTokenSilently();
        console.log(`[CartContext] clearCart: Deleting from /cart for user: ${currentUserId}`);
        await api.delete('/cart', { headers: { Authorization: `Bearer ${token}` }});
        console.log(`[CartContext] clearCart: Delete successful for user: ${currentUserId}`);
    } catch (error: any) {
        console.error(`[CartContext] clearCart: Failed on backend for user: ${currentUserId}`, error);
        setCartItems(previousCartItems); 
        const message = error.response?.data?.message || error.message || "Failed to clear cart.";
        setCartError(message);
    }
  };

  const totalItems = cartItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const totalPrice = cartItems.reduce((sum, item) => sum + (Number(item.productPrice || 0) * Number(item.quantity || 0)), 0);

  useEffect(() => {
    console.log(`[CartContext] Provider value updated. isLoading: ${isLoading}, cartLoaded: ${cartLoaded}, items: ${cartItems.length}, error: ${cartError}, syncing: ${isSyncing}`);
  }, [isLoading, cartLoaded, cartItems, cartError, isSyncing]);


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
