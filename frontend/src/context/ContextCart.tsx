import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import axios from 'axios';

// Interface for item *within the context state* (needs full details for UI)
interface CartItemUI {
  cartID?: number; // Optional: ID from the cart_item table itself
  productId: number; // Now a number
  productName: string; // Renamed from 'name' for clarity
  productPrice: number; // Renamed from 'price' for clarity
  quantity: number;
  imageUrl?: string; // Renamed from 'image' for clarity
  availableQuantity?: number; // <--- ADD THIS FIELD (optional if data might be missing)

  // Add other fields returned by the backend's getCart if needed
}

// Interface for adding an item (needs product details initially)
interface AddToCartItem {
  productId: number;
  productName: string;
  productPrice: number;
  imageUrl?: string;
}

interface CartContextType {
  cartItems: CartItemUI[];
  addToCart: (item: AddToCartItem) => Promise<void>; // Parameter type changed
  removeFromCart: (productId: number) => Promise<void>; // Parameter type changed
  updateQuantity: (productId: number, quantity: number) => Promise<void>; // Parameter type changed
  clearCart: () => Promise<void>;
  totalItems: number;
  totalPrice: number;
  isLoading: boolean;
  fetchCart: () => Promise<void>; // Expose fetchCart if manual refresh is needed
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const { user, getAccessTokenSilently, isAuthenticated, isLoading: isAuthLoading } = useAuth0();
  const [cartItems, setCartItems] = useState<CartItemUI[]>([]);
  const [isLoading, setIsLoading] = useState(true); // Loading state for cart data specifically
  const [isSyncing, setIsSyncing] = useState(false); // State to prevent rapid sync calls

  const api = axios.create({
    baseURL: import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000',
  });

  // Fetch cart data from backend
  const fetchCart = useCallback(async () => {
    // Wait for authentication to be ready and user to be loaded
    if (!isAuthenticated || isAuthLoading || !user) {
        if (!isAuthLoading) setIsLoading(false); // Stop loading if auth is not loading and not authenticated
        return;
    }
    console.log('Fetching cart...');
    setIsLoading(true);
    try {
      const token = await getAccessTokenSilently();
      const response = await api.get('/cart', { // Backend now returns CartItemWithProductDetails[]
        headers: { Authorization: `Bearer ${token}` }
      });
      // Map backend data to frontend CartItemUI structure if names differ
      const fetchedItems: CartItemUI[] = response.data.map((item: any) => ({
          cartID: item.cartID, // Keep cart item ID if needed
          productId: item.productId,
          productName: item.productName, // Map from backend response
          productPrice: item.productPrice, // Map from backend response
          quantity: item.quantity,
          imageUrl: item.imageUrl, // Map from backend response
          availableQuantity: item.availableQuantity, // Map from backend response
      }));
      setCartItems(fetchedItems);
      console.log('Cart fetched:', fetchedItems);
    } catch (error) {
      console.error('Failed to fetch cart:', error);
       // Handle specific errors, e.g., 401 Unauthorized
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, isAuthLoading, user, getAccessTokenSilently]); // Add user and isAuthLoading dependencies

  // Sync local cart state with the backend
// Inside CartProvider component in ContextCart.tsx

const syncCart = useCallback(async (currentCartItems: CartItemUI[]) => {
    // ... (existing checks for auth, isSyncing, isLoading) ...
    if (!isAuthenticated || isAuthLoading || !user || isSyncing || isLoading) return;

    console.log('Attempting to sync cart...');
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
        console.log('Cart synced successfully');
    } catch (error) {
        console.error('Failed to sync cart:', error);
        // --- REMOVE or COMMENT OUT the fetchCart call below ---
        // await fetchCart(); // <--- REMOVE THIS LINE TO BREAK THE LOOP
        // Instead, consider setting an error state to show a message to the user
        // e.g., setCartError('Failed to sync cart. Please try again.');
    } finally {
        setIsSyncing(false);
    }
}, [isAuthenticated, isAuthLoading, user, getAccessTokenSilently, isSyncing, isLoading /* Removed fetchCart from deps if it was there */]);

// Add state for handling errors if needed:
// const [cartError, setCartError] = useState<string | null>(null);


  // Effect to fetch cart when authentication status changes or page loads
  useEffect(() => {
    if (isAuthenticated && !isAuthLoading && user) {
        fetchCart();
    } else if (!isAuthenticated && !isAuthLoading) {
        // Clear cart if user logs out or is not logged in
        setCartItems([]);
        setIsLoading(false);
    }
  }, [isAuthenticated, isAuthLoading, user, fetchCart]); // Re-run when auth state is resolved


  // Effect to trigger sync when local cartItems change (debounced)
  useEffect(() => {
      // Don't sync while loading initial cart or if not authenticated
      if (isLoading || !isAuthenticated || isAuthLoading || !user) {
          return;
      }

      // Debounce the sync function call
      const timer = setTimeout(() => {
          // Pass the current state of cartItems directly to avoid closure issues
          syncCart(cartItems);
      }, 500); // Debounce time (e.g., 1 second)

      return () => clearTimeout(timer); // Cleanup timeout on unmount or change
  }, [cartItems, isLoading, isAuthenticated, isAuthLoading, user, syncCart]); // Dependencies


  const addToCart = async (itemToAdd: AddToCartItem) => {
     if (!isAuthenticated) {
         console.warn("User not authenticated. Cannot add item.");
         // Optionally trigger login prompt
         return;
     }
     console.log('Adding to cart (local state first):', itemToAdd);

     // --- Optimistic UI Update ---
     setCartItems(prev => {
         const existingItem = prev.find(i => i.productId === itemToAdd.productId);
         if (existingItem) {
             // Increase quantity if item exists
             return prev.map(i =>
                 i.productId === itemToAdd.productId
                     ? { ...i, quantity: i.quantity + 1 }
                     : i
             );
         } else {
             // Add new item with quantity 1
             const newItem: CartItemUI = {
                 productId: itemToAdd.productId,
                 productName: itemToAdd.productName,
                 productPrice: itemToAdd.productPrice,
                 imageUrl: itemToAdd.imageUrl,
                 quantity: 1, // Start with quantity 1
             };
             return [...prev, newItem];
         }
     });
     // Note: The syncCart effect will handle backend update later
  };

  const removeFromCart = async (productId: number) => { // productId is number
      console.log('Removing from cart (local state first):', productId);
      setCartItems(prev => prev.filter(item => item.productId !== productId));
      // Note: The syncCart effect will handle backend update later
  };

  const updateQuantity = async (productId: number, quantity: number) => { // productId is number
      console.log('Updating quantity (local state first):', productId, quantity);
      if (quantity <= 0) {
          // If quantity is zero or less, remove the item
          removeFromCart(productId);
      } else {
          setCartItems(prev => prev.map(item =>
              item.productId === productId ? { ...item, quantity: quantity } : item
          ));
      }
      // Note: The syncCart effect will handle backend update later
  };

  const clearCart = async () => {
      console.log('Clearing cart (local state first)');
      setCartItems([]);
      // Note: The syncCart effect will handle backend update later by sending an empty array
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
      fetchCart // Expose fetchCart
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