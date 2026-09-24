'use client';

import React, { useState } from 'react';
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
} from 'lucide-react';
import Link from 'next/link';

export default function NovoChamadoPage() {
  const router = useRouter();

  // Estados do formulário
  const [categoriaId, setCategoriaId] = useState('');
  const [tipoServicoId, setTipoServicoId] = useState('');
  const [tipoAmbienteId, setTipoAmbienteId] = useState('');
  const [setorEspecifico, setSetorEspecifico] = useState('');
  const [descricao, setDescricao] = useState('');
  const [fraseUrgenciaId, setFraseUrgenciaId] = useState('');
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const categorias = [
    {
      id: '1',
      nome: 'Instalações Hidráulicas e Sanitárias',
      tipos: [
        { id: '101', nome: 'Vazamento em tubulação' },
        { id: '102', nome: 'Reparo em caixa d’água' },
        { id: '103', nome: 'Desentupimento de esgoto' },
        { id: '104', nome: 'Troca de torneiras/válvulas' },
      ],
    },
    {
      id: '2',
      nome: 'Instalações Elétricas e Iluminação',
      tipos: [
        { id: '201', nome: 'Substituição de disjuntor/quadro' },
        { id: '202', nome: 'Troca de lâmpadas/reatores' },
        { id: '203', nome: 'Tomadas e interruptores sem energia' },
      ],
    },
    {
      id: '3',
      nome: 'Climatização e Ar Condicionado',
      tipos: [
        { id: '301', nome: 'Manutenção preventiva de ar split' },
        { id: '302', nome: 'Vazamento de água em ar condicionado' },
        { id: '303', nome: 'Recarga de gás refrigerante' },
      ],
    },
    {
      id: '4',
      nome: 'Alvenaria, Pintura e Cobertura',
      tipos: [
        { id: '401', nome: 'Reparo em infiltrações de teto/telhado' },
        { id: '402', nome: 'Pintura pontual de salas/paredes' },
        { id: '403', nome: 'Conserto de portas e fechaduras' },
      ],
    },
  ];

  const tiposDisponiveis =
    categorias.find((c) => c.id === categoriaId)?.tipos || [];

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setErro('A imagem deve ter no máximo 10MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setFotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');

    if (!tipoServicoId) return setErro('Selecione o tipo de serviço.');
    if (!tipoAmbienteId) return setErro('Selecione o tipo de ambiente.');
    if (setorEspecifico.trim().length < 3)
      return setErro('Informe o setor específico com pelo menos 3 caracteres.');
    if (descricao.trim().length < 10)
      return setErro('Descreva o problema com pelo menos 10 caracteres.');
    if (!fraseUrgenciaId) return setErro('Indique o impacto no ambiente.');
    if (!fotoPreview) return setErro('A foto comprobatória do local é obrigatória.');

    setSalvando(true);
    // Simular abertura
    setTimeout(() => {
      alert('Chamado aberto com sucesso!');
      router.push('/chamados');
    }, 1000);
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      <Sidebar role="DEMANDANTE" />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar
          user={{
            nome: 'Servidor Demandante',
            email: 'servidor@uern.br',
            role: 'DEMANDANTE',
            unidadeNome: 'Campus Central / Mossoró',
          }}
        />

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
                Abertura de Chamado de Manutenção
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Descreva a necessidade predial para vistoria da fiscalização e envio à empresa contratada.
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
            {/* Categoria e Tipo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1.5">
                  Categoria de Serviço *
                </label>
                <select
                  required
                  value={categoriaId}
                  onChange={(e) => {
                    setCategoriaId(e.target.value);
                    setTipoServicoId('');
                  }}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#003366]"
                >
                  <option value="">Selecione a categoria...</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1.5">
                  Tipo Específico de Serviço *
                </label>
                <select
                  required
                  disabled={!categoriaId}
                  value={tipoServicoId}
                  onChange={(e) => setTipoServicoId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#003366] disabled:opacity-50"
                >
                  <option value="">Selecione o serviço...</option>
                  {tiposDisponiveis.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nome}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tipo de Ambiente e Setor */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1.5">
                  Tipo de Ambiente *
                </label>
                <select
                  required
                  value={tipoAmbienteId}
                  onChange={(e) => setTipoAmbienteId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#003366]"
                >
                  <option value="">Selecione o ambiente...</option>
                  <option value="1">Sala de Aula</option>
                  <option value="2">Laboratório</option>
                  <option value="3">Gabinete de Professor / Coordenação</option>
                  <option value="4">Sanitário Masculino / Feminino</option>
                  <option value="5">Auditório / Biblioteca</option>
                  <option value="6">Área Externa / Pátio</option>
                  <option value="7">Setor Administrativo</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1.5">
                  Localização / Setor Específico *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Bloco IV, Sala 14, 2º andar"
                  value={setorEspecifico}
                  onChange={(e) => setSetorEspecifico(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#003366]"
                />
              </div>
            </div>

            {/* Impacto / Grau de Urgência */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1.5">
                Como esse problema afeta o funcionamento do local? *
              </label>
              <select
                required
                value={fraseUrgenciaId}
                onChange={(e) => setFraseUrgenciaId(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#003366]"
              >
                <option value="">Selecione o nível de impacto...</option>
                <option value="1">Impede completamente as atividades no local (Risco imediato) - Crítico</option>
                <option value="2">Prejudica gravemente o funcionamento com risco de agravamento - Alto</option>
                <option value="3">Causa transtorno significativo, mas o ambiente ainda é utilizável - Médio</option>
                <option value="4">Problema estético ou de pequena monta, sem risco - Planejado</option>
              </select>
            </div>

            {/* Descrição detalhada */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1.5">
                Descrição Detalhada do Problema *
              </label>
              <textarea
                required
                rows={4}
                placeholder="Descreva com detalhes o que está quebrado ou necessita de reparo..."
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#003366] resize-y"
              />
            </div>

            {/* Upload de Foto Obrigatória com Preview */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1.5">
                Foto do Problema (Obrigatório) *
              </label>
              <p className="text-xs text-slate-500 mb-2">
                A foto do local é indispensável para que a empresa possa precificar os insumos e a equipe técnica validar a gravidade.
              </p>

              {fotoPreview ? (
                <div className="relative inline-block border border-slate-300 rounded-xl overflow-hidden shadow-sm">
                  <img src={fotoPreview} alt="Pré-visualização" className="w-64 h-48 object-cover" />
                  <button
                    type="button"
                    onClick={() => setFotoPreview(null)}
                    className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="border-2 border-dashed border-slate-300 hover:border-[#003366] rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-50 hover:bg-blue-50/20">
                  <UploadCloud className="w-10 h-10 text-slate-400 mb-2" />
                  <span className="text-xs font-semibold text-slate-700">Clique para selecionar ou tirar uma foto</span>
                  <span className="text-[11px] text-slate-400 mt-1">PNG, JPG até 10MB</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFotoChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Botão de Envio */}
            <div className="pt-4 border-t border-slate-200 flex justify-end space-x-3">
              <Link
                href="/chamados"
                className="px-4 py-2.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </Link>

              <button
                type="submit"
                disabled={salvando}
                className="px-6 py-2.5 bg-[#003366] hover:bg-[#002244] text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center space-x-2 disabled:opacity-50"
              >
                <Wrench className="w-4 h-4 text-amber-400" />
                <span>{salvando ? 'Abrindo Chamado...' : 'Confirmar e Abrir Chamado'}</span>
              </button>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}
