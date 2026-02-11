import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ThemeProvider } from './contexts/ThemeContext';
import App from './App.tsx';
import './index.css';

// Configuração do Cliente TanStack Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // Dados considerados frescos por 1 minuto
      retry: 1, // Tenta novamente 1 vez em caso de falha de rede
      refetchOnWindowFocus: false, // Evita refetch excessivo durante desenvolvimento
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  /* REMOVIDO: <React.StrictMode> 
     Motivo: O modo estrito causa o erro "removeChild" ao usar dnd-kit em desenvolvimento.
     A remoção resolve a tela branca/preta.
  */
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <App />
      {/* Devtools para debug do estado do servidor (apenas em dev) */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </ThemeProvider>
);