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
      onMarkAsRead(notif.id);
      if(notif.resource_link) {
          navigate(notif.resource_link);
          onClose();
      }
  };

  return (
    <div ref={menuRef} className="absolute top-16 right-20 w-80 bg-white dark:bg-[#16181D] rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 py-2 z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
      <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800/50 mb-1">
        <p className="text-sm font-bold text-gray-800 dark:text-white">Notificações</p>
      </div>
      <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
          {notifications.length === 0 ? (
              <div className="p-6 text-center text-gray-400 text-sm">Nada por aqui.</div>
          ) : (
              notifications.map(n => (
                  <div 
                    key={n.id} 
                    onClick={() => handleClick(n)}
                    className={`px-4 py-3 hover:bg-gray-50 dark:hover:bg-[#1F222A] cursor-pointer transition-colors border-b border-gray-50 dark:border-gray-800/30 last:border-0 ${!n.is_read ? 'bg-rose-50/30 dark:bg-rose-900/10' : ''}`}
                  >
                      <p className={`text-sm ${!n.is_read ? 'font-bold text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                          {n.content}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-1">{new Date(n.created_at).toLocaleDateString()} às {new Date(n.created_at).toLocaleTimeString().slice(0,5)}</p>
                  </div>
              ))
          )}
      </div>
    </div>
  );
};