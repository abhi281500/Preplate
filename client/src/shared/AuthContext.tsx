import React, { createContext, useContext, useState, useEffect } from 'react';
import api from './api';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'RESTAURANT_OWNER' | 'RESTAURANT_STAFF';
  tenantId?: string | null;
  permissions?: string[];
}

export interface RestaurantInfo {
  tenantId: string;
  name: string;
  slug: string;
  status: string;
}

interface AuthContextType {
  user: User | null;
  restaurant: RestaurantInfo | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: User, restaurant?: RestaurantInfo | null) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [restaurant, setRestaurant] = useState<RestaurantInfo | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('preplate_token');
    const storedUser = localStorage.getItem('preplate_user');
    const storedRestaurant = localStorage.getItem('preplate_restaurant');

    if (storedToken && storedUser) {
      setToken(storedToken);
      try {
        setUser(JSON.parse(storedUser));
        if (storedRestaurant) {
          setRestaurant(JSON.parse(storedRestaurant));
        }
      } catch (e) {
        console.error('Failed to parse cached auth state:', e);
      }
    }
    setIsLoading(false);
  }, []);

  const login = (newToken: string, newUser: User, newRestaurant?: RestaurantInfo | null) => {
    setToken(newToken);
    setUser(newUser);
    setRestaurant(newRestaurant || null);
    localStorage.setItem('preplate_token', newToken);
    localStorage.setItem('preplate_user', JSON.stringify(newUser));
    if (newRestaurant) {
      localStorage.setItem('preplate_restaurant', JSON.stringify(newRestaurant));
    } else {
      localStorage.removeItem('preplate_restaurant');
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setRestaurant(null);
    localStorage.removeItem('preplate_token');
    localStorage.removeItem('preplate_user');
    localStorage.removeItem('preplate_restaurant');
  };

  return (
    <AuthContext.Provider value={{ user, restaurant, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
