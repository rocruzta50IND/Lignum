import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';
import { BoardSettingsModal } from '../components/BoardSettingsModal'; // Importe o Modal

interface User { id: string; name: string; email: string; }
interface BoardSummary {
  id: string;
  title: string;
  background_color: string;
  members: User[]; // Agora o backend retorna membros
}

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [boards, setBoards] = useState<BoardSummary[]>([]);
  
  // States Modal Criação
  const [isCreating, setIsCreating] = useState(false);
  const [newBoardTitle, setNewBoardTitle] = useState("");
  const [selectedColor, setSelectedColor] = useState("#1E1E1E");
  
  // States Modal Membros (Criação)
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // NOVO: States Modal Settings
  const [editingBoard, setEditingBoard] = useState<BoardSummary | null>(null);

  const colorOptions = [
    { id: '#1E1E1E', hex: '#64748b', name: 'Padrão' }, 
    { id: '#334155', hex: '#3b82f6', name: 'Azul' },
    { id: '#9f1239', hex: '#f43f5e', name: 'Rose' },
    { id: '#065f46', hex: '#10b981', name: 'Verde' },
    { id: '#1e40af', hex: '#6366f1', name: 'Indigo' },
    { id: '#5b21b6', hex: '#8b5cf6', name: 'Violeta' },
    { id: '#854d0e', hex: '#f59e0b', name: 'Amarelo' },
  ];

  const fetchBoards = async () => {
    try { const res = await api.get('/boards'); setBoards(res.data); } 
    catch (error) { console.error("Erro ao buscar boards", error); }
  };

  useEffect(() => { fetchBoards(); }, []);

  useEffect(() => {
      if (isCreating) {
          setIsLoadingUsers(true);
          api.get('/users').then(res => setAvailableUsers(res.data)).finally(() => setIsLoadingUsers(false));
      } else {
          setSelectedMembers([]);
      }
  }, [isCreating]);

  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBoardTitle.trim()) return;
    try {
      const res = await api.post('/boards', { 
          title: newBoardTitle, 
          background_color: selectedColor,
          members: selectedMembers 
      });
      // Recarrega tudo para garantir dados frescos
      fetchBoards(); 
      setIsCreating(false);
      setNewBoardTitle("");
    } catch (error) { console.error(error); }
  };

  const toggleMember = (userId: string) => {
      setSelectedMembers(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
  };

  // Handler para abrir configurações
  const openSettings = (e: React.MouseEvent, board: BoardSummary) => {
      e.stopPropagation(); // Impede entrar no quadro
      setEditingBoard(board);
  };

  return (
    <div className="flex-1 p-8 md:p-12 overflow-y-auto bg-[#F8FAFC] dark:bg-[#0F1117] transition-colors h-full font-sans">
      <main className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-10 opacity-90">
            <div className="p-2.5 rounded-xl bg-white dark:bg-[#1F222A] text-rose-500 shadow-sm border border-gray-100 dark:border-gray-800/60">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
            </div>
            <div>
                <h2 className="text-2xl font-extrabold text-gray-800 dark:text-white tracking-tight leading-none">Seus Projetos</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">Gerencie seus quadros e tarefas.</p>
            </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in duration-500">
            <button onClick={() => setIsCreating(true)} className="group h-40 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-800 hover:border-rose-400 dark:hover:border-rose-500/50 bg-transparent flex flex-col items-center justify-center cursor-pointer transition-all duration-300 hover:bg-rose-50/50 dark:hover:bg-rose-900/5">
                <div className="w-12 h-12 rounded-full bg-white dark:bg-[#1F222A] shadow-sm border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-400 dark:text-gray-500 group-hover:text-rose-500 group-hover:scale-110 transition-all mb-3"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg></div>
                <span className="text-sm font-bold text-gray-500 dark:text-gray-400 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">Criar novo quadro</span>
            </button>
            
            {boards.map(board => {
                const colorConfig = colorOptions.find(c => c.id === board.background_color) || colorOptions[0];
                const accentColor = colorConfig.hex;
                const members = board.members || []; 

                return (
                <div 
                    key={board.id}
                    onClick={() => navigate(`/board/${board.id}`)}
                    className="h-40 rounded-2xl p-6 relative overflow-hidden group cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:hover:shadow-black/50 bg-white dark:bg-[#1E2028] border border-gray-200 dark:border-gray-700/50 hover:border-gray-300 dark:hover:border-gray-600 flex flex-col justify-between"
                >
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 transition-all group-hover:w-2" style={{ backgroundColor: accentColor }}></div>

                    {/* BOTÃO DE SETTINGS (ENGRENAGEM) NOVO */}
                    <button 
                        onClick={(e) => openSettings(e, board)}
                        className="absolute top-3 right-3 p-1.5 rounded-lg text-gray-300 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors opacity-0 group-hover:opacity-100 z-10"
                        title="Configurações do Quadro"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </button>

                    <div className="pl-2">
                        <div className="mb-3">
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md" style={{ color: accentColor, backgroundColor: theme === 'dark' ? `${accentColor}20` : `${accentColor}15` }}>Projeto</span>
                        </div>
                        <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100 tracking-tight leading-snug line-clamp-1 group-hover:text-black dark:group-hover:text-white transition-colors">
                            {board.title}
                        </h3>
                    </div>
                    
                    <div className="pl-2 flex items-center justify-between mt-auto pt-4">
                        <div className="flex -space-x-2 overflow-hidden">
                            {members.map((m: any, i: number) => (
                                <div key={m.id || i} title={m.name} className="inline-flex h-7 w-7 rounded-full ring-2 ring-white dark:ring-[#1E2028] bg-gray-200 dark:bg-gray-600 items-center justify-center text-[9px] font-bold text-gray-600 dark:text-gray-300 uppercase">
                                    {m.name ? m.name.substring(0, 2) : '??'}
                                </div>
                            ))}
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                        </div>
                    </div>
                </div>
            )})}
        </div>
      </main>

      {/* Modal de Configurações */}
      {editingBoard && (
          <BoardSettingsModal 
            isOpen={!!editingBoard} 
            onClose={() => setEditingBoard(null)} 
            board={editingBoard} 
            onUpdate={fetchBoards}
          />
      )}

      {/* Modal de Criação (Mantido Igual) */}
      {isCreating && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="absolute inset-0 bg-[#0F1117]/60 backdrop-blur-sm" onClick={() => setIsCreating(false)}></div>
            <div className="bg-white dark:bg-[#16181D] w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800 relative z-10 scale-in-95 animate-in duration-200 max-h-[90vh] flex flex-col">
                <div className="p-6 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-gray-50 to-white dark:from-[#1F222A] dark:to-[#16181D]">
                    <h3 className="text-xl font-extrabold text-gray-800 dark:text-white tracking-tight">Novo Projeto</h3>
                </div>
                <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2.5">Título</label>
                        <input autoFocus value={newBoardTitle} onChange={e => setNewBoardTitle(e.target.value)} placeholder="Ex: Marketing..." className="w-full bg-gray-50 dark:bg-[#0F1117] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3.5 text-gray-800 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Cor de Identificação</label>
                        <div className="flex gap-3 flex-wrap">
                            {colorOptions.map(option => (
                                <button key={option.id} onClick={() => setSelectedColor(option.id)} className={`w-10 h-10 rounded-full transition-all hover:scale-110 relative border-2 ${selectedColor === option.id ? 'border-gray-800 dark:border-white ring-2 ring-gray-200 dark:ring-gray-700' : 'border-transparent'}`} style={{ backgroundColor: option.hex }}>
                                    {selectedColor === option.id && <svg className="w-5 h-5 text-white absolute inset-0 m-auto drop-shadow-md" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Adicionar Membros</label>
                        <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden max-h-40 overflow-y-auto custom-scrollbar bg-gray-50 dark:bg-[#0F1117]">
                            {isLoadingUsers ? (<div className="p-4 text-center text-xs text-gray-400">Carregando usuários...</div>) : availableUsers.length === 0 ? (<div className="p-4 text-center text-xs text-gray-400">Nenhum outro usuário encontrado.</div>) : (
                                availableUsers.map(user => (
                                    <div key={user.id} onClick={() => toggleMember(user.id)} className={`flex items-center gap-3 p-3 cursor-pointer transition-colors border-b border-gray-100 dark:border-gray-800 last:border-0 ${selectedMembers.includes(user.id) ? 'bg-rose-50 dark:bg-rose-900/20' : 'hover:bg-gray-100 dark:hover:bg-[#1F222A]'}`}>
                                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${selectedMembers.includes(user.id) ? 'bg-rose-500 border-rose-500' : 'border-gray-300 dark:border-gray-600'}`}>{selectedMembers.includes(user.id) && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}</div>
                                        <div className="flex-1 min-w-0"><p className={`text-sm font-bold truncate ${selectedMembers.includes(user.id) ? 'text-rose-700 dark:text-rose-300' : 'text-gray-700 dark:text-gray-300'}`}>{user.name}</p><p className="text-xs text-gray-400 truncate">{user.email}</p></div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
                <div className="p-6 bg-gray-50 dark:bg-[#1F222A]/50 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3 mt-auto">
                    <button onClick={() => setIsCreating(false)} className="px-5 py-2.5 text-gray-600 dark:text-gray-300 font-bold text-sm hover:bg-gray-200 dark:hover:bg-[#2C2C2C] rounded-xl transition-colors">Cancelar</button>
                    <button onClick={handleCreateBoard} disabled={!newBoardTitle.trim()} className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-rose-500/25 transition-all">Criar Projeto</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};