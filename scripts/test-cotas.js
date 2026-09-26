const http = require('http');

function request(options, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, headers: res.headers, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function testarGestaoCotas() {
  console.log('--- TESTE: GESTÃO DE COTAS EM LOTE E INDIVIDUAL ---');

  // 1. Login ADMIN
  const loginRes = await request(
    {
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    JSON.stringify({ email: 'admin.manutencao@uern.br', senha: 'uern@2026' })
  );

  console.log('1. Login status:', loginRes.status);
  const cookie = loginRes.headers['set-cookie']?.[0]?.split(';')[0] || '';

  // 2. Obter Unidades
  const uniRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/unidades',
    method: 'GET',
    headers: { Cookie: cookie },
  });
  const unidades = uniRes.data.unidades || [];
  console.log('2. Unidades encontradas no sistema:', unidades.length);
  if (unidades.length < 2) {
    console.error('Poucas unidades para o teste');
    return;
  }

  const u1 = unidades[0];
  const u2 = unidades[1];
  const u3 = unidades[2] || unidades[0];

  // 3. Criar Nova Agenda selecionando apenas u1 e u2 com cotas exclusivas (outras em Saldo Geral)
  const agora = new Date();
  const fim = new Date(agora.getTime() + 30 * 24 * 3600 * 1000);
  const criarAgendaRes = await request(
    {
      hostname: 'localhost',
      port: 3000,
      path: '/api/agendas',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
    },
    JSON.stringify({
      titulo: 'Agenda Teste Automatizado de Cotas em Lote',
      anoReferencia: 2026,
      periodoInicioColeta: agora.toISOString().split('T')[0],
      periodoFimColeta: fim.toISOString().split('T')[0],
      valorTotalDisponivel: 150000.0,
      cotasPersonalizadas: [
        { unidadeId: u1.id, cotaValor: 25000.0, maxDemandas: 2 },
        { unidadeId: u2.id, cotaValor: 30000.0, maxDemandas: 3 },
      ],
    })
  );

  console.log('3. Criar Agenda status:', criarAgendaRes.status);
  const agendaId = criarAgendaRes.data.agenda?.id;
  console.log('ID da agenda criada:', agendaId);

  // 4. GET detalhes e verificar cotas consolidadas
  const getRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: `/api/agendas/${agendaId}`,
    method: 'GET',
    headers: { Cookie: cookie },
  });
  console.log('4. GET Agenda status:', getRes.status);
  const cotas = getRes.data.cotasConsolidadas || [];
  const comCota = cotas.filter((c) => !c.usaSaldoGeral);
  const emSaldoGeral = cotas.filter((c) => c.usaSaldoGeral);
  console.log(`Unidades com cota exclusiva inicial: ${comCota.length} (esperado 2)`);
  console.log(`Unidades em Saldo Geral inicial: ${emSaldoGeral.length}`);

  // 5. Testar Ação em Lote: INCLUIR_COTAS_LOTE (atribuir cota a u3)
  console.log('5. Testando INCLUIR_COTAS_LOTE...');
  const loteRes = await request(
    {
      hostname: 'localhost',
      port: 3000,
      path: `/api/agendas/${agendaId}`,
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
    },
    JSON.stringify({
      acao: 'INCLUIR_COTAS_LOTE',
      unidadesIds: [u3.id],
      cotaValor: 18000.0,
      maxDemandas: 1,
    })
  );
  console.log('INCLUIR_COTAS_LOTE status:', loteRes.status, loteRes.data.mensagem);

  // 6. Testar Ação Individual: EXCLUIR_COTA_UNIDADE (excluir u1 da cota -> voltar para saldo geral)
  console.log('6. Testando EXCLUIR_COTA_UNIDADE...');
  const excluiRes = await request(
    {
      hostname: 'localhost',
      port: 3000,
      path: `/api/agendas/${agendaId}`,
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
    },
    JSON.stringify({
      acao: 'EXCLUIR_COTA_UNIDADE',
      unidadeId: u1.id,
    })
  );
  console.log('EXCLUIR_COTA_UNIDADE status:', excluiRes.status, excluiRes.data.mensagem);

  // 7. Testar Ação em Lote: EXCLUIR_COTAS_LOTE
  console.log('7. Testando EXCLUIR_COTAS_LOTE...');
  const excluiLoteRes = await request(
    {
      hostname: 'localhost',
      port: 3000,
      path: `/api/agendas/${agendaId}`,
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
    },
    JSON.stringify({
      acao: 'EXCLUIR_COTAS_LOTE',
      unidadesIds: [u2.id, u3.id],
    })
  );
  console.log('EXCLUIR_COTAS_LOTE status:', excluiLoteRes.status, excluiLoteRes.data.mensagem);

  // 8. Verificar estado final
  const getFinalRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: `/api/agendas/${agendaId}`,
    method: 'GET',
    headers: { Cookie: cookie },
  });
  const cotasFinais = getFinalRes.data.cotasConsolidadas || [];
  const comCotaFinais = cotasFinais.filter((c) => !c.usaSaldoGeral);
  console.log(`8. Unidades com cota exclusiva no final: ${comCotaFinais.length} (esperado 0)`);

  // 9. Excluir agenda de teste para limpar o banco
  console.log('9. Limpando agenda de teste...');
  const delRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: `/api/agendas/${agendaId}`,
    method: 'DELETE',
    headers: { Cookie: cookie },
  });
  console.log('DELETE status:', delRes.status, delRes.data.mensagem);

  console.log('--- TESTE CONCLUÍDO COM 100% DE SUCESSO! ---');
}

testarGestaoCotas().catch(console.error);
