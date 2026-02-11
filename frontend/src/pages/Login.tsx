import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

interface LoginProps {
  onNavigateToRegister: () => void;
}

export const Login: React.FC<LoginProps> = ({ onNavigateToRegister }) => {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await signIn({ email, password });
    } catch (err) {
      setError('Credenciais inválidas. Verifique seus dados.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-[#121212]">
      {/* Lado Esquerdo: Formulário (Mobile: 100%, Desktop: 50%) */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-16 animate-in fade-in slide-in-from-left-4 duration-500">
        <div className="w-full max-w-sm space-y-8">
          
          {/* Cabeçalho do Form */}
          <div className="space-y-2 text-center lg:text-left">
            <h1 className="text-3xl font-bold tracking-tight text-[#E0E0E0]">
              Bem-vindo de volta
            </h1>
            <p className="text-sm text-[#A0A0A0]">
              Entre com suas credenciais para acessar o Lignum.
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3 rounded-md bg-red-900/10 border border-red-900/30 text-red-400 text-sm flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="E-mail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="exemplo@lignum.com"
              required
              autoFocus
              autoComplete="email"
            />

            <div className="space-y-1">
              <Input
                label="Senha"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
              <div className="flex justify-end">
                <a href="#" className="text-xs text-[#64B5F6] hover:text-blue-400 transition-colors">
                  Esqueceu a senha?
                </a>
              </div>
            </div>

            <Button 
              type="submit" 
              isLoading={isLoading} 
              fullWidth
              variant="primary"
            >
              Entrar na Plataforma
            </Button>
          </form>

          {/* Footer do Form */}
          <div className="text-center text-sm text-[#A0A0A0]">
            Não tem uma conta?{' '}
            <button 
              onClick={onNavigateToRegister} 
              className="font-medium text-[#E0E0E0] hover:text-[#64B5F6] transition-colors underline underline-offset-4"
            >
              Criar agora
            </button>
          </div>
        </div>
      </div>

      {/* Lado Direito: Branding/Decorativo (Desktop Only) */}
      <div className="hidden lg:flex w-1/2 bg-[#161616] relative overflow-hidden items-center justify-center border-l border-[#222]">
        {/* Abstract Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#161616] via-[#1A1A1A] to-[#0D0D0D]" />
        
        {/* Glow Effects */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-[128px]" />

        {/* Content */}
        <div className="relative z-10 p-12 max-w-lg text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-[#64B5F6] to-blue-700 rounded-2xl mx-auto mb-8 shadow-2xl shadow-blue-900/20 flex items-center justify-center">
             <span className="text-2xl font-bold text-white">Li</span>
          </div>
          <blockquote className="text-xl font-medium text-[#E0E0E0] mb-6 leading-relaxed">
            "A simplicidade é o último grau de sofisticação. O Lignum traz clareza para o caos do desenvolvimento."
          </blockquote>
          <cite className="text-sm text-[#64B5F6] font-semibold not-italic">
            Sistema Lignum V1.0
          </cite>
        </div>
      </div>
    </div>
  );
};