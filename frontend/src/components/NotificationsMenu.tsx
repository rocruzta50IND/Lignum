import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

interface Notification {
  id: string;
  content: string;
  is_read: boolean;
  resource_link: string;
  created_at: string;
}

interface NotificationsMenuProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
}

export const NotificationsMenu: React.FC<NotificationsMenuProps> = ({ isOpen, onClose, notifications, onMarkAsRead }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) onClose();
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleClick = (notif: Notification) => {
      // Navegação ao clicar
      if(notif.resource_link && notif.resource_link !== '#') {
          navigate(notif.resource_link);
          onClose();
      }
  };

  // Nova função para o Hover
  const handleHover = (notif: Notification) => {
      if (!notif.is_read) {
          onMarkAsRead(notif.id); // Chama a função que já atualiza o contador e a cor
      }
  };

  return (
    <div ref={menuRef} className="absolute top-16 right-0 w-80 bg-white dark:bg-[#16181D] rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 py-2 z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
      <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800/50 mb-1 flex justify-between items-center">
        <p className="text-sm font-bold text-gray-800 dark:text-white">Notificações</p>
        {notifications.length > 0 && (
            <span className="text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-500 px-2 py-0.5 rounded-full">{notifications.length}</span>
        )}
      </div>
      
      <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
          {notifications.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center gap-2">
                  <div className="w-10 h-10 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-300">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                  </div>
                  <p className="text-xs text-gray-400">Tudo limpo por aqui.</p>
              </div>
          ) : (
              notifications.map(n => (
                  <div 
                    key={n.id} 
                    onClick={() => handleClick(n)}
                    onMouseEnter={() => handleHover(n)} // <--- A MÁGICA ACONTECE AQUI
                    className={`relative px-4 py-3.5 cursor-pointer transition-all duration-500 border-b border-gray-50 dark:border-gray-800/30 last:border-0 group 
                    ${!n.is_read 
                        ? 'bg-blue-50/60 dark:bg-blue-900/20' // Fundo mais visível quando não lida
                        : 'bg-transparent hover:bg-gray-50 dark:hover:bg-[#1F222A]' // Fundo limpo quando lida
                    }`}
                  >
                      <div className="flex gap-3">
                          {/* Indicador visual (Bolinha) - Some suavemente com transition-opacity */}
                          <div className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 transition-all duration-300 ${!n.is_read ? 'bg-blue-500 opacity-100 scale-100' : 'bg-transparent opacity-0 scale-0'}`}></div>
                          
                          <div>
                              <p className={`text-sm leading-snug transition-all duration-300 ${!n.is_read ? 'font-bold text-gray-900 dark:text-white' : 'font-medium text-gray-600 dark:text-gray-400'}`}>
                                  {n.content}
                              </p>
                              <p className="text-[10px] text-gray-400 mt-1.5 flex items-center gap-1">
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                  {new Date(n.created_at).toLocaleDateString()} às {new Date(n.created_at).toLocaleTimeString().slice(0,5)}
                              </p>
                          </div>
                      </div>
                  </div>
              ))
          )}
      </div>
    </div>
  );
};