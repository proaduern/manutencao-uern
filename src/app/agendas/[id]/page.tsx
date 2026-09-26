'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import {
  CalendarCheck,
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Building2,
  DollarSign,
  PlusCircle,
  FileText,
  Printer,
  Send,
  ShieldCheck,
  Edit,
  Eye,
  Camera,
  Layers,
  ChevronRight,
  AlertCircle,
  Trash2,
  CheckSquare,
  Square,
  Filter,
  Settings2,
  Sliders,
} from 'lucide-react';

interface AgendaDetalhePageProps {
  params: { id: string };
}

export default function AgendaDetalhePage({ params }: AgendaDetalhePageProps) {
  const [user, setUser] = useState<any>(null);
  const [agenda, setAgenda] = useState<any>(null);
  const [cotasConsolidadas, setCotasConsolidadas] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [processandoAcao, setProcessandoAcao] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Aba ativa: DEMANDAS vs COTAS_UNIDADES
  const [abaAtiva, setAbaAtiva] = useState<'DEMANDAS' | 'COTAS_UNIDADES'>('DEMANDAS');

  // Gestão de Cotas em Lote e Individual (PROAD)
  const [selectedCotaIds, setSelectedCotaIds] = useState<string[]>([]);
  const [filtroCampusCotas, setFiltroCampusCotas] = useState('TODOS');
  const [loteCotaValor, setLoteCotaValor] = useState('25000.00');
  const [loteMaxDemandas, setLoteMaxDemandas] = useState('2');

  // Modal / Formulário de Lançamento de Demanda (Demandante)
  const [modalNovaDemanda, setModalNovaDemanda] = useState(false);
  const [sublocais, setSublocais] = useState<any[]>([]);
  const [ambientes, setAmbientes] = useState<any[]>([]);
  const [predios, setPredios] = useState<any[]>([]);

  // Form Demanda
  const [demandaTitulo, setDemandaTitulo] = useState('');
  const [demandaDescricao, setDemandaDescricao] = useState('');
  const [demandaJustificativa, setDemandaJustificativa] = useState('');
  const [demandaEstimativa, setDemandaEstimativa] = useState('');
  const [demandaPredioId, setDemandaPredioId] = useState('');
  const [demandaSublocalId, setDemandaSublocalId] = useState('');
  const [demandaAmbienteId, setDemandaAmbienteId] = useState('');
  const [demandaLocalizacao, setDemandaLocalizacao] = useState('');
  const [fotoAntesBase64, setFotoAntesBase64] = useState<string | null>(null);

  // Modal Editar Cota Unidade (PROAD)
  const [modalEditarCota, setModalEditarCota] = useState(false);
  const [unidadeSelecionadaId, setUnidadeSelecionadaId] = useState('');
  const [novoValorCota, setNovoValorCota] = useState('');
  const [novoMaxDemandas, setNovoMaxDemandas] = useState('2');

  // Modal Editar Dados da Agenda (PROAD)
  const [modalEditarAgenda, setModalEditarAgenda] = useState(false);
  const [editTitulo, setEditTitulo] = useState('');
  const [editDescricao, setEditDescricao] = useState('');
  const [editAnoReferencia, setEditAnoReferencia] = useState('');
  const [editPeriodoInicio, setEditPeriodoInicio] = useState('');
  const [editPeriodoFim, setEditPeriodoFim] = useState('');
  const [editValorTotal, setEditValorTotal] = useState('');
  const [editCotaPadrao, setEditCotaPadrao] = useState('');
  const [editMaxDemandas, setEditMaxDemandas] = useState('2');
  const [editStatus, setEditStatus] = useState('');

  const carregarDados = () => {
    setCarregando(true);
    Promise.all([
      fetch('/api/auth/me').then((res) => res.json()),
      fetch(`/api/agendas/${params.id}`).then((res) => res.json()),
    ])
      .then(([userData, agendaData]) => {
        if (userData.user) setUser(userData.user);
        if (agendaData.agenda) {
          setAgenda(agendaData.agenda);
          const ag = agendaData.agenda;
          setEditTitulo(ag.titulo || '');
          setEditDescricao(ag.descricao || '');
          setEditAnoReferencia(ag.anoReferencia?.toString() || '');
          setEditPeriodoInicio(ag.periodoInicioColeta ? new Date(ag.periodoInicioColeta).toISOString().split('T')[0] : '');
          setEditPeriodoFim(ag.periodoFimColeta ? new Date(ag.periodoFimColeta).toISOString().split('T')[0] : '');
          setEditValorTotal(ag.valorTotalDisponivel?.toString() || '');
          setEditCotaPadrao(ag.cotaPadraoUnidade?.toString() || '');
          setEditMaxDemandas(ag.maxDemandasPadrao?.toString() || '2');
          setEditStatus(ag.status || 'ABERTA_COLETA');
        }
        if (agendaData.cotasConsolidadas) setCotasConsolidadas(agendaData.cotasConsolidadas);
        setCarregando(false);
      })
      .catch((err) => {
        console.error(err);
        setErro('Erro de conexão ao carregar dados da agenda.');
        setCarregando(false);
      });
  };

  useEffect(() => {
    carregarDados();
  }, [params.id]);

  const excluirAgendaAtual = async () => {
    if (
      !confirm(
        `Tem certeza de que deseja excluir permanentemente esta agenda "${agenda.titulo}" e todas as suas demandas cadastradas?\n\nEsta ação limpará o banco de dados e não pode ser desfeita.`
      )
    ) {
      return;
    }

    try {
      setProcessandoAcao(true);
      const res = await fetch(`/api/agendas/${agenda.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao excluir agenda.');

      alert(data.mensagem || 'Agenda excluída com sucesso!');
      window.location.href = '/agendas';
    } catch (err: any) {
      alert(err.message);
      setProcessandoAcao(false);
    }
  };

  const excluirDemanda = async (demandaId: string, numero: number) => {
    if (!confirm(`Deseja excluir permanentemente a demanda #${numero.toString().padStart(3, '0')} desta agenda?`)) return;
    try {
      setProcessandoAcao(true);
      const res = await fetch(`/api/agendas/demandas/${demandaId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao excluir demanda.');
      alert(data.mensagem || 'Demanda excluída com sucesso.');
      carregarDados();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setProcessandoAcao(false);
    }
  };

  const handleSalvarEdicaoAgenda = async (e: React.FormEvent) => {
    e.preventDefault();
    await executarAcaoAgenda('EDITAR_AGENDA', {
      titulo: editTitulo,
      descricao: editDescricao,
      anoReferencia: parseInt(editAnoReferencia),
      periodoInicioColeta: editPeriodoInicio,
      periodoFimColeta: editPeriodoFim,
      valorTotalDisponivel: parseFloat(editValorTotal),
      cotaPadraoUnidade: parseFloat(editCotaPadrao),
      maxDemandasPadrao: parseInt(editMaxDemandas),
      status: editStatus,
    });
    setModalEditarAgenda(false);
  };

  // Carregar sublocais e ambientes quando abrir modal de nova demanda
  const abrirModalNovaDemanda = () => {
    setModalNovaDemanda(true);
    fetch('/api/unidades/sublocais')
      .then((res) => res.json())
      .then((data) => {
        if (data.sublocais) setSublocais(data.sublocais);
        if (data.tiposAmbientes) setAmbientes(data.tiposAmbientes);
        if (data.prediosDisponiveis) setPredios(data.prediosDisponiveis);
      })
      .catch(() => {});
  };

  const handleFotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFotoAntesBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const executarAcaoAgenda = async (acao: string, payload: any = {}) => {
    if (!confirm(`Confirmar ação: "${acao}"?`)) return;

    try {
      setProcessandoAcao(true);
      const res = await fetch(`/api/agendas/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao, ...payload }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao processar ação');

      alert(data.mensagem || 'Ação executada com sucesso!');
      carregarDados();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setProcessandoAcao(false);
    }
  };

  const handleSalvarDemanda = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setProcessandoAcao(true);

      const payload = {
        titulo: demandaTitulo,
        descricaoProblema: demandaDescricao,
        justificativa: demandaJustificativa,
        estimativaDemandante: demandaEstimativa ? parseFloat(demandaEstimativa) : null,
        predioId: demandaPredioId || null,
        sublocalId: demandaSublocalId || null,
        ambienteId: demandaAmbienteId || null,
        localizacaoDetalhada: demandaLocalizacao || null,
        fotosUrls: fotoAntesBase64 ? [fotoAntesBase64] : [],
      };

      const res = await fetch(`/api/agendas/${params.id}/demandas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao cadastrar demanda');

      alert(data.mensagem || 'Demanda cadastrada com sucesso!');
      setModalNovaDemanda(false);
      setDemandaTitulo('');
      setDemandaDescricao('');
      setDemandaJustificativa('');
      setDemandaEstimativa('');
      setFotoAntesBase64(null);
      carregarDados();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setProcessandoAcao(false);
    }
  };

  const handleSalvarCota = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unidadeSelecionadaId || !novoValorCota) return;

    await executarAcaoAgenda('ATUALIZAR_COTA_UNIDADE', {
      unidadeId: unidadeSelecionadaId,
      cotaValor: parseFloat(novoValorCota),
      maxDemandas: parseInt(novoMaxDemandas) || 2,
    });
    setModalEditarCota(false);
  };

  // Funções de Gestão de Cotas em Lote e Individual
  const toggleSelectCota = (id: string) => {
    setSelectedCotaIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const cotasFiltradas = cotasConsolidadas.filter(
    (c) => filtroCampusCotas === 'TODOS' || c.campus === filtroCampusCotas
  );

  const todosCotasFiltradasSelecionadas =
    cotasFiltradas.length > 0 &&
    cotasFiltradas.every((c) => selectedCotaIds.includes(c.unidadeId));

  const toggleSelectAllCotas = () => {
    if (todosCotasFiltradasSelecionadas) {
      const idsFiltrados = new Set(cotasFiltradas.map((c) => c.unidadeId));
      setSelectedCotaIds((prev) => prev.filter((id) => !idsFiltrados.has(id)));
    } else {
      const novos = new Set([...selectedCotaIds, ...cotasFiltradas.map((c) => c.unidadeId)]);
      setSelectedCotaIds(Array.from(novos));
    }
  };

  const executarIncluirCotasLote = async () => {
    if (selectedCotaIds.length === 0) {
      alert('Selecione ao menos uma unidade na tabela para atribuir cota em lote.');
      return;
    }
    await executarAcaoAgenda('INCLUIR_COTAS_LOTE', {
      unidadesIds: selectedCotaIds,
      cotaValor: parseFloat(loteCotaValor),
      maxDemandas: parseInt(loteMaxDemandas) || 2,
    });
    setSelectedCotaIds([]);
  };

  const executarExcluirCotasLote = async () => {
    if (selectedCotaIds.length === 0) {
      alert('Selecione ao menos uma unidade para excluir do limite específico.');
      return;
    }
    if (
      !confirm(
        `Deseja realmente excluir ${selectedCotaIds.length} unidade(s) do limite específico de cota e enquadrá-las no Saldo Geral do Contrato?`
      )
    ) {
      return;
    }
    await executarAcaoAgenda('EXCLUIR_COTAS_LOTE', {
      unidadesIds: selectedCotaIds,
    });
    setSelectedCotaIds([]);
  };

  const excluirCotaIndividual = async (unidadeId: string, unidadeNome: string) => {
    if (
      !confirm(
        `Deseja retirar a unidade "${unidadeNome}" do limite de cota exclusiva?\nEla passará a ter demandas autorizadas sob o Saldo Geral do Contrato.`
      )
    ) {
      return;
    }
    await executarAcaoAgenda('EXCLUIR_COTA_UNIDADE', { unidadeId });
  };

  const incluirCotaRapidaIndividual = async (unidadeId: string) => {
    await executarAcaoAgenda('ATUALIZAR_COTA_UNIDADE', {
      unidadeId,
      cotaValor: 25000,
      maxDemandas: 2,
    });
  };

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-xs text-slate-500">
        Carregando detalhes da agenda de serviços...
      </div>
    );
  }

  if (!agenda) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-xs text-rose-500">
        Agenda não encontrada.
      </div>
    );
  }

  const isAdminOrGestor = user?.role === 'ADMIN' || user?.role === 'GESTOR_CONTRATO';
  const isFiscal = user?.role === 'FISCAL_TECNICO' || user?.role === 'FISCAL_ADM';
  const isDemandante = user?.role === 'DEMANDANTE';
  const isEmpresa = user?.role === 'EMPRESA';

  const minhaCota = cotasConsolidadas.find((c) => c.unidadeId === user?.unidadeId);
  const totalEstimado = agenda.demandas.reduce((acc: number, d: any) => {
    const val = d.proposta?.valorFinalHomologado
      ? parseFloat(d.proposta.valorFinalHomologado.toString())
      : d.proposta?.valorTotalProposto
      ? parseFloat(d.proposta.valorTotalProposto.toString())
      : d.estimativaDemandante
      ? parseFloat(d.estimativaDemandante.toString())
      : 0;
    return acc + val;
  }, 0);

  const saldoDisponivel = Math.max(0, parseFloat(agenda.valorTotalDisponivel.toString()) - totalEstimado);
  const unidadesEleitas = cotasConsolidadas.filter((c) => !c.usaSaldoGeral && c.cotaValor > 0).length;
  const unidadesSaldoGeral = cotasConsolidadas.length - unidadesEleitas;

  return (
    <div className="min-h-screen flex bg-slate-50">
      <Sidebar role={user?.role} />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar user={user} />

        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* Voltar e Status */}
          <div className="flex items-center justify-between">
            <Link
              href="/agendas"
              className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar para Lista de Agendas</span>
            </Link>

            <span className="text-xs font-mono font-bold text-slate-500 bg-slate-200/80 px-3 py-1 rounded-full">
              Exercício {agenda.anoReferencia}
            </span>
          </div>

          {/* Cabeçalho da Agenda */}
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                    Ciclo de Serviços Programados
                  </span>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs text-slate-500 font-medium">
                    Período de Coleta: {new Date(agenda.periodoInicioColeta).toLocaleDateString('pt-BR')} a{' '}
                    {new Date(agenda.periodoFimColeta).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <CalendarCheck className="w-6 h-6 text-amber-500" />
                  <span>{agenda.titulo}</span>
                </h1>
                {agenda.descricao && (
                  <p className="text-xs text-slate-500 leading-relaxed max-w-3xl">
                    {agenda.descricao}
                  </p>
                )}
              </div>

              <div className="flex flex-col items-end gap-2">
                <span
                  className={`text-xs font-bold px-3 py-1.5 rounded-full border ${
                    agenda.status === 'ABERTA_COLETA'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : agenda.status === 'EM_CONSOLIDACAO_PROAD'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : agenda.status === 'RATIFICADA_REITORIA'
                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                      : agenda.status === 'EM_EXECUCAO'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  {agenda.status === 'ABERTA_COLETA'
                    ? '🟢 Período de Coleta Aberto'
                    : agenda.status === 'EM_CONSOLIDACAO_PROAD'
                    ? '⏳ Em Consolidação na PROAD'
                    : agenda.status === 'RATIFICADA_REITORIA'
                    ? '🏛️ Ratificada pelo Gabinete da Reitoria'
                    : agenda.status === 'EM_EXECUCAO'
                    ? '🚧 Em Execução pela Contratada'
                    : '🏁 Concluída'}
                </span>

                {agenda.dataRatificacaoReitoria && (
                  <span className="text-[11px] text-purple-700 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Ratificada em {new Date(agenda.dataRatificacaoReitoria).toLocaleDateString('pt-BR')}</span>
                  </span>
                )}
              </div>
            </div>

            {/* BARRA DE AÇÕES DE GOVERNANÇA (PROAD) */}
            {isAdminOrGestor && (
              <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center gap-3">
                {/* 1. Botão Exportar PDF */}
                <a
                  href={`/api/agendas/${agenda.id}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg transition-colors border border-slate-300"
                >
                  <Printer className="w-4 h-4 text-slate-600" />
                  <span>Exportar Relatório Consolidado (PDF / Reitoria)</span>
                </a>

                {/* 2. Botão com o nome exato solicitado: "Registrar Ratificação do Gabinete da Reitoria" */}
                {agenda.status !== 'RATIFICADA_REITORIA' && agenda.status !== 'EM_EXECUCAO' && agenda.status !== 'CONCLUIDA' && (
                  <button
                    onClick={() => executarAcaoAgenda('REGISTRAR_RATIFICACAO_REITORIA')}
                    disabled={processandoAcao}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors"
                  >
                    <ShieldCheck className="w-4 h-4 text-purple-200" />
                    <span>Registrar Ratificação do Gabinete da Reitoria</span>
                  </button>
                )}

                {/* 3. Encaminhar para Empresa em Lote (dispara 15 dias úteis) */}
                {(agenda.status === 'RATIFICADA_REITORIA' || agenda.status === 'EM_CONSOLIDACAO_PROAD') && (
                  <button
                    onClick={() => executarAcaoAgenda('ENCAMINHAR_EMPRESA_LOTE')}
                    disabled={processandoAcao}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors"
                  >
                    <Send className="w-4 h-4 text-blue-200" />
                    <span>Encaminhar Demandas Aprovadas para a Contratada (Lote)</span>
                  </button>
                )}

                {/* 4. Editar Cotas */}
                <button
                  onClick={() => setAbaAtiva('COTAS_UNIDADES')}
                  className={`inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border transition-colors ${
                    abaAtiva === 'COTAS_UNIDADES'
                      ? 'bg-[#003366] text-white border-[#003366] shadow-sm'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  <Building2 className={`w-3.5 h-3.5 ${abaAtiva === 'COTAS_UNIDADES' ? 'text-amber-400' : 'text-slate-500'}`} />
                  <span>Gerenciar Cotas das Unidades ({unidadesEleitas}/{cotasConsolidadas.length})</span>
                </button>

                {/* 5. Editar Agenda */}
                <button
                  onClick={() => setModalEditarAgenda(true)}
                  className="inline-flex items-center space-x-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold rounded-lg border border-amber-200 transition-colors"
                >
                  <Edit className="w-3.5 h-3.5 text-amber-600" />
                  <span>Editar Parâmetros da Agenda</span>
                </button>

                {/* 6. Excluir Agenda */}
                <button
                  onClick={excluirAgendaAtual}
                  disabled={processandoAcao}
                  className="inline-flex items-center space-x-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-lg border border-rose-200 transition-colors ml-auto"
                  title="Excluir esta agenda e limpar seus dados do sistema"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Excluir Agenda</span>
                </button>
              </div>
            )}
          </div>

          {/* Cards de Métricas Financeiras e Demandas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Teto Global da Agenda</p>
                <p className="text-xl font-bold text-slate-900 mt-1">
                  R$ {Number(agenda.valorTotalDisponivel).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">Rubrica Serviços Eventuais</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Demandado / Homologado</p>
                <p className="text-xl font-bold text-amber-600 mt-1">
                  R$ {totalEstimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[11px] text-amber-600 mt-1 font-medium">{agenda.demandas.length} demanda(s) coletada(s)</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Saldo Remanescente</p>
                <p className="text-xl font-bold text-emerald-600 mt-1">
                  R$ {saldoDisponivel.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[11px] text-emerald-600 mt-1 font-medium">Disponível para novas demandas</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Governança de Unidades</p>
                <p className="text-xl font-bold text-slate-900 mt-1">
                  {unidadesEleitas} / {cotasConsolidadas.length}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  {unidadesEleitas} com cota exclusiva | {unidadesSaldoGeral} em Saldo Geral
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Card Especial da Unidade Demandante */}
          {isDemandante && minhaCota && (
            <div className="bg-white p-6 rounded-2xl border-2 border-indigo-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-indigo-900 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                    Sua Unidade: {minhaCota.unidadeNome}
                  </span>
                  {minhaCota.usaSaldoGeral ? (
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                      Regime: Saldo Geral do Contrato (Serviços Eventuais)
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Cota Exclusiva da Agenda: R$ {minhaCota.cotaValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-4 text-xs pt-1">
                  <span>
                    Saldo Disponível para Atendimento:{' '}
                    <strong className="text-emerald-700 font-mono font-bold">
                      R$ {minhaCota.saldoDisponivel.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </strong>
                  </span>
                  <span>•</span>
                  <span>
                    {minhaCota.usaSaldoGeral ? (
                      <span className="text-slate-600 font-medium">
                        Demandas cadastradas: <strong className="text-slate-900 font-bold">{minhaCota.demandasCadastradas}</strong> (sem teto restritivo de cota)
                      </span>
                    ) : (
                      <span>
                        Demandas Restantes:{' '}
                        <strong className="text-indigo-900 font-bold">
                          {minhaCota.demandasRestantes} de {minhaCota.maxDemandas}
                        </strong>
                      </span>
                    )}
                  </span>
                  {!minhaCota.usaSaldoGeral && (
                    <span className="text-[11px] text-amber-700 font-medium">
                      * Demandas que excederem o valor da cota poderão ser autorizadas pela PROAD via saldo global do contrato.
                    </span>
                  )}
                </div>
              </div>

              {agenda.status === 'ABERTA_COLETA' && (minhaCota.usaSaldoGeral || minhaCota.demandasRestantes > 0) && (
                <button
                  onClick={abrirModalNovaDemanda}
                  className="inline-flex items-center space-x-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-lg shadow-sm transition-colors shrink-0"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Lançar Nova Demanda</span>
                </button>
              )}
            </div>
          )}

          {/* SELETOR DE ABAS (DEMANDAS vs GESTÃO DE COTAS) */}
          {isAdminOrGestor && (
            <div className="flex items-center space-x-2 border-b border-slate-200 text-xs font-bold pt-2">
              <button
                type="button"
                onClick={() => setAbaAtiva('DEMANDAS')}
                className={`pb-3 px-4 flex items-center space-x-2 border-b-2 transition-colors ${
                  abaAtiva === 'DEMANDAS'
                    ? 'border-[#003366] text-[#003366]'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Demandas Registradas ({agenda.demandas.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setAbaAtiva('COTAS_UNIDADES')}
                className={`pb-3 px-4 flex items-center space-x-2 border-b-2 transition-colors ${
                  abaAtiva === 'COTAS_UNIDADES'
                    ? 'border-[#003366] text-[#003366]'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>Gestão de Cotas por Unidade ({cotasConsolidadas.length})</span>
                <span className="ml-1 text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">
                  {unidadesEleitas} com cota exclusiva
                </span>
              </button>
            </div>
          )}

          {/* TABELA DE DEMANDAS SUBMETIDAS NESTA AGENDA */}
          {(!isAdminOrGestor || abaAtiva === 'DEMANDAS') && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4">
            <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Demandas Registradas ({agenda.demandas.length})
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Relação de intervenções e serviços programados no âmbito desta agenda.
                </p>
              </div>

              {/* Botão de lançar demanda para gestor/admin em nome da unidade */}
              {isAdminOrGestor && agenda.status === 'ABERTA_COLETA' && (
                <button
                  onClick={abrirModalNovaDemanda}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>+ Cadastrar Demanda</span>
                </button>
              )}
            </div>

            {agenda.demandas.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500 space-y-2">
                <p>Nenhuma demanda cadastrada para este ciclo até o momento.</p>
                {isDemandante && agenda.status === 'ABERTA_COLETA' && (
                  <button
                    onClick={abrirModalNovaDemanda}
                    className="text-amber-600 font-bold hover:underline"
                  >
                    Clique aqui para lançar a primeira demanda da sua unidade
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4 w-12 text-center">Nº</th>
                      <th className="py-3 px-4">Unidade / Campus</th>
                      <th className="py-3 px-4">Localização / Sublocal</th>
                      <th className="py-3 px-4">Título & Descrição</th>
                      <th className="py-3 px-4">Valor Estimado / Homologado</th>
                      <th className="py-3 px-4">Status & Prazos (Dias Úteis)</th>
                      <th className="py-3 px-4 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {agenda.demandas.map((d: any) => {
                      const valHomologado = d.proposta?.valorFinalHomologado
                        ? parseFloat(d.proposta.valorFinalHomologado.toString())
                        : d.proposta?.valorTotalProposto
                        ? parseFloat(d.proposta.valorTotalProposto.toString())
                        : d.estimativaDemandante
                        ? parseFloat(d.estimativaDemandante.toString())
                        : 0;

                      return (
                        <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4 text-center font-mono font-bold text-slate-500">
                            #{d.numero.toString().padStart(3, '0')}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-slate-900 block">{d.unidade.nome}</span>
                            <span className="text-[11px] text-slate-500">{d.unidade.campus}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-medium text-slate-800 block">
                              {d.predio ? d.predio.nome : 'Sede Principal'}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              {d.sublocal ? d.sublocal.nome : (d.localizacaoDetalhada || 'Ambiente Geral')}
                            </span>
                          </td>
                          <td className="py-3 px-4 max-w-xs">
                            <span className="font-bold text-slate-900 block line-clamp-1">{d.titulo}</span>
                            <span className="text-[11px] text-slate-500 line-clamp-2">{d.descricaoProblema}</span>
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                            R$ {valHomologado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                              {d.status}
                            </span>

                            {/* Regime de Atendimento da Demanda */}
                            {(() => {
                              const cotaU = cotasConsolidadas.find((c) => c.unidadeId === d.unidadeId);
                              if (cotaU?.usaSaldoGeral) {
                                return (
                                  <span className="block text-[10px] text-blue-700 mt-1 font-semibold">
                                    • Saldo Geral do Contrato
                                  </span>
                                );
                              }
                              if (cotaU && valHomologado > cotaU.cotaValor) {
                                return (
                                  <span className="block text-[10px] text-amber-700 mt-1 font-semibold" title="Valor excede cota exclusiva da unidade, respaldado no Saldo Global do Contrato">
                                    ⚠ Excede cota da unidade (Saldo Global)
                                  </span>
                                );
                              }
                              return null;
                            })()}

                            {/* Prazos em Dias Úteis */}
                            {d.status === 'ENVIADA_EMPRESA' && d.prazoLimiteProposta && (
                              <span className="block text-[10px] text-blue-700 mt-1 font-medium">
                                Proposta até: {new Date(d.prazoLimiteProposta).toLocaleDateString('pt-BR')} (15 dias úteis)
                              </span>
                            )}
                            {d.status === 'EM_EXECUCAO' && d.dataLimiteExecucao && (
                              <span className="block text-[10px] text-amber-700 mt-1 font-medium">
                                Execução até: {new Date(d.dataLimiteExecucao).toLocaleDateString('pt-BR')}
                              </span>
                            )}
                            {d.status === 'AGUARDANDO_ACEITE_UNIDADE' && d.prazoLimiteAceite && (
                              <span className="block text-[10px] text-purple-700 mt-1 font-medium">
                                Aceite até: {new Date(d.prazoLimiteAceite).toLocaleDateString('pt-BR')} (5 dias úteis)
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center space-x-2">
                              <Link
                                href={`/agendas/${agenda.id}/demandas/${d.id}`}
                                className="inline-flex items-center space-x-1 px-3 py-1.5 bg-slate-900 hover:bg-amber-500 hover:text-slate-950 text-white text-xs font-semibold rounded-lg transition-colors"
                              >
                                <span>Detalhes</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </Link>
                              {(isAdminOrGestor || (isDemandante && d.usuarioDemandanteId === user?.id && d.status === 'SUBMETIDA')) && (
                                <button
                                  onClick={() => excluirDemanda(d.id, d.numeroDemanda)}
                                  disabled={processandoAcao}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                  title="Excluir esta demanda da agenda"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* ABA 2: GESTÃO DE COTAS POR UNIDADE (PROAD / ADMIN)                        */}
        {/* ========================================================================= */}
        {isAdminOrGestor && abaAtiva === 'COTAS_UNIDADES' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Settings2 className="w-5 h-5 text-amber-500" />
                  <span>Governança de Cotas & Limites Específicos por Unidade</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Selecione unidades <strong>individualmente</strong> ou <strong>em lote via checkboxes</strong> para incluir ou excluir limites específicos de cota e quantidade de demandas.
                </p>
              </div>

              {/* Filtro de Campus */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-semibold flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <span>Campus:</span>
                </span>
                <select
                  value={filtroCampusCotas}
                  onChange={(e) => setFiltroCampusCotas(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium"
                >
                  <option value="TODOS">Todos os Campi ({cotasConsolidadas.length})</option>
                  {Array.from(new Set(cotasConsolidadas.map((c) => c.campus))).filter(Boolean).map((campusNome) => (
                    <option key={campusNome} value={campusNome}>
                      {campusNome}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* BARRA DE AÇÕES EM LOTE PARA UNIDADES SELECIONADAS */}
            <div
              className={`p-4 rounded-xl border transition-all ${
                selectedCotaIds.length > 0
                  ? 'bg-amber-500/10 border-amber-300 shadow-sm'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleSelectAllCotas}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-bold rounded-lg shadow-xs"
                  >
                    {todosCotasFiltradasSelecionadas ? (
                      <>
                        <CheckSquare className="w-4 h-4 text-[#003366]" />
                        <span>Desmarcar Todas ({cotasFiltradas.length})</span>
                      </>
                    ) : (
                      <>
                        <Square className="w-4 h-4 text-slate-400" />
                        <span>Selecionar Todas ({cotasFiltradas.length})</span>
                      </>
                    )}
                  </button>

                  <span className="text-xs font-semibold text-slate-700">
                    {selectedCotaIds.length > 0 ? (
                      <span className="text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full font-bold">
                        {selectedCotaIds.length} unidade(s) selecionada(s)
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">
                        Marque os checkboxes para aplicar inclusão ou exclusão de cotas em lote
                      </span>
                    )}
                  </span>
                </div>

                {/* Inputs e Botões em Lote */}
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
                    onClick={executarIncluirCotasLote}
                    disabled={selectedCotaIds.length === 0 || processandoAcao}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1 transition-colors"
                    title="Atribuir cota específica e limite de demandas a todas as unidades selecionadas"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Incluir sob Cota Específica (Lote)</span>
                  </button>

                  <button
                    type="button"
                    onClick={executarExcluirCotasLote}
                    disabled={selectedCotaIds.length === 0 || processandoAcao}
                    className="px-3 py-1.5 bg-slate-700 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1 transition-colors"
                    title="Excluir o limite de cota das unidades selecionadas e retorná-las ao Saldo Geral do Contrato"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Excluir da Cota / Saldo Geral (Lote)</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Tabela de Cotas por Unidade */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={todosCotasFiltradasSelecionadas}
                        onChange={toggleSelectAllCotas}
                        className="rounded border-slate-300 text-[#003366] focus:ring-amber-500 cursor-pointer"
                      />
                    </th>
                    <th className="py-2.5 px-3">Unidade Demandante</th>
                    <th className="py-2.5 px-3">Campus</th>
                    <th className="py-2.5 px-3">Regime Aplicado</th>
                    <th className="py-2.5 px-3">Cota da Agenda</th>
                    <th className="py-2.5 px-3">Limite Demandas</th>
                    <th className="py-2.5 px-3">Demandas Cadastradas</th>
                    <th className="py-2.5 px-3">Saldo Disponível</th>
                    <th className="py-2.5 px-3 text-right">Ações Individuais</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {cotasFiltradas.map((c) => {
                    const isSelected = selectedCotaIds.includes(c.unidadeId);

                    return (
                      <tr
                        key={c.unidadeId}
                        className={`transition-colors ${
                          isSelected
                            ? 'bg-amber-100/50'
                            : c.usaSaldoGeral
                            ? 'hover:bg-slate-50/70'
                            : 'bg-emerald-50/30 hover:bg-emerald-50/60'
                        }`}
                      >
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectCota(c.unidadeId)}
                            className="rounded border-slate-300 text-[#003366] focus:ring-amber-500 cursor-pointer"
                          />
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          <div>{c.unidadeNome}</div>
                          <span className="text-[10px] font-mono text-slate-500">{c.sigla}</span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">{c.campus}</td>
                        <td className="py-2.5 px-3">
                          {c.usaSaldoGeral ? (
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              Saldo Geral do Contrato
                            </span>
                          ) : (
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Cota Exclusiva da Agenda
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                          {c.usaSaldoGeral ? (
                            <span className="text-slate-400 font-normal">Sem cota exclusiva</span>
                          ) : (
                            `R$ ${c.cotaValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          {c.usaSaldoGeral ? (
                            <span className="text-slate-400">Sem teto</span>
                          ) : (
                            <span className="font-semibold text-slate-700">{c.maxDemandas} demandas</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-semibold text-slate-900">{c.demandasCadastradas}</span>
                          {c.totalGasto > 0 && (
                            <span className="text-[10px] text-slate-500 block font-mono">
                              (R$ {c.totalGasto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} gasto)
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">
                          R$ {c.saldoDisponivel.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3 text-right space-x-1.5 whitespace-nowrap">
                          {c.usaSaldoGeral ? (
                            <>
                              <button
                                type="button"
                                onClick={() => incluirCotaRapidaIndividual(c.unidadeId)}
                                disabled={processandoAcao}
                                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-[10px] font-bold border border-emerald-200 transition-colors"
                                title="Incluir cota padrão de R$ 25.000,00 e 2 demandas para esta unidade"
                              >
                                + Incluir Cota R$ 25k (2)
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setUnidadeSelecionadaId(c.unidadeId);
                                  setNovoValorCota('25000.00');
                                  setNovoMaxDemandas('2');
                                  setModalEditarCota(true);
                                }}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-semibold border border-slate-300 transition-colors"
                              >
                                Personalizar
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setUnidadeSelecionadaId(c.unidadeId);
                                  setNovoValorCota(c.cotaValor.toString());
                                  setNovoMaxDemandas(c.maxDemandas.toString());
                                  setModalEditarCota(true);
                                }}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-semibold border border-slate-300 transition-colors"
                                title="Editar o valor ou o limite de demandas desta unidade"
                              >
                                Editar Cota
                              </button>
                              <button
                                type="button"
                                onClick={() => excluirCotaIndividual(c.unidadeId, c.unidadeNome)}
                                disabled={processandoAcao}
                                className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-[10px] font-bold border border-rose-200 transition-colors"
                                title="Retirar a unidade da cota da agenda e retorná-la ao Saldo Geral do Contrato"
                              >
                                ✕ Excluir da Cota
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
        </main>
      </div>

      {/* MODAL: LANÇAR DEMANDA NA AGENDA (DEMANDANTE / PROAD) */}
      {modalNovaDemanda && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-xl border border-slate-200 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Lançar Demanda para {agenda.titulo}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Descreva a necessidade da intervenção para avaliação e composição orçamentária SINAPI.
                </p>
              </div>
              <button
                onClick={() => setModalNovaDemanda(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSalvarDemanda} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Título Resumido da Demanda *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Reforma da Coberta e Pintura do Bloco Acadêmico II"
                  value={demandaTitulo}
                  onChange={(e) => setDemandaTitulo(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Prédio Vinculado</label>
                  <select
                    value={demandaPredioId}
                    onChange={(e) => setDemandaPredioId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  >
                    <option value="">Selecione o prédio...</option>
                    {predios.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nome} ({p.campus})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Sublocal / Subprédio</label>
                  <select
                    value={demandaSublocalId}
                    onChange={(e) => setDemandaSublocalId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  >
                    <option value="">Selecione o sublocal cadastrado...</option>
                    {sublocais.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nome} {s.predio ? `(${s.predio.nome})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Descrição Detalhada do Problema / Necessidade *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Relate minuciosamente o estado atual, materiais danificados e área aproximada..."
                  value={demandaDescricao}
                  onChange={(e) => setDemandaDescricao(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Justificativa da Demanda *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Indique a relevância institucional, prejuízo à comunidade acadêmica se não realizado..."
                  value={demandaJustificativa}
                  onChange={(e) => setDemandaJustificativa(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Estimativa Preliminar da Unidade (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Ex: 12000.00 (opcional)"
                    value={demandaEstimativa}
                    onChange={(e) => setDemandaEstimativa(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 font-mono font-bold"
                  />
                  {minhaCota && (
                    <span className="text-[10px] text-slate-500">
                      Saldo da cota da unidade: R$ {minhaCota.saldoDisponivel.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Foto Comprobatória Inicial (ANTES)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFotoUpload}
                      className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                    />
                  </div>
                  {fotoAntesBase64 && (
                    <p className="text-[10px] text-emerald-600 font-semibold mt-1">✓ Fotografia anexada</p>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalNovaDemanda(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-900 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={processandoAcao}
                  className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg shadow-sm"
                >
                  {processandoAcao ? 'Gravando Demanda...' : 'Submeter Demanda'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR COTA DE UNIDADE (PROAD) */}
      {modalEditarCota && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-5 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Ajustar Cota Específica de Unidade</h3>
              <button onClick={() => setModalEditarCota(false)} className="text-slate-400 font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleSalvarCota} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Selecione a Unidade Demandante</label>
                <select
                  required
                  value={unidadeSelecionadaId}
                  onChange={(e) => {
                    setUnidadeSelecionadaId(e.target.value);
                    const sel = cotasConsolidadas.find((c) => c.unidadeId === e.target.value);
                    if (sel) {
                      setNovoValorCota(sel.cotaValor.toString());
                      setNovoMaxDemandas(sel.maxDemandas.toString());
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium"
                >
                  <option value="">Selecione a unidade...</option>
                  {cotasConsolidadas.map((c) => (
                    <option key={c.unidadeId} value={c.unidadeId}>
                      {c.unidadeNome} ({c.sigla}) - {c.usaSaldoGeral ? 'Saldo Geral do Contrato' : `Cota: R$ ${c.cotaValor.toFixed(2)} (${c.maxDemandas} dem.)`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setNovoValorCota('0.00');
                    setNovoMaxDemandas('0');
                  }}
                  className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-[11px] font-semibold border border-blue-200"
                >
                  Definir Saldo Geral (0,00 / 0)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNovoValorCota('25000.00');
                    setNovoMaxDemandas('2');
                  }}
                  className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded text-[11px] font-semibold border border-amber-200"
                >
                  Cota R$ 25k (2 dem.)
                </button>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Valor da Cota da Agenda (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={novoValorCota}
                  onChange={(e) => setNovoValorCota(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold"
                />
                <p className="text-[10px] text-slate-500">
                  Informe 0.00 para que a unidade opere sob o Saldo Geral do Contrato (Serviços Eventuais).
                </p>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Quantidade de Demandas Permitidas</label>
                <input
                  type="number"
                  min="0"
                  max="20"
                  required
                  value={novoMaxDemandas}
                  onChange={(e) => setNovoMaxDemandas(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
                <p className="text-[10px] text-slate-500">
                  Informe 0 caso a unidade esteja sob o Saldo Geral (sem teto restritivo de cota).
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalEditarCota(false)}
                  className="px-3 py-1.5 text-slate-600 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={processandoAcao}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg shadow-sm"
                >
                  Salvar Cota
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR DADOS E PARÂMETROS DA AGENDA (PROAD) */}
      {modalEditarAgenda && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-xl border border-slate-200 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Editar Parâmetros da Agenda</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Atualize título, prazos de coleta, teto orçamentário ou status do ciclo.
                </p>
              </div>
              <button onClick={() => setModalEditarAgenda(false)} className="text-slate-400 hover:text-slate-600 font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleSalvarEdicaoAgenda} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Título do Ciclo / Agenda *</label>
                <input
                  type="text"
                  required
                  value={editTitulo}
                  onChange={(e) => setEditTitulo(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Descrição / Instruções aos Demandantes</label>
                <textarea
                  rows={2}
                  value={editDescricao}
                  onChange={(e) => setEditDescricao(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Ano de Exercício</label>
                  <input
                    type="number"
                    required
                    value={editAnoReferencia}
                    onChange={(e) => setEditAnoReferencia(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Início da Coleta</label>
                  <input
                    type="date"
                    required
                    value={editPeriodoInicio}
                    onChange={(e) => setEditPeriodoInicio(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Término da Coleta</label>
                  <input
                    type="date"
                    required
                    value={editPeriodoFim}
                    onChange={(e) => setEditPeriodoFim(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Teto Global da Agenda (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editValorTotal}
                    onChange={(e) => setEditValorTotal(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Cota Padrão / Unidade (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editCotaPadrao}
                    onChange={(e) => setEditCotaPadrao(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Máx. Demandas / Unidade</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    required
                    value={editMaxDemandas}
                    onChange={(e) => setEditMaxDemandas(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Status do Ciclo</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800"
                >
                  <option value="ABERTA_COLETA">ABERTA_COLETA (Coleta Aberta aos Demandantes)</option>
                  <option value="EM_CONSOLIDACAO_PROAD">EM_CONSOLIDACAO_PROAD (Análise / Consolidação PROAD)</option>
                  <option value="RATIFICADA_REITORIA">RATIFICADA_REITORIA (Ratificada pelo Gabinete da Reitoria)</option>
                  <option value="ENVIADA_EMPRESA">ENVIADA_EMPRESA (Enviada à Contratada para Orçamentação)</option>
                  <option value="EM_EXECUCAO">EM_EXECUCAO (Em Execução dos Serviços)</option>
                  <option value="CONCLUIDA">CONCLUIDA (Ciclo Concluído)</option>
                  <option value="SUSPENSA">SUSPENSA (Temporariamente Suspensa)</option>
                  <option value="CANCELADA">CANCELADA (Cancelada)</option>
                </select>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalEditarAgenda(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-900 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={processandoAcao}
                  className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg shadow-sm"
                >
                  {processandoAcao ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
