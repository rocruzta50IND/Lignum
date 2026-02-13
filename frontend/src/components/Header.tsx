import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { socket } from '../services/socket'; // <--- IMPORTANTE: Socket Global
import { NotificationsMenu } from './NotificationsMenu';
import { UserAvatar } from './UserAvatar';

// Interface local para evitar erros de typescript se não tiver no global
interface Notification {
  id: string;
  content: string;
  is_read: boolean;
  resource_link: string;
  created_at: string;
}

export const Header: React.FC = () => {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Menu de configurações
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const settingsMenuRef = useRef<HTMLDivElement>(null);

  // Fecha menus ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(event.target as Node)) {
        setShowSettingsMenu(false);
      }
    };
    if (showSettingsMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSettingsMenu]);

  // Função para buscar notificações iniciais
  const fetchNotifications = async () => {
      try {
          const res = await api.get('/notifications');
          setNotifications(res.data);
          // Calcula não lidas
          const count = res.data.filter((n: Notification) => !n.is_read).length;
          setUnreadCount(count);
      } catch (error) { console.error(error); }
  };

  // 1. EFEITO PRINCIPAL: SOCKET + CARGA INICIAL
  useEffect(() => {
      if (user) {
          // A. Busca inicial via API
          fetchNotifications();

          // B. Conecta no Socket (Sala Privada)
          console.log(`🔔 Header conectando socket para user: ${user.id}`);
          socket.emit('join_user', user.id);

          // C. Ouve novas notificações em tempo real
          const handleNewNotification = (newNotif: Notification) => {
              console.log("🔔 Nova notificação recebida no Header:", newNotif);
              
              // Adiciona na lista
              setNotifications(prev => [newNotif, ...prev]);
              
              // Incrementa contador vermelho
              setUnreadCount(prev => prev + 1);

              // Toca um som suave (opcional - descomente se tiver o arquivo)
              // new Audio('/notification.mp3').play().catch(() => {});
          };

          socket.on('new_notification', handleNewNotification);

          // Cleanup ao desmontar
          return () => {
              socket.off('new_notification', handleNewNotification);
              // socket.emit('leave_user', user.id); // Opcional
          };
      }
  }, [user]);

  const toggleNotifications = () => {
      // Ao abrir, buscamos de novo só pra garantir
      if (!showNotifications) fetchNotifications();
      setShowNotifications(!showNotifications);
  };

  const markAsRead = async (id: string) => {
      try {
          // Atualiza visualmente na hora (Otimista)
          setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
          setUnreadCount(prev => Math.max(0, prev - 1));
          
          // Manda pro backend
          await api.patch(`/notifications/${id}/read`);
      } catch (e) { console.error(e); }
  };

  return (
    <header className="h-16 bg-white dark:bg-[#16181D] border-b border-gray-100 dark:border-gray-800/50 flex items-center justify-between px-8 sticky top-0 z-40 transition-colors">
      
      {/* LOGO */}
      <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => navigate('/')}>
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center text-white font-bold text-lg shadow-rose-500/20 shadow-lg">L</div>
        <h1 className="text-xl font-black text-gray-800 dark:text-white tracking-tight hidden md:block">Lignum</h1>
      </div>

      <div className="flex items-center gap-6">
        
        {/* SINO DE NOTIFICAÇÕES */}
        <div className="relative">
            <button 
                onClick={toggleNotifications} 
                className={`relative p-2 rounded-full transition-colors ${showNotifications ? 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
            >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                
                {/* Badge Numérico Vermelho */}
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full border-2 border-white dark:border-[#16181D] animate-in zoom-in">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>
            <NotificationsMenu 
                isOpen={showNotifications} 
                onClose={() => setShowNotifications(false)} 
                notifications={notifications} 
                onMarkAsRead={markAsRead} 
            />
        </div>

        <div className="h-6 w-px bg-gray-200 dark:bg-gray-700"></div>

        <div className="flex items-center gap-3">
            <div className="text-right hidden md:block">
                <p className="text-sm font-bold text-gray-700 dark:text-gray-200 leading-none">{user?.name}</p>
                <span className="text-[10px] text-green-500 font-bold tracking-wider uppercase">Online</span>
            </div>

            {/* AVATAR COM FOTO */}
            <button onClick={() => navigate('/profile')} className="transition-transform hover:scale-105 active:scale-95">
                <UserAvatar user={user} size="md" />
            </button>
            
            {/* ENGRENAGEM */}
            <div className="relative" ref={settingsMenuRef}>
                <button onClick={() => setShowSettingsMenu(!showSettingsMenu)} className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </button>

                {showSettingsMenu && (
                    <div className="absolute right-0 top-12 w-48 bg-white dark:bg-[#16181D] rounded-xl shadow-xl border border-gray-100 dark:border-gray-800 p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                        <button onClick={toggleTheme} className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#1F222A] rounded-lg transition-colors flex items-center gap-2">
                            {theme === 'dark' ? '☀️ Modo Claro' : '🌙 Modo Escuro'}
                        </button>
                        <div className="my-1 border-t border-gray-100 dark:border-gray-800/50"></div>
                        <button onClick={signOut} className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex items-center gap-2 font-bold">
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