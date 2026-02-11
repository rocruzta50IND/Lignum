// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService } from '../services/authService';
import type { LoginCredentials, RegisterCredentials } from '../services/authService'; // <--- O SEGREDO ESTÁ AQUI
import type { User } from '../types';

interface AuthContextData {
  user: User | null;
  isAuthenticated: boolean;
  signIn: (credentials: LoginCredentials) => Promise<void>;
  signUp: (credentials: RegisterCredentials) => Promise<void>;
  signOut: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Lógica de Persistência (Hidratação do Estado)
    const loadStorageData = () => {
      const storedToken = localStorage.getItem('lignum_token');
      const storedUser = localStorage.getItem('lignum_user');

      if (storedToken && storedUser) {
        try {
          setUser(JSON.parse(storedUser));
          // Opcional: Aqui poderíamos validar o token com o backend se necessário
        } catch (error) {
          console.error("Erro ao parsear usuário do storage:", error);
          // Se o JSON estiver corrompido, limpa tudo para evitar loops
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
      
      setUser(apiUser);
    } catch (error) {
      console.error("Erro no contexto de login:", error);
      throw error; // Relança para o componente tratar o feedback visual
    }
  };

  const signUp = async (credentials: RegisterCredentials) => {
    try {
      const response = await authService.register(credentials);
      
      const { token, user: apiUser } = response;

      localStorage.setItem('lignum_token', token);
      localStorage.setItem('lignum_user', JSON.stringify(apiUser));
      
      setUser(apiUser);
    } catch (error) {
      console.error("Erro no contexto de cadastro:", error);
      throw error;
    }
  };

  const signOut = () => {
    localStorage.removeItem('lignum_token');
    localStorage.removeItem('lignum_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated: !!user, 
      signIn, 
      signUp, 
      signOut,
      loading 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};