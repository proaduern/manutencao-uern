'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { Users, UserPlus, Edit2, Trash2, KeyRound, Phone, Mail, Building2, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';

export default function UsuariosPage() {
  const [user, setUser] = useState<any>(null);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [unidades, setUnidades] = useState<any[]>([]);
  const [fiscaisSetoriais, setFiscaisSetoriais] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  // Modais
  const [modalNovo, setModalNovo] = useState(false);
  const [modalEditar, setModalEditar] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState<any>(null);

  // Form de Criação
  const [novoForm, setNovoForm] = useState({
    nome: '',
    email: '',
    telefone: '',
    role: 'DEMANDANTE',
    unidadeId: '',
    matricula: '',
    senha: '',
  });

  // Form de Edição
  const [editForm, setEditForm] = useState({
    nome: '',
    email: '',
    telefone: '',
    role: 'DEMANDANTE',
    unidadeId: '',
    matricula: '',
    ativo: true,
    novaSenha: '',
  });

  // Atribuição de Alçada Setorial
  const [setorialUsuarioId, setSetorialUsuarioId] = useState('');
  const [setorialUnidadeId, setSetorialUnidadeId] = useState('');

  const carregarDados = () => {
    setCarregando(true);
    fetch('/api/admin/usuarios')
      .then((res) => res.json())
      .then((data) => {
        setUsuarios(data.usuarios || []);
        setUnidades(data.unidades || []);
        setFiscaisSetoriais(data.fiscaisSetoriais || []);
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

  const abrirNovoUsuario = () => {
    setNovoForm({
      nome: '',
      email: '',
      telefone: '',
      role: 'DEMANDANTE',
      unidadeId: '',
      matricula: '',
      senha: '',
    });
    setModalNovo(true);
  };

  const criarUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acao: 'CRIAR',
          ...novoForm,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao criar usuário');

      setMensagem({
        tipo: 'sucesso',
        texto: `Usuário "${data.usuario?.nome}" cadastrado com sucesso! Senha padrão: ${novoForm.senha || 'uern@2026'}.`,
      });
      setModalNovo(false);
      carregarDados();
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message });
    }
  };

  const abrirEditarUsuario = (u: any) => {
    setUsuarioEditando(u);
    setEditForm({
      nome: u.nome || '',
      email: u.email || '',
      telefone: u.telefone || '',
      role: u.role || 'DEMANDANTE',
      unidadeId: u.unidadeId || '',
      matricula: u.matricula || '',
      ativo: u.ativo,
      novaSenha: '',
    });
    setModalEditar(true);
  };

  const salvarEdicaoUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuarioEditando) return;

    try {
      const res = await fetch('/api/admin/usuarios', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: usuarioEditando.id,
          ...editForm,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao atualizar usuário');

      setMensagem({ tipo: 'sucesso', texto: 'Dados do usuário atualizados com sucesso!' });
      setModalEditar(false);
      carregarDados();
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message });
    }
  };

  const excluirUsuario = async (id: string, nome: string) => {
    if (!confirm(`Deseja realmente excluir o usuário "${nome}"?`)) return;

    try {
      const res = await fetch(`/api/admin/usuarios?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao excluir');

      setMensagem({
        tipo: 'sucesso',
        texto: data.inativado ? 'Usuário inativado com segurança devido a chamados históricos.' : 'Usuário excluído com sucesso!',
      });
      carregarDados();
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message });
    }
  };

  const vincularSetorial = async () => {
    if (!setorialUsuarioId || !setorialUnidadeId) {
      setMensagem({ tipo: 'erro', texto: 'Selecione o fiscal setorial e a unidade.' });
      return;
    }
    try {
      const res = await fetch('/api/admin/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acao: 'VINCULAR_SETORIAL',
          usuarioId: setorialUsuarioId,
          unidadeId: setorialUnidadeId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMensagem({ tipo: 'sucesso', texto: 'Vínculo territorial setorial adicionado com sucesso!' });
      carregarDados();
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message });
    }
  };

  const desvincularSetorial = async (usuarioId: string, unidadeId: string) => {
    try {
      const res = await fetch('/api/admin/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acao: 'DESVINCULAR_SETORIAL',
          usuarioId,
          unidadeId,
        }),
      });
      setMensagem({ tipo: 'sucesso', texto: 'Vínculo setorial removido.' });
      carregarDados();
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message });
    }
  };

  const fiscaisSetoriaisUsers = usuarios.filter((u) => u.role === 'FISCAL_SETORIAL');

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
                <Users className="w-7 h-7 text-indigo-700" />
                Gestão de Usuários e Perfis
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Cadastre usuários vinculados a unidades demandantes com telefone opcional, defina permissões e alçadas territoriais.
              </p>
            </div>

            <button
              onClick={abrirNovoUsuario}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white font-medium rounded-lg shadow-sm transition"
            >
              <UserPlus className="w-4 h-4" />
              Novo Usuário
            </button>
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

          {/* Tabela de Usuários */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">Nome / Matrícula</th>
                    <th className="px-5 py-3.5">Contato (E-mail & Telefone)</th>
                    <th className="px-5 py-3.5">Perfil de Acesso</th>
                    <th className="px-5 py-3.5">Unidade Demandante Vinculada</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {carregando ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                        Carregando usuários...
                      </td>
                    </tr>
                  ) : usuarios.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                        Nenhum usuário cadastrado.
                      </td>
                    </tr>
                  ) : (
                    usuarios.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/80 transition">
                        <td className="px-5 py-3.5 font-medium text-slate-800">
                          <div>{u.nome}</div>
                          <div className="text-xs text-slate-400 font-normal">
                            Matrícula: {u.matricula || '—'}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 space-y-1">
                          <div className="flex items-center gap-1.5 text-xs text-slate-600">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            {u.email}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-600">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            {u.telefone || <span className="text-slate-400 italic">Não informado</span>}
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                              u.role === 'ADMIN'
                                ? 'bg-purple-100 text-purple-800'
                                : u.role === 'GESTOR_CONTRATO'
                                ? 'bg-blue-100 text-blue-800'
                                : u.role === 'FISCAL_TECNICO'
                                ? 'bg-indigo-100 text-indigo-800'
                                : u.role === 'FISCAL_SETORIAL'
                                ? 'bg-amber-100 text-amber-800'
                                : u.role === 'GESTOR_UNIDADE'
                                ? 'bg-teal-100 text-teal-800 border border-teal-200'
                                : u.role === 'EMPRESA'
                                ? 'bg-cyan-100 text-cyan-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {u.role === 'GESTOR_UNIDADE' ? 'Adm da Unidade' : u.role}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-slate-700">
                          {u.unidade ? (
                            <div className="flex items-center gap-1.5 font-medium">
                              <Building2 className="w-3.5 h-3.5 text-slate-400" />
                              {u.unidade.nome} ({u.unidade.campus})
                            </div>
                          ) : u.empresa ? (
                            <div className="text-slate-500 italic">Empresa: {u.empresa.razaoSocial}</div>
                          ) : (
                            <span className="text-slate-400 italic">Geral / Não vinculada</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                              u.ativo ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {u.ativo ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => abrirEditarUsuario(u)}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition"
                              title="Editar Usuário"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => excluirUsuario(u.id, u.nome)}
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                              title="Excluir Usuário"
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

          {/* Vínculo Territorial de Fiscais Setoriais */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-700" />
              Atribuição de Alçada Territorial para Fiscais Setoriais
            </h2>
            <p className="text-xs text-slate-500">
              Vincule fiscais setoriais aos seus respectivos campi e unidades demandantes de acompanhamento.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Fiscal Setorial</label>
                <select
                  value={setorialUsuarioId}
                  onChange={(e) => setSetorialUsuarioId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Selecione o fiscal...</option>
                  {fiscaisSetoriaisUsers.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nome} ({f.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Unidade Demandante / Campus</label>
                <select
                  value={setorialUnidadeId}
                  onChange={(e) => setSetorialUnidadeId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Selecione a unidade...</option>
                  {unidades.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nome} ({u.campus})
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={vincularSetorial}
                className="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg text-sm font-semibold shadow-sm transition"
              >
                Vincular Unidade
              </button>
            </div>

            {/* Lista de Vínculos Setoriais Ativos */}
            <div className="pt-3 border-t">
              <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">Vínculos Vigentes:</h3>
              <div className="flex flex-wrap gap-2">
                {fiscaisSetoriais.map((v) => (
                  <div
                    key={v.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-lg text-xs text-slate-700 border"
                  >
                    <span>{v.unidade?.nome}</span>
                    <button
                      onClick={() => desvincularSetorial(v.usuarioId, v.unidadeId)}
                      className="text-slate-400 hover:text-rose-600 font-bold ml-1"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Modal Novo Usuário */}
          {modalNovo && (
            <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4">
                <div className="flex justify-between items-center border-b pb-3">
                  <h3 className="text-lg font-bold text-slate-800">Cadastrar Novo Usuário</h3>
                  <button onClick={() => setModalNovo(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">
                    ✕
                  </button>
                </div>

                <form onSubmit={criarUsuario} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Nome Completo *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Prof. Carlos Eduardo"
                      value={novoForm.nome}
                      onChange={(e) => setNovoForm({ ...novoForm, nome: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">E-mail Institucional *</label>
                      <input
                        type="email"
                        required
                        placeholder="usuario@uern.br"
                        value={novoForm.email}
                        onChange={(e) => setNovoForm({ ...novoForm, email: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Telefone (Opcional)</label>
                      <input
                        type="text"
                        placeholder="(84) 99999-0000"
                        value={novoForm.telefone}
                        onChange={(e) => setNovoForm({ ...novoForm, telefone: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Perfil de Acesso *</label>
                      <select
                        value={novoForm.role}
                        onChange={(e) => setNovoForm({ ...novoForm, role: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg text-sm outline-none bg-white focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="DEMANDANTE">Demandante</option>
                        <option value="GESTOR_UNIDADE">Administrador da Unidade Demandante (Gestor)</option>
                        <option value="FISCAL_SETORIAL">Fiscal Setorial</option>
                        <option value="FISCAL_TECNICO">Fiscal Técnico</option>
                        <option value="GESTOR_CONTRATO">Gestor de Contrato</option>
                        <option value="ADMIN">Administrador</option>
                        <option value="EMPRESA">Empresa Contratada</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Matrícula (Opcional)</label>
                      <input
                        type="text"
                        placeholder="Ex: 198273"
                        value={novoForm.matricula}
                        onChange={(e) => setNovoForm({ ...novoForm, matricula: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                      Unidade Demandante de Vínculo
                    </label>
                    <select
                      value={novoForm.unidadeId}
                      onChange={(e) => setNovoForm({ ...novoForm, unidadeId: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm outline-none bg-white focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Selecione a unidade de vínculo...</option>
                      {unidades.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.nome} ({u.campus})
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-slate-400 mt-1">
                      O usuário demandante terá acesso a todos os chamados desta unidade.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                      Senha Inicial (Opcional - padrão: uern@2026)
                    </label>
                    <input
                      type="password"
                      placeholder="uern@2026"
                      value={novoForm.senha}
                      onChange={(e) => setNovoForm({ ...novoForm, senha: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-3 border-t">
                    <button
                      type="button"
                      onClick={() => setModalNovo(false)}
                      className="px-4 py-2 border text-slate-600 rounded-lg text-sm hover:bg-slate-50 transition"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg text-sm font-semibold shadow-sm transition"
                    >
                      Cadastrar Usuário
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Modal Editar Usuário */}
          {modalEditar && usuarioEditando && (
            <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4">
                <div className="flex justify-between items-center border-b pb-3">
                  <h3 className="text-lg font-bold text-slate-800">Editar Usuário</h3>
                  <button onClick={() => setModalEditar(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">
                    ✕
                  </button>
                </div>

                <form onSubmit={salvarEdicaoUsuario} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Nome Completo *</label>
                    <input
                      type="text"
                      required
                      value={editForm.nome}
                      onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">E-mail *</label>
                      <input
                        type="email"
                        required
                        value={editForm.email}
                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Telefone (Opcional)</label>
                      <input
                        type="text"
                        value={editForm.telefone}
                        onChange={(e) => setEditForm({ ...editForm, telefone: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Perfil de Acesso *</label>
                      <select
                        value={editForm.role}
                        onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg text-sm outline-none bg-white focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="DEMANDANTE">Demandante</option>
                        <option value="GESTOR_UNIDADE">Administrador da Unidade Demandante (Gestor)</option>
                        <option value="FISCAL_SETORIAL">Fiscal Setorial</option>
                        <option value="FISCAL_TECNICO">Fiscal Técnico</option>
                        <option value="GESTOR_CONTRATO">Gestor de Contrato</option>
                        <option value="ADMIN">Administrador</option>
                        <option value="EMPRESA">Empresa Contratada</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Status</label>
                      <select
                        value={editForm.ativo ? 'true' : 'false'}
                        onChange={(e) => setEditForm({ ...editForm, ativo: e.target.value === 'true' })}
                        className="w-full px-3 py-2 border rounded-lg text-sm outline-none bg-white focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="true">Ativo</option>
                        <option value="false">Inativo</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                      Unidade Demandante de Vínculo
                    </label>
                    <select
                      value={editForm.unidadeId}
                      onChange={(e) => setEditForm({ ...editForm, unidadeId: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm outline-none bg-white focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Nenhuma / Geral</option>
                      {unidades.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.nome} ({u.campus})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                      Redefinir Senha (Deixe em branco para não alterar)
                    </label>
                    <input
                      type="password"
                      placeholder="Digite a nova senha (mínimo 6 caracteres)..."
                      value={editForm.novaSenha}
                      onChange={(e) => setEditForm({ ...editForm, novaSenha: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-3 border-t">
                    <button
                      type="button"
                      onClick={() => setModalEditar(false)}
                      className="px-4 py-2 border text-slate-600 rounded-lg text-sm hover:bg-slate-50 transition"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
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
