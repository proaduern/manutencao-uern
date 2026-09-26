'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, User as UserIcon, Shield, ChevronDown } from 'lucide-react';

interface NavbarProps {
  user?: {
    nome?: string;
    email?: string;
    role?: string;
    matricula?: string | null;
    unidadeNome?: string | null;
  } | null;
}

export default function Navbar({ user }: NavbarProps) {
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (e) {
      console.error(e);
      setLoggingOut(false);
    }
  };

  const formatRole = (role?: string) => {
    if (!role) return '';
    const rolesMap: Record<string, string> = {
      ADMIN: 'Administração PROAD',
      GESTOR_CONTRATO: 'Gestão do Contrato',
      FISCAL_ADM: 'Fiscalização Administrativa',
      FISCAL_TECNICO: 'Fiscalização Técnica',
      FISCAL_SETORIAL: 'Fiscalização Setorial',
      DEMANDANTE: 'Unidade Demandante',
      EMPRESA: 'Empresa Contratada',
    };
    return rolesMap[role] || role;
  };

  const nomeExibicao = user?.nome || 'Usuário';
  const emailExibicao = user?.email || '';
  const roleExibicao = user?.role || '';
  const inicial = nomeExibicao.charAt(0).toUpperCase() || 'U';

  return (
    <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200 px-4 md:px-8 flex items-center justify-between shadow-sm">
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-lg bg-[#003366] text-white flex items-center justify-center font-bold text-base shadow">
            U
          </div>
          <div>
            <span className="font-bold text-slate-800 text-sm md:text-base leading-tight block">
              Manutenção Predial — UERN
            </span>
            <span className="text-[10px] text-slate-400 font-medium tracking-wide uppercase block">
              Pró-Reitoria de Administração (PROAD)
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        {user?.unidadeNome && (
          <span className="hidden md:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
            {user.unidadeNome}
          </span>
        )}

        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center space-x-2.5 p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-left"
          >
            <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-semibold text-xs border border-slate-300">
              {inicial}
            </div>
            <div className="hidden sm:block">
              <span className="text-xs font-semibold text-slate-800 block leading-tight">
                {nomeExibicao}
              </span>
              <span className="text-[10px] text-slate-500 block">
                {formatRole(roleExibicao)}
              </span>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-slate-200 py-1.5 z-50">
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-800 truncate">{nomeExibicao}</p>
                <p className="text-[11px] text-slate-500 truncate">{emailExibicao}</p>
                <p className="text-[10px] text-[#003366] font-medium mt-1">{formatRole(roleExibicao)}</p>
              </div>

              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="w-full flex items-center space-x-2 px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>{loggingOut ? 'Saindo...' : 'Sair da conta'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
