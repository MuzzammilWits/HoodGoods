import React, { createContext, useContext, useState, useEffect } from 'react';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (item: Omit<CartItem, 'quantity'>) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
  loadDemoItems: () => void; // New function for demo purposes
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    // Try to load from localStorage first
    if (typeof window !== 'undefined') {
      const savedCart = localStorage.getItem('cart');
      return savedCart ? JSON.parse(savedCart) : [];
    }
    return [];
  });

  // Track if demo items were loaded
  const [demoItemsLoaded, setDemoItemsLoaded] = useState<boolean>(false);

  // Persist cart to localStorage
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cartItems));
  }, [cartItems]);

  // Cart actions
  const addToCart = (item: Omit<CartItem, 'quantity'>) => {
    setCartItems(prevItems => {
      const existingItem = prevItems.find(prevItem => prevItem.id === item.id);
      return existingItem
        ? prevItems.map(prevItem =>
            prevItem.id === item.id
              ? { ...prevItem, quantity: prevItem.quantity + 1 }
              : prevItem
          )
        : [...prevItems, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    setCartItems(prevItems => prevItems.filter(item => item.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    setCartItems(prevItems => {
      if (quantity <= 0) {
        return prevItems.filter(item => item.id !== id);
      }
      return prevItems.map(item =>
        item.id === id ? { ...item, quantity } : item
      );
    });
  };

  const clearCart = () => {
    setCartItems([]);
    setDemoItemsLoaded(false);  // Reset demo items flag
  };

  // Demo items loader (for initial testing)
  const loadDemoItems = () => {
    // Only load demo items if they haven't been loaded before
    if (!demoItemsLoaded) {
      const demoItems: Omit<CartItem, 'quantity'>[] = [
        {
          id: 'demo-1',
          name: 'Bracelet',
          price: 25.99,
          image: 'https://www.michakra.co.za/cdn/shop/files/2.-Triple-Protection-10mm_1200x.jpg?v=1700477897'
        },
        {
          id: 'demo-2',
          name: '"Ying-Yang" Bracelet',
          price: 35.50,
          image: 'https://media.takealot.com/covers_images/332c445f4d774fda85b96a4854843ba1/s-pdpxl.file'
        }
      ];

      demoItems.forEach(item => addToCart(item));
      setDemoItemsLoaded(true); // Set demo items flag as loaded
    }
  };

  // Calculated values
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

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
        loadDemoItems
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
