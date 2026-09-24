import React from 'react';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import {
  DollarSign,
  FileText,
  Building,
  TrendingDown,
  PieChart,
  Calendar,
} from 'lucide-react';

export default async function ContratosCotasPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const contrato = {
    numero: 'CT 014/2025',
    ano: 2025,
    objeto: 'Prestação de serviços contínuos de manutenção predial preventiva e corretiva com fornecimento de peças e insumos para os Campi da UERN.',
    empresa: 'Manutenção Predial UERN Ltda. (CNPJ: 12.345.678/0001-90)',
    vigencia: '01/01/2025 a 31/12/2025',
    valorTotal: 'R$ 2.400.000,00',
    saldoGeral: 'R$ 1.580.400,00',
  };

  const cotasPorUnidade = [
    {
      unidade: 'Campus Central / Mossoró',
      cotaAnual: 'R$ 1.000.000,00',
      empenhado: 'R$ 380.000,00',
      saldo: 'R$ 620.000,00',
      percentualGasto: '38%',
    },
    {
      unidade: 'Campus de Natal',
      cotaAnual: 'R$ 450.000,00',
      empenhado: 'R$ 210.000,00',
      saldo: 'R$ 240.000,00',
      percentualGasto: '46%',
    },
    {
      unidade: 'Campus de Patu',
      cotaAnual: 'R$ 200.000,00',
      empenhado: 'R$ 55.000,00',
      saldo: 'R$ 145.000,00',
      percentualGasto: '27%',
    },
    {
      unidade: 'Campus de Pau dos Ferros',
      cotaAnual: 'R$ 350.000,00',
      empenhado: 'R$ 140.000,00',
      saldo: 'R$ 210.000,00',
      percentualGasto: '40%',
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
              Contratos & Cotas Orçamentárias
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Controle orçamentário, saldo por unidade demandante e acompanhamento de aditivos.
            </p>
          </div>

          {/* Dados do Contrato */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900">{contrato.numero}</h2>
                <p className="text-xs text-slate-500 mt-0.5">{contrato.empresa}</p>
              </div>

              <span className="text-xs font-semibold px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                Vigente
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">{contrato.objeto}</p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 block font-medium">Vigência:</span>
                <span className="font-semibold text-slate-800">{contrato.vigencia}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 block font-medium">Valor Contratado:</span>
                <span className="font-semibold text-slate-800">{contrato.valorTotal}</span>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                <span className="text-emerald-700 block font-medium">Saldo Global Disponível:</span>
                <span className="font-bold text-emerald-800 text-sm">{contrato.saldoGeral}</span>
              </div>
            </div>
          </div>

          {/* Cotas por Unidade */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
              <PieChart className="w-4 h-4 text-[#003366]" />
              <span>Distribuição de Cotas por Unidade</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-semibold">
                    <th className="py-2.5 px-3">Unidade / Campus</th>
                    <th className="py-2.5 px-3 text-right">Cota Total</th>
                    <th className="py-2.5 px-3 text-right">Empenhado / Executado</th>
                    <th className="py-2.5 px-3 text-right">Saldo Disponível</th>
                    <th className="py-2.5 px-3 text-center">% Consumido</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cotasPorUnidade.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60">
                      <td className="py-3 px-3 font-semibold text-slate-800">{item.unidade}</td>
                      <td className="py-3 px-3 text-right font-mono text-slate-600">{item.cotaAnual}</td>
                      <td className="py-3 px-3 text-right font-mono text-amber-700 font-medium">{item.empenhado}</td>
                      <td className="py-3 px-3 text-right font-mono text-emerald-700 font-bold">{item.saldo}</td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
                          {item.percentualGasto}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
