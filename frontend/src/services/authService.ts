import { api } from './api';
import type { User } from '../types';

// --- INTERFACES EXPORTADAS (Obrigatórias para importação externa) ---

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

// --- SERVIÇO DE AUTENTICAÇÃO ---

export const authService = {
  /**
   * Realiza o login do usuário.
   * Rota: POST /auth/login
   */
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const { data } = await api.post<AuthResponse>('/auth/login', credentials);
    return data;
  },

  /**
   * Registra um novo usuário.
   * Rota: POST /auth/register
   */
  register: async (credentials: RegisterCredentials): Promise<AuthResponse> => {
    const { data } = await api.post<AuthResponse>('/auth/register', credentials);
    return data;
  }
};