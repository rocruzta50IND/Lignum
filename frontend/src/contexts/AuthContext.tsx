import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../services/api';
import { authService } from '../services/authService';
import type { LoginCredentials, RegisterCredentials } from '../services/authService';

// Interface do Usuário
export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface AuthContextData {
  user: User | null;
  isAuthenticated: boolean;
  signIn: (credentials: LoginCredentials) => Promise<void>;
  signUp: (credentials: RegisterCredentials) => Promise<void>;
  signOut: () => void;
  updateUser: (data: Partial<User>) => void;
  loading: boolean;
}

// INICIALIZAÇÃO SEGURA COM NULL
const AuthContext = createContext<AuthContextData | null>(null);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStorageData = () => {
      const storedToken = localStorage.getItem('lignum_token');
      const storedUser = localStorage.getItem('lignum_user');

      if (storedToken && storedUser) {
        try {
          api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
          setUser(JSON.parse(storedUser));
        } catch (error) {
          console.error("Erro ao carregar sessão:", error);
          localStorage.removeItem('lignum_token');
          localStorage.removeItem('lignum_user');
        }
      }
      setLoading(false);
    };

    loadStorageData();
  }, []);

  const signIn = async (credentials: LoginCredentials) => {
    try {
      const response = await authService.login(credentials);
      const { token, user: apiUser } = response;

      localStorage.setItem('lignum_token', token);
      localStorage.setItem('lignum_user', JSON.stringify(apiUser));
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(apiUser);
    } catch (error) {
      throw error;
    }
  };

  const signUp = async (credentials: RegisterCredentials) => {
    try {
      const response = await authService.register(credentials);
      const { token, user: apiUser } = response;

      localStorage.setItem('lignum_token', token);
      localStorage.setItem('lignum_user', JSON.stringify(apiUser));
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(apiUser);
    } catch (error) {
      throw error;
    }
  };

  const signOut = () => {
    localStorage.removeItem('lignum_token');
    localStorage.removeItem('lignum_user');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
  };

  const updateUser = (updatedData: Partial<User>) => {
    if (user) {
        const newUser = { ...user, ...updatedData };
        setUser(newUser);
        localStorage.setItem('lignum_user', JSON.stringify(newUser));
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, signIn, signUp, signOut, updateUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  // Garante que o hook só funcione se estiver dentro do Provider
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};