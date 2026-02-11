import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface RegisterProps {
  onNavigateToLogin: () => void;
}

export const Register: React.FC<RegisterProps> = ({ onNavigateToLogin }) => {
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (password.length < 6) {
        setError("A senha deve ter no mínimo 6 caracteres.");
        return;
    }

    setIsLoading(true);
    try {
      // CORREÇÃO AQUI: Passando como objeto { name, email, password }
      await signUp({ name, email, password });
      
      // Se o signUp não logar automaticamente e não der erro, podemos tentar logar ou avisar
      // Geralmente o AuthContext já redireciona se o estado de user mudar.
    } catch (err: any) {
      console.error(err);
      // Pega mensagem de erro do backend se existir ou usa genérica
      setError(err.response?.data?.message || 'Erro ao criar conta. Tente outro email.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-white font-sans">
      
      {/* LADO ESQUERDO: Branding */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-rose-500 to-orange-500 relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white rounded-full blur-[100px] opacity-20"></div>
        
        <div className="relative z-10 max-w-lg text-white">
            <h2 className="text-4xl font-extrabold mb-8 leading-tight tracking-tight drop-shadow-md">
                Comece a organizar <br/>
                suas ideias hoje.
            </h2>
            
            <div className="space-y-4">
                <div className="flex items-center gap-4 p-5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 hover:bg-white/20 transition-colors">
                    <div className="w-12 h-12 rounded-full bg-white text-rose-600 flex items-center justify-center font-bold text-xl shadow-sm">✓</div>
                    <div>
                        <h4 className="font-bold text-lg">Quadros Ilimitados</h4>
                        <p className="text-sm text-white/80 font-medium">Crie quantos projetos precisar.</p>
                    </div>
                </div>
                <div className="flex items-center gap-4 p-5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 hover:bg-white/20 transition-colors">
                    <div className="w-12 h-12 rounded-full bg-white text-orange-600 flex items-center justify-center font-bold text-xl shadow-sm">∞</div>
                    <div>
                        <h4 className="font-bold text-lg">Colaboração Real</h4>
                        <p className="text-sm text-white/80 font-medium">Veja quem está online e edite juntos.</p>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* LADO DIREITO: Formulário */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 animate-in fade-in slide-in-from-right-4 duration-500 bg-white">
        <div className="w-full max-w-md space-y-8">
          
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-rose-500/30">
                    L
                </div>
                <span className="text-2xl font-extrabold text-gray-900 tracking-tight">Lignum</span>
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-2">Criar nova conta</h1>
            <p className="text-gray-500">Preencha seus dados para começar.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Nome Completo</label>
                <input 
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome"
                    required
                    className="w-full px-4 py-3.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all font-medium"
                />
            </div>

            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">E-mail</label>
                <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="voce@empresa.com"
                    required
                    className="w-full px-4 py-3.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all font-medium"
                />
            </div>
            
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Senha</label>
                <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    required
                    minLength={6}
                    className="w-full px-4 py-3.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all font-medium"
                />
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
                className="w-full py-3.5 rounded-xl bg-gray-900 hover:bg-black text-white font-bold shadow-lg shadow-gray-900/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
            >
                {isLoading ? (
                    <div className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        Criando conta...
                    </div>
                ) : 'Cadastrar-se'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500">
            Já tem uma conta?{' '}
            <button onClick={onNavigateToLogin} className="font-bold text-rose-600 hover:text-rose-700 hover:underline transition-all">
              Fazer Login
            </button>
          </p>
        </div>
      </div>

    </div>
  );
};