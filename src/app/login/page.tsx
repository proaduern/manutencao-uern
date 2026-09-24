'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Wrench, Shield, Lock, Mail, ArrowRight, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    setCarregando(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Falha ao autenticar.');
      }

      if (data.deveTrocarSenha) {
        router.push('/primeiro-acesso');
      } else {
        router.push('/');
      }
      router.refresh();
    } catch (err: any) {
      setErro(err.message || 'Erro ao realizar login.');
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-12 bg-slate-50">
      {/* Banner Institucional UERN */}
      <div className="md:col-span-6 lg:col-span-7 bg-[#003366] text-white p-8 md:p-12 lg:p-16 flex flex-col justify-between relative overflow-hidden">
        {/* Detalhe de fundo */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center">
              <Wrench className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-wide block">UERN</span>
              <span className="text-xs text-blue-200">Pró-Reitoria de Administração</span>
            </div>
          </div>

          <div className="max-w-xl">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight mb-4">
              Manutenção Predial da UERN
            </h1>
            <p className="text-blue-100 text-base md:text-lg leading-relaxed mb-6">
              Abertura, acompanhamento de chamados, orçamentos, aprovações por alçada e controle de prazos e garantias em todos os campi da universidade.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 border-t border-white/10 text-xs text-blue-200">
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Gestão orçamentária e cotas</span>
              </div>
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Auditoria e rastreabilidade total</span>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 mt-12 pt-6 border-t border-white/10 text-xs text-blue-300">
          Acesso restrito aos servidores autorizados e à empresa contratada. Para cadastros ou suporte, procure a PROAD.
        </div>
      </div>

      {/* Formulário de Acesso */}
      <div className="md:col-span-6 lg:col-span-5 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Acessar o Sistema</h2>
            <p className="text-sm text-slate-500 mt-1">
              Informe seu e-mail institucional cadastrado pela PROAD.
            </p>
          </div>

          {erro && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-lg flex items-start space-x-2.5 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
              <span>{erro}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                E-mail Institucional
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input
                  type="email"
                  required
                  placeholder="usuario@uern.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#003366] focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Senha
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#003366] focus:border-transparent transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={carregando}
              className="w-full mt-2 py-2.5 px-4 bg-[#003366] hover:bg-[#002244] text-white font-medium text-sm rounded-lg shadow-sm flex items-center justify-center space-x-2 transition-colors disabled:opacity-50"
            >
              <span>{carregando ? 'Entrando...' : 'Entrar no Sistema'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
