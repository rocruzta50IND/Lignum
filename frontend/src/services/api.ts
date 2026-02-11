import axios from 'axios';

export const api = axios.create({
  baseURL: 'http://localhost:3000',
});

// Interceptor para adicionar o Token em toda requisição
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('lignum_token');
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  return config;
});

// Opcional: Interceptor para deslogar se o token expirar (401)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token inválido ou expirado
      localStorage.removeItem('lignum_token');
      localStorage.removeItem('lignum_user');
      // window.location.href = '/'; // Força reload para login
    }
    return Promise.reject(error);
  }
);