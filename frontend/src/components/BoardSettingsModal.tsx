import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { UserAvatar } from './UserAvatar'; // <--- 1. Usando Avatar Oficial

interface User { id: string; name: string; email: string; avatar?: string; }
interface BoardSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  board: { id: string; title: string; members: User[]; created_by?: string }; 
  onUpdate: () => void; 
}

export const BoardSettingsModal: React.FC<BoardSettingsModalProps> = ({ isOpen, onClose, board, onUpdate }) => {
  const { user } = useAuth();
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'members' | 'danger'>('members');
  const [members, setMembers] = useState<User[]>(board.members || []);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  
  // Select
  const [selectedUserId, setSelectedUserId] = useState("");
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);

  // Modais Internos
  const [memberToRemove, setMemberToRemove] = useState<User | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Quem sou eu nesse quadro?
  const isOwner = board.created_by === user?.id; 

  useEffect(() => {
      setMembers(board.members || []);
  }, [board.members]);

  useEffect(() => {
      if (isOpen) {
          api.get('/users').then(res => setAvailableUsers(res.data));
      }
  }, [isOpen]);

  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
              setIsSelectOpen(false);
          }
      };
      if (isSelectOpen) document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSelectOpen]);

  // --- AÇÕES ---

  const handleAddMember = async () => {
      if (!selectedUserId) return;
      setIsLoading(true);
      try {
          await api.post(`/boards/${board.id}/members`, { userId: selectedUserId });
          
          const userToAdd = availableUsers.find(u => u.id === selectedUserId);
          if (userToAdd) setMembers(prev => [...prev, userToAdd]);

          onUpdate();
          setSelectedUserId("");
          setIsSelectOpen(false);
      } catch (error) {
          console.error(error);
          alert("Erro ao adicionar membro.");
      } finally {
          setIsLoading(false);
      }
  };

  const executeRemoveMember = async () => {
      if (!memberToRemove) return;
      setIsLoading(true);
      try {
          await api.delete(`/boards/${board.id}/members/${memberToRemove.id}`);
          setMembers(prev => prev.filter(m => m.id !== memberToRemove.id));
          onUpdate();
          setMemberToRemove(null);
      } catch (error) {
          alert("Não foi possível remover este membro.");
      } finally {
          setIsLoading(false);
      }
  };

  const handleDeleteBoard = async () => {
      if (deleteConfirmation !== board.title) return;
      setIsLoading(true);
      try {
          await api.delete(`/boards/${board.id}`);
          onUpdate();
          onClose();
      } catch (error) {
          alert("Erro ao excluir quadro.");
      } finally {
          setIsLoading(false);
      }
  };

  // NOVA AÇÃO: Sair do Quadro
  const handleLeaveBoard = async () => {
      if (!window.confirm(`Sair do quadro "${board.title}"?`)) return;
      setIsLoading(true);
      try {
          await api.delete(`/boards/${board.id}/members/${user?.id}`);
          onUpdate();
          onClose();
      } catch (error) {
          alert("Erro ao sair do quadro.");
      } finally {
          setIsLoading(false);
      }
  };

  const selectedUser = availableUsers.find(u => u.id === selectedUserId);
  const filteredUsers = availableUsers.filter(u => !members.some(m => m.id === u.id));

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-[#0F1117]/60 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="bg-white dark:bg-[#16181D] w-full max-w-lg rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 relative z-10 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-[#1F222A]/50">
            <div>
                <h3 className="text-lg font-extrabold text-gray-800 dark:text-white">Configurações</h3>
                <p className="text-xs text-gray-500">{board.title}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-500">✕</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 dark:border-gray-800">
            <button onClick={() => setActiveTab('members')} className={`flex-1 py-3 text-sm font-bold transition-colors ${activeTab === 'members' ? 'text-rose-600 border-b-2 border-rose-600 bg-rose-50/10' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}>Membros</button>
            <button onClick={() => setActiveTab('danger')} className={`flex-1 py-3 text-sm font-bold transition-colors ${activeTab === 'danger' ? 'text-red-600 border-b-2 border-red-600 bg-red-50/10' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}>Zona de Perigo</button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar overflow-x-hidden min-h-[350px] relative">
            
            {/* Modal Confirmação Remoção */}
            {memberToRemove && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/90 dark:bg-[#16181D]/90 backdrop-blur-sm animate-in fade-in duration-200 p-6">
                    <div className="w-full bg-white dark:bg-[#1F222A] p-6 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 text-center animate-in zoom-in-95">
                        <h4 className="text-lg font-bold text-gray-800 dark:text-white mb-2">Remover membro?</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                            Tem certeza que deseja remover <strong>{memberToRemove.name}</strong>?
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setMemberToRemove(null)} className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold text-sm rounded-xl hover:bg-gray-200 transition-colors">Cancelar</button>
                            <button onClick={executeRemoveMember} disabled={isLoading} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-red-500/20 transition-colors">{isLoading ? 'Removendo...' : 'Sim, remover'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ABA MEMBROS */}
            {activeTab === 'members' && (
                <div className="space-y-6">
                    {/* Add Member (Só DONO vê o input de adicionar, ou todos? Normalmente só dono ou admin. Vou deixar livre mas você pode bloquear com !isOwner se quiser) */}
                    <div className="bg-gray-50 dark:bg-[#1F222A] p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Convidar novo membro</label>
                        <div className="flex gap-2">
                            <div ref={selectRef} className="relative flex-1">
                                <button onClick={() => setIsSelectOpen(!isSelectOpen)} className={`w-full flex items-center justify-between bg-white dark:bg-[#16181D] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm outline-none transition-all ${isSelectOpen ? 'ring-2 ring-rose-500/20 border-rose-500' : ''}`}>
                                    <span className={selectedUserId ? "text-gray-800 dark:text-white font-medium" : "text-gray-400"}>{selectedUserId ? selectedUser?.name : "Selecione um usuário..."}</span>
                                    <svg className={`w-4 h-4 text-gray-400 transition-transform ${isSelectOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                </button>
                                {isSelectOpen && (
                                    <div className="absolute top-full mt-2 w-full bg-white dark:bg-[#16181D] border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95">
                                        {filteredUsers.length === 0 ? (
                                            <div className="p-3 text-center text-xs text-gray-400">Nenhum usuário disponível.</div>
                                        ) : (
                                            filteredUsers.map(u => (
                                                <div key={u.id} onClick={() => { setSelectedUserId(u.id); setIsSelectOpen(false); }} className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-[#252830] cursor-pointer transition-colors border-b border-gray-50 dark:border-gray-800 last:border-0">
                                                    <UserAvatar user={u} size="sm" className="w-8 h-8 text-xs" />
                                                    <div className="text-left"><p className="text-sm font-bold text-gray-700 dark:text-gray-200">{u.name}</p><p className="text-xs text-gray-400">{u.email}</p></div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                            <button onClick={handleAddMember} disabled={!selectedUserId || isLoading} className="bg-rose-600 hover:bg-rose-700 text-white px-5 rounded-xl text-sm font-bold disabled:opacity-50 transition-colors shadow-lg shadow-rose-500/20 h-[42px]">+ Add</button>
                        </div>
                    </div>

                    {/* Lista Membros */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-3">Membros Atuais ({members.length})</label>
                        <div className="space-y-2">
                            {members.map((member) => {
                                const isMemberOwner = member.id === board.created_by; 
                                const isMe = member.id === user?.id;

                                return (
                                <div key={member.id} className="flex items-center justify-between p-3 bg-white dark:bg-[#1F222A] border border-gray-100 dark:border-gray-800 rounded-xl group hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <UserAvatar user={member} size="sm" />
                                        <div>
                                            <p className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                                {member.name} 
                                                {isMe && <span className="text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-500 px-1.5 py-0.5 rounded">Você</span>}
                                                {isMemberOwner && <span className="text-[10px] bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 px-1.5 py-0.5 rounded border border-yellow-200 dark:border-yellow-800">Dono</span>}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    {/* 2. LÓGICA DE PERMISSÃO: Só mostro a lixeira se EU for DONO e o alvo NÃO for eu */}
                                    {isOwner && !isMe && (
                                        <button 
                                            onClick={() => setMemberToRemove(member)}
                                            className="text-gray-400 hover:text-red-500 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                            title="Remover do quadro"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    )}
                                </div>
                            )})}
                        </div>
                    </div>
                </div>
            )}

            {/* ABA DANGER */}
            {activeTab === 'danger' && (
                <div className="space-y-6">
                    {/* 3. LÓGICA DE PERMISSÃO: Se sou DONO, vejo Excluir. Se NÃO, vejo Sair. */}
                    {isOwner ? (
                        <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 p-4 rounded-xl">
                            <h4 className="text-red-700 dark:text-red-400 font-bold text-sm mb-2">Excluir este quadro permanentemente</h4>
                            <p className="text-red-600/80 dark:text-red-400/70 text-xs leading-relaxed mb-4">Esta ação não pode ser desfeita.</p>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Digite <span className="select-all font-mono bg-gray-200 dark:bg-gray-800 px-1 rounded text-gray-800 dark:text-gray-200">{board.title}</span> para confirmar</label>
                            <input value={deleteConfirmation} onChange={(e) => setDeleteConfirmation(e.target.value)} placeholder={board.title} className="w-full bg-white dark:bg-[#0F1117] border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-red-500 transition-colors mb-4 text-gray-800 dark:text-white" />
                            <button onClick={handleDeleteBoard} disabled={deleteConfirmation !== board.title || isLoading} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl text-sm shadow-lg shadow-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all">{isLoading ? "Excluindo..." : "Entendo as consequências, excluir este quadro"}</button>
                        </div>
                    ) : (
                        <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/30 p-4 rounded-xl">
                            <h4 className="text-orange-700 dark:text-orange-400 font-bold text-sm mb-2">Sair do Quadro</h4>
                            <p className="text-orange-600/80 dark:text-orange-400/70 text-xs leading-relaxed mb-4">Você perderá acesso a este quadro, mas ele continuará existindo para os outros membros.</p>
                            <button onClick={handleLeaveBoard} disabled={isLoading} className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-2.5 rounded-xl text-sm shadow-lg shadow-orange-500/20 disabled:opacity-50 transition-all">{isLoading ? "Saindo..." : "Sair do Quadro"}</button>
                        </div>
                    )}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};