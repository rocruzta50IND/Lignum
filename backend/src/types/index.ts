/**
 * ARQUIVO MESTRE DE TIPOS - SISTEMA LIGNUM
 * Fonte da Verdade para Frontend e Backend.
 *
 * Instrução: Este arquivo define os DTOs (Data Transfer Objects) que trafegam
 * entre a API e o Cliente. Os nomes estão em camelCase.
 */

// ==========================================
// 1. ENUMS E TIPOS BÁSICOS
// ==========================================

export type UserRole = 'ADMIN' | 'MEMBER';

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'MOVE';

export type EntityType = 'BOARD' | 'COLUMN' | 'CARD';

// Estrutura para os itens do checklist dentro do Card
export interface ChecklistItem {
  id?: string; // Opcional, gerado pelo front ou back
  text: string;
  isChecked: boolean;
}

// ==========================================
// 2. ENTIDADES PRINCIPAIS (DTOs)
// ==========================================

export interface User {
  id: string; // UUID
  name: string;
  email: string;
  role: UserRole;
  // passwordHash não é exposto aqui por segurança
  createdAt?: Date;
}

export interface Board {
  id: string;
  title: string;
  createdBy: string; // User ID
  createdAt: Date;
  updatedAt: Date;
}

export interface Column {
  id: string;
  boardId: string;
  title: string;
  hexColor: string;
  orderIndex: number;
  createdAt?: Date;
}

export interface Card {
  id: string;
  columnId: string;
  title: string;
  description?: string;
  
  // Indexação Fracionária (LexoRank) - Tipo number suporta float do JS
  rankPosition: number; 
  
  colorTheme?: string;
  
  // Mapeado do JSONB do Postgres
  checklist: ChecklistItem[]; 
  
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ChatMessage {
  id: string;
  boardId: string;
  userId: string;
  content: string;
  isPinned: boolean;
  createdAt: Date;
  
  // Campo virtual (Join): Expandido para facilitar a UI do chat
  user?: {
    name: string;
    role: UserRole;
  };
}

export interface AuditLog {
  id: string; // BigInt serializado como string
  entityType: EntityType;
  entityId: string;
  action: AuditAction;
  actorId?: string;
  changes: Record<string, { old: any; new: any }>; // JSONB flexível
  createdAt: Date;
}

// ==========================================
// 3. SOCKET.IO EVENTS (WebSockets)
// ==========================================

/**
 * Eventos que o Cliente (React) envia para o Servidor
 */
export interface ClientToServerEvents {
  // Entrar em uma sala de quadro específico
  join_board: (boardId: string) => void;
  
  // Sair da sala
  leave_board: (boardId: string) => void;
  
  // Mover card (Drag & Drop)
  move_card: (payload: {
    cardId: string;
    newColumnId: string;
    newRank: number;
  }) => void;
  
  // Enviar mensagem no chat
  send_message: (payload: {
    boardId: string;
    content: string;
    isPinned?: boolean;
  }) => void;
}

/**
 * Eventos que o Servidor envia para os Clientes (Broadcast)
 */
export interface ServerToClientEvents {
  // Notifica todos na sala que um card moveu (para atualizar UI alheia)
  card_moved: (payload: {
    cardId: string;
    newColumnId: string;
    newRank: number;
    actorId: string; // Quem moveu?
  }) => void;
  
  // Nova mensagem recebida no chat
  new_message: (message: ChatMessage) => void;
  
  // Notificações de erro (ex: falha na persistência otimista)
  error_notification: (payload: {
    message: string;
    code?: string;
  }) => void;
}