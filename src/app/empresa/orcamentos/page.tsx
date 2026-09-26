import { redirect } from 'next/navigation';

export default function EmpresaOrcamentosPage() {
  redirect('/chamados?status=EM_ORCAMENTO');
}
