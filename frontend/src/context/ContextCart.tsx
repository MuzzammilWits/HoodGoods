import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import axios from 'axios';

interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (item: Omit<CartItem, 'quantity'>) => Promise<void>;
  removeFromCart: (productId: string) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  totalItems: number;
  totalPrice: number;
  isLoading: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
    withCredentials: false,
  });

  const fetchCart = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      const token = await getAccessTokenSilently();
      const response = await api.get('/cart', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCartItems(response.data);
    } catch (error) {
      console.error('Failed to fetch cart:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, getAccessTokenSilently]);

  const syncCart = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      const token = await getAccessTokenSilently();
      await api.post('/cart/sync', { items: cartItems }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (error) {
      console.error('Failed to sync cart:', error);
    }
  }, [cartItems, isAuthenticated, getAccessTokenSilently]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      const timer = setTimeout(syncCart, 500);
      return () => clearTimeout(timer);
    }
  }, [cartItems, isLoading, isAuthenticated, syncCart]);

  const addToCart = async (item: Omit<CartItem, 'quantity'>) => {
    setCartItems(prev => {
      const existing = prev.find(i => i.productId === item.productId);
      return existing 
        ? prev.map(i => i.productId === item.productId 
            ? { ...i, quantity: i.quantity + 1 } 
            : i)
        : [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = async (productId: string) => {
    setCartItems(prev => prev.filter(item => item.productId !== productId));
  };

  const updateQuantity = async (productId: string, quantity: number) => {
    setCartItems(prev => prev.map(item => 
      item.productId === productId ? { ...item, quantity } : item
    ).filter(item => item.quantity > 0));
  };

  const clearCart = async () => {
    setCartItems([]);
  };

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <CartContext.Provider value={{
      cartItems,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      totalItems,
      totalPrice,
      isLoading
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