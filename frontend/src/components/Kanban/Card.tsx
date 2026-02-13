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

  const style = {
    transition,
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
    scale: isDragging ? '1.02' : '1',
    zIndex: isDragging ? 999 : 'auto',
  };

  const priorityColors = {
      'Baixa': 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800/30',
      'Média': 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800/30',
      'Alta': 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800/30',
  };
  const priorityStyle = priorityColors[card.priority || 'Média'] || priorityColors['Média'];

  const hasChecklist = card.checklist && card.checklist.length > 0;
  const checklistCompleted = card.checklist?.filter(i => i.isChecked).length || 0;
  const checklistTotal = card.checklist?.length || 0;
  const hasComments = card.comments && card.comments.length > 0;
  const hasLabels = card.labels && card.labels.length > 0; // Verifica Labels

  if (isDragging) {
    return <div ref={setNodeRef} style={style} className="bg-white dark:bg-[#1F222A] p-4 rounded-2xl shadow-lg border-2 border-rose-500 dark:border-rose-400/50 cursor-grabbing" >
        <div className="h-4 w-2/3 bg-gray-200 dark:bg-gray-700 rounded mb-3 animate-pulse"></div>
        <div className="h-3 w-full bg-gray-100 dark:bg-gray-800 rounded animate-pulse"></div>
    </div>;
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onClick(card)}
      className="bg-white dark:bg-[#1F222A] p-4 rounded-2xl shadow-sm hover:shadow-md dark:shadow-none border border-gray-100 dark:border-gray-800/80 cursor-grab active:cursor-grabbing group transition-all duration-200 hover:-translate-y-0.5 relative overflow-hidden"
    >
      {/* Indicador de cor lateral */}
      {card.hexColor && card.hexColor !== '#2C2C2C' && (
          <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: card.hexColor }}></div>
      )}

      <div className={card.hexColor && card.hexColor !== '#2C2C2C' ? 'pl-3' : ''}>
        
        {/* Header: Prioridade + Drag Handle */}
        <div className="flex justify-between items-start mb-2.5">
            {card.priority && (
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${priorityStyle}`}>
                    {card.priority}
                </span>
            )}
            <svg className="w-4 h-4 text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
        </div>

        {/* --- ETIQUETAS (LABELS) --- */}
        {hasLabels && (
            <div className="flex flex-wrap gap-1.5 mb-2">
                {card.labels!.map(label => (
                    <span 
                        key={label.id} 
                        className="h-2 w-8 rounded-full opacity-90 hover:opacity-100 hover:h-4 hover:w-auto hover:px-2 hover:py-0.5 transition-all duration-200 text-[9px] font-bold text-white flex items-center justify-center overflow-hidden"
                        style={{ backgroundColor: label.color }}
                        title={label.title}
                    >
                        {/* Texto só aparece no hover para manter o card limpo, ou se quiser sempre visível mude a classe acima */}
                        <span className="opacity-0 hover:opacity-100 truncate">{label.title}</span>
                    </span>
                ))}
            </div>
        )}

        {/* Título */}
        <h4 className="text-[15px] font-bold text-gray-800 dark:text-gray-100 leading-snug mb-1.5">
            {card.title}
        </h4>
        
        {/* Descrição */}
        {card.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-3 leading-relaxed font-medium">
                {card.description}
            </p>
        )}

        {/* Rodapé */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800/50 text-xs font-medium text-gray-400 dark:text-gray-500">
            
            {card.dueDate && (
                 <div className={`flex items-center gap-1.5 ${new Date(card.dueDate) < new Date() ? 'text-red-500 dark:text-red-400' : ''}`}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    {new Date(card.dueDate).toLocaleDateString()}
                 </div>
            )}

            {hasChecklist && (
                <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <span>{checklistCompleted}/{checklistTotal}</span>
                </div>
            )}

            {hasComments && (
                <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
                    <span>{card.comments?.length}</span>
                </div>
            )}
            
            {card.assignee && card.assigneeName && (
                <div 
                    title={`Responsável: ${card.assigneeName}`}
                    className="ml-auto w-6 h-6 rounded-full bg-gradient-to-tr from-rose-100 to-orange-100 dark:from-rose-900/50 dark:to-orange-900/50 border border-white dark:border-[#1F222A] flex items-center justify-center text-[9px] font-bold text-rose-600 dark:text-rose-200 uppercase shadow-sm"
                >
                    {card.assigneeName.substring(0, 2)}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};