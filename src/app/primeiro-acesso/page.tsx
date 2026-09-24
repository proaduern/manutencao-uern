'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function PrimeiroAcessoPage() {
  const router = useRouter();
  const [senhaNova, setSenhaNova] = useState('');
  const [senhaRepetida, setSenhaRepetida] = useState('');
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');

    if (senhaNova.length < 8) {
      setErro('A nova senha precisa ter pelo menos 8 caracteres.');
      return;
    }

    if (senhaNova !== senhaRepetida) {
      setErro('As senhas informadas não conferem.');
      return;
    }

    setSalvando(true);
    try {
      const res = await fetch('/api/auth/trocar-senha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ novaSenha: senhaNova }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao redefinir senha.');

      setSucesso(true);
      setTimeout(() => {
        router.push('/');
        router.refresh();
      }, 1500);
    } catch (err: any) {
      setErro(err.message || 'Erro ao salvar a nova senha.');
      setSalvando(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-100">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Defina sua nova senha</h1>
          <p className="text-xs text-slate-500 mt-1">
            Este é seu primeiro acesso ao sistema. Para sua segurança, cadastre uma nova senha com no mínimo 8 caracteres.
          </p>
        </div>

        {erro && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center space-x-2 text-xs text-rose-700">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{erro}</span>
          </div>
        )}

        {sucesso && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center space-x-2 text-xs text-emerald-700">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
            <span>Senha redefinida com sucesso! Redirecionando...</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Nova Senha
            </label>
            <input
              type="password"
              required
              placeholder="Mínimo de 8 caracteres"
              value={senhaNova}
              onChange={(e) => setSenhaNova(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Confirmar Nova Senha
            </label>
            <input
              type="password"
              required
              placeholder="Repita a nova senha"
              value={senhaRepetida}
              onChange={(e) => setSenhaRepetida(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]"
            />
          </div>

          <button
            type="submit"
            disabled={salvando || sucesso}
            className="w-full py-2.5 bg-[#003366] hover:bg-[#002244] text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            <span>{salvando ? 'Salvando...' : 'Salvar Senha e Acessar'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
