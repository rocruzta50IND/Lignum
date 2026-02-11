export type Priority = 'Baixa' | 'Média' | 'Alta';

export interface ChecklistItem {
  id: string;
  text: string;
  isChecked: boolean;
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: string;
}

// OBRIGATÓRIO: export interface Card
export interface Card {
  id: string;
  columnId: string;
  title: string;
  description?: string;
  order: number;
  priority?: Priority;
  dueDate?: string | null;
  assignee?: string | null;
  assigneeName?: string | null;
  hexColor?: string;
  checklist?: ChecklistItem[];
  comments?: Comment[];
}

export interface ColumnWithCards {
  id: string;
  title: string;
  board_id: string;
  order: number;
  cards: Card[];
}