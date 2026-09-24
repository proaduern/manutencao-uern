import React from 'react';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import {
  Wrench,
  Search,
  Filter,
  PlusCircle,
  Clock,
  AlertCircle,
  Building,
  Calendar,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';

export default async function ChamadosPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  // Chamados simulados/reais de demonstração até conexão com Neon
  const chamados = [
    {
      id: '1',
      numero: 42,
      titulo: 'Vazamento hidráulico no Bloco de Aulas',
      unidadeNome: 'Campus Central / Mossoró',
      setor: 'Bloco IV - Sala 12',
      tipoServico: 'Vazamento em tubulação',
      status: 'EM_ORCAMENTO',
      statusTexto: 'Em orçamento',
      urgencia: 'CRITICO',
      prazoTexto: 'Faltam 4h',
      prazoClasse: 'apertado',
      abertoEm: '24/09/2026 às 14:30',
    },
    {
      id: '2',
      numero: 41,
      titulo: 'Manutenção preventiva em ar condicionado split',
      unidadeNome: 'Campus de Natal',
      setor: 'Laboratório de Informática',
      tipoServico: 'Manutenção preventiva de ar split',
      status: 'EM_EXECUCAO',
      statusTexto: 'Em execução',
      urgencia: 'NORMAL',
      prazoTexto: 'Faltam 2 dias',
      prazoClasse: 'folgado',
      abertoEm: '23/09/2026 às 09:15',
    },
    {
      id: '3',
      numero: 40,
      titulo: 'Substituição de disjuntor desarmando no quadro geral',
      unidadeNome: 'Campus Central / Mossoró',
      setor: 'Prédio da Reitoria',
      tipoServico: 'Substituição de disjuntor/quadro',
      status: 'ATENDIDO',
      statusTexto: 'Aguardando validação',
      urgencia: 'ALTO',
      prazoTexto: 'Atendido no prazo',
      prazoClasse: 'folgado',
      abertoEm: '22/09/2026 às 16:40',
    },
    {
      id: '4',
      numero: 39,
      titulo: 'Reparo em infiltração de calha pluvial',
      unidadeNome: 'Campus de Patu',
      setor: 'Biblioteca Setorial',
      tipoServico: 'Reparo em infiltrações de teto/telhado',
      status: 'CONCLUIDO',
      statusTexto: 'Concluído',
      urgencia: 'NORMAL',
      prazoTexto: 'Finalizado',
      prazoClasse: 'neutro',
      abertoEm: '20/09/2026 às 11:20',
    },
  ];

  return (
    <div className="min-h-screen flex bg-slate-50">
      <Sidebar role={session.role} />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar user={session} />

        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* Header da Página */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Gestão de Chamados
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Acompanhe o ciclo completo de manutenção predial, prazos contratuais e vistorias.
              </p>
            </div>

            <Link
              href="/chamados/novo"
              className="inline-flex items-center space-x-2 px-4 py-2.5 bg-[#003366] hover:bg-[#002244] text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
            >
              <PlusCircle className="w-4 h-4 text-amber-400" />
              <span>Abrir Novo Chamado</span>
            </Link>
          </div>

          {/* Barra de Filtros */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Buscar por nº, descrição, local ou unidade..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#003366]"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <select className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#003366]">
                <option value="">Todos os Status</option>
                <option value="ABERTO">Aberto</option>
                <option value="EM_ORCAMENTO">Em Orçamento</option>
                <option value="EM_EXECUCAO">Em Execução</option>
                <option value="ATENDIDO">Aguardando Validação</option>
                <option value="CONCLUIDO">Concluído</option>
              </select>

              <select className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#003366]">
                <option value="">Todas as Unidades</option>
                <option value="CAMPUS-MOSSORO">Campus Central</option>
                <option value="CAMPUS-NATAL">Campus de Natal</option>
                <option value="CAMPUS-PATU">Campus de Patu</option>
              </select>
            </div>
          </div>

          {/* Lista de Chamados no estilo Card UERN */}
          <div className="space-y-3">
            {chamados.map((c) => (
              <Link
                key={c.id}
                href={`/chamados/${c.id}`}
                className="block bg-white p-5 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all text-left"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center flex-wrap gap-2">
                      <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        #{c.numero.toString().padStart(4, '0')}
                      </span>
                      <h3 className="text-sm font-semibold text-slate-900">{c.titulo}</h3>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          c.urgencia === 'CRITICO'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : c.urgencia === 'ALTO'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {c.urgencia}
                      </span>
                    </div>

                    <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span className="flex items-center space-x-1">
                        <Building className="w-3.5 h-3.5 text-slate-400" />
                        <span>{c.unidadeNome} &bull; {c.setor}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>Aberto em {c.abertoEm}</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 shrink-0">
                    <span
                      className={`text-xs font-medium px-3 py-1 rounded-full border ${
                        c.prazoClasse === 'apertado'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : c.prazoClasse === 'folgado'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      {c.prazoTexto}
                    </span>

                    <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-800 border border-slate-200">
                      {c.statusTexto}
                    </span>

                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
