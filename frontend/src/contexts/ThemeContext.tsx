import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Tenta pegar do localStorage ou usa 'dark' como padrão
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('lignum-theme');
    return (saved as Theme) || 'dark';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    // Remove a classe antiga e adiciona a nova no HTML
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('lignum-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};