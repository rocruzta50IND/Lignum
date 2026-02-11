import React from 'react';

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message?: string;
}

export const SuccessModal: React.FC<SuccessModalProps> = ({ isOpen, onClose, title, message }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      {/* Overlay com blur */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}></div>
      
      {/* Modal Dialog */}
      <div className="relative bg-white dark:bg-[#1E2028] rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center animate-in zoom-in-95 duration-200">
        
        {/* Ícone de Sucesso Animado */}
        <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-500 animate-in zoom-in duration-300 delay-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
        </div>

        <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">{title}</h3>
        {message && <p className="text-gray-500 dark:text-gray-400 font-medium">{message}</p>}

        <button 
            onClick={onClose}
            className="mt-8 w-full py-3 rounded-2xl bg-gray-900 hover:bg-black dark:bg-white dark:text-black dark:hover:bg-gray-200 text-white font-bold transition-all active:scale-95"
        >
            Continuar
        </button>
      </div>
    </div>
  );
};