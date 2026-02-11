import React from 'react';

interface UserAvatarProps {
  user?: {
    name: string;
    avatar?: string | null;
  } | null;
  src?: string | null; // Caso queira passar a url direto
  name?: string;       // Caso queira passar o nome direto
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({ user, src, name, size = 'md', className = '' }) => {
  // Define o tamanho em classes do Tailwind
  const sizeClasses = {
    sm: 'w-6 h-6 text-[10px]',
    md: 'w-10 h-10 text-xs',
    lg: 'w-16 h-16 text-lg',
    xl: 'w-24 h-24 text-2xl',
    '2xl': 'w-32 h-32 text-4xl'
  };

  const finalSize = sizeClasses[size];
  
  // Prioridade: src direto > avatar do objeto user > null
  const imageUrl = src || user?.avatar;
  
  // Prioridade: name direto > nome do objeto user > '?'
  const userName = name || user?.name || '?';
  const initials = userName.substring(0, 2).toUpperCase();

  // Cores de fundo aleatórias baseadas no nome (para não ficar tudo igual)
  const colors = [
    'from-rose-500 to-orange-500',
    'from-blue-500 to-cyan-500',
    'from-emerald-500 to-teal-500',
    'from-purple-500 to-pink-500'
  ];
  // Pega uma cor baseada no tamanho do nome (consistente para o mesmo usuário)
  const colorIndex = userName.length % colors.length;
  const gradientClass = colors[colorIndex];

  return (
    <div 
      className={`relative rounded-full p-0.5 bg-gradient-to-tr ${gradientClass} flex-shrink-0 ${finalSize} ${className}`}
      title={userName}
    >
      <div className="w-full h-full rounded-full bg-white dark:bg-[#1F222A] flex items-center justify-center overflow-hidden">
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={userName} 
            className="w-full h-full object-cover" 
            onError={(e) => {
                // Fallback se a imagem quebrar
                e.currentTarget.style.display = 'none'; 
                e.currentTarget.parentElement?.classList.add('fallback-text');
            }}
          />
        ) : (
          <span className={`font-bold bg-gradient-to-tr ${gradientClass} bg-clip-text text-transparent`}>
            {initials}
          </span>
        )}
      </div>
    </div>
  );
};