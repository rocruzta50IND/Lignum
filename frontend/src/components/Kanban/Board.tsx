import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { DndContext, DragOverlay, useSensor, useSensors, PointerSensor, KeyboardSensor, pointerWithin, defaultDropAnimationSideEffects } from '@dnd-kit/core';
import type { DragStartEvent, DragOverEvent, DragEndEvent, DropAnimation, CollisionDetection } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { Column } from './Column'; 
import { Card } from './Card'; 
import { CardModal } from './CardModal';
import type { ColumnWithCards, Card as CardType, Label } from '../../types'; // <--- 1. Adicionado Label
import { api } from '../../services/api';
import { socket } from '../../services/socket';
import { useNavigate } from 'react-router-dom';

interface BoardProps {
  initialBoardId?: string;
}

const dropAnimation: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.5' } } }),
};

export const Board: React.FC<BoardProps> = ({ initialBoardId }) => {
  const navigate = useNavigate();
  
  const [columns, setColumns] = useState<ColumnWithCards[]>([]);
  const [currentBoardId, setCurrentBoardId] = useState<string | null>(initialBoardId || null);
  const [activeCard, setActiveCard] = useState<CardType | null>(null);
  const [activeColumn, setActiveColumn] = useState<ColumnWithCards | null>(null);
  const [selectedCard, setSelectedCard] = useState<CardType | null>(null);
  const [isCreatingColumn, setIsCreatingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState("");

  // Modal de Bloqueio (Expulsão/Deleção)
  const [exitModal, setExitModal] = useState<{ title: string; message: string } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const columnsId = useMemo(() => columns.map((col) => col.id), [columns]);

  useEffect(() => {
    if (initialBoardId) setCurrentBoardId(initialBoardId);
  }, [initialBoardId]);

  // CARREGAR DADOS
  const fetchBoardData = useCallback(async () => {
      try {
          if (currentBoardId) {
              const url = `/columns?boardId=${currentBoardId}`;
              const response = await api.get(url);
              const sorted = response.data.map((col: any) => ({
                  ...col,
                  cards: col.cards.sort((a: any, b: any) => a.order - b.order)
              }));
              setColumns(sorted);
          } 
          else {
              const r = await api.get('/boards'); 
              if (r.data.length > 0) setCurrentBoardId(r.data[0].id);
          }
      } catch (error) { console.error(error); }
  }, [currentBoardId]);

  useEffect(() => { fetchBoardData(); }, [fetchBoardData]); 

  // ============================================================
  // ⚡ SOCKET: CARDS + COLUNAS + ETIQUETAS + EXPULSÃO
  // ============================================================
  useEffect(() => {
    if (!currentBoardId) return;

    socket.emit('join_board', currentBoardId);

    // --- CARDS ---
    socket.on('card_created', (newCard: CardType) => {
        setColumns(prev => prev.map(col => {
            if (col.id === newCard.columnId) {
                if (col.cards.some(c => c.id === newCard.id)) return col;
                return { ...col, cards: [...col.cards, newCard] };
            }
            return col;
        }));
    });

    socket.on('card_updated', (updatedCard: CardType) => {
        setColumns(prev => prev.map(col => ({
            ...col,
            cards: col.cards.map(c => c.id === updatedCard.id ? { ...c, ...updatedCard } : c)
        })));
        if (selectedCard?.id === updatedCard.id) setSelectedCard(prev => prev ? { ...prev, ...updatedCard } : null);
    });

    socket.on('card_moved', ({ cardId, newColumnId, newRankPosition }: any) => {
        setColumns(prev => {
            const newCols = [...prev];
            let cardToMove: CardType | undefined;
            let sourceColIndex = -1;

            newCols.forEach((col, idx) => {
                const found = col.cards.find(c => c.id === cardId);
                if (found) {
                    cardToMove = { ...found, order: newRankPosition, columnId: newColumnId };
                    sourceColIndex = idx;
                }
            });

            if (!cardToMove || sourceColIndex === -1) return prev;

            newCols[sourceColIndex] = {
                ...newCols[sourceColIndex],
                cards: newCols[sourceColIndex].cards.filter(c => c.id !== cardId)
            };

            const destColIndex = newCols.findIndex(c => c.id === newColumnId);
            if (destColIndex !== -1) {
                const destCol = newCols[destColIndex];
                const newCards = [...destCol.cards, cardToMove];
                newCards.sort((a, b) => a.order - b.order);
                newCols[destColIndex] = { ...destCol, cards: newCards };
            }
            return newCols;
        });
    });

    socket.on('card_deleted', ({ cardId }) => {
        setColumns(prev => prev.map(col => ({
            ...col,
            cards: col.cards.filter(c => c.id !== cardId)
        })));
        if (selectedCard?.id === cardId) setSelectedCard(null);
    });

    // --- COLUNAS ---
    socket.on('column_created', (newCol) => setColumns(prev => prev.some(c => c.id === newCol.id) ? prev : [...prev, newCol]));
    socket.on('column_updated', ({ id, title }) => setColumns(prev => prev.map(c => c.id === id ? { ...c, title } : c)));
    socket.on('column_deleted', ({ columnId }) => setColumns(prev => prev.filter(c => c.id !== columnId)));
    socket.on('column_moved', ({ columnId, newPosition }) => setColumns(prev => {
        const oldIndex = prev.findIndex(c => c.id === columnId);
        if (oldIndex === -1) return prev;
        return arrayMove(prev, oldIndex, newPosition);
    }));

    // --- 🏷️ ETIQUETAS (LABELS) - CORREÇÃO REAL-TIME ---
    
    // 1. Etiqueta Adicionada
    socket.on('card_label_added', ({ cardId, label }: { cardId: string, label: Label }) => {
        setColumns(prev => prev.map(col => ({
            ...col,
            cards: col.cards.map(c => {
                if (c.id === cardId) {
                    const currentLabels = c.labels || [];
                    // Evita duplicados visualmente
                    if (currentLabels.some(l => l.id === label.id)) return c;
                    return { ...c, labels: [...currentLabels, label] };
                }
                return c;
            })
        })));
        
        // Atualiza o modal também, se estiver aberto nesse card
        if (selectedCard?.id === cardId) {
            setSelectedCard(prev => {
                if (!prev) return null;
                const currentLabels = prev.labels || [];
                if (currentLabels.some(l => l.id === label.id)) return prev;
                return { ...prev, labels: [...currentLabels, label] };
            });
        }
    });

    // 2. Etiqueta Removida
    socket.on('card_label_removed', ({ cardId, labelId }: { cardId: string, labelId: string }) => {
        setColumns(prev => prev.map(col => ({
            ...col,
            cards: col.cards.map(c => {
                if (c.id === cardId) {
                    return { ...c, labels: (c.labels || []).filter(l => l.id !== labelId) };
                }
                return c;
            })
        })));

        // Atualiza o modal também
        if (selectedCard?.id === cardId) {
            setSelectedCard(prev => {
                if (!prev) return null;
                return { ...prev, labels: (prev.labels || []).filter(l => l.id !== labelId) };
            });
        }
    });

    // --- EXPULSÃO / DELEÇÃO DO QUADRO ---
    
    socket.on('board_deleted', () => {
        setExitModal({ 
            title: 'Quadro Excluído', 
            message: 'O dono deste quadro o excluiu permanentemente. Você precisa voltar ao início.' 
        });
        setSelectedCard(null);
    });

    socket.on('kicked_from_board', () => {
        setExitModal({ 
            title: 'Acesso Revogado', 
            message: 'Você foi removido deste quadro por um administrador.' 
        });
        setSelectedCard(null);
    });

    return () => {
        socket.emit('leave_board', currentBoardId);
        // Limpa todos os ouvintes
        socket.off('card_created'); socket.off('card_updated'); socket.off('card_moved'); socket.off('card_deleted');
        socket.off('column_created'); socket.off('column_updated'); socket.off('column_moved'); socket.off('column_deleted');
        socket.off('board_deleted'); socket.off('kicked_from_board');
        // Limpa ouvintes de etiquetas
        socket.off('card_label_added'); socket.off('card_label_removed');
    };
  }, [currentBoardId, selectedCard?.id]); // Adicionei selectedCard?.id na dependência para garantir atualização correta do modal


  // ============================================================
  // DRAG AND DROP HANDLERS (MANTIDOS)
  // ============================================================

  const customCollisionDetection: CollisionDetection = useCallback((args) => {
    const pointerCollisions = pointerWithin(args);
    return pointerCollisions.length > 0 ? pointerCollisions : [];
  }, []);

  const onDragStart = (event: DragStartEvent) => {
    if (event.active.data.current?.type === 'COLUMN') { 
        setActiveColumn(event.active.data.current.column); return; 
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
          
          if (activeColumnIndex === overColumnIndex) {
              const activeCardIndex = activeColumn.cards.findIndex(c => c.id === activeId);
              const overCardIndex = overColumn.cards.findIndex(c => c.id === overId);
              return prev.map(col => {
                  if (col.id === activeColumn.id) return { ...col, cards: arrayMove(col.cards, activeCardIndex, overCardIndex) };
                  return col;
              });
          }

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
          const newColumns = [...prev];
          newColumns[activeColumnIndex] = { ...activeColumn, cards: activeColumn.cards.filter(c => c.id !== activeId) };
          newColumns[overColumnIndex] = { ...overColumn, cards: [...overColumn.cards, newCard] };
          return newColumns;
        });
      }
  };

  const onDragEnd = async (event: DragEndEvent) => { 
      const { active, over } = event;
      setActiveColumn(null);
      setActiveCard(null);

      if (!over) return;

      if (active.data.current?.type === 'COLUMN') {
          if (active.id !== over.id) {
              const oldIndex = columns.findIndex((col) => col.id === active.id);
              const newIndex = columns.findIndex((col) => col.id === over.id);
              setColumns((items) => arrayMove(items, oldIndex, newIndex));
              try { 
                await api.patch(`/columns/${active.id}/move`, { newPosition: newIndex });
              } catch (e) { fetchBoardData(); }
          }
          return;
      }

      const activeId = active.id;
      const overId = over.id;
      const activeColumnIndex = columns.findIndex(col => col.cards.some(c => c.id === activeId));
      let overColumnIndex = columns.findIndex(col => col.id === overId);
      if (overColumnIndex === -1) overColumnIndex = columns.findIndex(col => col.cards.some(c => c.id === overId));
      
      if (activeColumnIndex === -1 || overColumnIndex === -1) return;

      const overColumn = columns[overColumnIndex];
      let newRankPosition = 10000;

      if (overColumn.cards.length > 0) {
          const cards = overColumn.cards;
          const cardIndex = cards.findIndex(c => c.id === activeId);
          const prevCard = cards[cardIndex - 1];
          const nextCard = cards[cardIndex + 1];

          if (!prevCard && nextCard) newRankPosition = nextCard.order / 2;
          else if (prevCard && !nextCard) newRankPosition = prevCard.order + 10000;
          else if (prevCard && nextCard) newRankPosition = (prevCard.order + nextCard.order) / 2;
          else if (!prevCard && !nextCard) newRankPosition = 10000;
          else newRankPosition = cards[cardIndex].order;
      }

      try { 
          await api.patch(`/cards/${activeId}/move`, { newColumnId: overColumn.id, newRankPosition }); 
      } catch (error) { fetchBoardData(); }
  };

  const handleCreateCard = async (columnId: string, title: string) => {
    try { await api.post('/cards', { columnId, title }); } 
    catch (e) { console.error(e); }
  };

  const handleDeleteColumn = async (columnId: string) => { 
      try { await api.delete(`/columns/${columnId}`); } 
      catch (e) { console.error(e); } 
  };
  
  const handleDeleteCard = async (cardId: string, columnId: string) => {
      setSelectedCard(null);
      try { await api.delete(`/cards/${cardId}`); } catch(e) { console.error(e); }
  };

  const handleUpdateColumn = async (columnId: string, newTitle: string) => {
      setColumns(prev => prev.map(col => col.id === columnId ? { ...col, title: newTitle } : col));
      try { await api.patch(`/columns/${columnId}`, { title: newTitle }); } catch (e) { fetchBoardData(); }
  };

  const submitColumn = async () => {
    if (!newColumnTitle.trim()) { setIsCreatingColumn(false); return; }
    if (!currentBoardId) return;
    try { 
        await api.post('/columns', { title: newColumnTitle, boardId: currentBoardId }); 
        setNewColumnTitle("");
        setIsCreatingColumn(false);
    } catch (e) { console.error(e); }
  };
  
  const handleCardUpdate = (updatedCard: CardType) => {
    setColumns(prev => prev.map(col => col.id === updatedCard.columnId ? { ...col, cards: col.cards.map(c => c.id === updatedCard.id ? updatedCard : c) } : col));
    setSelectedCard(updatedCard);
  };

  return (
    <>
        <DndContext sensors={sensors} collisionDetection={customCollisionDetection} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd}>
        <div id="board-container" className="flex h-full w-full overflow-x-auto overflow-y-hidden px-4 pb-4 pt-4 gap-6 scrollbar-thin bg-gray-50 dark:bg-transparent items-start transition-colors duration-300 relative">
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

        {selectedCard && (
            <CardModal 
                isOpen={!!selectedCard} 
                card={selectedCard} 
                boardId={currentBoardId || ''} 
                onClose={() => setSelectedCard(null)} 
                onUpdateLocal={handleCardUpdate}
                onDelete={() => handleDeleteCard(selectedCard.id, selectedCard.columnId)}
            />
        )}
        </DndContext>

        {exitModal && (
            <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
                <div className="bg-white dark:bg-[#16181D] w-full max-w-sm p-8 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 text-center animate-in zoom-in-95">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-red-600 dark:text-red-400">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    </div>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-3">{exitModal.title}</h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mb-8 leading-relaxed">{exitModal.message}</p>
                    <button onClick={() => navigate('/')} className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold py-4 rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-gray-200 dark:shadow-none">Voltar para o Início</button>
                </div>
            </div>
        )}
    </>
  );
};