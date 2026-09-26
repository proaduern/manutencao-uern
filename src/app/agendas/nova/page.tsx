'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import {
  CalendarCheck,
  ArrowLeft,
  Building2,
  DollarSign,
  PlusCircle,
  AlertCircle,
  CheckCircle2,
  Save,
  CheckSquare,
  Square,
  Filter,
  Trash2,
  Layers,
  Settings2,
} from 'lucide-react';
import Link from 'next/link';

export default function NovaAgendaPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [unidades, setUnidades] = useState<any[]>([]);
  const [saldoEventuaisContrato, setSaldoEventuaisContrato] = useState<number | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Form State
  const [titulo, setTitulo] = useState('Agenda de Serviços Programados - Setembro/Outubro 2026');
  const [descricao, setDescricao] = useState(
    'Coleta de demandas prioritárias para execução programada de serviços eventuais nas unidades e campi da UERN.'
  );
  const [anoReferencia, setAnoReferencia] = useState(new Date().getFullYear().toString());
  const [periodoInicioColeta, setPeriodoInicioColeta] = useState(new Date().toISOString().split('T')[0]);
  const [periodoFimColeta, setPeriodoFimColeta] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [valorTotalDisponivel, setValorTotalDisponivel] = useState('150000.00');
  const [cotaPadraoUnidade, setCotaPadraoUnidade] = useState('25000.00');
  const [maxDemandasPadrao, setMaxDemandasPadrao] = useState('2');

  // Seleção e Controle de Cotas (Individual e em Lote)
  const [cotasPersonalizadas, setCotasPersonalizadas] = useState<Record<string, { cotaValor: string; maxDemandas: string }>>({});
  const [selectedUnidadeIds, setSelectedUnidadeIds] = useState<string[]>([]);
  const [loteCotaValor, setLoteCotaValor] = useState('25000.00');
  const [loteMaxDemandas, setLoteMaxDemandas] = useState('2');
  const [filtroCampus, setFiltroCampus] = useState('TODOS');

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then((res) => res.json()),
      fetch('/api/unidades').then((res) => res.json()),
      fetch('/api/contratos').then((res) => res.json()),
    ])
      .then(([userData, unidadesData, contratosData]) => {
        if (userData.user) setUser(userData.user);
        if (unidadesData.unidades) {
          setUnidades(unidadesData.unidades);
          // Inicializa todas as unidades no regime padrão de Saldo Geral (0,00 / 0) para que a PROAD eleja as desejadas
          const inicial: Record<string, { cotaValor: string; maxDemandas: string }> = {};
          unidadesData.unidades.forEach((u: any) => {
            inicial[u.id] = { cotaValor: '0.00', maxDemandas: '0' };
          });
          setCotasPersonalizadas(inicial);
        }

        // Obter saldo da rubrica de Serviços Eventuais
        if (contratosData.contratos && contratosData.contratos[0]) {
          const c = contratosData.contratos[0];
          fetch(`/api/contratos?id=${c.id}`)
            .then((r) => r.json())
            .then((detalhes) => {
              if (detalhes.rubricas?.servicosEventuais) {
                setSaldoEventuaisContrato(detalhes.rubricas.servicosEventuais.saldoDisponivel);
              }
            })
            .catch(() => {});
        }
      })
      .catch((err) => console.error(err));
  }, []);

  const handleCotaCustomChange = (unidadeId: string, campo: 'cotaValor' | 'maxDemandas', valor: string) => {
    setCotasPersonalizadas((prev) => ({
      ...prev,
      [unidadeId]: {
        cotaValor: campo === 'cotaValor' ? valor : prev[unidadeId]?.cotaValor || '0.00',
        maxDemandas: campo === 'maxDemandas' ? valor : prev[unidadeId]?.maxDemandas || '0',
      },
    }));
  };

  // Seleção individual (checkbox por linha)
  const toggleSelectUnidade = (id: string) => {
    setSelectedUnidadeIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Seleção em lote (todas ou filtradas por campus)
  const unidadesFiltradas = unidades.filter(
    (u) => filtroCampus === 'TODOS' || u.campus === filtroCampus
  );

  const todosFiltradosSelecionados =
    unidadesFiltradas.length > 0 &&
    unidadesFiltradas.every((u) => selectedUnidadeIds.includes(u.id));

  const toggleSelectAll = () => {
    if (todosFiltradosSelecionados) {
      const idsFiltrados = new Set(unidadesFiltradas.map((u) => u.id));
      setSelectedUnidadeIds((prev) => prev.filter((id) => !idsFiltrados.has(id)));
    } else {
      const novosIds = new Set([...selectedUnidadeIds, ...unidadesFiltradas.map((u) => u.id)]);
      setSelectedUnidadeIds(Array.from(novosIds));
    }
  };

  // Ação em lote: Atribuir/Incluir cota às selecionadas
  const aplicarCotaLote = () => {
    if (selectedUnidadeIds.length === 0) {
      alert('Selecione ao menos uma unidade na tabela para aplicar a cota em lote.');
      return;
    }
    setCotasPersonalizadas((prev) => {
      const next = { ...prev };
      selectedUnidadeIds.forEach((id) => {
        next[id] = { cotaValor: loteCotaValor, maxDemandas: loteMaxDemandas };
      });
      return next;
    });
  };

  // Ação em lote: Excluir da cota específica (voltar para Saldo Geral) às selecionadas
  const excluirCotaLote = () => {
    if (selectedUnidadeIds.length === 0) {
      alert('Selecione ao menos uma unidade na tabela para excluir da cota.');
      return;
    }
    setCotasPersonalizadas((prev) => {
      const next = { ...prev };
      selectedUnidadeIds.forEach((id) => {
        next[id] = { cotaValor: '0.00', maxDemandas: '0' };
      });
      return next;
    });
  };

  const aplicarATodas = (valor: string, max: string) => {
    const atualizado: Record<string, { cotaValor: string; maxDemandas: string }> = {};
    unidades.forEach((u) => {
      atualizado[u.id] = { cotaValor: valor, maxDemandas: max };
    });
    setCotasPersonalizadas(atualizado);
  };

  // Métricas de alocação em tempo real
  const totalAlocadoCotas = Object.values(cotasPersonalizadas).reduce((acc, v) => {
    const val = parseFloat(v.cotaValor) || 0;
    return acc + val;
  }, 0);

  const unidadesEleitas = Object.values(cotasPersonalizadas).filter((v) => (parseFloat(v.cotaValor) || 0) > 0).length;
  const unidadesSaldoGeral = unidades.length - unidadesEleitas;
  const saldoAgendaRestante = Math.max(0, (parseFloat(valorTotalDisponivel) || 0) - totalAlocadoCotas);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    const vTotal = parseFloat(valorTotalDisponivel);
    if (!vTotal || vTotal <= 0) {
      setErro('Informe um valor total disponível válido para a agenda.');
      return;
    }

    if (new Date(periodoFimColeta) <= new Date(periodoInicioColeta)) {
      setErro('A data de término da coleta deve ser posterior à data de início.');
      return;
    }

    try {
      setSalvando(true);

      const arrayPersonalizadas = unidades.map((u) => {
        const item = cotasPersonalizadas[u.id];
        return {
          unidadeId: u.id,
          cotaValor: item?.cotaValor ? parseFloat(item.cotaValor) : 0,
          maxDemandas: item?.maxDemandas ? parseInt(item.maxDemandas) : 0,
        };
      });

      const payload = {
        titulo,
        descricao,
        anoReferencia: parseInt(anoReferencia),
        periodoInicioColeta,
        periodoFimColeta,
        valorTotalDisponivel: vTotal,
        cotaPadraoUnidade: 0,
        maxDemandasPadrao: 0,
        cotasPersonalizadas: arrayPersonalizadas,
      };

      const res = await fetch('/api/agendas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao abrir agenda');

      alert(data.mensagem || 'Agenda aberta com sucesso!');
      router.push(`/agendas/${data.agenda.id}`);
    } catch (err: any) {
      setErro(err.message);
      setSalvando(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      <Sidebar role={user?.role} />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar user={user} />

        <main className="flex-1 p-6 md:p-8 max-w-5xl w-full mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <Link
              href="/agendas"
              className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar para Lista de Agendas</span>
            </Link>
          </div>

          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-8">
            <div className="border-b border-slate-200 pb-4">
              <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <CalendarCheck className="w-5 h-5 text-amber-500" />
                <span>Abertura de Nova Agenda de Serviços Programados</span>
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Atribua o valor da cota e o limite de demandas <strong>unidade por unidade</strong>. Unidades com cota e quantidade zeradas continuarão aptas a demandar via Saldo Geral do Contrato.
              </p>
            </div>

            {erro && (
              <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{erro}</span>
              </div>
            )}

            {/* Aviso de Saldo do Contrato */}
            {saldoEventuaisContrato !== null && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between text-xs text-blue-900">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-blue-600" />
                  <span>
                    Saldo Disponível na Rubrica <strong>Serviços Eventuais</strong> do Contrato Global:
                  </span>
                </div>
                <span className="font-mono font-bold text-sm text-blue-800">
                  R$ {saldoEventuaisContrato.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}

            {/* Seção 1: Identificação Básica */}
            <div className="space-y-4">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                1. Identificação do Ciclo
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Título da Agenda *</label>
                  <input
                    type="text"
                    required
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    placeholder="Ex: Agenda Programada Setembro/Outubro 2026"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Ano de Exercício *</label>
                  <input
                    type="number"
                    required
                    value={anoReferencia}
                    onChange={(e) => setAnoReferencia(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Descrição / Instruções aos Demandantes</label>
                <textarea
                  rows={2}
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Orientações e diretrizes para os demandantes sobre este ciclo..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 leading-relaxed"
                />
              </div>
            </div>

            {/* Seção 2: Prazos de Coleta e Teto Total */}
            <div className="space-y-4 pt-4 border-t border-slate-200">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                2. Período de Coleta & Teto Global da Agenda
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Início da Coleta *</label>
                  <input
                    type="date"
                    required
                    value={periodoInicioColeta}
                    onChange={(e) => setPeriodoInicioColeta(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Término da Coleta *</label>
                  <input
                    type="date"
                    required
                    value={periodoFimColeta}
                    onChange={(e) => setPeriodoFimColeta(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Teto Total da Agenda (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={valorTotalDisponivel}
                    onChange={(e) => setValorTotalDisponivel(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-mono font-bold"
                  />
                </div>
              </div>
            </div>

            {/* Seção 3: Atribuição de Cotas Unidade por Unidade */}
            <div className="space-y-4 pt-4 border-t border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Settings2 className="w-4 h-4 text-amber-500" />
                    <span>3. Seleção de Unidades & Limites Específicos de Cotas</span>
                  </h2>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Selecione as unidades <strong>individualmente (uma por uma)</strong> ou <strong>em lote via checkboxes</strong> para definir cota exclusiva e limite de demandas. As unidades não selecionadas ou com cota zerada continuarão aptas a demandar sob o <strong>Saldo Geral do Contrato</strong>.
                  </p>
                </div>

                {/* Filtro por Campus */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
                    <Filter className="w-3 h-3 text-slate-400" />
                    <span>Campus:</span>
                  </span>
                  <select
                    value={filtroCampus}
                    onChange={(e) => setFiltroCampus(e.target.value)}
                    className="px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium"
                  >
                    <option value="TODOS">Todos os Campi ({unidades.length})</option>
                    {Array.from(new Set(unidades.map((u) => u.campus))).filter(Boolean).map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* BARRA DE AÇÃO EM LOTE (Aparece quando houver unidades selecionadas) */}
              <div className={`p-4 rounded-xl border transition-all ${
                selectedUnidadeIds.length > 0
                  ? 'bg-amber-500/10 border-amber-300 shadow-sm'
                  : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-bold rounded-lg shadow-xs"
                    >
                      {todosFiltradosSelecionados ? (
                        <>
                          <CheckSquare className="w-4 h-4 text-[#003366]" />
                          <span>Desmarcar Todas ({unidadesFiltradas.length})</span>
                        </>
                      ) : (
                        <>
                          <Square className="w-4 h-4 text-slate-400" />
                          <span>Selecionar Todas ({unidadesFiltradas.length})</span>
                        </>
                      )}
                    </button>

                    <span className="text-xs font-semibold text-slate-700">
                      {selectedUnidadeIds.length > 0 ? (
                        <span className="text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full font-bold">
                          {selectedUnidadeIds.length} unidade(s) selecionada(s)
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">
                          Marque os checkboxes para aplicar ações em lote
                        </span>
                      )}
                    </span>
                  </div>

                  {/* Formulário em Lote */}
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-semibold text-slate-600">Cota (R$):</span>
                      <input
                        type="number"
                        step="0.01"
                        value={loteCotaValor}
                        onChange={(e) => setLoteCotaValor(e.target.value)}
                        placeholder="25000.00"
                        className="w-28 px-2 py-1 text-xs bg-white border border-slate-200 rounded font-mono font-bold"
                      />
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-semibold text-slate-600">Demandas:</span>
                      <input
                        type="number"
                        min="0"
                        max="20"
                        value={loteMaxDemandas}
                        onChange={(e) => setLoteMaxDemandas(e.target.value)}
                        placeholder="2"
                        className="w-16 px-2 py-1 text-xs bg-white border border-slate-200 rounded font-semibold text-center"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={aplicarCotaLote}
                      disabled={selectedUnidadeIds.length === 0}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1 transition-colors"
                      title="Incluir as unidades selecionadas sob cota exclusiva da agenda"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Incluir sob Cota Específica (Lote)</span>
                    </button>

                    <button
                      type="button"
                      onClick={excluirCotaLote}
                      disabled={selectedUnidadeIds.length === 0}
                      className="px-3 py-1.5 bg-slate-700 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1 transition-colors"
                      title="Excluir da cota da agenda e deixar sob Saldo Geral do Contrato"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Excluir da Cota / Saldo Geral (Lote)</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Painel de Métricas da Distribuição */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
                <div>
                  <p className="text-[10px] text-slate-500 font-semibold uppercase">Total em Cotas Exclusivas</p>
                  <p className="text-sm font-bold text-slate-900 font-mono mt-0.5">
                    R$ {totalAlocadoCotas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 font-semibold uppercase">Saldo Restante no Teto</p>
                  <p className="text-sm font-bold text-emerald-600 font-mono mt-0.5">
                    R$ {saldoAgendaRestante.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 font-semibold uppercase">Unidades com Cota Exclusiva</p>
                  <p className="text-sm font-bold text-amber-600 mt-0.5">
                    {unidadesEleitas} de {unidades.length}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 font-semibold uppercase">Unidades em Saldo Geral</p>
                  <p className="text-sm font-bold text-blue-600 mt-0.5">
                    {unidadesSaldoGeral} de {unidades.length}
                  </p>
                </div>
              </div>

              {/* Tabela Unidade por Unidade */}
              <div className="max-h-96 overflow-y-auto border border-slate-200 rounded-xl shadow-sm">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-semibold sticky top-0 border-b border-slate-200 z-10">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={todosFiltradosSelecionados}
                          onChange={toggleSelectAll}
                          className="rounded border-slate-300 text-[#003366] focus:ring-amber-500 cursor-pointer"
                          title="Selecionar / Desmarcar todas as visíveis"
                        />
                      </th>
                      <th className="py-2.5 px-3">Unidade Demandante</th>
                      <th className="py-2.5 px-3">Campus</th>
                      <th className="py-2.5 px-3">Regime da Unidade</th>
                      <th className="py-2.5 px-3">Cota Específica (R$)</th>
                      <th className="py-2.5 px-3">Qtd Demandas</th>
                      <th className="py-2.5 px-3 text-right">Controle Individual</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {unidadesFiltradas.map((u) => {
                      const custom = cotasPersonalizadas[u.id];
                      const valorNum = parseFloat(custom?.cotaValor || '0');
                      const maxNum = parseInt(custom?.maxDemandas || '0');
                      const isSaldoGeral = valorNum === 0 && maxNum === 0;
                      const isSelected = selectedUnidadeIds.includes(u.id);

                      return (
                        <tr
                          key={u.id}
                          className={`transition-colors ${
                            isSelected
                              ? 'bg-amber-100/50'
                              : isSaldoGeral
                              ? 'hover:bg-slate-50/70'
                              : 'bg-emerald-50/30 hover:bg-emerald-50/60'
                          }`}
                        >
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectUnidade(u.id)}
                              className="rounded border-slate-300 text-[#003366] focus:ring-amber-500 cursor-pointer"
                            />
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900">
                            <div>{u.nome}</div>
                            <span className="text-[10px] font-mono text-slate-500">{u.sigla}</span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">{u.campus}</td>
                          <td className="py-2.5 px-3">
                            {isSaldoGeral ? (
                              <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                Saldo Geral do Contrato
                              </span>
                            ) : (
                              <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Cota Exclusiva da Agenda
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              value={custom?.cotaValor ?? '0.00'}
                              onChange={(e) => handleCotaCustomChange(u.id, 'cotaValor', e.target.value)}
                              className={`w-36 px-2.5 py-1 text-xs border rounded-lg focus:ring-2 focus:ring-amber-500/20 font-mono font-bold ${
                                isSaldoGeral ? 'bg-slate-50 text-slate-400 border-slate-200' : 'bg-white text-emerald-800 border-emerald-300'
                              }`}
                            />
                          </td>
                          <td className="py-2.5 px-3">
                            <input
                              type="number"
                              min="0"
                              max="20"
                              placeholder="0"
                              value={custom?.maxDemandas ?? '0'}
                              onChange={(e) => handleCotaCustomChange(u.id, 'maxDemandas', e.target.value)}
                              className={`w-20 px-2.5 py-1 text-xs border rounded-lg focus:ring-2 focus:ring-amber-500/20 text-center font-semibold ${
                                isSaldoGeral ? 'bg-slate-50 text-slate-400 border-slate-200' : 'bg-white text-slate-900 border-emerald-300'
                              }`}
                            />
                          </td>
                          <td className="py-2.5 px-3 text-right space-x-1.5 whitespace-nowrap">
                            {isSaldoGeral ? (
                              <button
                                type="button"
                                onClick={() => {
                                  handleCotaCustomChange(u.id, 'cotaValor', '25000.00');
                                  handleCotaCustomChange(u.id, 'maxDemandas', '2');
                                }}
                                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-[10px] font-bold border border-emerald-200 transition-colors"
                                title="Incluir esta unidade sob cota de R$ 25.000,00 e 2 demandas"
                              >
                                + Incluir Cota R$ 25k (2)
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  handleCotaCustomChange(u.id, 'cotaValor', '0.00');
                                  handleCotaCustomChange(u.id, 'maxDemandas', '0');
                                }}
                                className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-[10px] font-bold border border-rose-200 transition-colors"
                                title="Excluir do limite de cota e retornar ao Saldo Geral"
                              >
                                ✕ Excluir da Cota (Saldo Geral)
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Ações */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
              <Link
                href="/agendas"
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                disabled={salvando}
                className="inline-flex items-center space-x-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-lg shadow-sm transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>{salvando ? 'Abrindo Agenda...' : 'Abrir Agenda de Serviços'}</span>
              </button>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}
