'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import {
  CalendarCheck,
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Building2,
  DollarSign,
  ArrowRight,
  FileText,
  Search,
  ChevronRight,
  ShieldAlert,
  Send,
  Sparkles,
  Trash2,
} from 'lucide-react';

export default function AgendasIndexPage() {
  const [user, setUser] = useState<any>(null);
  const [agendas, setAgendas] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState('TODOS');
  const [busca, setBusca] = useState('');

  const carregarDados = () => {
    setCarregando(true);
    Promise.all([
      fetch('/api/auth/me').then((res) => res.json()),
      fetch('/api/agendas').then((res) => res.json()),
    ])
      .then(([userData, agendasData]) => {
        if (userData.user) setUser(userData.user);
        if (agendasData.agendas) setAgendas(agendasData.agendas);
        setCarregando(false);
      })
      .catch((err) => {
        console.error('Erro ao carregar dados:', err);
        setCarregando(false);
      });
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const isAdminOrGestor = user?.role === 'ADMIN' || user?.role === 'GESTOR_CONTRATO';
  const isDemandante = user?.role === 'DEMANDANTE';
  const isEmpresa = user?.role === 'EMPRESA';
  const isTecnicoSobe = user?.role === 'TECNICO_SOBE';

  const excluirAgenda = async (agendaId: string, titulo: string) => {
    if (
      !confirm(
        `Tem certeza que deseja excluir permanentemente a "${titulo}" e todas as suas demandas cadastradas?\n\nEsta ação limpará o banco de dados e não pode ser desfeita.`
      )
    ) {
      return;
    }

    try {
      setCarregando(true);
      const res = await fetch(`/api/agendas/${agendaId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao excluir agenda.');

      alert(data.mensagem || 'Agenda excluída com sucesso!');
      carregarDados();
    } catch (err: any) {
      alert(err.message);
      setCarregando(false);
    }
  };

  const agendasFiltradas = agendas.filter((ag) => {
    if (filtroStatus !== 'TODOS' && ag.status !== filtroStatus) return false;
    if (busca.trim()) {
      const termo = busca.toLowerCase();
      return (
        ag.titulo.toLowerCase().includes(termo) ||
        (ag.descricao && ag.descricao.toLowerCase().includes(termo))
      );
    }
    return true;
  });

  return (
    <div className="min-h-screen flex bg-slate-50">
      <Sidebar role={user?.role} />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar user={user} />

        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* Cabeçalho */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                  Módulo de Serviços Programados
                </span>
                <span className="text-xs text-slate-500">•</span>
                <span className="text-xs text-slate-500 font-medium">Serviços Eventuais & SINAPI</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <CalendarCheck className="w-6 h-6 text-amber-600" />
                <span>Agenda de Serviços Programados</span>
              </h1>
              <p className="text-xs text-slate-500">
                Ciclos de manutenção programada de maior vulto, com cotas individualizadas por unidade, orçamentos SINAPI e homologação da Reitoria.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {isAdminOrGestor && (
                <Link
                  href="/agendas/nova"
                  className="inline-flex items-center space-x-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-lg shadow-sm transition-colors"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Abrir Nova Agenda</span>
                </Link>
              )}
            </div>
          </div>

          {/* Destaque para o Demandante: Sua Cota e Status do Ciclo Ativo */}
          {isDemandante && agendas.length > 0 && agendas[0]?.cotaUsuarioUnidade && (
            <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 rounded-2xl shadow-sm border border-indigo-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-800/60 pb-3">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  <span className="font-bold text-sm">Sua Cota na Agenda Atual: {agendas[0].titulo}</span>
                </div>
                <span className="text-xs px-3 py-1 bg-amber-400/20 text-amber-300 rounded-full font-mono border border-amber-400/30">
                  {agendas[0].status === 'ABERTA_COLETA' ? '🟢 Período de Coleta Aberto' : `Status: ${agendas[0].status}`}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
                <div>
                  <p className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Cota da Unidade</p>
                  <p className="text-xl font-bold text-white mt-1">
                    R$ {agendas[0].cotaUsuarioUnidade.cotaTeto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Saldo Disponível</p>
                  <p className="text-xl font-bold text-emerald-400 mt-1">
                    R$ {agendas[0].cotaUsuarioUnidade.saldoDisponivel.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Demandas Cadastradas</p>
                  <p className="text-xl font-bold text-white mt-1">
                    {agendas[0].cotaUsuarioUnidade.demandasCadastradas} de {agendas[0].cotaUsuarioUnidade.maxDemandas}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Demandas Restantes</p>
                  <p className="text-xl font-bold text-amber-400 mt-1">
                    {agendas[0].cotaUsuarioUnidade.demandasRestantes} disponíveis
                  </p>
                </div>
              </div>

              {agendas[0].status === 'ABERTA_COLETA' && agendas[0].cotaUsuarioUnidade.demandasRestantes > 0 && (
                <div className="pt-2 flex justify-end">
                  <Link
                    href={`/agendas/${agendas[0].id}#lancar-demanda`}
                    className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center space-x-2"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Lançar Nova Demanda para Esta Agenda</span>
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Filtros e Busca */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
              {['TODOS', 'ABERTA_COLETA', 'EM_CONSOLIDACAO_PROAD', 'RATIFICADA_REITORIA', 'EM_EXECUCAO', 'CONCLUIDA'].map((st) => (
                <button
                  key={st}
                  onClick={() => setFiltroStatus(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    filtroStatus === st
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st === 'TODOS'
                    ? 'Todas'
                    : st === 'ABERTA_COLETA'
                    ? 'Coleta Aberta'
                    : st === 'EM_CONSOLIDACAO_PROAD'
                    ? 'Em Consolidação'
                    : st === 'RATIFICADA_REITORIA'
                    ? 'Ratificada Reitoria'
                    : st === 'EM_EXECUCAO'
                    ? 'Em Execução'
                    : 'Concluídas'}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar agenda..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>
          </div>

          {/* Lista de Agendas */}
          {carregando ? (
            <div className="p-12 text-center text-xs text-slate-500 bg-white rounded-2xl border border-slate-200 shadow-sm">
              Carregando agendas de serviços programados...
            </div>
          ) : agendasFiltradas.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                <CalendarCheck className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-800">Nenhuma agenda encontrada</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Não há ciclos de agendas de serviços programados com os filtros selecionados.
              </p>
              {isAdminOrGestor && (
                <Link
                  href="/agendas/nova"
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-amber-500 text-slate-950 text-xs font-bold rounded-lg shadow-sm"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Abrir Primeira Agenda</span>
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {agendasFiltradas.map((ag) => {
                const isAberta = ag.status === 'ABERTA_COLETA';
                const isExecucao = ag.status === 'EM_EXECUCAO';
                const isRatificada = ag.status === 'RATIFICADA_REITORIA';

                return (
                  <div
                    key={ag.id}
                    className="bg-white rounded-2xl border border-slate-200 hover:border-amber-400/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
                  >
                    <div className="p-6 space-y-4">
                      {/* Status e Ano */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                          Exercício {ag.anoReferencia}
                        </span>

                        <span
                          className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                            isAberta
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : isExecucao
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : isRatificada
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {ag.status === 'ABERTA_COLETA'
                            ? '🟢 Coleta Aberta'
                            : ag.status === 'EM_CONSOLIDACAO_PROAD'
                            ? '⏳ Em Consolidação'
                            : ag.status === 'RATIFICADA_REITORIA'
                            ? '🏛️ Ratificada Reitoria'
                            : ag.status === 'EM_EXECUCAO'
                            ? '🚧 Em Execução'
                            : '🏁 Concluída'}
                        </span>
                      </div>

                      {/* Título e Descrição */}
                      <div>
                        <h3 className="text-base font-bold text-slate-900 group-hover:text-amber-600 transition-colors line-clamp-1">
                          {ag.titulo}
                        </h3>
                        {ag.descricao && (
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                            {ag.descricao}
                          </p>
                        )}
                      </div>

                      {/* Período de Coleta */}
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1 text-xs">
                        <div className="flex items-center justify-between text-slate-600">
                          <span className="flex items-center gap-1.5 font-medium">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>Período de Coleta:</span>
                          </span>
                          <span className="font-semibold text-slate-800">
                            {new Date(ag.periodoInicioColeta).toLocaleDateString('pt-BR')} a{' '}
                            {new Date(ag.periodoFimColeta).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </div>

                      {/* Grandezas Financeiras */}
                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 text-xs">
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase font-semibold">Teto Disponível</p>
                          <p className="font-bold text-slate-800">
                            R$ {Number(ag.valorTotalDisponivel).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase font-semibold">Cota / Unidade</p>
                          <p className="font-bold text-slate-800">
                            R$ {Number(ag.cotaPadraoUnidade).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>

                      {/* Demandas Coletadas */}
                      <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
                        <span>Demandas submetidas:</span>
                        <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-full">
                          {ag.totalDemandas} solicitação(ões)
                        </span>
                      </div>
                    </div>

                    {/* Botão de Ação */}
                    <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-500 font-medium">
                          {ag.demandasAprovadas} aprovadas
                        </span>
                        {isAdminOrGestor && (
                          <button
                            onClick={() => excluirAgenda(ag.id, ag.titulo)}
                            title="Excluir permanentemente esta agenda e limpar dados"
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <Link
                        href={`/agendas/${ag.id}`}
                        className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-amber-500 hover:text-slate-950 text-white text-xs font-bold rounded-lg transition-colors"
                      >
                        <span>Acessar Painel</span>
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
