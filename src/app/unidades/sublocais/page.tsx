'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import {
  DoorOpen,
  Plus,
  Edit2,
  Trash2,
  Building2,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Layers,
  MapPin,
  Tag,
  Wrench,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';

export default function SublocaisUnidadePage() {
  const [user, setUser] = useState<any>(null);
  const [sublocais, setSublocais] = useState<any[]>([]);
  const [unidades, setUnidades] = useState<any[]>([]);
  const [tiposAmbiente, setTiposAmbiente] = useState<any[]>([]);
  const [prediosDaUnidade, setPrediosDaUnidade] = useState<any[]>([]);

  // Filtros
  const [unidadeSelecionadaId, setUnidadeSelecionadaId] = useState<string>('');
  const [busca, setBusca] = useState('');
  const [filtroPredio, setFiltroPredio] = useState('TODOS');
  const [filtroTipoAmbiente, setFiltroTipoAmbiente] = useState('TODOS');

  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  // Modal Cadastro / Edição
  const [modalAberto, setModalAberto] = useState(false);
  const [sublocalEditando, setSublocalEditando] = useState<any>(null);
  const [formSublocal, setFormSublocal] = useState({
    nome: '',
    descricao: '',
    tipoAmbienteId: '',
    predioId: '',
    unidadeId: '',
  });

  const carregarDadosIniciais = async () => {
    setCarregando(true);
    try {
      const resUser = await fetch('/api/auth/me');
      const dataUser = await resUser.json();
      const usuarioLogado = dataUser.user;
      setUser(usuarioLogado);

      const resCat = await fetch('/api/catalogos');
      const dataCat = await resCat.json();
      setTiposAmbiente(dataCat.ambientes || []);
      setUnidades(dataCat.unidades || []);

      let idUnidadeInicial = '';
      if (usuarioLogado?.role === 'GESTOR_UNIDADE' || usuarioLogado?.role === 'DEMANDANTE') {
        idUnidadeInicial = usuarioLogado.unidadeId || '';
      } else if (dataCat.unidades && dataCat.unidades.length > 0) {
        idUnidadeInicial = dataCat.unidades[0].id;
      }
      setUnidadeSelecionadaId(idUnidadeInicial);

      await carregarSublocais(idUnidadeInicial);
    } catch (err: any) {
      console.error(err);
      setMensagem({ tipo: 'erro', texto: 'Erro ao carregar dados: ' + err.message });
      setCarregando(false);
    }
  };

  const carregarSublocais = async (uId?: string) => {
    const targetId = uId || unidadeSelecionadaId;
    if (!targetId && user?.role !== 'ADMIN') return;

    setCarregando(true);
    try {
      const url = targetId ? `/api/unidades/sublocais?unidadeId=${targetId}` : '/api/unidades/sublocais';
      const res = await fetch(url);
      const data = await res.json();
      setSublocais(data.sublocais || []);
      setCarregando(false);
    } catch (err: any) {
      console.error(err);
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarDadosIniciais();
  }, []);

  // Atualizar prédios da unidade quando a unidade selecionada mudar
  useEffect(() => {
    if (unidadeSelecionadaId && unidades.length > 0) {
      const u = unidades.find((item) => item.id === unidadeSelecionadaId);
      setPrediosDaUnidade(u?.predios || []);
      carregarSublocais(unidadeSelecionadaId);
    }
  }, [unidadeSelecionadaId, unidades]);

  const unidadeAtual = unidades.find((u) => u.id === unidadeSelecionadaId);

  const abrirModalNovo = () => {
    setSublocalEditando(null);
    setFormSublocal({
      nome: '',
      descricao: '',
      tipoAmbienteId: tiposAmbiente[0]?.id?.toString() || '',
      predioId: prediosDaUnidade[0]?.id || '',
      unidadeId: unidadeSelecionadaId,
    });
    setModalAberto(true);
  };

  const abrirModalEditar = (sub: any) => {
    setSublocalEditando(sub);
    setFormSublocal({
      nome: sub.nome || '',
      descricao: sub.descricao || '',
      tipoAmbienteId: sub.tipoAmbienteId?.toString() || '',
      predioId: sub.predioId || '',
      unidadeId: sub.unidadeId || unidadeSelecionadaId,
    });
    setModalAberto(true);
  };

  const salvarSublocal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSublocal.nome.trim()) {
      setMensagem({ tipo: 'erro', texto: 'Informe o nome do sublocal/ambiente.' });
      return;
    }
    if (!formSublocal.tipoAmbienteId) {
      setMensagem({ tipo: 'erro', texto: 'Selecione o tipo de ambiente.' });
      return;
    }

    try {
      const metodo = sublocalEditando ? 'PUT' : 'POST';
      const payload: any = {
        ...formSublocal,
        id: sublocalEditando ? sublocalEditando.id : undefined,
        unidadeId: formSublocal.unidadeId || unidadeSelecionadaId,
      };

      const res = await fetch('/api/unidades/sublocais', {
        method: metodo,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setMensagem({ tipo: 'erro', texto: data.error || 'Erro ao salvar sublocal.' });
        return;
      }

      setMensagem({
        tipo: 'sucesso',
        texto: sublocalEditando ? 'Sublocal atualizado com sucesso!' : 'Novo sublocal cadastrado com sucesso!',
      });
      setModalAberto(false);
      carregarSublocais();
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: 'Erro de comunicação: ' + err.message });
    }
  };

  const excluirSublocal = async (id: string, nome: string) => {
    if (!confirm(`Deseja realmente excluir ou inativar o sublocal "${nome}"?`)) return;

    try {
      const res = await fetch(`/api/unidades/sublocais?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        setMensagem({ tipo: 'erro', texto: data.error || 'Erro ao excluir sublocal.' });
        return;
      }

      setMensagem({
        tipo: 'sucesso',
        texto: data.inativado ? 'Sublocal possui chamados vinculados e foi inativado com segurança.' : 'Sublocal excluído com sucesso!',
      });
      carregarSublocais();
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao excluir: ' + err.message });
    }
  };

  // Filtragem dos sublocais na tela
  const sublocaisFiltrados = sublocais.filter((s) => {
    if (filtroPredio !== 'TODOS' && s.predioId !== filtroPredio) return false;
    if (filtroTipoAmbiente !== 'TODOS' && s.tipoAmbienteId?.toString() !== filtroTipoAmbiente) return false;
    if (busca.trim()) {
      const termo = busca.toLowerCase();
      return (
        s.nome.toLowerCase().includes(termo) ||
        (s.descricao && s.descricao.toLowerCase().includes(termo)) ||
        (s.tipoAmbiente?.nome && s.tipoAmbiente.nome.toLowerCase().includes(termo)) ||
        (s.predio?.nome && s.predio.nome.toLowerCase().includes(termo))
      );
    }
    return true;
  });

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      <Sidebar role={user?.role} userName={user?.nome} />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Navbar user={user} />

        <main className="p-6 max-w-7xl w-full mx-auto space-y-6">
          {/* Cabeçalho */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Link
                  href="/unidades"
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
                  title="Voltar para Unidades"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Link>
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                  <DoorOpen className="w-7 h-7 text-indigo-700" />
                  Sublocais e Ambientes da Unidade
                </h1>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                Cadastre e padronize as salas de aula, laboratórios, auditórios e setores específicos da sua unidade para agilizar a abertura de chamados.
              </p>
            </div>

            <button
              onClick={abrirModalNovo}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white font-medium rounded-lg shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              Novo Sublocal / Ambiente
            </button>
          </div>

          {/* Feedback */}
          {mensagem && (
            <div
              className={`p-4 rounded-lg flex items-center justify-between shadow-sm transition-all ${
                mensagem.tipo === 'sucesso'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {mensagem.tipo === 'sucesso' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                )}
                <span className="text-sm font-medium">{mensagem.texto}</span>
              </div>
              <button onClick={() => setMensagem(null)} className="text-xs text-slate-400 hover:text-slate-600 font-semibold p-1">
                ✕
              </button>
            </div>
          )}

          {/* Banner de Identificação da Unidade */}
          <div className="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-2xl p-5 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">
                Unidade Demandante Selecionada
              </span>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Building2 className="w-5 h-5 text-amber-400" />
                {unidadeAtual ? `${unidadeAtual.nome} (${unidadeAtual.sigla})` : 'Carregando unidade...'}
              </h2>
              <p className="text-xs text-slate-300">
                Campus {unidadeAtual?.campus || '—'} • {prediosDaUnidade.length} prédio(s) vinculado(s):{' '}
                {prediosDaUnidade.map((p) => p.nome).join(', ') || 'Nenhum prédio cadastrado'}
              </p>
            </div>

            {/* Seletor de Unidade para ADMIN */}
            {user?.role === 'ADMIN' && (
              <div className="bg-white/10 backdrop-blur-md p-2.5 rounded-xl border border-white/20 min-w-[260px]">
                <label className="block text-[11px] font-semibold text-indigo-200 uppercase mb-1">
                  Trocar Unidade Demandante:
                </label>
                <select
                  value={unidadeSelecionadaId}
                  onChange={(e) => setUnidadeSelecionadaId(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-900 text-white border border-indigo-400/40 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  {unidades.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nome} ({u.campus})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Cards de Métricas */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700">
                <DoorOpen className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-800">{sublocais.length}</div>
                <div className="text-xs text-slate-500 font-medium">Sublocais Cadastrados</div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-700">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-800">{prediosDaUnidade.length}</div>
                <div className="text-xs text-slate-500 font-medium">Prédios / Sedes Vinculadas</div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700">
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-800">
                  {sublocais.reduce((acc, curr) => acc + (curr._count?.chamados || 0), 0)}
                </div>
                <div className="text-xs text-slate-500 font-medium">Chamados Atendidos nos Espaços</div>
              </div>
            </div>
          </div>

          {/* Filtros e Busca */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar sala, laboratório, setor..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              {/* Filtro por Prédio */}
              {prediosDaUnidade.length > 1 && (
                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={filtroPredio}
                    onChange={(e) => setFiltroPredio(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-none"
                  >
                    <option value="TODOS">Todos os Prédios</option>
                    {prediosDaUnidade.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nome}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Filtro por Tipo de Ambiente */}
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={filtroTipoAmbiente}
                  onChange={(e) => setFiltroTipoAmbiente(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-none"
                >
                  <option value="TODOS">Todos os Tipos de Ambiente</option>
                  {tiposAmbiente.map((ta) => (
                    <option key={ta.id} value={ta.id.toString()}>
                      {ta.nome}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Tabela de Sublocais */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">Sublocal / Ambiente</th>
                    <th className="px-5 py-3.5">Tipo de Ambiente</th>
                    <th className="px-5 py-3.5">Prédio / Sede</th>
                    <th className="px-5 py-3.5">Localização / Descrição</th>
                    <th className="px-5 py-3.5">Chamados</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {carregando ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-8 text-center text-slate-400 text-xs">
                        Carregando sublocais...
                      </td>
                    </tr>
                  ) : sublocaisFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-10 text-center text-slate-400">
                        <DoorOpen className="w-8 h-8 text-slate-300 mx-auto mb-2 opacity-60" />
                        <p className="text-sm font-medium text-slate-600">Nenhum sublocal encontrado.</p>
                        <p className="text-xs text-slate-400 mt-1">
                          Cadastre salas de aula, laboratórios, gabinetes ou auditórios clicando em "+ Novo Sublocal / Ambiente".
                        </p>
                      </td>
                    </tr>
                  ) : (
                    sublocaisFiltrados.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/80 transition">
                        <td className="px-5 py-3.5 font-medium text-slate-900">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                            {s.nome}
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            <Tag className="w-3 h-3 opacity-70" />
                            {s.tipoAmbiente?.nome || '—'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-slate-700 font-medium">
                          <div className="flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            {s.predio?.nome || <span className="text-slate-400 italic">Sede Geral</span>}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-slate-500">
                          {s.descricao || <span className="text-slate-400 italic">Não detalhado</span>}
                        </td>
                        <td className="px-5 py-3.5 text-xs font-mono font-medium text-slate-700">
                          {s._count?.chamados || 0}
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                              s.ativo ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {s.ativo ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => abrirModalEditar(s)}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition"
                              title="Editar Sublocal"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => excluirSublocal(s.id, s.nome)}
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                              title="Excluir Sublocal"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Modal de Cadastro / Edição */}
          {modalAberto && (
            <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4">
                <div className="flex justify-between items-center border-b pb-3">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <DoorOpen className="w-5 h-5 text-indigo-700" />
                    {sublocalEditando ? 'Editar Sublocal / Ambiente' : 'Novo Sublocal / Ambiente'}
                  </h3>
                  <button onClick={() => setModalAberto(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">
                    ✕
                  </button>
                </div>

                <form onSubmit={salvarSublocal} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                      Nome do Sublocal / Ambiente *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Sala de Aula A4, Laboratório de Ginecologia, Sala Multiuso II"
                      value={formSublocal.nome}
                      onChange={(e) => setFormSublocal({ ...formSublocal, nome: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Identificação precisa da sala ou espaço para os técnicos de manutenção.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                        Tipo de Ambiente Vinculado *
                      </label>
                      <select
                        required
                        value={formSublocal.tipoAmbienteId}
                        onChange={(e) => setFormSublocal({ ...formSublocal, tipoAmbienteId: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white font-medium"
                      >
                        <option value="">Selecione o tipo...</option>
                        {tiposAmbiente.map((ta) => (
                          <option key={ta.id} value={ta.id.toString()}>
                            {ta.nome}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                        Prédio / Sede Vinculada
                      </label>
                      <select
                        value={formSublocal.predioId}
                        onChange={(e) => setFormSublocal({ ...formSublocal, predioId: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white font-medium"
                      >
                        <option value="">Sede Geral da Unidade</option>
                        {prediosDaUnidade.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nome}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                      Localização Complementar / Observações
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Bloco B, 1º Andar, ao lado da coordenação"
                      value={formSublocal.descricao}
                      onChange={(e) => setFormSublocal({ ...formSublocal, descricao: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-3 border-t">
                    <button
                      type="button"
                      onClick={() => setModalAberto(false)}
                      className="px-4 py-2 border text-slate-600 rounded-lg text-sm hover:bg-slate-50 transition"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg text-sm font-semibold shadow-sm transition"
                    >
                      {sublocalEditando ? 'Salvar Alterações' : 'Cadastrar Sublocal'}
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
