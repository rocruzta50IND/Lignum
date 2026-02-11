import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';
import type { ColumnWithCards, Card } from '../types';

const SOCKET_URL = 'http://localhost:3000';

interface CardMovedPayload {
  cardId: string;
  newColumnId: string;
  newRankPosition: number;
  movedByUserId?: string; 
}

interface CardDeletedPayload {
  cardId: string;
}

export const useBoardSocket = (boardId: string) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket: Socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnectionAttempts: 5,
    });

    socket.emit('join_board', boardId);

    // 1. LISTENER: Card Movido
    socket.on('card_moved', (payload: CardMovedPayload) => {
      const { cardId, newColumnId, newRankPosition } = payload;
      
      queryClient.setQueryData<ColumnWithCards[]>(
        ['columns', boardId],
        (oldColumns) => {
           if (!oldColumns) return oldColumns;
           const newColumns = JSON.parse(JSON.stringify(oldColumns)) as ColumnWithCards[];
           let cardToMove: Card | undefined;
           
           for (let i = 0; i < newColumns.length; i++) {
             const cardIndex = newColumns[i].cards.findIndex((c) => c.id === cardId);
             if (cardIndex !== -1) {
               [cardToMove] = newColumns[i].cards.splice(cardIndex, 1);
               break;
             }
           }
           if (!cardToMove) return oldColumns;
           
           cardToMove.columnId = newColumnId;
           cardToMove.rankPosition = newRankPosition;
           
           const destColumn = newColumns.find((col) => col.id === newColumnId);
           if (destColumn) {
             destColumn.cards.push(cardToMove);
             destColumn.cards.sort((a, b) => a.rankPosition - b.rankPosition);
           }
           return newColumns;
        }
      );
    });

    // 2. LISTENER: Card Criado
    socket.on('card_created', (newCard: Card) => {
      console.log('⚡ Socket: Card Criado', newCard);

      queryClient.setQueryData<ColumnWithCards[]>(
        ['columns', boardId],
        (oldColumns) => {
          if (!oldColumns) return oldColumns;

          const columnExists = oldColumns.find(col => col.id === newCard.columnId);
          if (!columnExists) return oldColumns;
          if (columnExists.cards.some(c => c.id === newCard.id)) return oldColumns;

          const newColumns = JSON.parse(JSON.stringify(oldColumns)) as ColumnWithCards[];
          const targetColumn = newColumns.find(col => col.id === newCard.columnId);
          
          if (targetColumn) {
            targetColumn.cards.push(newCard);
            targetColumn.cards.sort((a, b) => a.rankPosition - b.rankPosition);
          }
          return newColumns;
        }
      );
    });

    // 3. LISTENER: Card Atualizado (Novo)
    socket.on('card_updated', (updatedCard: Card) => {
      console.log('⚡ Socket: Card Editado', updatedCard);

      queryClient.setQueryData<ColumnWithCards[]>(
        ['columns', boardId],
        (oldColumns) => {
          if (!oldColumns) return oldColumns;
          const newColumns = JSON.parse(JSON.stringify(oldColumns)) as ColumnWithCards[];

          for (const col of newColumns) {
            const index = col.cards.findIndex(c => c.id === updatedCard.id);
            if (index !== -1) {
              // Atualiza o card mantendo a referência do array
              col.cards[index] = updatedCard;
              break;
            }
          }
          return newColumns;
        }
      );
    });

    // 4. LISTENER: Card Excluído (Novo)
    socket.on('card_deleted', (payload: CardDeletedPayload) => {
      console.log('⚡ Socket: Card Excluído', payload);
      const { cardId } = payload;

      queryClient.setQueryData<ColumnWithCards[]>(
        ['columns', boardId],
        (oldColumns) => {
          if (!oldColumns) return oldColumns;
          const newColumns = JSON.parse(JSON.stringify(oldColumns)) as ColumnWithCards[];

          for (const col of newColumns) {
            const index = col.cards.findIndex(c => c.id === cardId);
            if (index !== -1) {
              col.cards.splice(index, 1);
              break;
            }
          }
          return newColumns;
        }
      );
    });

    return () => {
      socket.off('card_moved');
      socket.off('card_created');
      socket.off('card_updated');
      socket.off('card_deleted');
      socket.disconnect();
    };
  }, [boardId, queryClient]);
};