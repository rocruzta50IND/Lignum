import React, { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  isLoading?: boolean;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  isLoading = false,
  fullWidth = false,
  className = '',
  disabled,
  ...props
}) => {
  // Definição das variantes (Estilo Vercel/Linear)
  const baseStyles = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-[#121212]";
  
  const variants = {
    primary: "bg-[#E0E0E0] text-black hover:bg-white border border-transparent shadow-sm", // Contraste alto
    secondary: "bg-[#2C2C2C] text-[#E0E0E0] hover:bg-[#333] border border-[#3E3E3E]", // Surface
    danger: "bg-red-900/20 text-red-400 hover:bg-red-900/40 border border-red-900/50",
    ghost: "bg-transparent hover:bg-[#2C2C2C] text-[#A0A0A0] hover:text-[#E0E0E0]",
  };

  const sizes = "h-10 px-4 py-2";

  return (
    <button
      className={`
        ${baseStyles}
        ${variants[variant]}
        ${sizes}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading ? (
        <>
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Processando...
        </>
      ) : (
        children
      )}
    </button>
  );
};