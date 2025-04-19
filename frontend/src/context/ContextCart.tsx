import React, { createContext, useContext, useState, useEffect } from 'react';
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

// Configure axios instance with default settings
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

export const CartProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const { getAccessTokenSilently, isAuthenticated, user } = useAuth0();
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    // Initialize cart with proper error handling
    if (typeof window !== 'undefined') {
      try {
        const savedCart = localStorage.getItem('cart');
        return savedCart ? JSON.parse(savedCart) : [];
      } catch (e) {
        console.error("Failed to parse cart from localStorage", e);
        return [];
      }
    }
    return [];
  });
  const [isLoading, setIsLoading] = useState(true);

  // Fetch cart from backend when user authenticates
  useEffect(() => {
    const fetchCart = async () => {
      try {
        if (isAuthenticated && user?.sub) {
          const token = await getAccessTokenSilently();
          const response = await api.get('/cart', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          setCartItems(Array.isArray(response?.data) ? response.data : []);
        } else {
          const savedCart = localStorage.getItem('cart');
          setCartItems(savedCart ? JSON.parse(savedCart) : []);
        }
      } catch (error) {
        console.error('Error fetching cart:', error);
        setCartItems([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCart();
  }, [isAuthenticated, user?.sub, getAccessTokenSilently]);

  // Persist cart to backend or localStorage
  useEffect(() => {
    if (!isLoading) {
      const persistCart = async () => {
        try {
          if (isAuthenticated && user?.sub) {
            const token = await getAccessTokenSilently();
            await api.post('/cart/sync', 
              { items: cartItems },
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            );
          } else {
            localStorage.setItem('cart', JSON.stringify(cartItems));
          }
        } catch (error) {
          console.error('Error persisting cart:', error);
        }
      };
      
      // Add debounce to prevent too many syncs
      const timer = setTimeout(() => {
        persistCart();
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [cartItems, isLoading, isAuthenticated, user?.sub, getAccessTokenSilently]);

  const addToCart = async (item: Omit<CartItem, 'quantity'>) => {
    setCartItems(prevItems => {
      const existingItem = prevItems.find(i => i.productId === item.productId);
      if (existingItem) {
        return prevItems.map(i =>
          i.productId === item.productId
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [...prevItems, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = async (productId: string) => {
    setCartItems(prevItems => prevItems.filter(item => item.productId !== productId));
  };

  const updateQuantity = async (productId: string, quantity: number) => {
    setCartItems(prevItems => {
      if (quantity <= 0) {
        return prevItems.filter(item => item.productId !== productId);
      }
      return prevItems.map(item =>
        item.productId === productId ? { ...item, quantity } : item
      );
    });
  };

  const clearCart = async () => {
    setCartItems([]);
  };

  // Safe calculations
  const totalItems = cartItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const totalPrice = cartItems.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 0), 0);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalItems,
        totalPrice,
        isLoading
      }}
    >
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