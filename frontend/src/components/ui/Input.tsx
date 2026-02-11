import React, { InputHTMLAttributes, forwardRef, ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  startIcon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, startIcon, className = '', ...props }, ref) => {
    return (
      <div className="w-full space-y-2">
        {label && (
          <label className="text-xs font-medium text-[#A0A0A0] uppercase tracking-wider ml-1">
            {label}
          </label>
        )}
        
        <div className="relative group">
          {startIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-[#E0E0E0] transition-colors">
              {startIcon}
            </div>
          )}
          
          <input
            ref={ref}
            className={`
              flex h-10 w-full rounded-md border bg-[#161616] px-3 py-2 text-sm text-[#E0E0E0] placeholder:text-gray-600
              transition-all duration-200
              focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-[#121212]
              disabled:cursor-not-allowed disabled:opacity-50
              ${startIcon ? 'pl-10' : ''}
              ${error 
                ? 'border-red-900/50 focus:border-red-500 focus:ring-red-900/50' 
                : 'border-[#333] focus:border-[#64B5F6] focus:ring-[#64B5F6]/30 hover:border-gray-600'
              }
              ${className}
            `}
            {...props}
          />
        </div>

        {error && (
          <p className="text-xs text-red-400 mt-1 ml-1 animate-in slide-in-from-top-1 fade-in duration-200">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';