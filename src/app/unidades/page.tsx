'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { Building2, Plus, Edit2, Trash2, Phone, Mail, MapPin, CheckCircle2, AlertCircle, Search, Check, Star, DoorOpen } from 'lucide-react';

export default function UnidadesPage() {
  const [user, setUser] = useState<any>(null);
  const [unidades, setUnidades] = useState<any[]>([]);
  const [predios, setPredios] = useState<any[]>([]);
  const [abaAtiva, setAbaAtiva] = useState<'UNIDADES' | 'PREDIOS'>('UNIDADES');
  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  // Modais de Cadastro / Edição
  const [modalUnidadeAberto, setModalUnidadeAberto] = useState(false);
  const [modalPredioAberto, setModalPredioAberto] = useState(false);
  const [unidadeEditando, setUnidadeEditando] = useState<any>(null);
  const [predioEditando, setPredioEditando] = useState<any>(null);

  // Busca de Prédio dentro do Modal
  const [buscaPredio, setBuscaPredio] = useState('');

  // Form Unidade
  const [formUnidade, setFormUnidade] = useState<{
    nome: string;
    sigla: string;
    campus: string;
    email: string;
    telefone: string;
    predioIds: string[];
    cotaMensal: string;
  }>({
    nome: '',
    sigla: '',
    campus: 'MOSSORÓ',
    email: '',
    telefone: '',
    predioIds: [],
    cotaMensal: '',
  });

  // Form Prédio
  const [formPredio, setFormPredio] = useState({
    nome: '',
    campus: 'MOSSORÓ',
    endereco: '',
  });

  const carregarDados = () => {
    setCarregando(true);
    fetch('/api/admin/unidades')
      .then((res) => res.json())
      .then((data) => {
        setUnidades(data.unidades || []);
        setPredios(data.predios || []);
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
    carregarDados();
  }, []);

  const abrirNovaUnidade = () => {
    setUnidadeEditando(null);
    setBuscaPredio('');
    setFormUnidade({
      nome: '',
      sigla: '',
      campus: 'MOSSORÓ',
      email: '',
      telefone: '',
      predioIds: [],
      cotaMensal: '',
    });
    setModalUnidadeAberto(true);
  };

  const abrirEditarUnidade = (u: any) => {
    setUnidadeEditando(u);
    setBuscaPredio('');
    const idsExtraidos: string[] =
      u.predioIds && u.predioIds.length > 0
        ? u.predioIds
        : u.predios && u.predios.length > 0
        ? u.predios.map((p: any) => p.id)
        : u.predioId
        ? [u.predioId]
        : [];

    setFormUnidade({
      nome: u.nome || '',
      sigla: u.sigla || '',
      campus: u.campus || 'MOSSORÓ',
      email: u.email || '',
      telefone: u.telefone || '',
      predioIds: idsExtraidos,
      cotaMensal: u.cotaMensal ? parseFloat(u.cotaMensal).toString() : '',
    });
    setModalUnidadeAberto(true);
  };

  const togglePredioNoForm = (predioId: string) => {
    setFormUnidade((prev) => {
      const existe = prev.predioIds.includes(predioId);
      const novosIds = existe
        ? prev.predioIds.filter((id) => id !== predioId)
        : [...prev.predioIds, predioId];
      return { ...prev, predioIds: novosIds };
    });
  };

  const definirPredioPrincipalNoForm = (predioId: string) => {
    setFormUnidade((prev) => {
      const semEle = prev.predioIds.filter((id) => id !== predioId);
      return { ...prev, predioIds: [predioId, ...semEle] };
    });
  };

  const salvarUnidade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formUnidade.nome.trim()) {
      setMensagem({ tipo: 'erro', texto: 'Informe o nome da unidade demandante.' });
      return;
    }

    try {
      const metodo = unidadeEditando ? 'PUT' : 'POST';
      const payload: any = {
        ...formUnidade,
        id: unidadeEditando ? unidadeEditando.id : undefined,
      };

      const res = await fetch('/api/admin/unidades', {
        method: metodo,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setMensagem({ tipo: 'erro', texto: data.error || 'Erro ao salvar unidade.' });
        return;
      }

      setMensagem({
        tipo: 'sucesso',
        texto: unidadeEditando ? 'Unidade demandante atualizada com sucesso!' : 'Nova unidade demandante cadastrada!',
      });
      setModalUnidadeAberto(false);
      carregarDados();
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: 'Erro de comunicação: ' + err.message });
    }
  };

  const excluirUnidade = async (id: string, nome: string) => {
    if (!confirm(`Tem certeza que deseja excluir ou inativar a unidade "${nome}"?`)) return;

    try {
      const res = await fetch(`/api/admin/unidades?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        setMensagem({ tipo: 'erro', texto: data.error || 'Erro ao excluir unidade.' });
        return;
      }
      setMensagem({
        tipo: 'sucesso',
        texto: data.inativado ? 'Unidade possui vínculos históricos e foi inativada com segurança.' : 'Unidade excluída com sucesso!',
      });
      carregarDados();
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao excluir: ' + err.message });
    }
  };

  const abrirNovoPredio = () => {
    setPredioEditando(null);
    setFormPredio({ nome: '', campus: 'MOSSORÓ', endereco: '' });
    setModalPredioAberto(true);
  };

  const abrirEditarPredio = (p: any) => {
    setPredioEditando(p);
    setFormPredio({
      nome: p.nome || '',
      campus: p.campus || 'MOSSORÓ',
      endereco: p.endereco || '',
    });
    setModalPredioAberto(true);
  };

  const salvarPredio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPredio.nome.trim()) {
      setMensagem({ tipo: 'erro', texto: 'Informe o nome do prédio.' });
      return;
    }

    try {
      const metodo = predioEditando ? 'PUT' : 'POST';
      const payload: any = {
        tipo: 'PREDIO',
        ...formPredio,
        id: predioEditando ? predioEditando.id : undefined,
      };

      const res = await fetch('/api/admin/unidades', {
        method: metodo,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setMensagem({ tipo: 'erro', texto: data.error || 'Erro ao salvar prédio.' });
        return;
      }

      setMensagem({
        tipo: 'sucesso',
        texto: predioEditando ? 'Prédio atualizado com sucesso!' : 'Novo prédio cadastrado com sucesso!',
      });
      setModalPredioAberto(false);
      carregarDados();
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: 'Erro de comunicação: ' + err.message });
    }
  };

  const excluirPredio = async (id: string, nome: string) => {
    if (!confirm(`Tem certeza que deseja excluir o prédio "${nome}"?`)) return;

    try {
      const res = await fetch(`/api/admin/unidades?id=${id}&tipo=PREDIO`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        setMensagem({ tipo: 'erro', texto: data.error || 'Erro ao excluir prédio.' });
        return;
      }
      setMensagem({
        tipo: 'sucesso',
        texto: data.inativado ? 'Prédio inativado devido a vínculos históricos.' : 'Prédio excluído com sucesso!',
      });
      carregarDados();
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao excluir: ' + err.message });
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      <Sidebar userRole={user?.role} userName={user?.nome} />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Navbar user={user} />

        <main className="p-6 max-w-7xl w-full mx-auto space-y-6">
          {/* Cabeçalho */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Building2 className="w-7 h-7 text-indigo-700" />
                Gestão de Unidades Demandantes e Prédios
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Cadastre e edite as unidades demandantes, seus e-mails institucionais, telefones e vínculos territoriais.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/unidades/sublocais"
                className="flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 text-indigo-700 border border-indigo-200 font-medium rounded-lg shadow-xs transition text-sm"
              >
                <DoorOpen className="w-4 h-4 text-indigo-600" />
                Sublocais & Ambientes
              </Link>
              {abaAtiva === 'UNIDADES' ? (
                <button
                  onClick={abrirNovaUnidade}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white font-medium rounded-lg shadow-sm transition text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Nova Unidade Demandante
                </button>
              ) : (
                <button
                  onClick={abrirNovoPredio}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white font-medium rounded-lg shadow-sm transition text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Novo Prédio / Bloco
                </button>
              )}
            </div>
          </div>

          {/* Mensagens de feedback */}
          {mensagem && (
            <div
              className={`p-4 rounded-lg flex items-center justify-between ${
                mensagem.tipo === 'sucesso'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {mensagem.tipo === 'sucesso' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-600" />
                )}
                <span className="text-sm font-medium">{mensagem.texto}</span>
              </div>
              <button
                onClick={() => setMensagem(null)}
                className="text-xs text-slate-400 hover:text-slate-600 font-semibold"
              >
                ✕
              </button>
            </div>
          )}

          {/* Abas */}
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setAbaAtiva('UNIDADES')}
              className={`px-4 py-2.5 font-medium text-sm border-b-2 transition ${
                abaAtiva === 'UNIDADES'
                  ? 'border-indigo-700 text-indigo-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Unidades Demandantes ({unidades.length})
            </button>
            <button
              onClick={() => setAbaAtiva('PREDIOS')}
              className={`px-4 py-2.5 font-medium text-sm border-b-2 transition ${
                abaAtiva === 'PREDIOS'
                  ? 'border-indigo-700 text-indigo-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Prédios e Campi ({predios.length})
            </button>
          </div>

          {/* Conteúdo Aba UNIDADES */}
          {abaAtiva === 'UNIDADES' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-5 py-3.5">Unidade Demandante</th>
                      <th className="px-5 py-3.5">Campus / Sigla</th>
                      <th className="px-5 py-3.5">Contato (E-mail & Telefone)</th>
                      <th className="px-5 py-3.5">Prédios Vinculados</th>
                      <th className="px-5 py-3.5">Cota Mensal</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {carregando ? (
                      <tr>
                        <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                          Carregando unidades...
                        </td>
                      </tr>
                    ) : unidades.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                          Nenhuma unidade demandante cadastrada.
                        </td>
                      </tr>
                    ) : (
                      unidades.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-50/80 transition">
                          <td className="px-5 py-3.5 font-medium text-slate-800">
                            <div>{u.nome}</div>
                            <div className="text-xs text-slate-400 font-normal">
                              {u._count?.chamados || 0} chamados • {u._count?.usuarios || 0} usuários vinculados
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="font-semibold text-slate-700">{u.sigla}</span>
                            <span className="text-xs text-slate-500 block">{u.campus}</span>
                          </td>
                          <td className="px-5 py-3.5 space-y-1">
                            <div className="flex items-center gap-1.5 text-xs text-slate-600">
                              <Mail className="w-3.5 h-3.5 text-slate-400" />
                              {u.email || <span className="text-slate-400 italic">Não informado</span>}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-slate-600">
                              <Phone className="w-3.5 h-3.5 text-slate-400" />
                              {u.telefone || <span className="text-slate-400 italic">Não informado</span>}
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-xs">
                            {u.predios && u.predios.length > 0 ? (
                              <div className="flex flex-col gap-1 max-w-xs">
                                <div className="flex flex-wrap gap-1">
                                  {u.predios.map((p: any, idx: number) => (
                                    <span
                                      key={p.id || idx}
                                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border ${
                                        idx === 0
                                          ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                          : 'bg-slate-100 text-slate-700 border-slate-200'
                                      }`}
                                      title={p.campus ? `Campus ${p.campus}` : undefined}
                                    >
                                      <Building2 className="w-3 h-3 shrink-0 opacity-70" />
                                      <span>{p.nome}</span>
                                      {idx === 0 && u.predios.length > 1 && (
                                        <span className="text-[9px] bg-indigo-200 text-indigo-900 px-1 rounded uppercase tracking-wider font-bold">
                                          Principal
                                        </span>
                                      )}
                                    </span>
                                  ))}
                                </div>
                                {u.predios.length > 1 && (
                                  <span className="text-[10px] text-indigo-600 font-semibold">
                                    {u.predios.length} prédios vinculados
                                  </span>
                                )}
                              </div>
                            ) : u.predio?.nome ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-indigo-50 text-indigo-700 border border-indigo-200">
                                <Building2 className="w-3 h-3 shrink-0" />
                                {u.predio.nome}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">Nenhum</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-xs font-mono font-medium text-slate-700">
                            {u.cotaMensal ? `R$ ${parseFloat(u.cotaMensal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}
                          </td>
                          <td className="px-5 py-3.5">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                                u.ativo ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {u.ativo ? 'Ativa' : 'Inativa'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => abrirEditarUnidade(u)}
                                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition"
                                title="Editar Unidade"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => excluirUnidade(u.id, u.nome)}
                                className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                                title="Excluir Unidade"
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
          )}

          {/* Conteúdo Aba PREDIOS */}
          {abaAtiva === 'PREDIOS' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-5 py-3.5">Nome do Prédio / Bloco</th>
                      <th className="px-5 py-3.5">Campus</th>
                      <th className="px-5 py-3.5">Endereço / Localização</th>
                      <th className="px-5 py-3.5">Unidades Alocadas</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {predios.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition">
                        <td className="px-5 py-3.5 font-medium text-slate-800">
                          {p.nome}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-slate-700 font-semibold">
                          {p.campus || 'MOSSORÓ'}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-slate-500">
                          {p.endereco || '—'}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-slate-600">
                          {p._count?.unidades || 0} unidades
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                              p.ativo ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {p.ativo ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => abrirEditarPredio(p)}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition"
                              title="Editar Prédio"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => excluirPredio(p.id, p.nome)}
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                              title="Excluir Prédio"
                            >
                              <Trash2 className="w-4 h-4" />
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

          {/* Modal Cadastro/Edição de Unidade */}
          {modalUnidadeAberto && (
            <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-xl max-w-xl w-full p-6 space-y-4 max-h-[92vh] overflow-y-auto">
                <div className="flex justify-between items-center border-b pb-3">
                  <h3 className="text-lg font-bold text-slate-800">
                    {unidadeEditando ? 'Editar Unidade Demandante' : 'Nova Unidade Demandante'}
                  </h3>
                  <button
                    onClick={() => setModalUnidadeAberto(false)}
                    className="text-slate-400 hover:text-slate-600 text-xl font-bold"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={salvarUnidade} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                      Nome da Unidade Demandante *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Faculdade de Ciências da Saúde (FACS)"
                      value={formUnidade.nome}
                      onChange={(e) => setFormUnidade({ ...formUnidade, nome: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                        Sigla
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: FACS"
                        value={formUnidade.sigla}
                        onChange={(e) => setFormUnidade({ ...formUnidade, sigla: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                        Campus
                      </label>
                      <select
                        value={formUnidade.campus}
                        onChange={(e) => setFormUnidade({ ...formUnidade, campus: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                      >
                        <option value="MOSSORÓ">Mossoró</option>
                        <option value="NATAL">Natal</option>
                        <option value="ASSU">Assu</option>
                        <option value="CAICÓ">Caicó</option>
                        <option value="PATU">Patu</option>
                        <option value="PAU DOS FERROS">Pau dos Ferros</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                        E-mail Institucional
                      </label>
                      <input
                        type="email"
                        placeholder="contato@uern.br"
                        value={formUnidade.email}
                        onChange={(e) => setFormUnidade({ ...formUnidade, email: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                        Telefone (Opcional)
                      </label>
                      <input
                        type="text"
                        placeholder="(84) 3315-2000"
                        value={formUnidade.telefone}
                        onChange={(e) => setFormUnidade({ ...formUnidade, telefone: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                  </div>

                  {/* Seção Prédios Vinculados */}
                  <div className="space-y-2 border-t pt-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="block text-xs font-semibold text-slate-800 uppercase tracking-wide">
                          Prédios Vinculados à Unidade Demandante
                        </label>
                        <p className="text-[11px] text-slate-500">
                          Selecione um ou mais prédios (ex: Campus Assu possui Sede I e Sede II).
                        </p>
                      </div>
                      <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full">
                        {formUnidade.predioIds.length} prédio(s) selecionado(s)
                      </span>
                    </div>

                    {/* Barra de busca de prédios e atalhos rápidos */}
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Buscar prédio por nome ou campus..."
                          value={buscaPredio}
                          onChange={(e) => setBuscaPredio(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 border rounded-lg text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                      {formUnidade.campus && (
                        <button
                          type="button"
                          onClick={() => {
                            const idsCampus = predios
                              .filter((p) => p.campus?.toUpperCase() === formUnidade.campus.toUpperCase())
                              .map((p) => p.id);
                            const uniao = Array.from(new Set([...formUnidade.predioIds, ...idsCampus]));
                            setFormUnidade((prev) => ({ ...prev, predioIds: uniao }));
                          }}
                          className="text-[11px] px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition whitespace-nowrap"
                        >
                          + Prédios de {formUnidade.campus}
                        </button>
                      )}
                      {formUnidade.predioIds.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setFormUnidade((prev) => ({ ...prev, predioIds: [] }))}
                          className="text-[11px] px-2 py-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition whitespace-nowrap font-medium"
                        >
                          Limpar
                        </button>
                      )}
                    </div>

                    {/* Lista scrollável de prédios com checkboxes */}
                    <div className="max-h-52 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100 bg-slate-50/60 p-1">
                      {predios
                        .filter((p) => {
                          if (!buscaPredio) return true;
                          const termo = buscaPredio.toLowerCase();
                          return (
                            p.nome.toLowerCase().includes(termo) ||
                            (p.campus && p.campus.toLowerCase().includes(termo)) ||
                            (p.endereco && p.endereco.toLowerCase().includes(termo))
                          );
                        })
                        .map((p) => {
                          const selecionado = formUnidade.predioIds.includes(p.id);
                          const isPrincipal = formUnidade.predioIds[0] === p.id;

                          return (
                            <div
                              key={p.id}
                              onClick={() => togglePredioNoForm(p.id)}
                              className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition text-xs ${
                                selecionado
                                  ? 'bg-indigo-50/90 border border-indigo-200 shadow-xs'
                                  : 'hover:bg-white border border-transparent'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div
                                  className={`w-4 h-4 rounded flex items-center justify-center border transition shrink-0 ${
                                    selecionado
                                      ? 'bg-indigo-600 border-indigo-600 text-white'
                                      : 'border-slate-300 bg-white'
                                  }`}
                                >
                                  {selecionado && <Check className="w-3 h-3 stroke-[3]" />}
                                </div>
                                <div className="truncate">
                                  <span className={`font-medium ${selecionado ? 'text-indigo-950 font-semibold' : 'text-slate-700'}`}>
                                    {p.nome}
                                  </span>
                                  {p.campus && (
                                    <span className="ml-2 text-[10px] text-slate-500 bg-slate-200/80 px-1.5 py-0.5 rounded font-mono">
                                      {p.campus}
                                    </span>
                                  )}
                                  {p.endereco && (
                                    <span className="text-[10px] text-slate-400 block truncate">
                                      {p.endereco}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {selecionado && (
                                <div className="flex items-center gap-1.5 shrink-0 pl-2">
                                  {isPrincipal ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-indigo-600 text-white px-2 py-0.5 rounded shadow-xs">
                                      <Star className="w-2.5 h-2.5 fill-current" />
                                      Principal
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        definirPredioPrincipalNoForm(p.id);
                                      }}
                                      className="text-[10px] text-slate-500 hover:text-indigo-700 hover:bg-indigo-100 px-1.5 py-0.5 rounded border border-slate-200 bg-white transition"
                                      title="Definir como prédio principal desta unidade demandante"
                                    >
                                      Tornar Principal
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      {predios.length === 0 && (
                        <div className="p-4 text-center text-xs text-slate-400">
                          Nenhum prédio cadastrado. Cadastre prédios na aba "Prédios e Campi".
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                      Cota Mensal (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Ex: 5000.00"
                      value={formUnidade.cotaMensal}
                      onChange={(e) => setFormUnidade({ ...formUnidade, cotaMensal: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-3 border-t">
                    <button
                      type="button"
                      onClick={() => setModalUnidadeAberto(false)}
                      className="px-4 py-2 border text-slate-600 rounded-lg text-sm hover:bg-slate-50 transition"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg text-sm font-semibold shadow-sm transition"
                    >
                      {unidadeEditando ? 'Atualizar Unidade' : 'Cadastrar Unidade'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Modal Cadastro/Edição de Prédio */}
          {modalPredioAberto && (
            <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
                <div className="flex justify-between items-center border-b pb-3">
                  <h3 className="text-lg font-bold text-slate-800">
                    {predioEditando ? 'Editar Prédio / Bloco' : 'Novo Prédio / Bloco'}
                  </h3>
                  <button
                    onClick={() => setModalPredioAberto(false)}
                    className="text-slate-400 hover:text-slate-600 text-xl font-bold"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={salvarPredio} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                      Nome do Prédio / Bloco *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Bloco Administrativo da Reitoria"
                      value={formPredio.nome}
                      onChange={(e) => setFormPredio({ ...formPredio, nome: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                      Campus
                    </label>
                    <select
                      value={formPredio.campus}
                      onChange={(e) => setFormPredio({ ...formPredio, campus: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                    >
                      <option value="MOSSORÓ">Mossoró</option>
                      <option value="NATAL">Natal</option>
                      <option value="ASSU">Assu</option>
                      <option value="CAICÓ">Caicó</option>
                      <option value="PATU">Patu</option>
                      <option value="PAU DOS FERROS">Pau dos Ferros</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                      Endereço / Referência
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Rua Prof. Antônio Campos, Costa e Silva"
                      value={formPredio.endereco}
                      onChange={(e) => setFormPredio({ ...formPredio, endereco: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-3 border-t">
                    <button
                      type="button"
                      onClick={() => setModalPredioAberto(false)}
                      className="px-4 py-2 border text-slate-600 rounded-lg text-sm hover:bg-slate-50 transition"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg text-sm font-semibold shadow-sm transition"
                    >
                      {predioEditando ? 'Atualizar Prédio' : 'Cadastrar Prédio'}
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
