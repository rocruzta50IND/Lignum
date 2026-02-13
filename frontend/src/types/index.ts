export type Priority = 'Baixa' | 'Média' | 'Alta';

// NOVO TIPO DE ETIQUETA
export interface Label {
  id: string;
  title: string;
  color: string; // Hex ou nome de classe (preferência Hex para flexibilidade)
}

export interface ChecklistItem {
  id: string;
  text: string;
  isChecked: boolean;
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string; // Melhor já ter aqui
  content: string;
  createdAt: string;
}

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
  labels?: Label[]; // <--- AQUI ESTÃO AS LABELS
}

export interface ColumnWithCards {
  id: string;
  title: string;
  board_id: string;
  order: number;
  cards: Card[];
}