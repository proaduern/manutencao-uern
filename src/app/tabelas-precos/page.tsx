'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { FileText, Plus, Upload, Save, Edit2, Trash2, AlertCircle, CheckCircle2, RotateCcw } from 'lucide-react';

export default function TabelasPrecosPage() {
  const [user, setUser] = useState<any>(null);
  const [tabelas, setTabelas] = useState<any[]>([]);
  const [itens, setItens] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  // Estados de Modais
  const [modalNovaTabela, setModalNovaTabela] = useState(false);
  const [modalNovoItem, setModalNovoItem] = useState(false);
  const [modalEditarItem, setModalEditarItem] = useState(false);
  const [itemEditando, setItemEditando] = useState<any>(null);

  // Forms
  const [formTabela, setFormTabela] = useState({ nome: '', bdiPercentual: '25.0' });
  const [formItem, setFormItem] = useState({
    tabelaId: '',
    codigo: '',
    descricao: '',
    unidadeMedida: 'UN',
    precoUnitario: '',
  });

  // Upload CSV
  const [tabelaDestinoId, setTabelaDestinoId] = useState('');
  const [arquivoCsv, setArquivoCsv] = useState<File | null>(null);
  const [carregandoCsv, setCarregandoCsv] = useState(false);
  const [bdiInputs, setBdiInputs] = useState<Record<string, string>>({});

  const carregarDados = () => {
    setCarregando(true);
    fetch('/api/admin/tabelas')
      .then((res) => res.json())
      .then((data) => {
        setTabelas(data.tabelas || []);
        setItens(data.itens || []);
        if (data.tabelas && data.tabelas[0]) {
          setTabelaDestinoId(data.tabelas[0].id);
          setFormItem((prev) => ({ ...prev, tabelaId: data.tabelas[0].id }));
        }

        const bdis: any = {};
        for (const t of data.tabelas || []) {
          bdis[t.id] = t.bdiPercentual ? parseFloat(t.bdiPercentual).toString() : '';
        }
        setBdiInputs(bdis);
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

  const salvarBdi = async (id: string) => {
    const val = bdiInputs[id];
    try {
      const res = await fetch('/api/admin/tabelas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acao: 'SALVAR_BDI',
          tabelaId: id,
          bdiPercentual: val,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMensagem({ tipo: 'sucesso', texto: 'BDI da tabela atualizado com sucesso!' });
      carregarDados();
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message });
    }
  };

  const criarTabela = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/tabelas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acao: 'CRIAR_TABELA',
          ...formTabela,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMensagem({ tipo: 'sucesso', texto: 'Nova tabela de referência criada com sucesso!' });
      setModalNovaTabela(false);
      setFormTabela({ nome: '', bdiPercentual: '25.0' });
      carregarDados();
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message });
    }
  };

  const excluirTabela = async (id: string, nome: string) => {
    if (!confirm(`Deseja realmente excluir a tabela "${nome}" e todos os seus insumos vinculados?`)) return;

    try {
      const res = await fetch(`/api/admin/tabelas?id=${id}&tipo=TABELA`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMensagem({ tipo: 'sucesso', texto: 'Tabela de referência e insumos excluídos com sucesso!' });
      carregarDados();
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message });
    }
  };

  const criarItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/tabelas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acao: 'CRIAR_ITEM',
          ...formItem,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMensagem({ tipo: 'sucesso', texto: 'Insumo cadastrado com sucesso!' });
      setModalNovoItem(false);
      setFormItem({
        tabelaId: tabelas[0]?.id || '',
        codigo: '',
        descricao: '',
        unidadeMedida: 'UN',
        precoUnitario: '',
      });
      carregarDados();
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message });
    }
  };

  const abrirEditarItem = (item: any) => {
    setItemEditando(item);
    setFormItem({
      tabelaId: item.tabelaId,
      codigo: item.codigo,
      descricao: item.descricao,
      unidadeMedida: item.unidadeMedida,
      precoUnitario: item.precoUnitario ? parseFloat(item.precoUnitario).toString() : '',
    });
    setModalEditarItem(true);
  };

  const salvarEdicaoItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemEditando) return;

    try {
      const res = await fetch('/api/admin/tabelas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'ITEM',
          id: itemEditando.id,
          ...formItem,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMensagem({ tipo: 'sucesso', texto: 'Insumo atualizado com sucesso!' });
      setModalEditarItem(false);
      carregarDados();
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message });
    }
  };

  const excluirItem = async (id: string, codigo: string) => {
    if (!confirm(`Deseja realmente excluir o insumo código "${codigo}"?`)) return;

    try {
      const res = await fetch(`/api/admin/tabelas?id=${id}&tipo=ITEM`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMensagem({ tipo: 'sucesso', texto: 'Insumo excluído com sucesso!' });
      carregarDados();
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message });
    }
  };

  const reverterItem = async (itemId: string) => {
    const just = prompt('Por que este preço volta para a fila de homologação? (mínimo 15 caracteres)');
    if (!just || just.trim().length < 15) {
      alert('Justificativa deve conter no mínimo 15 caracteres.');
      return;
    }

    try {
      const res = await fetch('/api/admin/tabelas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acao: 'REVERTER_ITEM',
          itemId,
          justificativa: just,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMensagem({ tipo: 'sucesso', texto: 'Item revertido para pendente de homologação!' });
      carregarDados();
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message });
    }
  };

  const processarCsv = async () => {
    if (!arquivoCsv || !tabelaDestinoId) {
      alert('Selecione o arquivo CSV e a tabela de destino.');
      return;
    }

    setCarregandoCsv(true);
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const linhas = text.split('\n');
        const itensParaEnviar: any[] = [];

        for (let i = 1; i < linhas.length; i++) {
          const l = linhas[i].trim();
          if (!l) continue;
          const partes = l.split(';');
          if (partes.length >= 4) {
            itensParaEnviar.push({
              codigo: partes[0].trim(),
              descricao: partes[1].trim(),
              unidade: partes[2].trim(),
              valor: partes[3].trim().replace(',', '.'),
            });
          }
        }

        if (itensParaEnviar.length === 0) {
          throw new Error('Nenhum item válido identificado no arquivo.');
        }

        const res = await fetch('/api/admin/tabelas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            acao: 'CARGA_ITENS',
            tabelaId: tabelaDestinoId,
            itens: itensParaEnviar,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        setMensagem({ tipo: 'sucesso', texto: data.mensagem || 'Carga de CSV concluída com sucesso!' });
        setArquivoCsv(null);
        carregarDados();
      } catch (err: any) {
        setMensagem({ tipo: 'erro', texto: err.message });
      } finally {
        setCarregandoCsv(false);
      }
    };

    reader.readAsText(arquivoCsv);
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
                <FileText className="w-7 h-7 text-indigo-700" />
                Tabelas de Preços, Insumos e BDI
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Gerencie tabelas de referência oficial (SINAPI-RN, Própria UERN), insumos, BDI e regras de homologação.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setModalNovaTabela(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-sm transition"
              >
                <Plus className="w-4 h-4 text-slate-600" />
                Nova Tabela
              </button>
              <button
                onClick={() => setModalNovoItem(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-semibold rounded-lg shadow-sm transition"
              >
                <Plus className="w-4 h-4" />
                Cadastrar Insumo Avulso
              </button>
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
              <button onClick={() => setMensagem(null)} className="text-xs text-slate-400 hover:text-slate-600 font-semibold">
                ✕
              </button>
            </div>
          )}

          {/* Cards das Tabelas e BDI */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tabelas.map((t) => (
              <div key={t.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">{t.nome}</h3>
                    <p className="text-xs text-slate-400">{t._count?.itens || 0} itens cadastrados</p>
                  </div>
                  <button
                    onClick={() => excluirTabela(t.id, t.nome)}
                    className="p-1 text-slate-400 hover:text-rose-600 transition"
                    title="Excluir Tabela"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="pt-2 border-t flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-600 font-semibold">BDI (%):</span>
                    <input
                      type="number"
                      step="0.01"
                      value={bdiInputs[t.id] ?? ''}
                      onChange={(e) => setBdiInputs({ ...bdiInputs, [t.id]: e.target.value })}
                      className="w-20 px-2 py-1 border rounded text-xs text-slate-800 text-right outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <button
                    onClick={() => salvarBdi(t.id)}
                    className="px-3 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded text-xs font-semibold flex items-center gap-1"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Salvar
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Bloco de Importação CSV */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Upload className="w-5 h-5 text-indigo-700" />
              Importação em Lote via Arquivo CSV (SINAPI ou Própria)
            </h2>
            <p className="text-xs text-slate-500">
              Formato esperado (separado por ponto e vírgula): <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">codigo;descricao;unidade;preco</code>
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tabela de Destino</label>
                <select
                  value={tabelaDestinoId}
                  onChange={(e) => setTabelaDestinoId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {tabelas.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Arquivo CSV</label>
                <input
                  type="file"
                  accept=".csv,.txt"
                  onChange={(e) => setArquivoCsv(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
              </div>

              <button
                onClick={processarCsv}
                disabled={carregandoCsv || !arquivoCsv}
                className="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 disabled:opacity-50 text-white rounded-lg text-sm font-semibold shadow-sm transition"
              >
                {carregandoCsv ? 'Importando...' : 'Processar e Carregar Itens'}
              </button>
            </div>
          </div>

          {/* Tabela de Insumos Cadastrados */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden space-y-2">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 text-sm">Catálogo de Itens de Referência ({itens.length})</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3">Código</th>
                    <th className="px-5 py-3">Tabela</th>
                    <th className="px-5 py-3">Descrição do Insumo / Serviço</th>
                    <th className="px-5 py-3">UN</th>
                    <th className="px-5 py-3">Preço Unitário (R$)</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {carregando ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                        Carregando itens...
                      </td>
                    </tr>
                  ) : itens.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                        Nenhum insumo cadastrado na base de dados.
                      </td>
                    </tr>
                  ) : (
                    itens.map((i) => (
                      <tr key={i.id} className="hover:bg-slate-50/80 transition">
                        <td className="px-5 py-3 font-mono font-bold text-xs text-indigo-700">{i.codigo}</td>
                        <td className="px-5 py-3 text-xs text-slate-500">{i.tabela?.nome}</td>
                        <td className="px-5 py-3 text-xs text-slate-800 max-w-md">{i.descricao}</td>
                        <td className="px-5 py-3 text-xs font-semibold">{i.unidadeMedida}</td>
                        <td className="px-5 py-3 font-mono font-semibold text-xs text-slate-800">
                          R$ {parseFloat(i.precoUnitario).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                              i.status === 'HOMOLOGADO' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {i.status}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => reverterItem(i.id)}
                              className="p-1 text-slate-400 hover:text-amber-600 transition"
                              title="Reverter para fila de homologação"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => abrirEditarItem(i)}
                              className="p-1 text-slate-400 hover:text-indigo-600 transition"
                              title="Editar Insumo"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => excluirItem(i.id, i.codigo)}
                              className="p-1 text-slate-400 hover:text-rose-600 transition"
                              title="Excluir Insumo"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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

          {/* Modal Nova Tabela */}
          {modalNovaTabela && (
            <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
                <div className="flex justify-between items-center border-b pb-3">
                  <h3 className="text-lg font-bold text-slate-800">Nova Tabela de Referência</h3>
                  <button onClick={() => setModalNovaTabela(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">
                    ✕
                  </button>
                </div>

                <form onSubmit={criarTabela} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Nome da Tabela *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: TABELA_PROPRIA_UERN_2026"
                      value={formTabela.nome}
                      onChange={(e) => setFormTabela({ ...formTabela, nome: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">BDI Padrão (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formTabela.bdiPercentual}
                      onChange={(e) => setFormTabela({ ...formTabela, bdiPercentual: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-3 border-t">
                    <button
                      type="button"
                      onClick={() => setModalNovaTabela(false)}
                      className="px-4 py-2 border text-slate-600 rounded-lg text-sm hover:bg-slate-50 transition"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg text-sm font-semibold shadow-sm transition"
                    >
                      Criar Tabela
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Modal Novo / Editar Insumo */}
          {(modalNovoItem || modalEditarItem) && (
            <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4">
                <div className="flex justify-between items-center border-b pb-3">
                  <h3 className="text-lg font-bold text-slate-800">
                    {modalEditarItem ? 'Editar Insumo de Referência' : 'Cadastrar Insumo Avulso'}
                  </h3>
                  <button
                    onClick={() => {
                      setModalNovoItem(false);
                      setModalEditarItem(false);
                    }}
                    className="text-slate-400 hover:text-slate-600 text-xl font-bold"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={modalEditarItem ? salvarEdicaoItem : criarItem} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Tabela de Referência *</label>
                    <select
                      required
                      value={formItem.tabelaId}
                      onChange={(e) => setFormItem({ ...formItem, tabelaId: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {tabelas.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.nome}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Código do Item *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: 88247"
                        value={formItem.codigo}
                        onChange={(e) => setFormItem({ ...formItem, codigo: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Unidade de Medida</label>
                      <input
                        type="text"
                        placeholder="Ex: M2, UN, H, KG"
                        value={formItem.unidadeMedida}
                        onChange={(e) => setFormItem({ ...formItem, unidadeMedida: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Descrição Detalhada *</label>
                    <textarea
                      required
                      rows={3}
                      placeholder="Descrição técnica do serviço ou material..."
                      value={formItem.descricao}
                      onChange={(e) => setFormItem({ ...formItem, descricao: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Preço Unitário (R$) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="Ex: 145.50"
                      value={formItem.precoUnitario}
                      onChange={(e) => setFormItem({ ...formItem, precoUnitario: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-3 border-t">
                    <button
                      type="button"
                      onClick={() => {
                        setModalNovoItem(false);
                        setModalEditarItem(false);
                      }}
                      className="px-4 py-2 border text-slate-600 rounded-lg text-sm hover:bg-slate-50 transition"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg text-sm font-semibold shadow-sm transition"
                    >
                      {modalEditarItem ? 'Salvar Insumo' : 'Cadastrar Insumo'}
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
