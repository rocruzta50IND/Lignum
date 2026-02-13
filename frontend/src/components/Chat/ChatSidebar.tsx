import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import { socket } from '../../services/socket'; // <--- USANDO O SOCKET GLOBAL (CORRETO)
import { UserAvatar } from '../UserAvatar';
import { useNavigate } from 'react-router-dom';

interface ChatSidebarProps { boardId: string; }

interface Message {
  id: string;
  content: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
  created_at: string;
}

interface Member {
  id: string;
  name: string;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({ boardId }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const [showMentionList, setShowMentionList] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [boardMembers, setBoardMembers] = useState<Member[]>([]);
  const [mentionedIds, setMentionedIds] = useState<string[]>([]);

  useEffect(() => {
      // 1. Carregar membros
      api.get(`/boards`).then(res => {
          const currentBoard = res.data.find((b: any) => b.id === boardId);
          if (currentBoard && currentBoard.members) {
              setBoardMembers(currentBoard.members);
          }
      });

      // 2. Carregar histórico
      api.get(`/chat/${boardId}`).then(res => {
          setMessages(res.data);
          // Scroll para o fim ao carregar histórico
          setTimeout(() => scrollRef.current?.scrollIntoView(), 100);
      });

      // 3. Conexão Socket (USANDO A INSTÂNCIA GLOBAL)
      // Não precisamos de io('localhost') aqui, usamos o importado
      socket.emit('join_board', boardId);
      
      const handleReceiveMessage = (msg: Message) => {
          setMessages(prev => {
             // Evita duplicatas se o socket enviar algo que já temos
             if (prev.some(m => m.id === msg.id)) return prev;
             return [...prev, msg];
          });
          // Scroll suave ao receber msg nova
          setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      };

      socket.on('receive_message', handleReceiveMessage);

      // Cleanup
      return () => { 
          socket.off('receive_message', handleReceiveMessage);
          // Não desconectamos o socket global aqui, apenas removemos o listener
      };
  }, [boardId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setNewMessage(val);
      const lastWord = val.split(' ').pop();
      if (lastWord && lastWord.startsWith('@')) {
          setShowMentionList(true);
          setMentionQuery(lastWord.substring(1));
      } else {
          setShowMentionList(false);
      }
  };

  const selectUser = (member: Member) => {
      const parts = newMessage.split(' ');
      parts.pop(); 
      const finalMsg = `${parts.join(' ')} @${member.name} `; 
      setNewMessage(finalMsg);
      setMentionedIds(prev => [...prev, member.id]); 
      setShowMentionList(false);
      const input = document.getElementById('chat-input');
      input?.focus();
  };

  const handleSend = async () => {
      if (!newMessage.trim()) return;
      
      // Otimismo: Limpa o input antes do servidor responder
      const tempContent = newMessage;
      setNewMessage("");
      setShowMentionList(false);
      
      try {
          await api.post(`/chat/${boardId}`, {
              content: tempContent,
              mentionedUserIds: mentionedIds 
          });
          setMentionedIds([]); 
          // Não precisamos adicionar a mensagem manualmente aqui, 
          // pois o backend vai emitir 'receive_message' via socket e o useEffect vai pegar.
      } catch (e) {
          console.error("Erro ao enviar msg", e);
          // Se der erro, poderíamos restaurar o texto no input (opcional)
          setNewMessage(tempContent);
      }
  };

  const renderMessageContent = (content: string, isMe: boolean) => {
    if (!boardMembers.length) return content;

    const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const sortedMembers = [...boardMembers].sort((a, b) => b.name.length - a.name.length);
    const pattern = new RegExp(`(@(${sortedMembers.map(m => escapeRegExp(m.name)).join('|')}))`, 'g');
    const parts = content.split(pattern);

    return parts.map((part, index) => {
        if (part.startsWith('@')) {
            const name = part.substring(1);
            const isMember = boardMembers.some(m => m.name === name);
            
            if (isMember) {
                const tagStyle = isMe 
                    ? "bg-white/20 text-white shadow-sm" 
                    : "bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-300";

                return (
                    <span key={index} className={`font-bold px-1.5 py-0.5 rounded-md mx-0.5 inline-block select-none ${tagStyle}`}>
                        {part}
                    </span>
                );
            }
        }
        if (!part || boardMembers.some(m => part === m.name)) return null; 
        return <span key={index}>{part}</span>;
    });
  };

  const filteredMembers = boardMembers.filter(m => 
      m.name.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full w-full bg-white dark:bg-[#16181D] border-r border-gray-100 dark:border-gray-800/50">
      
      {/* HEADER */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-800/50 bg-gray-50/50 dark:bg-[#1F222A]/50 flex items-center justify-between shadow-sm z-10">
          <div className="flex items-center gap-3">
              <button 
                onClick={() => navigate('/')} 
                className="p-2 -ml-2 text-gray-400 hover:text-gray-800 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-[#2C2C2C] rounded-xl transition-all active:scale-95 group"
                title="Voltar para Dashboard"
              >
                  <svg className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
              </button>
              
              <div>
                <h2 className="text-sm font-bold text-gray-800 dark:text-white leading-none">Chat</h2>
                <span className="text-[10px] text-gray-400 font-medium">{boardMembers.length} membros</span>
              </div>
          </div>
          
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" title="Online"></div>
      </div>
      
      {/* MENSAGENS */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4 bg-[#F8FAFC] dark:bg-[#0F1117]">
        {messages.map((msg, idx) => {
            const isMe = msg.user_id === user?.id;

            return (
                <div key={msg.id || idx} className={`flex gap-3 mb-4 animate-in slide-in-from-bottom-2 duration-300 ${isMe ? 'flex-row-reverse' : ''}`}>
                    <div className="flex-shrink-0 mt-auto">
                        <UserAvatar 
                            src={msg.user_avatar} 
                            name={msg.user_name} 
                            size="sm" 
                            className="w-8 h-8 text-[10px]"
                        />
                    </div>

                    <div className={`flex flex-col max-w-[80%] ${isMe ? 'items-end' : 'items-start'}`}>
                        <div className={`flex items-center gap-2 mb-1 text-[10px] text-gray-400 ${isMe ? 'flex-row-reverse' : ''}`}>
                            <span className="font-bold text-gray-600 dark:text-gray-300">{msg.user_name}</span>
                            <span>{new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>

                        <div className={`px-4 py-2 rounded-2xl shadow-sm text-sm break-words relative group ${
                            isMe 
                            ? 'bg-rose-500 text-white rounded-br-none' 
                            : 'bg-white dark:bg-[#1F222A] text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-800 rounded-bl-none'
                        }`}>
                            {renderMessageContent(msg.content, isMe)}
                        </div>
                    </div>
                </div>
            );
        })}
        <div ref={scrollRef} />
      </div>

      {/* INPUT */}
      <div className="p-4 border-t border-gray-100 dark:border-gray-800/50 bg-white dark:bg-[#16181D] relative z-20">
          
          {showMentionList && filteredMembers.length > 0 && (
              <div className="absolute bottom-20 left-4 w-60 bg-white dark:bg-[#252830] rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-in zoom-in-95 duration-100 mb-2 z-50">
                  <div className="bg-gray-50 dark:bg-[#1F222A] px-3 py-2 text-xs font-bold text-gray-500 uppercase">Mencionar</div>
                  {filteredMembers.map(member => (
                      <button 
                        key={member.id}
                        onClick={() => selectUser(member)}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-600 transition-colors flex items-center gap-2"
                      >
                          <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-[9px] font-bold">{member.name.substring(0,2)}</div>
                          {member.name}
                      </button>
                  ))}
              </div>
          )}

          <div className="relative">
            <input 
                id="chat-input"
                value={newMessage}
                onChange={handleInputChange}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Digite sua mensagem... (@ para mencionar)" 
                className="w-full bg-gray-50 dark:bg-[#1F222A] border border-gray-200 dark:border-gray-700 rounded-xl py-3 pl-4 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50 transition-all dark:text-white placeholder:text-gray-400 shadow-sm"
                autoComplete="off"
            />
            <button 
                onClick={handleSend}
                disabled={!newMessage.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" /></svg>
            </button>
          </div>
      </div>
    </div>
  );
};