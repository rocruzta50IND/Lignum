import { api } from './api';
import type { ColumnWithCards, Card } from '../types';

export const boardService = {
  getColumns: async (boardId: string): Promise<ColumnWithCards[]> => {
    const { data } = await api.get<ColumnWithCards[]>(`/columns/${boardId}`);
    return data;
  },

  moveCard: async (
    cardId: string, 
    newColumnId: string, 
    newRankPosition: number
  ): Promise<void> => {
    await api.patch(`/cards/${cardId}/move`, {
      newColumnId,
      newRankPosition
    });
  },

  createCard: async (columnId: string, title: string): Promise<Card> => {
    const { data } = await api.post<Card>('/cards', {
      columnId,
      title
    });
    return data;
  },

  // --- NOVOS MÉTODOS ---

  updateCard: async (cardId: string, data: Partial<Card>) => {
    // console.log("Enviando update:", data); // Descomente para debug
    const response = await api.put(`/cards/${cardId}`, data);
    return response.data;
  },

  deleteCard: async (cardId: string) => {
    await api.delete(`/cards/${cardId}`);
  }
};