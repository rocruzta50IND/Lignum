import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Card as CardType } from '../../types';

interface CardProps {
  card: CardType;
  onClick: (card: CardType) => void;
}

export const Card = ({ card, onClick }: CardProps) => {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { type: 'CARD', card },
  });

  const style = { transition, transform: CSS.Transform.toString(transform) };

  if (isDragging) {
    return (
      <div ref={setNodeRef} style={style} className="opacity-40 bg-gray-300 dark:bg-[#22272B] min-h-[80px] rounded-lg cursor-grab" />
    );
  }

  const totalItems = card.checklist?.length || 0;
  const completedItems = card.checklist?.filter(i => i.isChecked).length || 0;
  
  const priorityColors = {
      'Alta': 'bg-red-100 text-red-700 dark:bg-[#F87171] dark:text-white',
      'Média': 'bg-amber-100 text-amber-700 dark:bg-[#FBBF24] dark:text-black',
      'Baixa': 'bg-emerald-100 text-emerald-700 dark:bg-[#4ADE80] dark:text-black'
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onClick(card)}
      // DESIGN MODERNO: Branco no Light, Cinza no Dark. Sombra suave no Light.
      className="
        bg-white dark:bg-[#22272B] 
        p-3 rounded-lg cursor-pointer 
        shadow-sm border border-gray-200 dark:border-transparent
        hover:shadow-md dark:hover:bg-[#2C333A] 
        hover:ring-2 hover:ring-rose-500/50 
        group relative flex flex-col gap-2 transition-all
      "
    >
      {/* Etiquetas */}
      {card.priority && (
          <div className="flex flex-wrap gap-1">
              <span className={`h-1.5 w-8 rounded-full ${priorityColors[card.priority]} transition-colors`} title={card.priority}></span>
          </div>
      )}

      {/* Título: Preto no Light, Cinza claro no Dark */}
      <p className="text-gray-700 dark:text-[#B6C2CF] text-sm leading-snug break-words font-medium">
        {card.title}
      </p>

      {/* Metadados */}
      {(totalItems > 0 || card.dueDate || (card.comments?.length || 0) > 0 || card.description) && (
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 dark:text-[#9fadbc]">
            {card.description && <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" /></svg>}
            
            {card.dueDate && (
                <div className="flex items-center gap-1 hover:text-rose-500 transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <span>{new Date(card.dueDate).toLocaleDateString('pt-BR', {day: '2-digit', month: 'short'})}</span>
                </div>
            )}

            {totalItems > 0 && (
                <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${completedItems === totalItems ? 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400' : ''}`}>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                    <span>{completedItems}/{totalItems}</span>
                </div>
            )}
             {(card.comments?.length || 0) > 0 && (
                <div className="flex items-center gap-1"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg><span>{card.comments?.length}</span></div>
            )}
          </div>
      )}
    </div>
  );
};