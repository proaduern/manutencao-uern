'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import * as XLSX from 'xlsx';
import {
  FileText,
  Plus,
  Upload,
  Save,
  Edit2,
  Trash2,
  AlertCircle,
  CheckCircle2,
  RotateCcw,
  FileSpreadsheet,
  Layers,
  Sparkles,
  RefreshCw,
  Check,
  Table,
} from 'lucide-react';

export default function TabelasPrecosPage() {
  const [user, setUser] = useState<any>(null);
  const [tabelas, setTabelas] = useState<any[]>([]);
  const [itens, setItens] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  // Busca em Tempo Real no Catálogo de Referência
  const [termoPesquisa, setTermoPesquisa] = useState('');
  const [itensPesquisados, setItensPesquisados] = useState<any[]>([]);
  const [buscandoPesquisa, setBuscandoPesquisa] = useState(false);

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

  // Upload SINAPI / Excel / CSV em Lote
  const [tabelaDestinoId, setTabelaDestinoId] = useState('');
  const [arquivoPlanilha, setArquivoPlanilha] = useState<File | null>(null);
  const [nomeArquivo, setNomeArquivo] = useState('');
  const [tamanhoArquivo, setTamanhoArquivo] = useState('');
  const [planilhasWorkbook, setPlanilhasWorkbook] = useState<string[]>([]);
  const [abaSelecionada, setAbaSelecionada] = useState('TODAS');
  const [prefixarSinapi, setPrefixarSinapi] = useState(true);
  const [itensParaImportar, setItensParaImportar] = useState<any[]>([]);
  const [itensPrevia, setItensPrevia] = useState<any[]>([]);
  const [lendoArquivo, setLendoArquivo] = useState(false);
  const [importandoLotes, setImportandoLotes] = useState(false);
  const [progressoLote, setProgressoLote] = useState<{
    loteAtual: number;
    totalLotes: number;
    porcentagem: number;
    itensGravados: number;
    totalItens: number;
  } | null>(null);
  const [workbookInstancia, setWorkbookInstancia] = useState<any>(null);

  const [bdiInputs, setBdiInputs] = useState<Record<string, string>>({});
  const [bdiInsumosInputs, setBdiInsumosInputs] = useState<Record<string, string>>({});
  const [bdiServicosInputs, setBdiServicosInputs] = useState<Record<string, string>>({});

  // Modal de Reajuste Linear SINAPI (Interregno Anual)
  const [modalReajuste, setModalReajuste] = useState(false);
  const [formReajuste, setFormReajuste] = useState({
    tabelaId: '',
    percentualReajuste: '4.85',
    modoReajuste: 'CLONAR_VERSAO', // 'CLONAR_VERSAO' ou 'ATUALIZAR_DIRETO'
    novoNomeVersao: '',
    novaVersao: '2026/12',
    processoApostilamento: '',
  });
  const [executandoReajuste, setExecutandoReajuste] = useState(false);

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
        const bdisInsumos: any = {};
        const bdisServicos: any = {};
        for (const t of data.tabelas || []) {
          bdis[t.id] = t.bdiPercentual ? parseFloat(t.bdiPercentual).toString() : '';
          bdisInsumos[t.id] = t.bdiInsumos ? parseFloat(t.bdiInsumos).toString() : '15.27';
          bdisServicos[t.id] = t.bdiServicos ? parseFloat(t.bdiServicos).toString() : '23.86';
        }
        setBdiInputs(bdis);
        setBdiInsumosInputs(bdisInsumos);
        setBdiServicosInputs(bdisServicos);
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

  useEffect(() => {
    if (!termoPesquisa || termoPesquisa.trim().length < 2) {
      setItensPesquisados([]);
      return;
    }
    const timer = setTimeout(() => {
      setBuscandoPesquisa(true);
      fetch(`/api/tabelas/buscar?q=${encodeURIComponent(termoPesquisa.trim())}&limite=50`)
        .then((res) => res.json())
        .then((data) => {
          setItensPesquisados(data.itens || []);
        })
        .catch(() => setItensPesquisados([]))
        .finally(() => setBuscandoPesquisa(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [termoPesquisa]);

  const salvarBdi = async (id: string) => {
    const valInsumos = bdiInsumosInputs[id] ? parseFloat(bdiInsumosInputs[id]) : 15.27;
    const valServicos = bdiServicosInputs[id] ? parseFloat(bdiServicosInputs[id]) : 23.86;
    try {
      const res = await fetch('/api/admin/tabelas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acao: 'SALVAR_BDI',
          tabelaId: id,
          bdiInsumos: valInsumos,
          bdiServicos: valServicos,
          bdiPercentual: valServicos,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMensagem({ tipo: 'sucesso', texto: 'Taxas de BDI (Insumos 15,27% e Serviços 23,86%) salvas com sucesso!' });
      carregarDados();
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message });
    }
  };

  const alterarTipoItem = async (itemId: string, novoTipo: 'INSUMO' | 'SERVICO') => {
    try {
      const res = await fetch('/api/admin/tabelas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acao: 'ALTERAR_TIPO_ITEM',
          itemId,
          tipoItem: novoTipo,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setItens((prev) =>
        prev.map((it) => (it.id === itemId ? { ...it, tipoItem: novoTipo } : it))
      );
      setItensPesquisados((prev) =>
        prev.map((it) => (it.id === itemId ? { ...it, tipoItem: novoTipo } : it))
      );
      setMensagem({
        tipo: 'sucesso',
        texto: `Item alterado com sucesso para ${novoTipo === 'INSUMO' ? 'Insumo (BDI 15,27%)' : 'Serviço c/ MO (BDI 23,86%)'}.`,
      });
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message });
    }
  };

  const executarReajusteLinear = async () => {
    if (!formReajuste.tabelaId) return alert('Selecione uma tabela de referência.');
    const pct = parseFloat(formReajuste.percentualReajuste);
    if (isNaN(pct) || pct === 0) return alert('Informe um percentual de reajuste válido.');

    if (!confirm(`Confirma a aplicação do reajuste linear de ${pct > 0 ? '+' : ''}${pct}% em lote para TODOS os itens desta tabela?`)) return;

    try {
      setExecutandoReajuste(true);
      const res = await fetch('/api/admin/tabelas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acao: 'REAJUSTE_LINEAR_LOTE',
          tabelaId: formReajuste.tabelaId,
          percentualReajuste: pct,
          modoReajuste: formReajuste.modoReajuste,
          novoNomeVersao: formReajuste.novoNomeVersao,
          novaVersao: formReajuste.novaVersao,
          processoApostilamento: formReajuste.processoApostilamento,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMensagem({
        tipo: 'sucesso',
        texto: data.mensagem || `Reajuste linear de ${pct}% aplicado com sucesso!`,
      });
      setModalReajuste(false);
      carregarDados();
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setExecutandoReajuste(false);
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

  // Calcula o range real preenchido ignorando o limite de 1.048.576 linhas do Excel
  const getRealRange = (sheet: any) => {
    let maxR = 0;
    let maxC = 0;
    for (const k of Object.keys(sheet)) {
      if (k.startsWith('!')) continue;
      const coord = XLSX.utils.decode_cell(k);
      if (coord.r > maxR) maxR = coord.r;
      if (coord.c > maxC) maxC = coord.c;
    }
    return { s: { r: 0, c: 0 }, e: { r: maxR, c: maxC } };
  };

  // Extrai itens de uma aba individual com mapeamento inteligente de colunas
  const extrairItensDaAba = (sheet: any, nomeAba: string, devePrefixar: boolean): any[] => {
    sheet['!ref'] = XLSX.utils.encode_range(getRealRange(sheet));
    const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    if (!rawRows || rawRows.length === 0) return [];

    let headerRowIdx = -1;
    let colCodigo = -1;
    let colDesc = -1;
    let colUnid = -1;
    let colValor = -1;

    for (let r = 0; r < Math.min(25, rawRows.length); r++) {
      const row = rawRows[r].map((cell: any) => String(cell || '').toLowerCase().trim());
      const idxCod = row.findIndex((c) => c.includes('código') || c.includes('codigo') || c === 'cod' || c === 'item');
      const idxDesc = row.findIndex((c) => c.includes('descri') || c.includes('especifica'));
      const idxUnid = row.findIndex((c) => c.includes('unidade') || c === 'unid' || c === 'un' || c === 'und');
      // Filtra "origem de preço" para não capturar a coluna de origem ao invés do preço real
      const idxVal = row.findIndex(
        (c) =>
          !c.includes('origem') &&
          (c.includes('custo') ||
            c.includes('valor') ||
            c.includes('preço') ||
            c.includes('preco') ||
            c === 'rn' ||
            c.includes('mediano') ||
            c.includes('total'))
      );

      if (idxCod !== -1 && idxDesc !== -1) {
        headerRowIdx = r;
        colCodigo = idxCod;
        colDesc = idxDesc;
        colUnid = idxUnid;
        colValor = idxVal;
        break;
      }
    }

    if (headerRowIdx === -1) {
      headerRowIdx = 0;
      colCodigo = 0;
      colDesc = 1;
      colUnid = 2;
      colValor = 3;
    }

    const itensExtraidos: any[] = [];
    const abaEhComposicao = nomeAba.toUpperCase().includes('CS') || nomeAba.toUpperCase().includes('COMP');
    const prefixo = devePrefixar ? (abaEhComposicao ? 'SINAPI-COMP-' : 'SINAPI-') : '';

    for (let r = headerRowIdx + 1; r < rawRows.length; r++) {
      const row = rawRows[r];
      if (!row || row.length === 0) continue;

      const codRaw = String(row[colCodigo] ?? '').trim();
      const descRaw = String(row[colDesc] ?? '').trim();
      if (!codRaw || !descRaw) continue;

      if (
        codRaw.toLowerCase().includes('total') ||
        codRaw.toLowerCase().includes('fonte') ||
        descRaw.toLowerCase().startsWith('observa')
      ) {
        continue;
      }

      let unidRaw = colUnid !== -1 ? String(row[colUnid] ?? '').trim() : 'UN';
      if (!unidRaw) unidRaw = 'UN';

      let valorNum = 0;
      const valCell = colValor !== -1 ? row[colValor] : 0;
      if (typeof valCell === 'number') {
        valorNum = valCell;
      } else {
        let s = String(valCell ?? '').trim().replace('R$', '').replace(/\s+/g, '');
        if (s.includes(',')) {
          s = s.replace(/\./g, '').replace(',', '.');
        }
        valorNum = parseFloat(s) || 0;
      }

      const codigoFinal = prefixo ? (codRaw.startsWith('SINAPI-') ? codRaw : `${prefixo}${codRaw}`) : codRaw;

      itensExtraidos.push({
        codigo: codigoFinal,
        descricao: descRaw,
        unidade: unidRaw.toUpperCase(),
        valor: valorNum,
        origemAba: nomeAba,
      });
    }

    return itensExtraidos;
  };

  const extrairItensDoWorkbook = (wb: any, aba: string, prefixar: boolean) => {
    if (!wb) return;
    let todosItens: any[] = [];

    const abasParaProcessar =
      aba === 'TODAS'
        ? wb.SheetNames.filter(
            (name: string) =>
              !name.toLowerCase().includes('leia') &&
              !name.toLowerCase().includes('ajuda') &&
              !name.toLowerCase().includes('macro')
          )
        : [aba];

    for (const sheetName of abasParaProcessar) {
      const sheet = wb.Sheets[sheetName];
      if (!sheet) continue;
      const itensAba = extrairItensDaAba(sheet, sheetName, prefixar);
      todosItens = todosItens.concat(itensAba);
    }

    const mapa = new Map<string, any>();
    for (const item of todosItens) {
      if (!mapa.has(item.codigo)) {
        mapa.set(item.codigo, item);
      }
    }

    const itensFinais = Array.from(mapa.values());
    setItensParaImportar(itensFinais);
    setItensPrevia(itensFinais.slice(0, 5));
  };

  const handleCarregarArquivo = async (file: File) => {
    if (!file) return;
    setArquivoPlanilha(file);
    setNomeArquivo(file.name);
    setTamanhoArquivo((file.size / (1024 * 1024)).toFixed(2) + ' MB');
    setLendoArquivo(true);
    setMensagem(null);
    setProgressoLote(null);

    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { type: 'array' });
      setWorkbookInstancia(wb);
      setPlanilhasWorkbook(wb.SheetNames);

      const abas = wb.SheetNames;
      const temIsd = abas.includes('ISD');
      const temCsd = abas.includes('CSD');
      const abaPadrao = temIsd || temCsd ? 'TODAS' : abas[0];
      setAbaSelecionada(abaPadrao);

      extrairItensDoWorkbook(wb, abaPadrao, prefixarSinapi);
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao processar planilha: ' + err.message });
    } finally {
      setLendoArquivo(false);
    }
  };

  const handleMudarAba = (novaAba: string) => {
    setAbaSelecionada(novaAba);
    if (workbookInstancia) {
      extrairItensDoWorkbook(workbookInstancia, novaAba, prefixarSinapi);
    }
  };

  const handleMudarPrefixo = (prefixar: boolean) => {
    setPrefixarSinapi(prefixar);
    if (workbookInstancia) {
      extrairItensDoWorkbook(workbookInstancia, abaSelecionada, prefixar);
    }
  };

  const executarImportacaoEmLote = async () => {
    if (!tabelaDestinoId) {
      alert('Selecione a tabela de destino.');
      return;
    }
    if (!itensParaImportar || itensParaImportar.length === 0) {
      alert('Nenhum item válido identificado para importação.');
      return;
    }

    setImportandoLotes(true);
    setMensagem(null);

    const TAMANHO_LOTE = 250;
    const totalItens = itensParaImportar.length;
    const totalLotes = Math.ceil(totalItens / TAMANHO_LOTE);
    let gravadosAcumulado = 0;

    try {
      for (let i = 0; i < totalLotes; i++) {
        const loteAtual = i + 1;
        const inicio = i * TAMANHO_LOTE;
        const fim = Math.min(inicio + TAMANHO_LOTE, totalItens);
        const chunk = itensParaImportar.slice(inicio, fim);

        setProgressoLote({
          loteAtual,
          totalLotes,
          porcentagem: Math.round((i / totalLotes) * 100),
          itensGravados: gravadosAcumulado,
          totalItens,
        });

        const res = await fetch('/api/admin/tabelas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            acao: 'CARGA_ITENS',
            tabelaId: tabelaDestinoId,
            itens: chunk.map((c) => ({
              codigo: c.codigo,
              descricao: c.descricao,
              unidade: c.unidade,
              valor: c.valor,
            })),
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(`Erro no lote ${loteAtual}/${totalLotes}: ${data.error || 'Falha ao processar'}`);
        }

        gravadosAcumulado += data.gravados || chunk.length;

        setProgressoLote({
          loteAtual,
          totalLotes,
          porcentagem: Math.round(((i + 1) / totalLotes) * 100),
          itensGravados: gravadosAcumulado,
          totalItens,
        });
      }

      setMensagem({
        tipo: 'sucesso',
        texto: `Carga concluída com sucesso! Total de ${gravadosAcumulado.toLocaleString('pt-BR')} itens salvos/atualizados no banco.`,
      });
      setItensParaImportar([]);
      setItensPrevia([]);
      setArquivoPlanilha(null);
      setNomeArquivo('');
      carregarDados();
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setImportandoLotes(false);
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
                <FileText className="w-7 h-7 text-indigo-700" />
                Tabelas de Preços, Insumos e BDI
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Gerencie tabelas de referência oficial (SINAPI-RN, Própria UERN), insumos, BDI e regras de homologação.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  const ativa = tabelas.find((t) => t.ativa) || tabelas[0];
                  if (ativa) {
                    setFormReajuste((prev) => ({
                      ...prev,
                      tabelaId: ativa.id,
                      novoNomeVersao: `${ativa.nome} (Reajuste Anual +4,85%)`,
                    }));
                  }
                  setModalReajuste(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold rounded-lg shadow-sm transition"
              >
                <Sparkles className="w-4 h-4 text-amber-600" />
                Reajuste Anual Linear SINAPI
              </button>
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

          {/* Cards das Tabelas e BDI Diferenciado */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tabelas.map((t) => (
              <div key={t.id} className={`bg-white p-5 rounded-xl border ${t.ativa ? 'border-indigo-300 shadow-md ring-1 ring-indigo-200' : 'border-slate-200 shadow-sm'} space-y-3`}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-800 text-sm">{t.nome}</h3>
                      {t.ativa && (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
                          ATIVA
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">{t._count?.itens || 0} itens cadastrados {t.versao ? `• Versão ${t.versao}` : ''}</p>
                  </div>
                  <button
                    onClick={() => excluirTabela(t.id, t.nome)}
                    className="p-1 text-slate-400 hover:text-rose-600 transition"
                    title="Excluir Tabela"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="pt-2 border-t space-y-2">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Taxas de BDI Contratuais Diferenciadas
                  </div>
                  
                  {/* BDI Insumos (Materiais puros) */}
                  <div className="flex items-center justify-between gap-2 bg-blue-50/60 p-2 rounded-lg border border-blue-100">
                    <div className="text-xs">
                      <span className="font-semibold text-blue-900 block">BDI Insumos (Materiais):</span>
                      <span className="text-[10px] text-blue-600">Peças sem mão de obra</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="0.01"
                        value={bdiInsumosInputs[t.id] ?? '15.27'}
                        onChange={(e) => setBdiInsumosInputs({ ...bdiInsumosInputs, [t.id]: e.target.value })}
                        className="w-16 px-2 py-1 border border-blue-200 rounded text-xs text-blue-900 font-bold text-right outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                      />
                      <span className="text-xs font-bold text-blue-700">%</span>
                    </div>
                  </div>

                  {/* BDI Serviços (Mão de Obra Integrada com Insumos) */}
                  <div className="flex items-center justify-between gap-2 bg-purple-50/60 p-2 rounded-lg border border-purple-100">
                    <div className="text-xs">
                      <span className="font-semibold text-purple-900 block">BDI Serviços:</span>
                      <span className="text-[10px] text-purple-600">Insumos + Mão de Obra</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="0.01"
                        value={bdiServicosInputs[t.id] ?? '23.86'}
                        onChange={(e) => setBdiServicosInputs({ ...bdiServicosInputs, [t.id]: e.target.value })}
                        className="w-16 px-2 py-1 border border-purple-200 rounded text-xs text-purple-900 font-bold text-right outline-none focus:ring-1 focus:ring-purple-500 bg-white"
                      />
                      <span className="text-xs font-bold text-purple-700">%</span>
                    </div>
                  </div>

                  <button
                    onClick={() => salvarBdi(t.id)}
                    className="w-full mt-1 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border border-indigo-200 transition"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Salvar Taxas de BDI (15,27% / 23,86%)
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Bloco de Carga SINAPI e Tabelas de Referência em Lote */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-indigo-700" />
                  Carga em Lote SINAPI & Tabelas de Referência (.xlsx / .csv)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Importe planilhas oficiais da CAIXA (SINAPI ISD/CSD) ou arquivos CSV. O processamento é particionado em lotes seguros para evitar sobrecarga.
                </p>
              </div>

              {arquivoPlanilha && (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-full border border-indigo-100">
                    <Sparkles className="w-3.5 h-3.5" />
                    {itensParaImportar.length.toLocaleString('pt-BR')} itens identificados
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tabela de Destino</label>
                <select
                  value={tabelaDestinoId}
                  onChange={(e) => setTabelaDestinoId(e.target.value)}
                  disabled={importandoLotes}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {tabelas.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Planilha Excel (.xlsx) ou CSV
                </label>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv,.txt"
                  disabled={importandoLotes || lendoArquivo}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleCarregarArquivo(f);
                  }}
                  className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 disabled:opacity-50"
                />
              </div>

              {planilhasWorkbook.length > 1 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Aba da Planilha</label>
                  <select
                    value={abaSelecionada}
                    onChange={(e) => handleMudarAba(e.target.value)}
                    disabled={importandoLotes}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    <option value="TODAS">Todas as abas (Insumos + Composições)</option>
                    {planilhasWorkbook.map((name) => (
                      <option key={name} value={name}>
                        Aba: {name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex flex-col justify-end">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 font-medium select-none mb-2">
                  <input
                    type="checkbox"
                    checked={prefixarSinapi}
                    onChange={(e) => handleMudarPrefixo(e.target.checked)}
                    disabled={importandoLotes}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  Prefixar códigos com <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px] font-mono">SINAPI-</code>
                </label>

                <button
                  onClick={executarImportacaoEmLote}
                  disabled={importandoLotes || lendoArquivo || itensParaImportar.length === 0}
                  className="w-full px-4 py-2 bg-indigo-700 hover:bg-indigo-800 disabled:opacity-50 text-white rounded-lg text-sm font-semibold shadow-sm transition flex items-center justify-center gap-2"
                >
                  {importandoLotes ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Gravando Lotes no Banco...
                    </>
                  ) : lendoArquivo ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Lendo Planilha...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Gravar {itensParaImportar.length.toLocaleString('pt-BR')} Itens em Lote
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Barra de Progresso em Tempo Real */}
            {progressoLote && (
              <div className="bg-slate-50 border border-indigo-100 p-4 rounded-xl space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-indigo-900 flex items-center gap-1.5">
                    <RefreshCw className={`w-3.5 h-3.5 text-indigo-600 ${importandoLotes ? 'animate-spin' : ''}`} />
                    Lote {progressoLote.loteAtual} de {progressoLote.totalLotes} ({progressoLote.porcentagem}%)
                  </span>
                  <span className="text-slate-600">
                    <strong className="text-indigo-700 font-bold">{progressoLote.itensGravados.toLocaleString('pt-BR')}</strong> de {progressoLote.totalItens.toLocaleString('pt-BR')} itens processados
                  </span>
                </div>
                <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${progressoLote.porcentagem}%` }}
                  />
                </div>
              </div>
            )}

            {/* Pré-visualização dos Primeiros Itens */}
            {itensPrevia.length > 0 && !importandoLotes && (
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 flex justify-between items-center">
                  <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Table className="w-3.5 h-3.5 text-slate-500" />
                    Amostra dos Dados Identificados (Primeiros 5 de {itensParaImportar.length.toLocaleString('pt-BR')} itens):
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {nomeArquivo} ({tamanhoArquivo})
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs text-left text-slate-600">
                    <thead className="bg-slate-100 text-slate-700 font-semibold uppercase text-[10px]">
                      <tr>
                        <th className="px-3 py-1.5">Código</th>
                        <th className="px-3 py-1.5">Descrição</th>
                        <th className="px-3 py-1.5">Unidade</th>
                        <th className="px-3 py-1.5 text-right">Preço Unitário (R$)</th>
                        <th className="px-3 py-1.5">Origem (Aba)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {itensPrevia.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80">
                          <td className="px-3 py-1.5 font-mono font-semibold text-indigo-700">{item.codigo}</td>
                          <td className="px-3 py-1.5 max-w-md truncate" title={item.descricao}>{item.descricao}</td>
                          <td className="px-3 py-1.5 font-medium">{item.unidade}</td>
                          <td className="px-3 py-1.5 text-right font-mono font-semibold text-slate-900">
                            {Number(item.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </td>
                          <td className="px-3 py-1.5 text-slate-400 text-[11px]">{item.origemAba || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Tabela de Insumos Cadastrados */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden space-y-2">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">
                  Catálogo de Itens de Referência ({termoPesquisa ? itensPesquisados.length : itens.length})
                </h3>
                <p className="text-xs text-slate-500">
                  {termoPesquisa
                    ? `Filtrado por "${termoPesquisa}" (${itensPesquisados.length} itens encontrados)`
                    : `Mostrando amostra de itens homologados. Digite ao lado para pesquisar nos 14.961 itens oficiais.`}
                </p>
              </div>

              <div className="w-full sm:w-80 relative">
                <input
                  type="text"
                  placeholder="Pesquisar por código (88316) ou descrição..."
                  value={termoPesquisa}
                  onChange={(e) => setTermoPesquisa(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs pr-8 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                {buscandoPesquisa && (
                  <span className="absolute right-2.5 top-2 text-[10px] text-slate-400">...</span>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3">Código</th>
                    <th className="px-5 py-3">Tabela</th>
                    <th className="px-5 py-3">Descrição do Insumo / Serviço</th>
                    <th className="px-5 py-3">UN</th>
                    <th className="px-5 py-3">Classificação (BDI)</th>
                    <th className="px-5 py-3 text-right">Preço Base (R$)</th>
                    <th className="px-5 py-3 text-right">Preço c/ BDI (R$)</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {carregando ? (
                    <tr>
                      <td colSpan={9} className="px-5 py-8 text-center text-slate-400">
                        Carregando itens...
                      </td>
                    </tr>
                  ) : (termoPesquisa.trim().length >= 2 ? itensPesquisados : itens).length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-5 py-8 text-center text-slate-400">
                        {termoPesquisa ? 'Nenhum item encontrado para esta busca.' : 'Nenhum insumo cadastrado na base de dados.'}
                      </td>
                    </tr>
                  ) : (
                    (termoPesquisa.trim().length >= 2 ? itensPesquisados : itens).map((i) => (
                      <tr key={i.id} className="hover:bg-slate-50/80 transition">
                        <td className="px-5 py-3 font-mono font-bold text-xs text-indigo-700">{i.codigo}</td>
                        <td className="px-5 py-3 text-xs text-slate-500">{i.tabela?.nome}</td>
                        <td className="px-5 py-3 text-xs text-slate-800 max-w-md">{i.descricao}</td>
                        <td className="px-5 py-3 text-xs font-semibold">{i.unidadeMedida}</td>
                        <td className="px-5 py-3">
                          <button
                            onClick={() => alterarTipoItem(i.id, i.tipoItem === 'INSUMO' ? 'SERVICO' : 'INSUMO')}
                            title="Clique para alternar entre Insumo (BDI 15,27%) e Serviço (BDI 23,86%)"
                            className="inline-flex items-center gap-1 group"
                          >
                            {i.tipoItem === 'INSUMO' ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 group-hover:bg-blue-100 transition">
                                INSUMO (15,27%)
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 group-hover:bg-purple-100 transition">
                                SERVIÇO (23,86%)
                              </span>
                            )}
                          </button>
                        </td>
                        <td className="px-5 py-3 font-mono font-medium text-xs text-slate-700 text-right">
                          R$ {parseFloat(i.precoUnitario).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-5 py-3 font-mono font-bold text-xs text-indigo-900 text-right">
                          R$ {(parseFloat(i.precoUnitario) * (1 + (i.tipoItem === 'INSUMO' ? 0.1527 : 0.2386))).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
          {/* Modal Reajuste Linear SINAPI (Interregno Anual) */}
          {modalReajuste && (
            <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4">
                <div className="flex justify-between items-center border-b pb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-600" />
                    <h3 className="text-base font-bold text-slate-800">Reajuste Anual Linear da SINAPI</h3>
                  </div>
                  <button onClick={() => setModalReajuste(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">
                    ✕
                  </button>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-700" />
                    Regra Contratual (Interregno Mínimo de 1 Ano):
                  </p>
                  <p className="text-amber-800">
                    A tabela-base de referência contratual é <strong>Dezembro/2025</strong>. Ao completar o interregno anual de execução, o contrato autoriza o reajuste linear em todos os itens conforme a variação acumulada do índice SINAPI no período.
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Tabela de Origem Base (Dez/25)</label>
                    <select
                      value={formReajuste.tabelaId}
                      onChange={(e) => setFormReajuste({ ...formReajuste, tabelaId: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-xs bg-white text-slate-800 outline-none focus:ring-1 focus:ring-amber-500"
                    >
                      {tabelas.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.nome} ({t._count?.itens || 0} itens) {t.ativa ? '★ ATIVA' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Variação SINAPI Acumulada (%)</label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Ex: 4.85"
                          value={formReajuste.percentualReajuste}
                          onChange={(e) => setFormReajuste({ ...formReajuste, percentualReajuste: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg text-xs font-bold text-amber-900 outline-none focus:ring-1 focus:ring-amber-500 pr-7"
                        />
                        <span className="absolute right-2.5 top-2 text-xs font-bold text-slate-400">%</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Mês/Ano do Reajuste</label>
                      <input
                        type="text"
                        placeholder="Ex: 2026/12"
                        value={formReajuste.novaVersao}
                        onChange={(e) => setFormReajuste({ ...formReajuste, novaVersao: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg text-xs text-slate-800 outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Processo SEI / Apostilamento</label>
                    <input
                      type="text"
                      placeholder="Ex: 04410038.000993/2025-32 (1º Termo de Apostilamento)"
                      value={formReajuste.processoApostilamento}
                      onChange={(e) => setFormReajuste({ ...formReajuste, processoApostilamento: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-xs text-slate-800 outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Modo de Aplicação</label>
                    <div className="space-y-1.5">
                      <label className="flex items-start gap-2 p-2.5 border rounded-lg cursor-pointer hover:bg-slate-50 transition border-amber-300 bg-amber-50/40">
                        <input
                          type="radio"
                          name="modoReajuste"
                          value="CLONAR_VERSAO"
                          checked={formReajuste.modoReajuste === 'CLONAR_VERSAO'}
                          onChange={() => setFormReajuste({ ...formReajuste, modoReajuste: 'CLONAR_VERSAO' })}
                          className="mt-0.5 text-amber-600 focus:ring-amber-500"
                        />
                        <div className="text-xs">
                          <span className="font-bold text-slate-800 block">Gerar Nova Versão Reajustada (Recomendado / Auditável)</span>
                          <span className="text-slate-500 text-[11px]">
                            Preserva a tabela original (Dez/25) intacta no banco para histórico de ordens passadas e cria a nova versão reajustada como a ativa.
                          </span>
                        </div>
                      </label>

                      <label className="flex items-start gap-2 p-2.5 border rounded-lg cursor-pointer hover:bg-slate-50 transition border-slate-200">
                        <input
                          type="radio"
                          name="modoReajuste"
                          value="ATUALIZAR_DIRETO"
                          checked={formReajuste.modoReajuste === 'ATUALIZAR_DIRETO'}
                          onChange={() => setFormReajuste({ ...formReajuste, modoReajuste: 'ATUALIZAR_DIRETO' })}
                          className="mt-0.5 text-slate-600 focus:ring-slate-500"
                        />
                        <div className="text-xs">
                          <span className="font-bold text-slate-800 block">Atualizar Diretamente na Tabela Atual</span>
                          <span className="text-slate-500 text-[11px]">
                            Sobrescreve os preços unitários da tabela selecionada sem criar nova tabela.
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Simulação em Tempo Real */}
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1 text-xs">
                    <span className="font-bold text-slate-700 block">Simulação de Exemplo (Item R$ 100,00 base):</span>
                    <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-[11px]">
                      <div>
                        <span className="text-slate-500 block text-[10px]">Preço Base Reajustado:</span>
                        <strong className="text-slate-900">
                          R$ {(100 * (1 + (parseFloat(formReajuste.percentualReajuste || '0') / 100))).toFixed(2)}
                        </strong>
                      </div>
                      <div>
                        <span className="text-blue-600 block text-[10px]">C/ BDI Insumos (15,27%):</span>
                        <strong className="text-blue-900">
                          R$ {(100 * (1 + (parseFloat(formReajuste.percentualReajuste || '0') / 100)) * 1.1527).toFixed(2)}
                        </strong>
                      </div>
                      <div>
                        <span className="text-purple-600 block text-[10px]">C/ BDI Serviços (23,86%):</span>
                        <strong className="text-purple-900">
                          R$ {(100 * (1 + (parseFloat(formReajuste.percentualReajuste || '0') / 100)) * 1.2386).toFixed(2)}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 border-t pt-3">
                  <button
                    onClick={() => setModalReajuste(false)}
                    disabled={executandoReajuste}
                    className="px-4 py-2 border rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={executarReajusteLinear}
                    disabled={executandoReajuste}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition disabled:opacity-50"
                  >
                    {executandoReajuste ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Reajustando todos os itens...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        Aplicar Reajuste Linear em Lote
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
