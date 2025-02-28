import React, { useState } from "react";
import { supabase } from "../../lib/supabaseClient";

interface PasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PasswordModal({ isOpen, onClose }: PasswordModalProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updateLoading, setUpdateLoading] = useState(false);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setUpdateLoading(true);

    try {
      if (password !== confirmPassword) {
        setError('As senhas não coincidem');
        return;
      }

      if (password.length < 6) {
        setError('A senha deve ter pelo menos 6 caracteres');
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) {
        console.error('Erro ao atualizar senha:', updateError.message);
        setError('Não foi possível atualizar sua senha. Por favor, tente novamente.');
        return;
      }

      console.log('Senha atualizada com sucesso!');
      resetForm();
      alert('Senha atualizada com sucesso!');
      onClose();
    } catch (err) {
      console.error('Erro inesperado ao atualizar senha:', err);
      setError('Ocorreu um erro inesperado. Por favor, tente novamente.');
    } finally {
      setUpdateLoading(false);
    }
  };

  const resetForm = () => {
    setPassword('');
    setConfirmPassword('');
    setError(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[#1C1E21] border border-[#2A2D31] rounded-lg p-6 w-full max-w-md animate-fadeIn">
        <h3 className="text-xl font-semibold mb-4">Atualizar Senha</h3>
        
        <form onSubmit={handleUpdatePassword} className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-2 rounded">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
              Nova Senha
            </label>
            <input
              type={showPassword ? "text" : "password"}
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#2A2D31]/50 border border-[#2A2D31] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#00E7C1]/50 focus:border-[#00E7C1]"
              placeholder="Digite sua nova senha"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
              Confirmar Nova Senha
            </label>
            <input
              type={showPassword ? "text" : "password"}
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#2A2D31]/50 border border-[#2A2D31] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#00E7C1]/50 focus:border-[#00E7C1]"
              placeholder="Confirme sua nova senha"
            />
          </div>

          <div className="flex items-center gap-2 mb-4">
            <input
              type="checkbox"
              id="showPassword"
              checked={showPassword}
              onChange={(e) => setShowPassword(e.target.checked)}
              className="rounded border-gray-300 text-[#00E7C1] focus:ring-[#00E7C1]"
            />
            <label htmlFor="showPassword" className="text-sm text-gray-300">
              Mostrar senha
            </label>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                resetForm();
                onClose();
              }}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={updateLoading}
              className="bg-[#00E7C1] text-black px-4 py-2 rounded-lg font-medium hover:bg-[#00E7C1]/90 transition-colors disabled:opacity-50"
            >
              {updateLoading ? 'Atualizando...' : 'Atualizar Senha'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
