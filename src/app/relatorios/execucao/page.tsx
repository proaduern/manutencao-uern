'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import {
  FileText,
  Calendar,
  Download,
  Printer,
  Building2,
  DollarSign,
  Layers,
  HardHat,
  Package,
  Wrench,
  Camera,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Filter,
  ArrowLeft,
  ChevronRight,
  ExternalLink,
  Eye,
  FileCheck,
  ShieldAlert,
  HelpCircle,
  FileSpreadsheet,
} from 'lucide-react';
import Link from 'next/link';

export default function RelatoriosExecucaoPage() {
  const [user, setUser] = useState<any>(null);
  const [dados, setDados] = useState<any>(null);
  const [carregando, setCarregando] = useState(true);

  // Filtros
  const agora = new Date();
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString().slice(0, 10);
  const hoje = agora.toISOString().slice(0, 10);

  const [de, setDe] = useState(inicioMes);
  const [ate, setAte] = useState(hoje);
  const [unidadeId, setUnidadeId] = useState('TODAS');
  const [campus, setCampus] = useState('TODOS');
  const [abaAtiva, setAbaAtiva] = useState<'INSUMOS' | 'EVENTUAIS' | 'MAO_OBRA_FIXA' | 'RESUMO_GERAL'>('INSUMOS');

  // Modal para visualização ampliada de fotos
  const [fotoModal, setFotoModal] = useState<{ url: string; titulo: string; tipo: string } | null>(null);

  const carregarRelatorios = () => {
    setCarregando(true);
    const params = new URLSearchParams({
      tipo: 'TODOS',
      de,
      ate,
      unidadeId,
      campus,
    });

    fetch(`/api/relatorios/execucao?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        setDados(data);
        setCarregando(false);
      })
      .catch((err) => {
        console.error(err);
        setCarregando(false);
      });
  };

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setUser(data.user);
      });

    carregarRelatorios();
  }, []);

  // Atalhos de Período
  const aplicarPeriodo = (tipoPeriodo: 'MES_ATUAL' | 'MES_ANTERIOR' | 'ULTIMOS_90' | 'ANO_2026') => {
    const d = new Date();
    if (tipoPeriodo === 'MES_ATUAL') {
      const primeiro = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
      setDe(primeiro);
      setAte(hoje);
    } else if (tipoPeriodo === 'MES_ANTERIOR') {
      const primeiro = new Date(d.getFullYear(), d.getMonth() - 1, 1).toISOString().slice(0, 10);
      const ultimo = new Date(d.getFullYear(), d.getMonth(), 0).toISOString().slice(0, 10);
      setDe(primeiro);
      setAte(ultimo);
    } else if (tipoPeriodo === 'ULTIMOS_90') {
      const retro = new Date(d.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      setDe(retro);
      setAte(hoje);
    } else if (tipoPeriodo === 'ANO_2026') {
      setDe('2026-01-01');
      setAte('2026-12-31');
    }
  };

  // Exportar Planilha CSV Estruturada para Auditoria
  const exportarCSV = () => {
    if (!dados) return;
    const sep = ';';
    let linhas: any[] = [];
    let nomeArquivo = '';

    if (abaAtiva === 'INSUMOS') {
      nomeArquivo = `relatorio-insumos-executados-${de}-a-${ate}.csv`;
      linhas.push([
        'Mês/Ano Ref',
        'Código Insumo',
        'Descrição Insumo',
        'Unidade de Medida',
        'Quantidade',
        'Valor Unitário (R$)',
        'Valor Total (R$)',
        'Unidade Beneficiada',
        'Campus',
        'Setor / Local',
        'Prédio',
        'Processo / Chamado',
        'Descrição da Tarefa',
        'Qtd Fotos Antes',
        'Qtd Fotos Depois',
        'Qtd Comprovantes',
      ]);

      dados.eixoI_Insumos?.itens.forEach((it: any) => {
        linhas.push([
          it.mesAnoReferencia,
          it.codigoInsumo,
          `"${it.descricaoInsumo.replace(/"/g, '""')}"`,
          it.unidadeMedida,
          it.quantidade.toFixed(2),
          it.valorUnitario.toFixed(2),
          it.valorTotal.toFixed(2),
          `"${it.unidadeBeneficiadaNome}"`,
          it.campus,
          `"${it.setorBeneficiado}"`,
          `"${it.predioNome}"`,
          it.processoReferencia,
          `"${(it.descricaoTarefa || '').replace(/"/g, '""')}"`,
          it.fotosAntes.length,
          it.fotosDepois.length,
          it.comprovantesAquisicao.length,
        ]);
      });
    } else if (abaAtiva === 'EVENTUAIS') {
      nomeArquivo = `relatorio-servicos-eventuais-${de}-a-${ate}.csv`;
      linhas.push([
        'Mês/Ano Ref',
        'Origem',
        'Identificação do Serviço',
        'Unidade Beneficiada',
        'Campus',
        'Setor / Local',
        'Prédio',
        'Processo / Chamado',
        'Composição (Insumos + Mão de Obra)',
        'Custo Insumos (R$)',
        'Custo Mão de Obra (R$)',
        'Valor Total Executado (R$)',
        'Qtd Fotos Antes',
        'Qtd Fotos Depois',
      ]);

      dados.eixoII_ServicosEventuais?.itens.forEach((it: any) => {
        linhas.push([
          it.mesAnoReferencia,
          it.tipoOrigem,
          `"${it.identificacaoServico.replace(/"/g, '""')}"`,
          `"${it.unidadeBeneficiadaNome}"`,
          it.campus,
          `"${it.setorBeneficiado}"`,
          `"${it.predioNome}"`,
          it.processoReferencia,
          `"${(it.descricaoInsumos || '').replace(/"/g, '""')}"`,
          it.custoInsumos.toFixed(2),
          it.custoMaoObraEventual.toFixed(2),
          it.valorTotalServico.toFixed(2),
          it.fotosAntes.length,
          it.fotosDepois.length,
        ]);
      });
    } else if (abaAtiva === 'MAO_OBRA_FIXA') {
      nomeArquivo = `relatorio-mao-de-obra-fixa-${de}-a-${ate}.csv`;
      linhas.push([
        'Mês/Ano Ref',
        'Identificação da Tarefa',
        'Unidade Beneficiada',
        'Campus',
        'Setor / Local',
        'Prédio',
        'Processo / Chamado',
        'Insumos Associados',
        'Horas Estimadas (h)',
        'Deslocamento?',
        'Dias Deslocamento',
        'Diárias (R$)',
        'Trabalhador(es) Alocado(s)',
        'Cargo',
        'Custo Proporcional Apropriado (R$)',
        'Qtd Fotos Antes',
        'Qtd Fotos Depois',
      ]);

      dados.eixoIII_MaoObraFixa?.itens.forEach((it: any) => {
        linhas.push([
          it.mesAnoReferencia,
          `"${it.identificacaoServico.replace(/"/g, '""')}"`,
          `"${it.unidadeBeneficiadaNome}"`,
          it.campus,
          `"${it.setorBeneficiado}"`,
          `"${it.predioNome}"`,
          it.processoReferencia,
          `"${(it.descricaoInsumos || '').replace(/"/g, '""')}"`,
          it.tempoExecucaoHoras.toFixed(1),
          it.houveDeslocamento ? 'SIM' : 'NÃO',
          it.diasDeslocamento,
          it.valorTotalDiarias.toFixed(2),
          `"${it.nomeCompletoTrabalhador}"`,
          `"${it.cargoTrabalhador}"`,
          it.custoMaoObraApropriado.toFixed(2),
          it.fotosAntes.length,
          it.fotosDepois.length,
        ]);
      });
    } else {
      // RESUMO GERAL
      nomeArquivo = `resumo-prestacao-contas-${de}-a-${ate}.csv`;
      linhas.push([
        'Unidade Demandante',
        'Campus',
        'Insumos Executados (R$)',
        'Serviços Eventuais (R$)',
        'Mão de Obra Fixa Apropriada (R$)',
        'Total Consolidado (R$)',
      ]);

      const todasUnidades = dados.unidadesDisponiveis || [];
      todasUnidades.forEach((u: any) => {
        const ins = dados.eixoI_Insumos?.planilhaResumo.find((r: any) => r.sigla === u.sigla)?.valorTotal || 0;
        const eve = dados.eixoII_ServicosEventuais?.planilhaResumo.find((r: any) => r.sigla === u.sigla)?.valorTotal || 0;
        const mo = dados.eixoIII_MaoObraFixa?.planilhaResumo.find((r: any) => r.sigla === u.sigla)?.custoApropriadoMaoObra || 0;
        const tot = ins + eve + mo;
        if (tot > 0) {
          linhas.push([
            `"${u.nome}"`,
            u.campus,
            ins.toFixed(2),
            eve.toFixed(2),
            mo.toFixed(2),
            tot.toFixed(2),
          ]);
        }
      });
    }

    const txt = linhas.map((l) => l.join(sep)).join('\r\n');
    const blob = new Blob(['\uFEFF' + txt], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = nomeArquivo;
    a.click();
  };

  const totais = dados?.totaisConsolidados;

  return (
    <div className="min-h-screen flex bg-slate-50">
      <Sidebar role={user?.role} />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar user={user} />

        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* TOPO: IDENTIFICAÇÃO INSTITUCIONAL & BOTÕES DE EXPORTAÇÃO */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
            <div>
              <div className="flex items-center space-x-2">
                <Link
                  href="/relatorios"
                  className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-900"
                >
                  <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                  Voltar para Indicadores
                </Link>
                <span className="text-slate-300">•</span>
                <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                  Módulo de Prestação de Contas & Auditoria
                </span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1 flex items-center gap-2">
                <FileCheck className="w-6 h-6 text-[#003366]" />
                <span>Relatórios de Execução Contratual (UERN / Auditoria / TCE)</span>
              </h1>
              <p className="text-xs text-slate-500 mt-1 max-w-3xl leading-relaxed">
                Relatórios analíticos por recorte temporal contendo quantitativos, valores, setores beneficiados, demonstrativo fotográfico pareado (Antes/Depois) e comprovantes de aquisição.
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 print:hidden">
              <button
                onClick={exportarCSV}
                disabled={carregando || !dados}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg shadow-sm transition-colors disabled:opacity-50"
                title="Exportar dados da aba atual em formato compatível com Excel e TCE"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Exportar Planilha (CSV)</span>
              </button>

              <button
                onClick={() => window.print()}
                disabled={carregando || !dados}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-sm transition-colors disabled:opacity-50"
                title="Imprimir relatório oficial formatado para auditoria e prestação de contas"
              >
                <Printer className="w-4 h-4 text-slate-300" />
                <span>Imprimir / Salvar PDF</span>
              </button>
            </div>
          </div>

          {/* BARRA DE FILTROS AVANÇADOS POR PERÍODO */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 print:hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Filter className="w-4 h-4 text-amber-500" />
                <span>Recorte Temporal & Filtros Setoriais</span>
              </span>

              {/* Botões de Atalho Rápido */}
              <div className="flex items-center gap-1.5 text-[11px]">
                <span className="text-slate-400 mr-1 hidden sm:inline">Atalhos:</span>
                <button
                  type="button"
                  onClick={() => aplicarPeriodo('MES_ATUAL')}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded"
                >
                  Mês Atual
                </button>
                <button
                  type="button"
                  onClick={() => aplicarPeriodo('MES_ANTERIOR')}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded"
                >
                  Mês Anterior
                </button>
                <button
                  type="button"
                  onClick={() => aplicarPeriodo('ULTIMOS_90')}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded"
                >
                  Últimos 90 Dias
                </button>
                <button
                  type="button"
                  onClick={() => aplicarPeriodo('ANO_2026')}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded"
                >
                  Exercício 2026
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Data Inicial (De):</label>
                <input
                  type="date"
                  value={de}
                  onChange={(e) => setDe(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Data Final (Até):</label>
                <input
                  type="date"
                  value={ate}
                  onChange={(e) => setAte(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Campus Universitário:</label>
                <select
                  value={campus}
                  onChange={(e) => {
                    setCampus(e.target.value);
                    setUnidadeId('TODAS');
                  }}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                >
                  <option value="TODOS">Todos os Campi</option>
                  {dados?.campiDisponiveis?.map((c: string) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Unidade Demandante:</label>
                <select
                  value={unidadeId}
                  onChange={(e) => setUnidadeId(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                >
                  <option value="TODAS">Todas as Unidades</option>
                  {dados?.unidadesDisponiveis
                    ?.filter((u: any) => campus === 'TODOS' || u.campus === campus)
                    .map((u: any) => (
                      <option key={u.id} value={u.id}>
                        {u.nome} ({u.sigla})
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={carregarRelatorios}
                  className="w-full px-4 py-2 bg-[#003366] hover:bg-[#002244] text-white font-bold rounded-lg shadow-sm transition-colors text-xs flex items-center justify-center space-x-1.5"
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>Atualizar Relatório</span>
                </button>
              </div>
            </div>
          </div>

          {/* CABEÇALHO EXCLUSIVO PARA IMPRESSÃO (PDF / ÓRGÃOS DE CONTROLE) */}
          <div className="hidden print:block border-b-2 border-slate-900 pb-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-900 tracking-wider">UNIVERSIDADE DO ESTADO DO RIO GRANDE DO NORTE - UERN</p>
                <p className="text-[11px] text-slate-700 font-semibold">PRÓ-REITORIA DE ADMINISTRAÇÃO - PROAD</p>
                <p className="text-[10px] text-slate-500">Diretoria de Manutenção e Obras Prediais / Fiscalização Contratual</p>
              </div>
              <div className="text-right text-[10px] text-slate-500">
                <p><strong>Emissão:</strong> {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}</p>
                <p><strong>Recorte de Período:</strong> {new Date(de).toLocaleDateString('pt-BR')} a {new Date(ate).toLocaleDateString('pt-BR')}</p>
              </div>
            </div>
            <h2 className="text-base font-bold text-slate-900 text-center mt-3 uppercase tracking-wide">
              Relatório Circunstanciado de Execução e Prestação de Contas
            </h2>
            {dados?.contratoReferencia && (
              <p className="text-[11px] text-center text-slate-600 mt-0.5">
                Contrato de Referência: <strong>Nº {dados.contratoReferencia.numero}/{dados.contratoReferencia.ano}</strong> - Objeto: {dados.contratoReferencia.objeto}
              </p>
            )}
          </div>

          {carregando ? (
            <div className="py-24 text-center space-y-3">
              <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-500 font-medium">Consolidando registros, itens executados e demonstrativos fotográficos...</p>
            </div>
          ) : (
            <>
              {/* GRANDES NÚMEROS DO PERÍODO */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                      I - Insumos Executados
                    </span>
                    <span className="text-xl font-bold text-slate-900 mt-1 block font-mono">
                      R$ {totais?.totalInsumos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-[11px] text-slate-500 mt-0.5 block">
                      {totais?.contagemInsumos} item(ns) aplicados
                    </span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                    <Package className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                      II - Serviços Eventuais
                    </span>
                    <span className="text-xl font-bold text-amber-600 mt-1 block font-mono">
                      R$ {totais?.totalServicosEventuais.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-[11px] text-amber-700 mt-0.5 block font-medium">
                      {totais?.contagemServicosEventuais} intervenções / agendas
                    </span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                    <Wrench className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                      III - Mão de Obra Fixa
                    </span>
                    <span className="text-xl font-bold text-purple-700 mt-1 block font-mono">
                      R$ {totais?.totalMaoObraFixaApropriada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-[11px] text-purple-700 mt-0.5 block font-medium">
                      {totais?.contagemTarefasMOFixa} tarefas realizadas
                    </span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                    <HardHat className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Total Geral no Período
                    </span>
                    <span className="text-xl font-bold text-emerald-700 mt-1 block font-mono">
                      R$ {totais?.totalGeralExecutado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-[11px] text-emerald-700 mt-0.5 block font-medium">
                      {totais?.totalDiariasDeslocamento > 0 && `(Inclui R$ ${totais.totalDiariasDeslocamento.toFixed(2)} em diárias)`}
                    </span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* NAVEGAÇÃO POR ABAS DOS 3 EIXOS */}
              <div className="border-b border-slate-200 flex space-x-1 text-xs font-semibold print:hidden">
                <button
                  onClick={() => setAbaAtiva('INSUMOS')}
                  className={`pb-3 px-4 flex items-center space-x-2 border-b-2 transition-colors ${
                    abaAtiva === 'INSUMOS'
                      ? 'border-[#003366] text-[#003366]'
                      : 'border-transparent text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Package className="w-4 h-4" />
                  <span>I. Insumos Executados ({dados?.eixoI_Insumos?.itens.length || 0})</span>
                </button>

                <button
                  onClick={() => setAbaAtiva('EVENTUAIS')}
                  className={`pb-3 px-4 flex items-center space-x-2 border-b-2 transition-colors ${
                    abaAtiva === 'EVENTUAIS'
                      ? 'border-[#003366] text-[#003366]'
                      : 'border-transparent text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Wrench className="w-4 h-4" />
                  <span>II. Serviços Eventuais ({dados?.eixoII_ServicosEventuais?.itens.length || 0})</span>
                </button>

                <button
                  onClick={() => setAbaAtiva('MAO_OBRA_FIXA')}
                  className={`pb-3 px-4 flex items-center space-x-2 border-b-2 transition-colors ${
                    abaAtiva === 'MAO_OBRA_FIXA'
                      ? 'border-[#003366] text-[#003366]'
                      : 'border-transparent text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <HardHat className="w-4 h-4" />
                  <span>III. Mão de Obra Fixa ({dados?.eixoIII_MaoObraFixa?.itens.length || 0})</span>
                </button>

                <button
                  onClick={() => setAbaAtiva('RESUMO_GERAL')}
                  className={`pb-3 px-4 flex items-center space-x-2 border-b-2 transition-colors ${
                    abaAtiva === 'RESUMO_GERAL'
                      ? 'border-[#003366] text-[#003366]'
                      : 'border-transparent text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  <span>Planilha-Resumo Consolidada</span>
                </button>
              </div>

              {/* ========================================================================= */}
              {/* ABA 1: EIXO I - INSUMOS EXECUTADOS                                        */}
              {/* ========================================================================= */}
              {(abaAtiva === 'INSUMOS' || typeof window !== 'undefined') && (
                <div className={`space-y-6 ${abaAtiva !== 'INSUMOS' ? 'hidden print:block' : ''}`}>
                  {/* Planilha-Resumo por Unidade/Setor (Insumos) */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                          Planilha-Resumo: Valores de Insumos Aplicados por Unidade / Setor
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          Exigência alínea (i) do Eixo I para prestação de contas perante a Controladoria e TCE.
                        </p>
                      </div>
                      <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-lg">
                        Total Insumos: R$ {totais?.totalInsumos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                            <th className="py-2.5 px-3">Unidade Demandante Beneficiada</th>
                            <th className="py-2.5 px-3">Campus</th>
                            <th className="py-2.5 px-3 text-center">Chamados Atendidos</th>
                            <th className="py-2.5 px-3 text-center">Qtd Itens Aplicados</th>
                            <th className="py-2.5 px-3 text-right">Valor Total Aplicado (R$)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {dados?.eixoI_Insumos?.planilhaResumo.map((res: any, idx: number) => (
                            <tr key={idx} className="hover:bg-slate-50/60">
                              <td className="py-2 px-3 font-semibold text-slate-900">
                                {res.unidadeNome} ({res.sigla})
                              </td>
                              <td className="py-2 px-3 text-slate-600">{res.campus}</td>
                              <td className="py-2 px-3 text-center font-mono">{res.totalChamadosAtendidos}</td>
                              <td className="py-2 px-3 text-center font-mono">{res.quantidadeItens.toFixed(1)}</td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                                R$ {res.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Tabela Analítica de Insumos com Fotos Antes/Depois e Comprovantes */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                    <div className="border-b border-slate-100 pb-3">
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                        Detalhamento Analítico de Insumos Executados (Alíneas a até h)
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Comprovação individual de cada material aplicado com evidências fotográficas e anexos de aquisição.
                      </p>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold text-[11px]">
                            <th className="py-2.5 px-2.5 w-16">Mês/Ano</th>
                            <th className="py-2.5 px-2.5">Código & Insumo</th>
                            <th className="py-2.5 px-2.5">Unidade / Prédio / Setor</th>
                            <th className="py-2.5 px-2.5">Chamado & Tarefa</th>
                            <th className="py-2.5 px-2 text-right">Qtd</th>
                            <th className="py-2.5 px-2 text-right">Unitário</th>
                            <th className="py-2.5 px-2.5 text-right">Total Aplicado</th>
                            <th className="py-2.5 px-2.5 text-center">Demonstrativo Fotográfico</th>
                            <th className="py-2.5 px-2.5 text-center">Comprovante</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {dados?.eixoI_Insumos?.itens.map((it: any) => (
                            <tr key={it.id} className="hover:bg-slate-50/60 transition-colors">
                              <td className="py-2.5 px-2.5 font-mono text-slate-500 whitespace-nowrap">
                                {it.mesAnoReferencia}
                              </td>
                              <td className="py-2.5 px-2.5">
                                <span className="font-bold text-slate-900 block">{it.descricaoInsumo}</span>
                                <span className="text-[10px] font-mono text-slate-500">Cód: {it.codigoInsumo}</span>
                              </td>
                              <td className="py-2.5 px-2.5">
                                <span className="font-semibold text-slate-800 block">{it.unidadeBeneficiadaNome}</span>
                                <span className="text-[10px] text-slate-500 block">{it.predioNome} • {it.setorBeneficiado}</span>
                              </td>
                              <td className="py-2.5 px-2.5 max-w-xs">
                                <span className="font-mono font-bold text-blue-700 block">
                                  {it.processoReferencia}
                                </span>
                                <span className="text-[10px] text-slate-600 line-clamp-2">{it.descricaoTarefa}</span>
                              </td>
                              <td className="py-2.5 px-2 text-right font-mono font-bold text-slate-700 whitespace-nowrap">
                                {it.quantidade.toFixed(1)} {it.unidadeMedida}
                              </td>
                              <td className="py-2.5 px-2 text-right font-mono text-slate-600 whitespace-nowrap">
                                R$ {it.valorUnitario.toFixed(2)}
                              </td>
                              <td className="py-2.5 px-2.5 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                                R$ {it.valorTotal.toFixed(2)}
                              </td>
                              {/* Demonstrativo Fotográfico: ANTES e DEPOIS */}
                              <td className="py-2.5 px-2.5 text-center whitespace-nowrap">
                                <div className="inline-flex items-center gap-1.5">
                                  {it.fotosAntes.length > 0 ? (
                                    <button
                                      type="button"
                                      onClick={() => setFotoModal({ url: it.fotosAntes[0], titulo: `${it.descricaoInsumo} - Chamado #${it.chamadoNumero}`, tipo: 'ANTES' })}
                                      className="group relative"
                                      title="Ver foto do ANTES"
                                    >
                                      <img
                                        src={it.fotosAntes[0]}
                                        alt="Antes"
                                        className="w-8 h-8 rounded object-cover border border-amber-300 group-hover:scale-110 transition-transform"
                                      />
                                      <span className="absolute -bottom-1 -right-1 bg-amber-600 text-white text-[8px] font-bold px-1 rounded">A</span>
                                    </button>
                                  ) : (
                                    <span className="text-[9px] text-slate-300 italic">Sem antes</span>
                                  )}

                                  {it.fotosDepois.length > 0 ? (
                                    <button
                                      type="button"
                                      onClick={() => setFotoModal({ url: it.fotosDepois[0], titulo: `${it.descricaoInsumo} - Chamado #${it.chamadoNumero}`, tipo: 'DEPOIS' })}
                                      className="group relative"
                                      title="Ver foto do DEPOIS"
                                    >
                                      <img
                                        src={it.fotosDepois[0]}
                                        alt="Depois"
                                        className="w-8 h-8 rounded object-cover border border-emerald-400 group-hover:scale-110 transition-transform"
                                      />
                                      <span className="absolute -bottom-1 -right-1 bg-emerald-600 text-white text-[8px] font-bold px-1 rounded">D</span>
                                    </button>
                                  ) : (
                                    <span className="text-[9px] text-slate-300 italic">Sem depois</span>
                                  )}
                                </div>
                              </td>
                              {/* Comprovante de Aquisição */}
                              <td className="py-2.5 px-2.5 text-center whitespace-nowrap">
                                {it.comprovantesAquisicao.length > 0 ? (
                                  <button
                                    type="button"
                                    onClick={() => setFotoModal({ url: it.comprovantesAquisicao[0], titulo: `Comprovante de Aquisição - Insumo ${it.codigoInsumo}`, tipo: 'COMPROVANTE' })}
                                    className="p-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-[10px] font-semibold inline-flex items-center gap-1"
                                    title="Ver nota fiscal / comprovante de aquisição anexado"
                                  >
                                    <FileText className="w-3.5 h-3.5" />
                                    <span>NF / Anexo</span>
                                  </button>
                                ) : (
                                  <span className="text-[10px] text-slate-400">Declarado</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* ABA 2: EIXO II - SERVIÇOS EVENTUAIS                                       */}
              {/* ========================================================================= */}
              {(abaAtiva === 'EVENTUAIS' || typeof window !== 'undefined') && (
                <div className={`space-y-6 ${abaAtiva !== 'EVENTUAIS' ? 'hidden print:block' : ''}`}>
                  {/* Planilha-Resumo por Unidade/Campus (Serviços Eventuais) */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                          Planilha-Resumo: Serviços Eventuais Executados por Unidade / Setor
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          Exigência alínea (h) do Eixo II para prestação de contas dos serviços eventuais de maior vulto e programados.
                        </p>
                      </div>
                      <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-3 py-1 rounded-lg">
                        Total Eventuais: R$ {totais?.totalServicosEventuais.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                            <th className="py-2.5 px-3">Unidade Demandante Beneficiada</th>
                            <th className="py-2.5 px-3">Campus</th>
                            <th className="py-2.5 px-3 text-center">Qtd Serviços Executados</th>
                            <th className="py-2.5 px-3 text-right">Valor Total Executado (R$)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {dados?.eixoII_ServicosEventuais?.planilhaResumo.map((res: any, idx: number) => (
                            <tr key={idx} className="hover:bg-slate-50/60">
                              <td className="py-2 px-3 font-semibold text-slate-900">
                                {res.unidadeNome} ({res.sigla})
                              </td>
                              <td className="py-2 px-3 text-slate-600">{res.campus}</td>
                              <td className="py-2 px-3 text-center font-mono font-bold">{res.totalServicosEventuais}</td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-amber-700">
                                R$ {res.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Tabela Analítica de Serviços Eventuais */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                    <div className="border-b border-slate-100 pb-3">
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                        Detalhamento Analítico dos Serviços Eventuais Executados
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Composição discriminada com custos de mão de obra eventual, insumos e relatório fotográfico (Antes/Depois).
                      </p>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold text-[11px]">
                            <th className="py-2.5 px-2.5 w-16">Mês/Ano</th>
                            <th className="py-2.5 px-2.5">Identificação do Serviço</th>
                            <th className="py-2.5 px-2.5">Unidade & Localização</th>
                            <th className="py-2.5 px-2.5">Processo / Referência</th>
                            <th className="py-2.5 px-2.5">Composição dos Custos (Insumos + MO)</th>
                            <th className="py-2.5 px-2.5 text-right">Insumos (R$)</th>
                            <th className="py-2.5 px-2.5 text-right">MO Eventual (R$)</th>
                            <th className="py-2.5 px-2.5 text-right">Total Executado</th>
                            <th className="py-2.5 px-2.5 text-center">Demonstrativo Fotográfico</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {dados?.eixoII_ServicosEventuais?.itens.map((it: any) => (
                            <tr key={it.id} className="hover:bg-slate-50/60 transition-colors">
                              <td className="py-2.5 px-2.5 font-mono text-slate-500 whitespace-nowrap">
                                {it.mesAnoReferencia}
                              </td>
                              <td className="py-2.5 px-2.5">
                                <span className="font-bold text-slate-900 block">{it.identificacaoServico}</span>
                                <span className="text-[10px] text-slate-500 font-mono">Tipo: {it.tipoOrigem}</span>
                              </td>
                              <td className="py-2.5 px-2.5">
                                <span className="font-semibold text-slate-800 block">{it.unidadeBeneficiadaNome}</span>
                                <span className="text-[10px] text-slate-500 block">{it.predioNome} • {it.setorBeneficiado}</span>
                              </td>
                              <td className="py-2.5 px-2.5 font-mono font-bold text-blue-700 whitespace-nowrap">
                                {it.processoReferencia}
                              </td>
                              <td className="py-2.5 px-2.5 max-w-xs">
                                <span className="text-[10px] text-slate-600 line-clamp-2">{it.descricaoInsumos}</span>
                              </td>
                              <td className="py-2.5 px-2.5 text-right font-mono text-slate-600 whitespace-nowrap">
                                R$ {it.custoInsumos.toFixed(2)}
                              </td>
                              <td className="py-2.5 px-2.5 text-right font-mono text-slate-600 whitespace-nowrap">
                                R$ {it.custoMaoObraEventual.toFixed(2)}
                              </td>
                              <td className="py-2.5 px-2.5 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                                R$ {it.valorTotalServico.toFixed(2)}
                              </td>
                              {/* Demonstrativo Fotográfico */}
                              <td className="py-2.5 px-2.5 text-center whitespace-nowrap">
                                <div className="inline-flex items-center gap-1.5">
                                  {it.fotosAntes.length > 0 ? (
                                    <button
                                      type="button"
                                      onClick={() => setFotoModal({ url: it.fotosAntes[0], titulo: it.identificacaoServico, tipo: 'ANTES' })}
                                      className="group relative"
                                      title="Foto do ANTES"
                                    >
                                      <img
                                        src={it.fotosAntes[0]}
                                        alt="Antes"
                                        className="w-8 h-8 rounded object-cover border border-amber-300 group-hover:scale-110 transition-transform"
                                      />
                                      <span className="absolute -bottom-1 -right-1 bg-amber-600 text-white text-[8px] font-bold px-1 rounded">A</span>
                                    </button>
                                  ) : (
                                    <span className="text-[9px] text-slate-300 italic">Sem antes</span>
                                  )}

                                  {it.fotosDepois.length > 0 ? (
                                    <button
                                      type="button"
                                      onClick={() => setFotoModal({ url: it.fotosDepois[0], titulo: it.identificacaoServico, tipo: 'DEPOIS' })}
                                      className="group relative"
                                      title="Foto do DEPOIS"
                                    >
                                      <img
                                        src={it.fotosDepois[0]}
                                        alt="Depois"
                                        className="w-8 h-8 rounded object-cover border border-emerald-400 group-hover:scale-110 transition-transform"
                                      />
                                      <span className="absolute -bottom-1 -right-1 bg-emerald-600 text-white text-[8px] font-bold px-1 rounded">D</span>
                                    </button>
                                  ) : (
                                    <span className="text-[9px] text-slate-300 italic">Sem depois</span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* ABA 3: EIXO III - MÃO DE OBRA FIXA (RESIDENTE)                            */}
              {/* ========================================================================= */}
              {(abaAtiva === 'MAO_OBRA_FIXA' || typeof window !== 'undefined') && (
                <div className={`space-y-6 ${abaAtiva !== 'MAO_OBRA_FIXA' ? 'hidden print:block' : ''}`}>
                  {/* Memória de Cálculo e Planilha-Resumo por Unidade */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                          Planilha-Resumo: Custos Estimados com Mão de Obra Fixa por Unidade
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          Exigência alínea (i) do Eixo III: cálculo proporcional ao tempo dedicado aos atendimentos no período + diárias de deslocamento.
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-mono font-bold text-purple-700 bg-purple-50 px-3 py-1 rounded-lg block">
                          Total Apropriado: R$ {totais?.totalMaoObraFixaApropriada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-[10px] text-slate-400 mt-0.5 block">
                          Taxa Horária Contratual Referência: R$ {dados?.contratoReferencia?.custoHoraMOFixa?.toFixed(2) || '22.50'}/h
                        </span>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                            <th className="py-2.5 px-3">Unidade Demandante Beneficiada</th>
                            <th className="py-2.5 px-3">Campus</th>
                            <th className="py-2.5 px-3 text-center">Tarefas Realizadas</th>
                            <th className="py-2.5 px-3 text-center">Horas Dedicadas</th>
                            <th className="py-2.5 px-3 text-center">Diárias Deslocamento</th>
                            <th className="py-2.5 px-3 text-right">Custo Estimado Apropriado (R$)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {dados?.eixoIII_MaoObraFixa?.planilhaResumo.map((res: any, idx: number) => (
                            <tr key={idx} className="hover:bg-slate-50/60">
                              <td className="py-2 px-3 font-semibold text-slate-900">
                                {res.unidadeNome} ({res.sigla})
                              </td>
                              <td className="py-2 px-3 text-slate-600">{res.campus}</td>
                              <td className="py-2 px-3 text-center font-mono">{res.totalTarefas}</td>
                              <td className="py-2 px-3 text-center font-mono">{res.totalHorasDedicadas.toFixed(1)} h</td>
                              <td className="py-2 px-3 text-center font-mono">
                                R$ {res.totalDiariasDeslocamento.toFixed(2)}
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-purple-800">
                                R$ {res.custoApropriadoMaoObra.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Tabela Analítica das Tarefas da Mão de Obra Fixa */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                    <div className="border-b border-slate-100 pb-3">
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                        Lista Analítica de Tarefas Executadas pela Mão de Obra Fixa
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Identificação nominal do trabalhador residente, insumos associados, estimativa de horas e demonstrativo fotográfico (Antes/Depois).
                      </p>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold text-[11px]">
                            <th className="py-2.5 px-2.5 w-16">Mês/Ano</th>
                            <th className="py-2.5 px-2.5">Tarefa Executada</th>
                            <th className="py-2.5 px-2.5">Unidade / Setor</th>
                            <th className="py-2.5 px-2.5">Chamado</th>
                            <th className="py-2.5 px-2.5">Insumos Associados</th>
                            <th className="py-2.5 px-2 text-center">Horas / Diárias</th>
                            <th className="py-2.5 px-2.5">Profissional / Cargo</th>
                            <th className="py-2.5 px-2.5 text-right">Custo Apropriado</th>
                            <th className="py-2.5 px-2.5 text-center">Demonstrativo Fotográfico</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {dados?.eixoIII_MaoObraFixa?.itens.map((it: any) => (
                            <tr key={it.id} className="hover:bg-slate-50/60 transition-colors">
                              <td className="py-2.5 px-2.5 font-mono text-slate-500 whitespace-nowrap">
                                {it.mesAnoReferencia}
                              </td>
                              <td className="py-2.5 px-2.5">
                                <span className="font-bold text-slate-900 block">{it.identificacaoServico}</span>
                              </td>
                              <td className="py-2.5 px-2.5">
                                <span className="font-semibold text-slate-800 block">{it.unidadeBeneficiadaNome}</span>
                                <span className="text-[10px] text-slate-500 block">{it.predioNome} • {it.setorBeneficiado}</span>
                              </td>
                              <td className="py-2.5 px-2.5 font-mono font-bold text-blue-700 whitespace-nowrap">
                                {it.processoReferencia}
                              </td>
                              <td className="py-2.5 px-2.5 max-w-xs">
                                <span className="text-[10px] text-slate-600 line-clamp-2">{it.descricaoInsumos}</span>
                              </td>
                              <td className="py-2.5 px-2 text-center font-mono whitespace-nowrap">
                                <div>{it.tempoExecucaoHoras.toFixed(1)} h</div>
                                {it.houveDeslocamento && (
                                  <span className="text-[10px] text-amber-700 font-semibold block">
                                    + {it.diasDeslocamento} d diária
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-2.5">
                                <span className="font-semibold text-slate-900 block">{it.nomeCompletoTrabalhador}</span>
                                <span className="text-[10px] text-slate-500">{it.cargoTrabalhador}</span>
                              </td>
                              <td className="py-2.5 px-2.5 text-right font-mono font-bold text-purple-900 whitespace-nowrap">
                                R$ {it.custoMaoObraApropriado.toFixed(2)}
                              </td>
                              {/* Demonstrativo Fotográfico */}
                              <td className="py-2.5 px-2.5 text-center whitespace-nowrap">
                                <div className="inline-flex items-center gap-1.5">
                                  {it.fotosAntes.length > 0 ? (
                                    <button
                                      type="button"
                                      onClick={() => setFotoModal({ url: it.fotosAntes[0], titulo: it.identificacaoServico, tipo: 'ANTES' })}
                                      className="group relative"
                                      title="Foto do ANTES"
                                    >
                                      <img
                                        src={it.fotosAntes[0]}
                                        alt="Antes"
                                        className="w-8 h-8 rounded object-cover border border-amber-300 group-hover:scale-110 transition-transform"
                                      />
                                      <span className="absolute -bottom-1 -right-1 bg-amber-600 text-white text-[8px] font-bold px-1 rounded">A</span>
                                    </button>
                                  ) : (
                                    <span className="text-[9px] text-slate-300 italic">Sem antes</span>
                                  )}

                                  {it.fotosDepois.length > 0 ? (
                                    <button
                                      type="button"
                                      onClick={() => setFotoModal({ url: it.fotosDepois[0], titulo: it.identificacaoServico, tipo: 'DEPOIS' })}
                                      className="group relative"
                                      title="Foto do DEPOIS"
                                    >
                                      <img
                                        src={it.fotosDepois[0]}
                                        alt="Depois"
                                        className="w-8 h-8 rounded object-cover border border-emerald-400 group-hover:scale-110 transition-transform"
                                      />
                                      <span className="absolute -bottom-1 -right-1 bg-emerald-600 text-white text-[8px] font-bold px-1 rounded">D</span>
                                    </button>
                                  ) : (
                                    <span className="text-[9px] text-slate-300 italic">Sem depois</span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* ABA 4: PLANILHA-RESUMO CONSOLIDADA DOS 3 EIXOS                            */}
              {/* ========================================================================= */}
              {(abaAtiva === 'RESUMO_GERAL' || typeof window !== 'undefined') && (
                <div className={`space-y-6 ${abaAtiva !== 'RESUMO_GERAL' ? 'hidden print:block' : ''}`}>
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                    <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                          Consolidação Geral de Execução Contratual por Unidade Demandante
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          Quadro comparativo integrando Insumos, Serviços Eventuais e Apropriação de Mão de Obra Fixa.
                        </p>
                      </div>
                      <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg">
                        Total Geral: R$ {totais?.totalGeralExecutado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                            <th className="py-2.5 px-3">Unidade Demandante</th>
                            <th className="py-2.5 px-3">Campus</th>
                            <th className="py-2.5 px-3 text-right">Insumos (R$)</th>
                            <th className="py-2.5 px-3 text-right">Serviços Eventuais (R$)</th>
                            <th className="py-2.5 px-3 text-right">Mão de Obra Fixa (R$)</th>
                            <th className="py-2.5 px-3 text-right font-bold text-slate-900">Total Geral (R$)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {dados?.unidadesDisponiveis?.map((u: any) => {
                            const valIns = dados.eixoI_Insumos?.planilhaResumo.find((r: any) => r.sigla === u.sigla)?.valorTotal || 0;
                            const valEve = dados.eixoII_ServicosEventuais?.planilhaResumo.find((r: any) => r.sigla === u.sigla)?.valorTotal || 0;
                            const valMo = dados.eixoIII_MaoObraFixa?.planilhaResumo.find((r: any) => r.sigla === u.sigla)?.custoApropriadoMaoObra || 0;
                            const valTot = valIns + valEve + valMo;

                            return (
                              <tr key={u.id} className="hover:bg-slate-50/60">
                                <td className="py-2.5 px-3 font-semibold text-slate-900">
                                  {u.nome} ({u.sigla})
                                </td>
                                <td className="py-2.5 px-3 text-slate-600">{u.campus}</td>
                                <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                                  R$ {valIns.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                                  R$ {valEve.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                                  R$ {valMo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 bg-slate-50/50">
                                  R$ {valTot.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TERMO DE ENCERRAMENTO E ASSINATURAS (EXCLUSIVO PARA IMPRESSÃO / AUDITORIA) */}
              <div className="hidden print:block pt-12 space-y-8 text-xs text-slate-700">
                <p className="leading-relaxed">
                  Atestamos que os serviços, insumos e horas de mão de obra descritos neste relatório foram fiscalizados in loco pelas equipes setoriais e pela Fiscalização Técnica e Administrativa da Universidade do Estado do Rio Grande do Norte, cumprindo integralmente os padrões de qualidade, memórias de cálculo e os termos contratuais avençados.
                </p>

                <div className="grid grid-cols-3 gap-6 pt-10 text-center">
                  <div className="border-t border-slate-400 pt-2">
                    <p className="font-bold text-slate-900">Fiscal Técnico do Contrato</p>
                    <p className="text-[10px] text-slate-500">Portaria de Designação / UERN</p>
                  </div>
                  <div className="border-t border-slate-400 pt-2">
                    <p className="font-bold text-slate-900">Fiscal Administrativo do Contrato</p>
                    <p className="text-[10px] text-slate-500">Portaria de Designação / UERN</p>
                  </div>
                  <div className="border-t border-slate-400 pt-2">
                    <p className="font-bold text-slate-900">Gestor do Contrato / PROAD</p>
                    <p className="text-[10px] text-slate-500">Pró-Reitoria de Administração</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>

      {/* MODAL DE AMPLIAÇÃO FOTOGRÁFICA (ANTES / DEPOIS / COMPROVANTE) */}
      {fotoModal && (
        <div
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setFotoModal(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                    fotoModal.tipo === 'ANTES'
                      ? 'bg-amber-100 text-amber-800'
                      : fotoModal.tipo === 'DEPOIS'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {fotoModal.tipo}
                </span>
                <h3 className="text-sm font-bold text-slate-900 line-clamp-1">{fotoModal.titulo}</h3>
              </div>
              <button
                onClick={() => setFotoModal(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="max-h-[70vh] flex items-center justify-center overflow-hidden rounded-xl bg-slate-100">
              <img
                src={fotoModal.url}
                alt={fotoModal.titulo}
                className="max-h-[68vh] w-auto object-contain rounded-xl"
              />
            </div>

            <div className="flex justify-between items-center text-xs text-slate-500 pt-2">
              <span>Evidência fotográfica registrada no sistema para fins de auditoria e prestação de contas</span>
              <a
                href={fotoModal.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline inline-flex items-center gap-1 font-semibold"
              >
                <span>Abrir em Nova Aba</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
