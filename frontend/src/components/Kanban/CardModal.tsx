import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import { socket } from '../../services/socket'; 
import type { Card, ChecklistItem, Comment, Label } from '../../types';
import { UserAvatar } from '../UserAvatar'; 
import { useAuth } from '../../contexts/AuthContext';

interface CardModalProps {
  isOpen: boolean; 
  card: Card; 
  boardId: string; 
  onClose: () => void; 
  onUpdateLocal: (card: Card) => void; 
  onDelete: () => void;
}

interface ExtendedComment extends Comment {
    userAvatar?: string;
}

const LABEL_COLORS = [
    '#EF4444', '#F97316', '#F59E0B', '#10B981', '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#64748B'
];

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export const CardModal: React.FC<CardModalProps> = ({ isOpen, card, boardId, onClose, onUpdateLocal, onDelete }) => {
  if (!isOpen) return null;

  const { user } = useAuth();

  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description || '');
  const [priority, setPriority] = useState(card.priority || 'Baixa');
  const [dueDate, setDueDate] = useState(card.dueDate ? card.dueDate.split('T')[0] : '');
  
  const [checklist, setChecklist] = useState<ChecklistItem[]>(card.checklist || []);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  
  const [comments, setComments] = useState<ExtendedComment[]>(card.comments || []);
  const [newComment, setNewComment] = useState('');
  
  // --- LABELS STATE ---
  const [activeLabels, setActiveLabels] = useState<Label[]>(card.labels || []);
  const [availableLabels, setAvailableLabels] = useState<Label[]>([]);
  const [showLabelMenu, setShowLabelMenu] = useState(false);
  const [newLabelTitle, setNewLabelTitle] = useState('');
  const [newLabelColor, setNewLabelColor] = useState(LABEL_COLORS[0]);
  const [isCreatingLabel, setIsCreatingLabel] = useState(false);
  
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { 
      setTitle(card.title); 
      setDescription(card.description || ''); 
      setPriority(card.priority || 'Baixa'); 
      setDueDate(card.dueDate ? card.dueDate.split('T')[0] : ''); 
      setChecklist(card.checklist || []); 
      setComments(card.comments || []); 
      setActiveLabels(card.labels || []);
      setIsDeleting(false); 
  }, [card]);

  // Carregar Labels do Board (inicialmente via API ou assumindo vazio até o socket trazer)
  useEffect(() => {
      if (isOpen) {
          api.get(`/columns?boardId=${boardId}`); // Trigger para garantir refresh se necessário
      }
  }, [isOpen, boardId]);

  // --- SOCKET LISTENERS ---
  useEffect(() => {
      const handleLabelCreated = (label: Label) => {
          setAvailableLabels(prev => [...prev, label]);
      };
      
      const handleCardLabelAdded = ({ cardId, label }: { cardId: string, label: Label }) => {
          if (cardId === card.id) {
              setActiveLabels(prev => {
                  if (prev.some(l => l.id === label.id)) return prev;
                  return [...prev, label];
              });
          }
      };

      const handleCardLabelRemoved = ({ cardId, labelId }: { cardId: string, labelId: string }) => {
          if (cardId === card.id) {
              setActiveLabels(prev => prev.filter(l => l.id !== labelId));
          }
      };

      socket.on('label_created', handleLabelCreated);
      socket.on('card_label_added', handleCardLabelAdded);
      socket.on('card_label_removed', handleCardLabelRemoved);

      return () => {
          socket.off('label_created', handleLabelCreated);
          socket.off('card_label_added', handleCardLabelAdded);
          socket.off('card_label_removed', handleCardLabelRemoved);
      };
  }, [card.id]);

  const createLabel = async () => {
      if (!newLabelTitle.trim()) return;
      setIsCreatingLabel(true);
      try {
          const res = await api.post('/labels', {
              boardId,
              title: newLabelTitle,
              color: newLabelColor
          });
          setNewLabelTitle('');
          setIsCreatingLabel(false);
          toggleLabel(res.data);
      } catch (e) { console.error(e); setIsCreatingLabel(false); }
  };

  const toggleLabel = async (label: Label) => {
      const exists = activeLabels.some(l => l.id === label.id);
      if (exists) {
          setActiveLabels(prev => prev.filter(l => l.id !== label.id));
      } else {
          setActiveLabels(prev => [...prev, label]);
      }

      try {
          await api.post('/labels/toggle', {
              cardId: card.id,
              labelId: label.id,
              boardId
          });
      } catch (e) { console.error(e); }
  };

  // --- CHECKLIST & COMMENTS ---
  const addChecklistItem = () => {
    if (!newChecklistItem.trim()) return;
    const newItem = { id: generateUUID(), text: newChecklistItem, isChecked: false };
    setChecklist([...checklist, newItem]);
    setNewChecklistItem('');
  };
  const toggleCheckitem = (itemId: string) => setChecklist(prev => prev.map(item => item.id === itemId ? { ...item, isChecked: !item.isChecked } : item));
  const deleteCheckitem = (itemId: string) => setChecklist(prev => prev.filter(item => item.id !== itemId));
  const addComment = () => { 
      if (!newComment.trim() || !user) return; 
      const comment: ExtendedComment = { id: generateUUID(), userId: user.id, userName: user.name, userAvatar: user.avatar, content: newComment, createdAt: new Date().toISOString() }; 
      setComments([comment, ...comments]); 
      setNewComment(''); 
  };

  const handleSave = async () => { 
      setIsSaving(true);
      try { 
          const payload = { title, description, priority, dueDate: dueDate || null, checklist, comments, columnId: card.columnId }; 
          const res = await api.put(`/cards/${card.id}`, payload); 
          onUpdateLocal({ ...res.data, labels: activeLabels });
          onClose(); 
      } catch (e) { console.error(e); alert("Erro ao salvar card."); } finally { setIsSaving(false); }
  };

  const progress = checklist.length > 0 ? Math.round((checklist.filter(i => i.isChecked).length / checklist.length) * 100) : 0;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-[#0F1117]/60 backdrop-blur-md" onClick={onClose}></div>
      
      <div className="w-full max-w-4xl bg-white dark:bg-[#16181D] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors relative z-10 border border-gray-100 dark:border-gray-800 scale-in-95 animate-in duration-200">
        
        {/* HEADER */}
        <div className="flex justify-between items-start p-6 border-b border-gray-100 dark:border-gray-800/50 bg-gray-50/50 dark:bg-[#1F222A]/50">
            <div className="flex-1 mr-6">
                <input value={title} onChange={(e) => setTitle(e.target.value)} className="text-3xl font-extrabold text-gray-800 dark:text-white bg-transparent border-none outline-none focus:ring-0 p-0 w-full tracking-tight placeholder:text-gray-300" placeholder="Título da tarefa" />
                <div className="flex items-center gap-2 mt-2 text-sm text-gray-500 dark:text-gray-400 font-medium">
                    <span className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded text-xs uppercase tracking-wide">Tarefas</span>
                </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-white p-2 hover:bg-gray-200/50 dark:hover:bg-[#252830] rounded-full transition-colors">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 grid grid-cols-1 md:grid-cols-3 gap-10 bg-[#F8FAFC] dark:bg-[#0F1117]">
            <div className="md:col-span-2 space-y-10">
                
                {/* --- SEÇÃO DE LABELS --- */}
                {activeLabels.length > 0 && (
                    <div>
                        <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Etiquetas</h3>
                        <div className="flex flex-wrap gap-2">
                            {activeLabels.map(label => (
                                <span 
                                    key={label.id} 
                                    className="px-3 py-1 rounded-lg text-xs font-bold text-white shadow-sm flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                                    style={{ backgroundColor: label.color }}
                                    onClick={() => toggleLabel(label)}
                                    title="Clique para remover"
                                >
                                    {label.title}
                                </span>
                            ))}
                            <button onClick={() => setShowLabelMenu(!showLabelMenu)} className="px-3 py-1 rounded-lg bg-gray-200 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs font-bold hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors">
                                +
                            </button>
                        </div>
                    </div>
                )}

                {/* Descrição */}
                <div>
                    <h3 className="flex items-center gap-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" /></svg>
                        Descrição
                    </h3>
                    <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Adicione uma descrição mais detalhada..." className="w-full bg-white dark:bg-[#1F222A] border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500 transition-all resize-none shadow-sm text-sm leading-relaxed" />
                </div>

                {/* Checklist */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="flex items-center gap-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            Checklist
                        </h3>
                        {checklist.length > 0 && (<span className="text-xs font-bold font-mono text-gray-400 bg-gray-100 dark:bg-[#252830] px-2 py-1 rounded-md">{progress}%</span>)}
                    </div>
                    {checklist.length > 0 && (
                        <div className="w-full bg-gray-200 dark:bg-gray-700/50 rounded-full h-2.5 mb-6 overflow-hidden">
                            <div className="bg-gradient-to-r from-rose-500 to-rose-400 h-full rounded-full transition-all duration-500 ease-out shadow-sm" style={{ width: `${progress}%` }}></div>
                        </div>
                    )}
                    <div className="space-y-3 mb-5">
                        {checklist.map(item => (
                            <div key={item.id} className="flex items-center gap-3 group bg-white dark:bg-[#1F222A] p-3 rounded-xl border border-gray-100 dark:border-gray-800/50 shadow-sm transition-all hover:shadow-md">
                                <input type="checkbox" checked={item.isChecked} onChange={() => toggleCheckitem(item.id)} className="w-5 h-5 rounded-md border-gray-300 text-rose-600 focus:ring-rose-500 cursor-pointer transition-all" />
                                <span className={`flex-1 text-sm font-medium transition-all ${item.isChecked ? 'line-through text-gray-400 dark:text-gray-600' : 'text-gray-700 dark:text-gray-200'}`}>{item.text}</span>
                                <button onClick={() => deleteCheckitem(item.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-3 items-center bg-white dark:bg-[#1F222A] p-2 pl-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm focus-within:ring-2 focus-within:ring-rose-500/50 transition-all">
                        <input value={newChecklistItem} onChange={(e) => setNewChecklistItem(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addChecklistItem()} placeholder="Adicionar um item à checklist..." className="flex-1 bg-transparent border-none text-sm text-gray-800 dark:text-gray-200 focus:outline-none" />
                        <button onClick={addChecklistItem} className="bg-gray-100 dark:bg-[#2C2C2C] hover:bg-rose-500 hover:text-white text-gray-600 dark:text-gray-300 text-xs font-bold py-2 px-4 rounded-lg transition-colors">Adicionar</button>
                    </div>
                </div>

                {/* Comentários */}
                <div>
                    <h3 className="flex items-center gap-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-6">Atividade</h3>
                    <div className="flex gap-4 mb-8">
                        <div className="flex-shrink-0"><UserAvatar user={user} size="md" /></div>
                        <div className="flex-1 relative">
                            <textarea ref={commentInputRef} value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Escreva um comentário..." className="w-full bg-white dark:bg-[#1F222A] border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-sm text-gray-800 dark:text-white focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500 focus:outline-none resize-none shadow-sm transition-all pb-12" rows={3} />
                            {newComment && <button onClick={addComment} className="absolute right-3 bottom-3 bg-rose-600 hover:bg-rose-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm hover:shadow-md hover:scale-105 active:scale-95">Comentar</button>}
                        </div>
                    </div>
                    <div className="space-y-6">
                        {comments.map(comment => (
                            <div key={comment.id} className="flex gap-4 group">
                                <div className="flex-shrink-0"><UserAvatar name={comment.userName} src={comment.userAvatar} size="md" /></div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1"><span className="font-bold text-sm text-gray-800 dark:text-white">{comment.userName}</span><span className="text-xs text-gray-400 font-medium">{new Date(comment.createdAt).toLocaleString()}</span></div>
                                    <div className="text-sm text-gray-700 dark:text-gray-200 p-3 bg-white dark:bg-[#1F222A] rounded-xl border border-gray-100 dark:border-gray-800/50 shadow-sm leading-relaxed">{comment.content}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="space-y-8">
                {/* MENU DE AÇÕES */}
                <div className="relative">
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-3">Ações</label>
                    <button onClick={() => setShowLabelMenu(!showLabelMenu)} className="w-full text-left px-4 py-3 rounded-xl bg-gray-100 dark:bg-[#1F222A] hover:bg-gray-200 dark:hover:bg-[#252830] transition-colors flex items-center gap-3 text-gray-700 dark:text-gray-200 font-bold text-sm">
                        <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                        Etiquetas
                    </button>

                    {showLabelMenu && (
                        <div className="absolute top-full left-0 mt-2 w-full bg-white dark:bg-[#16181D] rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 z-50 animate-in fade-in zoom-in-95">
                            <h4 className="text-sm font-bold text-gray-800 dark:text-white mb-3">Etiquetas</h4>
                            
                            <div className="space-y-2 mb-4 max-h-40 overflow-y-auto custom-scrollbar">
                                {availableLabels.length === 0 && <p className="text-xs text-gray-400">Nenhuma etiqueta criada.</p>}
                                {availableLabels.map(l => {
                                    const isActive = activeLabels.some(al => al.id === l.id);
                                    return (
                                        <div key={l.id} onClick={() => toggleLabel(l)} className="flex items-center gap-2 cursor-pointer hover:opacity-80">
                                            <div className="w-full h-8 rounded-lg flex items-center px-3 text-xs font-bold text-white relative" style={{ backgroundColor: l.color }}>
                                                {l.title}
                                                {isActive && <div className="absolute right-2"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg></div>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <hr className="border-gray-100 dark:border-gray-800 my-3" />
                            
                            <h5 className="text-xs font-bold text-gray-500 mb-2">Criar nova</h5>
                            {/* CORREÇÃO DO INPUT DE COR DO TEXTO AQUI: */}
                            <input value={newLabelTitle} onChange={e => setNewLabelTitle(e.target.value)} placeholder="Nome..." className="w-full bg-gray-50 dark:bg-[#252830] border-none rounded-lg px-3 py-2 text-xs mb-3 text-gray-900 dark:text-white" />
                            
                            <div className="flex gap-2 flex-wrap mb-3">
                                {LABEL_COLORS.map(c => (
                                    <div key={c} onClick={() => setNewLabelColor(c)} className={`w-6 h-6 rounded-full cursor-pointer border-2 ${newLabelColor === c ? 'border-white ring-2 ring-gray-400' : 'border-transparent'}`} style={{ backgroundColor: c }}></div>
                                ))}
                            </div>
                            <button onClick={createLabel} disabled={!newLabelTitle || isCreatingLabel} className="w-full bg-rose-600 text-white text-xs font-bold py-2 rounded-lg hover:bg-rose-700 transition-colors">Criar</button>
                        </div>
                    )}
                </div>

                <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-3">Prioridade</label>
                    <div className="flex flex-col gap-2 p-1 bg-gray-100 dark:bg-[#1F222A] rounded-xl border border-gray-200 dark:border-gray-800/50">
                        {['Baixa', 'Média', 'Alta'].map((p) => {
                             const activeClass = p === 'Alta' ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800/50 shadow-sm' : p === 'Média' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800/50 shadow-sm' : 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800/50 shadow-sm';
                             const inactiveClass = 'text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-[#252830] border-transparent';
                             return (
                            <button key={p} onClick={() => setPriority(p as any)} className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-between group border ${priority === p ? activeClass : inactiveClass}`}>
                                {p}{priority === p && <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>}
                            </button>
                        )})}
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-3">Data de Entrega</label>
                    <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full bg-white dark:bg-[#1F222A] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500 transition-all shadow-sm font-medium" />
                </div>
                <hr className="border-gray-200 dark:border-gray-800/50 my-6" />
                
                <div className="space-y-3">
                    {!isDeleting ? (
                        <button onClick={() => setIsDeleting(true)} className="w-full text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 font-bold py-3 px-4 rounded-xl transition-colors text-sm flex items-center justify-center gap-2 border border-red-100 dark:border-red-900/30">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            Excluir Cartão
                        </button>
                    ) : (
                        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 animate-in fade-in zoom-in-95 duration-200 border border-red-100 dark:border-red-800/50">
                            <p className="text-red-700 dark:text-red-300 text-xs font-bold text-center mb-3">Tem certeza? Isso não tem volta.</p>
                            <div className="flex gap-2">
                                <button onClick={() => setIsDeleting(false)} className="flex-1 py-2 bg-white dark:bg-[#1F222A] border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-bold hover:bg-gray-50 dark:hover:bg-[#252830] transition-colors">Cancelar</button>
                                <button onClick={onDelete} className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow-md transition-colors">Sim, excluir</button>
                            </div>
                        </div>
                    )}
                    <button onClick={handleSave} disabled={isSaving} className="w-full bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-700 hover:to-rose-600 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-rose-500/20 transition-all transform hover:scale-[1.02] active:scale-95 flex justify-center items-center gap-2">
                        {isSaving ? (
                            <span>Salvando...</span>
                        ) : (
                            <>
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                Salvar Alterações
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};