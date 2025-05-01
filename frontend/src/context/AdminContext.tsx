// src/context/AdminContext.tsx
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import api from '../utils/api';

interface AdminContextType {
  isAdmin: boolean;
  loading: boolean;
  users: any[];
  fetchUsers: () => Promise<void>;
  setUsers: React.Dispatch<React.SetStateAction<any[]>>; // Add this line
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const AdminProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  const { user, getAccessTokenSilently, isLoading: authLoading } = useAuth0();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Check admin status when user changes
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (user && !authLoading) {
        try {
          const token = await getAccessTokenSilently();
          const response = await api.get('/auth/verify-admin', {
            headers: { Authorization: `Bearer ${token}` }
          });
          setIsAdmin(response.data.isAdmin);
        } catch (error) {
          setIsAdmin(false);
        }
      }
    };
    checkAdminStatus();
  }, [user, authLoading]);

// In AdminContext.tsx
const fetchUsers = async () => {
  try {
    setLoading(true);
    const token = await getAccessTokenSilently();
    const response = await api.get('/admin/users', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (response.data) {
      setUsers(response.data);
    } else {
      throw new Error('Invalid response format');
    }
  } catch (error) {
    console.error('Failed to fetch users:', error);
    setUsers([]);
    throw error; // Re-throw to be caught by the caller
  } finally {
    setLoading(false);
  }
};

  return (
    <AdminContext.Provider value={{ isAdmin, loading, users, fetchUsers, setUsers }}>
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};