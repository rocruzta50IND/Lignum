import { useState, useRef, useEffect } from 'react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ColumnWithCards, Card as CardType } from '../../types';
import { Card } from './Card'; 

interface ColumnProps {
  column: ColumnWithCards;
  onCardClick: (card: CardType) => void;
  onCreateCard?: (columnId: string, title: string) => void;
  onDeleteColumn?: (columnId: string) => void;
}

export const Column = ({ column, onCardClick, onCreateCard, onDeleteColumn }: ColumnProps) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState("");
  // NOVO: Estado para confirmação de exclusão da coluna
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: column.id,
    data: { type: 'COLUMN', column },
  });

  const style = { transition, transform: CSS.Transform.toString(transform) };

  useEffect(() => {
    if (isCreating && inputRef.current) {
        inputRef.current.focus({ preventScroll: true });
        inputRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [isCreating]);

  const handleSubmitCard = () => {
      if (!newCardTitle.trim()) { setIsCreating(false); return; }
      if (onCreateCard) {
          onCreateCard(column.id, newCardTitle);
          setNewCardTitle(""); 
          setIsCreating(false); 
      }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmitCard(); }
      if (e.key === 'Escape') { setIsCreating(false); }
  };

  // Lógica segura de exclusão
  const requestDelete = () => {
      if (column.cards.length > 0) {
          setIsConfirmingDelete(true);
      } else if (onDeleteColumn) {
          onDeleteColumn(column.id);
      }
  };

  if (isDragging) {
    return <div ref={setNodeRef} style={style} className="bg-gray-200 dark:bg-[#1C2025] opacity-50 border-2 border-dashed border-gray-400 dark:border-gray-600 w-[280px] h-[500px] rounded-xl flex-shrink-0" />;
  }

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className="bg-[#F3F4F6] dark:bg-[#161A1E] w-[280px] max-h-full rounded-xl flex flex-col flex-shrink-0 shadow-lg border border-transparent dark:border-[#ffffff05]"
    >
      {/* HEADER DINÂMICO */}
      {!isConfirmingDelete ? (
        // Header Normal
        <div {...attributes} {...listeners} className="p-3 cursor-grab flex items-center justify-between group select-none flex-shrink-0">
            <div className="flex gap-2 items-center text-gray-700 dark:text-gray-200 font-bold text-sm pl-1">
            <span className="truncate tracking-wide">{column.title}</span>
            <span className="flex justify-center items-center bg-gray-200 dark:bg-[#252A30] text-gray-600 dark:text-gray-500 text-xs font-bold px-2 py-0.5 rounded-full">
                {column.cards.length}
            </span>
            </div>
            {onDeleteColumn && (
                <button onClick={requestDelete} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1">✕</button>
            )}
        </div>
      ) : (
        // Header de Confirmação (Vermelho)
        <div className="p-2 flex items-center justify-between bg-red-100 dark:bg-red-900/40 rounded-t-xl animate-in slide-in-from-top-2 duration-200">
            <span className="text-xs font-bold text-red-600 dark:text-red-300 pl-2">Excluir com cards?</span>
            <div className="flex gap-1">
                <button 
                    onClick={() => { if(onDeleteColumn) onDeleteColumn(column.id); }} 
                    className="bg-red-500 hover:bg-red-600 text-white text-xs px-2 py-1 rounded font-bold"
                    onPointerDown={(e) => e.stopPropagation()} // Impede iniciar arrasto ao clicar
                >
                    Sim
                </button>
                <button 
                    onClick={() => setIsConfirmingDelete(false)} 
                    className="bg-white dark:bg-black/20 text-gray-600 dark:text-gray-300 text-xs px-2 py-1 rounded font-bold hover:bg-gray-100"
                    onPointerDown={(e) => e.stopPropagation()}
                >
                    Não
                </button>
            </div>
        </div>
      )}

      <div className="flex-1 flex flex-col gap-2.5 px-2.5 pb-2 pt-3 overflow-x-hidden overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-700 min-h-[50px]">
        <SortableContext items={column.cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {column.cards.map((card) => <Card key={card.id} card={card} onClick={onCardClick} />)}
        </SortableContext>
      </div>

      {onCreateCard && (
        <div className="p-2.5 pt-2 flex-shrink-0">
            {isCreating ? (
                <div className="bg-white dark:bg-[#22272B] p-2 rounded-lg border border-rose-500/50 shadow-lg animate-in fade-in duration-200">
                    <textarea ref={inputRef} value={newCardTitle} onChange={(e) => setNewCardTitle(e.target.value)} onKeyDown={handleKeyDown} placeholder="Insira um título..." className="w-full bg-transparent text-gray-800 dark:text-gray-200 text-sm resize-none outline-none placeholder:text-gray-400 mb-2" rows={2} />
                    <div className="flex items-center gap-2">
                        <button onClick={handleSubmitCard} className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold py-1.5 px-3 rounded transition-colors">Adicionar</button>
                        <button onClick={() => setIsCreating(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1">✕</button>
                    </div>
                </div>
            ) : (
                <button className="w-full flex items-center gap-2 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-[#252A30] rounded-lg py-1.5 px-2 transition-all text-sm font-medium text-left" onClick={() => setIsCreating(true)}>
                    <span className="text-lg leading-none">+</span> Adicionar tarefa
                </button>
            )}
        </div>
      )}
    </div>
  );
};