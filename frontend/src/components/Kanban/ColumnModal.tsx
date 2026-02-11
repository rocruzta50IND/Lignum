import React, { useState, useEffect } from 'react';

interface ColumnModalProps {
  isOpen: boolean; onClose: () => void; initialTitle: string; onSave: (newTitle: string) => void;
}

export const ColumnModal: React.FC<ColumnModalProps> = ({ isOpen, onClose, initialTitle, onSave }) => {
  const [title, setTitle] = useState(initialTitle);
  useEffect(() => { setTitle(initialTitle); }, [initialTitle]);
  if (!isOpen) return null;
  const handleSave = () => { if (title.trim()) { onSave(title); onClose(); } };

  return (
    // DESIGN: Backdrop e Modal estilo Glassmorphism
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-[#0F1117]/60 backdrop-blur-md" onClick={onClose}></div>
      
      <div className="w-full max-w-md bg-white dark:bg-[#16181D] rounded-3xl shadow-2xl overflow-hidden transition-colors border border-gray-100 dark:border-gray-800 relative z-10 scale-in-95 animate-in duration-200">
        
        {/* Header com gradiente sutil */}
        <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-800/50 bg-gradient-to-r from-gray-50 to-white dark:from-[#1F222A] dark:to-[#16181D]">
          <h2 className="text-lg font-extrabold text-gray-800 dark:text-white flex items-center gap-3 tracking-tight">
            <span className="p-2 bg-rose-100 dark:bg-rose-900/30 rounded-xl text-rose-500 dark:text-rose-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            </span>
            Editar Lista
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-white p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#252830] transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-8 space-y-6 bg-[#F8FAFC] dark:bg-[#16181D]">
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
              Nome da Lista
            </label>
            <input 
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              // DESIGN: Input grande e moderno
              className="w-full bg-white dark:bg-[#1F222A] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3.5 text-gray-800 dark:text-white font-bold text-lg focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500 transition-all shadow-sm"
              placeholder="Ex: Em Progresso..."
            />
          </div>
          
          {/* Placeholder de futuras configs (Visualmente melhorado) */}
          <div className="p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-800/30 flex items-center gap-3">
             <svg className="w-6 h-6 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
             <p className="text-xs font-medium text-blue-600 dark:text-blue-300 leading-relaxed">
                Em breve você poderá definir cores personalizadas e limites de tarefas (WIP) para esta coluna.
             </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-white dark:bg-[#16181D] border-t border-gray-100 dark:border-gray-800/50 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 text-gray-600 dark:text-gray-300 font-bold text-sm hover:bg-gray-100 dark:hover:bg-[#252830] rounded-xl transition-colors">Cancelar</button>
          <button onClick={handleSave} disabled={!title.trim()} className="px-6 py-2.5 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-700 hover:to-rose-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-rose-500/20 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:shadow-none disabled:hover:scale-100">Salvar</button>
        </div>
      </div>
    </div>
  );
};