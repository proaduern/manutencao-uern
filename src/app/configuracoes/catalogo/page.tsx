'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import {
  Sliders,
  Plus,
  Edit2,
  Trash2,
  Clock,
  AlertTriangle,
  Layers,
  DoorOpen,
  CheckCircle2,
  AlertCircle,
  Gauge,
  Calendar,
  ShieldAlert,
  Hash,
  Info,
} from 'lucide-react';

export default function CatalogoParametricoPage() {
  const [user, setUser] = useState<any>(null);
  const [abaAtiva, setAbaAtiva] = useState<'NIVEIS' | 'CATEGORIAS' | 'TIPOS' | 'AMBIENTES' | 'FRASES' | 'FERIADOS'>('NIVEIS');
  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  // Dados do Catálogo
  const [categorias, setCategorias] = useState<any[]>([]);
  const [tiposServico, setTiposServico] = useState<any[]>([]);
  const [ambientes, setAmbientes] = useState<any[]>([]);
  const [frases, setFrases] = useState<any[]>([]);
  const [niveis, setNiveis] = useState<any[]>([]);

  // Dados de Feriados
  const [feriados, setFeriados] = useState<any[]>([]);
  const [filtroAnoFeriado, setFiltroAnoFeriado] = useState(new Date().getFullYear().toString());
  const [filtroAbrangenciaFeriado, setFiltroAbrangenciaFeriado] = useState('TODOS');
  const [filtroMunicipioFeriado, setFiltroMunicipioFeriado] = useState('TODOS');
  const [modalFeriadoAberto, setModalFeriadoAberto] = useState(false);
  const [feriadoEditando, setFeriadoEditando] = useState<any>(null);
  const [formFeriado, setFormFeriado] = useState({
    data: '',
    descricao: '',
    abrangencia: 'MUNICIPAL',
    municipio: 'Assu',
  });

  // Modais de Criação / Edição
  const [modalAberto, setModalAberto] = useState(false);
  const [itemEditando, setItemEditando] = useState<any>(null);

  // Forms
  const [formNivel, setFormNivel] = useState({
    codigo: '',
    nome: '',
    ordem: '1',
    tipoPrazo: 'HORAS', // 'HORAS' | 'DIAS_UTEIS' | 'DATA_ESPERADA' | 'SEM_PRAZO'
    prazoHorasCorridas: '24',
    prazoDiasUteis: '',
    usaDataEsperada: false,
    selecionavelPorFrase: true,
  });

  const [formCategoria, setFormCategoria] = useState({ nome: '', descricao: '', icone: 'Wrench' });
  const [formTipo, setFormTipo] = useState({ categoriaId: '', nome: '', descricao: '', prazoEstimadoHoras: '72' });
  const [formAmbiente, setFormAmbiente] = useState({ nome: '', descricao: '' });
  const [formFrase, setFormFrase] = useState({
    frase: '',
    nivelCodigo: 'NORMAL',
    nivelSugerido: '3',
    prazoHorasCorridas: '',
    prazoDiasUteis: '',
    exigeData: false,
    ordemExibicao: '1',
  });

  const carregarFeriados = (ano?: string) => {
    const anoBusca = ano || filtroAnoFeriado;
    fetch(`/api/admin/feriados?ano=${anoBusca}`)
      .then((res) => res.json())
      .then((data) => setFeriados(data.feriados || []))
      .catch(console.error);
  };

  const carregarCatalogo = () => {
    setCarregando(true);
    fetch('/api/admin/catalogo')
      .then((res) => res.json())
      .then((data) => {
        setCategorias(data.categorias || []);
        setTiposServico(data.tiposServico || []);
        setAmbientes(data.ambientes || []);
        setFrases(data.frases || []);
        setNiveis(data.niveis || []);
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
    carregarCatalogo();
    carregarFeriados();
  }, []);

  const abrirModalNovo = () => {
    setItemEditando(null);

    if (abaAtiva === 'NIVEIS') {
      const proximaOrdem = (niveis.length + 1).toString();
      setFormNivel({
        codigo: '',
        nome: '',
        ordem: proximaOrdem,
        tipoPrazo: 'HORAS',
        prazoHorasCorridas: '24',
        prazoDiasUteis: '',
        usaDataEsperada: false,
        selecionavelPorFrase: true,
      });
    }

    if (abaAtiva === 'FERIADOS') {
      setFeriadoEditando(null);
      setFormFeriado({
        data: `${filtroAnoFeriado}-01-01`,
        descricao: '',
        abrangencia: 'MUNICIPAL',
        municipio: 'Assu',
      });
      setModalFeriadoAberto(true);
      return;
    }

    if (abaAtiva === 'CATEGORIAS') setFormCategoria({ nome: '', descricao: '', icone: 'Wrench' });
    if (abaAtiva === 'TIPOS') setFormTipo({ categoriaId: categorias[0]?.id?.toString() || '', nome: '', descricao: '', prazoEstimadoHoras: '72' });
    if (abaAtiva === 'AMBIENTES') setFormAmbiente({ nome: '', descricao: '' });
    if (abaAtiva === 'FRASES') {
      const primeiroNivel = niveis[0]?.codigo || 'NORMAL';
      const objNivel = niveis.find((n) => n.codigo === primeiroNivel);
      setFormFrase({
        frase: '',
        nivelCodigo: primeiroNivel,
        nivelSugerido: objNivel?.ordem?.toString() || '3',
        prazoHorasCorridas: '',
        prazoDiasUteis: '',
        exigeData: Boolean(objNivel?.usaDataEsperada),
        ordemExibicao: '1',
      });
    }
    setModalAberto(true);
  };

  const abrirModalEditarFeriado = (f: any) => {
    setFeriadoEditando(f);
    const dataIso = f.data ? new Date(f.data).toISOString().split('T')[0] : '';
    setFormFeriado({
      data: dataIso,
      descricao: f.descricao || '',
      abrangencia: f.abrangencia || 'MUNICIPAL',
      municipio: f.municipio || 'Assu',
    });
    setModalFeriadoAberto(true);
  };

  const salvarFeriado = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFeriado.data || !formFeriado.descricao.trim()) {
      setMensagem({ tipo: 'erro', texto: 'Informe a data e a descrição do feriado.' });
      return;
    }

    try {
      const metodo = feriadoEditando ? 'PUT' : 'POST';
      const payload: any = {
        ...formFeriado,
        id: feriadoEditando ? feriadoEditando.id : undefined,
        municipio: formFeriado.abrangencia === 'MUNICIPAL' ? formFeriado.municipio : null,
      };

      const res = await fetch('/api/admin/feriados', {
        method: metodo,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar feriado');

      setMensagem({
        tipo: 'sucesso',
        texto: feriadoEditando ? 'Feriado atualizado com sucesso!' : 'Novo feriado inserido no calendário!',
      });
      setModalFeriadoAberto(false);
      carregarFeriados();
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message });
    }
  };

  const excluirFeriado = async (id: string, descricao: string) => {
    if (!confirm(`Tem certeza que deseja remover o feriado "${descricao}"?`)) return;

    try {
      const res = await fetch(`/api/admin/feriados?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao remover feriado');

      setMensagem({ tipo: 'sucesso', texto: 'Feriado removido do calendário com sucesso!' });
      carregarFeriados();
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message });
    }
  };

  const sincronizarFeriadosDoAno = async () => {
    if (!confirm(`Deseja sincronizar e carregar todos os feriados nacionais, estaduais e municipais padrão para o ano de ${filtroAnoFeriado}?`)) return;

    try {
      const res = await fetch('/api/admin/feriados', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao: 'GERAR_ANO', ano: filtroAnoFeriado }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao sincronizar');

      setMensagem({ tipo: 'sucesso', texto: data.mensagem || 'Feriados do ano sincronizados com sucesso!' });
      carregarFeriados();
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message });
    }
  };

  const abrirModalEditar = (item: any) => {
    setItemEditando(item);

    if (abaAtiva === 'NIVEIS') {
      let tipoPrazo = 'SEM_PRAZO';
      if (item.usaDataEsperada) tipoPrazo = 'DATA_ESPERADA';
      else if (item.prazoHorasCorridas) tipoPrazo = 'HORAS';
      else if (item.prazoDiasUteis) tipoPrazo = 'DIAS_UTEIS';

      setFormNivel({
        codigo: item.codigo || '',
        nome: item.nome || '',
        ordem: item.ordem?.toString() || '1',
        tipoPrazo,
        prazoHorasCorridas: item.prazoHorasCorridas ? item.prazoHorasCorridas.toString() : '',
        prazoDiasUteis: item.prazoDiasUteis ? item.prazoDiasUteis.toString() : '',
        usaDataEsperada: Boolean(item.usaDataEsperada),
        selecionavelPorFrase: item.selecionavelPorFrase !== undefined ? Boolean(item.selecionavelPorFrase) : true,
      });
    }

    if (abaAtiva === 'CATEGORIAS') {
      setFormCategoria({
        nome: item.nome || '',
        descricao: item.descricao || '',
        icone: item.icone || 'Wrench',
      });
    }
    if (abaAtiva === 'TIPOS') {
      setFormTipo({
        categoriaId: item.categoriaId?.toString() || '',
        nome: item.nome || '',
        descricao: item.descricao || '',
        prazoEstimadoHoras: item.prazoEstimadoHoras?.toString() || '72',
      });
    }
    if (abaAtiva === 'AMBIENTES') {
      setFormAmbiente({
        nome: item.nome || '',
        descricao: item.descricao || '',
      });
    }
    if (abaAtiva === 'FRASES') {
      setFormFrase({
        frase: item.frase || '',
        nivelCodigo: item.nivelCodigo || 'NORMAL',
        nivelSugerido: item.nivelSugerido?.toString() || '3',
        prazoHorasCorridas: item.prazoHorasCorridas ? item.prazoHorasCorridas.toString() : '',
        prazoDiasUteis: item.prazoDiasUteis ? item.prazoDiasUteis.toString() : '',
        exigeData: Boolean(item.exigeData),
        ordemExibicao: item.ordemExibicao?.toString() || '1',
      });
    }
    setModalAberto(true);
  };

  const salvarItem = async (e: React.FormEvent) => {
    e.preventDefault();

    let entidade = '';
    let payload: any = {};

    if (abaAtiva === 'NIVEIS') {
      entidade = 'NIVEL_URGENCIA';
      let prazoHorasCorridas: number | null = null;
      let prazoDiasUteis: number | null = null;
      let usaDataEsperada = formNivel.usaDataEsperada;

      if (formNivel.tipoPrazo === 'HORAS') {
        prazoHorasCorridas = formNivel.prazoHorasCorridas ? parseInt(formNivel.prazoHorasCorridas) : null;
        prazoDiasUteis = null;
        usaDataEsperada = false;
      } else if (formNivel.tipoPrazo === 'DIAS_UTEIS') {
        prazoDiasUteis = formNivel.prazoDiasUteis ? parseInt(formNivel.prazoDiasUteis) : null;
        prazoHorasCorridas = null;
        usaDataEsperada = false;
      } else if (formNivel.tipoPrazo === 'DATA_ESPERADA') {
        prazoHorasCorridas = null;
        prazoDiasUteis = null;
        usaDataEsperada = true;
      } else {
        prazoHorasCorridas = null;
        prazoDiasUteis = null;
      }

      payload = {
        codigo: formNivel.codigo,
        nome: formNivel.nome,
        ordem: parseInt(formNivel.ordem) || 1,
        prazoHorasCorridas,
        prazoDiasUteis,
        usaDataEsperada,
        selecionavelPorFrase: formNivel.selecionavelPorFrase,
      };
    } else if (abaAtiva === 'CATEGORIAS') {
      entidade = 'CATEGORIA';
      payload = { ...formCategoria };
    } else if (abaAtiva === 'TIPOS') {
      entidade = 'TIPO_SERVICO';
      payload = { ...formTipo };
    } else if (abaAtiva === 'AMBIENTES') {
      entidade = 'AMBIENTE';
      payload = { ...formAmbiente };
    } else if (abaAtiva === 'FRASES') {
      entidade = 'FRASE_URGENCIA';
      payload = { ...formFrase };
    }

    try {
      const metodo = itemEditando ? 'PUT' : 'POST';
      const bodyEnvio = {
        entidade,
        id: itemEditando ? itemEditando.id : undefined,
        ...payload,
      };

      const res = await fetch('/api/admin/catalogo', {
        method: metodo,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyEnvio),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao processar catálogo');

      setMensagem({
        tipo: 'sucesso',
        texto: itemEditando ? 'Item do catálogo atualizado com sucesso!' : 'Novo item inserido no catálogo com sucesso!',
      });
      setModalAberto(false);
      carregarCatalogo();
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message });
    }
  };

  const excluirItem = async (id: number, nome: string) => {
    let entidade = '';
    if (abaAtiva === 'NIVEIS') entidade = 'NIVEL_URGENCIA';
    if (abaAtiva === 'CATEGORIAS') entidade = 'CATEGORIA';
    if (abaAtiva === 'TIPOS') entidade = 'TIPO_SERVICO';
    if (abaAtiva === 'AMBIENTES') entidade = 'AMBIENTE';
    if (abaAtiva === 'FRASES') entidade = 'FRASE_URGENCIA';

    if (!confirm(`Deseja realmente excluir "${nome}" do catálogo?`)) return;

    try {
      const res = await fetch(`/api/admin/catalogo?entidade=${entidade}&id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao excluir');

      setMensagem({
        tipo: 'sucesso',
        texto: data.inativado ? 'Item inativado com segurança por possuir vínculos históricos.' : 'Item excluído com sucesso!',
      });
      carregarCatalogo();
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message });
    }
  };

  // Cores dinâmicas para os badges de Nível de Urgência
  const getNivelBadgeClass = (codigo: string, ordem: number) => {
    const cod = (codigo || '').toUpperCase();
    if (cod.includes('EMERG') || ordem === 1) return 'bg-rose-100 text-rose-800 border-rose-200';
    if (cod.includes('ALTA') || ordem === 2) return 'bg-amber-100 text-amber-800 border-amber-200';
    if (cod.includes('NORM') || ordem === 3) return 'bg-sky-100 text-sky-800 border-sky-200';
    if (cod.includes('BAIX') || ordem === 4) return 'bg-slate-100 text-slate-800 border-slate-200';
    if (cod.includes('PLAN') || cod.includes('AGEND') || ordem >= 5) return 'bg-purple-100 text-purple-800 border-purple-200';
    return 'bg-indigo-100 text-indigo-800 border-indigo-200';
  };

  const formatarDataFeriado = (dataStr: string) => {
    if (!dataStr) return { dataFormatada: '-', diaSemana: '' };
    const d = new Date(dataStr);
    const dia = String(d.getUTCDate()).padStart(2, '0');
    const mes = String(d.getUTCMonth() + 1).padStart(2, '0');
    const ano = d.getUTCFullYear();
    const diasSemana = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    const diaSemana = diasSemana[d.getUTCDay()];
    return { dataFormatada: `${dia}/${mes}/${ano}`, diaSemana };
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
              <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Sliders className="w-7 h-7 text-indigo-700" />
                Catálogo Paramétrico e Prazos SLA
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Cadastre e edite níveis de urgência, prazos padrão de atendimento SLA, categorias, tipos de serviço, ambientes e frases de impacto.
              </p>
            </div>

            <button
              onClick={abrirModalNovo}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white font-medium rounded-lg shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              {abaAtiva === 'NIVEIS' && 'Novo Nível de Urgência'}
              {abaAtiva === 'CATEGORIAS' && 'Nova Categoria'}
              {abaAtiva === 'TIPOS' && 'Novo Tipo de Serviço'}
              {abaAtiva === 'AMBIENTES' && 'Novo Ambiente'}
              {abaAtiva === 'FRASES' && 'Nova Frase Padrão de Urgência'}
              {abaAtiva === 'FERIADOS' && 'Novo Feriado'}
            </button>
          </div>

          {/* Mensagens de feedback */}
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

          {/* Abas */}
          <div className="flex border-b border-slate-200 overflow-x-auto gap-1">
            <button
              onClick={() => setAbaAtiva('NIVEIS')}
              className={`px-4 py-2.5 font-medium text-sm border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
                abaAtiva === 'NIVEIS' ? 'border-indigo-700 text-indigo-700 font-semibold' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Gauge className="w-4 h-4" />
              Níveis de Urgência & SLA ({niveis.length})
            </button>
            <button
              onClick={() => setAbaAtiva('CATEGORIAS')}
              className={`px-4 py-2.5 font-medium text-sm border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
                abaAtiva === 'CATEGORIAS' ? 'border-indigo-700 text-indigo-700 font-semibold' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Layers className="w-4 h-4" />
              Categorias de Serviço ({categorias.length})
            </button>
            <button
              onClick={() => setAbaAtiva('TIPOS')}
              className={`px-4 py-2.5 font-medium text-sm border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
                abaAtiva === 'TIPOS' ? 'border-indigo-700 text-indigo-700 font-semibold' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Clock className="w-4 h-4" />
              Tipos de Serviço ({tiposServico.length})
            </button>
            <button
              onClick={() => setAbaAtiva('AMBIENTES')}
              className={`px-4 py-2.5 font-medium text-sm border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
                abaAtiva === 'AMBIENTES' ? 'border-indigo-700 text-indigo-700 font-semibold' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <DoorOpen className="w-4 h-4" />
              Ambientes ({ambientes.length})
            </button>
            <button
              onClick={() => setAbaAtiva('FRASES')}
              className={`px-4 py-2.5 font-medium text-sm border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
                abaAtiva === 'FRASES' ? 'border-indigo-700 text-indigo-700 font-semibold' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              Frases de Impacto & Prazos ({frases.length})
            </button>
            <button
              onClick={() => setAbaAtiva('FERIADOS')}
              className={`px-4 py-2.5 font-medium text-sm border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
                abaAtiva === 'FERIADOS' ? 'border-indigo-700 text-indigo-700 font-semibold' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Calendar className="w-4 h-4" />
              Feriados & Calendário SLA ({feriados.length})
            </button>
          </div>

          {/* Tabela de Níveis de Urgência & SLA */}
          {abaAtiva === 'NIVEIS' && (
            <div className="space-y-4">
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-600 text-white rounded-lg">
                    <Gauge className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-indigo-950">Parametrização de Urgências e Prazos SLA</h3>
                    <p className="text-xs text-indigo-700 mt-0.5">
                      Os prazos definidos aqui são calculados automaticamente na abertura de chamados quando não houver prazo específico na frase de impacto.
                    </p>
                  </div>
                </div>
                <div className="text-xs text-indigo-900 font-semibold bg-white/80 px-3 py-1.5 rounded-lg border border-indigo-200">
                  {niveis.length} níveis ativos configurados
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-5 py-3.5 w-16 text-center">Ordem</th>
                      <th className="px-5 py-3.5">Código / Nível</th>
                      <th className="px-5 py-3.5">Nome Descritivo</th>
                      <th className="px-5 py-3.5">Prazo SLA Padrão</th>
                      <th className="px-5 py-3.5 text-center">Frases</th>
                      <th className="px-5 py-3.5 text-center">Chamados</th>
                      <th className="px-5 py-3.5 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {niveis.map((n) => {
                      const badgeClass = getNivelBadgeClass(n.codigo, n.ordem);
                      return (
                        <tr key={n.id} className="hover:bg-slate-50/80 transition">
                          <td className="px-5 py-3.5 text-center">
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 text-slate-700 font-bold text-xs">
                              #{n.ordem}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold border tracking-wide uppercase ${badgeClass}`}>
                              {n.codigo}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 font-bold text-slate-800">
                            <div>{n.nome}</div>
                            {n.usaDataEsperada && (
                              <span className="inline-flex items-center gap-1 text-[11px] text-purple-700 font-medium mt-0.5">
                                <Calendar className="w-3 h-3" /> Exige data esperada do demandante
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3.5">
                            {n.prazoHorasCorridas ? (
                              <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-md w-fit">
                                <Clock className="w-3.5 h-3.5 text-rose-600" />
                                <span>{n.prazoHorasCorridas} horas corridas</span>
                              </div>
                            ) : n.prazoDiasUteis ? (
                              <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-700 bg-sky-50 border border-sky-200 px-2.5 py-1 rounded-md w-fit">
                                <Clock className="w-3.5 h-3.5 text-sky-600" />
                                <span>{n.prazoDiasUteis} dias úteis</span>
                              </div>
                            ) : n.usaDataEsperada ? (
                              <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-1 rounded-md w-fit">
                                <Calendar className="w-3.5 h-3.5 text-purple-600" />
                                <span>Data Marcada / Agendada</span>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400 italic">Sem prazo padrão</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-center text-xs font-medium text-slate-600">
                            <span className="bg-slate-100 px-2 py-0.5 rounded-full">{n._count?.frases || 0} frases</span>
                          </td>
                          <td className="px-5 py-3.5 text-center text-xs font-medium text-slate-600">
                            <span className="bg-slate-100 px-2 py-0.5 rounded-full">{n._count?.chamados || 0} chamados</span>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => abrirModalEditar(n)}
                                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md transition"
                                title="Editar Nível de Urgência"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                                Editar
                              </button>
                              <button
                                onClick={() => excluirItem(n.id, n.nome)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition"
                                title="Excluir Nível"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tabela de Categorias */}
          {abaAtiva === 'CATEGORIAS' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">Nome da Categoria</th>
                    <th className="px-5 py-3.5">Descrição</th>
                    <th className="px-5 py-3.5">Tipos Vinculados</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {categorias.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-5 py-3.5 font-bold text-slate-800">{c.nome}</td>
                      <td className="px-5 py-3.5 text-xs text-slate-500">{c.descricao || '—'}</td>
                      <td className="px-5 py-3.5 text-xs text-slate-700 font-medium">{c._count?.tipos || 0} tipos</td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${c.ativo ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                          {c.ativo ? 'Ativa' : 'Inativa'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => abrirModalEditar(c)} className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md transition">
                            <Edit2 className="w-3.5 h-3.5" />
                            Editar
                          </button>
                          <button onClick={() => excluirItem(c.id, c.nome)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Tabela de Tipos de Serviço */}
          {abaAtiva === 'TIPOS' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">Tipo de Serviço</th>
                    <th className="px-5 py-3.5">Categoria</th>
                    <th className="px-5 py-3.5">Prazo Estimado</th>
                    <th className="px-5 py-3.5">Chamados</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tiposServico.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-5 py-3.5 font-medium text-slate-800">
                        <div>{t.nome}</div>
                        {t.descricao && <div className="text-xs text-slate-400">{t.descricao}</div>}
                      </td>
                      <td className="px-5 py-3.5 text-xs font-semibold text-indigo-700">{t.categoria?.nome}</td>
                      <td className="px-5 py-3.5 text-xs text-slate-700 font-medium">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {t.prazoEstimadoHoras} horas
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-600">{t._count?.chamados || 0}</td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${t.ativo ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                          {t.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => abrirModalEditar(t)} className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md transition">
                            <Edit2 className="w-3.5 h-3.5" />
                            Editar
                          </button>
                          <button onClick={() => excluirItem(t.id, t.nome)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Tabela de Ambientes */}
          {abaAtiva === 'AMBIENTES' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">Tipo de Ambiente</th>
                    <th className="px-5 py-3.5">Descrição</th>
                    <th className="px-5 py-3.5">Chamados Registrados</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ambientes.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-5 py-3.5 font-bold text-slate-800">{a.nome}</td>
                      <td className="px-5 py-3.5 text-xs text-slate-500">{a.descricao || '—'}</td>
                      <td className="px-5 py-3.5 text-xs text-slate-600">{a._count?.chamados || 0}</td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${a.ativo ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                          {a.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => abrirModalEditar(a)} className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md transition">
                            <Edit2 className="w-3.5 h-3.5" />
                            Editar
                          </button>
                          <button onClick={() => excluirItem(a.id, a.nome)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Tabela de Frases Padrão & Prazos */}
          {abaAtiva === 'FRASES' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">Frase de Impacto no Ambiente</th>
                    <th className="px-5 py-3.5">Nível de Urgência</th>
                    <th className="px-5 py-3.5">Prazo da Frase</th>
                    <th className="px-5 py-3.5">Exige Data</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {frases.map((f) => {
                    const badgeClass = getNivelBadgeClass(f.nivelCodigo, f.nivelSugerido);
                    return (
                      <tr key={f.id} className="hover:bg-slate-50/80 transition">
                        <td className="px-5 py-3.5 font-medium text-slate-800">{f.frase}</td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold border ${badgeClass}`}>
                            {f.nivelCodigo} (Nível {f.nivelSugerido})
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-slate-700 font-semibold">
                          {f.prazoHorasCorridas ? (
                            <span className="text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
                              {f.prazoHorasCorridas} horas corridas
                            </span>
                          ) : f.prazoDiasUteis ? (
                            <span className="text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded">
                              {f.prazoDiasUteis} dias úteis
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Segue padrão do nível</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-slate-600">
                          {f.exigeData ? <span className="text-amber-700 font-semibold">Sim (Data esperada)</span> : 'Não'}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${f.ativo ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                            {f.ativo ? 'Ativa' : 'Inativa'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => abrirModalEditar(f)} className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md transition">
                              <Edit2 className="w-3.5 h-3.5" />
                              Editar
                            </button>
                            <button onClick={() => excluirItem(f.id, f.frase)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Gestão de Feriados & Calendário de Prazos SLA */}
          {abaAtiva === 'FERIADOS' && (
            <div className="space-y-4">
              {/* Banner Informativo sobre SLA e Feriados */}
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-indigo-600 text-white rounded-lg shrink-0 mt-0.5">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-indigo-950">
                      Calendário Oficial de Feriados & Prazos Úteis SLA
                    </h3>
                    <p className="text-xs text-indigo-800/80 mt-1 max-w-3xl leading-relaxed">
                      Feriados <strong>nacionais</strong> e <strong>estaduais (RN)</strong> suspendem a contagem de prazos úteis em todas as unidades e campi da UERN.
                      Já os feriados <strong>municipais</strong> impactam os chamados de acordo com a cidade da unidade demandante solicitante (ex: Assu, Mossoró, Natal, Caicó, Pau dos Ferros, Patu).
                      Chamados de emergência em horas corridas mantêm a contagem contínua.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  <button
                    onClick={sincronizarFeriadosDoAno}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-indigo-700 bg-white border border-indigo-200 hover:bg-indigo-50 rounded-lg shadow-sm transition"
                    title="Recarrega ou adiciona todos os feriados nacionais, estaduais do RN e municipais padrão deste ano"
                  >
                    <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                    Sincronizar Feriados Padrão ({filtroAnoFeriado})
                  </button>
                  <button
                    onClick={abrirModalNovo}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg shadow-sm transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Novo Feriado
                  </button>
                </div>
              </div>

              {/* Barra de Filtros */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-500 uppercase">Ano:</span>
                    <select
                      value={filtroAnoFeriado}
                      onChange={(e) => {
                        setFiltroAnoFeriado(e.target.value);
                        carregarFeriados(e.target.value);
                      }}
                      className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-slate-800 bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {['2025', '2026', '2027', '2028', '2029', '2030'].map((a) => (
                        <option key={a} value={a}>
                          Ano {a}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-500 uppercase">Abrangência:</span>
                    <select
                      value={filtroAbrangenciaFeriado}
                      onChange={(e) => setFiltroAbrangenciaFeriado(e.target.value)}
                      className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="TODOS">Todas as Abrangências</option>
                      <option value="NACIONAL">Nacional (Brasil)</option>
                      <option value="ESTADUAL">Estadual (RN)</option>
                      <option value="MUNICIPAL">Municipal (Campi)</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-500 uppercase">Município:</span>
                    <select
                      value={filtroMunicipioFeriado}
                      onChange={(e) => setFiltroMunicipioFeriado(e.target.value)}
                      className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="TODOS">Todos os Municípios</option>
                      <option value="Natal">Natal</option>
                      <option value="Mossoró">Mossoró</option>
                      <option value="Pau dos Ferros">Pau dos Ferros</option>
                      <option value="Assu">Assu</option>
                      <option value="Caicó">Caicó</option>
                      <option value="Patu">Patu</option>
                    </select>
                  </div>
                </div>

                <div className="text-xs text-slate-500">
                  Mostrando{' '}
                  <span className="font-bold text-slate-800">
                    {
                      feriados.filter((f) => {
                        if (filtroAbrangenciaFeriado !== 'TODOS' && f.abrangencia !== filtroAbrangenciaFeriado) return false;
                        if (filtroMunicipioFeriado !== 'TODOS' && f.abrangencia === 'MUNICIPAL' && f.municipio !== filtroMunicipioFeriado) return false;
                        return true;
                      }).length
                    }
                  </span>{' '}
                  de {feriados.length} feriados cadastrados
                </div>
              </div>

              {/* Tabela de Feriados */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase border-b tracking-wider">
                      <th className="px-5 py-3.5">Data do Feriado</th>
                      <th className="px-5 py-3.5">Celebração / Descrição</th>
                      <th className="px-5 py-3.5">Abrangência</th>
                      <th className="px-5 py-3.5">Localidade / Município</th>
                      <th className="px-5 py-3.5">Impacto no SLA</th>
                      <th className="px-5 py-3.5 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {feriados
                      .filter((f) => {
                        if (filtroAbrangenciaFeriado !== 'TODOS' && f.abrangencia !== filtroAbrangenciaFeriado) return false;
                        if (filtroMunicipioFeriado !== 'TODOS' && f.abrangencia === 'MUNICIPAL' && f.municipio !== filtroMunicipioFeriado) return false;
                        return true;
                      })
                      .map((f) => {
                        const { dataFormatada, diaSemana } = formatarDataFeriado(f.data);
                        return (
                          <tr key={f.id} className="hover:bg-slate-50/70 transition">
                            <td className="px-5 py-3.5 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-slate-400" />
                                <div>
                                  <span className="font-bold text-slate-800">{dataFormatada}</span>
                                  <span className="block text-[11px] text-slate-500">{diaSemana}</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="font-semibold text-slate-800">{f.descricao}</span>
                            </td>
                            <td className="px-5 py-3.5 whitespace-nowrap">
                              {f.abrangencia === 'NACIONAL' && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  Nacional (Brasil)
                                </span>
                              )}
                              {f.abrangencia === 'ESTADUAL' && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-100 text-sky-800 border border-sky-200">
                                  Estadual (RN)
                                </span>
                              )}
                              {f.abrangencia === 'MUNICIPAL' && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
                                  Municipal
                                </span>
                              )}
                            </td>
                            <td className="px-5 py-3.5 whitespace-nowrap">
                              {f.abrangencia === 'MUNICIPAL' ? (
                                <span className="inline-flex items-center gap-1 font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-xs border border-slate-200">
                                  📍 Campus / Cidade: <strong>{f.municipio}</strong>
                                </span>
                              ) : (
                                <span className="text-xs text-slate-500 italic">
                                  Válido para todos os campi da UERN
                                </span>
                              )}
                            </td>
                            <td className="px-5 py-3.5 whitespace-nowrap">
                              <span className="inline-flex items-center gap-1 text-xs text-slate-600 font-medium">
                                <Clock className="w-3.5 h-3.5 text-amber-600" />
                                Suspende prazos úteis
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => abrirModalEditarFeriado(f)}
                                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md transition"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                  Editar
                                </button>
                                <button
                                  onClick={() => excluirFeriado(f.id, f.descricao)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                                  title="Remover feriado"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}

                    {feriados.filter((f) => {
                      if (filtroAbrangenciaFeriado !== 'TODOS' && f.abrangencia !== filtroAbrangenciaFeriado) return false;
                      if (filtroMunicipioFeriado !== 'TODOS' && f.abrangencia === 'MUNICIPAL' && f.municipio !== filtroMunicipioFeriado) return false;
                      return true;
                    }).length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                          <Calendar className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                          <p className="font-semibold text-slate-600">Nenhum feriado encontrado para estes filtros.</p>
                          <p className="text-xs text-slate-400 mt-1">
                            Clique em &quot;Sincronizar Feriados Padrão&quot; para carregar a lista oficial ou adicione manualmente.
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Modal Universal do Catálogo */}
          {modalAberto && (
            <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center border-b pb-3">
                  <h3 className="text-lg font-bold text-slate-800">
                    {itemEditando
                      ? abaAtiva === 'NIVEIS'
                        ? 'Editar Nível de Urgência & SLA'
                        : 'Editar Item do Catálogo'
                      : abaAtiva === 'NIVEIS'
                      ? 'Novo Nível de Urgência & SLA'
                      : 'Inserir Novo Item'}
                  </h3>
                  <button onClick={() => setModalAberto(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">
                    ✕
                  </button>
                </div>

                <form onSubmit={salvarItem} className="space-y-4">
                  {/* Form Nível de Urgência */}
                  {abaAtiva === 'NIVEIS' && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                            Código do Nível *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Ex: CRITICA, ALTA, ROTINA..."
                            value={formNivel.codigo}
                            onChange={(e) => setFormNivel({ ...formNivel, codigo: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                            className="w-full px-3 py-2 border rounded-lg text-sm font-mono uppercase outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          <span className="text-[11px] text-slate-400">Identificador único do sistema</span>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                            Ordem na Fila de Triagem *
                          </label>
                          <input
                            type="number"
                            required
                            min="1"
                            max="20"
                            value={formNivel.ordem}
                            onChange={(e) => setFormNivel({ ...formNivel, ordem: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          <span className="text-[11px] text-slate-400">1 = mais urgente (primeiro da lista)</span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                          Nome Descritivo do Nível *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Ex: Emergência (Risco Iminente), Urgência Crítica, Normal..."
                          value={formNivel.nome}
                          onChange={(e) => setFormNivel({ ...formNivel, nome: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 space-y-3">
                        <label className="block text-xs font-bold text-slate-700 uppercase">
                          Regra de Prazo SLA Padrão
                        </label>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <label className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition ${formNivel.tipoPrazo === 'HORAS' ? 'bg-indigo-50 border-indigo-300 font-semibold text-indigo-900' : 'bg-white border-slate-200 text-slate-700'}`}>
                            <input
                              type="radio"
                              name="tipoPrazo"
                              value="HORAS"
                              checked={formNivel.tipoPrazo === 'HORAS'}
                              onChange={() => setFormNivel({ ...formNivel, tipoPrazo: 'HORAS', usaDataEsperada: false })}
                              className="text-indigo-600"
                            />
                            <span>Horas Corridas</span>
                          </label>

                          <label className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition ${formNivel.tipoPrazo === 'DIAS_UTEIS' ? 'bg-indigo-50 border-indigo-300 font-semibold text-indigo-900' : 'bg-white border-slate-200 text-slate-700'}`}>
                            <input
                              type="radio"
                              name="tipoPrazo"
                              value="DIAS_UTEIS"
                              checked={formNivel.tipoPrazo === 'DIAS_UTEIS'}
                              onChange={() => setFormNivel({ ...formNivel, tipoPrazo: 'DIAS_UTEIS', usaDataEsperada: false })}
                              className="text-indigo-600"
                            />
                            <span>Dias Úteis</span>
                          </label>

                          <label className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition ${formNivel.tipoPrazo === 'DATA_ESPERADA' ? 'bg-indigo-50 border-indigo-300 font-semibold text-indigo-900' : 'bg-white border-slate-200 text-slate-700'}`}>
                            <input
                              type="radio"
                              name="tipoPrazo"
                              value="DATA_ESPERADA"
                              checked={formNivel.tipoPrazo === 'DATA_ESPERADA'}
                              onChange={() => setFormNivel({ ...formNivel, tipoPrazo: 'DATA_ESPERADA', usaDataEsperada: true })}
                              className="text-indigo-600"
                            />
                            <span>Data Agendada</span>
                          </label>

                          <label className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition ${formNivel.tipoPrazo === 'SEM_PRAZO' ? 'bg-indigo-50 border-indigo-300 font-semibold text-indigo-900' : 'bg-white border-slate-200 text-slate-700'}`}>
                            <input
                              type="radio"
                              name="tipoPrazo"
                              value="SEM_PRAZO"
                              checked={formNivel.tipoPrazo === 'SEM_PRAZO'}
                              onChange={() => setFormNivel({ ...formNivel, tipoPrazo: 'SEM_PRAZO', usaDataEsperada: false })}
                              className="text-indigo-600"
                            />
                            <span>Sob Demanda / Sem SLA</span>
                          </label>
                        </div>

                        {formNivel.tipoPrazo === 'HORAS' && (
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Quantidade de Horas Corridas *</label>
                            <input
                              type="number"
                              required
                              min="1"
                              placeholder="Ex: 24 (1 dia) ou 48 (2 dias)"
                              value={formNivel.prazoHorasCorridas}
                              onChange={(e) => setFormNivel({ ...formNivel, prazoHorasCorridas: e.target.value })}
                              className="w-full px-3 py-2 border rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <span className="text-[11px] text-slate-500">Contabiliza fins de semana e feriados ininterruptamente.</span>
                          </div>
                        )}

                        {formNivel.tipoPrazo === 'DIAS_UTEIS' && (
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Quantidade de Dias Úteis *</label>
                            <input
                              type="number"
                              required
                              min="1"
                              placeholder="Ex: 3, 5, 10 dias úteis"
                              value={formNivel.prazoDiasUteis}
                              onChange={(e) => setFormNivel({ ...formNivel, prazoDiasUteis: e.target.value })}
                              className="w-full px-3 py-2 border rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <span className="text-[11px] text-slate-500">Pula automaticamente sábados e domingos no cálculo do prazo limite.</span>
                          </div>
                        )}

                        {formNivel.tipoPrazo === 'DATA_ESPERADA' && (
                          <div className="text-xs text-purple-800 bg-purple-50 p-2.5 rounded-md border border-purple-200 flex items-start gap-2">
                            <Info className="w-4 h-4 shrink-0 text-purple-600 mt-0.5" />
                            <span>
                              Ao abrir chamados com este nível, o demandante será obrigado a preencher um campo de data marcada/agendada para o serviço.
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2 pt-1">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formNivel.selecionavelPorFrase}
                            onChange={(e) => setFormNivel({ ...formNivel, selecionavelPorFrase: e.target.checked })}
                            className="w-4 h-4 text-indigo-600 rounded"
                          />
                          <span className="text-xs text-slate-700 font-medium">
                            Disponível para seleção no cadastro de frases padrão de impacto
                          </span>
                        </label>
                      </div>
                    </>
                  )}

                  {/* Form Categoria */}
                  {abaAtiva === 'CATEGORIAS' && (
                    <>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Nome da Categoria *</label>
                        <input
                          type="text"
                          required
                          placeholder="Ex: Refrigeração e Climatização"
                          value={formCategoria.nome}
                          onChange={(e) => setFormCategoria({ ...formCategoria, nome: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Descrição</label>
                        <textarea
                          placeholder="Descrição geral dos serviços desta categoria..."
                          value={formCategoria.descricao}
                          onChange={(e) => setFormCategoria({ ...formCategoria, descricao: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                          rows={3}
                        />
                      </div>
                    </>
                  )}

                  {/* Form Tipo de Serviço */}
                  {abaAtiva === 'TIPOS' && (
                    <>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Categoria de Serviço *</label>
                        <select
                          required
                          value={formTipo.categoriaId}
                          onChange={(e) => setFormTipo({ ...formTipo, categoriaId: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="">Selecione uma categoria...</option>
                          {categorias.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.nome}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Nome do Tipo de Serviço *</label>
                        <input
                          type="text"
                          required
                          placeholder="Ex: Ar-condicionado não gela"
                          value={formTipo.nome}
                          onChange={(e) => setFormTipo({ ...formTipo, nome: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Prazo Estimado Padrão (Horas)</label>
                        <input
                          type="number"
                          value={formTipo.prazoEstimadoHoras}
                          onChange={(e) => setFormTipo({ ...formTipo, prazoEstimadoHoras: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </>
                  )}

                  {/* Form Ambiente */}
                  {abaAtiva === 'AMBIENTES' && (
                    <>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Nome do Tipo de Ambiente *</label>
                        <input
                          type="text"
                          required
                          placeholder="Ex: Sala de Aula, Laboratório, etc."
                          value={formAmbiente.nome}
                          onChange={(e) => setFormAmbiente({ ...formAmbiente, nome: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Descrição</label>
                        <input
                          type="text"
                          placeholder="Ex: Ambientes acadêmicos dedicados ao ensino presencial"
                          value={formAmbiente.descricao}
                          onChange={(e) => setFormAmbiente({ ...formAmbiente, descricao: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </>
                  )}

                  {/* Form Frase Padrão de Urgência & Prazos */}
                  {abaAtiva === 'FRASES' && (
                    <>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                          Frase Padrão (Como afeta o ambiente) *
                        </label>
                        <textarea
                          required
                          placeholder="Ex: Parada total com interrupção das atividades normais do setor."
                          value={formFrase.frase}
                          onChange={(e) => setFormFrase({ ...formFrase, frase: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                          rows={2}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Nível de Urgência *</label>
                          <select
                            value={formFrase.nivelCodigo}
                            onChange={(e) => {
                              const cod = e.target.value;
                              const objNivel = niveis.find((n) => n.codigo === cod);
                              setFormFrase({
                                ...formFrase,
                                nivelCodigo: cod,
                                nivelSugerido: objNivel?.ordem?.toString() || formFrase.nivelSugerido,
                                exigeData: Boolean(objNivel?.usaDataEsperada),
                              });
                            }}
                            className="w-full px-3 py-2 border rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            {niveis.map((n) => (
                              <option key={n.id} value={n.codigo}>
                                {n.nome} ({n.codigo})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Peso na Triagem (1 a 10)</label>
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={formFrase.nivelSugerido}
                            onChange={(e) => setFormFrase({ ...formFrase, nivelSugerido: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                            Prazo Específico (Horas Corridas)
                          </label>
                          <input
                            type="number"
                            placeholder="Deixe vazio para usar do nível"
                            value={formFrase.prazoHorasCorridas}
                            onChange={(e) => setFormFrase({ ...formFrase, prazoHorasCorridas: e.target.value, prazoDiasUteis: '' })}
                            className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                            Prazo Específico (Dias Úteis)
                          </label>
                          <input
                            type="number"
                            placeholder="Deixe vazio para usar do nível"
                            value={formFrase.prazoDiasUteis}
                            onChange={(e) => setFormFrase({ ...formFrase, prazoDiasUteis: e.target.value, prazoHorasCorridas: '' })}
                            className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="checkbox"
                          id="chkExigeData"
                          checked={formFrase.exigeData}
                          onChange={(e) => setFormFrase({ ...formFrase, exigeData: e.target.checked })}
                          className="w-4 h-4 text-indigo-600 rounded"
                        />
                        <label htmlFor="chkExigeData" className="text-xs text-slate-700 font-medium">
                          Esta frase exige que o demandante informe uma data esperada (Ex: evento agendado).
                        </label>
                      </div>
                    </>
                  )}

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
                      {itemEditando ? 'Salvar Alterações' : 'Cadastrar Item'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Modal Específico para Feriados Oficiais */}
          {modalFeriadoAberto && (
            <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center border-b pb-3">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-indigo-600" />
                      {feriadoEditando ? 'Editar Feriado no Calendário' : 'Novo Feriado no Calendário SLA'}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Feriados impactam o cálculo de SLA em prazos de dias úteis e horas úteis.
                    </p>
                  </div>
                  <button onClick={() => setModalFeriadoAberto(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">
                    ✕
                  </button>
                </div>

                <form onSubmit={salvarFeriado} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                      Data do Feriado *
                    </label>
                    <input
                      type="date"
                      required
                      value={formFeriado.data}
                      onChange={(e) => setFormFeriado({ ...formFeriado, data: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                      Celebração / Nome do Feriado *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: São João Batista, Emancipação Política de Assú, Padroeira de Patu..."
                      value={formFeriado.descricao}
                      onChange={(e) => setFormFeriado({ ...formFeriado, descricao: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                      Abrangência do Feriado *
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <label
                        className={`flex flex-col items-center justify-center p-2.5 rounded-lg border cursor-pointer text-xs transition text-center ${
                          formFeriado.abrangencia === 'NACIONAL'
                            ? 'bg-emerald-50 border-emerald-400 text-emerald-900 font-bold'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="formAbrangencia"
                          value="NACIONAL"
                          checked={formFeriado.abrangencia === 'NACIONAL'}
                          onChange={() => setFormFeriado({ ...formFeriado, abrangencia: 'NACIONAL' })}
                          className="sr-only"
                        />
                        <span>Nacional</span>
                        <span className="text-[10px] text-slate-500 mt-0.5">Todo o Brasil</span>
                      </label>

                      <label
                        className={`flex flex-col items-center justify-center p-2.5 rounded-lg border cursor-pointer text-xs transition text-center ${
                          formFeriado.abrangencia === 'ESTADUAL'
                            ? 'bg-sky-50 border-sky-400 text-sky-900 font-bold'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="formAbrangencia"
                          value="ESTADUAL"
                          checked={formFeriado.abrangencia === 'ESTADUAL'}
                          onChange={() => setFormFeriado({ ...formFeriado, abrangencia: 'ESTADUAL' })}
                          className="sr-only"
                        />
                        <span>Estadual</span>
                        <span className="text-[10px] text-slate-500 mt-0.5">RN (Todos Campi)</span>
                      </label>

                      <label
                        className={`flex flex-col items-center justify-center p-2.5 rounded-lg border cursor-pointer text-xs transition text-center ${
                          formFeriado.abrangencia === 'MUNICIPAL'
                            ? 'bg-purple-50 border-purple-400 text-purple-900 font-bold'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="formAbrangencia"
                          value="MUNICIPAL"
                          checked={formFeriado.abrangencia === 'MUNICIPAL'}
                          onChange={() => setFormFeriado({ ...formFeriado, abrangencia: 'MUNICIPAL' })}
                          className="sr-only"
                        />
                        <span>Municipal</span>
                        <span className="text-[10px] text-slate-500 mt-0.5">Campus Específico</span>
                      </label>
                    </div>
                  </div>

                  {formFeriado.abrangencia === 'MUNICIPAL' && (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 space-y-2">
                      <label className="block text-xs font-semibold text-purple-900 uppercase">
                        Município / Campus de Aplicação *
                      </label>
                      <input
                        type="text"
                        required
                        list="listaMunicipiosCampi"
                        placeholder="Digite ou selecione a cidade (ex: Assu, Mossoró, Natal, Caicó, Pau dos Ferros, Patu)"
                        value={formFeriado.municipio || ''}
                        onChange={(e) => setFormFeriado({ ...formFeriado, municipio: e.target.value })}
                        className="w-full px-3 py-2 border border-purple-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      <datalist id="listaMunicipiosCampi">
                        <option value="Natal" />
                        <option value="Mossoró" />
                        <option value="Pau dos Ferros" />
                        <option value="Assu" />
                        <option value="Caicó" />
                        <option value="Patu" />
                      </datalist>
                      <p className="text-[11px] text-purple-700">
                        O feriado será aplicado exclusivamente às demandas abertas por unidades lotadas neste município.
                      </p>
                    </div>
                  )}

                  <div className="flex justify-end gap-3 pt-3 border-t">
                    <button
                      type="button"
                      onClick={() => setModalFeriadoAberto(false)}
                      className="px-4 py-2 border text-slate-600 rounded-lg text-sm hover:bg-slate-50 transition"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg text-sm font-semibold shadow-sm transition"
                    >
                      {feriadoEditando ? 'Salvar Alterações' : 'Cadastrar Feriado'}
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
