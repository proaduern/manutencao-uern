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
  FileText,
  Send,
  ShieldCheck,
  Edit,
  Camera,
  Layers,
  ChevronRight,
  AlertCircle,
  FileCheck,
  HelpCircle,
  XCircle,
  HardHat,
  MessageSquare,
  Sparkles,
} from 'lucide-react';

interface DemandaDetalhePageProps {
  params: { id: string; demandaId: string };
}

export default function DemandaDetalhePage({ params }: DemandaDetalhePageProps) {
  const [user, setUser] = useState<any>(null);
  const [demanda, setDemanda] = useState<any>(null);
  const [sla, setSla] = useState<any>(null);
  const [cotaInfo, setCotaInfo] = useState<any>(null);
  const [carregando, setCarregando] = useState(true);
  const [processandoAcao, setProcessandoAcao] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Modais de Ação
  const [modalProposta, setModalProposta] = useState(false);
  const [modalDiligencia, setModalDiligencia] = useState(false);
  const [modalParecerSobe, setModalParecerSobe] = useState(false);
  const [modalContestarValores, setModalContestarValores] = useState(false);
  const [modalConcluirEmpresa, setModalConcluirEmpresa] = useState(false);
  const [modalAceiteUnidade, setModalAceiteUnidade] = useState(false);
  const [modalEditarDemanda, setModalEditarDemanda] = useState(false);

  // Form Editar Demanda (Admin / Gestor)
  const [editTitulo, setEditTitulo] = useState('');
  const [editDescricao, setEditDescricao] = useState('');
  const [editJustificativa, setEditJustificativa] = useState('');
  const [editEstimativa, setEditEstimativa] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editLocalizacaoDetalhada, setEditLocalizacaoDetalhada] = useState('');
  const [editObservacaoEdicao, setEditObservacaoEdicao] = useState('');

  // Form Proposta Empresa
  const [rtNome, setRtNome] = useState('');
  const [rtRegistro, setRtRegistro] = useState('');
  const [artNumero, setArtNumero] = useState('');
  const [artArquivoUrl, setArtArquivoUrl] = useState('');
  const [prazoDias, setPrazoDias] = useState('15');
  const [regimeMaoObra, setRegimeMaoObra] = useState<'EVENTUAL' | 'FIXA_RESIDENTE'>('EVENTUAL');
  const [justificativaMO, setJustificativaMO] = useState('');
  const [itensProposta, setItensProposta] = useState<any[]>([
    {
      fonteReferencia: 'SINAPI',
      codigoItem: '',
      descricao: '',
      unidadeMedida: 'un',
      quantidade: '1',
      valorUnitario: '',
    },
  ]);

  // Busca em Tempo Real no Catálogo SINAPI Oficial
  const [buscaSinapi, setBuscaSinapi] = useState('');
  const [resultadosSinapi, setResultadosSinapi] = useState<any[]>([]);
  const [buscandoSinapi, setBuscandoSinapi] = useState(false);

  // Form Diligência
  const [textoDiligencia, setTextoDiligencia] = useState('');

  // Form Resposta Diligência
  const [modalResponderDiligencia, setModalResponderDiligencia] = useState(false);
  const [diligenciaSelecionadaId, setDiligenciaSelecionadaId] = useState('');
  const [textoRespostaDiligencia, setTextoRespostaDiligencia] = useState('');

  // Form Parecer SOBE
  const [parecerTexto, setParecerTexto] = useState('');
  const [parecerFavoravel, setParecerFavoravel] = useState(true);

  // Form Contestação
  const [valorContestado, setValorContestado] = useState('');
  const [motivoContestacao, setMotivoContestacao] = useState('');

  // Form Conclusão Empresa
  const [relatorioExecucao, setRelatorioExecucao] = useState('');
  const [fotoDepoisBase64, setFotoDepoisBase64] = useState<string | null>(null);

  // Form Aceite Unidade
  const [aceiteAprovado, setAceiteAprovado] = useState(true);
  const [motivoReprovacao, setMotivoReprovacao] = useState('');

  const carregarDados = () => {
    setCarregando(true);
    Promise.all([
      fetch('/api/auth/me').then((res) => res.json()),
      fetch(`/api/agendas/demandas/${params.demandaId}`).then((res) => res.json()),
    ])
      .then(([userData, demandaData]) => {
        if (userData.user) setUser(userData.user);
        if (demandaData.demanda) {
          setDemanda(demandaData.demanda);
          setSla(demandaData.sla);
          if (demandaData.cotaInfo) setCotaInfo(demandaData.cotaInfo);

          if (demandaData.demanda.proposta) {
            const p = demandaData.demanda.proposta;
            setRtNome(p.responsavelTecnicoNome || '');
            setRtRegistro(p.registroProfissional || '');
            setArtNumero(p.artNumero || '');
            setArtArquivoUrl(p.artArquivoUrl || '');
            setPrazoDias(p.prazoExecucaoDias?.toString() || '15');
            setRegimeMaoObra(p.regimeMaoObra || 'EVENTUAL');
            setJustificativaMO(p.justificativaMaoObra || '');
            if (p.itens && p.itens.length > 0) {
              setItensProposta(
                p.itens.map((it: any) => ({
                  fonteReferencia: it.fonteReferencia,
                  codigoItem: it.codigoItem || '',
                  descricao: it.descricao,
                  unidadeMedida: it.unidadeMedida,
                  quantidade: it.quantidade.toString(),
                  valorUnitario: it.valorUnitario.toString(),
                }))
              );
            }
          }
        }
        setCarregando(false);
      })
      .catch((err) => {
        console.error(err);
        setErro('Erro ao carregar dados da demanda.');
        setCarregando(false);
      });
  };

  useEffect(() => {
    carregarDados();
  }, [params.demandaId]);

  const executarAcaoDemanda = async (acao: string, payload: any = {}) => {
    try {
      setProcessandoAcao(true);
      const res = await fetch(`/api/agendas/demandas/${params.demandaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao, ...payload }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao processar ação');

      alert(data.mensagem || 'Ação executada com sucesso!');
      carregarDados();
      // Fechar modais
      setModalProposta(false);
      setModalDiligencia(false);
      setModalResponderDiligencia(false);
      setModalParecerSobe(false);
      setModalContestarValores(false);
      setModalConcluirEmpresa(false);
      setModalAceiteUnidade(false);
      setModalEditarDemanda(false);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setProcessandoAcao(false);
    }
  };

  const abrirModalEditar = () => {
    if (!demanda) return;
    setEditTitulo(demanda.titulo || '');
    setEditDescricao(demanda.descricaoProblema || '');
    setEditJustificativa(demanda.justificativa || '');
    setEditEstimativa(demanda.estimativaDemandante ? demanda.estimativaDemandante.toString() : '');
    setEditStatus(demanda.status || 'SUBMETIDA');
    setEditLocalizacaoDetalhada(demanda.localizacaoDetalhada || '');
    setEditObservacaoEdicao('');
    setModalEditarDemanda(true);
  };

  const handleAddItemProposta = () => {
    setItensProposta([
      ...itensProposta,
      {
        fonteReferencia: 'SINAPI',
        codigoItem: '',
        descricao: '',
        unidadeMedida: 'un',
        quantidade: '1',
        valorUnitario: '',
      },
    ]);
  };

  const handleRemoveItemProposta = (index: number) => {
    setItensProposta(itensProposta.filter((_, i) => i !== index));
  };

  useEffect(() => {
    if (!buscaSinapi || buscaSinapi.trim().length < 2) {
      setResultadosSinapi([]);
      return;
    }
    const timer = setTimeout(() => {
      setBuscandoSinapi(true);
      fetch(`/api/tabelas/buscar?q=${encodeURIComponent(buscaSinapi.trim())}&limite=15`)
        .then((res) => res.json())
        .then((data) => {
          setResultadosSinapi(data.itens || []);
        })
        .catch(() => setResultadosSinapi([]))
        .finally(() => setBuscandoSinapi(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [buscaSinapi]);

  const handleAdicionarItemDoSinapi = (itemSinapi: any) => {
    if (
      itensProposta.length === 1 &&
      !itensProposta[0].codigoItem &&
      !itensProposta[0].descricao &&
      !itensProposta[0].valorUnitario
    ) {
      setItensProposta([
        {
          fonteReferencia: 'SINAPI',
          codigoItem: itemSinapi.codigo,
          descricao: itemSinapi.descricao,
          unidadeMedida: itemSinapi.unidadeMedida || 'UN',
          quantidade: '1',
          valorUnitario: itemSinapi.precoUnitario ? itemSinapi.precoUnitario.toString() : '0',
        },
      ]);
    } else {
      setItensProposta([
        ...itensProposta,
        {
          fonteReferencia: 'SINAPI',
          codigoItem: itemSinapi.codigo,
          descricao: itemSinapi.descricao,
          unidadeMedida: itemSinapi.unidadeMedida || 'UN',
          quantidade: '1',
          valorUnitario: itemSinapi.precoUnitario ? itemSinapi.precoUnitario.toString() : '0',
        },
      ]);
    }
    setBuscaSinapi('');
    setResultadosSinapi([]);
  };

  const handleUpdateItemProposta = (index: number, campo: string, valor: string) => {
    const novos = [...itensProposta];
    novos[index][campo] = valor;
    setItensProposta(novos);
  };

  const handleFotoDepoisUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFotoDepoisBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-xs text-slate-500">
        Carregando detalhes da demanda da agenda...
      </div>
    );
  }

  if (!demanda) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-xs text-rose-500">
        Demanda não encontrada.
      </div>
    );
  }

  const isEmpresa = user?.role === 'EMPRESA';
  const isAdminOrGestor = user?.role === 'ADMIN' || user?.role === 'GESTOR_CONTRATO';
  const isFiscalTecnico = user?.role === 'FISCAL_TECNICO' || user?.role === 'ADMIN';
  const isTecnicoSobe = user?.role === 'TECNICO_SOBE' || user?.role === 'ADMIN' || user?.role === 'FISCAL_TECNICO';
  const isDemandanteUnidade =
    (user?.role === 'DEMANDANTE' && user?.unidadeId === demanda.unidadeId) || isAdminOrGestor;

  const totalCalculadoProposta = itensProposta.reduce((acc, it) => {
    const q = parseFloat(it.quantidade) || 0;
    const v = parseFloat(it.valorUnitario) || 0;
    return acc + q * v;
  }, 0);

  return (
    <div className="min-h-screen flex bg-slate-50">
      <Sidebar role={user?.role} />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar user={user} />

        <main className="flex-1 p-6 md:p-8 max-w-6xl w-full mx-auto space-y-6">
          {/* Navegação e Status */}
          <div className="flex items-center justify-between">
            <Link
              href={`/agendas/${params.id}`}
              className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar para {demanda.agenda?.titulo}</span>
            </Link>

            <span className="text-xs font-mono font-bold text-slate-500 bg-slate-200/80 px-3 py-1 rounded-full">
              Demanda #{demanda.numero.toString().padStart(3, '0')}
            </span>
          </div>

          {/* ALERTA DE SLA / CONTAGEM DE DIAS ÚTEIS / PENALIDADES IMR */}
          {sla && (
            <div
              className={`p-4 rounded-2xl border shadow-sm flex items-start gap-3 text-xs ${
                sla.atrasado
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : sla.nivelGravidade === 'ALERTA'
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : 'bg-blue-50 border-blue-200 text-blue-900'
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {sla.atrasado ? (
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                ) : (
                  <Clock className="w-5 h-5 text-blue-600" />
                )}
              </div>
              <div className="space-y-0.5">
                <p className="font-bold">
                  {sla.atrasado ? 'ALERTA DE ATRASO EM DIAS ÚTEIS (SUJEITO A IMR / PENALIDADE)' : 'Controle de Prazos em Dias Úteis (Calendário Oficial UERN)'}
                </p>
                <p className="leading-relaxed">{sla.mensagem}</p>
              </div>
            </div>
          )}

          {/* CABEÇALHO DA DEMANDA */}
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-200">
                    {demanda.unidade?.nome} ({demanda.unidade?.campus})
                  </span>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs text-slate-500 font-medium">
                    {demanda.predio ? demanda.predio.nome : 'Sede Principal'}
                    {demanda.sublocal ? ` — ${demanda.sublocal.nome}` : ''}
                  </span>
                </div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                  {demanda.titulo}
                </h1>
                <p className="text-xs text-slate-600 leading-relaxed max-w-3xl pt-1">
                  {demanda.descricaoProblema}
                </p>
                <p className="text-xs text-slate-500 italic pt-1">
                  <strong>Justificativa da Unidade:</strong> {demanda.justificativa}
                </p>

                {/* STATUS ORÇAMENTÁRIO: SALDO GERAL VS COTA EXCLUSIVA */}
                {cotaInfo && (
                  <div className="pt-2">
                    {cotaInfo.usaSaldoGeral ? (
                      <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-2 text-xs text-blue-900">
                        <DollarSign className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>
                          <strong>Regime de Saldo Geral:</strong> Esta unidade opera sob o Saldo Global do Contrato (Serviços Eventuais). O atendimento não é restrito a uma cota exclusiva da agenda.
                        </span>
                      </div>
                    ) : (() => {
                        const valRef = demanda.proposta?.valorFinalHomologado
                          ? parseFloat(demanda.proposta.valorFinalHomologado.toString())
                          : demanda.proposta?.valorTotalProposto
                          ? parseFloat(demanda.proposta.valorTotalProposto.toString())
                          : demanda.estimativaDemandante
                          ? parseFloat(demanda.estimativaDemandante.toString())
                          : 0;

                        if (valRef > cotaInfo.cotaValor) {
                          return (
                            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-xs text-amber-900">
                              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                              <span>
                                <strong>Cota da Unidade Ultrapassada:</strong> O valor desta demanda (R$ {valRef.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) supera o teto exclusivo fixado para a unidade (R$ {cotaInfo.cotaValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}). A PROAD possui prerrogativa para autorizar a execução com respaldo no <strong>Saldo Global do Contrato</strong>.
                              </span>
                            </div>
                          );
                        }

                        return (
                          <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-900">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>
                              <strong>Cota Exclusiva:</strong> Demanda compatível com a cota da unidade (Teto: R$ {cotaInfo.cotaValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}).
                            </span>
                          </div>
                        );
                      })()}
                  </div>
                )}
              </div>

              <div className="flex flex-col items-end gap-2 shrink-0">
                <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                  {demanda.status}
                </span>
                {demanda.estimativaDemandante && (
                  <span className="text-xs font-mono font-semibold text-slate-600">
                    Estimativa inicial: R$ {parseFloat(demanda.estimativaDemandante.toString()).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                )}
              </div>
            </div>

            {/* BARRA DE AÇÕES OPERACIONAIS */}
            <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center gap-2.5">
              {/* EMPRESA: SUBMETER PROPOSTA */}
              {isEmpresa && (demanda.status === 'ENVIADA_EMPRESA' || demanda.status === 'EM_DILIGENCIA') && (
                <button
                  onClick={() => setModalProposta(true)}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-lg shadow-sm"
                >
                  <FileText className="w-4 h-4" />
                  <span>{demanda.proposta ? 'Adequar Proposta Técnica' : 'Elaborar Proposta de Execução (SINAPI & ART)'}</span>
                </button>
              )}

              {/* EMPRESA: CONCLUIR SERVIÇO */}
              {isEmpresa && (demanda.status === 'EM_EXECUCAO' || demanda.status === 'EM_CORRECAO_EMPRESA') && (
                <button
                  onClick={() => setModalConcluirEmpresa(true)}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm"
                >
                  <Camera className="w-4 h-4" />
                  <span>Declarar Serviço Concluído (Foto DEPOIS)</span>
                </button>
              )}

              {/* FISCAL / GESTOR: DILIGÊNCIA */}
              {isFiscalTecnico && demanda.status === 'PROPOSTA_EM_ANALISE' && (
                <button
                  onClick={() => setModalDiligencia(true)}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg border border-slate-300"
                >
                  <MessageSquare className="w-4 h-4 text-slate-600" />
                  <span>Solicitar Diligência à Contratada</span>
                </button>
              )}

              {/* FISCAL / GESTOR: CONSULTAR SOBE */}
              {isFiscalTecnico && demanda.status === 'PROPOSTA_EM_ANALISE' && (
                <button
                  onClick={() => {
                    const obs = prompt('Observação técnica para a SOBE:');
                    executarAcaoDemanda('SOLICITAR_PARECER_SOBE', { observacaoSolicitacao: obs });
                  }}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-900 text-xs font-semibold rounded-lg border border-blue-200"
                >
                  <HardHat className="w-4 h-4 text-blue-600" />
                  <span>Solicitar Parecer Técnico da SOBE</span>
                </button>
              )}

              {/* SOBE: EMITIR PARECER */}
              {isTecnicoSobe && demanda.status === 'AGUARDANDO_SOBE' && (
                <button
                  onClick={() => setModalParecerSobe(true)}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm"
                >
                  <HardHat className="w-4 h-4 text-indigo-200" />
                  <span>Emitir Parecer Técnico da SOBE</span>
                </button>
              )}

              {/* FISCAL / GESTOR: CONTESTAR VALORES */}
              {isFiscalTecnico && (demanda.status === 'PROPOSTA_EM_ANALISE' || demanda.status === 'EM_DILIGENCIA') && (
                <button
                  onClick={() => setModalContestarValores(true)}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-semibold rounded-lg border border-amber-300"
                >
                  <DollarSign className="w-4 h-4 text-amber-700" />
                  <span>Contestar Valores Orçados (Aferição UERN)</span>
                </button>
              )}

              {/* FISCAL / GESTOR: AUTORIZAR EXECUÇÃO (COM PROVISIONAMENTO) */}
              {isFiscalTecnico && (demanda.status === 'PROPOSTA_EM_ANALISE' || demanda.status === 'CONTESTADA_UERN') && (
                <button
                  onClick={() => {
                    if (confirm('Autorizar a execução desta demanda? O valor homologado será provisionado no saldo de Serviços Eventuais do contrato e o prazo de execução em dias úteis começará a contar imediatamente.')) {
                      executarAcaoDemanda('AUTORIZAR_EXECUCAO');
                    }
                  }}
                  className="inline-flex items-center space-x-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                  <span>Autorizar Execução & Provisionar no Contrato</span>
                </button>
              )}

              {/* UNIDADE DEMANDANTE: ACEITE (5 DIAS ÚTEIS) */}
              {isDemandanteUnidade && demanda.status === 'AGUARDANDO_ACEITE_UNIDADE' && (
                <button
                  onClick={() => setModalAceiteUnidade(true)}
                  className="inline-flex items-center space-x-1.5 px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg shadow-sm"
                >
                  <ShieldCheck className="w-4 h-4 text-purple-200" />
                  <span>Homologar Aceite / Reprovar Serviço (5 dias úteis)</span>
                </button>
              )}

              {/* ADMIN / GESTOR: EDITAR DEMANDA */}
              {isAdminOrGestor && (
                <button
                  onClick={abrirModalEditar}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-sm"
                >
                  <Edit className="w-4 h-4 text-amber-400" />
                  <span>Editar Dados da Demanda</span>
                </button>
              )}
            </div>
          </div>

          {/* DETALHES DA PROPOSTA TÉCNICA APRESENTADA PELA CONTRATADA */}
          {demanda.proposta ? (
            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <FileCheck className="w-5 h-5 text-amber-500" />
                    <span>Proposta de Execução de Demanda (Contratada)</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Dimensões técnicas, orçamento SINAPI, ART/RRT e prazo acordado.
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Valor Homologado / Proposto</span>
                  <span className="text-xl font-mono font-bold text-slate-900">
                    R$ {Number(demanda.proposta.valorFinalHomologado || demanda.proposta.valorTotalProposto).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                  {demanda.proposta.valorContestadoUern && (
                    <span className="text-[10px] text-rose-600 font-semibold block">
                      (Aferido e Contestado pela UERN)
                    </span>
                  )}
                </div>
              </div>

              {/* Responsável Técnico, ART e Regime de MO */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div>
                  <p className="text-slate-400 font-semibold uppercase text-[10px]">Responsável Técnico</p>
                  <p className="font-bold text-slate-800 mt-0.5">{demanda.proposta.responsavelTecnicoNome}</p>
                  <p className="text-[11px] text-slate-500">Registro: {demanda.proposta.registroProfissional}</p>
                </div>

                <div>
                  <p className="text-slate-400 font-semibold uppercase text-[10px]">ART / RRT</p>
                  <p className="font-bold text-slate-800 mt-0.5">Nº {demanda.proposta.artNumero}</p>
                  <p className="text-[11px] text-emerald-600 font-medium">Vinculada à execução</p>
                </div>

                <div>
                  <p className="text-slate-400 font-semibold uppercase text-[10px]">Mão de Obra & Prazo</p>
                  <p className="font-bold text-slate-800 mt-0.5">
                    {demanda.proposta.regimeMaoObra === 'FIXA_RESIDENTE'
                      ? 'Mão de Obra Residente (Fixa)'
                      : 'Serviço Eventual (Composição SINAPI)'}
                  </p>
                  <p className="text-[11px] text-blue-700 font-semibold">
                    Prazo: {demanda.proposta.prazoExecucaoDias} dias úteis
                  </p>
                </div>
              </div>

              {demanda.proposta.regimeMaoObra === 'FIXA_RESIDENTE' && demanda.proposta.justificativaMaoObra && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                  <strong>Justificativa da Utilização de Mão de Obra Residente:</strong> {demanda.proposta.justificativaMaoObra}
                </div>
              )}

              {/* Tabela de Itens Orçados (SINAPI / ORSE / Mercado) */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Composição de Custos e Insumos da Demanda
                </h3>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Fonte</th>
                        <th className="py-2.5 px-3">Código</th>
                        <th className="py-2.5 px-4">Descrição do Serviço / Insumo</th>
                        <th className="py-2.5 px-3 text-center">Un.</th>
                        <th className="py-2.5 px-3 text-right">Qtd</th>
                        <th className="py-2.5 px-3 text-right">Unitário Proposto</th>
                        <th className="py-2.5 px-3 text-center">Checagem SINAPI (RN)</th>
                        <th className="py-2.5 px-3 text-right">Valor Total (R$)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {demanda.proposta.itens.map((it: any) => (
                        <tr key={it.id} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-semibold text-slate-700">{it.fonteReferencia}</td>
                          <td className="py-2 px-3 font-mono text-slate-500">{it.codigoItem || '-'}</td>
                          <td className="py-2 px-4 font-medium text-slate-900">{it.descricao}</td>
                          <td className="py-2 px-3 text-center text-slate-500">{it.unidadeMedida}</td>
                          <td className="py-2 px-3 text-right font-mono">{parseFloat(it.quantidade.toString()).toFixed(2)}</td>
                          <td className="py-2 px-3 text-right font-mono font-medium">
                            R$ {parseFloat(it.valorUnitario.toString()).toFixed(2)}
                          </td>
                          <td className="py-2 px-3 text-center">
                            {it.conformidade === 'CONFORME' && (
                              <span
                                className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800"
                                title={`Referência Oficial SINAPI: R$ ${it.referenciaOficial?.precoUnitario?.toFixed(2)}`}
                              >
                                🟢 R$ {it.referenciaOficial?.precoUnitario?.toFixed(2)} (Conforme)
                              </span>
                            )}
                            {it.conformidade === 'SOBREPRECO' && (
                              <span
                                className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-800"
                                title={`Preço Oficial SINAPI: R$ ${it.referenciaOficial?.precoUnitario?.toFixed(2)} - Excede em +${it.diferencaPercentual}%`}
                              >
                                🔴 R$ {it.referenciaOficial?.precoUnitario?.toFixed(2)} (+{it.diferencaPercentual}%)
                              </span>
                            )}
                            {(!it.conformidade || it.conformidade === 'MERCADO') && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-amber-100 text-amber-800">
                                🟡 Cotação Mercado
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                            R$ {parseFloat(it.valorTotal.toString()).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 mx-auto flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">Proposta Técnica Pendente de Apresentação</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                A empresa CONTRATADA dispõe do prazo de <strong>15 dias úteis</strong> para realizar o levantamento, dimensionar os serviços em padrão SINAPI e apresentar a proposta técnica com ART.
              </p>
              {isEmpresa && (
                <button
                  onClick={() => setModalProposta(true)}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-lg shadow-sm"
                >
                  Elaborar Proposta Agora
                </button>
              )}
            </div>
          )}

          {/* PARECERES DA SOBE & DILIGÊNCIAS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pareceres Técnicos da SOBE */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <HardHat className="w-4 h-4 text-indigo-600" />
                <span>Manifestações Técnicas da SOBE ({demanda.pareceresSobe?.length || 0})</span>
              </h3>

              {demanda.pareceresSobe?.length === 0 ? (
                <p className="text-xs text-slate-400 italic">
                  Nenhuma manifestação técnica solicitada à SOBE para esta demanda.
                </p>
              ) : (
                <div className="space-y-3">
                  {demanda.pareceresSobe.map((p: any) => (
                    <div key={p.id} className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-indigo-950">
                          {p.tecnicoSobeNome || 'Técnico da SOBE'}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${p.favoravel ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                          {p.favoravel ? 'Favorável' : 'Desfavorável'}
                        </span>
                      </div>
                      <p className="text-slate-700 leading-relaxed pt-1">{p.parecerTexto}</p>
                      <span className="text-[10px] text-slate-400 block pt-1">
                        Emitido em {new Date(p.criadoEm).toLocaleDateString('pt-BR')} às {new Date(p.criadoEm).toLocaleTimeString('pt-BR')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Diligências de Adequação Técnica */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-slate-600" />
                <span>Diligências Técnicas ({demanda.diligencias?.length || 0})</span>
              </h3>

              {demanda.diligencias?.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Nenhuma diligência registrada.</p>
              ) : (
                <div className="space-y-3">
                  {demanda.diligencias.map((d: any) => (
                    <div key={d.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800">UERN ({d.solicitanteNome}):</span>
                          <span className="text-[10px] text-slate-400">{new Date(d.criadoEm).toLocaleDateString('pt-BR')}</span>
                        </div>
                        <p className="text-slate-600 mt-0.5">{d.descricaoDiligencia}</p>
                      </div>

                      {d.respostaContratada ? (
                        <div className="pt-2 border-t border-slate-200 text-blue-900">
                          <span className="font-bold block">Resposta da Contratada:</span>
                          <p className="mt-0.5 text-slate-700">{d.respostaContratada}</p>
                        </div>
                      ) : (
                        isEmpresa && (
                          <button
                            onClick={() => {
                              setDiligenciaSelecionadaId(d.id);
                              setModalResponderDiligencia(true);
                            }}
                            className="text-[11px] text-amber-600 font-bold hover:underline"
                          >
                            Responder a esta diligência
                          </button>
                        )
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* FOTOS DE ANTES E DEPOIS */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Camera className="w-4 h-4 text-slate-600" />
              <span>Evidências Fotográficas (Antes e Depois)</span>
            </h3>

            {demanda.fotos?.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Nenhuma foto registrada.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {demanda.fotos.map((f: any) => (
                  <div key={f.id} className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      {f.tipo === 'ANTES' ? '📷 Inicial (Antes)' : '🏁 Conclusão (Depois)'}
                    </span>
                    <img
                      src={f.url}
                      alt={f.descricao || 'Foto da demanda'}
                      className="w-full h-36 object-cover rounded-xl border border-slate-200 shadow-sm"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* LINHA DO TEMPO DA DEMANDA */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Histórico de Tramitação</h3>
            <div className="space-y-3">
              {demanda.timeline?.map((t: any) => (
                <div key={t.id} className="flex items-start gap-3 text-xs border-l-2 border-slate-200 pl-4 py-1">
                  <div className="w-2 h-2 rounded-full bg-slate-400 -ml-[21px] mt-1.5" />
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800">{t.statusNovo}</span>
                      <span className="text-[11px] text-slate-400">
                        {new Date(t.criadoEm).toLocaleDateString('pt-BR')} às {new Date(t.criadoEm).toLocaleTimeString('pt-BR')}
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium">({t.responsavel})</span>
                    </div>
                    {t.observacao && <p className="text-slate-600 leading-relaxed">{t.observacao}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>

      {/* MODAL: PROPOSTA DE EXECUÇÃO DE DEMANDA (EMPRESA) */}
      {modalProposta && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 sm:p-8 space-y-6 shadow-xl border border-slate-200 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Proposta de Execução de Demanda (Padrão SINAPI / ART)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Submissão sob inteira responsabilidade técnica da contratada.
                </p>
              </div>
              <button onClick={() => setModalProposta(false)} className="text-slate-400 font-bold">
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                executarAcaoDemanda('SUBMETER_PROPOSTA_EMPRESA', {
                  responsavelTecnicoNome: rtNome,
                  registroProfissional: rtRegistro,
                  artNumero,
                  artArquivoUrl,
                  prazoExecucaoDias: parseInt(prazoDias),
                  regimeMaoObra,
                  justificativaMaoObra: regimeMaoObra === 'FIXA_RESIDENTE' ? justificativaMO : null,
                  itens: itensProposta,
                });
              }}
              className="space-y-5 text-xs"
            >
              {/* Responsabilidade Técnica */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Engenheiro / Responsável Técnico *</label>
                  <input
                    type="text"
                    required
                    placeholder="Nome completo do RT"
                    value={rtNome}
                    onChange={(e) => setRtNome(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Registro Profissional (CREA/CAU) *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: CREA-RN 12345/D"
                    value={rtRegistro}
                    onChange={(e) => setRtRegistro(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Número da ART / RRT *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 2026/0129384"
                    value={artNumero}
                    onChange={(e) => setArtNumero(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono font-bold"
                  />
                </div>
              </div>

              {/* Mão de Obra e Prazo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Regime de Mão de Obra *</label>
                  <select
                    value={regimeMaoObra}
                    onChange={(e: any) => setRegimeMaoObra(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold"
                  >
                    <option value="EVENTUAL">Serviço Eventual (Mão de Obra Incorporada no SINAPI)</option>
                    <option value="FIXA_RESIDENTE">Utilizar Mão de Obra Residente (Apenas Insumos Orçados)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Prazo de Execução (Dias Úteis) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={prazoDias}
                    onChange={(e) => setPrazoDias(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold"
                  />
                </div>
              </div>

              {regimeMaoObra === 'FIXA_RESIDENTE' && (
                <div className="space-y-1 bg-amber-50 p-3 rounded-xl border border-amber-200">
                  <label className="font-semibold text-amber-900">
                    Justificativa Obrigatória de Uso da Mão de Obra Residente *
                  </label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Demonstre que o emprego da equipe residente neste serviço não prejudicará os atendimentos corretivos diários..."
                    value={justificativaMO}
                    onChange={(e) => setJustificativaMO(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-amber-200 rounded-lg"
                  />
                </div>
              )}

              {/* Itens Orçados */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                    Planilha de Insumos e Serviços (SINAPI Preferencial)
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddItemProposta}
                    className="text-xs text-amber-700 font-bold hover:underline"
                  >
                    + Adicionar Linha Manual
                  </button>
                </div>

                {/* BUSCA RÁPIDA NO SINAPI */}
                <div className="relative bg-amber-50/70 p-3 rounded-xl border border-amber-200 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-amber-900">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      <span>Busca Rápida na Base SINAPI Oficial (RN - 12/2025)</span>
                    </span>
                    <span className="text-[10px] text-amber-700 font-normal">
                      14.961 itens oficiais com preços medianos RN
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Digite o código (ex: 88316) ou palavras-chave (ex: pintura latex, piso ceramica, disjuntor)..."
                      value={buscaSinapi}
                      onChange={(e) => setBuscaSinapi(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                    {buscandoSinapi && (
                      <span className="absolute right-3 top-2 text-[10px] text-slate-400">Buscando...</span>
                    )}
                  </div>

                  {/* RESULTADOS DA BUSCA */}
                  {resultadosSinapi.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-300 rounded-xl shadow-xl max-h-56 overflow-y-auto z-50 divide-y divide-slate-100 text-xs">
                      {resultadosSinapi.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => handleAdicionarItemDoSinapi(item)}
                          className="p-2.5 hover:bg-amber-50 cursor-pointer flex items-center justify-between gap-3 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-amber-700">{item.codigo}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 font-semibold text-slate-600">
                                {item.unidadeMedida}
                              </span>
                            </div>
                            <p className="text-slate-800 font-medium truncate mt-0.5" title={item.descricao}>
                              {item.descricao}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-mono font-bold text-slate-900 block">
                              R$ {item.precoUnitario ? item.precoUnitario.toFixed(2) : '0,00'}
                            </span>
                            <span className="text-[10px] text-emerald-700 font-bold hover:underline">
                              + Incluir na Proposta
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto border border-slate-200 p-2 rounded-xl">
                  {itensProposta.map((it, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-slate-50 p-2 rounded-lg text-xs">
                      <select
                        value={it.fonteReferencia}
                        onChange={(e) => handleUpdateItemProposta(idx, 'fonteReferencia', e.target.value)}
                        className="col-span-2 px-2 py-1 bg-white border border-slate-200 rounded"
                      >
                        <option value="SINAPI">SINAPI</option>
                        <option value="ORSE">ORSE</option>
                        <option value="SEINFRA">SEINFRA</option>
                        <option value="SICRO">SICRO</option>
                        <option value="COTACAO_MERCADO">3 Cotações</option>
                      </select>

                      <input
                        type="text"
                        placeholder="Cód."
                        value={it.codigoItem}
                        onChange={(e) => handleUpdateItemProposta(idx, 'codigoItem', e.target.value)}
                        className="col-span-2 px-2 py-1 bg-white border border-slate-200 rounded font-mono"
                      />

                      <input
                        type="text"
                        placeholder="Descrição do serviço/insumo"
                        required
                        value={it.descricao}
                        onChange={(e) => handleUpdateItemProposta(idx, 'descricao', e.target.value)}
                        className="col-span-4 px-2 py-1 bg-white border border-slate-200 rounded"
                      />

                      <input
                        type="text"
                        placeholder="Un."
                        value={it.unidadeMedida}
                        onChange={(e) => handleUpdateItemProposta(idx, 'unidadeMedida', e.target.value)}
                        className="col-span-1 px-1 py-1 bg-white border border-slate-200 rounded text-center"
                      />

                      <input
                        type="number"
                        step="0.01"
                        placeholder="Qtd"
                        required
                        value={it.quantidade}
                        onChange={(e) => handleUpdateItemProposta(idx, 'quantidade', e.target.value)}
                        className="col-span-1 px-1 py-1 bg-white border border-slate-200 rounded text-right font-mono"
                      />

                      <input
                        type="number"
                        step="0.01"
                        placeholder="Valor Unit."
                        required
                        value={it.valorUnitario}
                        onChange={(e) => handleUpdateItemProposta(idx, 'valorUnitario', e.target.value)}
                        className="col-span-1 px-1 py-1 bg-white border border-slate-200 rounded text-right font-mono"
                      />

                      <button
                        type="button"
                        onClick={() => handleRemoveItemProposta(idx)}
                        className="col-span-1 text-rose-500 font-bold hover:text-rose-700 text-center"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>

                <div className="text-right font-bold text-slate-900 text-sm">
                  Total Estimado da Proposta: R$ {totalCalculadoProposta.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalProposta(false)}
                  className="px-4 py-2 text-slate-600 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={processandoAcao}
                  className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg shadow-sm"
                >
                  {processandoAcao ? 'Submetendo...' : 'Submeter Proposta Técnica'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SOLICITAR DILIGÊNCIA (FISCAL / GESTOR) */}
      {modalDiligencia && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900">Solicitar Adequação Técnica (Diligência)</h3>
            <textarea
              rows={4}
              placeholder="Descreva detalhadamente os apontamentos para que a empresa revise quantidades ou itens orçados..."
              value={textoDiligencia}
              onChange={(e) => setTextoDiligencia(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
            />
            <div className="flex justify-end gap-2 text-xs">
              <button onClick={() => setModalDiligencia(false)} className="px-3 py-1.5 text-slate-600">
                Cancelar
              </button>
              <button
                onClick={() => executarAcaoDemanda('SOLICITAR_DILIGENCIA', { descricaoDiligencia: textoDiligencia })}
                disabled={processandoAcao}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg"
              >
                Enviar Diligência
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: RESPONDER DILIGÊNCIA (EMPRESA) */}
      {modalResponderDiligencia && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900">Responder à Diligência da Fiscalização</h3>
            <textarea
              rows={4}
              placeholder="Apresente as justificativas e adequações realizadas..."
              value={textoRespostaDiligencia}
              onChange={(e) => setTextoRespostaDiligencia(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
            />
            <div className="flex justify-end gap-2 text-xs">
              <button onClick={() => setModalResponderDiligencia(false)} className="px-3 py-1.5 text-slate-600">
                Cancelar
              </button>
              <button
                onClick={() =>
                  executarAcaoDemanda('RESPONDER_DILIGENCIA', {
                    diligenciaId: diligenciaSelecionadaId,
                    respostaContratada: textoRespostaDiligencia,
                  })
                }
                disabled={processandoAcao}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg"
              >
                Enviar Resposta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EMITIR PARECER DA SOBE */}
      {modalParecerSobe && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200 text-xs">
            <h3 className="text-sm font-bold text-slate-900">Parecer Técnico da SOBE</h3>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-1.5 font-semibold text-slate-700 cursor-pointer">
                <input
                  type="radio"
                  checked={parecerFavoravel}
                  onChange={() => setParecerFavoravel(true)}
                />
                <span className="text-emerald-700 font-bold">Parecer Favorável</span>
              </label>
              <label className="flex items-center gap-1.5 font-semibold text-slate-700 cursor-pointer">
                <input
                  type="radio"
                  checked={!parecerFavoravel}
                  onChange={() => setParecerFavoravel(false)}
                />
                <span className="text-rose-700 font-bold">Parecer Desfavorável</span>
              </label>
            </div>
            <textarea
              rows={4}
              placeholder="Fundamentação técnica da Superintendência de Obras e Engenharia..."
              value={parecerTexto}
              onChange={(e) => setParecerTexto(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setModalParecerSobe(false)} className="px-3 py-1.5 text-slate-600">
                Cancelar
              </button>
              <button
                onClick={() =>
                  executarAcaoDemanda('EMITIR_PARECER_SOBE', {
                    favoravel: parecerFavoravel,
                    parecerTexto,
                  })
                }
                disabled={processandoAcao}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg"
              >
                Emitir Parecer SOBE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONTESTAR VALORES (AFERIÇÃO UERN) */}
      {modalContestarValores && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200 text-xs">
            <h3 className="text-sm font-bold text-slate-900">Contestação de Valores (Aferição UERN)</h3>
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Novo Valor Homologado pela UERN (R$) *</label>
              <input
                type="number"
                step="0.01"
                placeholder="Ex: 8500.00"
                value={valorContestado}
                onChange={(e) => setValorContestado(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Justificativa Técnica da Glosa / Aferição *</label>
              <textarea
                rows={3}
                placeholder="Aponte itens sobrevalorizados ou referências SINAPI divergentes..."
                value={motivoContestacao}
                onChange={(e) => setMotivoContestacao(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setModalContestarValores(false)} className="px-3 py-1.5 text-slate-600">
                Cancelar
              </button>
              <button
                onClick={() =>
                  executarAcaoDemanda('CONTESTAR_VALORES', {
                    valorContestado,
                    motivoContestacao,
                  })
                }
                disabled={processandoAcao}
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg"
              >
                Homologar Contestação
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DECLARAR CONCLUSÃO (EMPRESA) */}
      {modalConcluirEmpresa && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200 text-xs">
            <h3 className="text-sm font-bold text-slate-900">Prestação de Contas & Conclusão do Serviço</h3>
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Fotografia da Conclusão (DEPOIS) *</label>
              <input
                type="file"
                accept="image/*"
                required
                onChange={handleFotoDepoisUpload}
                className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700"
              />
              {fotoDepoisBase64 && <p className="text-[10px] text-emerald-600 font-semibold">✓ Fotografia anexada</p>}
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Relatório Resumido de Execução</label>
              <textarea
                rows={3}
                placeholder="Informações sobre acabamentos e materiais empregados..."
                value={relatorioExecucao}
                onChange={(e) => setRelatorioExecucao(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setModalConcluirEmpresa(false)} className="px-3 py-1.5 text-slate-600">
                Cancelar
              </button>
              <button
                onClick={() =>
                  executarAcaoDemanda('CONCLUIR_EXECUCAO_EMPRESA', {
                    relatorioExecucao,
                    fotoDepoisUrl: fotoDepoisBase64,
                  })
                }
                disabled={processandoAcao || !fotoDepoisBase64}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg"
              >
                Concluir e Enviar para Aceite
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ACEITE DA UNIDADE DEMANDANTE (5 DIAS ÚTEIS) */}
      {modalAceiteUnidade && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200 text-xs">
            <h3 className="text-sm font-bold text-slate-900">Validação e Aceite da Unidade Demandante</h3>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-1.5 font-semibold text-slate-700 cursor-pointer">
                <input
                  type="radio"
                  checked={aceiteAprovado}
                  onChange={() => setAceiteAprovado(true)}
                />
                <span className="text-emerald-700 font-bold">Aprovar e Liquidar Serviço</span>
              </label>
              <label className="flex items-center gap-1.5 font-semibold text-slate-700 cursor-pointer">
                <input
                  type="radio"
                  checked={!aceiteAprovado}
                  onChange={() => setAceiteAprovado(false)}
                />
                <span className="text-rose-700 font-bold">Reprovar (Exigir Correções)</span>
              </label>
            </div>

            {!aceiteAprovado && (
              <div className="space-y-1">
                <label className="font-semibold text-rose-800">
                  Motivo da Reprovação (A empresa terá 5 dias úteis para sanar) *
                </label>
                <textarea
                  rows={3}
                  placeholder="Aponte os vícios, defeitos ou serviços incompletos..."
                  value={motivoReprovacao}
                  onChange={(e) => setMotivoReprovacao(e.target.value)}
                  className="w-full px-3 py-2 bg-rose-50 border border-rose-200 rounded-lg text-rose-900"
                />
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button onClick={() => setModalAceiteUnidade(false)} className="px-3 py-1.5 text-slate-600">
                Cancelar
              </button>
              <button
                onClick={() =>
                  executarAcaoDemanda('DECIDIR_ACEITE_UNIDADE', {
                    aprovado: aceiteAprovado,
                    motivoReprovacao: !aceiteAprovado ? motivoReprovacao : null,
                  })
                }
                disabled={processandoAcao}
                className={`px-4 py-1.5 text-white font-bold rounded-lg ${
                  aceiteAprovado ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {aceiteAprovado ? 'Homologar Aprovação' : 'Enviar Reprovação para Correção'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR DADOS DA DEMANDA (ADMIN / GESTOR) */}
      {modalEditarDemanda && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-xl border border-slate-200 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Edit className="w-5 h-5 text-amber-500" />
                <span>Editar Dados da Demanda #{demanda.numero}</span>
              </h3>
              <button
                onClick={() => setModalEditarDemanda(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Título da Demanda</label>
              <input
                type="text"
                value={editTitulo}
                onChange={(e) => setEditTitulo(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Descrição do Problema / Serviço</label>
              <textarea
                rows={4}
                value={editDescricao}
                onChange={(e) => setEditDescricao(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Status Atual no Fluxo</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 bg-slate-50"
                >
                  <option value="SUBMETIDA">SUBMETIDA</option>
                  <option value="APROVADA_PROAD">APROVADA_PROAD</option>
                  <option value="ENVIADA_EMPRESA">ENVIADA_EMPRESA (Aguardando Orçamento)</option>
                  <option value="AGUARDANDO_SOBE">AGUARDANDO_SOBE (Projeto SOBE)</option>
                  <option value="PROPOSTA_EM_ANALISE">PROPOSTA_EM_ANALISE</option>
                  <option value="EM_DILIGENCIA">EM_DILIGENCIA</option>
                  <option value="CONTESTADA_UERN">CONTESTADA_UERN</option>
                  <option value="AUTORIZADA">AUTORIZADA</option>
                  <option value="EM_EXECUCAO">EM_EXECUCAO</option>
                  <option value="AGUARDANDO_ACEITE_UNIDADE">AGUARDANDO_ACEITE_UNIDADE</option>
                  <option value="EM_CORRECAO_EMPRESA">EM_CORRECAO_EMPRESA</option>
                  <option value="CONCLUIDA">CONCLUIDA</option>
                  <option value="CANCELADA">CANCELADA</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Estimativa de Custo (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={editEstimativa}
                  onChange={(e) => setEditEstimativa(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Localização Específica / Detalhes</label>
              <input
                type="text"
                value={editLocalizacaoDetalhada}
                onChange={(e) => setEditLocalizacaoDetalhada(e.target.value)}
                placeholder="Ex: Bloco A, Sala 04, Laboratório..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Justificativa / Observações da Demanda</label>
              <textarea
                rows={3}
                value={editJustificativa}
                onChange={(e) => setEditJustificativa(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Motivo do Ajuste / Histórico (Opcional)</label>
              <input
                type="text"
                value={editObservacaoEdicao}
                onChange={(e) => setEditObservacaoEdicao(e.target.value)}
                placeholder="Ex: Correção de descrição conforme planilha da Reitoria..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModalEditarDemanda(false)}
                className="px-3.5 py-1.5 text-slate-600 hover:text-slate-800 font-medium"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() =>
                  executarAcaoDemanda('EDITAR_DEMANDA', {
                    titulo: editTitulo,
                    descricaoProblema: editDescricao,
                    justificativa: editJustificativa,
                    estimativaDemandante: editEstimativa,
                    status: editStatus,
                    localizacaoDetalhada: editLocalizacaoDetalhada,
                    observacaoEdicao: editObservacaoEdicao,
                  })
                }
                disabled={processandoAcao}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-950 text-white font-bold rounded-lg shadow-sm"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
