import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';

interface BoardSummary {
  id: string;
  title: string;
  background_color: string;
}

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newBoardTitle, setNewBoardTitle] = useState("");
  const [selectedColor, setSelectedColor] = useState("#1E1E1E");

  // Paleta de Cores (Definimos códigos para uso como accent)
  const colorOptions = [
    { id: '#1E1E1E', hex: '#64748b', name: 'Padrão' }, // Slate
    { id: '#334155', hex: '#3b82f6', name: 'Azul' },
    { id: '#9f1239', hex: '#f43f5e', name: 'Rose' },
    { id: '#065f46', hex: '#10b981', name: 'Verde' },
    { id: '#1e40af', hex: '#6366f1', name: 'Indigo' },
    { id: '#5b21b6', hex: '#8b5cf6', name: 'Violeta' },
    { id: '#854d0e', hex: '#f59e0b', name: 'Amarelo' },
  ];

  useEffect(() => { fetchBoards(); }, []);

  const fetchBoards = async () => {
    try { const res = await api.get('/boards'); setBoards(res.data); } 
    catch (error) { console.error("Erro ao buscar boards", error); }
  };

  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBoardTitle.trim()) return;
    try {
      const res = await api.post('/boards', { title: newBoardTitle, background_color: selectedColor });
      setBoards([res.data, ...boards]);
      setIsCreating(false);
      setNewBoardTitle("");
    } catch (error) { console.error(error); }
  };

  return (
    // DESIGN: Fundo base
    <div className="flex-1 p-8 md:p-12 overflow-y-auto bg-[#F8FAFC] dark:bg-[#0F1117] transition-colors h-full font-sans">
      <main className="max-w-7xl mx-auto">
        
        {/* Header da Seção */}
        <div className="flex items-center gap-3 mb-10 opacity-90">
            <div className="p-2.5 rounded-xl bg-white dark:bg-[#1F222A] text-rose-500 shadow-sm border border-gray-100 dark:border-gray-800/60">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
            </div>
            <div>
                <h2 className="text-2xl font-extrabold text-gray-800 dark:text-white tracking-tight leading-none">Seus Projetos</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">Gerencie seus quadros e tarefas.</p>
            </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in duration-500">
            
            {/* CARD CRIAR (Dashed - Mais sutil) */}
            <button 
                onClick={() => setIsCreating(true)}
                className="group h-40 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-800 hover:border-rose-400 dark:hover:border-rose-500/50 bg-transparent flex flex-col items-center justify-center cursor-pointer transition-all duration-300 hover:bg-rose-50/50 dark:hover:bg-rose-900/5"
            >
                <div className="w-12 h-12 rounded-full bg-white dark:bg-[#1F222A] shadow-sm border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-400 dark:text-gray-500 group-hover:text-rose-500 group-hover:scale-110 transition-all mb-3">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                </div>
                <span className="text-sm font-bold text-gray-500 dark:text-gray-400 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">Criar novo quadro</span>
            </button>

            {/* LISTA DE BOARDS (Redesenhados para Contraste e Profundidade) */}
            {boards.map(board => {
                // Pega a cor accent ou usa padrão
                const colorConfig = colorOptions.find(c => c.id === board.background_color) || colorOptions[0];
                const accentColor = colorConfig.hex;

                return (
                <div 
                    key={board.id}
                    onClick={() => navigate(`/board/${board.id}`)}
                    // DESIGN:
                    // Light: Fundo Branco, Borda Cinza Clara, Sombra Suave.
                    // Dark: Fundo Cinza Médio (#1E2028) para contrastar com o fundo preto (#0F1117), Borda Cinza Escura.
                    className="h-40 rounded-2xl p-6 relative overflow-hidden group cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:hover:shadow-black/50 bg-white dark:bg-[#1E2028] border border-gray-200 dark:border-gray-700/50 hover:border-gray-300 dark:hover:border-gray-600 flex flex-col justify-between"
                >
                    {/* Barra Lateral Colorida (Identidade) */}
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 transition-all group-hover:w-2" style={{ backgroundColor: accentColor }}></div>

                    {/* Conteúdo */}
                    <div className="pl-2">
                        {/* Badge do Projeto com cor suave */}
                        <div className="mb-3">
                            <span 
                                className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md"
                                style={{ 
                                    color: accentColor,
                                    backgroundColor: theme === 'dark' ? `${accentColor}20` : `${accentColor}15` // Opacidade via hex (simulado)
                                }}
                            >
                                Projeto
                            </span>
                        </div>
                        
                        <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100 tracking-tight leading-snug line-clamp-2 group-hover:text-black dark:group-hover:text-white transition-colors">
                            {board.title}
                        </h3>
                    </div>
                    
                    {/* Footer do Card */}
                    <div className="pl-2 flex items-center justify-between mt-auto pt-4">
                        <div className="flex -space-x-2 overflow-hidden">
                            {/* Avatares falsos para dar vida (pode remover se quiser) */}
                            <div className="inline-block h-6 w-6 rounded-full ring-2 ring-white dark:ring-[#1E2028] bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-[8px] font-bold text-gray-500 dark:text-gray-300">EU</div>
                        </div>
                        
                        {/* Seta que aparece no hover */}
                        <div className="opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                        </div>
                    </div>
                </div>
            )})}
        </div>
      </main>

      {/* MODAL DE CRIAÇÃO */}
      {isCreating && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="absolute inset-0 bg-[#0F1117]/60 backdrop-blur-sm" onClick={() => setIsCreating(false)}></div>
            <div className="bg-white dark:bg-[#16181D] w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800 relative z-10 scale-in-95 animate-in duration-200">
                <div className="p-6 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-gray-50 to-white dark:from-[#1F222A] dark:to-[#16181D]">
                    <h3 className="text-xl font-extrabold text-gray-800 dark:text-white tracking-tight">Novo Projeto</h3>
                </div>
                <div className="p-6 space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2.5">Título</label>
                        <input autoFocus value={newBoardTitle} onChange={e => setNewBoardTitle(e.target.value)} placeholder="Ex: Marketing..." className="w-full bg-gray-50 dark:bg-[#0F1117] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3.5 text-gray-800 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Cor de Identificação</label>
                        <div className="flex gap-3 flex-wrap">
                            {colorOptions.map(option => (
                                <button 
                                    key={option.id} 
                                    onClick={() => setSelectedColor(option.id)} 
                                    className={`w-10 h-10 rounded-full transition-all hover:scale-110 relative border-2 ${selectedColor === option.id ? 'border-gray-800 dark:border-white ring-2 ring-gray-200 dark:ring-gray-700' : 'border-transparent'}`}
                                    style={{ backgroundColor: option.hex }} 
                                    title={option.name}
                                >
                                    {selectedColor === option.id && <svg className="w-5 h-5 text-white absolute inset-0 m-auto drop-shadow-md" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="p-6 bg-gray-50 dark:bg-[#1F222A]/50 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3">
                    <button onClick={() => setIsCreating(false)} className="px-5 py-2.5 text-gray-600 dark:text-gray-300 font-bold text-sm hover:bg-gray-200 dark:hover:bg-[#2C2C2C] rounded-xl transition-colors">Cancelar</button>
                    <button onClick={handleCreateBoard} disabled={!newBoardTitle.trim()} className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-rose-500/25 transition-all">Criar Projeto</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};