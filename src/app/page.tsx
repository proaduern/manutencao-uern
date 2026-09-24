import React from 'react';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import {
  Wrench,
  Clock,
  CheckCircle2,
  AlertTriangle,
  PlusCircle,
  TrendingUp,
  Building,
  DollarSign,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';

export default async function DashboardPage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen flex bg-slate-50">
      <Sidebar role={session.role} />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar user={session} />

        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* Header de Boas-vindas */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Olá, {session.nome.split(' ')[0]}!
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Painel integrado de manutenção predial — {session.unidadeNome || 'UERN Central'}.
              </p>
            </div>

            <div className="flex items-center space-x-3">
              {(session.role === 'DEMANDANTE' || session.role === 'FISCAL_SETORIAL' || session.role === 'ADMIN') && (
                <Link
                  href="/chamados/novo"
                  className="inline-flex items-center space-x-2 px-4 py-2.5 bg-[#003366] hover:bg-[#002244] text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
                >
                  <PlusCircle className="w-4 h-4 text-amber-400" />
                  <span>Novo Chamado</span>
                </Link>
              )}
            </div>
          </div>

          {/* Cards de Métricas / KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Chamados Abertos</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">12</p>
                <p className="text-[11px] text-blue-600 mt-1 flex items-center space-x-1">
                  <span>Aguardando atendimento</span>
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#003366] flex items-center justify-center">
                <Wrench className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Em Execução</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">5</p>
                <p className="text-[11px] text-amber-600 mt-1 flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span>No prazo contratual</span>
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Aguardando Validação</p>
                <p className="text-2xl font-bold text-purple-600 mt-1">3</p>
                <p className="text-[11px] text-purple-600 mt-1 flex items-center space-x-1">
                  <span>Aceite pelo demandante</span>
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Concluídos este mês</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">28</p>
                <p className="text-[11px] text-emerald-600 mt-1 flex items-center space-x-1">
                  <TrendingUp className="w-3 h-3" />
                  <span>96% de avaliação positiva</span>
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Fila Recente & Ações Rápidas */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-slate-900">Chamados Recentes</h2>
                <Link href="/chamados" className="text-xs font-medium text-[#003366] hover:underline flex items-center space-x-1">
                  <span>Ver todos</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="space-y-3">
                <div className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-mono font-bold text-slate-500">#0042</span>
                      <span className="text-xs font-semibold text-slate-800">Vazamento hidráulico no Bloco de Aulas</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                        Crítico
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">Campus Central / Mossoró &bull; Aberto há 2 horas</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                    Em orçamento
                  </span>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-mono font-bold text-slate-500">#0041</span>
                      <span className="text-xs font-semibold text-slate-800">Manutenção preventiva em ar condicionado split</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        Normal
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">Campus de Natal &bull; Aberto ontem</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                    Em execução
                  </span>
                </div>
              </div>
            </div>

            {/* Painel de Alçada & Informações */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
              <h2 className="text-base font-bold text-slate-900">Informações Rápidas</h2>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2 text-slate-600">
                <p className="font-semibold text-slate-800">Contrato Vigente: CT 014/2025</p>
                <p>Empresa: Prestadora de Serviços de Manutenção Predial Ltda.</p>
                <div className="pt-2 border-t border-slate-200">
                  <p className="text-[11px] text-slate-500">Cota da Unidade disponível:</p>
                  <p className="text-base font-bold text-emerald-700 mt-0.5">R$ 48.750,00</p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
