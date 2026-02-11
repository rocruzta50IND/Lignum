import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Card as CardType } from '../../types';

interface CardProps {
  card: CardType;
  onClick: (card: CardType) => void;
}

export const Card = ({ card, onClick }: CardProps) => {
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card.id,
    data: { type: 'CARD', card },
  });

  const style = {
    transition,
    transform: CSS.Transform.toString(transform),
  };

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="opacity-40 bg-[#22272B] min-h-[80px] rounded-lg cursor-grab"
      />
    );
  }

  // --- LÓGICA VISUAL ---
  const totalItems = card.checklist?.length || 0;
  const completedItems = card.checklist?.filter(i => i.isChecked).length || 0;
  
  // Cores de Etiqueta (Trello Style - Cores Sólidas mas suaves)
  const priorityColors = {
      'Alta': 'bg-[#F87171] text-white',      // Vermelho suave
      'Média': 'bg-[#FBBF24] text-black',     // Amarelo
      'Baixa': 'bg-[#4ADE80] text-black'      // Verde
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onClick(card)}
      // TRELLO STYLE: bg-[#22272B] (Cinza Chumbo), Sombra leve, Hover clareia
      className="bg-[#22272B] p-3 rounded-lg cursor-pointer hover:outline hover:outline-2 hover:outline-rose-500/50 shadow-sm hover:bg-[#2C333A] group relative flex flex-col gap-2 group"
    >
      
      {/* Etiquetas (Prioridade) */}
      {card.priority && (
          <div className="flex flex-wrap gap-1">
              <span className={`h-2 w-10 rounded-full ${priorityColors[card.priority]} opacity-80 hover:opacity-100 transition-opacity`} title={`Prioridade: ${card.priority}`}></span>
          </div>
      )}

      {/* Título */}
      <p className="text-[#B6C2CF] text-sm leading-snug break-words font-normal">
        {card.title}
      </p>

      {/* Ícones de Rodapé (Metadados) */}
      {(totalItems > 0 || card.dueDate || (card.comments?.length || 0) > 0 || card.description) && (
          <div className="flex items-center gap-3 mt-1 text-xs text-[#9fadbc]">
            
            {/* Ícone Descrição */}
            {card.description && (
               <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" /></svg>
            )}

            {/* Data */}
            {card.dueDate && (
                <div className="flex items-center gap-1 hover:text-white bg-[#A6C5E20F] px-1 rounded">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <span>{new Date(card.dueDate).toLocaleDateString('pt-BR', {day: '2-digit', month: 'short'})}</span>
                </div>
            )}

            {/* Checklist */}
            {totalItems > 0 && (
                <div className={`flex items-center gap-1 px-1 rounded ${completedItems === totalItems ? 'bg-green-900/40 text-green-400' : ''}`}>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                    <span>{completedItems}/{totalItems}</span>
                </div>
            )}
             {/* Comentários */}
             {(card.comments?.length || 0) > 0 && (
                <div className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                    <span>{card.comments?.length}</span>
                </div>
            )}
          </div>
      )}
    </div>
  );
};