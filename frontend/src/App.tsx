import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useParams, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { Board } from './components/Kanban/Board';
import { ChatSidebar } from './components/Chat/ChatSidebar';
import { Dashboard } from './pages/Dashboard';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Header } from './components/Header';
import { Profile } from './pages/Profile'; // Importado corretamente

// --- LAYOUT GLOBAL (Header + Conteúdo) ---
const MainLayout = () => {
    return (
        <div className="h-screen w-screen flex flex-col bg-[#F8FAFC] dark:bg-[#0F1117] transition-colors font-sans">
            <Header /> 
            <div className="flex-1 overflow-hidden relative flex">
                <Outlet />
            </div>
        </div>
    );
};

// --- LAYOUT ESPECÍFICO DO BOARD (Sidebar + Kanban) ---
const BoardView = () => {
  const { boardId } = useParams();
  if (!boardId) return <Navigate to="/" />;

  return (
    <div className="flex w-full h-full">
      {/* Sidebar Chat */}
      <div className="hidden md:flex h-full border-r border-gray-200/80 dark:border-gray-800/80 w-[320px] flex-shrink-0 bg-white dark:bg-[#16181D] relative z-10 shadow-sm">
        <ChatSidebar boardId={boardId} />
      </div>

      {/* Área do Kanban */}
      <div className="flex-1 h-full min-w-0 bg-[#F1F5F9] dark:bg-[#0F1117] relative transition-colors">
          <Board initialBoardId={boardId} />
      </div>
    </div>
  );
};

// --- ROTA PROTEGIDA ---
const PrivateRoutes = () => {
    const { isAuthenticated, loading } = useAuth();
    
    if (loading) {
        return (
            <div className="h-screen w-screen bg-gray-50 dark:bg-[#121212] flex items-center justify-center text-gray-800 dark:text-[#E0E0E0]">
                <span className="animate-pulse font-medium">Carregando Lignum...</span>
            </div>
        );
    }
    
    return isAuthenticated ? <MainLayout /> : <Navigate to="/login" />;
};

// --- ROTA PÚBLICA ---
const PublicRoutes = () => {
    const { isAuthenticated, loading } = useAuth();
    if (loading) return null;
    return isAuthenticated ? <Navigate to="/" /> : <Outlet />;
};

function App() {
  return (
    <ThemeProvider>
        <AuthProvider>
        <BrowserRouter>
            <Routes>
                {/* Rotas Públicas (Login/Register) */}
                <Route element={<PublicRoutes />}>
                    <Route path="/login" element={<LoginWrapper />} />
                    <Route path="/register" element={<RegisterWrapper />} />
                </Route>

                {/* Rotas Privadas (Com Header Global) */}
                <Route element={<PrivateRoutes />}>
                    {/* Raiz -> Dashboard */}
                    <Route path="/" element={<Dashboard />} />
                    
                    {/* Board -> Visualização com Sidebar */}
                    <Route path="/board/:boardId" element={<BoardView />} />
                    
                    {/* --- CORREÇÃO: ROTA DE PERFIL ADICIONADA --- */}
                    <Route path="/profile" element={<Profile />} />
                    
                </Route>

                <Route path="*" element={<Navigate to="/" />} />
            </Routes>
        </BrowserRouter>
        </AuthProvider>
    </ThemeProvider>
  );
}

const LoginWrapper = () => { const navigate = useNavigate(); return <Login onNavigateToRegister={() => navigate('/register')} />; };
const RegisterWrapper = () => { const navigate = useNavigate(); return <Register onNavigateToLogin={() => navigate('/login')} />; };

export default App;