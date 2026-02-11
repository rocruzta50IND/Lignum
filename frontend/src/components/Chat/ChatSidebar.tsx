import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import { io, Socket } from 'socket.io-client';

interface ChatSidebarProps { boardId: string; }

interface Message {
    id: string;
    content: string;
    user_id: string;
    user_name: string;
    created_at: string;
}

interface Member {
    id: string;
    name: string;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({ boardId }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [socket, setSocket] = useState<Socket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // States para Menção (@)
  const [showMentionList, setShowMentionList] = useState(false);
  const [mentionQuery, setMentionQuery] = useState(""); // O que o usuário digitou depois do @
  const [boardMembers, setBoardMembers] = useState<Member[]>([]);
  const [mentionedIds, setMentionedIds] = useState<string[]>([]); // IDs acumulados para enviar ao backend

  // 1. Conexão Socket e Load Inicial
  useEffect(() => {
      // Carrega membros para o autocomplete
      api.get(`/boards`).then(res => {
          const currentBoard = res.data.find((b: any) => b.id === boardId);
          if (currentBoard && currentBoard.members) {
              // Os membros vêm num formato JSON array, precisamos garantir o parse
              // O backend retorna [{name, id}]
              setBoardMembers(currentBoard.members);
          }
      });

      // Carrega histórico
      api.get(`/chat/${boardId}`).then(res => setMessages(res.data));

      // Conecta Socket
      const newSocket = io('http://localhost:3000'); // Ajuste a URL se necessário
      newSocket.emit('join_board', boardId);
      
      newSocket.on('receive_message', (msg: Message) => {
          setMessages(prev => [...prev, msg]);
          // Scroll automático suave
          setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      });

      setSocket(newSocket);

      return () => { newSocket.disconnect(); };
  }, [boardId]);

  // Scroll ao abrir
  useEffect(() => { scrollRef.current?.scrollIntoView(); }, [messages]);

  // 2. Lógica de Input (Detectar @)
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setNewMessage(val);

      // Regex simples: Se a última palavra começa com @
      const lastWord = val.split(' ').pop();
      if (lastWord && lastWord.startsWith('@')) {
          setShowMentionList(true);
          setMentionQuery(lastWord.substring(1)); // Remove o @ para filtrar
      } else {
          setShowMentionList(false);
      }
  };

  // 3. Selecionar Usuário da Lista
  const selectUser = (member: Member) => {
      const parts = newMessage.split(' ');
      parts.pop(); // Remove o termo de busca incompleto (ex: @rodr)
      const finalMsg = `${parts.join(' ')} @${member.name} `; // Adiciona o nome completo
      
      setNewMessage(finalMsg);
      setMentionedIds(prev => [...prev, member.id]); // Guarda o ID para notificar
      setShowMentionList(false);
      
      // Foca de volta no input
      const input = document.getElementById('chat-input');
      input?.focus();
  };

  // 4. Enviar Mensagem
  const handleSend = async () => {
      if (!newMessage.trim()) return;
      
      try {
          await api.post(`/chat/${boardId}`, {
              content: newMessage,
              mentionedUserIds: mentionedIds // Envia quem foi marcado
          });
          setNewMessage("");
          setMentionedIds([]); // Limpa lista de menções da msg atual
      } catch (e) {
          console.error("Erro ao enviar msg", e);
      }
  };

  // Filtra a lista de membros baseado no que foi digitado após o @
  const filteredMembers = boardMembers.filter(m => 
      m.name.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full w-full bg-white dark:bg-[#16181D]">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-800/50 flex justify-between items-center">
          <h2 className="text-sm font-bold text-gray-800 dark:text-white">Chat da Equipe</h2>
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
      </div>
      
      {/* Lista de Mensagens */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
        {messages.map((msg, i) => {
            const isMe = msg.user_id === user?.id;
            return (
                <div key={i} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-end gap-2 max-w-[85%]">
                        {!isMe && (
                            <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[9px] font-bold text-gray-600 dark:text-gray-300">
                                {msg.user_name.substring(0,2).toUpperCase()}
                            </div>
                        )}
                        <div className={`p-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                            isMe 
                            ? 'bg-rose-500 text-white rounded-br-none' 
                            : 'bg-gray-100 dark:bg-[#1F222A] text-gray-800 dark:text-gray-200 rounded-bl-none border border-gray-200 dark:border-gray-700/50'
                        }`}>
                            {/* Renderiza o nome em negrito se for menção (lógica simples visual) */}
                            {msg.content.split(' ').map((word, idx) => 
                                word.startsWith('@') ? <span key={idx} className="font-bold bg-black/10 dark:bg-white/10 px-1 rounded">{word} </span> : word + ' '
                            )}
                        </div>
                    </div>
                    <span className="text-[10px] text-gray-400 mt-1 px-1">
                        {new Date(msg.created_at).toLocaleTimeString().slice(0,5)}
                    </span>
                </div>
            );
        })}
        <div ref={scrollRef} />
      </div>

      {/* Área de Input */}
      <div className="p-4 border-t border-gray-100 dark:border-gray-800/50 bg-gray-50/30 dark:bg-[#1F222A]/30 relative">
          
          {/* POPOVER DE MENÇÃO (@) */}
          {showMentionList && filteredMembers.length > 0 && (
              <div className="absolute bottom-16 left-4 w-60 bg-white dark:bg-[#252830] rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-in zoom-in-95 duration-100 mb-2">
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
                placeholder="Digite sua mensagem" 
                className="w-full bg-white dark:bg-[#16181D] border border-gray-200 dark:border-gray-700 rounded-xl py-3 pl-4 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50 transition-all dark:text-white placeholder:text-gray-400 shadow-sm"
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