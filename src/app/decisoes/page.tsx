'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import {
  CheckSquare,
  AlertTriangle,
  Building,
  CheckCircle2,
  XCircle,
  FileText,
  DollarSign,
  ChevronRight,
  ShieldCheck,
  Check,
  X,
} from 'lucide-react';
import Link from 'next/link';

export default function FilaDecisoesPage() {
  const [user, setUser] = useState<any>(null);
  const [fila, setFila] = useState<any[]>([]);
  const [ratificacoes, setRatificacoes] = useState<any[]>([]);
  const [itensPendentes, setItensPendentes] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [justificativas, setJustificativas] = useState<Record<string, string>>({});
  const [processandoId, setProcessandoId] = useState<string | null>(null);

  const carregarDados = () => {
    setCarregando(true);
    fetch('/api/decisoes')
      .then((res) => res.json())
      .then((data) => {
        setFila(data.filaAutorizacao || []);
        setRatificacoes(data.ratificacoes || []);
        setItensPendentes(data.itensPendentes || []);
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

    carregarDados();
  }, []);

  const decidirAlcada = async (chamadoId: string, autorizar: boolean) => {
    const just = justificativas[chamadoId]?.trim() || '';
    if (!autorizar && just.length < 10) {
      alert('A recusa de orçamento exige justificativa com pelo menos 10 caracteres.');
      return;
    }

    setProcessandoId(chamadoId);
    try {
      const res = await fetch(`/api/chamados/${chamadoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acao: 'DECIDIR_ALCADA',
          autorizar,
          justificativa: just,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao processar');
      alert(data.mensagem || 'Decisão registrada com sucesso!');
      carregarDados();
    } catch (err: any) {
      alert(err.message || 'Erro');
    } finally {
      setProcessandoId(null);
    }
  };

  const homologarPreco = async (itemId: string, aprovado: boolean) => {
    try {
      const res = await fetch('/api/decisoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acao: 'HOMOLOGAR_ITEM',
          itemId,
          aprovado,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert(data.mensagem || 'Preço processado!');
      carregarDados();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const nadaPendente = fila.length === 0 && ratificacoes.length === 0 && itensPendentes.length === 0;

  return (
    <div className="min-h-screen flex bg-slate-50">
      <Sidebar role={user?.role || 'FISCAL_TECNICO'} />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar user={user || { nome: 'Carregando...', role: 'FISCAL_TECNICO' }} />

        <main className="flex-1 p-6 md:p-8 max-w-6xl w-full mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Fila de Decisões e Alçadas
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Chamados aguardando parecer técnico, autorização de orçamento, ratificação emergencial ou homologação de preços.
            </p>
          </div>

          {carregando ? (
            <div className="text-center py-12 text-xs text-slate-400">Carregando pendências de decisão...</div>
          ) : nadaPendente ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <p className="text-sm font-semibold text-slate-800">Nada aguardando decisão no momento.</p>
              <p className="text-xs text-slate-400">Todas as alçadas e orçamentos estão em dia.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* 1. Autorização de Alçada Orçamentária */}
              {fila.length > 0 && (
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
                      <ShieldCheck className="w-4 h-4 text-[#003366]" />
                      <span>Autorização de Alçada Orçamentária</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      O valor agregado considera tudo o que a mesma unidade orçou na mesma categoria nos últimos 30 dias.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {fila.map((f) => (
                      <div key={f.id} className="p-5 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors bg-slate-50/50 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-mono font-bold text-slate-600 bg-slate-200 px-2 py-0.5 rounded">
                              #{f.numero.toString().padStart(4, '0')}
                            </span>
                            <span className="text-sm font-bold text-slate-900">{f.tipoServico?.nome}</span>
                          </div>
                          <div className="flex items-center space-x-3 text-xs">
                            <span className="font-semibold text-slate-700">Chamado: R$ {parseFloat(f.valorChamado).toFixed(2)}</span>
                            <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              Agregado 30d: R$ {parseFloat(f.valorAgregado30d).toFixed(2)}
                            </span>
                          </div>
                        </div>

                        <p className="text-xs text-slate-600">
                          <span className="font-semibold text-slate-800">{f.unidade?.nome}</span> &bull; {f.setorEspecifico}
                        </p>
                        <p className="text-xs text-slate-500 italic bg-white p-2.5 rounded border border-slate-200">
                          "{f.descricao}"
                        </p>

                        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <input
                            type="text"
                            placeholder="Justificativa (obrigatória para recusa, mín. 10 chars)..."
                            value={justificativas[f.id] || ''}
                            onChange={(e) => setJustificativas({ ...justificativas, [f.id]: e.target.value })}
                            className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded text-xs"
                          />

                          <div className="flex items-center space-x-2 shrink-0">
                            <button
                              onClick={() => decidirAlcada(f.id, false)}
                              disabled={processandoId === f.id}
                              className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded text-xs font-semibold"
                            >
                              Recusar
                            </button>

                            <button
                              onClick={() => decidirAlcada(f.id, true)}
                              disabled={processandoId === f.id}
                              className="px-4 py-1.5 bg-[#003366] hover:bg-[#002244] text-white rounded text-xs font-semibold shadow-sm"
                            >
                              Autorizar
                            </button>

                            <Link
                              href={`/chamados/${f.id}`}
                              className="p-1.5 text-slate-400 hover:text-slate-600"
                              title="Ver detalhes"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. Ratificação de Execução Emergencial */}
              {ratificacoes.length > 0 && (
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span>Ratificação de Execução Emergencial</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Serviços executados previamente sem orçamento por risco iminente, que excederam o teto de alçada.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {ratificacoes.map((r) => (
                      <div key={r.id} className="p-4 rounded-xl border border-slate-200 bg-white flex items-center justify-between">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-mono font-bold text-slate-500">#{r.numero}</span>
                            <span className="text-xs font-bold text-slate-900">{r.tipoServico?.nome}</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            {r.unidade?.nome} &bull; Orçado: R$ {parseFloat(r.valorOrcado).toFixed(2)}
                          </p>
                        </div>

                        <Link
                          href={`/chamados/${r.id}`}
                          className="px-3 py-1.5 bg-slate-900 text-white rounded text-xs font-semibold"
                        >
                          Ratificar no Chamado
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. Homologação de Preços Avulsos */}
              {itensPendentes.length > 0 && (
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
                      <DollarSign className="w-4 h-4 text-emerald-600" />
                      <span>Preços Aguardando Homologação</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Itens lançados pela empresa fora da tabela de referência oficial. Ao homologar, passam a ser reutilizáveis.
                    </p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-semibold">
                          <th className="py-2.5 px-3">Código</th>
                          <th className="py-2.5 px-3">Descrição</th>
                          <th className="py-2.5 px-3">Un.</th>
                          <th className="py-2.5 px-3 text-right">Valor Unitário</th>
                          <th className="py-2.5 px-3">Tabela</th>
                          <th className="py-2.5 px-3 text-center">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {itensPendentes.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50/60">
                            <td className="py-2.5 px-3 font-mono font-medium text-slate-700">{item.codigo}</td>
                            <td className="py-2.5 px-3 text-slate-800">{item.descricao}</td>
                            <td className="py-2.5 px-3 text-slate-600">{item.unidadeMedida}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                              R$ {parseFloat(item.precoUnitario).toFixed(2)}
                            </td>
                            <td className="py-2.5 px-3 text-slate-500">{item.tabela?.nome || 'SINAPI'}</td>
                            <td className="py-2.5 px-3 text-center">
                              <div className="flex items-center justify-center space-x-2">
                                <button
                                  onClick={() => homologarPreco(item.id, true)}
                                  className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded text-xs font-semibold"
                                >
                                  Homologar
                                </button>
                                <button
                                  onClick={() => homologarPreco(item.id, false)}
                                  className="px-2.5 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded text-xs font-semibold"
                                >
                                  Rejeitar
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
