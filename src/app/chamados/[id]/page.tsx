'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import {
  Wrench,
  ArrowLeft,
  Clock,
  Building,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  FileText,
  DollarSign,
  User,
  ShieldCheck,
  Send,
  ThumbsUp,
  RotateCcw,
  Camera,
  Trash2,
  Check,
  X,
  Edit2,
  MessageSquare,
} from 'lucide-react';
import Link from 'next/link';

interface Props {
  params: { id: string };
}

export default function DetalheChamadoPage({ params }: Props) {
  const [user, setUser] = useState<any>(null);
  const [chamado, setChamado] = useState<any>(null);
  const [tabelas, setTabelas] = useState<any[]>([]);
  const [funcionarios, setFuncionarios] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState('');
  const [msgSucesso, setMsgSucesso] = useState('');

  // Formulário de Orçamento (Empresa)
  const [tabelaSelecionadaId, setTabelaSelecionadaId] = useState('');
  const [itensOrcamento, setItensOrcamento] = useState<any[]>([]);
  const [novoCod, setNovoCod] = useState('');
  const [novoDesc, setNovoDesc] = useState('');
  const [novoUn, setNovoUn] = useState('un');
  const [novoQtd, setNovoQtd] = useState('');
  const [novoVal, setNovoVal] = useState('');

  // Iniciar Execução (Empresa)
  const [maoObra, setMaoObra] = useState('FIXA');
  const [funcionarioId, setFuncionarioId] = useState('');
  const [houveDeslocamento, setHouveDeslocamento] = useState(false);
  const [diasDeslocamento, setDiasDeslocamento] = useState('1');
  const [justificativaDeslocamento, setJustificativaDeslocamento] = useState('');
  const [trabalhadorDeslocado, setTrabalhadorDeslocado] = useState('');

  // Prestação de Contas (Empresa)
  const [horasExecucao, setHorasExecucao] = useState('');
  const [fotoDepoisBase64, setFotoDepoisBase64] = useState<string | null>(null);

  // Validação (Demandante)
  const [notaAvaliacao, setNotaAvaliacao] = useState<number | null>(null);
  const [obsValidacao, setObsValidacao] = useState('');

  // Decisão de Alçada (Fiscalização)
  const [justificativaFiscal, setJustificativaFiscal] = useState('');

  const carregarDados = () => {
    setCarregando(true);
    fetch(`/api/chamados/${params.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.chamado) {
          setChamado(data.chamado);
          if (data.chamado.maoObra) setMaoObra(data.chamado.maoObra);
          if (data.chamado.funcionarioId) setFuncionarioId(data.chamado.funcionarioId);
          if (data.chamado.houveDeslocamento !== undefined) setHouveDeslocamento(Boolean(data.chamado.houveDeslocamento));
          if (data.chamado.diasDeslocamento) setDiasDeslocamento(data.chamado.diasDeslocamento.toString());
          if (data.chamado.justificativaDeslocamento) setJustificativaDeslocamento(data.chamado.justificativaDeslocamento);
          if (data.chamado.trabalhadorDeslocado) setTrabalhadorDeslocado(data.chamado.trabalhadorDeslocado);
        } else {
          setErro(data.error || 'Chamado não encontrado.');
        }
        setCarregando(false);
      })
      .catch((err) => {
        setErro('Erro de conexão ao carregar chamado.');
        setCarregando(false);
      });
  };

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setUser(data.user);
      });

    fetch('/api/catalogos')
      .then((res) => res.json())
      .then((data) => {
        if (data.tabelas) {
          setTabelas(data.tabelas);
          if (data.tabelas[0]) setTabelaSelecionadaId(data.tabelas[0].id);
        }
        if (data.funcionarios) setFuncionarios(data.funcionarios);
      });

    carregarDados();
  }, [params.id]);

  // Adicionar item ao orçamento local
  const adicionarItemOrcamento = () => {
    if (!novoCod || !novoDesc) return alert('Informe código e descrição do insumo.');
    const qtd = parseFloat(novoQtd);
    const val = parseFloat(novoVal);
    if (!qtd || qtd <= 0) return alert('A quantidade deve ser maior que zero.');
    if (isNaN(val) || val < 0) return alert('Informe um valor unitário válido.');

    setItensOrcamento([
      ...itensOrcamento,
      {
        codigo: novoCod,
        descricao: novoDesc,
        unidadeMedida: novoUn || 'un',
        quantidade: qtd,
        valorUnitario: val,
        valorTotal: qtd * val,
      },
    ]);

    setNovoCod('');
    setNovoDesc('');
    setNovoQtd('');
    setNovoVal('');
  };

  // Selecionar item rápido do SINAPI
  const selecionarItemSinapi = (item: any) => {
    setNovoCod(item.codigo);
    setNovoDesc(item.descricao);
    setNovoUn(item.unidadeMedida);
    setNovoVal(parseFloat(item.precoUnitario).toString());
  };

  // Interação e Comentários da Unidade
  const [novoComentario, setNovoComentario] = useState('');
  const [fotoAdicionalBase64, setFotoAdicionalBase64] = useState<string | null>(null);

  // Modal de Edição pelo Administrador
  const [modalEditarAdmin, setModalEditarAdmin] = useState(false);
  const [editAdminForm, setEditAdminForm] = useState({
    setorEspecifico: '',
    descricao: '',
    status: '',
    nivelCodigo: '',
  });

  const abrirEditarAdmin = () => {
    setEditAdminForm({
      setorEspecifico: chamado.setorEspecifico || '',
      descricao: chamado.descricao || '',
      status: chamado.status || '',
      nivelCodigo: chamado.nivelCodigo || 'NORMAL',
    });
    setModalEditarAdmin(true);
  };

  const executarAcao = async (acao: string, payload: any = {}) => {
    setErro('');
    setMsgSucesso('');
    setProcessando(true);

    try {
      const res = await fetch(`/api/chamados/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao, ...payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao executar ação.');

      setMsgSucesso(data.mensagem || 'Ação registrada com sucesso!');
      carregarDados();
    } catch (err: any) {
      setErro(err.message || 'Erro inesperado.');
    } finally {
      setProcessando(false);
    }
  };

  const salvarEdicaoAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    await executarAcao('EDITAR_ADMIN', editAdminForm);
    setModalEditarAdmin(false);
  };

  const excluirChamadoAdmin = async () => {
    if (!confirm(`Tem certeza absoluta que deseja excluir o chamado #${chamado.numero.toString().padStart(4, '0')} e todo o seu histórico?`)) return;

    try {
      setProcessando(true);
      const res = await fetch(`/api/chamados/${params.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao excluir chamado.');

      alert(data.mensagem || 'Chamado excluído com sucesso.');
      window.location.href = '/chamados';
    } catch (err: any) {
      setErro(err.message);
      setProcessando(false);
    }
  };

  const enviarComentarioUnidade = async () => {
    if (!novoComentario || novoComentario.trim().length < 3) {
      alert('Digite uma mensagem com ao menos 3 caracteres.');
      return;
    }
    await executarAcao('COMENTAR', { mensagem: novoComentario });
    setNovoComentario('');
  };

  const enviarFotoAdicional = async () => {
    if (!fotoAdicionalBase64) return alert('Selecione uma foto para anexar.');
    await executarAcao('ANEXAR_FOTO', { url: fotoAdicionalBase64, tipo: 'COMPROVANTE' });
    setFotoAdicionalBase64(null);
  };

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-xs text-slate-500">
        Carregando detalhes do chamado...
      </div>
    );
  }

  if (!chamado) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-xs text-rose-500">
        {erro || 'Chamado não encontrado.'}
      </div>
    );
  }

  const isEmpresa = user?.role === 'EMPRESA';
  const isAdmin = user?.role === 'ADMIN';
  const isDemandante = user?.role === 'DEMANDANTE';
  const isDemandanteUnidade =
    (user?.role === 'DEMANDANTE' && (user?.unidadeId === chamado.unidadeId || user?.id === chamado.abertoPorId)) ||
    user?.role === 'ADMIN';
  const isFiscalOuGestor =
    user?.role === 'ADMIN' ||
    user?.role === 'GESTOR_CONTRATO' ||
    user?.role === 'FISCAL_TECNICO' ||
    user?.role === 'FISCAL_ADM';

  const itensPrevistos = chamado.insumos?.filter((i: any) => i.tipoInsumo === 'PREVISTO') || [];
  const itensExecutados = chamado.insumos?.filter((i: any) => i.tipoInsumo === 'EXECUTADO') || [];

  return (
    <div className="min-h-screen flex bg-slate-50">
      <Sidebar role={user?.role || 'DEMANDANTE'} />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar user={user || { nome: 'Carregando...', role: 'DEMANDANTE' }} />

        <main className="flex-1 p-6 md:p-8 max-w-6xl w-full mx-auto space-y-6">
          {/* Navegação e Cabeçalho do Chamado */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <Link
                href="/chamados"
                className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-mono font-bold text-slate-600 bg-slate-200 px-2.5 py-0.5 rounded">
                    #{chamado.numero.toString().padStart(4, '0')}
                  </span>
                  <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                    {chamado.tipoServico?.nome || chamado.titulo}
                  </h1>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {chamado.unidade?.nome} &bull; {chamado.setorEspecifico}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
              {chamado.nivelCodigo ? (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                  Urgência {chamado.nivelCodigo}
                </span>
              ) : chamado.fraseUrgencia?.frase ? (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Impacto: {chamado.fraseUrgencia.frase}
                </span>
              ) : null}

              <span
                className={`px-3 py-1 rounded-full text-xs font-bold border ${
                  chamado.status === 'BLOQUEADO_SEM_SALDO'
                    ? 'bg-rose-100 text-rose-800 border-rose-300 font-extrabold'
                    : chamado.status === 'AGUARDANDO_AUTORIZACAO'
                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                    : chamado.status === 'AUTORIZADO'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : chamado.status === 'EM_EXECUCAO'
                    ? 'bg-blue-100 text-blue-800 border-blue-300'
                    : chamado.status === 'ATENDIDO'
                    ? 'bg-purple-100 text-purple-800 border-purple-300'
                    : chamado.status === 'EM_GARANTIA'
                    ? 'bg-teal-100 text-teal-800 border-teal-300'
                    : 'bg-slate-100 text-slate-800 border-slate-300'
                }`}
              >
                {chamado.status.replace(/_/g, ' ')}
              </span>

              {chamado.prazoTexto && (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {chamado.prazoTexto}
                </span>
              )}

              {isAdmin && (
                <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
                  <button
                    onClick={abrirEditarAdmin}
                    className="flex items-center space-x-1 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 transition"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-slate-600" />
                    <span>Editar</span>
                  </button>
                  <button
                    onClick={excluirChamadoAdmin}
                    className="flex items-center space-x-1 px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-lg border border-rose-200 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>Excluir</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {erro && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg flex items-center space-x-2 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{erro}</span>
            </div>
          )}

          {msgSucesso && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center space-x-2 text-xs text-emerald-700">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
              <span>{msgSucesso}</span>
            </div>
          )}

          {/* Dados Gerais do Chamado */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center space-x-2">
              <FileText className="w-4 h-4 text-[#003366]" />
              <span>Informações do Chamado</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600">
              <div>
                <span className="text-slate-400 block font-medium">Unidade / Campus:</span>
                <span className="font-semibold text-slate-800">{chamado.unidade?.nome}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Prédio / Bloco:</span>
                <span className="font-semibold text-slate-800">{chamado.predio?.nome || 'Central'}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Local Exato:</span>
                <span className="font-semibold text-slate-800">
                  {chamado.sublocal ? (
                    <span className="inline-flex items-center gap-1 text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded text-[11px] font-bold mr-1.5">
                      📍 {chamado.sublocal.nome}
                    </span>
                  ) : null}
                  {chamado.setorEspecifico}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Categoria do Serviço:</span>
                <span className="font-semibold text-slate-800">{chamado.tipoServico?.categoria?.nome}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Tipo de Ambiente:</span>
                <span className="font-semibold text-slate-800">{chamado.tipoAmbiente?.nome}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Solicitante:</span>
                <span className="font-semibold text-slate-800">{chamado.abertoPor?.nome}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Aberto em:</span>
                <span className="font-semibold text-slate-800">
                  {new Date(chamado.abertoEm).toLocaleString('pt-BR')}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Prazo Limite (SLA):</span>
                <span className="font-semibold text-slate-800">
                  {chamado.prazoLimite ? new Date(chamado.prazoLimite).toLocaleString('pt-BR') : '—'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Garantia até:</span>
                <span className="font-semibold text-slate-800">
                  {chamado.garantiaAte ? new Date(chamado.garantiaAte).toLocaleDateString('pt-BR') : '—'}
                </span>
              </div>
            </div>

            <div className="pt-2">
              <span className="text-slate-400 block text-xs font-medium mb-1">Descrição do Problema:</span>
              <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200 leading-relaxed">
                {chamado.descricao}
              </p>
            </div>

            {chamado.funcionario && (
              <div className="pt-2 flex items-center space-x-2 text-xs">
                <span className="text-slate-400">Profissional Alocado:</span>
                <span className="font-semibold text-slate-800">
                  {chamado.funcionario.nome} ({chamado.funcionario.cargo}) &bull; Mão de Obra {chamado.maoObra}
                </span>
              </div>
            )}

            {/* Rubrica Orçamentária e Deslocamento Vinculados */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-[#003366]" />
                  Enquadramento em Rubrica Orçamentária do Contrato
                </span>
                {chamado.maoObra === 'EVENTUAL' ? (
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                    Rubrica: Serviços Eventuais (Sob Demanda)
                  </span>
                ) : (
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-800 border border-purple-200">
                    Rubrica: Insumos sob Demanda (Mão de Obra Residente)
                  </span>
                )}
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed">
                {chamado.maoObra === 'EVENTUAL'
                  ? 'Este atendimento é realizado por serviços eventuais. A despesa global (mão de obra eventual + materiais aplicados) é debitada da rubrica de Serviços Eventuais do contrato.'
                  : 'Atendimento executado pela equipe de mão de obra residente (custo fixo mensal contratado). Apenas as peças e materiais utilizados são debitados da rubrica de Insumos sob Demanda.'}
              </p>

              {chamado.houveDeslocamento && (
                <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-teal-900">
                        🚗 Deslocamento de Sede Informado ({chamado.diasDeslocamento || 1} diária(s))
                      </span>
                      <span className="bg-teal-200/60 text-teal-800 px-2 py-0.2 rounded font-mono font-bold text-[10px]">
                        Rubrica de Diárias
                      </span>
                    </div>
                    <div className="text-[11px] text-teal-700 mt-1">
                      {chamado.trabalhadorDeslocado && (
                        <span>Trabalhador: <strong>{chamado.trabalhadorDeslocado}</strong> &bull; </span>
                      )}
                      <span>Motivo: {chamado.justificativaDeslocamento || 'Atendimento intercampi fora da sede de lotação'}</span>
                    </div>
                  </div>
                  <div className="text-right sm:border-l sm:border-teal-200 sm:pl-3">
                    <span className="text-[10px] text-teal-600 block uppercase font-bold">Valor Debitado</span>
                    <strong className="text-teal-900 font-mono text-sm">
                      R$ {Number(chamado.valorTotalDiarias || ((chamado.diasDeslocamento || 1) * (chamado.valorDiariaUnitario || 150))).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </strong>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Galeria de Fotos (Antes e Depois) */}
          {chamado.fotos && chamado.fotos.length > 0 && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center space-x-2">
                <Camera className="w-4 h-4 text-[#003366]" />
                <span>Registro Fotográfico</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {chamado.fotos.map((f: any) => (
                  <div key={f.id} className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                    <img src={f.url} alt={`Registro ${f.tipo}`} className="w-full h-48 object-cover" />
                    <div className="p-2.5 text-[11px] font-medium text-slate-600 flex items-center justify-between">
                      <span className="font-bold text-slate-800">{f.tipo === 'ANTES' ? 'Registro do Antes' : 'Registro do Depois'}</span>
                      <span className="text-slate-400">{new Date(f.criadoEm).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tabela de Insumos Orçados (Previsto) */}
          {itensPrevistos.length > 0 && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
                  <DollarSign className="w-4 h-4 text-[#003366]" />
                  <span>Orçamento de Insumos Previstos</span>
                </h2>
                <span className="text-xs font-bold text-slate-800">
                  Total: R$ {parseFloat(chamado.valorOrcado || 0).toFixed(2)}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-semibold">
                      <th className="py-2.5 px-3">Código</th>
                      <th className="py-2.5 px-3">Descrição do Insumo</th>
                      <th className="py-2.5 px-3">Un.</th>
                      <th className="py-2.5 px-3 text-right">Qtd</th>
                      <th className="py-2.5 px-3 text-right">Unitário</th>
                      <th className="py-2.5 px-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {itensPrevistos.map((i: any) => (
                      <tr key={i.id} className="hover:bg-slate-50/60">
                        <td className="py-2.5 px-3 font-mono font-medium text-slate-600">{i.codigo}</td>
                        <td className="py-2.5 px-3 text-slate-800">{i.descricao}</td>
                        <td className="py-2.5 px-3 text-slate-600">{i.unidadeMedida}</td>
                        <td className="py-2.5 px-3 text-right font-mono">{parseFloat(i.quantidade).toFixed(2)}</td>
                        <td className="py-2.5 px-3 text-right font-mono">R$ {parseFloat(i.valorUnitario).toFixed(2)}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                          R$ {parseFloat(i.valorTotal).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* ALERTA E DESBLOQUEIO: BLOQUEADO POR FALTA DE SALDO (SEÇÃO 4 E 8) */}
          {/* ================================================================= */}
          {chamado.status === 'BLOQUEADO_SEM_SALDO' && (
            <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-6 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                <span>CHAMADO BLOQUEADO POR INSUFICIÊNCIA DE SALDO ORÇAMENTÁRIO (SEÇÃO 8)</span>
              </div>
              <p className="text-xs text-rose-700 leading-relaxed">
                Este chamado foi bloqueado automaticamente porque a <strong>cota orçamentária da unidade demandante</strong> ou o <strong>saldo global do contrato</strong> não possui saldo suficiente para empenhar o valor orçado de <strong>R$ {Number(chamado.totalPrevisto || chamado.valorOrcado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>.
              </p>
              <p className="text-[11px] text-rose-600">
                A gestão do contrato e a fiscalização administrativa foram notificadas para inclusão de termo aditivo de valor ou suplementação da cota da unidade.
              </p>

              {isFiscalOuGestor && (
                <div className="pt-3 border-t border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-rose-900">
                    Houve reforço orçamentário ou termo aditivo no contrato?
                  </span>
                  <button
                    onClick={() => executarAcao('DESBLOQUEAR_SALDO')}
                    disabled={processando}
                    className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-bold transition-colors shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{processando ? 'Verificando saldo...' : 'Reavaliar e Desbloquear Chamado'}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ================================================================= */}
          {/* PAINEL INTERATIVO FISCAL / GESTOR: AUTORIZAÇÃO DE ALÇADA ORÇAMENTÁRIA */}
          {/* ================================================================= */}
          {isFiscalOuGestor && chamado.status === 'AGUARDANDO_AUTORIZACAO' && (
            <div className="bg-white p-6 rounded-2xl border-2 border-amber-300 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-amber-100 gap-2">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                  <span>Decisão de Alçada Orçamentária Pendente</span>
                </div>
                <span className="text-xs font-mono font-bold text-amber-900 bg-amber-100 px-3 py-1 rounded-full border border-amber-200">
                  Orçamento: R$ {Number(chamado.totalPrevisto || chamado.valorOrcado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <p className="text-xs text-slate-600">
                O orçamento excede a alçada direta ou o acúmulo de 30 dias na categoria. A deliberação por qualquer fiscal técnico, fiscal administrativo ou gestor de contrato encerra a decisão.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 pt-2 justify-end">
                <button
                  onClick={() => {
                    const just = prompt('Informe a justificativa da recusa de orçamento (mínimo 10 caracteres):');
                    if (just) {
                      executarAcao('DECIDIR_ALCADA', { autorizar: false, justificativa: just });
                    }
                  }}
                  disabled={processando}
                  className="px-4 py-2.5 rounded-lg border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-semibold"
                >
                  Recusar Orçamento
                </button>
                <button
                  onClick={() => executarAcao('DECIDIR_ALCADA', { autorizar: true })}
                  disabled={processando}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm"
                >
                  {processando ? 'Autorizando...' : 'Autorizar e Provisionar no Contrato'}
                </button>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* PAINEL INTERATIVO 1: EMPRESA - ORÇAMENTO */}
          {/* ================================================================= */}
          {isEmpresa && ['RECEBIDO', 'EM_ORCAMENTO'].includes(chamado.status) && (
            <div className="bg-white p-6 rounded-2xl border border-blue-200 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-blue-900 uppercase tracking-wider pb-2 border-b border-blue-100 flex items-center space-x-2">
                <Wrench className="w-4 h-4 text-blue-600" />
                <span>Formulação de Orçamento de Insumos</span>
              </h2>

              <p className="text-xs text-slate-500">
                Adicione insumos da tabela oficial ou códigos específicos. O botão "Enviar Orçamento" aciona a verificação de alçada.
              </p>

              {/* Inclusão de Item */}
              <div className="grid grid-cols-1 sm:grid-cols-6 gap-2 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div className="sm:col-span-1">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Código</label>
                  <input
                    type="text"
                    placeholder="Ex: SINAPI-91188"
                    value={novoCod}
                    onChange={(e) => setNovoCod(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Descrição</label>
                  <input
                    type="text"
                    placeholder="Descrição do insumo ou serviço"
                    value={novoDesc}
                    onChange={(e) => setNovoDesc(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded"
                  />
                </div>
                <div className="sm:col-span-1">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Unidade</label>
                  <input
                    type="text"
                    placeholder="un, m, h"
                    value={novoUn}
                    onChange={(e) => setNovoUn(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded"
                  />
                </div>
                <div className="sm:col-span-1">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Qtd</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="1"
                    value={novoQtd}
                    onChange={(e) => setNovoQtd(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded"
                  />
                </div>
                <div className="sm:col-span-1">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Unitário</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="R$"
                    value={novoVal}
                    onChange={(e) => setNovoVal(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded"
                  />
                </div>
                <div className="sm:col-span-6 flex justify-between items-center pt-2">
                  <span className="text-[11px] text-slate-400">
                    💡 Itens fora da tabela SINAPI entram pendentes de homologação pela fiscalização técnica.
                  </span>
                  <button
                    type="button"
                    onClick={adicionarItemOrcamento}
                    className="px-3 py-1.5 bg-slate-800 text-white rounded text-xs font-semibold hover:bg-slate-700"
                  >
                    + Incluir Insumo
                  </button>
                </div>
              </div>

              {/* Lista dos Insumos Adicionados */}
              {itensOrcamento.length > 0 && (
                <div className="space-y-2 pt-2">
                  <span className="text-xs font-bold text-slate-800 block">Itens deste orçamento:</span>
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white text-xs">
                    {itensOrcamento.map((it, idx) => (
                      <div key={idx} className="p-3 flex items-center justify-between">
                        <div>
                          <span className="font-mono font-bold text-slate-700">{it.codigo}</span> &bull; {it.descricao}
                          <span className="text-slate-400 ml-2">({it.quantidade} {it.unidadeMedida} x R$ {it.valorUnitario.toFixed(2)})</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className="font-bold text-slate-900 font-mono">R$ {it.valorTotal.toFixed(2)}</span>
                          <button
                            onClick={() => setItensOrcamento(itensOrcamento.filter((_, i) => i !== idx))}
                            className="text-rose-500 hover:text-rose-700 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end pt-3">
                    <button
                      onClick={() => executarAcao('ENVIAR_ORCAMENTO', { itens: itensOrcamento, tabelaId: tabelaSelecionadaId })}
                      disabled={processando}
                      className="px-6 py-2.5 bg-[#003366] hover:bg-[#002244] text-white text-xs font-semibold rounded-lg shadow-sm"
                    >
                      {processando ? 'Verificando alçada...' : 'Enviar Orçamento Oficial'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================================================================= */}
          {/* PAINEL INTERATIVO 2: EMPRESA - INICIAR EXECUÇÃO */}
          {/* ================================================================= */}
          {isEmpresa && ['AUTORIZADO', 'DEVOLVIDO', 'REABERTO_GARANTIA'].includes(chamado.status) && (
            <div className="bg-white p-6 rounded-2xl border border-emerald-200 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-emerald-900 uppercase tracking-wider pb-2 border-b border-emerald-100 flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Iniciar Execução dos Serviços</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Tipo de Mão de Obra</label>
                  <select
                    value={maoObra}
                    onChange={(e) => setMaoObra(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                  >
                    <option value="FIXA">Mão de Obra Fixa (Profissional Alocado - Custo Fixo)</option>
                    <option value="EVENTUAL">Mão de Obra Eventual (Rubrica Serviços Eventuais)</option>
                  </select>
                </div>

                {maoObra === 'FIXA' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Profissional Responsável</label>
                    <select
                      value={funcionarioId}
                      onChange={(e) => setFuncionarioId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                    >
                      <option value="">Selecione o funcionário...</option>
                      {funcionarios.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.nome} &bull; {f.cargo} ({f.cidadeLotacao || 'Mossoró'})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Deslocamento de sede para equipe residente */}
                <div className="sm:col-span-2 bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={houveDeslocamento}
                      onChange={(e) => setHouveDeslocamento(e.target.checked)}
                      className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
                    />
                    <span className="text-xs font-bold text-slate-800">
                      🚗 Necessário deslocamento de mão de obra residente para outra sede/campus
                    </span>
                  </label>
                  {houveDeslocamento && (
                    <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-slate-200 text-xs">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">Qtd. Dias Deslocamento *</label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={diasDeslocamento}
                          onChange={(e) => setDiasDeslocamento(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-bold text-teal-800"
                        />
                        <span className="text-[10px] text-teal-700 mt-0.5 block">
                          ~ R$ {((parseInt(diasDeslocamento, 10) || 1) * 150).toFixed(2)} (R$ 150/diária na rubrica)
                        </span>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">Trabalhador Deslocado</label>
                        <input
                          type="text"
                          placeholder="Ex: João Silva (Eletricista)"
                          value={trabalhadorDeslocado}
                          onChange={(e) => setTrabalhadorDeslocado(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">Justificativa do Deslocamento</label>
                        <input
                          type="text"
                          placeholder="Ex: Atendimento no Campus Assu"
                          value={justificativaDeslocamento}
                          onChange={(e) => setJustificativaDeslocamento(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() =>
                    executarAcao('INICIAR_EXECUCAO', {
                      maoObra,
                      funcionarioId,
                      houveDeslocamento,
                      diasDeslocamento,
                      justificativaDeslocamento,
                      trabalhadorDeslocado,
                    })
                  }
                  disabled={processando}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm"
                >
                  {processando ? 'Iniciando...' : 'Iniciar Execução em Campo'}
                </button>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* PAINEL INTERATIVO 3: EMPRESA - PRESTAÇÃO DE CONTAS / FOTO DO DEPOIS */}
          {/* ================================================================= */}
          {isEmpresa && chamado.status === 'EM_EXECUCAO' && (
            <div className="bg-white p-6 rounded-2xl border border-purple-200 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-purple-900 uppercase tracking-wider pb-2 border-b border-purple-100 flex items-center space-x-2">
                <Clock className="w-4 h-4 text-purple-600" />
                <span>Prestação de Contas & Encerramento</span>
              </h2>

              <p className="text-xs text-slate-500">
                Informe o tempo de execução consumido e envie a foto do serviço concluído (Registro do Depois).
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Tempo Total Gasto (horas)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    placeholder="Ex: 4.5"
                    value={horasExecucao}
                    onChange={(e) => setHorasExecucao(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Foto do Depois (Conclusão)</label>
                  {fotoDepoisBase64 ? (
                    <div className="relative inline-block border border-slate-300 rounded-lg overflow-hidden">
                      <img src={fotoDepoisBase64} alt="Depois" className="h-28 object-cover" />
                      <button
                        type="button"
                        onClick={() => setFotoDepoisBase64(null)}
                        className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = () => setFotoDepoisBase64(reader.result as string);
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                    />
                  )}
                </div>

                {/* Confirmação de deslocamento na conclusão */}
                <div className="sm:col-span-2 bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={houveDeslocamento}
                      onChange={(e) => setHouveDeslocamento(e.target.checked)}
                      className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
                    />
                    <span className="text-xs font-bold text-slate-800">
                      🚗 Houve deslocamento de equipe residente para outra sede neste chamado?
                    </span>
                  </label>
                  {houveDeslocamento && (
                    <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-slate-200 text-xs">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">Dias de Deslocamento</label>
                        <input
                          type="number"
                          min="1"
                          value={diasDeslocamento}
                          onChange={(e) => setDiasDeslocamento(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-bold text-teal-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">Trabalhador</label>
                        <input
                          type="text"
                          value={trabalhadorDeslocado}
                          onChange={(e) => setTrabalhadorDeslocado(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">Justificativa</label>
                        <input
                          type="text"
                          value={justificativaDeslocamento}
                          onChange={(e) => setJustificativaDeslocamento(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() =>
                    executarAcao('REGISTRAR_ATENDIMENTO', {
                      horas: horasExecucao,
                      fotoDepoisUrl: fotoDepoisBase64,
                      houveDeslocamento,
                      diasDeslocamento,
                      justificativaDeslocamento,
                      trabalhadorDeslocado,
                    })
                  }
                  disabled={processando}
                  className="px-6 py-2.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold rounded-lg shadow-sm"
                >
                  {processando ? 'Registrando...' : 'Registrar Atendimento e Notificar Demandante'}
                </button>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* PAINEL INTERATIVO 4: DEMANDANTE DA UNIDADE - VALIDAÇÃO (ACEITE OU DEVOLUÇÃO) */}
          {/* ================================================================= */}
          {isDemandanteUnidade && chamado.status === 'ATENDIDO' && (
            <div className="bg-white p-6 rounded-2xl border border-purple-200 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-purple-900 uppercase tracking-wider pb-2 border-b border-purple-100 flex items-center space-x-2">
                <ThumbsUp className="w-4 h-4 text-purple-600" />
                <span>Validar o Serviço Executado (Unidade Demandante)</span>
              </h2>

              <p className="text-xs text-slate-500">
                Confira no local antes de validar. Qualquer usuário vinculado a esta unidade demandante pode avaliar o serviço. Sem manifestação em até 5 dias úteis, o sistema homologa tacitamente como atendido com nota 4 ("Bom").
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-2">Qualidade do Serviço</label>
                <div className="flex space-x-2">
                  {[
                    { n: 1, label: '1 - Péssimo' },
                    { n: 2, label: '2 - Ruim' },
                    { n: 3, label: '3 - Regular' },
                    { n: 4, label: '4 - Bom' },
                    { n: 5, label: '5 - Excelente' },
                  ].map((nota) => (
                    <button
                      key={nota.n}
                      type="button"
                      onClick={() => setNotaAvaliacao(nota.n)}
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all ${
                        notaAvaliacao === nota.n
                          ? 'bg-[#003366] text-white border-[#003366] shadow'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {nota.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Observações / Parecer
                </label>
                <textarea
                  rows={3}
                  placeholder="Se tudo estiver resolvido, comente. Se for devolver, explique detalhadamente o que continua errado."
                  value={obsValidacao}
                  onChange={(e) => setObsValidacao(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  onClick={() => executarAcao('VALIDAR', { nota: notaAvaliacao, aceitar: false, observacoes: obsValidacao })}
                  disabled={processando}
                  className="px-4 py-2.5 rounded-lg border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-semibold flex items-center space-x-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Não foi resolvido, devolver (Retrabalho)</span>
                </button>

                <button
                  onClick={() => executarAcao('VALIDAR', { nota: notaAvaliacao, aceitar: true, observacoes: obsValidacao })}
                  disabled={processando}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm"
                >
                  Aceitar o Serviço (Iniciar Garantia)
                </button>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* SEÇÃO DE INTERAÇÃO & REGISTRO DA UNIDADE DEMANDANTE / FISCALIZAÇÃO */}
          {/* ================================================================= */}
          {(isDemandanteUnidade || isFiscalOuGestor || isEmpresa) && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center space-x-2">
                <MessageSquare className="w-4 h-4 text-[#003366]" />
                <span>Interação e Registros no Ambiente</span>
              </h2>

              <p className="text-xs text-slate-500">
                Os usuários vinculados a esta unidade demandante, prepostos da empresa e fiscais podem registrar andamentos ou novas evidências. O sistema identifica quem fez cada registro no ambiente.
              </p>

              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Adicione um comentário ou relato sobre a situação atual no ambiente..."
                    value={novoComentario}
                    onChange={(e) => setNovoComentario(e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#003366]"
                  />
                  <button
                    onClick={enviarComentarioUnidade}
                    disabled={processando}
                    className="px-4 py-2 bg-[#003366] hover:bg-[#002244] text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Registrar</span>
                  </button>
                </div>

                {/* Anexar Nova Foto */}
                <div className="pt-2 border-t flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <Camera className="w-4 h-4 text-slate-500" />
                    <span className="text-slate-600 font-medium">Anexar nova foto comprobatória:</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = () => setFotoAdicionalBase64(reader.result as string);
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                    />
                  </div>
                  {fotoAdicionalBase64 && (
                    <button
                      onClick={enviarFotoAdicional}
                      disabled={processando}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-md shadow-sm text-xs"
                    >
                      Enviar Foto Anexada
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* PAINEL INTERATIVO 5: FISCAL / GESTOR - APROVAÇÃO DE ALÇADA */}
          {/* ================================================================= */}
          {isFiscalOuGestor && chamado.status === 'AGUARDANDO_AUTORIZACAO' && (
            <div className="bg-white p-6 rounded-2xl border border-amber-300 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-amber-900 uppercase tracking-wider pb-2 border-b border-amber-100 flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                <span>Autorização de Alçada Orçamentária</span>
              </h2>

              <p className="text-xs text-slate-600">
                O orçamento deste chamado ultrapassou o teto direto e requer parecer da fiscalização técnica / gestão do contrato.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Justificativa (obrigatória em caso de recusa)
                </label>
                <input
                  type="text"
                  placeholder="Justificativa da fiscalização (mínimo 10 caracteres para recusa)..."
                  value={justificativaFiscal}
                  onChange={(e) => setJustificativaFiscal(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  onClick={() => executarAcao('DECIDIR_ALCADA', { autorizar: false, justificativa: justificativaFiscal })}
                  disabled={processando}
                  className="px-4 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-xs font-semibold rounded-lg"
                >
                  Recusar Orçamento
                </button>

                <button
                  onClick={() => executarAcao('DECIDIR_ALCADA', { autorizar: true })}
                  disabled={processando}
                  className="px-6 py-2 bg-[#003366] hover:bg-[#002244] text-white text-xs font-semibold rounded-lg shadow-sm"
                >
                  Autorizar Orçamento
                </button>
              </div>
            </div>
          )}

          {/* Histórico da Linha do Tempo (Auditável) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center space-x-2">
              <Clock className="w-4 h-4 text-[#003366]" />
              <span>Andamento e Linha do Tempo (Rastreabilidade)</span>
            </h2>

            <div className="relative pl-6 border-l-2 border-slate-200 space-y-6">
              {chamado.timeline && chamado.timeline.length > 0 ? (
                chamado.timeline.map((t: any) => (
                  <div key={t.id} className="relative">
                    <div className="absolute -left-[31px] top-0.5 w-3.5 h-3.5 rounded-full bg-[#003366] border-2 border-white" />
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-slate-800">{t.statusNovo.replace(/_/g, ' ')}</span>
                        <span className="text-[11px] text-slate-400">
                          &bull; {new Date(t.criadoEm).toLocaleString('pt-BR')} &bull;{' '}
                          <span className="font-semibold text-slate-700">{t.responsavel}</span>
                        </span>
                      </div>
                      {t.observacao && <p className="text-xs text-slate-600 mt-1 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">{t.observacao}</p>}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400">Sem eventos registrados.</p>
              )}
            </div>
          </div>

          {/* Modal Edição pelo Administrador */}
          {modalEditarAdmin && (
            <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4">
                <div className="flex justify-between items-center border-b pb-3">
                  <h3 className="text-lg font-bold text-slate-800">
                    Editar Chamado #{chamado.numero.toString().padStart(4, '0')} (Admin)
                  </h3>
                  <button onClick={() => setModalEditarAdmin(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">
                    ✕
                  </button>
                </div>

                <form onSubmit={salvarEdicaoAdmin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Local Exato / Setor</label>
                    <input
                      type="text"
                      required
                      value={editAdminForm.setorEspecifico}
                      onChange={(e) => setEditAdminForm({ ...editAdminForm, setorEspecifico: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Descrição do Problema</label>
                    <textarea
                      required
                      rows={3}
                      value={editAdminForm.descricao}
                      onChange={(e) => setEditAdminForm({ ...editAdminForm, descricao: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Status Manual</label>
                      <select
                        value={editAdminForm.status}
                        onChange={(e) => setEditAdminForm({ ...editAdminForm, status: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="ABERTO">Aberto</option>
                        <option value="RECEBIDO">Recebido</option>
                        <option value="EM_ORCAMENTO">Em Orçamento</option>
                        <option value="AGUARDANDO_AUTORIZACAO">Aguardando Autorização</option>
                        <option value="AUTORIZADO">Autorizado</option>
                        <option value="EM_EXECUCAO">Em Execução</option>
                        <option value="ATENDIDO">Atendido</option>
                        <option value="EM_GARANTIA">Em Garantia</option>
                        <option value="CONCLUIDO">Concluído</option>
                        <option value="RECUSADO">Recusado</option>
                        <option value="CANCELADO">Cancelado</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Nível de Urgência</label>
                      <select
                        value={editAdminForm.nivelCodigo}
                        onChange={(e) => setEditAdminForm({ ...editAdminForm, nivelCodigo: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="EMERGENCIA">Emergência</option>
                        <option value="ALTA">Alta</option>
                        <option value="NORMAL">Normal</option>
                        <option value="BAIXA">Baixa</option>
                        <option value="PLANEJADA">Planejada</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-3 border-t">
                    <button
                      type="button"
                      onClick={() => setModalEditarAdmin(false)}
                      className="px-4 py-2 border text-slate-600 rounded-lg text-sm hover:bg-slate-50 transition"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={processando}
                      className="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg text-sm font-semibold shadow-sm transition"
                    >
                      Salvar Alterações
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
