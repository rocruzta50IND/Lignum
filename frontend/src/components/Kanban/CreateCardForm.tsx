import React, { useState, useRef, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { boardService } from '../../services/boardService';

interface CreateCardFormProps {
  columnId: string;
}

export const CreateCardForm: React.FC<CreateCardFormProps> = ({ columnId }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();

  // Foco automático ao abrir e redimensionamento simples
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.style.height = 'auto'; // Reset
    }
  }, [isEditing]);

  const createCardMutation = useMutation({
    mutationFn: (newTitle: string) => boardService.createCard(columnId, newTitle),
    onSuccess: () => {
      // O Socket cuidará da atualização global, mas podemos invalidar por segurança
      // ou apenas limpar o form. Aqui limpamos o form.
      setTitle('');
      setIsEditing(false); // Fecha ou mantém aberto para adicionar outro? Vou fechar por padrão.
    },
    onError: () => {
      alert("Erro ao criar card.");
    }
  });

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!title.trim()) {
      setIsEditing(false);
      return;
    }
    createCardMutation.mutate(title);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
    }
  };

  if (!isEditing) {
    return (
      <button
        onClick={() => setIsEditing(true)}
        className="flex items-center gap-2 text-gray-400 hover:text-lignum-text-primary hover:bg-[#2C2C2C] p-2 rounded-lg text-sm w-full transition-colors mt-2"
      >
        <span className="text-lg">+</span> Adicionar Card
      </button>
    );
  }

  return (
    <div className="mt-2 p-2 bg-[#1A1A1A] rounded-lg border border-gray-700 animate-in fade-in zoom-in duration-200">
      <textarea
        ref={textareaRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Digite o título do card..."
        className="w-full bg-[#2C2C2C] text-lignum-text-primary text-sm rounded p-2 focus:outline-none focus:ring-1 focus:ring-lignum-accent-blue resize-none min-h-[60px]"
        rows={2}
      />
      <div className="flex items-center gap-2 mt-2">
        <button
          onClick={() => handleSubmit()}
          disabled={createCardMutation.isPending}
          className="bg-lignum-accent-blue hover:bg-blue-500 text-white text-xs font-bold py-1.5 px-3 rounded transition-colors disabled:opacity-50"
        >
          {createCardMutation.isPending ? 'Salvando...' : 'Adicionar Card'}
        </button>
        <button
          onClick={() => setIsEditing(false)}
          className="text-gray-400 hover:text-lignum-text-primary text-xs py-1.5 px-2 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
};