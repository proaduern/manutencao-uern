import React from 'react';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
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
  FileText,
  DollarSign,
  User,
  ShieldCheck,
  Send,
  ThumbsUp,
  RotateCcw,
} from 'lucide-react';
import Link from 'next/link';

interface Props {
  params: { id: string };
}

export default async function DetalheChamadoPage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect('/login');

  const chamado = {
    id: params.id,
    numero: 42,
    titulo: 'Vazamento hidráulico no Bloco de Aulas',
    setorEspecifico: 'Bloco IV - Sala 12 (Subsolo)',
    descricao:
      'Existe um vazamento contínuo na tubulação de esgoto sob a pia do laboratório, infiltrando na parede e gerando risco de alagamento da sala de aula vizinha.',
    status: 'EM_ORCAMENTO',
    statusTexto: 'Em orçamento pela empresa',
    urgencia: 'CRITICO',
    prazoTexto: 'Faltam 4h',
    prazoClasse: 'apertado',
    unidadeNome: 'Campus Central / Mossoró',
    categoriaNome: 'Instalações Hidráulicas e Sanitárias',
    tipoServicoNome: 'Vazamento em tubulação',
    abertoPorNome: 'Prof. Carlos Eduardo',
    abertoEm: '24/09/2026 às 14:30',
    valorOrcado: 'R$ 840,00',
    valorAutorizado: null,
    insumos: [
      {
        codigo: 'SINAPI-91188',
        descricao: 'Tubo de PVC rígido soldável, esgoto predial, DN 50 mm',
        unidade: 'm',
        quantidade: 3.5,
        valorUnitario: 32.5,
        valorTotal: 113.75,
      },
      {
        codigo: 'SINAPI-91194',
        descricao: 'Joelho 90 graus, PVC rígido esgoto predial, DN 50 mm',
        unidade: 'un',
        quantidade: 2,
        valorUnitario: 14.8,
        valorTotal: 29.6,
      },
      {
        codigo: 'SINAPI-88316',
        descricao: 'Encanador ou bombeiro hidráulico com encargos complementares',
        unidade: 'h',
        quantidade: 6,
        valorUnitario: 45.0,
        valorTotal: 270.0,
      },
      {
        codigo: 'SINAPI-88317',
        descricao: 'Auxiliar de encanador com encargos complementares',
        unidade: 'h',
        quantidade: 6,
        valorUnitario: 31.0,
        valorTotal: 186.0,
      },
    ],
    timeline: [
      {
        quando: '24/09/2026 14:30',
        autor: 'Prof. Carlos Eduardo',
        acao: 'Chamado aberto pelo demandante',
      },
      {
        quando: '24/09/2026 14:45',
        autor: 'Sistema',
        acao: 'Classificado com Urgência Nível 1 (Crítico) — Prazo de 24h iniciado',
      },
      {
        quando: '24/09/2026 15:10',
        autor: 'Empresa Manutenção Ltda',
        acao: 'Vistoria técnica preliminar e elaboração de orçamento de insumos',
      },
    ],
  };

  const isFiscalOuGestor =
    session.role === 'ADMIN' ||
    session.role === 'GESTOR_CONTRATO' ||
    session.role === 'FISCAL_TECNICO' ||
    session.role === 'FISCAL_ADM';

  return (
    <div className="min-h-screen flex bg-slate-50">
      <Sidebar role={session.role} />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar user={session} />

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
                  <span className="text-sm font-mono font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded">
                    #{chamado.numero.toString().padStart(4, '0')}
                  </span>
                  <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                    {chamado.titulo}
                  </h1>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {chamado.unidadeNome} &bull; {chamado.setorEspecifico}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2.5">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                Urgência {chamado.urgencia}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                {chamado.statusTexto}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Coluna Principal: Detalhes, Insumos e Decisão */}
            <div className="lg:col-span-2 space-y-6">
              {/* Card de Informações e Descrição */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-[#003366]" />
                  <span>Descrição e Localização</span>
                </h2>

                <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                  {chamado.descricao}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
                  <div>
                    <span className="text-slate-400 block font-medium">Categoria & Serviço:</span>
                    <span className="font-semibold text-slate-800">
                      {chamado.categoriaNome} — {chamado.tipoServicoNome}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Solicitante:</span>
                    <span className="font-semibold text-slate-800">
                      {chamado.abertoPorNome} ({chamado.abertoEm})
                    </span>
                  </div>
                </div>
              </div>

              {/* Tabela de Insumos e Orçamento (Padrão SINAPI UERN) */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    <span>Planilha de Insumos / Orçamento (SINAPI)</span>
                  </h2>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                    Total: {chamado.valorOrcado}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-semibold">
                        <th className="py-2.5 px-3">Código</th>
                        <th className="py-2.5 px-3">Descrição do Insumo / Serviço</th>
                        <th className="py-2.5 px-2 text-center">Unid.</th>
                        <th className="py-2.5 px-2 text-right">Qtd.</th>
                        <th className="py-2.5 px-3 text-right">Unitário</th>
                        <th className="py-2.5 px-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {chamado.insumos.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/60">
                          <td className="py-2.5 px-3 font-mono font-medium text-slate-600">{item.codigo}</td>
                          <td className="py-2.5 px-3 text-slate-800 font-medium">{item.descricao}</td>
                          <td className="py-2.5 px-2 text-center text-slate-500">{item.unidade}</td>
                          <td className="py-2.5 px-2 text-right font-mono text-slate-700">{item.quantidade}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                            R$ {item.valorUnitario.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900">
                            R$ {item.valorTotal.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Painel de Decisão por Alçada (Gestor / Fiscal) */}
              {isFiscalOuGestor && (
                <div className="bg-white p-6 rounded-2xl border-2 border-[#003366]/20 shadow-sm space-y-4">
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
                    <ShieldCheck className="w-4 h-4 text-[#003366]" />
                    <span>Despacho e Autorização por Alçada</span>
                  </h2>

                  <p className="text-xs text-slate-500">
                    O valor orçado (R$ 840,00) está dentro do saldo disponível da cota da unidade e dentro de sua alçada técnica.
                  </p>

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <button
                      type="button"
                      className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-colors flex items-center justify-center space-x-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Autorizar Execução</span>
                    </button>

                    <button
                      type="button"
                      className="px-5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold text-xs rounded-xl transition-colors flex items-center justify-center space-x-2"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Recusar / Solicitar Ajuste</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Coluna Lateral: Linha do Tempo e Informações do Contrato */}
            <div className="space-y-6">
              {/* Linha do Tempo / Timeline */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-[#003366]" />
                  <span>Linha do Tempo</span>
                </h3>

                <div className="relative pl-6 space-y-4 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {chamado.timeline.map((item, idx) => (
                    <div key={idx} className="relative">
                      <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-[#003366] ring-4 ring-white" />
                      <p className="text-[11px] font-mono text-slate-400">{item.quando}</p>
                      <p className="text-xs font-semibold text-slate-800 mt-0.5">{item.acao}</p>
                      <p className="text-[11px] text-slate-500">{item.autor}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status Contratual */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3 text-xs">
                <h3 className="font-bold text-slate-900 uppercase tracking-wider">
                  Contrato de Manutenção
                </h3>
                <div className="space-y-1.5 text-slate-600">
                  <p><strong className="text-slate-800">Contrato:</strong> CT 014/2025 - PROAD</p>
                  <p><strong className="text-slate-800">Empresa:</strong> Manutenção Predial UERN Ltda.</p>
                  <p><strong className="text-slate-800">Prazo Máximo:</strong> 24 horas (Serviço Crítico)</p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
