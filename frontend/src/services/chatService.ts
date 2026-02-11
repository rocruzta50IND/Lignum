import { api } from './api';
import type { ChatMessage } from '../types';

export const chatService = {
  /**
   * Busca o histórico de mensagens de um board.
   * GET /chat/:boardId
   */
  getHistory: async (boardId: string): Promise<ChatMessage[]> => {
    const { data } = await api.get<ChatMessage[]>(`/chat/${boardId}`);
    return data;
  },

  /**
   * Envia uma nova mensagem.
   * POST /chat/:boardId
   */
  sendMessage: async (boardId: string, content: string): Promise<ChatMessage> => {
    const { data } = await api.post<ChatMessage>(`/chat/${boardId}`, { content });
    return data;
  }
};