import React from 'react';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import {
  Wrench,
  Clock,
  CheckCircle2,
  AlertTriangle,
  PlusCircle,
  TrendingUp,
  ArrowRight,
  ShieldCheck,
  DollarSign,
  Users,
  Layers,
  Briefcase,
  Building2,
} from 'lucide-react';
import Link from 'next/link';
import { obterGrandezasContrato } from '@/lib/services/contrato';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  // Buscar métricas reais no banco de dados Neon
  const [
    totalAbertos,
    totalExecucao,
    totalValidacao,
    totalConcluidos,
    chamadosRecentes,
    agendaAtiva,
    contratoAtivo,
  ] = await Promise.all([
    prisma.chamado.count({
      where: { status: { in: ['ABERTO', 'RECEBIDO', 'EM_ORCAMENTO', 'AGUARDANDO_AUTORIZACAO'] } },
    }),
    prisma.chamado.count({
      where: { status: 'EM_EXECUCAO' },
    }),
    prisma.chamado.count({
      where: { status: 'ATENDIDO' },
    }),
    prisma.chamado.count({
      where: { status: { in: ['CONCLUIDO', 'EM_GARANTIA'] } },
    }),
    prisma.chamado.findMany({
      take: 5,
      include: {
        unidade: { select: { nome: true, campus: true } },
        tipoServico: { select: { nome: true } },
      },
      orderBy: { abertoEm: 'desc' },
    }),
    prisma.agendaServico.findFirst({
      where: { status: { in: ['ABERTA_COLETA', 'EM_CONSOLIDACAO_PROAD', 'RATIFICADA_REITORIA', 'EM_EXECUCAO'] } },
      orderBy: { criadoEm: 'desc' },
    }),
    prisma.contrato.findFirst({
      where: { ativo: true },
      orderBy: { criadoEm: 'desc' },
    }),
  ]);

  const grandezas = contratoAtivo ? await obterGrandezasContrato(contratoAtivo.id) : null;
  const rubricas = grandezas?.rubricas;

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
                Painel integrado de gestão predial da Universidade do Estado do Rio Grande do Norte — {session.unidadeNome || 'PROAD Central'}.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/agendas"
                className="inline-flex items-center space-x-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-lg shadow-sm transition-colors"
              >
                <span>📅 Agenda de Serviços Programados</span>
              </Link>
              {(session.role === 'DEMANDANTE' || session.role === 'FISCAL_SETORIAL' || session.role === 'ADMIN' || session.role === 'GESTOR_UNIDADE') && (
                <Link
                  href="/chamados/novo"
                  className="inline-flex items-center space-x-2 px-4 py-2.5 bg-[#003366] hover:bg-[#002244] text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
                >
                  <PlusCircle className="w-4 h-4 text-amber-400" />
                  <span>Abrir Chamado Rotineiro</span>
                </Link>
              )}
            </div>
          </div>

          {/* Cards de Saldos por Rubrica do Contrato (Visão Compacta Imediata) */}
          {contratoAtivo && (
            <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-sm border border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-xs font-bold tracking-wider text-white uppercase flex items-center gap-2">
                      <span>Controle Orçamentário e Evolução de Saldos</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-normal lowercase">
                        {contratoAtivo.numero}/{contratoAtivo.ano}
                      </span>
                    </h2>
                    <p className="text-[11px] text-slate-400">
                      Saldos orçamentários disponíveis em tempo real por rubrica do contrato
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-[11px] text-slate-300 font-mono hidden sm:flex items-center gap-2">
                    <span className="text-slate-400">Total Contratado:</span>
                    <strong className="text-emerald-400 font-bold">
                      R$ {(contratoAtivo.valorTotal ? parseFloat(contratoAtivo.valorTotal.toString()) : 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </strong>
                  </div>
                  <Link
                    href="/contratos"
                    className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 bg-slate-800/90 hover:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors"
                  >
                    <span>Ver Contratos & Cotas</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Grid 4 Colunas dos Saldos por Rubrica */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {/* 1. Mão de Obra Residente */}
                <div className="bg-slate-800/90 rounded-xl p-3.5 border border-slate-700 flex flex-col justify-between space-y-2.5">
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-900/60 text-blue-300 border border-blue-700/50">
                        Custo Fixo Mensal
                      </span>
                      <Users className="w-3.5 h-3.5 text-blue-400" />
                    </div>
                    <h3 className="text-xs font-bold text-slate-200">1. Mão de Obra Residente</h3>
                    <div className="text-base font-extrabold text-white font-mono mt-1">
                      R$ {(rubricas?.maoObra?.contratado ?? (contratoAtivo.valorMaoObraResidente ? parseFloat(contratoAtivo.valorMaoObraResidente.toString()) : 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-[11px] text-blue-300 font-mono mt-0.5">
                      R$ {(rubricas?.maoObra?.custoMensal ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-700/60 text-[10px] text-slate-400 leading-tight flex items-center justify-between">
                    <span>Postos residentes:</span>
                    <strong className="text-slate-300 font-mono">{rubricas?.maoObra?.quantidadePostos || 10} dedicados</strong>
                  </div>
                </div>

                {/* 2. Insumos sob Demanda */}
                <div className="bg-slate-800/90 rounded-xl p-3.5 border border-purple-900/40 flex flex-col justify-between space-y-2.5">
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-900/60 text-purple-300 border border-purple-700/50">
                        Sob Demanda
                      </span>
                      <Layers className="w-3.5 h-3.5 text-purple-400" />
                    </div>
                    <h3 className="text-xs font-bold text-slate-200">2. Insumos sob Demanda</h3>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Contratado: <strong className="text-slate-300 font-mono">R$ {(rubricas?.insumos?.contratado ?? (contratoAtivo.valorInsumos ? parseFloat(contratoAtivo.valorInsumos.toString()) : 0)).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</strong>
                    </div>
                    <div className="mt-1.5 bg-slate-900/90 p-2 rounded-lg border border-purple-900/30">
                      <span className="text-[9px] text-emerald-400 font-bold uppercase block">Saldo Disponível Real</span>
                      <span className="text-base font-black text-emerald-300 font-mono">
                        R$ {(rubricas?.insumos?.saldoDisponivel ?? (contratoAtivo.valorInsumos ? parseFloat(contratoAtivo.valorInsumos.toString()) : 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between text-[10px] text-slate-400">
                    <span className="font-mono text-slate-400">Prov: R$ {(rubricas?.insumos?.provisionado ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</span>
                    <span className="font-mono text-purple-300 font-bold">{rubricas?.insumos?.percentualConsumido || 0}% cons.</span>
                  </div>
                </div>

                {/* 3. Serviços Eventuais */}
                <div className="bg-slate-800/90 rounded-xl p-3.5 border border-amber-900/40 flex flex-col justify-between space-y-2.5">
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-900/60 text-amber-300 border border-amber-700/50">
                        Sob Demanda
                      </span>
                      <Briefcase className="w-3.5 h-3.5 text-amber-400" />
                    </div>
                    <h3 className="text-xs font-bold text-slate-200">3. Serviços Eventuais</h3>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Contratado: <strong className="text-slate-300 font-mono">R$ {(rubricas?.servicosEventuais?.contratado ?? (contratoAtivo.valorServicosEventuais ? parseFloat(contratoAtivo.valorServicosEventuais.toString()) : 0)).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</strong>
                    </div>
                    <div className="mt-1.5 bg-slate-900/90 p-2 rounded-lg border border-amber-900/30">
                      <span className="text-[9px] text-emerald-400 font-bold uppercase block">Saldo Disponível Real</span>
                      <span className="text-base font-black text-emerald-300 font-mono">
                        R$ {(rubricas?.servicosEventuais?.saldoDisponivel ?? (contratoAtivo.valorServicosEventuais ? parseFloat(contratoAtivo.valorServicosEventuais.toString()) : 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between text-[10px] text-slate-400">
                    <span className="font-mono text-slate-400">Prov: R$ {(rubricas?.servicosEventuais?.provisionado ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</span>
                    <span className="font-mono text-amber-300 font-bold">{rubricas?.servicosEventuais?.percentualConsumido || 0}% cons.</span>
                  </div>
                </div>

                {/* 4. Diárias de Deslocamento */}
                <div className="bg-slate-800/90 rounded-xl p-3.5 border border-teal-900/40 flex flex-col justify-between space-y-2.5">
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-teal-900/60 text-teal-300 border border-teal-700/50">
                        Sob Demanda
                      </span>
                      <Building2 className="w-3.5 h-3.5 text-teal-400" />
                    </div>
                    <h3 className="text-xs font-bold text-slate-200">4. Diárias Deslocamento</h3>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Contratado: <strong className="text-slate-300 font-mono">R$ {(rubricas?.diarias?.contratado ?? (contratoAtivo.valorDiarias ? parseFloat(contratoAtivo.valorDiarias.toString()) : 0)).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</strong>
                    </div>
                    <div className="mt-1.5 bg-slate-900/90 p-2 rounded-lg border border-teal-900/30">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] text-emerald-400 font-bold uppercase">Saldo Disponível</span>
                        <span className="text-[10px] font-mono text-teal-300 font-semibold">{rubricas?.diarias?.saldoDiasDisponivel ?? 0} diárias</span>
                      </div>
                      <span className="text-base font-black text-emerald-300 font-mono block">
                        R$ {(rubricas?.diarias?.saldoDisponivel ?? (contratoAtivo.valorDiarias ? parseFloat(contratoAtivo.valorDiarias.toString()) : 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between text-[10px] text-slate-400">
                    <span className="font-mono text-slate-400">Prov: {rubricas?.diarias?.diasProvisionados || 0} d.</span>
                    <span className="font-mono text-teal-300 font-bold">{rubricas?.diarias?.percentualConsumido || 0}% cons.</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Banner de Bifurcação de Atendimento: Rotina vs Agenda Programada */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Opção 1: Chamados Rotineiros */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 rounded-2xl shadow-sm border border-slate-700 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="inline-flex items-center space-x-2 px-2.5 py-1 bg-blue-500/20 text-blue-300 text-[11px] font-semibold rounded-full border border-blue-500/30">
                  <Wrench className="w-3.5 h-3.5" />
                  <span>Manutenção Contínua</span>
                </div>
                <h2 className="text-lg font-bold text-white">Chamados Rotineiros</h2>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Demandas corretivas ordinárias do dia a dia (reparos elétricos, vazamentos, fechaduras, desentupimentos). Atendimento com equipe residente ou insumos sob demanda.
                </p>
              </div>
              <div className="pt-2 flex items-center justify-between">
                <Link
                  href="/chamados"
                  className="text-xs font-semibold text-blue-300 hover:text-white flex items-center space-x-1"
                >
                  <span>Ver chamados em andamento</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                {(session.role === 'DEMANDANTE' || session.role === 'ADMIN' || session.role === 'GESTOR_UNIDADE') && (
                  <Link
                    href="/chamados/novo"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
                  >
                    + Novo Chamado
                  </Link>
                )}
              </div>
            </div>

            {/* Opção 2: Agenda de Serviços Programados */}
            <div className="bg-gradient-to-br from-blue-950 via-slate-900 to-indigo-950 text-white p-6 rounded-2xl shadow-sm border border-indigo-900/50 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="inline-flex items-center space-x-2 px-2.5 py-1 bg-amber-500/20 text-amber-300 text-[11px] font-semibold rounded-full border border-amber-500/30">
                  <span>✨ Maior Vulto & Serviços Eventuais</span>
                </div>
                <h2 className="text-lg font-bold text-white">Agenda de Serviços Programados</h2>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {agendaAtiva
                    ? `Ciclo ativo: "${agendaAtiva.titulo}". Coleta de demandas com cota financeira por unidade e orçamentos baseados no SINAPI para homologação da Reitoria.`
                    : 'Ciclos periódicos abertos pela PROAD para coleta de demandas de serviços eventuais com cota individual por campus e ratificação superior.'}
                </p>
              </div>
              <div className="pt-2 flex items-center justify-between">
                <span className="text-xs text-amber-400 font-mono font-medium">
                  {agendaAtiva ? `Status: ${agendaAtiva.status}` : 'Aguardando abertura de ciclo'}
                </span>
                <Link
                  href="/agendas"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg transition-colors shadow-sm"
                >
                  {agendaAtiva?.status === 'ABERTA_COLETA' ? 'Lançar Demandas na Agenda' : 'Acessar Agendas'}
                </Link>
              </div>
            </div>
          </div>

          {/* Cards de Métricas / KPIs Reais */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Abertos / Fila</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{totalAbertos}</p>
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
                <p className="text-2xl font-bold text-amber-600 mt-1">{totalExecucao}</p>
                <p className="text-[11px] text-amber-600 mt-1 flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span>Serviços em campo</span>
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Aguardando Validação</p>
                <p className="text-2xl font-bold text-purple-600 mt-1">{totalValidacao}</p>
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
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Concluídos / Garantia</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">{totalConcluidos}</p>
                <p className="text-[11px] text-emerald-600 mt-1 flex items-center space-x-1">
                  <TrendingUp className="w-3 h-3" />
                  <span>Histórico finalizado</span>
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Fila Recente & Ações Rápidas */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900">Chamados Recentes</h2>
              <Link href="/chamados" className="text-xs font-medium text-[#003366] hover:underline flex items-center space-x-1">
                <span>Ver todos</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-3">
              {chamadosRecentes.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  Nenhum chamado aberto ainda no sistema.
                </div>
              ) : (
                chamadosRecentes.map((c) => (
                  <Link
                    key={c.id}
                    href={`/chamados/${c.id}`}
                    className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 block"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-mono font-bold text-slate-500">
                          #{c.numero.toString().padStart(4, '0')}
                        </span>
                        <span className="text-xs font-semibold text-slate-800">
                          {c.titulo || c.tipoServico.nome}
                        </span>
                        {c.nivelCodigo && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            {c.nivelCodigo}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">
                        {c.unidade.nome} &bull; {c.setorEspecifico}
                      </p>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold border self-start sm:self-auto ${
                        c.status === 'BLOQUEADO_SEM_SALDO'
                          ? 'bg-rose-100 text-rose-800 border-rose-300 font-bold'
                          : c.status === 'AGUARDANDO_AUTORIZACAO'
                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                          : c.status === 'AUTORIZADO'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : c.status === 'EM_EXECUCAO'
                          ? 'bg-blue-100 text-blue-800 border-blue-300'
                          : c.status === 'EM_GARANTIA'
                          ? 'bg-teal-100 text-teal-800 border-teal-300'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {c.status.replace(/_/g, ' ')}
                    </span>
                  </Link>
                ))
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
