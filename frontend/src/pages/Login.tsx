import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface LoginProps {
  onNavigateToRegister: () => void;
}

export const Login: React.FC<LoginProps> = ({ onNavigateToRegister }) => {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      // CORREÇÃO AQUI: Passando como objeto { email, password }
      await signIn({ email, password });
    } catch (err) {
      console.error(err);
      setError('Credenciais inválidas. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-white font-sans">
      
      {/* LADO ESQUERDO: Formulário */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 animate-in fade-in slide-in-from-left-4 duration-500">
        <div className="w-full max-w-md space-y-8">
          
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-rose-500/30">
                    L
                </div>
                <span className="text-2xl font-extrabold text-gray-900 tracking-tight">Lignum</span>
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-2">Bem-vindo de volta</h1>
            <p className="text-gray-500">Insira suas credenciais para acessar o workspace.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-5">
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">E-mail</label>
                    <input 
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="exemplo@lignum.com"
                        required
                        className="w-full px-4 py-3.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all font-medium"
                    />
                </div>
                
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Senha</label>
                        <a href="#" className="text-xs font-bold text-rose-600 hover:text-rose-700 transition-colors">Esqueceu a senha?</a>
                    </div>
                    <input 
                        type="password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="w-full px-4 py-3.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all font-medium"
                    />
                </div>
            </div>

            {error && (
                <div className="p-4 rounded-xl bg-red-50 text-red-600 text-sm font-medium border border-red-100 flex items-center gap-3 animate-in fade-in zoom-in-95">
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    {error}
                </div>
            )}

            <button 
                type="submit" 
                disabled={isLoading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-rose-600 to-orange-600 text-white font-bold shadow-lg shadow-rose-500/30 hover:shadow-rose-500/40 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
            >
                {isLoading ? (
                    <div className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        Entrando...
                    </div>
                ) : 'Entrar na Plataforma'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500">
            Não tem uma conta?{' '}
            <button onClick={onNavigateToRegister} className="font-bold text-rose-600 hover:text-rose-700 hover:underline transition-all">
              Criar agora
            </button>
          </p>
        </div>
      </div>

      {/* LADO DIREITO: Branding */}
      <div className="hidden lg:flex w-1/2 bg-[#0F1117] relative overflow-hidden items-center justify-center p-12">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-rose-600/20 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2 opacity-50"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-orange-600/10 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/4 opacity-50"></div>
        
        <div className="relative z-10 text-center max-w-lg">
            <div className="w-24 h-24 mx-auto bg-gradient-to-br from-rose-500 to-orange-500 rounded-3xl flex items-center justify-center text-white font-bold text-5xl shadow-2xl mb-10 rotate-3 hover:rotate-6 transition-transform duration-500">
                L
            </div>
            <h2 className="text-4xl font-extrabold text-white mb-6 leading-tight tracking-tight">
                "A simplicidade é o último grau de sofisticação."
            </h2>
            <p className="text-gray-400 text-lg leading-relaxed font-medium">
                O Lignum traz clareza para o caos do desenvolvimento, permitindo que você foque no que realmente importa.
            </p>
            
            <div className="mt-12 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/40 text-xs font-mono tracking-wider uppercase">
                <span>Sistema Lignum V2.0</span>
            </div>
        </div>
      </div>

    </div>
  );
};