import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
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
  <React.StrictMode>
    {/* Provider essencial para gerenciamento de estado do servidor [cite: 53] */}
    <QueryClientProvider client={queryClient}>
      <App />
      {/* Devtools para debug do estado do servidor (apenas em dev) */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </React.StrictMode>,
);