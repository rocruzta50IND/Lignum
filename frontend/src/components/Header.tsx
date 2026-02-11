import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { NotificationsMenu } from './NotificationsMenu';
import { UserAvatar } from './UserAvatar'; // Novo componente para avatar

export const Header: React.FC = () => {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [hasUnread, setHasUnread] = useState(false);
  
  // Novo estado para o menu de configurações
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const settingsMenuRef = useRef<HTMLDivElement>(null);

  // Fecha o menu se clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(event.target as Node)) {
        setShowSettingsMenu(false);
      }
    };
    if (showSettingsMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSettingsMenu]);

  const loadNotifications = async () => {
      if (!showNotifications) {
          try {
              const res = await api.get('/notifications');
              setNotifications(res.data);
          } catch (error) { console.error(error); }
      }
      setShowNotifications(!showNotifications);
  };

  const markAsRead = async (id: string) => {
      try {
          await api.patch(`/notifications/${id}/read`);
          setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      } catch (e) { console.error(e); }
  };

  return (
    <header className="h-16 bg-white dark:bg-[#16181D] border-b border-gray-100 dark:border-gray-800/50 flex items-center justify-between px-8 sticky top-0 z-40 transition-colors">
      
      {/* LOGO -> Dashboard */}
      <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => navigate('/')}>
        <h1 className="text-xl font-black bg-gradient-to-r from-rose-500 to-orange-500 bg-clip-text text-transparent tracking-tight">Lignum</h1>
      </div>

      {/* LADO DIREITO */}
      <div className="flex items-center gap-6">
        
        {/* Notificações */}
        <div className="relative">
            <button onClick={loadNotifications} className="relative p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                {hasUnread && <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white dark:border-[#16181D]"></span>}
            </button>
            <NotificationsMenu isOpen={showNotifications} onClose={() => setShowNotifications(false)} notifications={notifications} onMarkAsRead={markAsRead} />
        </div>

        <div className="h-6 w-px bg-gray-200 dark:bg-gray-700"></div>

        <div className="flex items-center gap-3">
            {/* User Info */}
            <div className="text-right hidden md:block">
                <p className="text-sm font-bold text-gray-700 dark:text-gray-200 leading-none">{user?.name}</p>
                <span className="text-[10px] text-green-500 font-bold tracking-wider uppercase">Online</span>
            </div>

            {/* AVATAR -> VAI PARA PERFIL */}
            <button 
                onClick={() => navigate('/profile')}
                className="hover:opacity-80 transition-opacity"
                title="Meu Perfil"
            >
                {/* Agora usamos o componente único! */}
                <UserAvatar user={user} size="md" />
            </button>
            
            {/* ENGRENAGEM (SETTINGS MENU) */}
            <div className="relative" ref={settingsMenuRef}>
                <button 
                    onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                    className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </button>

                {/* DROPDOWN MENU */}
                {showSettingsMenu && (
                    <div className="absolute right-0 top-12 w-48 bg-white dark:bg-[#16181D] rounded-xl shadow-2xl border border-gray-100 dark:border-gray-800 p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                        <div className="text-xs font-bold text-gray-400 uppercase px-3 py-2">Configurações</div>
                        
                        {/* Dark Mode Toggle */}
                        <button 
                            onClick={toggleTheme}
                            className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#1F222A] rounded-lg transition-colors flex items-center gap-2"
                        >
                            {theme === 'dark' ? (
                                <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg> Modo Claro</>
                            ) : (
                                <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg> Modo Escuro</>
                            )}
                        </button>

                        <div className="my-1 border-t border-gray-100 dark:border-gray-800/50"></div>

                        {/* Logout */}
                        <button 
                            onClick={signOut}
                            className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex items-center gap-2 font-medium"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                            Sair
                        </button>
                    </div>
                )}
            </div>
        </div>
      </div>
    </header>
  );
};