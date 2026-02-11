import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { SuccessModal } from '../components/SuccessModal'; // Importa o novo modal

export const Profile: React.FC = () => {
  const { user, updateUser } = useAuth(); // updateUser é crucial aqui
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // States do formulário
  const [name, setName] = useState(user?.name || '');
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || '');
  
  // States de senha e loading
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // State do Modal de Sucesso
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState({ title: '', message: '' });

  // Atualiza os states se o usuário mudar externamente (raro, mas boa prática)
  useEffect(() => {
      if(user) {
          setName(user.name);
          setAvatarPreview(user.avatar || '');
      }
  }, [user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          // Validação simples de 2MB
          if (file.size > 2 * 1024 * 1024) {
              alert("A imagem deve ter no máximo 2MB.");
              return;
          }
          const reader = new FileReader();
          reader.onloadend = () => {
              setAvatarPreview(reader.result as string);
          };
          reader.readAsDataURL(file);
      }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsLoading(true);
      try {
          // 1. Atualiza no Backend
          await api.patch('/users/me', { name, avatar: avatarPreview });
          
          // 2. Atualiza no Contexto Global (Isso atualiza o Header instantaneamente!)
          updateUser({ name, avatar: avatarPreview });

          // 3. Mostra o Modal de Sucesso
          setSuccessMessage({ title: 'Perfil Atualizado!', message: 'Suas informações foram salvas com sucesso.' });
          setShowSuccessModal(true);
      } catch (err) {
          console.error(err);
          alert("Erro ao atualizar perfil.");
      } finally {
          setIsLoading(false);
      }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
      e.preventDefault();
      if(newPassword.length < 6) return alert("A nova senha deve ter no mínimo 6 caracteres.");
      
      setIsLoading(true);
      try {
          await api.patch('/users/me/password', { currentPassword, newPassword });
          
          setSuccessMessage({ title: 'Senha Alterada!', message: 'Use sua nova senha no próximo login.' });
          setShowSuccessModal(true);

          setCurrentPassword("");
          setNewPassword("");
      } catch (err) {
          alert("Erro: Verifique sua senha atual.");
      } finally {
          setIsLoading(false);
      }
  };

  return (
    <div className="flex-1 p-8 md:p-12 overflow-y-auto bg-[#F8FAFC] dark:bg-[#0F1117] transition-colors h-full font-sans relative">
      
      {/* Modal de Sucesso */}
      <SuccessModal 
          isOpen={showSuccessModal} 
          onClose={() => setShowSuccessModal(false)}
          title={successMessage.title}
          message={successMessage.message}
      />

      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-xl transition-colors">
                <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </button>
            <h2 className="text-2xl font-extrabold text-gray-800 dark:text-white">Seu Perfil</h2>
        </div>

        <div className="space-y-8">
            
            {/* CARD DE PERFIL */}
            <div className="bg-white dark:bg-[#16181D] p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800/50">
                <form onSubmit={handleUpdateProfile} className="flex flex-col gap-6">
                    
                    {/* Avatar Upload */}
                    <div className="flex flex-col items-center gap-4 mb-2">
                        <div 
                            className="w-28 h-28 rounded-full bg-gradient-to-tr from-rose-100 to-orange-100 dark:from-rose-900/30 dark:to-orange-900/30 ring-4 ring-white dark:ring-[#1F222A] shadow-xl flex items-center justify-center overflow-hidden cursor-pointer group relative transition-all hover:scale-105"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {avatarPreview ? (
                                <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-3xl font-bold text-rose-500">{user?.name[0]?.toUpperCase()}</span>
                            )}
                            
                            {/* Overlay */}
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            </div>
                        </div>
                        <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleFileChange} />
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Clique para alterar foto</p>
                    </div>

                    {/* Inputs */}
                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2 pl-1">Nome Completo</label>
                            <input value={name} onChange={e => setName(e.target.value)} className="w-full bg-gray-50 dark:bg-[#1F222A] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-rose-500/50 font-medium" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2 pl-1">Email (Fixo)</label>
                            <input value={user?.email} disabled className="w-full bg-gray-100 dark:bg-[#1F222A]/50 border border-transparent rounded-xl px-4 py-3 text-gray-500 font-medium cursor-not-allowed opacity-70" />
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <button disabled={isLoading} className="bg-rose-600 hover:bg-rose-700 text-white px-8 py-3 rounded-xl font-bold text-sm shadow-lg shadow-rose-500/20 transition-all active:scale-95 flex items-center gap-2">
                            {isLoading ? 'Salvando...' : 'Salvar Alterações'}
                        </button>
                    </div>
                </form>
            </div>

            {/* CARD DE SEGURANÇA */}
            <div className="bg-white dark:bg-[#16181D] p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800/50">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                    Segurança
                </h3>
                <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="Senha Atual" className="w-full bg-gray-50 dark:bg-[#1F222A] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-gray-500/30 font-medium" />
                        <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Nova Senha (mín. 6 chars)" className="w-full bg-gray-50 dark:bg-[#1F222A] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-gray-500/30 font-medium" />
                    </div>
                    <div className="flex justify-end pt-4">
                        <button disabled={!currentPassword || !newPassword || isLoading} className="bg-gray-900 hover:bg-black dark:bg-white dark:text-black dark:hover:bg-gray-200 text-white px-8 py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-50 active:scale-95">
                            Atualizar Senha
                        </button>
                    </div>
                </form>
            </div>

        </div>
      </div>
    </div>
  );
};