import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate, useLocation } from 'react-router-dom';

interface HeaderProps {
  boardTitle?: string;
}

export const Header: React.FC<HeaderProps> = ({ boardTitle }) => {
  const { signOut, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const isDashboard = location.pathname === '/';

  return (
    // HEADER CONTAINER: Altura fixa (h-16), flexbox centralizado, borda inferior sutil
    <header className="h-16 flex-shrink-0 bg-white/80 dark:bg-[#16181D]/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-6 md:px-8 transition-colors z-40 sticky top-0">
      
      {/* LADO ESQUERDO: Navegação e Logo */}
      <div className="flex items-center h-full">
        {/* Botão Voltar (Só aparece se não for Dashboard) */}
        {!isDashboard && (
            <button 
                onClick={() => navigate('/')}
                className="mr-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-gray-500 dark:text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors flex items-center justify-center"
                title="Voltar para os Quadros"
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            </button>
        )}

        {/* LOGO: Alinhamento preciso */}
        <div className="flex items-center gap-2 cursor-pointer group select-none" onClick={() => navigate('/')} role="button">
            <span className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-rose-600 to-orange-500 tracking-tight group-hover:opacity-90 transition-opacity">
                Lignum
            </span>
        </div>

        {/* Separador e Título do Board */}
        {!isDashboard && boardTitle && (
            <div className="flex items-center ml-4 pl-4 border-l-2 border-gray-200 dark:border-gray-700 h-6">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-[#1F222A] px-3 py-1 rounded-md">
                    {boardTitle}
                </span>
            </div>
        )}
      </div>

      {/* LADO DIREITO: Ações e Perfil */}
      <div className="flex items-center gap-4 h-full">
        
        {/* Toggle Theme */}
        <button 
            onClick={toggleTheme}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 dark:text-yellow-500 hover:bg-gray-100 dark:hover:bg-[#252830] transition-all"
            title={theme === 'dark' ? 'Mudar para Claro' : 'Mudar para Escuro'}
        >
            {theme === 'dark' ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
            )}
        </button>

        {/* User Profile */}
        <div className="flex items-center gap-3 pl-4 border-l border-gray-200 dark:border-gray-800 h-8">
            <div className="text-right hidden sm:block leading-tight">
                <p className="text-sm font-bold text-gray-800 dark:text-gray-100">{user?.name}</p>
                <button onClick={signOut} className="text-[11px] uppercase tracking-wide font-bold text-rose-500 hover:text-rose-600 transition-colors">
                    Sair
                </button>
            </div>
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-rose-100 to-orange-100 dark:from-rose-900/50 dark:to-orange-900/50 ring-2 ring-white dark:ring-[#16181D] flex items-center justify-center text-rose-600 dark:text-rose-200 font-bold text-sm shadow-sm select-none">
                {user?.name?.substring(0, 2).toUpperCase()}
            </div>
        </div>

      </div>
    </header>
  );
};