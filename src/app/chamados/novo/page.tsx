'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import {
  Wrench,
  Camera,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  UploadCloud,
  X,
  Building2,
} from 'lucide-react';
import Link from 'next/link';

export default function NovoChamadoPage() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [ambientes, setAmbientes] = useState<any[]>([]);
  const [frases, setFrases] = useState<any[]>([]);
  const [unidades, setUnidades] = useState<any[]>([]);

  // Estados do formulário
  const [categoriaId, setCategoriaId] = useState('');
  const [tipoServicoId, setTipoServicoId] = useState('');
  const [tipoAmbienteId, setTipoAmbienteId] = useState('');
  const [unidadeId, setUnidadeId] = useState('');
  const [predioId, setPredioId] = useState('');
  const [sublocais, setSublocais] = useState<any[]>([]);
  const [sublocalId, setSublocalId] = useState('');
  const [setorEspecifico, setSetorEspecifico] = useState('');
  const [descricao, setDescricao] = useState('');
  const [fraseUrgenciaId, setFraseUrgenciaId] = useState('');
  const [dataEsperada, setDataEsperada] = useState('');
  const [exigeData, setExigeData] = useState(false);

  // Foto
  const [fotoBase64, setFotoBase64] = useState<string | null>(null);
  const [fotoSha256, setFotoSha256] = useState<string | null>(null);

  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const unidadeSelecionada = unidades.find((u) => u.id === (unidadeId || user?.unidadeId));
  const prediosDaUnidade = unidadeSelecionada?.predios || [];

  // Sincronizar sublocais da unidade
  useEffect(() => {
    const unId = unidadeId || user?.unidadeId;
    if (!unId) {
      setSublocais([]);
      setSublocalId('');
      return;
    }
    fetch(`/api/unidades/sublocais?unidadeId=${unId}`)
      .then((res) => res.json())
      .then((data) => {
        setSublocais(data.sublocais || []);
      })
      .catch(console.error);
  }, [unidadeId, user?.unidadeId]);

  // Sincronizar prédio quando a unidade for alterada
  useEffect(() => {
    if (prediosDaUnidade.length === 1) {
      setPredioId(prediosDaUnidade[0].id);
    } else if (prediosDaUnidade.length > 1) {
      if (!prediosDaUnidade.some((p: any) => p.id === predioId)) {
        setPredioId('');
      }
    } else {
      setPredioId('');
    }
  }, [unidadeId, user?.unidadeId, unidades]);

  const handleSublocalChange = (idEscolhido: string) => {
    setSublocalId(idEscolhido);
    if (!idEscolhido) return;

    const sub = sublocais.find((s) => s.id === idEscolhido);
    if (sub) {
      if (sub.tipoAmbienteId) {
        setTipoAmbienteId(sub.tipoAmbienteId.toString());
      }
      if (sub.predioId) {
        setPredioId(sub.predioId);
      }
      if (sub.nome) {
        setSetorEspecifico(sub.nome);
      }
    }
  };

  useEffect(() => {
    // Carregar usuário logado
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user);
          if (data.user.unidadeId) setUnidadeId(data.user.unidadeId);
        }
      });

    // Carregar catálogos
    fetch('/api/catalogos')
      .then((res) => res.json())
      .then((data) => {
        if (data.categorias) setCategorias(data.categorias);
        if (data.ambientes) setAmbientes(data.ambientes);
        if (data.frases) setFrases(data.frases);
        if (data.unidades) setUnidades(data.unidades);
      });
  }, []);

  const tiposDisponiveis =
    categorias.find((c) => c.id.toString() === categoriaId)?.tipos || [];

  const obterDataMinimaProgramada = () => {
    let d = new Date();
    let diasRestantes = 3;
    while (diasRestantes > 0) {
      d.setDate(d.getDate() + 1);
      const diaSemana = d.getDay();
      if (diaSemana !== 0 && diaSemana !== 6) {
        diasRestantes--;
      }
    }
    const ano = d.getFullYear();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  };

  const handleFraseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const fid = e.target.value;
    setFraseUrgenciaId(fid);
    const selecionada = frases.find((f) => f.id.toString() === fid);
    setExigeData(!!selecionada?.exigeData);
  };

  // Compressão e hash SHA-256 no cliente fiel ao modelo legado
  const handleFotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = async () => {
        const ladoMax = 1600;
        const escala = Math.min(1, ladoMax / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * escala);
        canvas.height = Math.round(img.height * escala);

        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(objectUrl);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setFotoBase64(dataUrl);

        // Calcular hash SHA-256 da imagem
        const response = await fetch(dataUrl);
        const buffer = await response.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
        setFotoSha256(hashHex);
      };

      img.src = objectUrl;
    } catch (err: any) {
      setErro('Erro ao processar imagem: ' + err.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');

    if (!tipoServicoId) return setErro('Selecione a categoria e o tipo de serviço.');
    if (!tipoAmbienteId) return setErro('Selecione o tipo de ambiente.');
    if (prediosDaUnidade.length > 1 && !predioId) {
      return setErro('Selecione em qual prédio da unidade demandante ocorreu a ocorrência.');
    }
    if (setorEspecifico.trim().length < 3) {
      return setErro('Informe o local exato com pelo menos 3 letras.');
    }
    if (descricao.trim().length < 10) {
      return setErro('Descreva o problema com pelo menos 10 caracteres.');
    }
    if (!fraseUrgenciaId) return setErro('Escolha como isso afeta o uso do ambiente.');
    if (exigeData && !dataEsperada) {
      return setErro('Informe a data esperada para a realização do serviço.');
    }
    if (!fotoBase64) return setErro('A foto do problema é obrigatória.');

    setSalvando(true);
    try {
      const res = await fetch('/api/chamados', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unidadeId: unidadeId || undefined,
          predioId: predioId || undefined,
          sublocalId: sublocalId || undefined,
          tipoServicoId,
          tipoAmbienteId,
          setorEspecifico,
          descricao,
          fraseUrgenciaId,
          dataEsperada: exigeData ? dataEsperada : null,
          fotoUrl: fotoBase64,
          fotoSha256,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao abrir chamado.');

      alert(data.mensagem || 'Chamado aberto com sucesso!');
      router.push('/chamados');
    } catch (err: any) {
      setErro(err.message || 'Falha ao salvar chamado.');
      setSalvando(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      <Sidebar role={user?.role || 'DEMANDANTE'} />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar user={user || { nome: 'Carregando...', role: 'DEMANDANTE' }} />

        <main className="flex-1 p-6 md:p-8 max-w-4xl w-full mx-auto space-y-6">
          <div className="flex items-center space-x-3">
            <Link
              href="/chamados"
              className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Abrir Chamado de Manutenção
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Registre a necessidade predial com foto comprobatória para início imediato do atendimento.
              </p>
            </div>
          </div>

          {erro && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg flex items-center space-x-2 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{erro}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            {/* Seleção de Unidade (para Admin ou Fiscal Setorial) */}
            {user?.role === 'ADMIN' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Unidade Demandante <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={unidadeId}
                  onChange={(e) => setUnidadeId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-[#003366]"
                >
                  <option value="">Selecione a unidade...</option>
                  {unidades.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nome} ({u.campus})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Prédio / Edificação Vinculada (Ex: múltiplos prédios como Campus Assu Sede I e Sede II) */}
            {prediosDaUnidade.length > 1 ? (
              <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-indigo-950 uppercase tracking-wide">
                    Prédio / Edificação Demandada <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] bg-indigo-100 text-indigo-800 font-semibold px-2 py-0.5 rounded-full">
                    {prediosDaUnidade.length} prédios disponíveis
                  </span>
                </div>
                <select
                  required
                  value={predioId}
                  onChange={(e) => setPredioId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-indigo-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-600 font-medium text-slate-800"
                >
                  <option value="">Selecione em qual prédio ocorreu a demanda...</option>
                  {prediosDaUnidade.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.nome} {p.endereco ? `— ${p.endereco}` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-indigo-800/80">
                  Esta unidade possui mais de uma edificação vinculada (ex: Sede I e Sede II). Selecione onde o serviço será executado.
                </p>
              </div>
            ) : prediosDaUnidade.length === 1 ? (
              <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                <div className="flex items-center gap-2 text-slate-700">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  <span>
                    Prédio atendido: <strong className="text-slate-900">{prediosDaUnidade[0].nome}</strong>
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 font-medium bg-white px-2 py-0.5 rounded border border-slate-200">
                  {unidadeSelecionada?.campus || prediosDaUnidade[0].campus}
                </span>
              </div>
            ) : null}

            {/* Cascata Categoria e Tipo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Categoria de Serviço <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={categoriaId}
                  onChange={(e) => {
                    setCategoriaId(e.target.value);
                    setTipoServicoId('');
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-[#003366]"
                >
                  <option value="">Escolha a categoria...</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id.toString()}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Tipo de Serviço <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  disabled={!categoriaId}
                  value={tipoServicoId}
                  onChange={(e) => setTipoServicoId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs disabled:opacity-50 focus:ring-2 focus:ring-[#003366]"
                >
                  <option value="">
                    {categoriaId ? 'Escolha o serviço...' : 'Escolha a categoria antes'}
                  </option>
                  {tiposDisponiveis.map((t: any) => (
                    <option key={t.id} value={t.id.toString()}>
                      {t.nome} (SLA: {t.prazoEstimadoHoras}h)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Sublocais / Ambientes Cadastrados da Unidade */}
            {sublocais.length > 0 && (
              <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-emerald-950 uppercase tracking-wide">
                    Ambiente / Sala Pré-Cadastrada na Unidade
                  </label>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full">
                    {sublocais.length} locais cadastrados
                  </span>
                </div>
                <select
                  value={sublocalId}
                  onChange={(e) => handleSublocalChange(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-lg text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-600 outline-none"
                >
                  <option value="">Selecione um ambiente cadastrado (ou preencha manualmente abaixo)...</option>
                  {sublocais.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nome} {s.predio ? `— ${s.predio.nome}` : ''} ({s.tipoAmbiente?.nome})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-emerald-800/80">
                  Dica: Ao selecionar uma sala, laboratório ou ambiente cadastrado pela gestão da sua unidade, o tipo de ambiente, prédio e identificação são autocompletados.
                </p>
              </div>
            )}

            {/* Tipo de Ambiente e Local Exato */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Tipo de Ambiente <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={tipoAmbienteId}
                  onChange={(e) => setTipoAmbienteId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-[#003366]"
                >
                  <option value="">Escolha o ambiente...</option>
                  {ambientes.map((a) => (
                    <option key={a.id} value={a.id.toString()}>
                      {a.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Local Exato / Setor <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={120}
                  placeholder="Ex: Bloco IV, Sala 12 (Subsolo)"
                  value={setorEspecifico}
                  onChange={(e) => setSetorEspecifico(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-[#003366]"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Onde alguém que não conhece o prédio conseguiria chegar facilmente.
                </p>
              </div>
            </div>

            {/* Descrição */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                O que está acontecendo <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={4}
                maxLength={1000}
                placeholder="Descreva a ocorrência com detalhes (ex: vazamento na tubulação sob a pia de descarte)..."
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-[#003366]"
              />
            </div>

            {/* Frase de Urgência (Determina SLA) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Como isso afeta o uso do ambiente <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={fraseUrgenciaId}
                onChange={handleFraseChange}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-[#003366]"
              >
                <option value="">Escolha a frase que descreve a situação real...</option>
                {frases.map((f) => (
                  <option key={f.id} value={f.id.toString()}>
                    {f.frase}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400 mt-1">
                A frase escolhida define a prioridade e o prazo contratual de atendimento.
              </p>
            </div>

            {/* Data esperada se a frase exigir */}
            {exigeData && (
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                <label className="block text-xs font-bold text-amber-900 uppercase mb-1">
                  Data Esperada para o Atendimento <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  min={obterDataMinimaProgramada()}
                  value={dataEsperada}
                  onChange={(e) => setDataEsperada(e.target.value)}
                  className="px-3 py-2 bg-white border border-amber-300 rounded-lg text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#003366]"
                />
                <p className="text-[11px] text-amber-700 mt-1">
                  Para serviços programados, a data deve ter antecedência mínima de 3 dias úteis.
                </p>
              </div>
            )}

            {/* Upload de Foto Obrigatório com Deduplicação */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Foto do Problema (Registro do Antes) <span className="text-rose-500">*</span>
              </label>

              {fotoBase64 ? (
                <div className="relative inline-block border border-slate-300 rounded-xl overflow-hidden shadow-sm">
                  <img src={fotoBase64} alt="Foto do problema" className="max-h-64 object-cover" />
                  <button
                    type="button"
                    onClick={() => {
                      setFotoBase64(null);
                      setFotoSha256(null);
                    }}
                    className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black text-white rounded-full transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-slate-300 hover:border-slate-400 rounded-xl p-6 text-center cursor-pointer bg-slate-50/50 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFotoUpload}
                    className="hidden"
                    id="fotoUploadInput"
                  />
                  <label htmlFor="fotoUploadInput" className="cursor-pointer space-y-2 block">
                    <div className="w-10 h-10 rounded-full bg-blue-50 text-[#003366] flex items-center justify-center mx-auto">
                      <Camera className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-semibold text-slate-700 block">
                      Tirar foto ou anexar imagem do local
                    </span>
                    <span className="text-[11px] text-slate-400 block">
                      A foto é comprimida e assinada eletronicamente no seu dispositivo antes do envio.
                    </span>
                  </label>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
              <Link
                href="/chamados"
                className="px-4 py-2.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </Link>

              <button
                type="submit"
                disabled={salvando}
                className="px-6 py-2.5 bg-[#003366] hover:bg-[#002244] text-white text-xs font-semibold rounded-lg shadow-sm disabled:opacity-50 transition-colors"
              >
                {salvando ? 'Abrindo chamado...' : 'Confirmar e Abrir Chamado'}
              </button>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}
