// ... (imports MANTENHA OS MESMOS)
import { useState, useRef, useEffect } from 'react';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ColumnWithCards, Card as CardType } from '../../types';
import { Card } from './Card'; 
import { ColumnModal } from './ColumnModal';

// ... (interfaces MANTENHA)
interface ColumnProps {
    column: ColumnWithCards;
    onCardClick: (card: CardType) => void;
    onCreateCard?: (columnId: string, title: string) => void;
    onDeleteColumn?: (columnId: string) => void;
    onUpdateColumn?: (columnId: string, newTitle: string) => void;
}

export const Column = ({ column, onCardClick, onCreateCard, onDeleteColumn, onUpdateColumn }: ColumnProps) => {
  // ... (estados e refs MANTENHA)
  const [isCreating, setIsCreating] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState("");
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: column.id,
    data: { type: 'COLUMN', column },
    animateLayoutChanges: () => false,
  });

  const style = { 
      transition, 
      transform: CSS.Translate.toString(transform),
      // DESIGN: Opacidade e escala sutis ao arrastar
      opacity: isDragging ? 0.5 : 1,
  };

  // ... (useEffect e handlers MANTENHA)
  useEffect(() => {
    if (isCreating && inputRef.current) {
        inputRef.current.focus({ preventScroll: true });
        inputRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [isCreating]);
  const handleSubmitCard = () => { if (!newCardTitle.trim()) { setIsCreating(false); return; } if (onCreateCard) { onCreateCard(column.id, newCardTitle); setNewCardTitle(""); setIsCreating(false); } };
  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmitCard(); } if (e.key === 'Escape') { setIsCreating(false); } };
  const handleSaveColumnTitle = (newTitle: string) => { if (onUpdateColumn && newTitle !== column.title) onUpdateColumn(column.id, newTitle); };
  const requestDelete = () => { if (column.cards.length > 0) setIsConfirmingDelete(true); else if (onDeleteColumn) onDeleteColumn(column.id); };

  if (isDragging) {
    // DESIGN: Placeholder de arrasto mais limpo, com borda tracejada e fundo sutil
    return <div ref={setNodeRef} style={style} className="bg-gray-100/50 dark:bg-[#16181D]/50 border-2 border-dashed border-gray-300 dark:border-gray-700 w-[300px] h-[500px] rounded-2xl flex-shrink-0 backdrop-blur-sm" />;
  }

  return (
    <>
      <div 
        ref={setNodeRef}
        style={style}
        // DESIGN: Coluna com fundo sutil que se mescla ao board, cantos mais arredondados (rounded-2xl)
        className="bg-gray-100/80 dark:bg-[#16181D] w-[300px] max-h-full rounded-2xl flex flex-col flex-shrink-0 shadow-sm border border-gray-200/50 dark:border-gray-800/50 backdrop-blur-xl transition-colors"
      >
        {/* HEADER DA COLUNA */}
        {!isConfirmingDelete ? (
          <div 
              {...attributes} 
              {...listeners} 
              // DESIGN: Header com padding melhor e alinhamento
              className="p-4 cursor-grab flex items-center justify-between group select-none flex-shrink-0"
          >
              <div className="flex gap-3 items-center flex-1 min-w-0">
                  {/* Título mais forte */}
                  <h3 className="truncate text-base font-extrabold text-gray-700 dark:text-gray-200 tracking-tight">
                      {column.title}
                  </h3>
                  {/* Contador estilo "Badge" */}
                  <span className="flex-shrink-0 flex justify-center items-center bg-white dark:bg-[#252830] text-gray-500 dark:text-gray-400 text-xs font-bold px-2.5 py-1 rounded-full shadow-sm border border-gray-100 dark:border-gray-700">
                      {column.cards.length}
                  </span>
              </div>
              
              {/* Ações (Editar/Excluir) com ícones melhores e hover suave */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                  {onUpdateColumn && (
                      <button onClick={() => setIsEditModalOpen(true)} onPointerDown={(e) => e.stopPropagation()} className="text-gray-400 hover:text-gray-700 dark:hover:text-white p-1.5 rounded-lg hover:bg-gray-200/50 dark:hover:bg-[#252830] transition-colors">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                  )}
                  {onDeleteColumn && (
                      <button onClick={requestDelete} onPointerDown={(e) => e.stopPropagation()} className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                  )}
              </div>
          </div>
        ) : (
          // Header de Confirmação de Exclusão (Redesenhado)
          <div className="p-3 flex items-center justify-between bg-red-50 dark:bg-red-900/30 rounded-t-2xl animate-in slide-in-from-top-2 duration-200 border-b border-red-100 dark:border-red-800/50">
              <span className="text-xs font-bold text-red-600 dark:text-red-300 flex items-center gap-2 pl-1">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  Excluir lista com cards?
              </span>
              <div className="flex gap-2">
                  <button onClick={() => setIsConfirmingDelete(false)} className="px-3 py-1.5 bg-white dark:bg-black/20 text-gray-600 dark:text-gray-300 text-xs rounded-lg font-bold hover:bg-gray-50 border border-gray-200 dark:border-transparent transition-colors" onPointerDown={(e) => e.stopPropagation()}>Cancelar</button>
                  <button onClick={() => { if(onDeleteColumn) onDeleteColumn(column.id); }} className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs rounded-lg font-bold shadow-sm transition-colors" onPointerDown={(e) => e.stopPropagation()}>Sim, excluir</button>
              </div>
          </div>
        )}

        {/* Lista de Cards com espaçamento melhor */}
        <div className="flex-1 flex flex-col gap-3 px-3 pb-3 pt-1 overflow-x-hidden overflow-y-auto custom-scrollbar min-h-[50px]">
          <SortableContext items={column.cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
            {column.cards.map((card) => <Card key={card.id} card={card} onClick={onCardClick} />)}
          </SortableContext>
        </div>

        {/* Footer (Adicionar Tarefa) */}
        {onCreateCard && (
          <div className="p-3 pt-1 flex-shrink-0">
              {isCreating ? (
                  // Input de criação de card mais elegante
                  <div className="bg-white dark:bg-[#1F222A] p-3 rounded-xl shadow-lg animate-in fade-in duration-200 border border-gray-200 dark:border-gray-700/80 ring-2 ring-rose-500/20">
                      <textarea ref={inputRef} value={newCardTitle} onChange={(e) => setNewCardTitle(e.target.value)} onKeyDown={handleKeyDown} placeholder="Descreva a tarefa..." className="w-full bg-transparent text-gray-800 dark:text-gray-100 text-sm resize-none outline-none placeholder:text-gray-400 mb-3 leading-relaxed" rows={2} />
                      <div className="flex items-center justify-end gap-2">
                          <button onClick={() => setIsCreating(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#2C2C2C] transition-colors">Cancelar</button>
                          <button onClick={handleSubmitCard} className="bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold py-1.5 px-4 rounded-lg shadow-md transition-all hover:scale-[1.02] active:scale-95">Adicionar</button>
                      </div>
                  </div>
              ) : (
                  // Botão de adicionar tarefa mais limpo
                  <button className="w-full flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-white dark:hover:bg-[#1F222A] rounded-xl py-2.5 px-3 transition-all text-sm font-semibold group border border-transparent hover:border-gray-200 dark:hover:border-gray-700/80 hover:shadow-sm" onClick={() => setIsCreating(true)}>
                      <svg className="w-5 h-5 text-gray-400 group-hover:text-rose-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                      Adicionar tarefa
                  </button>
              )}
          </div>
        )}
      </div>
      <ColumnModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} initialTitle={column.title} onSave={handleSaveColumnTitle} />
    </>
  );
};