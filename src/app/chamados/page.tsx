'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import {
  Wrench,
  Search,
  PlusCircle,
  Clock,
  Building,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Filter,
} from 'lucide-react';
import Link from 'next/link';

export default function ChamadosPage() {
  const [user, setUser] = useState<any>(null);
  const [chamados, setChamados] = useState<any[]>([]);
  const [predios, setPredios] = useState<any[]>([]);
  const [unidades, setUnidades] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);

  // Filtros
  const [busca, setBusca] = useState('');
  const [statusFiltro, setStatusFiltro] = useState('');
  const [unidadeFiltro, setUnidadeFiltro] = useState('');
  const [predioAba, setPredioAba] = useState('TODOS');
  const [ordem, setOrdem] = useState('urgencia');

  useEffect(() => {
    // Carregar usuário logado
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setUser(data.user);
      });

    // Carregar catálogos de apoio
    fetch('/api/catalogos')
      .then((res) => res.json())
      .then((data) => {
        if (data.predios) setPredios(data.predios);
        if (data.unidades) setUnidades(data.unidades);
      });
  }, []);

  const carregarChamados = () => {
    setCarregando(true);
    const params = new URLSearchParams();
    if (busca) params.set('busca', busca);
    if (statusFiltro) params.set('status', statusFiltro);
    if (unidadeFiltro) params.set('unidade', unidadeFiltro);
    if (predioAba) params.set('predio', predioAba);
    params.set('ordem', ordem);

    fetch(`/api/chamados?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        setChamados(data.chamados || []);
        setCarregando(false);
      })
      .catch(() => setCarregando(false));
  };

  useEffect(() => {
    carregarChamados();
  }, [busca, statusFiltro, unidadeFiltro, predioAba, ordem]);

  const isEmpresa = user?.role === 'EMPRESA';
  const isDemandante = user?.role === 'DEMANDANTE';

  return (
    <div className="min-h-screen flex bg-slate-50">
      <Sidebar role={user?.role || 'DEMANDANTE'} />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar user={user || { nome: 'Carregando...', role: 'DEMANDANTE' }} />

        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                {isDemandante ? 'Chamados da sua Unidade' : isEmpresa ? 'Fila de Atendimento da Empresa' : 'Gestão de Chamados'}
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Acompanhamento em tempo real de chamados, prazos de atendimento (SLA), orçamentos e vistorias.
              </p>
            </div>

            {(isDemandante || user?.role === 'ADMIN' || user?.role === 'FISCAL_SETORIAL') && (
              <Link
                href="/chamados/novo"
                className="inline-flex items-center space-x-2 px-4 py-2.5 bg-[#003366] hover:bg-[#002244] text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
              >
                <PlusCircle className="w-4 h-4 text-amber-400" />
                <span>Abrir Chamado</span>
              </Link>
            )}
          </div>

          {/* Abas por Prédio para a Empresa (Modelo Legado) */}
          {isEmpresa && (
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 border-b border-slate-200">
              <button
                onClick={() => setPredioAba('TODOS')}
                className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap flex items-center space-x-2 ${
                  predioAba === 'TODOS'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <span>Todos os Prédios</span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/20 text-white font-mono">
                  {chamados.length}
                </span>
              </button>

              {predios.map((p) => {
                const count = chamados.filter((c) => c.predioId === p.id).length;
                return (
                  <button
                    key={p.id}
                    onClick={() => setPredioAba(p.id)}
                    className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap flex items-center space-x-2 ${
                      predioAba === p.id
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    <span>{p.nome.split('-')[0].trim()}</span>
                    {count > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-200 text-slate-700 font-mono">
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Barra de Filtros e Ordenação */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Buscar por nº, descrição, local, serviço ou campus..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#003366]"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <select
                value={statusFiltro}
                onChange={(e) => setStatusFiltro(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#003366]"
              >
                <option value="">Todos os Status</option>
                <option value="ABERTO">Aberto</option>
                <option value="RECEBIDO">Recebido</option>
                <option value="EM_ORCAMENTO">Em Orçamento</option>
                <option value="AGUARDANDO_AUTORIZACAO">Aguardando Autorização</option>
                <option value="BLOQUEADO_SEM_SALDO">Bloqueado sem Saldo</option>
                <option value="AUTORIZADO">Autorizado</option>
                <option value="EM_EXECUCAO">Em Execução</option>
                <option value="ATENDIDO">Aguardando Validação</option>
                <option value="DEVOLVIDO">Devolvido (Retrabalho)</option>
                <option value="EM_GARANTIA">Em Garantia</option>
                <option value="CONCLUIDO">Concluído</option>
              </select>

              {!isDemandante && (
                <select
                  value={unidadeFiltro}
                  onChange={(e) => setUnidadeFiltro(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#003366]"
                >
                  <option value="">Todas as Unidades</option>
                  {unidades.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nome}
                    </option>
                  ))}
                </select>
              )}

              <select
                value={ordem}
                onChange={(e) => setOrdem(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#003366]"
              >
                <option value="urgencia">Ordenar por Urgência</option>
                <option value="prazo">Ordenar por Prazo (SLA)</option>
                <option value="abertura">Mais Recentes Primeiro</option>
                <option value="tipo">Ordenar por Tipo de Serviço</option>
              </select>
            </div>
          </div>

          {/* Lista de Chamados */}
          {carregando ? (
            <div className="text-center py-12 text-xs text-slate-400">Carregando chamados...</div>
          ) : chamados.length === 0 ? (
            <div className="bg-white p-12 rounded-xl border border-slate-200 text-center space-y-2">
              <p className="text-sm font-semibold text-slate-700">Nenhum chamado encontrado.</p>
              <p className="text-xs text-slate-400">Tente ajustar os filtros ou abra um novo chamado.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {chamados.map((c) => {
                // Classes de SLA fiéis ao modelo legado
                const borderSlaClass =
                  c.prazoClasse === 'vencido'
                    ? 'border-l-4 border-l-rose-600'
                    : c.prazoClasse === 'apertado'
                    ? 'border-l-4 border-l-amber-500'
                    : c.prazoClasse === 'folgado'
                    ? 'border-l-4 border-l-emerald-600'
                    : 'border-l-4 border-l-slate-300';

                return (
                  <Link
                    key={c.id}
                    href={`/chamados/${c.id}`}
                    className={`block bg-white p-5 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all ${borderSlaClass}`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                          <span className="text-xs font-mono font-bold text-slate-500">
                            #{c.numero.toString().padStart(4, '0')}
                          </span>
                          <span className="text-sm font-bold text-slate-900">
                            {c.tipoServico?.nome || c.titulo}
                          </span>
                          {c.nivelCodigo ? (
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                c.nivelCodigo === 'EMERGENCIA' || c.nivelCodigo.includes('MAXIMA')
                                  ? 'bg-rose-100 text-rose-800 border-rose-200'
                                  : c.nivelCodigo === 'URGENTE'
                                  ? 'bg-amber-100 text-amber-800 border-amber-200'
                                  : c.nivelCodigo === 'NORMAL'
                                  ? 'bg-sky-100 text-sky-800 border-sky-200'
                                  : c.nivelCodigo === 'PROGRAMADO'
                                  ? 'bg-purple-100 text-purple-800 border-purple-200'
                                  : 'bg-slate-100 text-slate-700 border-slate-200'
                              }`}
                            >
                              {c.nivelCodigo}
                            </span>
                          ) : c.fraseUrgencia?.frase ? (
                            <span className="text-[11px] text-indigo-700 font-medium bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                              {c.fraseUrgencia.frase}
                            </span>
                          ) : null}
                        </div>

                        <p className="text-xs text-slate-600">
                          <span className="font-semibold text-slate-700">{c.unidade?.nome}</span> &bull;{' '}
                          {c.tipoAmbiente?.nome} &bull; {c.setorEspecifico}
                        </p>

                        <div className="flex items-center space-x-2 pt-1 flex-wrap gap-y-1">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
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

                          {c.prazoTexto && (
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                                c.prazoClasse === 'vencido'
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : c.prazoClasse === 'apertado'
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              }`}
                            >
                              {c.prazoTexto}
                            </span>
                          )}

                          {!c.temFotoAntes && (
                            <span className="px-2 py-0.5 rounded text-[11px] font-semibold text-rose-600 bg-rose-50 border border-rose-200">
                              Foto do antes pendente
                            </span>
                          )}

                          {c.status === 'ATENDIDO' && (
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold text-purple-700 bg-purple-50 border border-purple-200">
                              Aguarda sua validação
                            </span>
                          )}

                          {c.execucaoEmergencial && (
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200">
                              Execução emergencial
                            </span>
                          )}

                          {c.totalPrevisto && (
                            <span className="text-xs font-mono font-medium text-slate-500">
                              Orçado: R$ {parseFloat(c.totalPrevisto).toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right text-[11px] text-slate-400 shrink-0 self-start md:self-center">
                        Aberto em {new Date(c.abertoEm).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
