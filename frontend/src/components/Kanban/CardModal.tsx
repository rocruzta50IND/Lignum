import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import { socket } from '../../services/socket'; 
import type { Card, ChecklistItem, Comment, Label, Attachment } from '../../types';
import { UserAvatar } from '../UserAvatar'; 
import { useAuth } from '../../contexts/AuthContext';

interface CardModalProps {
  isOpen: boolean; 
  card: Card; 
  boardId: string; 
  onClose: () => void; 
  onUpdateLocal: (card: Card) => void; 
  onDelete: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: (cardId: string) => void;
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

// Helper seguro para formatar data para o input (YYYY-MM-DD)
// Evita problemas de timezone usando string direta
const formatForInput = (dateString?: string | null) => {
    if (!dateString) return '';
    // Se vier ISO (2023-10-25T...), pega só a primeira parte
    return dateString.substring(0, 10);
};

export const CardModal: React.FC<CardModalProps> = ({ 
    isOpen, 
    card, 
    boardId, 
    onClose, 
    onUpdateLocal, 
    onDelete,
    isFavorite,
    onToggleFavorite
}) => {
  if (!isOpen) return null;

  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);
  
  // URL da API para imagens
  const API_URL = `http://${window.location.hostname}:3000`;

  // --- ESTADOS ---
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description || '');
  const [priority, setPriority] = useState(card.priority || 'Baixa');
  
  // DATA CORRIGIDA: Usa o helper seguro
  const [dueDate, setDueDate] = useState(formatForInput(card.dueDate));
  
  const [checklist, setChecklist] = useState<ChecklistItem[]>(card.checklist || []);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  
  const [comments, setComments] = useState<ExtendedComment[]>(card.comments || []);
  const [newComment, setNewComment] = useState('');
  
  const [activeLabels, setActiveLabels] = useState<Label[]>(card.labels || []);
  const [availableLabels, setAvailableLabels] = useState<Label[]>([]);
  const [showLabelMenu, setShowLabelMenu] = useState(false);
  const [newLabelTitle, setNewLabelTitle] = useState('');
  const [newLabelColor, setNewLabelColor] = useState(LABEL_COLORS[0]);
  const [isCreatingLabel, setIsCreatingLabel] = useState(false);

  const [attachments, setAttachments] = useState<Attachment[]>(card.attachments || []);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Sincroniza estados quando o card muda (ex: atualização via socket ou troca de card)
  useEffect(() => { 
      setTitle(card.title); 
      setDescription(card.description || ''); 
      setPriority(card.priority || 'Baixa'); 
      setDueDate(formatForInput(card.dueDate)); // <--- CORREÇÃO AQUI TAMBÉM
      setChecklist(card.checklist || []); 
      setComments(card.comments || []); 
      setActiveLabels(card.labels || []);
      setAttachments(card.attachments || []); 
      setIsDeleting(false); 
  }, [card]);

  // SOCKET LISTENERS
  useEffect(() => {
      const handleLabelCreated = (label: Label) => setAvailableLabels(prev => [...prev, label]);
      const handleCardLabelAdded = ({ cardId, label }: { cardId: string, label: Label }) => {
          if (cardId === card.id) setActiveLabels(prev => prev.some(l => l.id === label.id) ? prev : [...prev, label]);
      };
      const handleCardLabelRemoved = ({ cardId, labelId }: { cardId: string, labelId: string }) => {
          if (cardId === card.id) setActiveLabels(prev => prev.filter(l => l.id !== labelId));
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

  // Carregar labels disponíveis do board (opcional, pode ser feito via socket/api)
  useEffect(() => {
      if (isOpen && showLabelMenu && availableLabels.length === 0) {
          // Se quiser carregar labels do banco ao abrir o menu, faria aqui.
          // Por enquanto, o sistema cria labels novas e o socket propaga.
      }
  }, [isOpen, showLabelMenu, availableLabels.length]);

  // --- ACTIONS ---

  const handleSave = async () => { 
      setIsSaving(true);
      try { 
          const payload = { 
              title, 
              description, 
              priority, 
              dueDate: dueDate || null, // Envia string YYYY-MM-DD ou null
              checklist, 
              comments,  
              columnId: card.columnId 
          }; 
          
          const res = await api.patch(`/cards/${card.id}`, payload); 
          
          onUpdateLocal({ 
              ...res.data, 
              labels: activeLabels, 
              attachments: attachments 
          });
          
          onClose(); 
      } catch (e) { 
          console.error("Erro ao salvar:", e); 
          alert("Erro ao salvar card."); 
      } finally { 
          setIsSaving(false); 
      }
  };

  // CHECKLIST
  const addChecklistItem = () => {
    if (!newChecklistItem.trim()) return;
    const newItem = { id: generateUUID(), text: newChecklistItem, isChecked: false };
    setChecklist([...checklist, newItem]);
    setNewChecklistItem('');
  };
  const toggleCheckitem = (itemId: string) => setChecklist(prev => prev.map(item => item.id === itemId ? { ...item, isChecked: !item.isChecked } : item));
  const deleteCheckitem = (itemId: string) => setChecklist(prev => prev.filter(item => item.id !== itemId));

  // COMMENTS
  const addComment = () => { 
      if (!newComment.trim() || !user) return; 
      const comment: ExtendedComment = { id: generateUUID(), userId: user.id, userName: user.name, userAvatar: user.avatar, content: newComment, createdAt: new Date().toISOString() }; 
      setComments([comment, ...comments]); 
      setNewComment(''); 
  };

  // LABELS
  const createLabel = async () => {
      if (!newLabelTitle.trim()) return;
      setIsCreatingLabel(true);
      try {
          const res = await api.post('/labels', { boardId, title: newLabelTitle, color: newLabelColor });
          setNewLabelTitle('');
          setIsCreatingLabel(false);
          setShowLabelMenu(false); // Fecha menu
          toggleLabel(res.data);
      } catch (e) { console.error(e); setIsCreatingLabel(false); }
  };
  const toggleLabel = async (label: Label) => {
      const exists = activeLabels.some(l => l.id === label.id);
      if (exists) setActiveLabels(prev => prev.filter(l => l.id !== label.id));
      else setActiveLabels(prev => [...prev, label]);
      try { await api.post('/labels/toggle', { cardId: card.id, labelId: label.id, boardId }); } catch (e) { console.error(e); }
  };

  // ATTACHMENTS
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
        await api.post(`/attachments?cardId=${card.id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    } catch (error) { console.error(error); alert("Erro ao enviar arquivo."); } finally { setIsUploading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };
  const handleDeleteAttachment = async (attachmentId: string) => {
      if(!confirm("Deseja remover este anexo?")) return;
      try { await api.delete(`/attachments/${attachmentId}`); } catch (error) { console.error(error); }
  };
  const getFileIcon = (type: string) => {
      if (type.startsWith('image/')) return '🖼️';
      if (type.includes('pdf')) return '📄';
      return '📎';
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
            
            <div className="flex items-center gap-2">
                {onToggleFavorite && (
                    <button 
                        onClick={() => onToggleFavorite(card.id)}
                        className={`p-2 rounded-full transition-all ${isFavorite ? 'text-yellow-400 bg-yellow-400/10' : 'text-gray-400 hover:bg-gray-200/50 dark:hover:bg-[#252830] hover:text-yellow-400'}`}
                        title={isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                    >
                        <svg className="w-6 h-6" fill={isFavorite ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                    </button>
                )}
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-white p-2 hover:bg-gray-200/50 dark:hover:bg-[#252830] rounded-full transition-colors">
                    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 grid grid-cols-1 md:grid-cols-3 gap-10 bg-[#F8FAFC] dark:bg-[#0F1117]">
            {/* COLUNA PRINCIPAL */}
            <div className="md:col-span-2 space-y-10">
                {activeLabels.length > 0 && (
                    <div>
                        <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Etiquetas</h3>
                        <div className="flex flex-wrap gap-2">
                            {activeLabels.map(label => (
                                <span key={label.id} className="px-3 py-1 rounded-lg text-xs font-bold text-white shadow-sm flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity" style={{ backgroundColor: label.color }} onClick={() => toggleLabel(label)} title="Clique para remover">
                                    {label.title}
                                </span>
                            ))}
                            <button onClick={() => setShowLabelMenu(!showLabelMenu)} className="px-3 py-1 rounded-lg bg-gray-200 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs font-bold hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors">+</button>
                        </div>
                    </div>
                )}

                {/* ANEXOS */}
                <div>
                    <h3 className="flex items-center gap-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                        Anexos
                    </h3>
                    {attachments.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                            {attachments.map(att => (
                                <div key={att.id} className="group relative bg-white dark:bg-[#1F222A] border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden hover:shadow-md transition-all">
                                    {att.fileType.startsWith('image/') ? (
                                        <div className="h-24 w-full bg-gray-100 dark:bg-black/20 flex items-center justify-center overflow-hidden">
                                            <img src={`${API_URL}/uploads/${att.filePath}`} alt={att.fileName} className="w-full h-full object-cover" />
                                        </div>
                                    ) : (
                                        <div className="h-24 w-full bg-gray-50 dark:bg-[#252830] flex items-center justify-center text-3xl">
                                            {getFileIcon(att.fileType)}
                                        </div>
                                    )}
                                    <div className="p-2">
                                        <p className="text-xs font-bold text-gray-700 dark:text-gray-300 truncate" title={att.fileName}>{att.fileName}</p>
                                        <p className="text-[10px] text-gray-400">{new Date(att.createdAt).toLocaleDateString()}</p>
                                    </div>
                                    <a href={`${API_URL}/uploads/${att.filePath}`} target="_blank" rel="noreferrer" className="absolute top-1 right-1 p-1 bg-white/80 dark:bg-black/60 rounded-full text-gray-600 dark:text-white opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                    </a>
                                    <button onClick={() => handleDeleteAttachment(att.id)} className="absolute top-1 left-1 p-1 bg-red-100/80 dark:bg-red-900/60 rounded-full text-red-600 dark:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="flex items-center gap-3">
                        <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="px-4 py-2 bg-gray-100 dark:bg-[#2C2C2C] hover:bg-gray-200 dark:hover:bg-[#353535] rounded-lg text-xs font-bold text-gray-600 dark:text-gray-300 transition-colors flex items-center gap-2">
                            {isUploading ? <>Enviando...</> : <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>Adicionar anexo</>}
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
                    </div>
                </div>

                {/* DESCRIÇÃO */}
                <div>
                    <h3 className="flex items-center gap-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" /></svg>
                        Descrição
                    </h3>
                    <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Adicione uma descrição..." className="w-full bg-white dark:bg-[#1F222A] border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500 transition-all resize-none shadow-sm text-sm leading-relaxed" />
                </div>

                {/* CHECKLIST */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="flex items-center gap-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            Checklist
                        </h3>
                        {checklist.length > 0 && (<span className="text-xs font-bold font-mono text-gray-400 bg-gray-100 dark:bg-[#252830] px-2 py-1 rounded-md">{progress}%</span>)}
                    </div>
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
                        <input value={newChecklistItem} onChange={(e) => setNewChecklistItem(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addChecklistItem()} placeholder="Adicionar item..." className="flex-1 bg-transparent border-none text-sm text-gray-800 dark:text-gray-200 focus:outline-none" />
                        <button onClick={addChecklistItem} className="bg-gray-100 dark:bg-[#2C2C2C] hover:bg-rose-500 hover:text-white text-gray-600 dark:text-gray-300 text-xs font-bold py-2 px-4 rounded-lg transition-colors">Adicionar</button>
                    </div>
                </div>

                {/* ATIVIDADE */}
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

            {/* COLUNA LATERAL */}
            <div className="space-y-8">
                {/* MENU AÇÕES */}
                <div className="relative">
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-3">Ações</label>
                    <button onClick={() => setShowLabelMenu(!showLabelMenu)} className="w-full text-left px-4 py-3 rounded-xl bg-gray-100 dark:bg-[#1F222A] hover:bg-gray-200 dark:hover:bg-[#252830] transition-colors flex items-center gap-3 text-gray-700 dark:text-gray-200 font-bold text-sm">
                        <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                        Etiquetas
                    </button>
                    {showLabelMenu && (
                        <div className="absolute top-full left-0 mt-2 w-full bg-white dark:bg-[#16181D] rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 z-50">
                            <h4 className="text-sm font-bold text-gray-800 dark:text-white mb-3">Etiquetas</h4>
                            <div className="space-y-2 mb-4 max-h-40 overflow-y-auto custom-scrollbar">
                                {availableLabels.map(l => (
                                    <div key={l.id} onClick={() => toggleLabel(l)} className="flex items-center gap-2 cursor-pointer hover:opacity-80">
                                        <div className="w-full h-8 rounded-lg flex items-center px-3 text-xs font-bold text-white" style={{ backgroundColor: l.color }}>{l.title}</div>
                                    </div>
                                ))}
                            </div>
                            <input value={newLabelTitle} onChange={e => setNewLabelTitle(e.target.value)} placeholder="Nome..." className="w-full bg-gray-50 dark:bg-[#252830] border-none rounded-lg px-3 py-2 text-xs mb-3 text-gray-900 dark:text-white" />
                            <div className="flex gap-2 flex-wrap mb-3">
                                {LABEL_COLORS.map(c => (
                                    <div key={c} onClick={() => setNewLabelColor(c)} className={`w-6 h-6 rounded-full cursor-pointer border-2 ${newLabelColor === c ? 'border-white ring-2 ring-gray-400' : 'border-transparent'}`} style={{ backgroundColor: c }}></div>
                                ))}
                            </div>
                            <button onClick={createLabel} className="w-full bg-rose-600 text-white text-xs font-bold py-2 rounded-lg hover:bg-rose-700 transition-colors">Criar</button>
                        </div>
                    )}
                </div>

                {/* PRIORIDADE */}
                <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-3">Prioridade</label>
                    <div className="flex flex-col gap-2 p-1 bg-gray-100 dark:bg-[#1F222A] rounded-xl border border-gray-200 dark:border-gray-800/50">
                        {['Baixa', 'Média', 'Alta'].map((p) => (
                            <button key={p} onClick={() => setPriority(p as any)} className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-between group border ${priority === p ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800/50 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-[#252830] border-transparent'}`}>
                                {p}{priority === p && <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>}
                            </button>
                        ))}
                    </div>
                </div>
                
                {/* DATA DE ENTREGA (FUNCIONAL) */}
                <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-3">Data de Entrega</label>
                    <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full bg-white dark:bg-[#1F222A] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500 transition-all shadow-sm font-medium" />
                </div>
                
                <hr className="border-gray-200 dark:border-gray-800/50 my-6" />
                
                {/* AÇÕES */}
                <div className="space-y-3">
                    <button onClick={() => setIsDeleting(true)} className="w-full text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 font-bold py-3 px-4 rounded-xl transition-colors text-sm flex items-center justify-center gap-2 border border-red-100 dark:border-red-900/30">
                        Excluir Cartão
                    </button>
                    
                    <button onClick={handleSave} disabled={isSaving} className="w-full bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-700 hover:to-rose-600 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-rose-500/20 transition-all transform hover:scale-[1.02] active:scale-95 flex justify-center items-center gap-2">
                        {isSaving ? <span>Salvando...</span> : 'Salvar Alterações'}
                    </button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};