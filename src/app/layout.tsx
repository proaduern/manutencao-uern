import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Manutenção Predial — UERN | PROAD',
  description: 'Sistema Integrado de Gestão de Manutenção Predial da Universidade do Estado do Rio Grande do Norte (UERN)',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}
