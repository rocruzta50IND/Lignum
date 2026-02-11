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
    setIsLoading(true);
    setError('');
    try {
      await signUp({ name, email, password });
    } catch (err) {
      setError('Erro ao cadastrar. Tente outro email.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#121212] p-4">
      <div className="w-full max-w-md bg-[#2C2C2C] p-8 rounded-2xl shadow-xl border border-[#333]">
        <h1 className="text-2xl font-bold text-white mb-6 text-center">Criar Conta</h1>
        {error && <div className="bg-red-900/30 text-red-200 p-3 rounded mb-4 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text" placeholder="Nome Completo" required
            className="w-full bg-[#1A1A1A] text-white p-3 rounded border border-[#333] focus:border-blue-500 outline-none"
            value={name} onChange={e => setName(e.target.value)}
          />
          <input
            type="email" placeholder="Email" required
            className="w-full bg-[#1A1A1A] text-white p-3 rounded border border-[#333] focus:border-blue-500 outline-none"
            value={email} onChange={e => setEmail(e.target.value)}
          />
          <input
            type="password" placeholder="Senha (min 6 chars)" required minLength={6}
            className="w-full bg-[#1A1A1A] text-white p-3 rounded border border-[#333] focus:border-blue-500 outline-none"
            value={password} onChange={e => setPassword(e.target.value)}
          />
          <button 
            type="submit" disabled={isLoading}
            className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded transition disabled:opacity-50"
          >
            {isLoading ? 'Criando...' : 'Cadastrar'}
          </button>
        </form>
        <p className="mt-4 text-center text-gray-400 text-sm">
          Já tem conta? <button onClick={onNavigateToLogin} className="text-blue-400 hover:underline">Faça Login</button>
        </p>
      </div>
    </div>
  );
};