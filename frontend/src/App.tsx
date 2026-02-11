import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Board } from './components/Kanban/Board';
import { ChatSidebar } from './components/Chat/ChatSidebar';
import { Login } from './pages/Login';
import { Register } from './pages/Register';

const TEST_BOARD_ID = '8634798a-89ae-4600-837f-8a90404d0b27';

// Componente Interno para o Layout Logado
const DashboardLayout = () => {
  const { signOut, user } = useAuth();

  return (
    <div className="h-screen w-screen bg-lignum-bg flex overflow-hidden">
      {/* Sidebar Chat */}
      <div className="hidden md:flex h-full">
        <ChatSidebar boardId={TEST_BOARD_ID} />
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full min-w-0 bg-lignum-bg">
        <header className="h-14 border-b border-[#333] flex items-center px-6 bg-lignum-bg justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lignum-text-primary font-semibold text-lg">
              Lignum
            </h1>
            <span className="bg-[#2C2C2C] text-xs text-gray-400 px-2 py-0.5 rounded border border-[#333]">
              Board: Desenvolvimento
            </span>
          </div>
          
          <div className="flex items-center gap-4">
             <span className="text-sm text-gray-400 hidden sm:block">
               Olá, <span className="text-white font-medium">{user?.name}</span>
             </span>
             <button 
               onClick={signOut}
               className="text-xs text-red-400 hover:text-red-300 border border-red-900/30 hover:bg-red-900/20 px-3 py-1.5 rounded transition-colors"
             >
               Sair
             </button>
          </div>
        </header>
        
        <div className="flex-1 overflow-hidden relative">
          <Board boardId={TEST_BOARD_ID} />
        </div>
      </main>
    </div>
  );
};

// Gerenciador de Rotas (Simples)
const AppRoutes = () => {
  const { isAuthenticated, loading } = useAuth();
  const [currentView, setCurrentView] = useState<'login' | 'register'>('login');

  if (loading) {
    return (
      <div className="h-screen w-screen bg-[#121212] flex items-center justify-center text-[#E0E0E0]">
        <span className="animate-pulse">Carregando Lignum...</span>
      </div>
    );
  }

  if (isAuthenticated) {
    return <DashboardLayout />;
  }

  // Se não autenticado, alterna entre Login e Register
  return currentView === 'login' ? (
    <Login onNavigateToRegister={() => setCurrentView('register')} />
  ) : (
    <Register onNavigateToLogin={() => setCurrentView('login')} />
  );
};

// App Principal com Providers
function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;