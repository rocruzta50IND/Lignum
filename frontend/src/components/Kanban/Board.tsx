import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { 
  DndContext, 
  DragOverlay, 
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  pointerWithin,
  defaultDropAnimationSideEffects
} from '@dnd-kit/core';
import type { DragStartEvent, DragOverEvent, DragEndEvent, DropAnimation, CollisionDetection } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';

import { Column } from './Column'; 
import { Card } from './Card'; 
import { CardModal } from './CardModal';
import type { ColumnWithCards, Card as CardType } from '../../types';
import { api } from '../../services/api';

const dropAnimation: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: { active: { opacity: '0.5' } },
  }),
};

export const Board: React.FC = () => {
  const [columns, setColumns] = useState<ColumnWithCards[]>([]);
  const [activeCard, setActiveCard] = useState<CardType | null>(null);
  const [activeColumn, setActiveColumn] = useState<ColumnWithCards | null>(null);
  const [currentBoardId, setCurrentBoardId] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<CardType | null>(null);

  // NOVO: Estados para criação de coluna em linha
  const [isCreatingColumn, setIsCreatingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const columnsId = useMemo(() => columns.map((col) => col.id), [columns]);

  // --- FETCH ---
  const fetchBoardData = useCallback(async () => {
      try {
          let url = '/columns';
          if (currentBoardId) url += `?boardId=${currentBoardId}`;
          const response = await api.get(url);
          
          if (response.data && response.data.length > 0) {
              setColumns(response.data);
              if (!currentBoardId) setCurrentBoardId(response.data[0].board_id);
          } else if (!currentBoardId) {
              const r = await api.get('/boards'); 
              if (r.data.length > 0) setCurrentBoardId(r.data[0].id);
          }
      } catch (error) { console.error("Erro load:", error); }
  }, [currentBoardId]);

  useEffect(() => { fetchBoardData(); }, [fetchBoardData]); 

  // --- COLISÃO ---
  const customCollisionDetection: CollisionDetection = useCallback((args) => {
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length === 0) return [];
    return pointerCollisions;
  }, []);

  // --- HANDLERS DND ---
  const onDragStart = (event: DragStartEvent) => {
    if (event.active.data.current?.type === 'COLUMN') {
      setActiveColumn(event.active.data.current.column);
      return;
    }
    if (event.active.data.current?.type === 'CARD') {
      setActiveCard(event.active.data.current.card);
    }
  };

  const onDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;
    const activeId = active.id;
    const overId = over.id;
    if (activeId === overId) return;

    const isActiveACard = active.data.current?.type === 'CARD';
    const isOverACard = over.data.current?.type === 'CARD';
    const isOverAColumn = over.data.current?.type === 'COLUMN';

    if (!isActiveACard) return;

    if (isActiveACard && isOverACard) {
      setColumns((prev) => {
        const activeColumnIndex = prev.findIndex((col) => col.cards.some((c) => c.id === activeId));
        const overColumnIndex = prev.findIndex((col) => col.cards.some((c) => c.id === overId));
        if (activeColumnIndex === -1 || overColumnIndex === -1) return prev;
        
        const activeColumn = prev[activeColumnIndex];
        const overColumn = prev[overColumnIndex];
        if (activeColumnIndex === overColumnIndex) return prev; 

        const activeCardIndex = activeColumn.cards.findIndex((c) => c.id === activeId);
        const newCard = { ...activeColumn.cards[activeCardIndex], columnId: overColumn.id };
        const newActiveColumn = { ...activeColumn, cards: activeColumn.cards.filter((c) => c.id !== activeId) };
        
        const overCardIndex = overColumn.cards.findIndex((c) => c.id === overId);
        let newOverColumnCards = [...overColumn.cards];
        const isBelowOverItem = over && active.rect.current.translated && active.rect.current.translated.top > over.rect.top + over.rect.height;
        const modifier = isBelowOverItem ? 1 : 0;
        const newIndex = overCardIndex >= 0 ? overCardIndex + modifier : newOverColumnCards.length + 1;
        newOverColumnCards.splice(newIndex, 0, newCard);

        const newColumns = [...prev];
        newColumns[activeColumnIndex] = newActiveColumn;
        newColumns[overColumnIndex] = { ...overColumn, cards: newOverColumnCards };
        return newColumns;
      });
    }

    if (isActiveACard && isOverAColumn) {
      setColumns((prev) => {
        const activeColumnIndex = prev.findIndex((col) => col.cards.some((c) => c.id === activeId));
        const overColumnIndex = prev.findIndex((col) => col.id === overId);
        if (activeColumnIndex === -1 || overColumnIndex === -1) return prev;
        if (activeColumnIndex === overColumnIndex) return prev;

        const activeColumn = prev[activeColumnIndex];
        const overColumn = prev[overColumnIndex];
        const activeCardIndex = activeColumn.cards.findIndex((c) => c.id === activeId);
        const newCard = { ...activeColumn.cards[activeCardIndex], columnId: overColumn.id };
        const newActiveColumn = { ...activeColumn, cards: activeColumn.cards.filter((c) => c.id !== activeId) };
        const newColumns = [...prev];
        newColumns[activeColumnIndex] = newActiveColumn;
        newColumns[overColumnIndex] = { ...overColumn, cards: [...overColumn.cards, newCard] };
        return newColumns;
      });
    }
  };

  const onDragEnd = async (event: DragEndEvent) => {
    setActiveColumn(null);
    setActiveCard(null);
    const { active, over } = event;
    if (!over) return;
    const activeId = active.id;
    const overId = over.id;

    const activeColumnIndex = columns.findIndex((col) => col.cards.some((c) => c.id === activeId));
    let overColumnIndex = columns.findIndex((col) => col.id === overId);
    if (overColumnIndex === -1) {
        overColumnIndex = columns.findIndex((col) => col.cards.some((c) => c.id === overId));
    }
    if (activeColumnIndex === -1 || overColumnIndex === -1) return;

    const activeColumn = columns[activeColumnIndex];
    const overColumn = columns[overColumnIndex];

    if (activeColumnIndex !== overColumnIndex || activeId !== overId) {
        if (activeColumnIndex === overColumnIndex) {
             const oldIndex = activeColumn.cards.findIndex(c => c.id === activeId);
             const newIndex = activeColumn.cards.findIndex(c => c.id === overId);
             if (oldIndex !== newIndex) {
                 const newCards = arrayMove(activeColumn.cards, oldIndex, newIndex);
                 const newColumns = [...columns];
                 newColumns[activeColumnIndex] = { ...activeColumn, cards: newCards };
                 setColumns(newColumns);
             }
        }
        try {
            await api.patch(`/cards/${activeId}/move`, { newColumnId: overColumn.id, newRankPosition: 1000 });
        } catch (error) { console.error("Erro ao mover:", error); fetchBoardData(); }
    }
  };

  // --- ACTIONS ---

  // CORREÇÃO CRÍTICA AQUI: Injeção Local (Optimistic Update)
  const handleCreateCard = async (columnId: string, title: string) => {
    try { 
        // 1. Cria no servidor
        const response = await api.post('/cards', { columnId, title }); 
        const newCard = response.data;

        // 2. Atualiza APENAS a coluna certa no estado local
        // As outras colunas não são tocadas, então não perdem o scroll
        setColumns(prev => prev.map(col => {
            if (col.id === columnId) {
                return { ...col, cards: [...col.cards, newCard] };
            }
            return col;
        }));
        
        // REMOVIDO: fetchBoardData(); <- Isso causava o "reset" do scroll
    } catch (e) { 
        console.error(e); 
        fetchBoardData(); // Só recarrega tudo se der erro
    }
  };

  const handleDeleteColumn = async (columnId: string) => {
      try { await api.delete(`/columns/${columnId}`); setColumns(prev => prev.filter(col => col.id !== columnId)); } catch (e) { console.error(e); }
  }

  // Função auxiliar para criar coluna em linha
  const submitColumn = async () => {
    if (!newColumnTitle.trim()) { setIsCreatingColumn(false); return; }
    if (!currentBoardId) return;
    try { 
        const res = await api.post('/columns', { title: newColumnTitle, boardId: currentBoardId }); 
        setColumns(prev => [...prev, res.data]);
        setNewColumnTitle("");
        setIsCreatingColumn(false);
        setTimeout(() => {
            const board = document.getElementById('board-container');
            if(board) board.scrollTo({ left: board.scrollWidth, behavior: 'smooth' });
        }, 100);
    } catch (e) { console.error(e); }
  };

  const handleCardUpdate = (updatedCard: CardType) => {
    setColumns(prev => prev.map(col => {
      if (col.id !== updatedCard.columnId) return col;
      return { ...col, cards: col.cards.map(c => c.id === updatedCard.id ? updatedCard : c) };
    }));
    setSelectedCard(updatedCard);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={customCollisionDetection} 
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
    >
      <div id="board-container" className="flex h-full w-full overflow-x-auto overflow-y-hidden px-4 pb-4 pt-14 gap-6 scrollbar-thin bg-gradient-to-br from-[#09090b] via-[#121212] to-[#18181b] items-start">
        
        <SortableContext items={columnsId}>
            {columns.map((col) => (
            <Column 
                key={col.id} 
                column={col} 
                onCreateCard={handleCreateCard}
                onDeleteColumn={handleDeleteColumn}
                onCardClick={(card) => setSelectedCard(card)}
            />
            ))}
        </SortableContext>

        {isCreatingColumn ? (
             <div className="bg-[#161A1E] w-[280px] h-fit p-3 rounded-xl flex-shrink-0 shadow-xl border border-[#ffffff05] animate-in fade-in duration-200">
                <input
                    autoFocus
                    value={newColumnTitle}
                    onChange={(e) => setNewColumnTitle(e.target.value)}
                    onKeyDown={(e) => {
                        if(e.key === 'Enter') submitColumn();
                        if(e.key === 'Escape') setIsCreatingColumn(false);
                    }}
                    placeholder="Nome da lista..."
                    className="w-full bg-[#22272B] border border-gray-700 rounded px-3 py-2 text-sm text-white outline-none focus:border-rose-500 mb-2"
                />
                <div className="flex items-center gap-2">
                    <button onClick={submitColumn} className="bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium py-1.5 px-3 rounded transition-colors">Adicionar lista</button>
                    <button onClick={() => setIsCreatingColumn(false)} className="text-gray-400 hover:text-white p-2">✕</button>
                </div>
             </div>
        ) : (
            <button 
                onClick={() => setIsCreatingColumn(true)}
                className="min-w-[300px] h-[fit-content] max-h-[50px] flex-shrink-0 bg-white/5 hover:bg-white/10 backdrop-blur-sm rounded-xl flex items-center gap-2 px-4 py-3 text-gray-400 hover:text-white transition-all border border-white/5 hover:border-white/10 shadow-sm group"
            >
                <span className="text-xl leading-none group-hover:scale-110 transition-transform">+</span>
                <span className="font-medium text-sm">Adicionar outra lista</span>
            </button>
        )}
      </div>

      <DragOverlay dropAnimation={dropAnimation}>
        {activeCard && <Card card={activeCard} onClick={() => {}} />}
        {activeColumn && <Column column={activeColumn} onCardClick={()=>{}} />}
      </DragOverlay>

      {selectedCard && (
        <CardModal
          isOpen={!!selectedCard}
          card={selectedCard}
          boardId={currentBoardId || ''}
          onClose={() => { setSelectedCard(null); fetchBoardData(); }}
          onUpdateLocal={handleCardUpdate} 
        />
      )}
    </DndContext>
  );
};