import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useTheme } from '../contexts/ThemeContext'; // Importar ThemeContext

interface BoardSummary {
  id: string;
  title: string;
  background_color: string;
}

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { theme } = useTheme(); // Pegar o tema atual
  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newBoardTitle, setNewBoardTitle] = useState("");
  const [selectedColor, setSelectedColor] = useState("#1E1E1E"); // Default color ID

  // Paleta de Cores (Definimos códigos para Light e Dark)
  const colorOptions = [
    { id: '#1E1E1E', light: '#FFFFFF', dark: '#1E1E1E', name: 'Padrão' }, // Branco no Light, Preto no Dark
    { id: '#334155', light: '#F1F5F9', dark: '#334155', name: 'Slate' },
    { id: '#9f1239', light: '#FFE4E6', dark: '#9f1239', name: 'Rose' },
    { id: '#065f46', light: '#D1FAE5', dark: '#065f46', name: 'Emerald' },
    { id: '#1e40af', light: '#DBEAFE', dark: '#1e40af', name: 'Blue' },
    { id: '#5b21b6', light: '#EDE9FE', dark: '#5b21b6', name: 'Violet' },
    { id: '#854d0e', light: '#FEF3C7', dark: '#854d0e', name: 'Amber' },
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
      // Salvamos o ID da cor (ex: #1E1E1E) no banco
      const res = await api.post('/boards', { title: newBoardTitle, background_color: selectedColor });
      setBoards([res.data, ...boards]);
      setIsCreating(false);
      setNewBoardTitle("");
    } catch (error) { console.error(error); }
  };

  return (
    <div className="flex-1 p-8 md:p-12 overflow-y-auto bg-[#F8FAFC] dark:bg-[#0F1117] transition-colors h-full">
      <main className="max-w-7xl mx-auto">
        
        {/* Header da Seção */}
        <div className="flex items-center gap-3 mb-8">
            <div className="p-2.5 rounded-xl bg-white dark:bg-[#1F222A] text-rose-500 shadow-sm border border-gray-100 dark:border-gray-800">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
            </div>
            <div>
                <h2 className="text-xl font-extrabold text-gray-800 dark:text-white tracking-tight leading-none">Seus Projetos</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Gerencie seus quadros e tarefas.</p>
            </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in duration-500">
            
            {/* CARD CRIAR (Dashed) */}
            <button 
                onClick={() => setIsCreating(true)}
                className="group h-48 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-rose-400 dark:hover:border-rose-500 bg-transparent flex flex-col items-center justify-center cursor-pointer transition-all duration-300 hover:bg-rose-50/50 dark:hover:bg-rose-900/5"
            >
                <div className="w-14 h-14 rounded-full bg-white dark:bg-[#1F222A] shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-center text-gray-400 dark:text-gray-500 group-hover:text-rose-500 group-hover:scale-110 transition-all mb-3">
                    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                </div>
                <span className="text-sm font-bold text-gray-500 dark:text-gray-400 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">Criar novo quadro</span>
            </button>

            {/* LISTA DE BOARDS */}
            {boards.map(board => {
                // Encontra as cores baseadas no ID salvo ou usa padrão
                const colorConfig = colorOptions.find(c => c.id === board.background_color) || colorOptions[0];
                const activeColor = theme === 'dark' ? colorConfig.dark : colorConfig.light;
                
                // Texto escuro se for Light Mode, Texto claro se for Dark Mode
                const textColorClass = theme === 'dark' ? 'text-white' : 'text-gray-800';
                const borderColorClass = theme === 'dark' ? 'border-white/5' : 'border-gray-200';

                return (
                <div 
                    key={board.id}
                    onClick={() => navigate(`/board/${board.id}`)}
                    className={`h-48 rounded-2xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer relative overflow-hidden group border ${borderColorClass} flex flex-col justify-between`}
                    style={{ backgroundColor: activeColor }}
                >
                    <div className="relative z-10 flex flex-col h-full justify-between">
                        <div>
                             {/* Badge "Projeto" */}
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md mb-2 inline-block opacity-70 ${theme === 'dark' ? 'bg-black/20 text-white' : 'bg-black/5 text-gray-600'}`}>
                                Projeto
                            </span>
                            <h3 className={`font-bold text-xl tracking-tight leading-snug ${textColorClass}`}>
                                {board.title}
                            </h3>
                        </div>
                        
                        <div className={`flex items-center gap-2 text-sm font-semibold opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0 ${theme === 'dark' ? 'text-white/80' : 'text-gray-600'}`}>
                            Abrir quadro 
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                        </div>
                    </div>
                    
                    {/* Decoração de fundo sutil */}
                    <div className={`absolute -bottom-6 -right-6 w-32 h-32 rounded-full opacity-10 ${theme === 'dark' ? 'bg-white' : 'bg-black'}`} />
                </div>
            )})}
        </div>
      </main>

      {/* MODAL DE CRIAÇÃO (Glassmorphism) */}
      {isCreating && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="absolute inset-0 bg-black/40 dark:bg-black/70 backdrop-blur-sm" onClick={() => setIsCreating(false)}></div>
            <div className="bg-white dark:bg-[#16181D] w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800 relative z-10 scale-in-95 animate-in duration-200">
                <div className="p-6 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-gray-50 to-white dark:from-[#1F222A] dark:to-[#16181D]">
                    <h3 className="text-xl font-extrabold text-gray-800 dark:text-white tracking-tight">Novo Projeto</h3>
                </div>
                <div className="p-6 space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2.5">Título</label>
                        <input autoFocus value={newBoardTitle} onChange={e => setNewBoardTitle(e.target.value)} placeholder="Ex: Marketing..." className="w-full bg-gray-50 dark:bg-[#0F1117] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3.5 text-gray-800 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-rose-500" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Cor do Tema</label>
                        <div className="flex gap-3 flex-wrap">
                            {colorOptions.map(option => (
                                <button 
                                    key={option.id} 
                                    onClick={() => setSelectedColor(option.id)} 
                                    className={`w-10 h-10 rounded-full transition-all hover:scale-110 relative border-2 ${selectedColor === option.id ? 'border-rose-500 ring-2 ring-rose-500/20' : 'border-transparent'}`}
                                    style={{ backgroundColor: theme === 'dark' ? option.dark : option.dark }} // Mostra a cor "real" no seletor
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