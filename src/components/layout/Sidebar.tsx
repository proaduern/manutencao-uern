'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Wrench,
  PlusCircle,
  CheckSquare,
  FileText,
  Building2,
  Users,
  DollarSign,
  BarChart3,
  ShieldCheck,
  HardHat,
  CalendarCheck,
} from 'lucide-react';

interface SidebarProps {
  role: string;
}

export default function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();

  const isAdmin = role === 'ADMIN';
  const isGestor = role === 'GESTOR_CONTRATO';
  const isFiscalTecnico = role === 'FISCAL_TECNICO';
  const isFiscalAdm = role === 'FISCAL_ADM';
  const isFiscalSetorial = role === 'FISCAL_SETORIAL';
  const isDemandante = role === 'DEMANDANTE';
  const isEmpresa = role === 'EMPRESA';

  const isGestaoOrFiscal = isAdmin || isGestor || isFiscalTecnico || isFiscalAdm;

  const navigation = [
    {
      name: 'Visão Geral',
      href: '/',
      icon: LayoutDashboard,
      visible: true,
    },
    {
      name: 'Abrir Chamado',
      href: '/chamados/novo',
      icon: PlusCircle,
      visible: isDemandante || isFiscalSetorial || isAdmin,
    },
    {
      name: isDemandante ? 'Meus Chamados' : isEmpresa ? 'Fila da Empresa' : 'Todos os Chamados',
      href: '/chamados',
      icon: Wrench,
      visible: true,
    },
    {
      name: 'Fila de Decisões',
      href: '/decisoes',
      icon: CheckSquare,
      visible: isGestaoOrFiscal,
    },
    {
      name: 'Contratos & Cotas',
      href: '/contratos',
      icon: DollarSign,
      visible: isGestaoOrFiscal,
    },
    {
      name: 'Orçamentos & Insumos',
      href: '/empresa/orcamentos',
      icon: HardHat,
      visible: isEmpresa || isGestaoOrFiscal,
    },
    {
      name: 'Unidades & Prédios',
      href: '/unidades',
      icon: Building2,
      visible: isAdmin || isGestor,
    },
    {
      name: 'Usuários & Perfis',
      href: '/usuarios',
      icon: Users,
      visible: isAdmin,
    },
    {
      name: 'Tabelas de Referência',
      href: '/tabelas-precos',
      icon: FileText,
      visible: isAdmin || isFiscalTecnico,
    },
    {
      name: 'Relatórios & Indicadores',
      href: '/relatorios',
      icon: BarChart3,
      visible: isGestaoOrFiscal || isFiscalSetorial,
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col min-h-screen border-r border-slate-800 shrink-0">
      <div className="p-4 border-b border-slate-800 flex items-center space-x-2">
        <Wrench className="w-5 h-5 text-amber-500" />
        <span className="font-semibold text-white text-sm tracking-wide">
          Menu de Navegação
        </span>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navigation
          .filter((item) => item.visible)
          .map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-[#003366] text-white shadow'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                <span className="truncate">{item.name}</span>
              </Link>
            );
          })}
      </nav>

      <div className="p-3 border-t border-slate-800 text-[11px] text-slate-500 text-center">
        PROAD / UERN &copy; {new Date().getFullYear()}
      </div>
    </aside>
  );
}
