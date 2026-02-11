import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { SettingsMenu } from './SettingsMenu';

interface HeaderProps {
  boardTitle?: string;
}

export const Header: React.FC<HeaderProps> = ({ boardTitle }) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const isDashboard = location.pathname === '/';

  return (
    <>
    <header className="h-16 flex-shrink-0 bg-white/80 dark:bg-[#16181D]/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-6 md:px-8 transition-colors z-40 sticky top-0">
      
      {/* LADO ESQUERDO: Navegação */}
      <div className="flex items-center h-full">
        {!isDashboard && (
            <button 
                onClick={() => navigate('/')}
                className="mr-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-gray-500 dark:text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors flex items-center justify-center"
                title="Voltar para os Quadros"
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            </button>
        )}

        <div className="flex items-center gap-2 cursor-pointer group select-none" onClick={() => navigate('/')} role="button">
            <span className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-rose-600 to-orange-500 tracking-tight group-hover:opacity-90 transition-opacity">
                Lignum
            </span>
        </div>

        {!isDashboard && boardTitle && (
            <div className="hidden sm:flex items-center ml-4 pl-4 border-l-2 border-gray-200 dark:border-gray-700 h-6 animate-in fade-in slide-in-from-left-2">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-[#1F222A] px-3 py-1 rounded-md">
                    {boardTitle}
                </span>
            </div>
        )}
      </div>

      {/* LADO DIREITO: Apenas Perfil e Configurações */}
      <div className="flex items-center gap-3 md:gap-5 h-full">
        
        {/* User Profile (Visual) */}
        <div className="flex items-center gap-3">
            <div className="text-right hidden md:block leading-tight">
                <p className="text-sm font-bold text-gray-800 dark:text-gray-100">{user?.name}</p>
                <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Online</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-rose-100 to-orange-100 dark:from-rose-900/50 dark:to-orange-900/50 ring-2 ring-white dark:ring-[#16181D] flex items-center justify-center text-rose-600 dark:text-rose-200 font-bold text-sm shadow-sm select-none">
                {user?.name?.substring(0, 2).toUpperCase()}
            </div>
        </div>

        {/* Separador */}
        <div className="h-8 w-px bg-gray-200 dark:bg-gray-800"></div>

        {/* BOTÃO DE SETTINGS (Engrenagem) */}
        <button 
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className={`p-2 rounded-lg transition-all duration-200 ${isSettingsOpen ? 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400 rotate-90' : 'text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#252830]'}`}
            title="Configurações"
        >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
        </button>

      </div>
    </header>

    <SettingsMenu 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        onLogout={signOut}
        userEmail={user?.email}
    />
    </>
  );
};