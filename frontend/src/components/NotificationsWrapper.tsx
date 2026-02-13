import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { socket } from '../services/socket';
import { useAuth } from '../contexts/AuthContext';
import { NotificationsMenu } from './NotificationsMenu'; // Importe seu menu visual

export const NotificationsWrapper: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // 1. CARREGAR DO BANCO
  useEffect(() => {
    if (!user) return;
    
    // Entrar na sala privada do usuário
    socket.emit('join_user', user.id);

    api.get('/notifications').then(res => {
      setNotifications(res.data);
      setUnreadCount(res.data.filter((n: any) => !n.is_read).length);
    });

    // 2. ESCUTAR SOCKET (Real-Time)
    socket.on('new_notification', (newNotif) => {
      setNotifications(prev => [newNotif, ...prev]);
      setUnreadCount(prev => prev + 1);
      
      // Tocar um som suave (opcional)
      const audio = new Audio('/notification.mp3'); // Se tiver
      audio.play().catch(() => {}); 
    });

    return () => {
      socket.off('new_notification');
      socket.emit('leave_user', user.id); // Boa prática se implementado no back
    };
  }, [user]);

  const markAsRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="relative">
      {/* BOTÃO DO SINO */}
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="p-2 text-gray-400 hover:text-gray-800 dark:hover:text-white rounded-xl hover:bg-gray-100 dark:hover:bg-[#2C2C2C] transition-all relative"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        
        {/* BOLINHA VERMELHA */}
        {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 border-2 border-white dark:border-[#16181D] rounded-full animate-bounce"></span>
        )}
      </button>

      {/* MENU VISUAL (O seu componente) */}
      <NotificationsMenu 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
        notifications={notifications}
        onMarkAsRead={markAsRead}
      />
    </div>
  );
};