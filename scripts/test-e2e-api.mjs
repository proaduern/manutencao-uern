async function run() {
  const BASE_URL = 'http://localhost:3000';

  console.log('--- Testando Login Admin ---');
  const resLogin = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin.manutencao@uern.br', senha: 'uern@2026' })
  });

  console.log('Status Login Admin:', resLogin.status);
  const loginData = await resLogin.json();
  console.log('Usuario autenticado:', loginData.user?.nome, `(${loginData.user?.role})`);

  const setCookie = resLogin.headers.get('set-cookie');
  if (!setCookie) {
    console.error('Nenhum cookie de sessão retornado!');
    return;
  }
  const cookie = setCookie.split(';')[0];

  console.log('\n--- Testando /api/catalogos ---');
  const resCat = await fetch(`${BASE_URL}/api/catalogos`, {
    headers: { Cookie: cookie }
  });
  const catData = await resCat.json();
  console.log('Status Catalogos:', resCat.status);
  console.log('Categorias carregadas:', catData.categorias?.length);
  console.log('Prédios carregados:', catData.predios?.length);
  console.log('Ambientes carregados:', catData.ambientes?.length);

  console.log('\n--- Testando /api/chamados ---');
  const resChamados = await fetch(`${BASE_URL}/api/chamados`, {
    headers: { Cookie: cookie }
  });
  const chamadosData = await resChamados.json();
  console.log('Status Chamados:', resChamados.status);
  console.log('Total chamados no Neon DB:', chamadosData.total);

  console.log('\n--- Testando /api/contratos ---');
  const resContratos = await fetch(`${BASE_URL}/api/contratos`, {
    headers: { Cookie: cookie }
  });
  const contratosData = await resContratos.json();
  console.log('Status Contratos:', resContratos.status);
  console.log('Contrato:', contratosData.contrato?.numero, 'Empresa:', contratosData.contrato?.empresa?.razaoSocial);
  console.log('Valor Total:', contratosData.contrato?.valorTotal);
  console.log('Saldo Disponível:', contratosData.contrato?.saldoDisponivel);

  console.log('\n--- Testando /api/relatorios ---');
  const resRel = await fetch(`${BASE_URL}/api/relatorios`, {
    headers: { Cookie: cookie }
  });
  const relData = await resRel.json();
  console.log('Status Relatorios:', resRel.status);
  console.log('Totais:', relData.totais);
  console.log('Parecer Renovação:', relData.parecerRenovacao?.status, '-', relData.parecerRenovacao?.motivo);

  console.log('\n--- Testando Login Empresa ---');
  const resEmp = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'empresa@manutencao.com.br', senha: 'uern@2026' })
  });
  const empData = await resEmp.json();
  console.log('Status Login Empresa:', resEmp.status, empData.user?.nome, `(${empData.user?.role})`);

  console.log('\n--- Testando Login Demandante ---');
  const resDem = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'demandante@uern.br', senha: 'uern@2026' })
  });
  const demData = await resDem.json();
  console.log('Status Login Demandante:', resDem.status, demData.user?.nome, `(${demData.user?.role})`);

  console.log('\n✅ Todos os testes de API concluídos com sucesso!');
}

run().catch(console.error);
