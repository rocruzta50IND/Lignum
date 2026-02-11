import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface ChatSidebarProps { boardId: string; }

export const ChatSidebar: React.FC<ChatSidebarProps> = ({ boardId }) => {
  const { user } = useAuth();
  
  // Mock de usuários para o design (no futuro virá do backend)
  const demoUsers = [
    { id: '1', name: 'Ana Silva', status: 'online' },
    { id: '2', name: 'Carlos Mendes', status: 'busy' },
    { id: '3', name: 'Mariana Costa', status: 'offline' },
    { id: user?.id || 'me', name: `${user?.name} (Você)`, status: 'online', isMe: true }
  ];

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  const getStatusColor = (status: string) => {
      switch(status) {
          case 'online': return 'bg-green-500';
          case 'busy': return 'bg-red-500';
          default: return 'bg-gray-400';
      }
  }

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      {/* Header da Sidebar */}
      <div className="p-5 border-b border-gray-100 dark:border-gray-800/50 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-800 dark:text-white tracking-tight">Membros do Quadro</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{demoUsers.length} ativos</p>
          </div>
          <button className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#1F222A] text-gray-400 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
          </button>
      </div>
      
      {/* Lista de Usuários (Redesenhada) */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1">
        {demoUsers.map(u => (
            <div key={u.id} className={`flex items-center gap-3 p-2.5 rounded-xl transition-all cursor-pointer group ${u.isMe ? 'bg-rose-50/50 dark:bg-rose-900/10' : 'hover:bg-gray-50 dark:hover:bg-[#1F222A]'}`}>
                <div className="relative">
                    {/* Avatar mais elegante */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-sm border-2 border-white dark:border-[#16181D] ${u.isMe ? 'bg-rose-200 text-rose-700 dark:bg-rose-800 dark:text-rose-200' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}>
                        {getInitials(u.name)}
                    </div>
                    {/* Indicador de Status com borda */}
                    <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-[#16181D] ${getStatusColor(u.status)}`} title={u.status}></div>
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className={`text-sm font-semibold truncate ${u.isMe ? 'text-rose-900 dark:text-rose-300' : 'text-gray-800 dark:text-gray-200'}`}>{u.name}</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">
                        {u.status === 'online' ? 'Disponível' : u.status === 'busy' ? 'Ocupado' : 'Ausente'}
                    </p>
                </div>
            </div>
        ))}
      </div>

      {/* Área de Chat (Placeholder) */}
      <div className="p-4 border-t border-gray-100 dark:border-gray-800/50 bg-gray-50/50 dark:bg-[#1F222A]/50">
          <div className="relative">
            <input 
                placeholder="Enviar mensagem..." 
                className="w-full bg-white dark:bg-[#16181D] border border-gray-200 dark:border-gray-700 rounded-xl py-3 pl-4 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50 transition-shadow dark:text-white placeholder:text-gray-400 shadow-sm"
            />
            <button className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" /></svg>
            </button>
          </div>
      </div>
    </div>
  );
};