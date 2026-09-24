import React from 'react';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import {
  CheckSquare,
  AlertTriangle,
  Building,
  CheckCircle2,
  XCircle,
  FileText,
  DollarSign,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';

export default async function FilaDecisoesPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const pendencias = [
    {
      id: '1',
      numero: 42,
      titulo: 'Vazamento hidráulico no Bloco de Aulas',
      unidadeNome: 'Campus Central / Mossoró',
      valorOrcado: 'R$ 840,00',
      urgencia: 'CRITICO',
      empresa: 'Manutenção Predial UERN Ltda.',
      diasAguardando: 'Hoje',
      statusAlcada: 'Dentro da alçada do Fiscal Técnico',
    },
    {
      id: '5',
      numero: 38,
      titulo: 'Substituição de compressor e carga de gás em auditório',
      unidadeNome: 'Campus de Pau dos Ferros',
      valorOrcado: 'R$ 4.250,00',
      urgencia: 'ALTO',
      empresa: 'Manutenção Predial UERN Ltda.',
      diasAguardando: '1 dia',
      statusAlcada: 'Exige ratificação do Gestor do Contrato',
    },
  ];

  return (
    <div className="min-h-screen flex bg-slate-50">
      <Sidebar role={session.role} />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar user={session} />

        <main className="flex-1 p-6 md:p-8 max-w-6xl w-full mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Fila de Decisões e Alçadas
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Chamados aguardando avaliação técnica, autorização de orçamento ou validação de garantia.
            </p>
          </div>

          <div className="space-y-4">
            {pendencias.map((p) => (
              <div
                key={p.id}
                className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      #{p.numero.toString().padStart(4, '0')}
                    </span>
                    <h2 className="text-base font-semibold text-slate-900">{p.titulo}</h2>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                      {p.urgencia}
                    </span>
                  </div>

                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200">
                    {p.valorOrcado}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600">
                  <div>
                    <span className="text-slate-400 block">Unidade Demandante:</span>
                    <span className="font-semibold text-slate-800">{p.unidadeNome}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Empresa Contratada:</span>
                    <span className="font-semibold text-slate-800">{p.empresa}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Regra de Alçada:</span>
                    <span className="font-semibold text-amber-700">{p.statusAlcada}</span>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-2">
                  <Link
                    href={`/chamados/${p.id}`}
                    className="px-4 py-2 bg-[#003366] hover:bg-[#002244] text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center space-x-1.5"
                  >
                    <span>Avaliar e Despachar</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
