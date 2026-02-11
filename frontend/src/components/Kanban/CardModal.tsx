import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import type { Card, ChecklistItem, Comment } from '../../types';

interface CardModalProps {
  isOpen: boolean;
  card: Card;
  boardId: string;
  onClose: () => void;
  onUpdateLocal: (card: Card) => void;
  onDelete: () => void;
}

export const CardModal: React.FC<CardModalProps> = ({ isOpen, card, boardId, onClose, onUpdateLocal, onDelete }) => {
  if (!isOpen) return null;

  // --- ESTADOS ---
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description || '');
  const [priority, setPriority] = useState(card.priority || 'Baixa');
  const [dueDate, setDueDate] = useState(card.dueDate ? card.dueDate.split('T')[0] : '');
  
  // Checklist
  const [checklist, setChecklist] = useState<ChecklistItem[]>(card.checklist || []);
  const [newChecklistItem, setNewChecklistItem] = useState('');

  // Comentários
  const [comments, setComments] = useState<Comment[]>(card.comments || []);
  const [newComment, setNewComment] = useState('');

  // Estado visual para confirmação de exclusão (Substitui o window.alert)
  const [isDeleting, setIsDeleting] = useState(false);

  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  // Sincroniza se o card mudar externamente
  useEffect(() => {
    setTitle(card.title);
    setDescription(card.description || '');
    setPriority(card.priority || 'Baixa');
    setDueDate(card.dueDate ? card.dueDate.split('T')[0] : '');
    setChecklist(card.checklist || []);
    setComments(card.comments || []);
    setIsDeleting(false); // Reseta o modo de exclusão ao abrir/trocar card
  }, [card]);

  // --- HANDLERS ---

  const addChecklistItem = () => {
    if (!newChecklistItem.trim()) return;
    const newItem: ChecklistItem = {
        id: crypto.randomUUID(),
        text: newChecklistItem,
        isChecked: false
    };
    setChecklist([...checklist, newItem]);
    setNewChecklistItem('');
  };

  const toggleCheckitem = (itemId: string) => {
      setChecklist(prev => prev.map(item => 
          item.id === itemId ? { ...item, isChecked: !item.isChecked } : item
      ));
  };

  const deleteCheckitem = (itemId: string) => {
      setChecklist(prev => prev.filter(item => item.id !== itemId));
  };

  const addComment = () => {
      if (!newComment.trim()) return;
      const comment: Comment = {
          id: crypto.randomUUID(),
          userId: 'user-current',
          userName: 'Eu',
          content: newComment,
          createdAt: new Date().toISOString()
      };
      setComments([comment, ...comments]);
      setNewComment('');
  };

  const handleSave = async () => {
    try {
        const payload = {
            title,
            description,
            priority,
            dueDate: dueDate || null,
            checklist,
            comments,
            columnId: card.columnId
        };

        const res = await api.put(`/cards/${card.id}`, payload);
        onUpdateLocal(res.data);
        onClose();
    } catch (e) {
        console.error(e);
        // Aqui você pode usar um toast no futuro
        console.log("Erro ao salvar");
    }
  };

  // Cálculo de Progresso
  const progress = checklist.length > 0 
      ? Math.round((checklist.filter(i => i.isChecked).length / checklist.length) * 100) 
      : 0;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-white dark:bg-[#1E1E1E] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors">
        
        {/* --- HEADER --- */}
        <div className="flex justify-between items-start p-6 border-b border-gray-100 dark:border-gray-800">
            <div className="flex-1 mr-4">
                <input 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="text-2xl font-bold text-gray-800 dark:text-white bg-transparent border-none outline-none focus:ring-2 focus:ring-rose-500 rounded px-1 w-full"
                />
                <p className="text-sm text-gray-500 mt-1 ml-1">
                    Na lista <span className="underline decoration-rose-500">Tarefas</span>
                </p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-white p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>

        {/* --- BODY --- */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* COLUNA ESQUERDA (Principal) */}
            <div className="md:col-span-2 space-y-8">
                
                {/* Descrição */}
                <div>
                    <h3 className="flex items-center gap-2 text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" /></svg>
                        Descrição
                    </h3>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={4}
                        placeholder="Adicione uma descrição mais detalhada..."
                        className="w-full bg-gray-50 dark:bg-[#252A30] border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all resize-none"
                    />
                </div>

                {/* Checklist */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="flex items-center gap-2 text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                            Checklist
                        </h3>
                        {checklist.length > 0 && (
                            <span className="text-xs font-mono text-gray-400">{progress}%</span>
                        )}
                    </div>
                    
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-4">
                        <div 
                            className="bg-rose-500 h-2 rounded-full transition-all duration-300" 
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>

                    <div className="space-y-2 mb-3">
                        {checklist.map(item => (
                            <div key={item.id} className="flex items-center gap-3 group">
                                <input 
                                    type="checkbox" 
                                    checked={item.isChecked}
                                    onChange={() => toggleCheckitem(item.id)}
                                    className="w-5 h-5 rounded border-gray-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                                />
                                <span className={`flex-1 text-sm ${item.isChecked ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-200'}`}>
                                    {item.text}
                                </span>
                                <button onClick={() => deleteCheckitem(item.id)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-2">
                        <input 
                            value={newChecklistItem}
                            onChange={(e) => setNewChecklistItem(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addChecklistItem()}
                            placeholder="Adicionar um item..."
                            className="flex-1 bg-transparent border-b border-gray-200 dark:border-gray-700 py-1 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:border-rose-500 transition-colors"
                        />
                        <button onClick={addChecklistItem} className="text-sm font-bold text-gray-500 hover:text-rose-500">Add</button>
                    </div>
                </div>

                {/* Comentários */}
                <div>
                    <h3 className="flex items-center gap-2 text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                        Atividade
                    </h3>
                    
                    <div className="flex gap-3 mb-6">
                        <div className="w-8 h-8 rounded-full bg-rose-500 flex items-center justify-center text-white font-bold text-xs">EU</div>
                        <div className="flex-1 relative">
                            <textarea 
                                ref={commentInputRef}
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder="Escreva um comentário..."
                                className="w-full bg-white dark:bg-[#252A30] border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-sm text-gray-800 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none resize-none shadow-sm"
                                rows={2}
                            />
                            {newComment && (
                                <button onClick={addComment} className="mt-2 bg-gray-200 dark:bg-gray-700 hover:bg-rose-500 hover:text-white px-3 py-1 rounded text-xs font-bold transition-all">
                                    Salvar
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="space-y-4">
                        {comments.map(comment => (
                            <div key={comment.id} className="flex gap-3">
                                <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 font-bold text-xs">
                                    {comment.userName.substring(0,2).toUpperCase()}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-sm text-gray-800 dark:text-white">{comment.userName}</span>
                                        <span className="text-xs text-gray-400">{new Date(comment.createdAt).toLocaleString()}</span>
                                    </div>
                                    <div className="text-sm text-gray-600 dark:text-gray-300 mt-0.5 p-2 bg-gray-50 dark:bg-[#252A30] rounded-lg inline-block">
                                        {comment.content}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>

            {/* COLUNA DIREITA (Sidebar) */}
            <div className="space-y-6">
                
                {/* Prioridade */}
                <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Prioridade</label>
                    <div className="flex flex-col gap-2">
                        {['Baixa', 'Média', 'Alta'].map((p) => (
                            <button
                                key={p}
                                onClick={() => setPriority(p as any)}
                                className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-all flex items-center justify-between group border ${
                                    priority === p 
                                    ? p === 'Alta' ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400' 
                                    : p === 'Média' ? 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400'
                                    : 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400'
                                    : 'bg-gray-50 border-transparent text-gray-600 dark:bg-[#252A30] dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                            >
                                {p}
                                {priority === p && <span className="text-current">✓</span>}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Data */}
                <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Data de Entrega</label>
                    <input 
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-[#252A30] border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:border-rose-500"
                    />
                </div>

                <hr className="border-gray-100 dark:border-gray-800 my-4" />
                
                {/* BOTÃO EXCLUIR (Lógica In-Place) */}
                {!isDeleting ? (
                    <button 
                        onClick={() => setIsDeleting(true)} 
                        className="w-full text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 font-bold py-2 px-4 rounded-lg transition-colors text-sm flex items-center justify-center gap-2 mb-2"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        Excluir Cartão
                    </button>
                ) : (
                    <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-2 mb-2 animate-in fade-in zoom-in-95 duration-200 border border-red-100 dark:border-red-800">
                        <p className="text-red-700 dark:text-red-300 text-xs font-bold text-center mb-2">Tem certeza?</p>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setIsDeleting(false)} 
                                className="flex-1 py-1.5 bg-white dark:bg-black/20 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded text-xs font-bold hover:bg-gray-50"
                            >
                                Não
                            </button>
                            <button 
                                onClick={onDelete} 
                                className="flex-1 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold shadow-sm"
                            >
                                Sim
                            </button>
                        </div>
                    </div>
                )}

                <button 
                    onClick={handleSave}
                    className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 px-4 rounded-lg shadow-lg shadow-rose-500/20 transition-all transform active:scale-95 flex justify-center items-center gap-2"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    Salvar Tudo
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};