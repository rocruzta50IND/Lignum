import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { SettingsMenu } from './SettingsMenu';
import { NotificationsMenu } from './NotificationsMenu'; // Importar
import { api } from '../services/api';

interface HeaderProps { boardTitle?: string; }

export const Header: React.FC<HeaderProps> = ({ boardTitle }) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  
  // Estado real de notificações
  const [notifications, setNotifications] = useState<any[]>([]);
  const hasUnread = notifications.some(n => !n.is_read);

  // Busca notificações periodicamente (simples polling)
  useEffect(() => {
      const fetchNotifs = async () => {
          try { const res = await api.get('/notifications'); setNotifications(res.data); } catch(e) {}
      };
      if(user) fetchNotifs();
      const interval = setInterval(fetchNotifs, 10000); // Atualiza a cada 10s
      return () => clearInterval(interval);
  }, [user]);

  const handleMarkAsRead = async (id: string) => {
      try {
          await api.patch(`/notifications/${id}/read`);
          setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      } catch(e) { console.error(e); }
  };

  const isDashboard = location.pathname === '/';

  return (
    <>
    <header className="h-16 flex-shrink-0 bg-white/80 dark:bg-[#16181D]/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-6 md:px-8 transition-colors z-40 sticky top-0">
      
      {/* ESQUERDA (Igual ao anterior) */}
      <div className="flex items-center h-full">
        {!isDashboard && (
            <button onClick={() => navigate('/')} className="mr-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-gray-500 dark:text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            </button>
        )}
        <div className="flex items-center gap-2 cursor-pointer group select-none" onClick={() => navigate('/')} role="button">
            <span className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-rose-600 to-orange-500 tracking-tight group-hover:opacity-90 transition-opacity">Lignum</span>
        </div>
        {!isDashboard && boardTitle && (
            <div className="hidden sm:flex items-center ml-4 pl-4 border-l-2 border-gray-200 dark:border-gray-700 h-6 animate-in fade-in slide-in-from-left-2">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-[#1F222A] px-3 py-1 rounded-md">{boardTitle}</span>
            </div>
        )}
      </div>

      {/* DIREITA */}
      <div className="flex items-center gap-3 md:gap-4 h-full">
        
        {/* BOTÃO DE NOTIFICAÇÕES (Funcional) */}
        <button 
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className={`p-2 rounded-lg transition-all relative ${isNotifOpen ? 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400' : 'text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#252830]'}`}
            title="Notificações"
        >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {hasUnread && <span className="absolute top-2 right-2.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white dark:border-[#16181D]"></span>}
        </button>

        <div className="h-6 w-px bg-gray-200 dark:bg-gray-800"></div>

        {/* User & Settings (Igual ao anterior) */}
        <div className="flex items-center gap-3">
             <div className="text-right hidden md:block leading-tight">
                <p className="text-sm font-bold text-gray-800 dark:text-gray-100">{user?.name}</p>
                <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Online</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-rose-100 to-orange-100 dark:from-rose-900/50 dark:to-orange-900/50 ring-2 ring-white dark:ring-[#16181D] flex items-center justify-center text-rose-600 dark:text-rose-200 font-bold text-sm shadow-sm select-none">
                {user?.name?.substring(0, 2).toUpperCase()}
            </div>
        </div>

        <button 
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className={`p-2 rounded-lg transition-all duration-200 ${isSettingsOpen ? 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400 rotate-90' : 'text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#252830]'}`}
        >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
        </button>

      </div>
    </header>

    <SettingsMenu isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} onLogout={signOut} userEmail={user?.email} />
    <NotificationsMenu isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} notifications={notifications} onMarkAsRead={handleMarkAsRead} />
    </>
  );
};