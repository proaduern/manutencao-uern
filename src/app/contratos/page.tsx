'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import {
  DollarSign,
  FileText,
  Building2,
  Calendar,
  PlusCircle,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  X,
  Users,
  Briefcase,
  Layers,
  TrendingUp,
  UserPlus,
  Building,
  Mail,
  Phone,
  UserCheck,
  BadgeCheck,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
} from 'lucide-react';

interface FuncionarioPosto {
  id?: string;
  nomeCompleto: string;
  cpf: string;
}

interface ItemMaoObra {
  id?: string;
  funcao: string;
  quantidadePostos: number;
  valorMensalPosto: number;
  valorTotalMensal?: number;
  valorTotalVigencia?: number;
  funcionarios?: FuncionarioPosto[];
  expandido?: boolean;
}

export default function ContratosCotasPage() {
  const [user, setUser] = useState<any>(null);
  const [contrato, setContrato] = useState<any>(null);
  const [todosContratos, setTodosContratos] = useState<any[]>([]);
  const [cotas, setCotas] = useState<any[]>([]);
  const [todasUnidades, setTodasUnidades] = useState<any[]>([]);
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  const [abaAtiva, setAbaAtiva] = useState<'MAO_OBRA' | 'DEMANDA' | 'COTAS' | 'HISTORICO' | 'EMPRESAS'>('MAO_OBRA');

  // Modal Novo / Editar Contrato
  const [modalContrato, setModalContrato] = useState(false);
  const [editandoContratoId, setEditandoContratoId] = useState<string | null>(null);
  const [formContrato, setFormContrato] = useState({
    numero: '',
    ano: new Date().getFullYear().toString(),
    empresaId: '',
    dataInicio: '',
    dataFim: '',
    objeto: '',
    valorAnualServicosEventuais: '0',
    valorAnualInsumos: '0',
    valorAnualDiarias: '0',
    valorDiariaUnitario: '150',
  });
  const [formItensMaoObra, setFormItensMaoObra] = useState<ItemMaoObra[]>([]);
  const [salvandoContrato, setSalvandoContrato] = useState(false);

  // Modal Cadastrar / Editar Trabalhador Vinculado
  const [modalTrabalhador, setModalTrabalhador] = useState(false);
  const [editandoTrabalhadorId, setEditandoTrabalhadorId] = useState<string | null>(null);
  const [formTrabalhador, setFormTrabalhador] = useState({
    itemMaoObraId: '',
    nomeCompleto: '',
    cpf: '',
  });
  const [salvandoTrabalhador, setSalvandoTrabalhador] = useState(false);

  // Modal Adicionar / Editar Posto/Função de Mão de Obra
  const [modalNovoPosto, setModalNovoPosto] = useState(false);
  const [editandoPostoId, setEditandoPostoId] = useState<string | null>(null);
  const [formNovoPosto, setFormNovoPosto] = useState({
    funcao: '',
    quantidadePostos: '1',
    valorMensalPosto: '',
  });
  const [salvandoPosto, setSalvandoPosto] = useState(false);

  // Modal Empresa Contratada
  const [modalEmpresa, setModalEmpresa] = useState(false);
  const [editandoEmpresaId, setEditandoEmpresaId] = useState<string | null>(null);
  const [formEmpresa, setFormEmpresa] = useState({
    razaoSocial: '',
    nomeFantasia: '',
    cnpj: '',
    email: '',
    telefone: '',
  });
  const [salvandoEmpresa, setSalvandoEmpresa] = useState(false);

  // Modal de Repactuação de Posto
  const [modalRepactuacao, setModalRepactuacao] = useState(false);
  const [itemParaRepactuar, setItemParaRepactuar] = useState<any>(null);
  const [formRepactuacao, setFormRepactuacao] = useState({
    novoValorMensalPosto: '',
    motivo: '',
    numeroRepactuacao: '',
    detalhes: '',
  });

  // Modal Aditivo
  const [modalAditivo, setModalAditivo] = useState(false);
  const [tipoAditivo, setTipoAditivo] = useState('VALOR');
  const [numAditivo, setNumAditivo] = useState('');
  const [valorAjuste, setValorAjuste] = useState('');
  const [novaDataFim, setNovaDataFim] = useState('');
  const [notaEmpenho, setNotaEmpenho] = useState('');
  const [dataReforco, setDataReforco] = useState('');

  // Modal Cota Unidade
  const [modalCota, setModalCota] = useState(false);
  const [cotaUnidadeId, setCotaUnidadeId] = useState('');
  const [cotaAnual, setCotaAnual] = useState('');
  const [cotaMensal, setCotaMensal] = useState('');

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'GESTOR_CONTRATO';

  const carregarDados = (contratoId?: string) => {
    setCarregando(true);
    const url = contratoId ? `/api/contratos?id=${contratoId}` : '/api/contratos';
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        const contratoCarregado = data.contrato
          ? {
              ...data.contrato,
              rubricas: data.contrato.rubricas || data.rubricas,
            }
          : null;
        setContrato(contratoCarregado);
        setTodosContratos(data.todosContratos || []);
        setCotas(data.cotas || []);
        setTodasUnidades(data.todasUnidades || []);
        setEmpresas(data.empresas || []);
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

  // Estados de busca e filtro do quadro de trabalhadores
  const [buscaTrabalhador, setBuscaTrabalhador] = useState('');
  const [filtroFuncaoTrabalhador, setFiltroFuncaoTrabalhador] = useState('');

  // Lista unificada de todos os trabalhadores do contrato para o quadro de funcionários
  const listaTrabalhadores = useMemo(() => {
    if (!contrato || !Array.isArray(contrato.itensMaoObra)) return [];
    const list: any[] = [];
    for (const item of contrato.itensMaoObra) {
      if (Array.isArray(item.funcionarios)) {
        for (const func of item.funcionarios) {
          list.push({
            id: func.id,
            nomeCompleto: func.nomeCompleto,
            cpf: func.cpf,
            funcao: item.funcao,
            itemMaoObraId: item.id,
          });
        }
      }
    }
    return list;
  }, [contrato]);

  // Lista filtrada para o quadro de trabalhadores
  const trabalhadoresFiltrados = useMemo(() => {
    return listaTrabalhadores.filter((t) => {
      const matchBusca =
        !buscaTrabalhador ||
        t.nomeCompleto.toLowerCase().includes(buscaTrabalhador.toLowerCase()) ||
        t.cpf.includes(buscaTrabalhador);
      const matchFuncao = !filtroFuncaoTrabalhador || t.itemMaoObraId === filtroFuncaoTrabalhador;
      return matchBusca && matchFuncao;
    });
  }, [listaTrabalhadores, buscaTrabalhador, filtroFuncaoTrabalhador]);

  // Cálculo proporcional da vigência no formulário em tempo real
  const calculoProporcional = useMemo(() => {
    if (!formContrato.dataInicio || !formContrato.dataFim) {
      return { meses: 12, maoObra: 0, servicos: 0, insumos: 0, total: 0 };
    }

    const dtIni = new Date(formContrato.dataInicio);
    const dtFim = new Date(formContrato.dataFim);
    const diffTime = Math.abs(dtFim.getTime() - dtIni.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const meses = Math.max(1, Math.round(diffDays / 30.4375));

    let custoMensalMaoObra = 0;
    for (const item of formItensMaoObra) {
      const q = Number(item.quantidadePostos) || 0;
      const v = Number(item.valorMensalPosto) || 0;
      custoMensalMaoObra += q * v;
    }

    const maoObra = custoMensalMaoObra * meses;
    const servicos = (Number(formContrato.valorAnualServicosEventuais || 0) / 12) * meses;
    const insumos = (Number(formContrato.valorAnualInsumos || 0) / 12) * meses;
    const diarias = (Number(formContrato.valorAnualDiarias || 0) / 12) * meses;
    const total = maoObra + servicos + insumos + diarias;

    return {
      meses,
      custoMensalMaoObra,
      maoObra,
      servicos,
      insumos,
      diarias,
      total,
    };
  }, [formContrato, formItensMaoObra]);

  const abrirModalNovoContrato = () => {
    setEditandoContratoId(null);
    setFormContrato({
      numero: '',
      ano: new Date().getFullYear().toString(),
      empresaId: empresas[0]?.id || '',
      dataInicio: new Date().toISOString().split('T')[0],
      dataFim: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      objeto: 'Prestação de serviços contínuos de manutenção predial preventiva e corretiva com dedicação exclusiva de mão de obra e sob demanda.',
      valorAnualServicosEventuais: '120000',
      valorAnualInsumos: '80000',
      valorAnualDiarias: '36000',
      valorDiariaUnitario: '150',
    });
    setFormItensMaoObra([
      { funcao: 'Eletricista', quantidadePostos: 2, valorMensalPosto: 3800, funcionarios: [] },
      { funcao: 'Encanador / Bombeiro Hidráulico', quantidadePostos: 1, valorMensalPosto: 3600, funcionarios: [] },
      { funcao: 'Pedreiro de Manutenção', quantidadePostos: 2, valorMensalPosto: 3400, funcionarios: [] },
      { funcao: 'Pintor', quantidadePostos: 1, valorMensalPosto: 3300, funcionarios: [] },
    ]);
    setModalContrato(true);
  };

  const abrirModalEditarContrato = () => {
    if (!contrato) return;
    setEditandoContratoId(contrato.id);
    setFormContrato({
      numero: contrato.numero,
      ano: contrato.ano.toString(),
      empresaId: contrato.empresaId,
      dataInicio: new Date(contrato.dataInicio).toISOString().split('T')[0],
      dataFim: new Date(contrato.dataFim).toISOString().split('T')[0],
      objeto: contrato.objeto,
      valorAnualServicosEventuais: (contrato.valorAnualServicosEventuais || 0).toString(),
      valorAnualInsumos: (contrato.valorAnualInsumos || 0).toString(),
      valorAnualDiarias: (contrato.valorAnualDiarias || 0).toString(),
      valorDiariaUnitario: (contrato.valorDiariaUnitario || 150).toString(),
    });
    setFormItensMaoObra(
      contrato.itensMaoObra?.map((i: any) => ({
        id: i.id,
        funcao: i.funcao,
        quantidadePostos: i.quantidadePostos,
        valorMensalPosto: i.valorMensalPosto,
        funcionarios: (i.funcionarios || []).map((f: any) => ({
          id: f.id,
          nomeCompleto: f.nomeCompleto,
          cpf: f.cpf,
        })),
        expandido: false,
      })) || []
    );
    setModalContrato(true);
  };

  const handleSalvarContrato = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvandoContrato(true);

    try {
      if (editandoContratoId) {
        // Editar Contrato e Sincronizar Mão de Obra Residente e Trabalhadores
        const res = await fetch('/api/contratos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            acao: 'EDITAR_CONTRATO',
            contratoId: editandoContratoId,
            ...formContrato,
            itensMaoObra: formItensMaoObra, // Sincroniza postos e trabalhadores vinculados
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setMensagem({ tipo: 'sucesso', texto: 'Contrato, postos e trabalhadores atualizados com sucesso!' });
      } else {
        // Criar Contrato com Postos, Trabalhadores e Cálculo Proporcional
        const res = await fetch('/api/contratos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            acao: 'CRIAR_CONTRATO',
            ...formContrato,
            itensMaoObra: formItensMaoObra,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setMensagem({ tipo: 'sucesso', texto: 'Contrato cadastrado com postos e cálculo proporcional com sucesso!' });
      }

      setModalContrato(false);
      carregarDados(contrato?.id);
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setSalvandoContrato(false);
    }
  };

  const handleExcluirContrato = async () => {
    if (!contrato) return;
    if (!confirm(`ATENÇÃO: Deseja realmente excluir o Contrato nº ${contrato.numero}/${contrato.ano}? Todos os postos, aditivos e cotas vinculadas serão removidos.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/contratos?id=${contrato.id}&tipo=CONTRATO`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMensagem({ tipo: 'sucesso', texto: 'Contrato excluído com sucesso.' });
      carregarDados();
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message });
    }
  };

  // Funções de manipulação de itens de mão de obra e trabalhadores no form do contrato
  const adicionarLinhaMaoObra = () => {
    setFormItensMaoObra([
      ...formItensMaoObra,
      { funcao: '', quantidadePostos: 1, valorMensalPosto: 0, funcionarios: [], expandido: true },
    ]);
  };

  const removerLinhaMaoObra = (index: number) => {
    setFormItensMaoObra(formItensMaoObra.filter((_, i) => i !== index));
  };

  const atualizarLinhaMaoObra = (index: number, campo: string, valor: any) => {
    const novos = [...formItensMaoObra];
    novos[index] = { ...novos[index], [campo]: valor };
    setFormItensMaoObra(novos);
  };

  const alternarExpansaoItem = (index: number) => {
    const novos = [...formItensMaoObra];
    novos[index] = { ...novos[index], expandido: !novos[index].expandido };
    setFormItensMaoObra(novos);
  };

  const adicionarTrabalhadorAoItem = (itemIndex: number) => {
    const novos = [...formItensMaoObra];
    const item = { ...novos[itemIndex] };
    const funcs = item.funcionarios ? [...item.funcionarios] : [];
    funcs.push({ nomeCompleto: '', cpf: '' });
    item.funcionarios = funcs;
    item.expandido = true;
    novos[itemIndex] = item;
    setFormItensMaoObra(novos);
  };

  const removerTrabalhadorDoItem = (itemIndex: number, funcIndex: number) => {
    const novos = [...formItensMaoObra];
    const item = { ...novos[itemIndex] };
    if (item.funcionarios) {
      item.funcionarios = item.funcionarios.filter((_, idx) => idx !== funcIndex);
      novos[itemIndex] = item;
      setFormItensMaoObra(novos);
    }
  };

  const atualizarTrabalhadorDoItem = (
    itemIndex: number,
    funcIndex: number,
    campo: 'nomeCompleto' | 'cpf',
    valor: string
  ) => {
    const novos = [...formItensMaoObra];
    const item = { ...novos[itemIndex] };
    if (item.funcionarios) {
      const funcs = [...item.funcionarios];
      funcs[funcIndex] = { ...funcs[funcIndex], [campo]: valor };
      item.funcionarios = funcs;
      novos[itemIndex] = item;
      setFormItensMaoObra(novos);
    }
  };

  // Gerenciamento de Postos de Mão de Obra Avulsos
  const abrirModalNovoPosto = () => {
    setEditandoPostoId(null);
    setFormNovoPosto({ funcao: '', quantidadePostos: '1', valorMensalPosto: '' });
    setModalNovoPosto(true);
  };

  const abrirModalEditarPosto = (item: any) => {
    setEditandoPostoId(item.id);
    setFormNovoPosto({
      funcao: item.funcao,
      quantidadePostos: item.quantidadePostos.toString(),
      valorMensalPosto: item.valorMensalPosto.toString(),
    });
    setModalNovoPosto(true);
  };

  const handleSalvarNovoPosto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contrato || !formNovoPosto.funcao || !formNovoPosto.valorMensalPosto) {
      alert('Informe a função e o valor mensal do posto.');
      return;
    }

    setSalvandoPosto(true);
    try {
      if (editandoPostoId) {
        // Editar Posto Existente
        const res = await fetch('/api/contratos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            acao: 'EDITAR_ITEM_MAO_OBRA',
            itemId: editandoPostoId,
            contratoId: contrato.id,
            ...formNovoPosto,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        setMensagem({ tipo: 'sucesso', texto: 'Posto de mão de obra atualizado com sucesso!' });
      } else {
        // Adicionar Novo Posto
        const res = await fetch('/api/contratos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            acao: 'ADICIONAR_ITEM_MAO_OBRA',
            contratoId: contrato.id,
            ...formNovoPosto,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        setMensagem({ tipo: 'sucesso', texto: 'Posto de mão de obra adicionado ao contrato com sucesso!' });
      }

      setModalNovoPosto(false);
      setEditandoPostoId(null);
      setFormNovoPosto({ funcao: '', quantidadePostos: '1', valorMensalPosto: '' });
      carregarDados(contrato.id);
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setSalvandoPosto(false);
    }
  };

  // Repactuação por convenção coletiva
  const abrirModalRepactuar = (item: any) => {
    setItemParaRepactuar(item);
    setFormRepactuacao({
      novoValorMensalPosto: item.valorMensalPosto.toString(),
      motivo: 'Convenção Coletiva de Trabalho (CCT) - Reajuste Salarial',
      numeroRepactuacao: `Repactuação CCT - ${item.funcao}`,
      detalhes: '',
    });
    setModalRepactuacao(true);
  };

  const handleSalvarRepactuacao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemParaRepactuar) return;

    try {
      const res = await fetch('/api/contratos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acao: 'REPACTUAR_POSTO',
          contratoId: contrato.id,
          itemId: itemParaRepactuar.id,
          ...formRepactuacao,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMensagem({ tipo: 'sucesso', texto: 'Posto repactuado por convenção coletiva com sucesso!' });
      setModalRepactuacao(false);
      carregarDados(contrato.id);
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message });
    }
  };

  // ================= GESTÃO DE TRABALHADORES VINCULADOS AOS POSTOS =================
  const abrirModalNovoTrabalhador = (itemMaoObraIdDefault?: string) => {
    if (!contrato?.itensMaoObra || contrato.itensMaoObra.length === 0) {
      setMensagem({
        tipo: 'erro',
        texto: 'Para vincular trabalhadores, cadastre primeiro as funções e postos de mão de obra do contrato.',
      });
      setModalNovoPosto(true);
      return;
    }

    setEditandoTrabalhadorId(null);
    setFormTrabalhador({
      itemMaoObraId: itemMaoObraIdDefault || contrato.itensMaoObra[0]?.id || '',
      nomeCompleto: '',
      cpf: '',
    });
    setModalTrabalhador(true);
  };

  const abrirModalEditarTrabalhador = (trab: any) => {
    setEditandoTrabalhadorId(trab.id);
    setFormTrabalhador({
      itemMaoObraId: trab.itemMaoObraId,
      nomeCompleto: trab.nomeCompleto,
      cpf: trab.cpf,
    });
    setModalTrabalhador(true);
  };

  const handleSalvarTrabalhador = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTrabalhador.itemMaoObraId || !formTrabalhador.nomeCompleto || !formTrabalhador.cpf) {
      alert('Selecione a função e informe nome completo e CPF do trabalhador.');
      return;
    }

    setSalvandoTrabalhador(true);
    try {
      const res = await fetch('/api/contratos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acao: 'SALVAR_TRABALHADOR',
          funcionarioId: editandoTrabalhadorId,
          contratoId: contrato.id,
          ...formTrabalhador,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMensagem({
        tipo: 'sucesso',
        texto: editandoTrabalhadorId ? 'Trabalhador atualizado com sucesso!' : 'Trabalhador cadastrado e vinculado à função com sucesso!',
      });
      setModalTrabalhador(false);
      carregarDados(contrato.id);
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setSalvandoTrabalhador(false);
    }
  };

  const handleExcluirTrabalhador = async (funcId: string, nome: string) => {
    if (!confirm(`Deseja realmente desvincular/excluir o trabalhador ${nome}?`)) return;

    try {
      const res = await fetch(`/api/contratos?id=${funcId}&tipo=TRABALHADOR`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMensagem({ tipo: 'sucesso', texto: 'Trabalhador desvinculado com sucesso.' });
      carregarDados(contrato.id);
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message });
    }
  };

  const handleExcluirItemMaoObra = async (itemId: string, funcao: string) => {
    if (!confirm(`Deseja remover o posto de ${funcao}? Os trabalhadores alocados e o valor total do contrato serão recalculados.`)) return;

    try {
      const res = await fetch(`/api/contratos?id=${itemId}&tipo=ITEM_MAO_OBRA`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMensagem({ tipo: 'sucesso', texto: 'Posto de mão de obra excluído e contrato recalculado.' });
      carregarDados(contrato.id);
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message });
    }
  };

  // ================= EMPRESAS CONTRATADAS =================
  const abrirModalNovaEmpresa = () => {
    setEditandoEmpresaId(null);
    setFormEmpresa({
      razaoSocial: '',
      nomeFantasia: '',
      cnpj: '',
      email: '',
      telefone: '',
    });
    setModalEmpresa(true);
  };

  const abrirModalEditarEmpresa = (empresa: any) => {
    setEditandoEmpresaId(empresa.id);
    setFormEmpresa({
      razaoSocial: empresa.razaoSocial,
      nomeFantasia: empresa.nomeFantasia || '',
      cnpj: empresa.cnpj,
      email: empresa.email,
      telefone: empresa.telefone || '',
    });
    setModalEmpresa(true);
  };

  const handleSalvarEmpresa = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvandoEmpresa(true);

    try {
      const acao = editandoEmpresaId ? 'EDITAR_EMPRESA' : 'CRIAR_EMPRESA';
      const res = await fetch('/api/contratos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acao,
          empresaId: editandoEmpresaId,
          ...formEmpresa,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMensagem({
        tipo: 'sucesso',
        texto: editandoEmpresaId ? 'Empresa contratada atualizada com sucesso!' : 'Empresa contratada cadastrada com sucesso!',
      });

      if (data.empresa && modalContrato) {
        setFormContrato((prev) => ({ ...prev, empresaId: data.empresa.id }));
      }

      setModalEmpresa(false);
      carregarDados(contrato?.id);
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setSalvandoEmpresa(false);
    }
  };

  const handleExcluirEmpresa = async (empresaId: string, razaoSocial: string) => {
    if (!confirm(`Deseja realmente excluir/inativar a empresa contratada ${razaoSocial}?`)) return;

    try {
      const res = await fetch(`/api/contratos?id=${empresaId}&tipo=EMPRESA`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMensagem({ tipo: 'sucesso', texto: data.message || 'Empresa excluída com sucesso!' });
      carregarDados(contrato?.id);
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message });
    }
  };

  // Cota de unidade
  const handleSalvarCota = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contrato || !cotaUnidadeId || !cotaAnual) {
      alert('Selecione a unidade e informe a cota anual.');
      return;
    }

    try {
      const res = await fetch('/api/contratos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acao: 'DEFINIR_COTA',
          contratoId: contrato.id,
          unidadeId: cotaUnidadeId,
          cotaAnual,
          cotaMensal,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMensagem({ tipo: 'sucesso', texto: 'Cota da unidade definida com sucesso!' });
      setModalCota(false);
      setCotaUnidadeId('');
      setCotaAnual('');
      setCotaMensal('');
      carregarDados(contrato.id);
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message });
    }
  };

  const handleExcluirCota = async (cotaId: string, unidadeNome: string) => {
    if (!confirm(`Deseja remover a cota da unidade ${unidadeNome}?`)) return;

    try {
      const res = await fetch(`/api/contratos?id=${cotaId}&tipo=COTA`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMensagem({ tipo: 'sucesso', texto: 'Cota da unidade removida.' });
      carregarDados(contrato.id);
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message });
    }
  };

  // Aditivo
  const handleSalvarAditivo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contrato) return;

    try {
      const res = await fetch('/api/contratos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contratoId: contrato.id,
          numero: numAditivo,
          tipo: tipoAditivo,
          valorAjuste: tipoAditivo === 'VALOR' ? valorAjuste : null,
          novaDataFim: tipoAditivo === 'PRAZO' ? novaDataFim : null,
          notaEmpenho: tipoAditivo === 'VALOR' ? notaEmpenho : null,
          dataReforcoEmpenho: tipoAditivo === 'VALOR' ? dataReforco : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMensagem({ tipo: 'sucesso', texto: 'Termo Aditivo registrado com sucesso!' });
      setModalAditivo(false);
      setNumAditivo('');
      setValorAjuste('');
      setNovaDataFim('');
      setNotaEmpenho('');
      setDataReforco('');
      carregarDados(contrato.id);
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message });
    }
  };

  const handleExcluirAditivo = async (aditivoId: string, numero: string) => {
    if (!confirm(`Deseja excluir o aditivo ${numero}? Se for aditivo de valor, o saldo será estornado.`)) return;

    try {
      const res = await fetch(`/api/contratos?id=${aditivoId}&tipo=ADITIVO`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMensagem({ tipo: 'sucesso', texto: 'Aditivo excluído com sucesso!' });
      carregarDados(contrato.id);
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message });
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      <Sidebar role={user?.role || ''} />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Navbar user={user} />

        <main className="p-6 max-w-7xl w-full mx-auto space-y-6">
          {/* Cabeçalho */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                  <DollarSign className="w-7 h-7 text-[#003366]" />
                  Gestão de Contratos, Postos & Trabalhadores
                </h1>
                {contrato && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Contrato nº {contrato.numero}/{contrato.ano}
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500 mt-1">
                Controle integral de funções, postos mensais, cadastro e vínculo de trabalhadores, empresas e cotas por unidade.
              </p>
            </div>

            {isAdmin && (
              <div className="flex items-center gap-2 flex-wrap">
                {todosContratos.length > 1 && (
                  <select
                    value={contrato?.id || ''}
                    onChange={(e) => carregarDados(e.target.value)}
                    className="text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-700 font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-[#003366]"
                  >
                    {todosContratos.map((c) => (
                      <option key={c.id} value={c.id}>
                        Nº {c.numero}/{c.ano} — {c.empresaNome}
                      </option>
                    ))}
                  </select>
                )}

                <button
                  onClick={abrirModalNovaEmpresa}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-200 border border-slate-300 transition-colors"
                >
                  <Building className="w-3.5 h-3.5" />
                  + Empresa
                </button>

                <button
                  onClick={abrirModalNovoContrato}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#003366] text-white rounded-lg text-xs font-semibold hover:bg-blue-900 transition-colors shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  Novo Contrato
                </button>

                {contrato && (
                  <>
                    <button
                      onClick={abrirModalEditarContrato}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-200 border border-slate-300 transition-colors"
                      title="Editar Contrato e Postos"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Editar Contrato
                    </button>

                    <button
                      onClick={handleExcluirContrato}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-50 text-rose-700 rounded-lg text-xs font-medium hover:bg-rose-100 border border-rose-200 transition-colors"
                      title="Excluir Contrato"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Excluir
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Notificações */}
          {mensagem && (
            <div
              className={`p-4 rounded-xl flex items-center justify-between text-sm ${
                mensagem.tipo === 'sucesso'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {mensagem.tipo === 'sucesso' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-rose-600" />}
                <p className="font-medium">{mensagem.texto}</p>
              </div>
              <button onClick={() => setMensagem(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {carregando ? (
            <div className="text-center py-20 text-slate-400 text-sm">Carregando dados dos contratos e postos...</div>
          ) : !contrato && abaAtiva !== 'EMPRESAS' ? (
            <div className="bg-white border rounded-2xl p-12 text-center space-y-4 shadow-sm">
              <FileText className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-lg font-bold text-slate-700">Nenhum Contrato Ativo Cadastrado</h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                Cadastre a empresa vencedora e o contrato para parametrizar os postos de mão de obra residente, trabalhadores vinculados e itens sob demanda.
              </p>
              {isAdmin && (
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    onClick={abrirModalNovaEmpresa}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-200 border transition-colors"
                  >
                    <Building className="w-4 h-4" />
                    Cadastrar Empresa
                  </button>
                  <button
                    onClick={abrirModalNovoContrato}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#003366] text-white rounded-xl text-sm font-semibold hover:bg-blue-900 transition-colors shadow"
                  >
                    <Plus className="w-4 h-4" />
                    Cadastrar Primeiro Contrato
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Cards de Métricas: Painel de Controle de Saldos por Rubrica e Composição Contratual */}
              {contrato && (
                <div className="space-y-4">
                  {/* Bloco Geral: Resumo Consolidado do Contrato */}
                  <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-sm border border-slate-800">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-slate-800 gap-2">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-emerald-400" />
                        <div>
                          <h3 className="text-sm font-bold tracking-tight text-white uppercase">
                            Controle Orçamentário e Evolução de Saldos por Rubrica
                          </h3>
                          <span className="text-[11px] text-slate-400">
                            Composição total: Mão de Obra Residente + Insumos + Serviços Eventuais + Diárias de Deslocamento
                          </span>
                        </div>
                      </div>
                      <div className="text-xs text-slate-300 flex items-center gap-2 font-mono flex-wrap">
                        <span className="bg-slate-800 px-2 py-1 rounded text-slate-300 border border-slate-700">
                          Vigência: <strong className="text-white">{contrato.mesesVigencia || 12} meses</strong>
                        </span>
                        <span className="bg-slate-800 px-2 py-1 rounded text-emerald-300 border border-slate-700">
                          Total Contratado: <strong className="text-white">R$ {(contrato.valorContratado || contrato.valorTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Os 4 Cartões de Rubrica do Contrato */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Rubrica 1: Mão de Obra Residente (Fixo) */}
                      <div className="bg-slate-800/90 rounded-xl p-4 border border-slate-700 flex flex-col justify-between space-y-3">
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-900/60 text-blue-300 border border-blue-700/50">
                              Custo Fixo Mensal
                            </span>
                            <Users className="w-4 h-4 text-blue-400 shrink-0" />
                          </div>
                          <h4 className="text-xs font-bold text-slate-200">1. Mão de Obra Residente</h4>
                          <div className="text-xl font-black text-white font-mono mt-1">
                            R$ {(contrato.rubricas?.maoObra?.contratado ?? contrato.valorMaoObraResidente ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                          <div className="text-[11px] text-slate-300 mt-1">
                            Custo mensal: <strong className="text-blue-300 font-mono">R$ {(contrato.rubricas?.maoObra?.custoMensal ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês</strong>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {contrato.rubricas?.maoObra?.quantidadePostos ?? (contrato.itensMaoObra?.reduce((acc: number, i: any) => acc + i.quantidadePostos, 0) || 0)} postos dedicados
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-700/60 text-[10px] text-slate-400 leading-tight">
                          💡 Custo mensal fixo de postos residentes. Não sofre dedução por abertura de chamados.
                        </div>
                      </div>

                      {/* Rubrica 2: Insumos sob Demanda (Chamados Rotineiros) */}
                      <div className="bg-slate-800/90 rounded-xl p-4 border border-purple-900/40 flex flex-col justify-between space-y-3">
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-900/60 text-purple-300 border border-purple-700/50">
                              Sob Demanda
                            </span>
                            <Layers className="w-4 h-4 text-purple-400 shrink-0" />
                          </div>
                          <h4 className="text-xs font-bold text-slate-200">2. Insumos sob Demanda</h4>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            Contratado: <strong className="text-slate-200 font-mono">R$ {(contrato.rubricas?.insumos?.contratado ?? contrato.valorInsumos ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                          </div>
                          <div className="mt-2 bg-slate-900/80 p-2.5 rounded-lg border border-purple-900/30">
                            <span className="text-[10px] text-emerald-400 font-bold uppercase block">Saldo Disponível Real</span>
                            <span className="text-lg font-extrabold text-emerald-300 font-mono">
                              R$ {(contrato.rubricas?.insumos?.saldoDisponivel ?? Math.max(0, (contrato.valorInsumos ? parseFloat(contrato.valorInsumos.toString()) : 0) - (contrato.rubricas?.insumos?.provisionado ?? 0) - (contrato.rubricas?.insumos?.liquidado ?? 0))).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div className="mt-2 grid grid-cols-2 gap-1 text-[10px] text-slate-300">
                            <div>Liq: <span className="font-mono text-purple-300">R$ {(contrato.rubricas?.insumos?.liquidado ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</span></div>
                            <div>Prov: <span className="font-mono text-amber-300">R$ {(contrato.rubricas?.insumos?.provisionado ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</span></div>
                          </div>
                          <div className="mt-2 flex items-center gap-1.5">
                            <div className="flex-1 bg-slate-700 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-purple-400 h-full rounded-full"
                                style={{ width: `${Math.min(100, contrato.rubricas?.insumos?.percentualConsumido || 0)}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-mono text-slate-300 font-bold">
                              {contrato.rubricas?.insumos?.percentualConsumido || 0}%
                            </span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-700/60 text-[10px] text-purple-200/70 leading-tight">
                          Debitado a partir dos insumos executados nos chamados rotineiros da mão de obra residente.
                        </div>
                      </div>

                      {/* Rubrica 3: Serviços Eventuais (Mão de Obra Eventual + Insumos) */}
                      <div className="bg-slate-800/90 rounded-xl p-4 border border-amber-900/40 flex flex-col justify-between space-y-3">
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-900/60 text-amber-300 border border-amber-700/50">
                              Sob Demanda
                            </span>
                            <Briefcase className="w-4 h-4 text-amber-400 shrink-0" />
                          </div>
                          <h4 className="text-xs font-bold text-slate-200">3. Serviços Eventuais</h4>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            Contratado: <strong className="text-slate-200 font-mono">R$ {(contrato.rubricas?.servicosEventuais?.contratado ?? contrato.valorServicosEventuais ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                          </div>
                          <div className="mt-2 bg-slate-900/80 p-2.5 rounded-lg border border-amber-900/30">
                            <span className="text-[10px] text-emerald-400 font-bold uppercase block">Saldo Disponível Real</span>
                            <span className="text-lg font-extrabold text-emerald-300 font-mono">
                              R$ {(contrato.rubricas?.servicosEventuais?.saldoDisponivel ?? Math.max(0, (contrato.valorServicosEventuais ? parseFloat(contrato.valorServicosEventuais.toString()) : 0) - (contrato.rubricas?.servicosEventuais?.provisionado ?? 0) - (contrato.rubricas?.servicosEventuais?.liquidado ?? 0))).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div className="mt-2 grid grid-cols-2 gap-1 text-[10px] text-slate-300">
                            <div>Liq: <span className="font-mono text-blue-300">R$ {(contrato.rubricas?.servicosEventuais?.liquidado ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</span></div>
                            <div>Prov: <span className="font-mono text-amber-300">R$ {(contrato.rubricas?.servicosEventuais?.provisionado ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</span></div>
                          </div>
                          <div className="mt-2 flex items-center gap-1.5">
                            <div className="flex-1 bg-slate-700 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-amber-400 h-full rounded-full"
                                style={{ width: `${Math.min(100, contrato.rubricas?.servicosEventuais?.percentualConsumido || 0)}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-mono text-slate-300 font-bold">
                              {contrato.rubricas?.servicosEventuais?.percentualConsumido || 0}%
                            </span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-700/60 text-[10px] text-amber-200/70 leading-tight">
                          Debitado nos chamados eventuais (engloba mão de obra eventual + materiais).
                        </div>
                      </div>

                      {/* Rubrica 4: Diárias de Deslocamento de Sede */}
                      <div className="bg-slate-800/90 rounded-xl p-4 border border-teal-900/40 flex flex-col justify-between space-y-3">
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-teal-900/60 text-teal-300 border border-teal-700/50">
                              Sob Demanda
                            </span>
                            <Building2 className="w-4 h-4 text-teal-400 shrink-0" />
                          </div>
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-slate-200">4. Diárias Deslocamento</h4>
                            <span className="text-[10px] text-teal-300 font-mono">
                              R$ {contrato.valorDiariaUnitario || 150}/dia
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            Contratado: <strong className="text-slate-200 font-mono">R$ {(contrato.rubricas?.diarias?.contratado ?? contrato.valorDiarias ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                            <span className="text-teal-300 ml-1">({contrato.rubricas?.diarias?.diasContratados || 0} dias)</span>
                          </div>
                          <div className="mt-2 bg-slate-900/80 p-2.5 rounded-lg border border-teal-900/30">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-emerald-400 font-bold uppercase">Saldo Disponível</span>
                              <span className="text-xs font-bold text-teal-300 font-mono">
                                {contrato.rubricas?.diarias?.saldoDiasDisponivel ?? 0} diárias
                              </span>
                            </div>
                            <span className="text-lg font-extrabold text-emerald-300 font-mono block">
                              R$ {(contrato.rubricas?.diarias?.saldoDisponivel ?? Math.max(0, (contrato.valorDiarias ? parseFloat(contrato.valorDiarias.toString()) : 0) - (contrato.rubricas?.diarias?.provisionado ?? 0) - (contrato.rubricas?.diarias?.liquidado ?? 0))).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div className="mt-2 grid grid-cols-2 gap-1 text-[10px] text-slate-300">
                            <div>Liq: <span className="font-mono text-teal-300">{contrato.rubricas?.diarias?.diasLiquidados || 0} d.</span></div>
                            <div>Prov: <span className="font-mono text-amber-300">{contrato.rubricas?.diarias?.diasProvisionados || 0} d.</span></div>
                          </div>
                          <div className="mt-2 flex items-center gap-1.5">
                            <div className="flex-1 bg-slate-700 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-teal-400 h-full rounded-full"
                                style={{ width: `${Math.min(100, contrato.rubricas?.diarias?.percentualConsumido || 0)}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-mono text-slate-300 font-bold">
                              {contrato.rubricas?.diarias?.percentualConsumido || 0}%
                            </span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-700/60 text-[10px] text-teal-200/70 leading-tight">
                          Debitado quando o fornecedor declara deslocamento da equipe residente para outras sedes.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Informações da Contratada e Período */}
              {contrato && (
                <div className="bg-slate-100 rounded-xl p-4 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                  <div>
                    <span className="text-slate-500">Empresa Contratada:</span>
                    <strong className="text-slate-800 ml-1.5 text-sm">{contrato.empresa.razaoSocial}</strong>
                    <span className="text-slate-500 ml-2">CNPJ: {contrato.empresa.cnpj}</span>
                  </div>
                  <div className="flex items-center gap-4 text-slate-600 flex-wrap">
                    <div>
                      Início: <strong className="text-slate-800">{new Date(contrato.dataInicio).toLocaleDateString('pt-BR')}</strong>
                    </div>
                    <div>
                      Término: <strong className="text-slate-800">{new Date(contrato.dataFim).toLocaleDateString('pt-BR')}</strong>
                    </div>
                    <div>
                      Garantia: <strong className="text-slate-800">{contrato.prazoGarantiaDias || 90} dias</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Navegação por Abas */}
              <div className="border-b border-slate-200 flex gap-2 flex-wrap">
                <button
                  onClick={() => setAbaAtiva('MAO_OBRA')}
                  className={`pb-3 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
                    abaAtiva === 'MAO_OBRA'
                      ? 'border-[#003366] text-[#003366]'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  Mão de Obra Residente & Trabalhadores
                  <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] text-slate-600">
                    {contrato?.itensMaoObra?.length || 0} funções / {listaTrabalhadores.length} pessoas
                  </span>
                </button>

                <button
                  onClick={() => setAbaAtiva('DEMANDA')}
                  className={`pb-3 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
                    abaAtiva === 'DEMANDA'
                      ? 'border-[#003366] text-[#003366]'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Briefcase className="w-4 h-4" />
                  Itens Sob Demanda (Eventuais & Insumos)
                </button>

                <button
                  onClick={() => setAbaAtiva('COTAS')}
                  className={`pb-3 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
                    abaAtiva === 'COTAS'
                      ? 'border-[#003366] text-[#003366]'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  Cotas das Unidades Demandantes
                  <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] text-slate-600">
                    {cotas.length}
                  </span>
                </button>

                <button
                  onClick={() => setAbaAtiva('HISTORICO')}
                  className={`pb-3 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
                    abaAtiva === 'HISTORICO'
                      ? 'border-[#003366] text-[#003366]'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <TrendingUp className="w-4 h-4" />
                  Repactuações & Aditivos
                  <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] text-slate-600">
                    {(contrato?.repactuacoes?.length || 0) + (contrato?.aditivos?.length || 0)}
                  </span>
                </button>

                <button
                  onClick={() => setAbaAtiva('EMPRESAS')}
                  className={`pb-3 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
                    abaAtiva === 'EMPRESAS'
                      ? 'border-[#003366] text-[#003366]'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Building className="w-4 h-4" />
                  Empresas Contratadas
                  <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] text-slate-600">
                    {empresas.length}
                  </span>
                </button>
              </div>

              {/* ================= CONTEÚDO DA ABA 1: MÃO DE OBRA RESIDENTE & TRABALHADORES ================= */}
              {abaAtiva === 'MAO_OBRA' && contrato && (
                <div className="space-y-8">
                  {/* BLOCO 1: POSTOS E FUNÇÕES DE TRABALHO DO CONTRATO */}
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                      <div>
                        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                          <Briefcase className="w-4 h-4 text-[#003366]" />
                          1. Funções e Postos de Mão de Obra Residente no Contrato
                        </h3>
                        <p className="text-xs text-slate-500">
                          Defina a função, quantidade de postos mensais e o valor unitário por posto (reajustável por CCT).
                        </p>
                      </div>

                      {isAdmin && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={abrirModalNovoPosto}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#003366] text-white rounded-lg text-xs font-bold hover:bg-blue-900 transition-colors shadow-sm"
                          >
                            <Plus className="w-4 h-4" />
                            + Adicionar Função / Posto
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600 font-semibold border-b">
                          <tr>
                            <th className="p-3">Função / Posto de Trabalho</th>
                            <th className="p-3 text-center">Qtd. Postos</th>
                            <th className="p-3 text-right">Valor Posto (Mensal)</th>
                            <th className="p-3 text-right">Total Mensal</th>
                            <th className="p-3 text-right">Custo na Vigência ({contrato.mesesVigencia || 12}m)</th>
                            <th className="p-3 text-center">Trabalhadores Alocados</th>
                            {isAdmin && <th className="p-3 text-right">Ações</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {contrato.itensMaoObra?.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="p-8 text-center text-slate-400">
                                <div className="max-w-md mx-auto space-y-3">
                                  <Users className="w-8 h-8 text-slate-300 mx-auto" />
                                  <p className="text-sm font-medium text-slate-600">
                                    Nenhum posto de mão de obra residente cadastrado neste contrato.
                                  </p>
                                  <p className="text-xs text-slate-400">
                                    Você pode adicionar postos de mão de obra individualmente ou editar os itens no contrato completo.
                                  </p>
                                  {isAdmin && (
                                    <div className="flex justify-center gap-2 pt-1">
                                      <button
                                        onClick={abrirModalNovoPosto}
                                        className="px-3 py-1.5 bg-[#003366] text-white rounded-lg text-xs font-bold hover:bg-blue-900 shadow-sm"
                                      >
                                        + Adicionar Posto / Função
                                      </button>
                                      <button
                                        onClick={abrirModalEditarContrato}
                                        className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200 border"
                                      >
                                        Editar Contrato
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ) : (
                            contrato.itensMaoObra?.map((item: any) => {
                              const qtdPostos = item.quantidadePostos || 1;
                              const funcsItem = item.funcionarios || [];
                              const completo = funcsItem.length >= qtdPostos;

                              return (
                                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                                  <td className="p-3 font-semibold text-slate-900">
                                    <div className="flex items-center gap-2">
                                      <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#003366] flex items-center justify-center font-bold text-xs">
                                        {item.funcao.charAt(0).toUpperCase()}
                                      </div>
                                      <div>
                                        <span>{item.funcao}</span>
                                        {funcsItem.length > 0 && (
                                          <div className="flex flex-wrap gap-1 mt-1">
                                            {funcsItem.map((f: any) => (
                                              <span
                                                key={f.id}
                                                className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-normal border border-slate-200"
                                                title={`CPF: ${f.cpf}`}
                                              >
                                                <UserCheck className="w-2.5 h-2.5 text-emerald-600" />
                                                {f.nomeCompleto}
                                              </span>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="p-3 text-center font-bold text-slate-800">
                                    <span className="inline-block px-2.5 py-0.5 bg-blue-50 text-blue-800 rounded-full font-semibold border border-blue-200">
                                      {qtdPostos} {qtdPostos === 1 ? 'posto' : 'postos'}
                                    </span>
                                  </td>
                                  <td className="p-3 text-right font-medium font-mono">
                                    R$ {item.valorMensalPosto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </td>
                                  <td className="p-3 text-right font-medium text-slate-800 font-mono">
                                    R$ {item.valorTotalMensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </td>
                                  <td className="p-3 text-right font-bold text-[#003366] font-mono">
                                    R$ {item.valorTotalVigencia.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </td>
                                  <td className="p-3 text-center">
                                    <span
                                      className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                        completo
                                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                                      }`}
                                    >
                                      {funcsItem.length} / {qtdPostos} {completo ? 'preenchidos' : 'alocados'}
                                    </span>
                                  </td>
                                  {isAdmin && (
                                    <td className="p-3 text-right whitespace-nowrap">
                                      <div className="flex items-center justify-end gap-1.5">
                                        <button
                                          onClick={() => abrirModalEditarPosto(item)}
                                          className="px-2.5 py-1 bg-blue-50 text-[#003366] hover:bg-blue-100 rounded text-xs font-semibold flex items-center gap-1 border border-blue-200 transition-colors shadow-sm"
                                          title="Editar Dados deste Posto (Função, Qtd. de Postos ou Valor Mensal)"
                                        >
                                          <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                                          Editar
                                        </button>

                                        <button
                                          onClick={() => abrirModalNovoTrabalhador(item.id)}
                                          className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded text-xs font-semibold flex items-center gap-1 border border-emerald-200 shadow-sm"
                                          title="Cadastrar / Incluir Trabalhador neste posto"
                                        >
                                          <UserPlus className="w-3.5 h-3.5 text-emerald-600" />
                                          + Trabalhador
                                        </button>

                                        <button
                                          onClick={() => abrirModalRepactuar(item)}
                                          className="px-2 py-1 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded text-xs font-medium flex items-center gap-1 border border-amber-200"
                                          title="Repactuar Valor do Posto por Convenção Coletiva"
                                        >
                                          <TrendingUp className="w-3 h-3" />
                                          Repactuar (CCT)
                                        </button>

                                        <button
                                          onClick={() => handleExcluirItemMaoObra(item.id, item.funcao)}
                                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded transition-colors"
                                          title="Excluir Posto"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </td>
                                  )}
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* BLOCO 2: QUADRO DE TRABALHADORES VINCULADOS ÀS FUNÇÕES DO CONTRATO */}
                  <div className="space-y-3 pt-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                      <div>
                        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                          <Users className="w-4 h-4 text-emerald-600" />
                          2. Quadro de Trabalhadores Alocados às Funções do Contrato
                        </h3>
                        <p className="text-xs text-slate-500">
                          Cadastre, edite, inclua ou exclua os colaboradores efetivamente alocados a cada função contratual de referência.
                        </p>
                      </div>

                      {isAdmin && (
                        <button
                          onClick={() => abrirModalNovoTrabalhador()}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors shadow"
                        >
                          <UserPlus className="w-4 h-4" />
                          + Cadastrar / Incluir Trabalhador
                        </button>
                      )}
                    </div>

                    {/* Barra de Filtros e Busca */}
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
                        <div className="relative w-full sm:w-80">
                          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                          <input
                            type="text"
                            placeholder="Buscar trabalhador por nome ou CPF..."
                            value={buscaTrabalhador}
                            onChange={(e) => setBuscaTrabalhador(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>

                        <div className="relative w-full sm:w-64">
                          <select
                            value={filtroFuncaoTrabalhador}
                            onChange={(e) => setFiltroFuncaoTrabalhador(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          >
                            <option value="">Todas as Funções ({listaTrabalhadores.length})</option>
                            {contrato.itensMaoObra?.map((item: any) => (
                              <option key={item.id} value={item.id}>
                                {item.funcao} ({item.funcionarios?.length || 0})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="text-xs text-slate-500 whitespace-nowrap">
                        Exibindo <strong>{trabalhadoresFiltrados.length}</strong> de <strong>{listaTrabalhadores.length}</strong> trabalhadores
                      </div>
                    </div>

                    {/* Tabela de Trabalhadores */}
                    <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600 font-semibold border-b">
                          <tr>
                            <th className="p-3">Nome Completo do Trabalhador</th>
                            <th className="p-3">CPF</th>
                            <th className="p-3">Função Contratual de Referência</th>
                            <th className="p-3 text-center">Status</th>
                            {isAdmin && <th className="p-3 text-right">Ações</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {trabalhadoresFiltrados.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="p-8 text-center text-slate-400">
                                {listaTrabalhadores.length === 0 ? (
                                  <div className="max-w-md mx-auto space-y-2">
                                    <UserCheck className="w-8 h-8 text-slate-300 mx-auto" />
                                    <p className="text-sm font-semibold text-slate-600">
                                      Nenhum trabalhador vinculado às funções deste contrato ainda.
                                    </p>
                                    <p className="text-xs text-slate-400">
                                      Clique no botão verde acima <strong>"Cadastrar / Incluir Trabalhador"</strong> para alocar o primeiro colaborador a uma função contratual previamente cadastrada.
                                    </p>
                                  </div>
                                ) : (
                                  <div>Nenhum trabalhador corresponde aos filtros de busca aplicados.</div>
                                )}
                              </td>
                            </tr>
                          ) : (
                            trabalhadoresFiltrados.map((trab) => (
                              <tr key={trab.id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="p-3 font-semibold text-slate-900">
                                  <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold text-xs border border-emerald-200">
                                      {trab.nomeCompleto.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="text-xs font-bold text-slate-800">{trab.nomeCompleto}</span>
                                  </div>
                                </td>
                                <td className="p-3 font-mono font-medium text-slate-600">{trab.cpf}</td>
                                <td className="p-3">
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-[#003366] border border-blue-200">
                                    <Briefcase className="w-3 h-3 text-blue-600" />
                                    {trab.funcao}
                                  </span>
                                </td>
                                <td className="p-3 text-center">
                                  <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold px-2 py-0.5 bg-emerald-50 rounded-full border border-emerald-200 text-[11px]">
                                    <BadgeCheck className="w-3.5 h-3.5 text-emerald-600" />
                                    Ativo
                                  </span>
                                </td>
                                {isAdmin && (
                                  <td className="p-3 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                      <button
                                        onClick={() => abrirModalEditarTrabalhador(trab)}
                                        className="px-2.5 py-1 bg-blue-50 text-[#003366] hover:bg-blue-100 rounded text-xs font-semibold flex items-center gap-1 border border-blue-200 transition-colors"
                                        title="Editar Dados do Trabalhador ou Transferir Função"
                                      >
                                        <Edit2 className="w-3 h-3 text-blue-600" />
                                        Editar
                                      </button>
                                      <button
                                        onClick={() => handleExcluirTrabalhador(trab.id, trab.nomeCompleto)}
                                        className="px-2.5 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded text-xs font-semibold flex items-center gap-1 border border-rose-200 transition-colors"
                                        title="Desvincular / Excluir Trabalhador da Função"
                                      >
                                        <Trash2 className="w-3 h-3 text-rose-600" />
                                        Excluir
                                      </button>
                                    </div>
                                  </td>
                                )}
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* CONTEÚDO DA ABA 2: ITENS SOB DEMANDA */}
              {abaAtiva === 'DEMANDA' && contrato && (
                <div className="space-y-6">
                  {/* Tabela de Evolução e Saldos por Rubrica Sob Demanda */}
                  <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
                    <div className="p-4 border-b bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                          <Briefcase className="w-4 h-4 text-[#003366]" />
                          Painel de Evolução e Saldos das Rubricas Sob Demanda
                        </h3>
                        <p className="text-xs text-slate-500">
                          Acompanhamento do consumo variável ao longo dos meses para insumos, serviços eventuais e diárias de deslocamento.
                        </p>
                      </div>
                      <span className="text-xs bg-emerald-50 text-emerald-800 font-bold px-3 py-1 rounded-full border border-emerald-200">
                        Vigência: {contrato.mesesVigencia || 12} meses
                      </span>
                    </div>

                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-700 font-semibold border-b">
                        <tr>
                          <th className="p-3">Rubrica Orçamentária</th>
                          <th className="p-3">Critério de Débito</th>
                          <th className="p-3 text-right">Ref. Anual</th>
                          <th className="p-3 text-right">Contratado na Vigência</th>
                          <th className="p-3 text-right text-amber-700 bg-amber-50/40">Provisionado</th>
                          <th className="p-3 text-right text-blue-700 bg-blue-50/40">Liquidado</th>
                          <th className="p-3 text-right text-emerald-700 bg-emerald-50/40">Saldo Disponível</th>
                          <th className="p-3">Consumo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {/* 1. Insumos sob Demanda */}
                        <tr className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3 font-semibold text-slate-900">
                            <div className="flex items-center gap-2">
                              <Layers className="w-4 h-4 text-purple-600 shrink-0" />
                              <span>Insumos sob Demanda</span>
                            </div>
                            <span className="text-[10px] text-purple-600 block mt-0.5 font-normal">
                              Peças e materiais de manutenção
                            </span>
                          </td>
                          <td className="p-3 text-slate-500 text-[11px] max-w-xs">
                            Debitado do executado nos chamados rotineiros atendidos pela mão de obra residente.
                          </td>
                          <td className="p-3 text-right font-medium text-slate-600">
                            R$ {(contrato.valorAnualInsumos || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-3 text-right font-bold text-slate-900 font-mono">
                            R$ {(contrato.rubricas?.insumos?.contratado ?? contrato.valorInsumos ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-3 text-right font-semibold text-amber-700 bg-amber-50/20 font-mono">
                            R$ {(contrato.rubricas?.insumos?.provisionado ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-3 text-right font-semibold text-blue-700 bg-blue-50/20 font-mono">
                            R$ {(contrato.rubricas?.insumos?.liquidado ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-3 text-right font-extrabold text-emerald-700 bg-emerald-50/20 font-mono">
                            R$ {(contrato.rubricas?.insumos?.saldoDisponivel ?? Math.max(0, (contrato.valorInsumos ? parseFloat(contrato.valorInsumos.toString()) : 0) - (contrato.rubricas?.insumos?.provisionado ?? 0) - (contrato.rubricas?.insumos?.liquidado ?? 0))).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-3 w-36">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden border">
                                <div
                                  className="h-full bg-purple-500"
                                  style={{ width: `${Math.min(100, contrato.rubricas?.insumos?.percentualConsumido || 0)}%` }}
                                />
                              </div>
                              <span className="text-[10px] font-bold text-slate-600 w-8 text-right font-mono">
                                {contrato.rubricas?.insumos?.percentualConsumido || 0}%
                              </span>
                            </div>
                          </td>
                        </tr>

                        {/* 2. Serviços Eventuais */}
                        <tr className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3 font-semibold text-slate-900">
                            <div className="flex items-center gap-2">
                              <Briefcase className="w-4 h-4 text-amber-600 shrink-0" />
                              <span>Serviços Eventuais</span>
                            </div>
                            <span className="text-[10px] text-amber-600 block mt-0.5 font-normal">
                              Mão de obra eventual + materiais
                            </span>
                          </td>
                          <td className="p-3 text-slate-500 text-[11px] max-w-xs">
                            Debitado integralmente quando o chamado é atendido por serviço eventual (MO eventual + insumos no mesmo saldo).
                          </td>
                          <td className="p-3 text-right font-medium text-slate-600">
                            R$ {(contrato.valorAnualServicosEventuais || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-3 text-right font-bold text-slate-900 font-mono">
                            R$ {(contrato.rubricas?.servicosEventuais?.contratado ?? contrato.valorServicosEventuais ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-3 text-right font-semibold text-amber-700 bg-amber-50/20 font-mono">
                            R$ {(contrato.rubricas?.servicosEventuais?.provisionado ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-3 text-right font-semibold text-blue-700 bg-blue-50/20 font-mono">
                            R$ {(contrato.rubricas?.servicosEventuais?.liquidado ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-3 text-right font-extrabold text-emerald-700 bg-emerald-50/20 font-mono">
                            R$ {(contrato.rubricas?.servicosEventuais?.saldoDisponivel ?? Math.max(0, (contrato.valorServicosEventuais ? parseFloat(contrato.valorServicosEventuais.toString()) : 0) - (contrato.rubricas?.servicosEventuais?.provisionado ?? 0) - (contrato.rubricas?.servicosEventuais?.liquidado ?? 0))).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-3 w-36">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden border">
                                <div
                                  className="h-full bg-amber-500"
                                  style={{ width: `${Math.min(100, contrato.rubricas?.servicosEventuais?.percentualConsumido || 0)}%` }}
                                />
                              </div>
                              <span className="text-[10px] font-bold text-slate-600 w-8 text-right font-mono">
                                {contrato.rubricas?.servicosEventuais?.percentualConsumido || 0}%
                              </span>
                            </div>
                          </td>
                        </tr>

                        {/* 3. Diárias de Deslocamento */}
                        <tr className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3 font-semibold text-slate-900">
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-teal-600 shrink-0" />
                              <span>Diárias de Deslocamento</span>
                            </div>
                            <span className="text-[10px] text-teal-600 block mt-0.5 font-normal">
                              Deslocamento de sede da equipe residente
                            </span>
                          </td>
                          <td className="p-3 text-slate-500 text-[11px] max-w-xs">
                            Debitado pelos dias de deslocamento informados pela empresa para atender sedes ou campi fora da lotação. (R$ {contrato.valorDiariaUnitario || 150}/dia).
                          </td>
                          <td className="p-3 text-right font-medium text-slate-600">
                            R$ {(contrato.valorAnualDiarias || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-3 text-right font-bold text-slate-900 font-mono">
                            R$ {(contrato.rubricas?.diarias?.contratado ?? contrato.valorDiarias ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            <div className="text-[10px] text-teal-700 font-normal">
                              ({contrato.rubricas?.diarias?.diasContratados || 0} diárias)
                            </div>
                          </td>
                          <td className="p-3 text-right font-semibold text-amber-700 bg-amber-50/20 font-mono">
                            R$ {(contrato.rubricas?.diarias?.provisionado ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            <div className="text-[10px] text-amber-800 font-normal">
                              ({contrato.rubricas?.diarias?.diasProvisionados || 0} dias)
                            </div>
                          </td>
                          <td className="p-3 text-right font-semibold text-blue-700 bg-blue-50/20 font-mono">
                            R$ {(contrato.rubricas?.diarias?.liquidado ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            <div className="text-[10px] text-blue-800 font-normal">
                              ({contrato.rubricas?.diarias?.diasLiquidados || 0} dias)
                            </div>
                          </td>
                          <td className="p-3 text-right font-extrabold text-emerald-700 bg-emerald-50/20 font-mono">
                            R$ {(contrato.rubricas?.diarias?.saldoDisponivel ?? Math.max(0, (contrato.valorDiarias ? parseFloat(contrato.valorDiarias.toString()) : 0) - (contrato.rubricas?.diarias?.provisionado ?? 0) - (contrato.rubricas?.diarias?.liquidado ?? 0))).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            <div className="text-[10px] text-emerald-800 font-bold">
                              ({contrato.rubricas?.diarias?.saldoDiasDisponivel ?? (contrato.rubricas?.diarias?.diasContratados || 0)} restantes)
                            </div>
                          </td>
                          <td className="p-3 w-36">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden border">
                                <div
                                  className="h-full bg-teal-500"
                                  style={{ width: `${Math.min(100, contrato.rubricas?.diarias?.percentualConsumido || 0)}%` }}
                                />
                              </div>
                              <span className="text-[10px] font-bold text-slate-600 w-8 text-right font-mono">
                                {contrato.rubricas?.diarias?.percentualConsumido || 0}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Detalhes das Regras e Memória de Cálculo das 3 Rubricas Sob Demanda */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Insumos */}
                    <div className="border rounded-xl p-4 bg-white shadow-sm space-y-3">
                      <div className="flex items-center gap-2 pb-2 border-b">
                        <Layers className="w-5 h-5 text-purple-600" />
                        <h4 className="font-bold text-slate-800 text-sm">Fornecimento de Insumos</h4>
                      </div>
                      <div className="text-xs space-y-2 text-slate-600">
                        <div>
                          Valor Anual Dedicado: <strong className="text-slate-800 font-mono">R$ {(contrato.valorAnualInsumos || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                        </div>
                        <div>
                          Fórmula de Proporcionalidade: <code className="bg-slate-100 px-1.5 py-0.5 rounded border text-[11px]">(Anual / 12) × {contrato.mesesVigencia || 12} meses</code>
                        </div>
                        <div className="pt-2 border-t text-xs font-semibold text-purple-900 flex justify-between">
                          <span>Total na Vigência:</span>
                          <span className="font-mono">R$ {(contrato.valorInsumos || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 bg-purple-50 p-2.5 rounded-lg border border-purple-100">
                          📌 Vinculado aos <strong>chamados rotineiros</strong>. Debita exclusivamente as peças e insumos lançados após a execução em campo.
                        </div>
                      </div>
                    </div>

                    {/* Serviços Eventuais */}
                    <div className="border rounded-xl p-4 bg-white shadow-sm space-y-3">
                      <div className="flex items-center gap-2 pb-2 border-b">
                        <Briefcase className="w-5 h-5 text-amber-600" />
                        <h4 className="font-bold text-slate-800 text-sm">Serviços Eventuais (OS)</h4>
                      </div>
                      <div className="text-xs space-y-2 text-slate-600">
                        <div>
                          Valor Anual Dedicado: <strong className="text-slate-800 font-mono">R$ {(contrato.valorAnualServicosEventuais || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                        </div>
                        <div>
                          Fórmula de Proporcionalidade: <code className="bg-slate-100 px-1.5 py-0.5 rounded border text-[11px]">(Anual / 12) × {contrato.mesesVigencia || 12} meses</code>
                        </div>
                        <div className="pt-2 border-t text-xs font-semibold text-amber-900 flex justify-between">
                          <span>Total na Vigência:</span>
                          <span className="font-mono">R$ {(contrato.valorServicosEventuais || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 bg-amber-50 p-2.5 rounded-lg border border-amber-100">
                          📌 Atendimento por <strong>mão de obra eventual</strong>. Engloba toda a despesa do chamado (horas de mão de obra + insumos) consolidada nesta rubrica.
                        </div>
                      </div>
                    </div>

                    {/* Diárias de Deslocamento */}
                    <div className="border rounded-xl p-4 bg-white shadow-sm space-y-3">
                      <div className="flex items-center gap-2 pb-2 border-b">
                        <Building2 className="w-5 h-5 text-teal-600" />
                        <h4 className="font-bold text-slate-800 text-sm">Diárias de Deslocamento</h4>
                      </div>
                      <div className="text-xs space-y-2 text-slate-600">
                        <div>
                          Valor Anual Dedicado: <strong className="text-slate-800 font-mono">R$ {(contrato.valorAnualDiarias || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                        </div>
                        <div>
                          Valor Unitário da Diária: <strong className="text-teal-700 font-mono">R$ {contrato.valorDiariaUnitario || 150},00/dia</strong>
                        </div>
                        <div className="pt-2 border-t text-xs font-semibold text-teal-900 flex justify-between">
                          <span>Total na Vigência:</span>
                          <span className="font-mono">R$ {(contrato.valorDiarias || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 bg-teal-50 p-2.5 rounded-lg border border-teal-100">
                          📌 Utilizada quando a <strong>mão de obra residente</strong> precisa se deslocar para outras sedes/campi da UERN. Debitado conforme dias informados no chamado.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* CONTEÚDO DA ABA 3: COTAS DAS UNIDADES DEMANDANTES */}
              {abaAtiva === 'COTAS' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800">Cotas Financeiras por Unidade Demandante</h3>
                      <p className="text-xs text-slate-500">
                        Distribuição do teto anual e mensal para cada departamento, faculdade ou pró-reitoria.
                      </p>
                    </div>

                    {isAdmin && contrato && (
                      <button
                        onClick={() => {
                          setCotaUnidadeId(todasUnidades[0]?.id || '');
                          setCotaAnual('');
                          setCotaMensal('');
                          setModalCota(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#003366] text-white rounded-lg text-xs font-semibold hover:bg-blue-900 transition-colors shadow-sm"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Definir Cota
                      </button>
                    )}
                  </div>

                  <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 font-semibold border-b">
                        <tr>
                          <th className="p-3">Unidade Demandante</th>
                          <th className="p-3">Campus</th>
                          <th className="p-3 text-right">Cota Mensal</th>
                          <th className="p-3 text-right">Cota Contratada</th>
                          <th className="p-3 text-right text-amber-700 bg-amber-50/50">Provisionado</th>
                          <th className="p-3 text-right text-blue-700 bg-blue-50/50">Liquidado</th>
                          <th className="p-3 text-right text-emerald-700 bg-emerald-50/50">Saldo Disponível</th>
                          <th className="p-3">Consumo</th>
                          {isAdmin && <th className="p-3 text-right">Ações</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {cotas.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="p-8 text-center text-slate-400">
                              Nenhuma cota distribuída para as unidades demandantes.
                            </td>
                          </tr>
                        ) : (
                          cotas.map((c) => (
                            <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="p-3 font-semibold text-slate-900">
                                <div>{c.unidadeNome}</div>
                                {c.telefone && <div className="text-[10px] text-slate-400">Tel: {c.telefone}</div>}
                              </td>
                              <td className="p-3 text-slate-500">{c.campus || '—'}</td>
                              <td className="p-3 text-right font-medium">
                                R$ {c.cotaMensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="p-3 text-right font-bold text-slate-900 font-mono">
                                R$ {(c.cotaContratada || c.cotaAnual).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="p-3 text-right font-semibold text-amber-700 bg-amber-50/30 font-mono">
                                R$ {(c.valorProvisionado ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="p-3 text-right font-semibold text-blue-700 bg-blue-50/30 font-mono">
                                R$ {(c.valorLiquidado ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="p-3 text-right font-extrabold text-emerald-700 bg-emerald-50/30 font-mono">
                                R$ {(c.saldoDisponivel ?? c.saldo).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="p-3 w-36">
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden border">
                                    <div
                                      className={`h-full ${
                                        c.percentualConsumido > 85
                                          ? 'bg-rose-500'
                                          : c.percentualConsumido > 60
                                          ? 'bg-amber-500'
                                          : 'bg-emerald-500'
                                      }`}
                                      style={{ width: `${Math.min(100, c.percentualConsumido)}%` }}
                                    />
                                  </div>
                                  <span className="text-[10px] font-bold text-slate-600 w-8 text-right font-mono">
                                    {c.percentualConsumido}%
                                  </span>
                                </div>
                              </td>
                              {isAdmin && (
                                <td className="p-3 text-right">
                                  <button
                                    onClick={() => handleExcluirCota(c.id, c.unidadeNome)}
                                    className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                                    title="Remover Cota"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* CONTEÚDO DA ABA 4: HISTÓRICO DE REPACTUAÇÕES & ADITIVOS */}
              {abaAtiva === 'HISTORICO' && contrato && (
                <div className="space-y-6">
                  {/* Repactuações */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-amber-600" />
                        Repactuações Motivadas por Convenção Coletiva (CCT)
                      </h3>
                    </div>

                    <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600 font-semibold border-b">
                          <tr>
                            <th className="p-3">Identificação</th>
                            <th className="p-3">Data</th>
                            <th className="p-3">Motivo / Fundamentação</th>
                            <th className="p-3">Detalhes</th>
                            <th className="p-3 text-right">Impacto Total no Contrato</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {contrato.repactuacoes?.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="p-6 text-center text-slate-400">
                                Nenhuma repactuação salarial registrada até o momento.
                              </td>
                            </tr>
                          ) : (
                            contrato.repactuacoes?.map((rep: any) => (
                              <tr key={rep.id} className="hover:bg-slate-50/80">
                                <td className="p-3 font-semibold text-slate-900">{rep.numero || 'Repactuação'}</td>
                                <td className="p-3 text-slate-500">
                                  {new Date(rep.dataRepactuacao).toLocaleDateString('pt-BR')}
                                </td>
                                <td className="p-3 font-medium text-slate-800">{rep.motivo}</td>
                                <td className="p-3 text-slate-600">{rep.detalhes || '—'}</td>
                                <td className="p-3 text-right font-bold text-amber-700">
                                  + R$ {(rep.valorAjusteTotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Termos Aditivos */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-600" />
                        Termos Aditivos Registrados (Valor & Prazo)
                      </h3>

                      {isAdmin && (
                        <button
                          onClick={() => setModalAditivo(true)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#003366] text-white rounded-lg text-xs font-semibold hover:bg-blue-900 transition-colors shadow-sm"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Novo Termo Aditivo
                        </button>
                      )}
                    </div>

                    <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600 font-semibold border-b">
                          <tr>
                            <th className="p-3">Nº Aditivo</th>
                            <th className="p-3">Tipo</th>
                            <th className="p-3 text-right">Acréscimo</th>
                            <th className="p-3">Nova Data Fim</th>
                            <th className="p-3">Nota de Empenho</th>
                            <th className="p-3">Assinatura</th>
                            {isAdmin && <th className="p-3 text-right">Ações</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {contrato.aditivos?.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="p-6 text-center text-slate-400">
                                Nenhum termo aditivo registrado para este contrato.
                              </td>
                            </tr>
                          ) : (
                            contrato.aditivos?.map((ad: any) => (
                              <tr key={ad.id} className="hover:bg-slate-50/80">
                                <td className="p-3 font-semibold text-slate-900">{ad.numero}</td>
                                <td className="p-3">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      ad.tipo === 'VALOR'
                                        ? 'bg-emerald-50 text-emerald-700'
                                        : 'bg-blue-50 text-blue-700'
                                    }`}
                                  >
                                    {ad.tipo === 'VALOR' ? 'Acréscimo de Valor' : 'Prorrogação de Prazo'}
                                  </span>
                                </td>
                                <td className="p-3 text-right font-bold text-emerald-700">
                                  {ad.valorAjuste
                                    ? `+ R$ ${parseFloat(ad.valorAjuste).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                                    : '—'}
                                </td>
                                <td className="p-3 text-slate-600">
                                  {ad.novaDataFim ? new Date(ad.novaDataFim).toLocaleDateString('pt-BR') : '—'}
                                </td>
                                <td className="p-3 text-slate-600">{ad.notaEmpenho || '—'}</td>
                                <td className="p-3 text-slate-500">
                                  {new Date(ad.dataAssinatura).toLocaleDateString('pt-BR')}
                                </td>
                                {isAdmin && (
                                  <td className="p-3 text-right">
                                    <button
                                      onClick={() => handleExcluirAditivo(ad.id, ad.numero)}
                                      className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                                      title="Excluir Aditivo"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                )}
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* CONTEÚDO DA ABA 5: EMPRESAS CONTRATADAS */}
              {abaAtiva === 'EMPRESAS' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        <Building className="w-4 h-4 text-[#003366]" />
                        Empresas Contratadas Cadastradas
                      </h3>
                      <p className="text-xs text-slate-500">
                        Gerencie as empresas prestadoras de serviço para vinculação a novos contratos ou contratos existentes.
                      </p>
                    </div>

                    {isAdmin && (
                      <button
                        onClick={abrirModalNovaEmpresa}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#003366] text-white rounded-lg text-xs font-semibold hover:bg-blue-900 transition-colors shadow-sm"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Cadastrar Nova Empresa
                      </button>
                    )}
                  </div>

                  <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 font-semibold border-b">
                        <tr>
                          <th className="p-3">Razão Social / Nome Fantasia</th>
                          <th className="p-3">CNPJ</th>
                          <th className="p-3">Contato (E-mail & Telefone)</th>
                          <th className="p-3 text-center">Contratos Vinculados</th>
                          {isAdmin && <th className="p-3 text-right">Ações</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {empresas.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-8 text-center text-slate-400">
                              Nenhuma empresa contratada cadastrada no sistema.
                            </td>
                          </tr>
                        ) : (
                          empresas.map((emp) => (
                            <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="p-3">
                                <div className="font-semibold text-slate-900">{emp.razaoSocial}</div>
                                {emp.nomeFantasia && (
                                  <div className="text-[11px] text-slate-500 font-medium">{emp.nomeFantasia}</div>
                                )}
                              </td>
                              <td className="p-3 font-mono font-medium text-slate-700">{emp.cnpj}</td>
                              <td className="p-3">
                                <div className="flex items-center gap-1 text-slate-600">
                                  <Mail className="w-3 h-3 text-slate-400" />
                                  <span>{emp.email}</span>
                                </div>
                                {emp.telefone && (
                                  <div className="flex items-center gap-1 text-slate-500 text-[11px] mt-0.5">
                                    <Phone className="w-3 h-3 text-slate-400" />
                                    <span>{emp.telefone}</span>
                                  </div>
                                )}
                              </td>
                              <td className="p-3 text-center">
                                <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-800 rounded font-semibold text-[11px]">
                                  {emp._count?.contratos || 0} contrato(s)
                                </span>
                              </td>
                              {isAdmin && (
                                <td className="p-3 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      onClick={() => abrirModalEditarEmpresa(emp)}
                                      className="p-1.5 text-slate-500 hover:text-blue-700 rounded hover:bg-slate-100 transition-colors"
                                      title="Editar Empresa"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleExcluirEmpresa(emp.id, emp.razaoSocial)}
                                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors"
                                      title="Excluir/Inativar Empresa"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              )}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ================= MODAL CADASTRAR / EDITAR CONTRATO COM CÁLCULO PROPORCIONAL EM TEMPO REAL ================= */}
          {modalContrato && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95">
                <div className="p-5 border-b flex items-center justify-between bg-slate-50">
                  <div>
                    <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                      <FileText className="w-5 h-5 text-[#003366]" />
                      {editandoContratoId ? 'Editar Contrato e Postos' : 'Novo Contrato de Manutenção Predial'}
                    </h3>
                    <p className="text-xs text-slate-500">
                      O sistema calcula o saldo proporcional à vigência em meses a partir dos postos e valores sob demanda.
                    </p>
                  </div>
                  <button onClick={() => setModalContrato(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSalvarContrato} className="p-6 overflow-y-auto space-y-6 text-xs flex-1">
                  {/* Dados Básicos */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Nº do Contrato *</label>
                      <input
                        type="text"
                        required
                        value={formContrato.numero}
                        onChange={(e) => setFormContrato({ ...formContrato, numero: e.target.value })}
                        placeholder="Ex: 015/2026"
                        className="w-full border rounded-lg p-2 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Ano *</label>
                      <input
                        type="number"
                        required
                        value={formContrato.ano}
                        onChange={(e) => setFormContrato({ ...formContrato, ano: e.target.value })}
                        className="w-full border rounded-lg p-2 font-medium"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-semibold text-slate-700">Empresa Contratada *</label>
                        <button
                          type="button"
                          onClick={abrirModalNovaEmpresa}
                          className="text-[11px] text-[#003366] font-bold hover:underline flex items-center gap-0.5"
                        >
                          <Plus className="w-3 h-3" />
                          Nova Empresa
                        </button>
                      </div>
                      <select
                        required
                        value={formContrato.empresaId}
                        onChange={(e) => setFormContrato({ ...formContrato, empresaId: e.target.value })}
                        className="w-full border rounded-lg p-2 font-medium bg-white"
                      >
                        <option value="">Selecione a Empresa Contratada...</option>
                        {empresas.map((emp) => (
                          <option key={emp.id} value={emp.id}>
                            {emp.razaoSocial} ({emp.cnpj})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Objeto do Contrato *</label>
                    <textarea
                      required
                      rows={2}
                      value={formContrato.objeto}
                      onChange={(e) => setFormContrato({ ...formContrato, objeto: e.target.value })}
                      className="w-full border rounded-lg p-2"
                    />
                  </div>

                  {/* Vigência */}
                  <div className="bg-slate-50 p-4 rounded-xl border space-y-3">
                    <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 uppercase tracking-wide">
                      <Calendar className="w-4 h-4 text-[#003366]" />
                      Vigência do Contrato
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Data de Início *</label>
                        <input
                          type="date"
                          required
                          value={formContrato.dataInicio}
                          onChange={(e) => setFormContrato({ ...formContrato, dataInicio: e.target.value })}
                          className="w-full border rounded-lg p-2 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Data de Término *</label>
                        <input
                          type="date"
                          required
                          value={formContrato.dataFim}
                          onChange={(e) => setFormContrato({ ...formContrato, dataFim: e.target.value })}
                          className="w-full border rounded-lg p-2 bg-white"
                        />
                      </div>

                      <div className="flex items-center">
                        <div className="bg-white border rounded-xl p-3 w-full text-center">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Meses Calculados</span>
                          <span className="text-xl font-extrabold text-[#003366]">{calculoProporcional.meses} meses</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Itens de Mão de Obra Residente */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 uppercase tracking-wide">
                          <Users className="w-4 h-4 text-blue-600" />
                          Itens de Mão de Obra Residente (Postos Mensais)
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Adicione as funções necessárias e o valor mensal de cada posto.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={adicionarLinhaMaoObra}
                        className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded font-semibold text-[11px] hover:bg-blue-100 flex items-center gap-1 border border-blue-200"
                      >
                        <Plus className="w-3 h-3" />
                        Adicionar Função
                      </button>
                    </div>

                    <div className="border rounded-xl overflow-hidden bg-white">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 text-slate-700 font-semibold border-b">
                          <tr>
                            <th className="p-2.5">Função Contratada</th>
                            <th className="p-2.5 text-center w-24">Qtd. Postos</th>
                            <th className="p-2.5 text-right w-32">Valor Posto</th>
                            <th className="p-2.5 text-right w-32">Subtotal Mensal</th>
                            <th className="p-2.5 text-center w-40">Trabalhadores Alocados</th>
                            <th className="p-2.5 text-center w-12"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {formItensMaoObra.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="p-6 text-center text-slate-400">
                                Nenhum posto de mão de obra adicionado ao contrato. Clique em <strong>"+ Adicionar Função"</strong> acima.
                              </td>
                            </tr>
                          ) : (
                            formItensMaoObra.map((item, index) => {
                              const subMensal = (Number(item.quantidadePostos) || 0) * (Number(item.valorMensalPosto) || 0);
                              const subContrato = subMensal * calculoProporcional.meses;
                              const funcs = item.funcionarios || [];
                              const estaExpandido = item.expandido;

                              return (
                                <React.Fragment key={index}>
                                  <tr className={estaExpandido ? 'bg-blue-50/40' : ''}>
                                    <td className="p-2">
                                      <input
                                        type="text"
                                        required
                                        placeholder="Ex: Eletricista de Manutenção"
                                        value={item.funcao}
                                        onChange={(e) => atualizarLinhaMaoObra(index, 'funcao', e.target.value)}
                                        className="w-full border rounded p-1.5 font-medium"
                                      />
                                    </td>
                                    <td className="p-2">
                                      <input
                                        type="number"
                                        min={1}
                                        required
                                        value={item.quantidadePostos}
                                        onChange={(e) => atualizarLinhaMaoObra(index, 'quantidadePostos', parseInt(e.target.value) || 1)}
                                        className="w-full border rounded p-1.5 text-center font-bold"
                                      />
                                    </td>
                                    <td className="p-2">
                                      <input
                                        type="number"
                                        step="0.01"
                                        min={0}
                                        required
                                        value={item.valorMensalPosto}
                                        onChange={(e) => atualizarLinhaMaoObra(index, 'valorMensalPosto', parseFloat(e.target.value) || 0)}
                                        className="w-full border rounded p-1.5 text-right font-mono"
                                      />
                                    </td>
                                    <td className="p-2 text-right font-medium text-slate-700">
                                      R$ {subMensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="p-2 text-center">
                                      <button
                                        type="button"
                                        onClick={() => alternarExpansaoItem(index)}
                                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors border ${
                                          funcs.length > 0
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                            : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                                        }`}
                                      >
                                        <Users className="w-3 h-3" />
                                        <span>{funcs.length} / {item.quantidadePostos} pessoas</span>
                                        {estaExpandido ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                      </button>
                                    </td>
                                    <td className="p-2 text-center">
                                      <button
                                        type="button"
                                        onClick={() => removerLinhaMaoObra(index)}
                                        className="text-slate-400 hover:text-rose-600 p-1"
                                        title="Remover esta função"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </td>
                                  </tr>

                                  {/* Sub-painel colapsável de trabalhadores vinculados à função */}
                                  {estaExpandido && (
                                    <tr className="bg-slate-50/80">
                                      <td colSpan={6} className="p-3 border-b">
                                        <div className="bg-white border border-blue-100 rounded-lg p-3 space-y-3">
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                              <UserCheck className="w-4 h-4 text-emerald-600" />
                                              <span className="font-bold text-slate-800 text-xs">
                                                Trabalhadores alocados na função:{' '}
                                                <strong className="text-[#003366]">{item.funcao || 'Nova Função'}</strong>
                                              </span>
                                              <span className="text-[11px] text-slate-400">
                                                ({funcs.length} de {item.quantidadePostos} postos preenchidos)
                                              </span>
                                            </div>

                                            <button
                                              type="button"
                                              onClick={() => adicionarTrabalhadorAoItem(index)}
                                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded text-[11px] font-bold border border-emerald-200"
                                            >
                                              <Plus className="w-3 h-3" />
                                              + Incluir Trabalhador nesta Função
                                            </button>
                                          </div>

                                          {funcs.length === 0 ? (
                                            <div className="text-[11px] text-slate-400 py-1 italic">
                                              Nenhum trabalhador cadastrado nesta função ainda. Clique no botão verde acima para informar Nome e CPF.
                                            </div>
                                          ) : (
                                            <div className="space-y-2">
                                              {funcs.map((func, fIndex) => (
                                                <div key={fIndex} className="flex items-center gap-2">
                                                  <span className="w-5 text-center text-slate-400 font-bold text-[10px]">
                                                    #{fIndex + 1}
                                                  </span>
                                                  <input
                                                    type="text"
                                                    required
                                                    placeholder="Nome Completo do Trabalhador"
                                                    value={func.nomeCompleto}
                                                    onChange={(e) =>
                                                      atualizarTrabalhadorDoItem(index, fIndex, 'nomeCompleto', e.target.value)
                                                    }
                                                    className="flex-1 border rounded p-1.5 text-xs font-medium"
                                                  />
                                                  <input
                                                    type="text"
                                                    required
                                                    placeholder="CPF (000.000.000-00)"
                                                    value={func.cpf}
                                                    onChange={(e) =>
                                                      atualizarTrabalhadorDoItem(index, fIndex, 'cpf', e.target.value)
                                                    }
                                                    className="w-44 border rounded p-1.5 text-xs font-mono"
                                                  />
                                                  <button
                                                    type="button"
                                                    onClick={() => removerTrabalhadorDoItem(index, fIndex)}
                                                    className="p-1 text-slate-400 hover:text-rose-600 rounded"
                                                    title="Remover trabalhador"
                                                  >
                                                    <X className="w-3.5 h-3.5" />
                                                  </button>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                    {/* Itens Sob Demanda */}
                    <div className="bg-slate-50 p-4 rounded-xl border space-y-3">
                      <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 uppercase tracking-wide">
                        <Briefcase className="w-4 h-4 text-amber-600" />
                        Rubricas Sob Demanda (Valores Anuais Dedicados)
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Informe o valor anual de referência de cada rubrica sob demanda. O sistema calcula a fração proporcional exata pelos meses de vigência do contrato:
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-white p-3 rounded-lg border">
                          <label className="block font-semibold text-slate-700 mb-1">
                            Serviços Eventuais (Anual) *
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            required
                            value={formContrato.valorAnualServicosEventuais}
                            onChange={(e) => setFormContrato({ ...formContrato, valorAnualServicosEventuais: e.target.value })}
                            className="w-full border rounded p-2 text-right font-mono font-bold"
                          />
                          <div className="mt-2 text-[11px] text-amber-800 font-semibold flex justify-between">
                            <span>Proporcional ({calculoProporcional.meses}m):</span>
                            <span>R$ {calculoProporcional.servicos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </div>
                        </div>

                        <div className="bg-white p-3 rounded-lg border">
                          <label className="block font-semibold text-slate-700 mb-1">
                            Insumos sob Demanda (Anual) *
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            required
                            value={formContrato.valorAnualInsumos}
                            onChange={(e) => setFormContrato({ ...formContrato, valorAnualInsumos: e.target.value })}
                            className="w-full border rounded p-2 text-right font-mono font-bold"
                          />
                          <div className="mt-2 text-[11px] text-purple-800 font-semibold flex justify-between">
                            <span>Proporcional ({calculoProporcional.meses}m):</span>
                            <span>R$ {calculoProporcional.insumos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </div>
                        </div>

                        <div className="bg-white p-3 rounded-lg border">
                          <div className="flex items-center justify-between mb-1">
                            <label className="font-semibold text-slate-700">
                              Diárias de Deslocamento *
                            </label>
                            <span className="text-[10px] text-teal-700 bg-teal-50 px-1 rounded font-bold border border-teal-200">
                              Unitário: R$ {formContrato.valorDiariaUnitario || '150'}/dia
                            </span>
                          </div>
                          <div className="space-y-1.5">
                            <input
                              type="number"
                              step="0.01"
                              required
                              placeholder="Valor Anual Diárias"
                              value={formContrato.valorAnualDiarias}
                              onChange={(e) => setFormContrato({ ...formContrato, valorAnualDiarias: e.target.value })}
                              className="w-full border rounded p-2 text-right font-mono font-bold"
                            />
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                              <span>Valor Diária: R$</span>
                              <input
                                type="number"
                                step="0.01"
                                value={formContrato.valorDiariaUnitario}
                                onChange={(e) => setFormContrato({ ...formContrato, valorDiariaUnitario: e.target.value })}
                                className="w-20 border rounded px-1.5 py-0.5 text-right font-mono text-xs"
                              />
                            </div>
                          </div>
                          <div className="mt-2 text-[11px] text-teal-800 font-semibold flex justify-between">
                            <span>Proporcional ({calculoProporcional.meses}m):</span>
                            <span>R$ {(calculoProporcional.diarias || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Resumo do Cálculo Proporcional Automático */}
                    <div className="bg-[#003366] text-white p-5 rounded-xl space-y-3 shadow-md">
                      <div className="flex items-center justify-between border-b border-blue-800/80 pb-2">
                        <span className="font-bold text-sm flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                          Cálculo Proporcional da Vigência do Contrato (4 Rubricas)
                        </span>
                        <span className="text-xs bg-blue-800 px-2.5 py-0.5 rounded font-mono font-bold">
                          {calculoProporcional.meses} Meses
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                        <div>
                          <span className="text-blue-200 block text-[11px]">1. Mão de Obra Residente:</span>
                          <strong className="text-sm font-mono text-white">
                            R$ {calculoProporcional.maoObra.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </strong>
                          <span className="block text-[10px] text-blue-300">Custo Fixo Mensal</span>
                        </div>
                        <div>
                          <span className="text-blue-200 block text-[11px]">2. Serviços Eventuais:</span>
                          <strong className="text-sm font-mono text-amber-300">
                            R$ {calculoProporcional.servicos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </strong>
                          <span className="block text-[10px] text-amber-200/80">Sob Demanda</span>
                        </div>
                        <div>
                          <span className="text-blue-200 block text-[11px]">3. Insumos sob Demanda:</span>
                          <strong className="text-sm font-mono text-purple-300">
                            R$ {calculoProporcional.insumos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </strong>
                          <span className="block text-[10px] text-purple-200/80">Sob Demanda</span>
                        </div>
                        <div>
                          <span className="text-blue-200 block text-[11px]">4. Diárias de Deslocamento:</span>
                          <strong className="text-sm font-mono text-teal-300">
                            R$ {(calculoProporcional.diarias || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </strong>
                          <span className="block text-[10px] text-teal-200/80">
                            ~{Math.round((calculoProporcional.diarias || 0) / (Number(formContrato.valorDiariaUnitario) || 150))} diárias
                          </span>
                        </div>
                      </div>

                      <div className="border-t border-blue-800/80 pt-3 flex items-center justify-between">
                        <span className="font-bold text-sm uppercase tracking-wide">Valor Total Final do Contrato:</span>
                        <span className="text-2xl font-black text-emerald-400 font-mono">
                          R$ {calculoProporcional.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                  <div className="flex justify-end gap-3 pt-3 border-t">
                    <button
                      type="button"
                      onClick={() => setModalContrato(false)}
                      className="px-4 py-2 border rounded-lg text-slate-700 hover:bg-slate-50 font-medium"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={salvandoContrato}
                      className="px-5 py-2 bg-[#003366] text-white rounded-lg font-bold hover:bg-blue-900 transition-colors shadow"
                    >
                      {salvandoContrato ? 'Gravando e Calculando...' : editandoContratoId ? 'Salvar Alterações e Postos' : 'Cadastrar Contrato'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ================= MODAL CADASTRAR / EDITAR TRABALHADOR VINCULADO ================= */}
          {modalTrabalhador && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
                <div className="p-5 border-b flex items-center justify-between bg-emerald-50">
                  <div>
                    <h3 className="font-bold text-emerald-950 text-base flex items-center gap-2">
                      <UserCheck className="w-5 h-5 text-emerald-600" />
                      {editandoTrabalhadorId ? 'Editar Trabalhador Vinculado' : 'Cadastrar / Incluir Trabalhador no Contrato'}
                    </h3>
                    <p className="text-xs text-emerald-700">
                      Vincule o colaborador à respectiva função contratual de referência.
                    </p>
                  </div>
                  <button onClick={() => setModalTrabalhador(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSalvarTrabalhador} className="p-6 space-y-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Função / Posto de Trabalho no Contrato *
                    </label>
                    <select
                      required
                      value={formTrabalhador.itemMaoObraId}
                      onChange={(e) => setFormTrabalhador({ ...formTrabalhador, itemMaoObraId: e.target.value })}
                      className="w-full border rounded-lg p-2.5 bg-white font-medium text-slate-800"
                    >
                      <option value="">Selecione a Função...</option>
                      {contrato?.itensMaoObra?.map((item: any) => (
                        <option key={item.id} value={item.id}>
                          {item.funcao} ({item.quantidadePostos} postos mensais — R$ {item.valorMensalPosto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Nome Completo do Trabalhador *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Carlos Eduardo de Oliveira"
                      value={formTrabalhador.nomeCompleto}
                      onChange={(e) => setFormTrabalhador({ ...formTrabalhador, nomeCompleto: e.target.value })}
                      className="w-full border rounded-lg p-2 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">CPF *</label>
                    <input
                      type="text"
                      required
                      placeholder="000.000.000-00"
                      value={formTrabalhador.cpf}
                      onChange={(e) => setFormTrabalhador({ ...formTrabalhador, cpf: e.target.value })}
                      className="w-full border rounded-lg p-2 font-mono"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-3 border-t">
                    <button
                      type="button"
                      onClick={() => setModalTrabalhador(false)}
                      className="px-4 py-2 border rounded-lg text-slate-700 hover:bg-slate-50 font-medium"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={salvandoTrabalhador}
                      className="px-5 py-2 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 transition-colors shadow"
                    >
                      {salvandoTrabalhador ? 'Salvando...' : editandoTrabalhadorId ? 'Salvar Alterações' : 'Cadastrar Trabalhador'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ================= MODAL ADICIONAR / EDITAR POSTO AVULSO AO CONTRATO ================= */}
          {modalNovoPosto && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
                <div className="p-5 border-b flex items-center justify-between bg-slate-50">
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-[#003366]" />
                      {editandoPostoId ? 'Editar Função / Posto de Trabalho' : 'Adicionar Nova Função / Posto ao Contrato'}
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {editandoPostoId
                        ? 'Altere a função, quantidade de postos ou valor mensal unitário.'
                        : 'Defina a função, quantidade de postos mensais e o valor unitário.'}
                    </p>
                  </div>
                  <button onClick={() => setModalNovoPosto(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleSalvarNovoPosto} className="p-5 space-y-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Nome da Função / Cargo *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Soldador / Serralheiro"
                      value={formNovoPosto.funcao}
                      onChange={(e) => setFormNovoPosto({ ...formNovoPosto, funcao: e.target.value })}
                      className="w-full border rounded-lg p-2 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Quantidade de Postos Mensais *</label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={formNovoPosto.quantidadePostos}
                      onChange={(e) => setFormNovoPosto({ ...formNovoPosto, quantidadePostos: e.target.value })}
                      className="w-full border rounded-lg p-2 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Valor Unitário Mensal do Posto (R$) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="Ex: 3500.00"
                      value={formNovoPosto.valorMensalPosto}
                      onChange={(e) => setFormNovoPosto({ ...formNovoPosto, valorMensalPosto: e.target.value })}
                      className="w-full border rounded-lg p-2 font-mono text-right font-bold"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-3 border-t">
                    <button
                      type="button"
                      onClick={() => setModalNovoPosto(false)}
                      className="px-4 py-2 border rounded-lg text-slate-700 hover:bg-slate-50 font-medium"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={salvandoPosto}
                      className="px-5 py-2 bg-[#003366] text-white rounded-lg font-bold hover:bg-blue-900 transition-colors shadow"
                    >
                      {salvandoPosto ? 'Salvando...' : editandoPostoId ? 'Salvar Alterações' : 'Adicionar Posto'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ================= MODAL CADASTRAR / EDITAR EMPRESA ================= */}
          {modalEmpresa && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
                <div className="p-5 border-b flex items-center justify-between bg-slate-50">
                  <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                    <Building className="w-5 h-5 text-[#003366]" />
                    {editandoEmpresaId ? 'Editar Empresa Contratada' : 'Cadastrar Empresa Contratada'}
                  </h3>
                  <button onClick={() => setModalEmpresa(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSalvarEmpresa} className="p-6 space-y-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Razão Social *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Construtora e Manutenção Silva LTDA"
                      value={formEmpresa.razaoSocial}
                      onChange={(e) => setFormEmpresa({ ...formEmpresa, razaoSocial: e.target.value })}
                      className="w-full border rounded-lg p-2 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Nome Fantasia (Opcional)</label>
                    <input
                      type="text"
                      placeholder="Ex: Silva Engenharia"
                      value={formEmpresa.nomeFantasia}
                      onChange={(e) => setFormEmpresa({ ...formEmpresa, nomeFantasia: e.target.value })}
                      className="w-full border rounded-lg p-2"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">CNPJ *</label>
                      <input
                        type="text"
                        required
                        placeholder="00.000.000/0000-00"
                        value={formEmpresa.cnpj}
                        onChange={(e) => setFormEmpresa({ ...formEmpresa, cnpj: e.target.value })}
                        className="w-full border rounded-lg p-2 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Telefone (Opcional)</label>
                      <input
                        type="text"
                        placeholder="(84) 3315-0000"
                        value={formEmpresa.telefone}
                        onChange={(e) => setFormEmpresa({ ...formEmpresa, telefone: e.target.value })}
                        className="w-full border rounded-lg p-2"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">E-mail Institucional *</label>
                    <input
                      type="email"
                      required
                      placeholder="contato@empresa.com.br"
                      value={formEmpresa.email}
                      onChange={(e) => setFormEmpresa({ ...formEmpresa, email: e.target.value })}
                      className="w-full border rounded-lg p-2"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-3 border-t">
                    <button
                      type="button"
                      onClick={() => setModalEmpresa(false)}
                      className="px-4 py-2 border rounded-lg text-slate-700 hover:bg-slate-50 font-medium"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={salvandoEmpresa}
                      className="px-5 py-2 bg-[#003366] text-white rounded-lg font-bold hover:bg-blue-900 transition-colors shadow"
                    >
                      {salvandoEmpresa ? 'Salvando...' : editandoEmpresaId ? 'Salvar Alterações' : 'Cadastrar Empresa'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ================= MODAL DE REPACTUAÇÃO DE POSTO POR CCT ================= */}
          {modalRepactuacao && itemParaRepactuar && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
                <div className="p-5 border-b flex items-center justify-between bg-amber-50/60">
                  <div>
                    <h3 className="font-bold text-amber-900 text-base flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-amber-700" />
                      Repactuação por Convenção Coletiva (CCT)
                    </h3>
                    <p className="text-xs text-amber-700">Função: {itemParaRepactuar.funcao}</p>
                  </div>
                  <button onClick={() => setModalRepactuacao(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSalvarRepactuacao} className="p-6 space-y-4 text-xs">
                  <div className="bg-slate-50 p-3 rounded-lg border text-slate-700 space-y-1">
                    <div>
                      Valor Mensal Atual do Posto: <strong className="font-mono">R$ {itemParaRepactuar.valorMensalPosto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                    </div>
                    <div>
                      Quantidade de Postos Ativos: <strong>{itemParaRepactuar.quantidadePostos}</strong>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Novo Valor Mensal do Posto *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formRepactuacao.novoValorMensalPosto}
                      onChange={(e) => setFormRepactuacao({ ...formRepactuacao, novoValorMensalPosto: e.target.value })}
                      className="w-full border rounded-lg p-2 font-mono text-base font-bold text-slate-900 text-right"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Número / Identificação da Repactuação *</label>
                    <input
                      type="text"
                      required
                      value={formRepactuacao.numeroRepactuacao}
                      onChange={(e) => setFormRepactuacao({ ...formRepactuacao, numeroRepactuacao: e.target.value })}
                      placeholder="Ex: Termo de Repactuação 01/2026 - CCT"
                      className="w-full border rounded-lg p-2"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Motivação da Convenção Coletiva *</label>
                    <input
                      type="text"
                      required
                      value={formRepactuacao.motivo}
                      onChange={(e) => setFormRepactuacao({ ...formRepactuacao, motivo: e.target.value })}
                      placeholder="Ex: CCT SINDESP 2026/2027 Cláusula 5ª"
                      className="w-full border rounded-lg p-2"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Observações e Detalhes</label>
                    <textarea
                      rows={2}
                      value={formRepactuacao.detalhes}
                      onChange={(e) => setFormRepactuacao({ ...formRepactuacao, detalhes: e.target.value })}
                      className="w-full border rounded-lg p-2"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-3 border-t">
                    <button
                      type="button"
                      onClick={() => setModalRepactuacao(false)}
                      className="px-4 py-2 border rounded-lg text-slate-700 hover:bg-slate-50 font-medium"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-amber-600 text-white rounded-lg font-bold hover:bg-amber-700 transition-colors shadow"
                    >
                      Confirmar Repactuação
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ================= MODAL DEFINIR COTA DE UNIDADE ================= */}
          {modalCota && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
                <div className="p-5 border-b flex items-center justify-between bg-slate-50">
                  <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[#003366]" />
                    Definir Cota Orçamentária da Unidade
                  </h3>
                  <button onClick={() => setModalCota(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleSalvarCota} className="p-5 space-y-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Unidade Demandante *</label>
                    <select
                      required
                      value={cotaUnidadeId}
                      onChange={(e) => setCotaUnidadeId(e.target.value)}
                      className="w-full border rounded-lg p-2 bg-white font-medium"
                    >
                      <option value="">Selecione a Unidade...</option>
                      {todasUnidades.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.nome} ({u.campus || u.sigla})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Cota Anual (R$) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="Ex: 50000"
                      value={cotaAnual}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCotaAnual(val);
                        if (val) setCotaMensal((parseFloat(val) / 12).toFixed(2));
                      }}
                      className="w-full border rounded-lg p-2 font-mono font-bold text-right"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Cota Mensal Estimada (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Ex: 4166.67"
                      value={cotaMensal}
                      onChange={(e) => setCotaMensal(e.target.value)}
                      className="w-full border rounded-lg p-2 font-mono text-right bg-slate-50"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-3 border-t">
                    <button
                      type="button"
                      onClick={() => setModalCota(false)}
                      className="px-4 py-2 border rounded-lg text-slate-700 hover:bg-slate-50 font-medium"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-[#003366] text-white rounded-lg font-bold hover:bg-blue-900 transition-colors shadow"
                    >
                      Salvar Cota
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ================= MODAL NOVO TERMO ADITIVO ================= */}
          {modalAditivo && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
                <div className="p-5 border-b flex items-center justify-between bg-slate-50">
                  <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#003366]" />
                    Novo Termo Aditivo ao Contrato
                  </h3>
                  <button onClick={() => setModalAditivo(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleSalvarAditivo} className="p-5 space-y-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Tipo de Aditivo *</label>
                    <select
                      value={tipoAditivo}
                      onChange={(e) => setTipoAditivo(e.target.value)}
                      className="w-full border rounded-lg p-2 bg-white font-medium"
                    >
                      <option value="VALOR">Acréscimo de Valor Orçamentário</option>
                      <option value="PRAZO">Prorrogação de Prazo de Vigência</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Número do Aditivo *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: 1º Termo Aditivo"
                      value={numAditivo}
                      onChange={(e) => setNumAditivo(e.target.value)}
                      className="w-full border rounded-lg p-2 font-medium"
                    />
                  </div>

                  {tipoAditivo === 'VALOR' ? (
                    <>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Valor do Acréscimo (R$) *</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          placeholder="Ex: 50000"
                          value={valorAjuste}
                          onChange={(e) => setValorAjuste(e.target.value)}
                          className="w-full border rounded-lg p-2 font-mono font-bold text-right"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Nota de Empenho de Reforço *</label>
                        <input
                          type="text"
                          required
                          placeholder="Ex: 2026NE000123"
                          value={notaEmpenho}
                          onChange={(e) => setNotaEmpenho(e.target.value)}
                          className="w-full border rounded-lg p-2 font-mono"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Data do Reforço do Empenho *</label>
                        <input
                          type="date"
                          required
                          value={dataReforco}
                          onChange={(e) => setDataReforco(e.target.value)}
                          className="w-full border rounded-lg p-2"
                        />
                      </div>
                    </>
                  ) : (
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Nova Data de Término *</label>
                      <input
                        type="date"
                        required
                        value={novaDataFim}
                        onChange={(e) => setNovaDataFim(e.target.value)}
                        className="w-full border rounded-lg p-2 font-medium"
                      />
                    </div>
                  )}

                  <div className="flex justify-end gap-3 pt-3 border-t">
                    <button
                      type="button"
                      onClick={() => setModalAditivo(false)}
                      className="px-4 py-2 border rounded-lg text-slate-700 hover:bg-slate-50 font-medium"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-[#003366] text-white rounded-lg font-bold hover:bg-blue-900 transition-colors shadow"
                    >
                      Registrar Aditivo
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
