import React, { useEffect, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface SettingsMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  userEmail?: string;
}

export const SettingsMenu: React.FC<SettingsMenuProps> = ({ isOpen, onClose, onLogout, userEmail }) => {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { theme, toggleTheme } = useTheme();

  // Fecha ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      ref={dropdownRef}
      className="absolute top-16 right-6 w-72 bg-white dark:bg-[#16181D] rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 py-2 z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right"
    >
      {/* Header do Menu */}
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800/50 mb-2 bg-gray-50/50 dark:bg-[#1F222A]/30">
        <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Conectado como</p>
        <p className="text-sm font-bold text-gray-800 dark:text-white truncate">{userEmail}</p>
      </div>

      <div className="px-2 space-y-1">
        
        {/* Item Perfil */}
        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1F222A] transition-colors text-left group">
            <svg className="w-5 h-5 text-gray-400 group-hover:text-rose-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            Meu Perfil
        </button>

        {/* Item Tema (Toggle Switch Animado) */}
        <button 
            onClick={toggleTheme}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1F222A] transition-colors text-left group cursor-pointer"
        >
            <div className="flex items-center gap-3">
                {theme === 'dark' ? (
                    <svg className="w-5 h-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                ) : (
                    <svg className="w-5 h-5 text-gray-400 group-hover:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                )}
                Modo Escuro
            </div>
            
            {/* O Switch Visual */}
            <div 
                className={`w-11 h-6 rounded-full relative transition-colors duration-300 ease-in-out ${
                    theme === 'dark' ? 'bg-rose-500' : 'bg-gray-300'
                }`}
            >
                <div 
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300 ease-in-out ${
                        theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
                    }`}
                />
            </div>
        </button>

        <div className="h-px bg-gray-100 dark:bg-gray-800/50 my-2 mx-2"></div>

        {/* Item Sair */}
        <button 
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors text-left"
        >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            Sair da conta
        </button>
      </div>
    </div>
  );
};