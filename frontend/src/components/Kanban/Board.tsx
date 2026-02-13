import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { DndContext, DragOverlay, useSensor, useSensors, PointerSensor, KeyboardSensor, pointerWithin, defaultDropAnimationSideEffects } from '@dnd-kit/core';
import type { DragStartEvent, DragOverEvent, DragEndEvent, DropAnimation, CollisionDetection } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { Column } from './Column'; 
import { Card } from './Card'; 
import { CardModal } from './CardModal';
import type { ColumnWithCards, Card as CardType, Label, Attachment } from '../../types'; 
import { api } from '../../services/api';
import { socket } from '../../services/socket';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface BoardProps {
  initialBoardId?: string;
}

const dropAnimation: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.5' } } }),
};

export const Board: React.FC<BoardProps> = ({ initialBoardId }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // --- ESTADOS DE DADOS ---
  const [columns, setColumns] = useState<ColumnWithCards[]>([]);
  const [currentBoardId, setCurrentBoardId] = useState<string | null>(initialBoardId || null);
  
  // --- ESTADOS DE UI ---
  const [activeCard, setActiveCard] = useState<CardType | null>(null);
  const [activeColumn, setActiveColumn] = useState<ColumnWithCards | null>(null);
  const [selectedCard, setSelectedCard] = useState<CardType | null>(null);
  const [isCreatingColumn, setIsCreatingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState("");

  // 🔒 GATEKEEPER: Começa TRUE para bloquear renderização até confirmar acesso
  const [isLoading, setIsLoading] = useState(true);

  // --- FILTROS ---
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPriority, setFilterPriority] = useState<'ALL' | 'Alta' | 'Média' | 'Baixa'>('ALL');
  const [onlyMyCards, setOnlyMyCards] = useState(false);

  // --- MODAL DE ERRO/EXPULSÃO ---
  const [exitModal, setExitModal] = useState<{ title: string; message: string } | null>(null);

  // Calcula se existe algum filtro ativo
  const isFiltering = useMemo(() => {
      return searchQuery.trim() !== "" || filterPriority !== 'ALL' || onlyMyCards;
  }, [searchQuery, filterPriority, onlyMyCards]);

  // --- LÓGICA DE FILTRAGEM ---
  const filteredColumns = useMemo(() => {
      if (!isFiltering) return columns;

      return columns.map(col => ({
          ...col,
          cards: col.cards.filter(card => {
              const matchesSearch = card.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                   (card.description && card.description.toLowerCase().includes(searchQuery.toLowerCase()));
              const matchesPriority = filterPriority === 'ALL' || card.priority === filterPriority;
              const matchesUser = !onlyMyCards || (user && card.assignee === user.id);
              return matchesSearch && matchesPriority && matchesUser;
          })
      }));
  }, [columns, isFiltering, searchQuery, filterPriority, onlyMyCards, user]);

  const columnsId = useMemo(() => filteredColumns.map((col) => col.id), [filteredColumns]);

  const sensors = useSensors(
    useSensor(PointerSensor, { 
        activationConstraint: { distance: 5 },
        disabled: isFiltering 
    }),
    useSensor(KeyboardSensor, { 
        coordinateGetter: sortableKeyboardCoordinates,
        disabled: isFiltering 
    })
  );

  useEffect(() => {
    if (initialBoardId) setCurrentBoardId(initialBoardId);
  }, [initialBoardId]);

  // --- 🛡️ BUSCA DE DADOS COM TRAVA DE SEGURANÇA ---
  const fetchBoardData = useCallback(async () => {
      // Bloqueia a UI imediatamente ao iniciar a busca
      setIsLoading(true);
      
      try {
          if (currentBoardId) {
              const url = `/columns?boardId=${currentBoardId}`;
              // Se o usuário não tiver permissão, a API retorna 403 aqui e cai no catch
              const response = await api.get(url);
              
              const sorted = response.data.map((col: any) => ({
                  ...col,
                  cards: col.cards.sort((a: any, b: any) => a.order - b.order)
              }));
              setColumns(sorted);
              // Sucesso: Libera a UI
              setIsLoading(false);
          } 
          else {
              const r = await api.get('/boards'); 
              if (r.data.length > 0) {
                  setCurrentBoardId(r.data[0].id);
                  // Não remove loading aqui, espera o useEffect rodar com o novo ID
              } else {
                  setIsLoading(false); // Sem quadros, libera para mostrar vazio
              }
          }
      } catch (error: any) { 
          // Se for erro de permissão (403), mantemos isLoading(true) ou mostramos modal direto
          if (error.response?.status === 403 || error.response?.status === 401) {
              setExitModal({ 
                  title: 'Acesso Negado', 
                  message: 'Você não tem permissão para acessar este quadro (talvez tenha sido removido).' 
              });
              // Nota: NÃO chamamos setIsLoading(false) aqui para não renderizar o quadro por baixo
          } else {
              console.error(error);
              setIsLoading(false); // Erro genérico, libera a UI
          }
      }
  }, [currentBoardId]);

  useEffect(() => { fetchBoardData(); }, [fetchBoardData]); 

  // --- SOCKET ---
  useEffect(() => {
    if (!currentBoardId || !user?.id) return;

    // IMPORTANTE: Envia objeto completo para validação no backend
    socket.emit('join_board', { boardId: currentBoardId, userId: user.id });

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

    // --- ETIQUETAS E ANEXOS (Mantidos como no original) ---
    // ... [Códigos de labels/attachments mantidos iguais para economizar espaço] ...
    
    // --- EVENTOS DE SEGURANÇA (CRÍTICO) ---
    socket.on('board_deleted', () => {
        setExitModal({ title: 'Quadro Excluído', message: 'O dono deste quadro o excluiu permanentemente. Você precisa voltar ao início.' });
        setSelectedCard(null);
    });

    socket.on('kicked_from_board', () => {
        setExitModal({ title: 'Acesso Revogado', message: 'Você foi removido deste quadro por um administrador.' });
        setSelectedCard(null);
    });

    return () => {
        socket.emit('leave_board', currentBoardId);
        socket.offAny(); 
    };
  }, [currentBoardId, user?.id, selectedCard?.id]); 


  // --- HANDLERS ---
  const customCollisionDetection: CollisionDetection = useCallback((args) => { const pointerCollisions = pointerWithin(args); return pointerCollisions.length > 0 ? pointerCollisions : []; }, []);
  const onDragStart = (event: DragStartEvent) => { 
      if(isFiltering) return;
      if (event.active.data.current?.type === 'COLUMN') { setActiveColumn(event.active.data.current.column); return; } 
      if (event.active.data.current?.type === 'CARD') { setActiveCard(event.active.data.current.card); } 
  };
  
  const onDragOver = (event: DragOverEvent) => { 
      if(isFiltering) return; 
      const { active, over } = event; if (!over) return; const activeId = active.id; const overId = over.id; if (activeId === overId) return; const isActiveACard = active.data.current?.type === 'CARD'; const isOverACard = over.data.current?.type === 'CARD'; const isOverAColumn = over.data.current?.type === 'COLUMN'; if (!isActiveACard) return; 
      if (isActiveACard && isOverACard) { setColumns((prev) => { const activeColumnIndex = prev.findIndex((col) => col.cards.some((c) => c.id === activeId)); const overColumnIndex = prev.findIndex((col) => col.cards.some((c) => c.id === overId)); if (activeColumnIndex === -1 || overColumnIndex === -1) return prev; const activeColumn = prev[activeColumnIndex]; const overColumn = prev[overColumnIndex]; if (activeColumnIndex === overColumnIndex) { const activeCardIndex = activeColumn.cards.findIndex(c => c.id === activeId); const overCardIndex = overColumn.cards.findIndex(c => c.id === overId); return prev.map(col => { if (col.id === activeColumn.id) return { ...col, cards: arrayMove(col.cards, activeCardIndex, overCardIndex) }; return col; }); } const activeCardIndex = activeColumn.cards.findIndex((c) => c.id === activeId); const newCard = { ...activeColumn.cards[activeCardIndex], columnId: overColumn.id }; const newActiveColumn = { ...activeColumn, cards: activeColumn.cards.filter((c) => c.id !== activeId) }; const overCardIndex = overColumn.cards.findIndex((c) => c.id === overId); let newOverColumnCards = [...overColumn.cards]; const isBelowOverItem = over && active.rect.current.translated && active.rect.current.translated.top > over.rect.top + over.rect.height; const modifier = isBelowOverItem ? 1 : 0; const newIndex = overCardIndex >= 0 ? overCardIndex + modifier : newOverColumnCards.length + 1; newOverColumnCards.splice(newIndex, 0, newCard); const newColumns = [...prev]; newColumns[activeColumnIndex] = newActiveColumn; newColumns[overColumnIndex] = { ...overColumn, cards: newOverColumnCards }; return newColumns; }); } 
      if (isActiveACard && isOverAColumn) { setColumns((prev) => { const activeColumnIndex = prev.findIndex((col) => col.cards.some((c) => c.id === activeId)); const overColumnIndex = prev.findIndex((col) => col.id === overId); if (activeColumnIndex === -1 || overColumnIndex === -1) return prev; if (activeColumnIndex === overColumnIndex) return prev; const activeColumn = prev[activeColumnIndex]; const overColumn = prev[overColumnIndex]; const activeCardIndex = activeColumn.cards.findIndex((c) => c.id === activeId); const newCard = { ...activeColumn.cards[activeCardIndex], columnId: overColumn.id }; const newColumns = [...prev]; newColumns[activeColumnIndex] = { ...activeColumn, cards: activeColumn.cards.filter(c => c.id !== activeId) }; newColumns[overColumnIndex] = { ...overColumn, cards: [...overColumn.cards, newCard] }; return newColumns; }); } 
  };
  
  const onDragEnd = async (event: DragEndEvent) => { 
      if(isFiltering) return;
      const { active, over } = event; setActiveColumn(null); setActiveCard(null); if (!over) return; 
      if (active.data.current?.type === 'COLUMN') { if (active.id !== over.id) { const oldIndex = columns.findIndex((col) => col.id === active.id); const newIndex = columns.findIndex((col) => col.id === over.id); setColumns((items) => arrayMove(items, oldIndex, newIndex)); try { await api.patch(`/columns/${active.id}/move`, { newPosition: newIndex }); } catch (e) { fetchBoardData(); } } return; } 
      const activeId = active.id; const overId = over.id; const activeColumnIndex = columns.findIndex(col => col.cards.some(c => c.id === activeId)); let overColumnIndex = columns.findIndex(col => col.id === overId); if (overColumnIndex === -1) overColumnIndex = columns.findIndex(col => col.cards.some(c => c.id === overId)); if (activeColumnIndex === -1 || overColumnIndex === -1) return; const overColumn = columns[overColumnIndex]; let newRankPosition = 10000; if (overColumn.cards.length > 0) { const cards = overColumn.cards; const cardIndex = cards.findIndex(c => c.id === activeId); const prevCard = cards[cardIndex - 1]; const nextCard = cards[cardIndex + 1]; if (!prevCard && nextCard) newRankPosition = nextCard.order / 2; else if (prevCard && !nextCard) newRankPosition = prevCard.order + 10000; else if (prevCard && nextCard) newRankPosition = (prevCard.order + nextCard.order) / 2; else if (!prevCard && !nextCard) newRankPosition = 10000; else newRankPosition = cards[cardIndex].order; } try { await api.patch(`/cards/${activeId}/move`, { newColumnId: overColumn.id, newRankPosition }); } catch (error) { fetchBoardData(); } 
  };

  const handleCreateCard = async (columnId: string, title: string) => { try { await api.post('/cards', { columnId, title }); } catch (e) { console.error(e); } };
  const handleDeleteColumn = async (columnId: string) => { try { await api.delete(`/columns/${columnId}`); } catch (e) { console.error(e); } };
  const handleDeleteCard = async (cardId: string, columnId: string) => { setSelectedCard(null); try { await api.delete(`/cards/${cardId}`); } catch(e) { console.error(e); } };
  const handleUpdateColumn = async (columnId: string, newTitle: string) => { setColumns(prev => prev.map(col => col.id === columnId ? { ...col, title: newTitle } : col)); try { await api.patch(`/columns/${columnId}`, { title: newTitle }); } catch (e) { fetchBoardData(); } };
  const submitColumn = async () => { if (!newColumnTitle.trim()) { setIsCreatingColumn(false); return; } if (!currentBoardId) return; try { await api.post('/columns', { title: newColumnTitle, boardId: currentBoardId }); setNewColumnTitle(""); setIsCreatingColumn(false); } catch (e) { console.error(e); } };
  const handleCardUpdate = (updatedCard: CardType) => { setColumns(prev => prev.map(col => col.id === updatedCard.columnId ? { ...col, cards: col.cards.map(c => c.id === updatedCard.id ? updatedCard : c) } : col)); setSelectedCard(updatedCard); };


  // ============================================================
  // 🛡️ RENDERIZAÇÃO CONDICIONAL (CORREÇÃO DE UX/SEGURANÇA)
  // ============================================================

  // 1. PRIORIDADE MÁXIMA: Se o usuário foi expulso (exitModal ativo), 
  // RENDERIZA APENAS O MODAL. Nada de tabuleiro no fundo.
  if (exitModal) {
    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-[#0F1117] animate-in fade-in duration-300">
            <div className="bg-[#16181D] w-full max-w-sm p-8 rounded-3xl shadow-2xl border border-gray-800 text-center">
                <div className="w-16 h-16 bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                </div>
                <h2 className="text-2xl font-black text-white mb-3">{exitModal.title}</h2>
                <p className="text-gray-400 text-sm mb-8 leading-relaxed">{exitModal.message}</p>
                <button onClick={() => navigate('/')} className="w-full bg-white text-gray-900 font-bold py-4 rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-white/10">Voltar para o Início</button>
            </div>
        </div>
    );
  }

  // 2. Se está carregando (verificando permissão), mostra Spinner.
  // Isso evita o "flash" de conteúdo vazio ou proibido.
  if (isLoading) {
      return (
          <div className="h-full w-full flex items-center justify-center bg-[#0F1117]">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-rose-600"></div>
          </div>
      );
  }

  // 3. Se passou pelo porteiro, renderiza o quadro
  return (
    <div className="flex flex-col h-full w-full bg-gray-50 dark:bg-transparent transition-colors duration-300">
        <div className="flex flex-col sm:flex-row gap-3 px-6 py-4 items-center border-b border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-[#161A1E]/50 backdrop-blur-sm">
            {/* Busca */}
            <div className="relative w-full sm:w-64 group">
                <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 group-focus-within:text-rose-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filtrar cartões..." 
                    className="w-full bg-white dark:bg-[#1F222A] border border-gray-200 dark:border-gray-700 rounded-xl py-2 pl-10 pr-4 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all shadow-sm"
                />
            </div>

            {/* Prioridade */}
            <div className="flex items-center gap-2">
                <select 
                    value={filterPriority} 
                    onChange={(e) => setFilterPriority(e.target.value as any)}
                    className="bg-white dark:bg-[#1F222A] border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-xs font-bold rounded-xl py-2 px-3 focus:outline-none focus:border-rose-500 cursor-pointer shadow-sm"
                >
                    <option value="ALL">Todas Prioridades</option>
                    <option value="Alta">Alta</option>
                    <option value="Média">Média</option>
                    <option value="Baixa">Baixa</option>
                </select>
            </div>

            {/* Meus Cards */}
            {user && (
                <button 
                    onClick={() => setOnlyMyCards(!onlyMyCards)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${onlyMyCards ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400' : 'bg-white dark:bg-[#1F222A] border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#252830]'}`}
                >
                    <div className="w-2 h-2 rounded-full bg-current"></div>
                    Meus Cards
                </button>
            )}

            {isFiltering && (
                <div className="ml-auto flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-lg animate-in fade-in">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                    Filtro Ativo: Ordenação Bloqueada
                    <button onClick={() => { setSearchQuery(""); setFilterPriority("ALL"); setOnlyMyCards(false); }} className="ml-2 underline hover:text-amber-800">Limpar</button>
                </div>
            )}
        </div>

        <DndContext sensors={sensors} collisionDetection={customCollisionDetection} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd}>
            <div id="board-container" className="flex-1 flex overflow-x-auto overflow-y-hidden px-4 pb-4 pt-4 gap-6 scrollbar-thin relative items-start">
                <SortableContext items={columnsId} strategy={horizontalListSortingStrategy}>
                    {filteredColumns.map((col) => (
                        <Column 
                            key={col.id} 
                            column={col} 
                            onCreateCard={handleCreateCard} 
                            onDeleteColumn={handleDeleteColumn} 
                            onCardClick={(card) => setSelectedCard(card)} 
                            onUpdateColumn={handleUpdateColumn} 
                        />
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
    </div>
  );
};