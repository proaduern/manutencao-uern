'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import Link from 'next/link';
import {
  BarChart3,
  Calendar,
  Download,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  TrendingUp,
  FileSpreadsheet,
  FileCheck,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

export default function RelatoriosPage() {
  const [user, setUser] = useState<any>(null);
  const [dados, setDados] = useState<any>(null);
  const [carregando, setCarregando] = useState(true);

  const agora = new Date();
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString().slice(0, 10);
  const hoje = agora.toISOString().slice(0, 10);

  const [de, setDe] = useState(inicioMes);
  const [ate, setAte] = useState(hoje);
  const [por, setPor] = useState('unidade');
  const [ratingPor, setRatingPor] = useState('categoria');

  const carregarRelatorios = () => {
    setCarregando(true);
    const params = new URLSearchParams({ de, ate, por, rating: ratingPor });
    fetch(`/api/relatorios?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        setDados(data);
        setCarregando(false);
      })
      .catch(() => setCarregando(false));
  };

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setUser(data.user);
      });

    carregarRelatorios();
  }, [por, ratingPor]);

  const baixarCSV = () => {
    if (!dados?.tabelaAgrupada) return;

    const sep = ';';
    const cabecalho = [por, 'Chamados', 'Orçado (R$)', 'Executado (R$)', 'SLA %', 'Retrabalho', 'Nota Média', 'Avaliações'];
    const linhas = dados.tabelaAgrupada.map((g: any) => [
      g.grupo,
      g.chamados,
      g.previsto.toFixed(2),
      g.executado.toFixed(2),
      g.slaPct,
      g.retrabalho,
      g.notaMedia,
      g.avaliacoes,
    ]);

    const txt = [cabecalho.join(sep)]
      .concat(linhas.map((l: any) => l.join(sep)))
      .join('\r\n');

    const blob = new Blob(['\uFEFF' + txt], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `relatorio-manutencao-${por}-${de}-a-${ate}.csv`;
    a.click();
  };

  const ind = dados?.indicadores;
  const p = dados?.parecerRenovacao;

  return (
    <div className="min-h-screen flex bg-slate-50">
      <Sidebar role={user?.role || 'FISCAL_TECNICO'} />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar user={user || { nome: 'Carregando...', role: 'FISCAL_TECNICO' }} />

        <main className="flex-1 p-6 md:p-8 max-w-6xl w-full mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Relatórios & Inteligência Contratual
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Indicadores de SLA, retrabalho, divergência financeira, satisfação dos demandantes e parecer algorítmico de renovação.
              </p>
            </div>

            <button
              onClick={baixarCSV}
              disabled={carregando || !dados?.tabelaAgrupada?.length}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Exportar Dados (CSV)</span>
            </button>
          </div>

          {/* Banner de Destaque: Módulo de Execução e Prestação de Contas TCE */}
          <div className="bg-gradient-to-r from-[#003366] via-blue-900 to-indigo-900 rounded-xl p-5 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-blue-800">
            <div className="space-y-1.5 max-w-2xl">
              <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[11px] font-semibold tracking-wide border border-amber-400/30">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Auditoria & Prestação de Contas (TCE-RN / Controladoria)</span>
              </div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Relatórios Detalhados de Execução por Qualquer Período
              </h2>
              <p className="text-xs text-blue-100 leading-relaxed">
                Controle integral dos 3 Eixos: <strong>Eixo I (Insumos)</strong> com fotos antes/depois e notas fiscais; <strong>Eixo II (Serviços Eventuais)</strong> com composições detalhadas; e <strong>Eixo III (Mão de Obra Residente)</strong> com apropriação horária e diárias de deslocamento. Planilhas-resumo por Unidade/Setor, exportação em CSV e impressão em PDF oficial.
              </p>
            </div>
            <Link
              href="/relatorios/execucao"
              className="shrink-0 inline-flex items-center space-x-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg shadow-md hover:shadow-lg transition-all"
            >
              <FileCheck className="w-4 h-4" />
              <span>Acessar Módulo de Auditoria</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Barra de Filtros */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center space-x-1.5">
              <span className="text-slate-500 font-semibold">De:</span>
              <input
                type="date"
                value={de}
                onChange={(e) => setDe(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded"
              />
            </div>

            <div className="flex items-center space-x-1.5">
              <span className="text-slate-500 font-semibold">Até:</span>
              <input
                type="date"
                value={ate}
                onChange={(e) => setAte(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded"
              />
            </div>

            <div className="flex items-center space-x-1.5">
              <span className="text-slate-500 font-semibold">Agrupar por:</span>
              <select
                value={por}
                onChange={(e) => setPor(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded font-medium"
              >
                <option value="unidade">Unidade Demandante</option>
                <option value="predio">Prédio / Bloco</option>
                <option value="categoria">Categoria de Serviço</option>
                <option value="funcionario">Profissional / Funcionário</option>
                <option value="nivel">Nível de Urgência</option>
                <option value="status">Status</option>
              </select>
            </div>

            <button
              onClick={carregarRelatorios}
              className="px-4 py-1.5 bg-[#003366] hover:bg-[#002244] text-white font-semibold rounded shadow-sm"
            >
              Gerar Relatório
            </button>
          </div>

          {carregando ? (
            <div className="text-center py-12 text-xs text-slate-400">Processando métricas e parecer...</div>
          ) : (
            <>
              {/* Cards de Métricas Consolidadas */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
                  Consolidado do Período ({new Date(de).toLocaleDateString('pt-BR')} a {new Date(ate).toLocaleDateString('pt-BR')})
                </h2>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-slate-400 block font-medium">Chamados no Período</span>
                    <span className="text-xl font-bold text-slate-900 mt-1 block">{ind?.totalChamados}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-slate-400 block font-medium">Orçado Total</span>
                    <span className="text-lg font-bold text-slate-900 mt-1 block font-mono">
                      R$ {ind?.somaPrevisto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-slate-400 block font-medium">Executado Total</span>
                    <span className="text-lg font-bold text-slate-900 mt-1 block font-mono">
                      R$ {ind?.somaExecutado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-slate-400 block font-medium">Divergência Financeira</span>
                    <span
                      className={`text-lg font-bold mt-1 block font-mono ${
                        ind?.divergencia > 0 ? 'text-rose-600' : 'text-emerald-700'
                      }`}
                    >
                      R$ {ind?.divergencia.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs pt-1">
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                    <span className="text-emerald-700 block font-medium">SLA Cumprido</span>
                    <span className="text-xl font-bold text-emerald-800 mt-1 block">{ind?.slaPct}%</span>
                  </div>
                  <div className="p-3 bg-rose-50 rounded-xl border border-rose-200">
                    <span className="text-rose-700 block font-medium">Taxa de Retrabalho</span>
                    <span className="text-xl font-bold text-rose-800 mt-1 block">{ind?.retrabalhoPct}%</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-slate-400 block font-medium">Horas Trabalhadas</span>
                    <span className="text-xl font-bold text-slate-800 mt-1 block">{ind?.somaHoras.toFixed(1)} h</span>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                    <span className="text-amber-800 block font-medium">Emergências</span>
                    <span className="text-xl font-bold text-amber-900 mt-1 block">{ind?.totalEmergencias}</span>
                  </div>
                </div>
              </div>

              {/* Satisfação Real vs Tácita */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Satisfação dos Usuários Demandantes
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    A média real considera apenas avaliações expressas. A média com tácitas inclui homologações automáticas por decurso de 5 dias (nota 4).
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-blue-900 block">Média Real (Expressa)</span>
                      <span className="text-2xl font-bold text-blue-900 mt-1 block">
                        {ind?.mediaReal || 'Sem dados'}
                      </span>
                      <span className="text-[11px] text-blue-700">{ind?.nReal} avaliação(ões) direta(s)</span>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-[#003366]">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-slate-700 block">Média Total (Com Aceites Tácitos)</span>
                      <span className="text-2xl font-bold text-slate-800 mt-1 block">
                        {ind?.mediaTacita || 'Sem dados'}
                      </span>
                      <span className="text-[11px] text-slate-500">{ind?.nTacita} chamados avaliados no total</span>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-700">
                      <Clock className="w-5 h-5" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabela Agrupada */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Detalhamento por {por.toUpperCase()}
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-semibold">
                        <th className="py-2.5 px-3">{por.toUpperCase()}</th>
                        <th className="py-2.5 px-3 text-center">Chamados</th>
                        <th className="py-2.5 px-3 text-right">Orçado</th>
                        <th className="py-2.5 px-3 text-right">Executado</th>
                        <th className="py-2.5 px-3 text-center">SLA %</th>
                        <th className="py-2.5 px-3 text-center">Retrabalho</th>
                        <th className="py-2.5 px-3 text-center">Nota Média</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {dados?.tabelaAgrupada.map((item: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50/60">
                          <td className="py-3 px-3 font-semibold text-slate-800">{item.grupo}</td>
                          <td className="py-3 px-3 text-center font-mono">{item.chamados}</td>
                          <td className="py-3 px-3 text-right font-mono">
                            R$ {item.previsto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-medium text-slate-900">
                            R$ {item.executado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-3 text-center font-semibold text-emerald-700">{item.slaPct}</td>
                          <td className="py-3 px-3 text-center font-mono text-rose-600">{item.retrabalho}</td>
                          <td className="py-3 px-3 text-center font-semibold text-slate-800">
                            {item.notaMedia} {item.avaliacoes > 0 && <span className="text-[10px] text-slate-400">({item.avaliacoes})</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Parecer Formal de Renovação Contratual */}
              {p && (
                <div
                  className={`p-6 rounded-2xl border shadow-sm space-y-3 ${
                    p.vereditoClasse === 'bom'
                      ? 'bg-emerald-50/60 border-emerald-300'
                      : p.vereditoClasse === 'grave'
                      ? 'bg-rose-50/60 border-rose-300'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    {p.vereditoClasse === 'bom' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-amber-600" />
                    )}
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                      Parecer Algorítmico de Renovação Contratual (12 Meses Móveis)
                    </h3>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    Veredito: <strong className="text-slate-900">{p.veredito}</strong> &bull; Média acumulada:{' '}
                    <strong>{p.notaMedia || '—'}</strong> ({p.avaliacoes} avaliações reais) &bull; Mínimo exigido em edital:{' '}
                    <strong>{p.minimoExigido.toFixed(2)}</strong>.
                  </p>
                  <p className="text-[11px] text-slate-400">
                    O parecer é gerado por algoritmo com base nas notas registradas pelas unidades e serve de subsídio para a decisão da Pró-Reitoria de Administração.
                  </p>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
