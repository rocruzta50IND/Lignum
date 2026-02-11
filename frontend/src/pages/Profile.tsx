import React, { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { useNavigate } from 'react-router-dom';

// --- AQUI ESTAVA O ERRO: TEM QUE SER 'export const' ---
export const Profile: React.FC = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(user?.name || '');
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || '');
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
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
          await api.patch('/users/me', { name, avatar: avatarPreview });
          updateUser({ name, avatar: avatarPreview });
          alert("Perfil atualizado com sucesso!");
      } catch (err) {
          console.error(err);
          alert("Erro ao atualizar perfil.");
      } finally {
          setIsLoading(false);
      }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
      e.preventDefault();
      if(newPassword.length < 6) return alert("Mínimo 6 caracteres.");
      setIsLoading(true);
      try {
          await api.patch('/users/me/password', { currentPassword, newPassword });
          alert("Senha alterada!");
          setCurrentPassword("");
          setNewPassword("");
      } catch (err) {
          alert("Erro: Verifique sua senha atual.");
      } finally {
          setIsLoading(false);
      }
  };

  return (
    <div className="flex-1 p-8 md:p-12 overflow-y-auto bg-[#F8FAFC] dark:bg-[#0F1117] transition-colors h-full font-sans">
      <div className="max-w-2xl mx-auto">
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
                    <div className="flex flex-col items-center gap-4 mb-2">
                        <div 
                            className="w-24 h-24 rounded-full bg-gradient-to-tr from-rose-100 to-orange-100 dark:from-rose-900/30 dark:to-orange-900/30 ring-4 ring-white dark:ring-[#1F222A] shadow-lg flex items-center justify-center overflow-hidden cursor-pointer group relative"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {avatarPreview ? (
                                <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-2xl font-bold text-rose-500">{user?.name[0]}</span>
                            )}
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            </div>
                        </div>
                        <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleFileChange} />
                        <p className="text-xs text-gray-400">Clique na foto para alterar</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Nome</label>
                            <input value={name} onChange={e => setName(e.target.value)} className="w-full bg-gray-50 dark:bg-[#1F222A] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-rose-500/50" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Email</label>
                            <input value={user?.email} disabled className="w-full bg-gray-100 dark:bg-[#1F222A]/50 border border-transparent rounded-xl px-4 py-3 text-gray-500 cursor-not-allowed" />
                        </div>
                    </div>
                    <div className="flex justify-end pt-2">
                        <button disabled={isLoading} className="bg-rose-600 hover:bg-rose-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-rose-500/20 transition-all">Salvar</button>
                    </div>
                </form>
            </div>
            
            {/* CARD DE SENHA */}
            <div className="bg-white dark:bg-[#16181D] p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800/50">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6">Segurança</h3>
                <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="Senha Atual" className="w-full bg-gray-50 dark:bg-[#1F222A] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-rose-500/50" />
                        <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Nova Senha" className="w-full bg-gray-50 dark:bg-[#1F222A] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-rose-500/50" />
                     </div>
                    <div className="flex justify-end pt-2">
                        <button disabled={!currentPassword || !newPassword || isLoading} className="bg-gray-800 hover:bg-gray-900 dark:bg-white dark:text-black dark:hover:bg-gray-200 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-50">Atualizar Senha</button>
                    </div>
                </form>
            </div>
        </div>
      </div>
    </div>
  );
};