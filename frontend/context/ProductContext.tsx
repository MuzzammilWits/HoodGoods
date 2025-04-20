// src/context/ProductContext.tsx
import React, { createContext, useContext, useState, ReactNode } from 'react';

const API_URL = (import.meta as any).env.VITE_API_URL;

interface Product {
  productID: string;
  productName: string;
  productdescription: string;
  productCategory: string;
  productprice: number;
  userID: string;
  imageURL: string;
  storeName: string;
  createdAt?: string;
  updatedAt?: string;
}

interface ProductContextType {
  products: Product[];
  featuredProducts: Product[];
  loading: boolean;
  error: string | null;
  fetchProducts: (filters?: Record<string, any>) => Promise<void>;
  fetchFeatured: (limit?: number) => Promise<void>;
  getProductById: (id: string) => Promise<Product | null>;
  createProduct: (product: Omit<Product, 'productID'>) => Promise<void>;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

interface ProductProviderProps {
  children: ReactNode;
}

export const ProductProvider: React.FC<ProductProviderProps> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleResponse = async (response: Response) => {
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Request failed');
    }
    return response.json();
  };

  const fetchProducts = async (filters: Record<string, any> = {}) => {
    try {
      setLoading(true);
      const queryString = new URLSearchParams(filters).toString();
      const response = await fetch(`${API_URL}/products?${queryString}`);
      const data = await handleResponse(response);
      setProducts(data.data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  const fetchFeatured = async (limit: number = 5) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/products/featured?limit=${limit}`);
      const data = await handleResponse(response);
      setFeaturedProducts(data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch featured products');
    } finally {
      setLoading(false);
    }
  };

  const getProductById = async (id: string): Promise<Product | null> => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/products/${id}`);
      const data = await handleResponse(response);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch product');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const createProduct = async (product: Omit<Product, 'productID'>) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(product),
      });
      await handleResponse(response);
      // Refresh products after creation
      await fetchProducts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProductContext.Provider 
      value={{ 
        products, 
        featuredProducts, 
        loading, 
        error, 
        fetchProducts, 
        fetchFeatured,
        getProductById,
        createProduct
      }}
    >
      {children}
    </ProductContext.Provider>
  );
};

export const useProducts = (): ProductContextType => {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error('Product must be used within a ProductProvider');
  }
  return context;
};