import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { DndContext, DragOverlay, useSensor, useSensors, PointerSensor, KeyboardSensor, pointerWithin, defaultDropAnimationSideEffects } from '@dnd-kit/core';
import type { DragStartEvent, DragOverEvent, DragEndEvent, DropAnimation, CollisionDetection } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { Column } from './Column'; 
import { Card } from './Card'; 
import { CardModal } from './CardModal';
import type { ColumnWithCards, Card as CardType } from '../../types';
import { api } from '../../services/api';
import { useTheme } from '../../contexts/ThemeContext';

const dropAnimation: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.5' } } }),
};

export const Board: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [columns, setColumns] = useState<ColumnWithCards[]>([]);
  const [activeCard, setActiveCard] = useState<CardType | null>(null);
  const [activeColumn, setActiveColumn] = useState<ColumnWithCards | null>(null);
  const [currentBoardId, setCurrentBoardId] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<CardType | null>(null);
  const [isCreatingColumn, setIsCreatingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  
  // IMPORTANTE: Use useMemo para IDs
  const columnsId = useMemo(() => columns.map((col) => col.id), [columns]);

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

  const customCollisionDetection: CollisionDetection = useCallback((args) => {
    const pointerCollisions = pointerWithin(args);
    return pointerCollisions.length > 0 ? pointerCollisions : [];
  }, []);

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
      
      // Só gerenciamos drag over se for CARD. Colunas são tratadas apenas no onDragEnd.
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
      const { active, over } = event;
      
      // Limpa estados de "arrastando"
      setActiveColumn(null);
      setActiveCard(null);

      if (!over) return;

      // --- 1. LÓGICA DE COLUNAS ---
      if (active.data.current?.type === 'COLUMN') {
          if (active.id !== over.id) {
              const oldIndex = columns.findIndex((col) => col.id === active.id);
              const newIndex = columns.findIndex((col) => col.id === over.id);

              // 1. Atualiza visualmente (Optimistic)
              setColumns((items) => arrayMove(items, oldIndex, newIndex));

              // 2. Chama o Backend
              try {
                  await api.patch(`/columns/${active.id}/move`, { newPosition: newIndex });
              } catch (error) {
                  console.error("Erro ao mover coluna:", error);
                  fetchBoardData(); // Reverte se falhar
              }
          }
          return; // Para por aqui, não executa lógica de cards
      }

      // --- 2. LÓGICA DE CARDS ---
      const activeId = active.id;
      const overId = over.id;
      const activeColumnIndex = columns.findIndex((col) => col.cards.some((c) => c.id === activeId));
      let overColumnIndex = columns.findIndex((col) => col.id === overId);
      if (overColumnIndex === -1) overColumnIndex = columns.findIndex((col) => col.cards.some((c) => c.id === overId));
      
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
          try { await api.patch(`/cards/${activeId}/move`, { newColumnId: overColumn.id, newRankPosition: 1000 }); } catch (error) { console.error(error); fetchBoardData(); }
      }
  };

  // Funções auxiliares (Update, Create, Delete...)
  const handleUpdateColumn = async (columnId: string, newTitle: string) => {
      setColumns(prev => prev.map(col => col.id === columnId ? { ...col, title: newTitle } : col));
      try { await api.patch(`/columns/${columnId}`, { title: newTitle }); } catch (e) { console.error(e); fetchBoardData(); }
  };
  const handleCreateCard = async (columnId: string, title: string) => {
    try { 
        const response = await api.post('/cards', { columnId, title }); 
        setColumns(prev => prev.map(col => col.id === columnId ? { ...col, cards: [...col.cards, response.data] } : col));
    } catch (e) { console.error(e); fetchBoardData(); }
  };
  const handleDeleteColumn = async (columnId: string) => { try { await api.delete(`/columns/${columnId}`); setColumns(prev => prev.filter(col => col.id !== columnId)); } catch (e) { console.error(e); } }
  const handleDeleteCard = async (cardId: string, columnId: string) => {
      setColumns(prev => prev.map(col => { if (col.id !== columnId) return col; return { ...col, cards: col.cards.filter(c => c.id !== cardId) }; }));
      setSelectedCard(null);
      try { await api.delete(`/cards/${cardId}`); } catch(e) { console.error(e); fetchBoardData(); }
  };
  const submitColumn = async () => {
    if (!newColumnTitle.trim()) { setIsCreatingColumn(false); return; }
    if (!currentBoardId) return;
    try { 
        const res = await api.post('/columns', { title: newColumnTitle, boardId: currentBoardId }); 
        setColumns(prev => [...prev, res.data]);
        setNewColumnTitle("");
        setIsCreatingColumn(false);
        setTimeout(() => { const board = document.getElementById('board-container'); if(board) board.scrollTo({ left: board.scrollWidth, behavior: 'smooth' }); }, 100);
    } catch (e) { console.error(e); }
  };
  const handleCardUpdate = (updatedCard: CardType) => {
    setColumns(prev => prev.map(col => col.id === updatedCard.columnId ? { ...col, cards: col.cards.map(c => c.id === updatedCard.id ? updatedCard : c) } : col));
    setSelectedCard(updatedCard);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={customCollisionDetection} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd}>
      <div id="board-container" 
        className="flex h-full w-full overflow-x-auto overflow-y-hidden px-4 pb-4 pt-4 gap-6 scrollbar-thin 
        bg-gray-100 dark:bg-gradient-to-br dark:from-[#09090b] dark:via-[#121212] dark:to-[#18181b] 
        items-start transition-colors duration-300 relative"
      >
        <button onClick={toggleTheme} className="fixed top-3 right-64 z-[9999] w-9 h-9 rounded-md flex items-center justify-center bg-transparent hover:bg-white/10 text-gray-400 hover:text-yellow-400 transition-all cursor-pointer border border-transparent hover:border-white/5" title="Alternar Tema">
            {theme === 'dark' ? (<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>) : (<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>)}
        </button>

        {/* DEFINIR ESTRATÉGIA HORIZONTAL PARA COLUNAS */}
        <SortableContext items={columnsId} strategy={horizontalListSortingStrategy}>
            {columns.map((col) => (
            <Column key={col.id} column={col} onCreateCard={handleCreateCard} onDeleteColumn={handleDeleteColumn} onCardClick={(card) => setSelectedCard(card)} onUpdateColumn={handleUpdateColumn} />
            ))}
        </SortableContext>

        {isCreatingColumn ? (
             <div className="bg-white dark:bg-[#161A1E] w-[280px] h-fit p-3 rounded-xl flex-shrink-0 shadow-xl border border-gray-200 dark:border-[#ffffff05] animate-in fade-in duration-200">
                <input autoFocus value={newColumnTitle} onChange={(e) => setNewColumnTitle(e.target.value)} onKeyDown={(e) => { if(e.key === 'Enter') submitColumn(); if(e.key === 'Escape') setIsCreatingColumn(false); }} placeholder="Nome da lista..." className="w-full bg-gray-50 dark:bg-[#22272B] border border-gray-300 dark:border-gray-700 rounded px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-rose-500 mb-2" />
                <div className="flex items-center gap-2">
                    <button onClick={submitColumn} className="bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium py-1.5 px-3 rounded transition-colors">Adicionar</button>
                    <button onClick={() => setIsCreatingColumn(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white p-2">✕</button>
                </div>
             </div>
        ) : (
            <button onClick={() => setIsCreatingColumn(true)} className="min-w-[300px] h-[fit-content] max-h-[50px] flex-shrink-0 bg-white/40 dark:bg-white/5 hover:bg-white/60 dark:hover:bg-white/10 backdrop-blur-sm rounded-xl flex items-center gap-2 px-4 py-3 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all border border-white/20 dark:border-white/5 shadow-sm group">
                <span className="text-xl leading-none group-hover:scale-110 transition-transform">+</span>
                <span className="font-medium text-sm">Adicionar outra lista</span>
            </button>
        )}
      </div>

      <DragOverlay dropAnimation={dropAnimation}>
        {activeCard && <Card card={activeCard} onClick={() => {}} />}
        {activeColumn && <Column column={activeColumn} onCardClick={()=>{}} />}
      </DragOverlay>

      {selectedCard && (<CardModal isOpen={!!selectedCard} card={selectedCard} boardId={currentBoardId || ''} onClose={() => setSelectedCard(null)} onUpdateLocal={handleCardUpdate} onDelete={() => handleDeleteCard(selectedCard.id, selectedCard.columnId)} />)}
    </DndContext>
  );
};