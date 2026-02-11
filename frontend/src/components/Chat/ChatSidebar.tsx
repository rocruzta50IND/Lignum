import React, { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';
import { chatService } from '../../services/chatService';
import type { ChatMessage } from '../../types';

const SOCKET_URL = 'http://localhost:3000';

interface ChatSidebarProps {
  boardId: string;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({ boardId }) => {
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Como o Backend está mockando o user, vamos assumir que o ID retornado nas mensagens
  // "minhas" é o mesmo ID do user mockado no seed.
  // Para testar visualmente "Eu vs Outros", você pode mudar este ID temporariamente.
  const CURRENT_USER_MOCK_ID = "mock-user-id"; 

  // 1. Carregar Histórico
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['chat', boardId],
    queryFn: () => chatService.getHistory(boardId),
    refetchOnWindowFocus: false,
  });

  // 2. Socket Real-Time
  useEffect(() => {
    const socket: Socket = io(SOCKET_URL, { transports: ['websocket'] });

    socket.emit('join_board', boardId);

    socket.on('chat_message', (message: ChatMessage) => {
      queryClient.setQueryData<ChatMessage[]>(['chat', boardId], (oldData) => {
        if (!oldData) return [message];
        // Evita duplicatas
        if (oldData.some(m => m.id === message.id)) return oldData;
        return [...oldData, message];
      });
    });

    return () => {
      socket.off('chat_message');
      socket.disconnect();
    };
  }, [boardId, queryClient]);

  // 3. Auto-Scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 4. Enviar Mensagem
  const sendMessageMutation = useMutation({
    mutationFn: (content: string) => chatService.sendMessage(boardId, content),
    onMutate: () => setNewMessage(''),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    sendMessageMutation.mutate(newMessage);
  };

  return (
    <aside className="w-[300px] flex flex-col border-r border-[#333] bg-[#161616] h-full">
      <div className="p-4 border-b border-[#333] bg-[#161616] flex justify-between items-center shadow-sm z-10">
        <h2 className="text-lignum-text-primary font-bold text-sm uppercase tracking-wide">
          Chat da Equipe
        </h2>
        <div className="flex items-center gap-2">
           <span className="text-[10px] text-gray-500">Ao Vivo</span>
           <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-700">
        {isLoading ? (
          <div className="text-center text-xs text-gray-500 mt-4">Carregando...</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-xs text-gray-600 mt-10">
            Nenhuma mensagem. Diga olá! 👋
          </div>
        ) : (
          messages.map((msg) => {
             // Lógica de "Quem sou eu?" baseada no objeto user
             // Nota: Como não temos login real, todas as mensagens virão como "Eu" se usarmos o ID do seed.
             // Para ver "Outros", você teria que abrir o banco e mudar o user_id de uma mensagem manualmente.
             const isMe = msg.user.id === CURRENT_USER_MOCK_ID; 

             return (
              <div 
                key={msg.id} 
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div 
                  className={`
                    max-w-[90%] p-3 rounded-xl text-sm leading-relaxed shadow-sm break-words
                    ${msg.isPinned ? 'border border-yellow-600/50 bg-yellow-900/10' : ''}
                    ${isMe 
                      ? 'bg-lignum-accent-blue/20 text-blue-100 rounded-tr-none' 
                      : 'bg-[#2C2C2C] text-lignum-text-primary rounded-tl-none'}
                  `}
                >
                  {!isMe && (
                    <span className="block text-[10px] text-gray-400 font-bold mb-1">
                      {msg.user.name}
                    </span>
                  )}
                  {msg.content}
                </div>
                
                <span className="text-[10px] text-gray-600 mt-1 px-1">
                  {new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 bg-[#161616] border-t border-[#333]">
        <form onSubmit={handleSubmit} className="relative">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Digite..."
            className="w-full bg-[#0a0a0a] text-lignum-text-primary text-sm rounded-lg pl-4 pr-10 py-3 focus:outline-none focus:ring-1 focus:ring-lignum-accent-blue border border-[#333] placeholder-gray-600"
          />
          <button 
            type="submit"
            disabled={!newMessage.trim()}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-lignum-accent-blue disabled:opacity-50 transition-colors p-1"
          >
            ➤
          </button>
        </form>
      </div>
    </aside>
  );
};