import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { boardService } from '../../services/boardService';
import type { Card, ChecklistItem, Comment, Priority } from '../../types';

interface CardModalProps {
  card: Card | null;
  isOpen: boolean;
  onClose: () => void;
  boardId: string;
  onUpdateLocal: (updatedCard: Card) => void;
}

export const CardModal: React.FC<CardModalProps> = ({ card, isOpen, onClose, boardId, onUpdateLocal }) => {
  const queryClient = useQueryClient();
  const dateInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [newItemText, setNewItemText] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [dueDate, setDueDate] = useState<string>('');
  const [priority, setPriority] = useState<Priority>('Média');

  useEffect(() => {
    if (card) {
      setTitle(card.title || '');
      setDescription(card.description || '');
      setChecklist(card.checklist || []);
      setComments(card.comments || []);
      setDueDate(card.dueDate ? new Date(card.dueDate).toISOString().split('T')[0] : '');
      setPriority(card.priority || 'Média');
    }
  }, [card]);

  const progress = useMemo(() => {
    if (checklist.length === 0) return 0;
    const completed = checklist.filter(i => i.isChecked).length;
    return Math.round((completed / checklist.length) * 100);
  }, [checklist]);

  const handleAddItem = () => {
    if (!newItemText.trim()) return;
    setChecklist([...checklist, { id: Math.random().toString(36).substr(2, 9), text: newItemText, isChecked: false }]);
    setNewItemText('');
  };

  const toggleItem = (id: string) => setChecklist(prev => prev.map(i => i.id === id ? { ...i, isChecked: !i.isChecked } : i));
  const deleteItem = (id: string) => setChecklist(prev => prev.filter(i => i.id !== id));
  
  const handleAddComment = () => {
    if (!newComment.trim()) return;
    setComments([{ id: Math.random().toString(36).substr(2, 9), userId: 'me', userName: 'Você', content: newComment, createdAt: new Date().toISOString() }, ...comments]);
    setNewComment('');
  };

  const updateMutation = useMutation({
    mutationFn: (data: any) => boardService.updateCard(card!.id, data),
    onSuccess: (updatedCard) => {
      onUpdateLocal(updatedCard);
      queryClient.invalidateQueries({ queryKey: ['columns', boardId] });
      onClose();
    },
    onError: (err) => {
        alert("Erro ao salvar!");
        console.error(err);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: () => boardService.deleteCard(card!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['columns', boardId] });
      onClose();
    },
  });

  const handleSave = () => {
    const isoDate = dueDate ? new Date(dueDate).toISOString() : null;
    updateMutation.mutate({ title, description, checklist, comments, dueDate: isoDate, priority });
  };

  if (!isOpen || !card) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div className="w-full max-w-4xl h-[90vh] bg-[#1E1E1E] border border-[#333] rounded-xl shadow-2xl overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        
        {/* HEADER */}
        <div className="bg-[#252525] px-8 py-5 border-b border-[#333] flex justify-between items-start">
            <div className="w-full mr-4">
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-transparent text-2xl font-bold text-[#E0E0E0] outline-none focus:bg-[#333] rounded px-2"
                />
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white p-2">✕</button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 md:grid-cols-3 gap-8 scrollbar-thin scrollbar-thumb-gray-700">
            <div className="md:col-span-2 space-y-8">
                {/* Meta Info Rápida */}
                {(dueDate || priority) && (
                    <div className="flex gap-4">
                        {dueDate && (
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-500 uppercase">Entrega</label>
                                <div className="flex items-center gap-2 text-gray-300 bg-[#2C2C2C] px-3 py-1.5 rounded text-sm">
                                    {new Date(dueDate).toLocaleDateString('pt-BR')}
                                    <button onClick={() => setDueDate('')} className="hover:text-red-400 ml-2">✕</button>
                                </div>
                            </div>
                        )}
                         <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase">Prioridade</label>
                            <div className="flex items-center gap-2 text-gray-300 bg-[#2C2C2C] px-3 py-1.5 rounded text-sm">
                                <span className={`w-2 h-2 rounded-full ${priority === 'Alta' ? 'bg-red-500' : priority === 'Média' ? 'bg-yellow-500' : 'bg-green-500'}`}></span>
                                {priority}
                            </div>
                        </div>
                    </div>
                )}

                <section>
                    <h3 className="font-semibold text-sm uppercase tracking-wider text-gray-400 mb-2">Descrição</h3>
                    <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="w-full bg-[#2C2C2C] border border-[#333] rounded-lg p-4 text-[#E0E0E0] outline-none resize-none" placeholder="Adicione uma descrição..." />
                </section>

                <section>
                    <div className="flex justify-between mb-2 text-gray-400"><h3 className="font-semibold text-sm uppercase">Checklist</h3><span>{progress}%</span></div>
                    <div className="w-full bg-[#333] h-2 rounded-full mb-4"><div className="bg-rose-500 h-full transition-all" style={{ width: `${progress}%` }} /></div>
                    <div className="space-y-2 mb-4">
                        {checklist.map(item => (
                            <div key={item.id} className="flex items-center gap-3 p-2 hover:bg-[#252525] rounded transition-colors group">
                                <input type="checkbox" checked={item.isChecked} onChange={() => toggleItem(item.id)} className="w-4 h-4 cursor-pointer accent-rose-500" />
                                <span className={`flex-1 text-sm ${item.isChecked ? 'line-through text-gray-500' : 'text-gray-200'}`}>{item.text}</span>
                                <button onClick={() => deleteItem(item.id)} className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <input type="text" value={newItemText} onChange={(e) => setNewItemText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddItem()} placeholder="Novo item..." className="flex-1 bg-[#2C2C2C] border border-[#333] rounded px-3 py-2 text-sm text-gray-200 outline-none focus:border-rose-500 transition-colors" />
                        <button onClick={handleAddItem} className="bg-[#333] hover:bg-[#444] px-3 py-2 rounded text-white text-sm transition-colors">Add</button>
                    </div>
                </section>

                <section>
                    <h3 className="font-semibold text-sm uppercase tracking-wider text-gray-400 mb-2">Atividade</h3>
                    <div className="flex gap-3 mb-4">
                        <div className="w-8 h-8 rounded-full bg-rose-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">VC</div>
                        <input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddComment()} placeholder="Comentário..." className="flex-1 bg-[#2C2C2C] border border-[#333] rounded px-3 py-2 text-sm text-gray-200 outline-none focus:border-rose-500 transition-colors" />
                    </div>
                    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-700">
                        {comments.map(c => (
                            <div key={c.id} className="flex gap-3">
                                <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">{c.userName.substring(0,2)}</div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold text-gray-200">{c.userName}</span>
                                        <span className="text-xs text-gray-500">{new Date(c.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                    </div>
                                    <p className="text-sm text-gray-300 mt-1 bg-[#252525] p-2 rounded">{c.content}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </div>

            <div className="space-y-6">
                <div className="space-y-4">
                    <h3 className="text-xs font-bold text-gray-500 uppercase">Sugestões</h3>
                    
                    {/* Botão de Membros (Visual) */}
                    <button className="w-full flex items-center gap-2 bg-[#2C2C2C] hover:bg-[#333] p-2 rounded text-sm text-gray-300 transition-colors text-left">
                        <span className="w-4 h-4 bg-blue-500 rounded-full"></span>Membros
                    </button>

                    {/* --- CORREÇÃO DE UX: MENUS DE PRIORIDADE --- */}
                    <div className="relative group">
                         <button className="w-full flex items-center gap-2 bg-[#2C2C2C] hover:bg-[#333] p-2 rounded text-sm text-gray-300 transition-colors text-left">
                            <span className={`w-4 h-4 rounded-full ${priority === 'Alta' ? 'bg-red-500' : priority === 'Média' ? 'bg-yellow-500' : 'bg-green-500'}`}></span>
                            Prioridade: {priority}
                        </button>
                        
                        {/* Wrapper Invisível (Ponte de Padding) */}
                        <div className="absolute left-0 top-full w-full pt-2 hidden group-hover:block z-50">
                            {/* Conteúdo Visual do Menu */}
                            <div className="bg-[#1A1A1A] border border-[#333] rounded shadow-xl overflow-hidden">
                                {['Baixa', 'Média', 'Alta'].map((p) => (
                                    <div 
                                        key={p} 
                                        onClick={() => setPriority(p as Priority)} 
                                        className="p-2 hover:bg-[#333] text-gray-300 text-sm cursor-pointer flex items-center gap-2 transition-colors"
                                    >
                                        <span className={`w-2 h-2 rounded-full ${p === 'Alta' ? 'bg-red-500' : p === 'Média' ? 'bg-yellow-500' : 'bg-green-500'}`}></span>
                                        {p}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="relative">
                        <button onClick={() => dateInputRef.current?.showPicker()} className="w-full flex items-center gap-2 bg-[#2C2C2C] hover:bg-[#333] p-2 rounded text-sm text-gray-300 transition-colors text-left">
                            <span className="w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center text-[8px] text-black font-bold">D</span>
                            {dueDate ? new Date(dueDate).toLocaleDateString() : 'Datas'}
                        </button>
                        <input type="date" ref={dateInputRef} value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer -z-10" />
                    </div>
                </div>
                <div className="space-y-4 mt-8 pt-8 border-t border-[#333]">
                     <button onClick={() => { if (window.confirm('Excluir?')) deleteMutation.mutate(); }} className="w-full bg-[#2C2C2C] hover:bg-red-900/30 text-gray-300 hover:text-red-400 p-2 rounded text-sm text-left flex items-center gap-2 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        Excluir Card
                     </button>
                </div>
            </div>
        </div>

        <div className="bg-[#252525] p-5 border-t border-[#333] flex justify-end gap-3">
             <button onClick={handleSave} disabled={updateMutation.isPending} className="px-6 py-2 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded shadow-lg transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
                {updateMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
            </button>
        </div>
      </div>
    </div>
  );
};