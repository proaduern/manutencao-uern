import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'FISCAL_TECNICO' && session.role !== 'GESTOR_CONTRATO')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const [tabelas, itens] = await Promise.all([
      prisma.tabelaReferencia.findMany({
        include: {
          _count: { select: { itens: true } },
        },
        orderBy: { criadoEm: 'desc' },
      }),
      prisma.itemReferencia.findMany({
        take: 300,
        orderBy: { codigo: 'asc' },
        include: { tabela: { select: { id: true, nome: true, bdiInsumos: true, bdiServicos: true } } },
      }),
    ]);

    return NextResponse.json({ tabelas, itens });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao carregar tabelas: ' + error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'FISCAL_TECNICO' && session.role !== 'GESTOR_CONTRATO')) {
      return NextResponse.json({ error: 'Apenas Gestores e Fiscais Técnicos têm acesso.' }, { status: 403 });
    }

    const body = await req.json();
    const {
      acao,
      tabelaId,
      itens,
      bdiPercentual,
      bdiInsumos,
      bdiServicos,
      itemId,
      justificativa,
      nome,
      versao,
      codigo,
      descricao,
      unidadeMedida,
      precoUnitario,
      tipoItem,
      // Reajuste linear
      percentualReajuste,
      modoReajuste,
      novoNomeVersao,
      novaVersao,
      processoApostilamento,
    } = body;

    // 1. Criar Nova Tabela de Referência
    if (acao === 'CRIAR_TABELA') {
      if (!nome || nome.trim().length < 2) {
        return NextResponse.json({ error: 'Nome da tabela é obrigatório.' }, { status: 400 });
      }

      const novaTabela = await prisma.tabelaReferencia.create({
        data: {
          nome: nome.trim(),
          versao: versao ? versao.trim() : '2026/01',
          bdiPercentual: bdiServicos ? parseFloat(bdiServicos) : (bdiPercentual ? parseFloat(bdiPercentual) : 23.86),
          bdiInsumos: bdiInsumos ? parseFloat(bdiInsumos) : 15.27,
          bdiServicos: bdiServicos ? parseFloat(bdiServicos) : 23.86,
          ativa: true,
        },
      });
      return NextResponse.json({ success: true, tabela: novaTabela }, { status: 201 });
    }

    // 2. Criar Insumo / Item Avulso na Tabela
    if (acao === 'CRIAR_ITEM') {
      if (!tabelaId || !codigo || !descricao || precoUnitario === undefined) {
        return NextResponse.json({ error: 'Tabela, código, descrição e preço são obrigatórios.' }, { status: 400 });
      }

      const item = await prisma.itemReferencia.create({
        data: {
          tabelaId,
          codigo: codigo.trim(),
          descricao: descricao.trim(),
          unidadeMedida: unidadeMedida ? unidadeMedida.trim() : 'UN',
          precoUnitario: parseFloat(precoUnitario),
          tipoItem: tipoItem === 'INSUMO' ? 'INSUMO' : 'SERVICO',
          status: 'HOMOLOGADO',
        },
      });
      return NextResponse.json({ success: true, item }, { status: 201 });
    }

    // 3. Atualizar BDI Diferenciado (Insumos 15,27% e Serviços 23,86%)
    if (acao === 'SALVAR_BDI') {
      const vInsumos = bdiInsumos !== undefined ? parseFloat(bdiInsumos) : 15.27;
      const vServicos = bdiServicos !== undefined ? parseFloat(bdiServicos) : 23.86;

      const atualizada = await prisma.tabelaReferencia.update({
        where: { id: tabelaId },
        data: {
          bdiInsumos: vInsumos,
          bdiServicos: vServicos,
          bdiPercentual: vServicos, // compatibilidade retroativa
        },
      });
      return NextResponse.json({ success: true, tabela: atualizada });
    }

    // 4. Alterar Tipo do Item (INSUMO vs SERVICO)
    if (acao === 'ALTERAR_TIPO_ITEM') {
      if (!itemId || !tipoItem) {
        return NextResponse.json({ error: 'itemId e tipoItem são obrigatórios.' }, { status: 400 });
      }

      const itemAtualizado = await prisma.itemReferencia.update({
        where: { id: itemId },
        data: {
          tipoItem: tipoItem === 'INSUMO' ? 'INSUMO' : 'SERVICO',
        },
      });
      return NextResponse.json({ success: true, item: itemAtualizado });
    }

    // 5. REAJUSTE ANUAL LINEAR EM LOTE (Interregno SINAPI)
    if (acao === 'REAJUSTE_LINEAR_LOTE') {
      if (!tabelaId) {
        return NextResponse.json({ error: 'Selecione a tabela de referência de origem.' }, { status: 400 });
      }

      const pct = typeof percentualReajuste === 'number' ? percentualReajuste : parseFloat(String(percentualReajuste || '0').replace(',', '.'));
      if (isNaN(pct) || pct === 0) {
        return NextResponse.json({ error: 'Percentual de reajuste inválido. Ex: 4.85 para 4,85%.' }, { status: 400 });
      }

      const tabelaOrigem = await prisma.tabelaReferencia.findUnique({
        where: { id: tabelaId },
      });

      if (!tabelaOrigem) {
        return NextResponse.json({ error: 'Tabela de referência de origem não encontrada.' }, { status: 404 });
      }

      const fatorMultiplicador = 1 + (pct / 100);

      // MODO 1: CLONAR VERSÃO (Preserva a original Dez/25 e gera nova versão reajustada - Mais Seguro e Auditável)
      if (modoReajuste === 'CLONAR_VERSAO' || !modoReajuste) {
        const novaTabelaId = `tabela-sinapi-${Date.now()}`;
        const nomeFinal = novoNomeVersao || `${tabelaOrigem.nome} (Reajuste Anual +${pct.toFixed(2)}%)`;
        const versaoFinal = novaVersao || '2026/12';

        // 1. Desativa tabela anterior
        await prisma.tabelaReferencia.update({
          where: { id: tabelaId },
          data: { ativa: false },
        });

        // 2. Cria nova tabela reajustada
        const novaTabela = await prisma.tabelaReferencia.create({
          data: {
            id: novaTabelaId,
            nome: nomeFinal,
            versao: versaoFinal,
            uf: tabelaOrigem.uf || 'RN',
            desonerado: tabelaOrigem.desonerado || false,
            bdiInsumos: tabelaOrigem.bdiInsumos || 15.27,
            bdiServicos: tabelaOrigem.bdiServicos || 23.86,
            bdiPercentual: tabelaOrigem.bdiServicos || 23.86,
            ativa: true,
          },
        });

        // 3. Clona todos os itens aplicando reajuste linear via SQL nativo ultra-rápido
        const copySql = `
          INSERT INTO itens_referencias (id, "tabelaId", codigo, descricao, "unidadeMedida", "precoUnitario", status, usos, "tipoItem")
          SELECT 
            gen_random_uuid()::text,
            '${novaTabelaId}',
            codigo,
            descricao,
            "unidadeMedida",
            ROUND(("precoUnitario" * ${fatorMultiplicador})::numeric, 2),
            status,
            0,
            COALESCE("tipoItem", 'SERVICO')
          FROM itens_referencias
          WHERE "tabelaId" = '${tabelaId}';
        `;

        const itensCopiados = await prisma.$executeRawUnsafe(copySql);

        return NextResponse.json({
          success: true,
          modo: 'CLONAR_VERSAO',
          tabelaCriada: novaTabela,
          itensReajustados: itensCopiados,
          mensagem: `Nova versão da tabela criada com sucesso! ${itensCopiados} itens foram reajustados linearmente em ${pct.toFixed(2)}% (Fator: ${fatorMultiplicador.toFixed(4)}). A tabela de referência original permanece intacta para fins de auditoria.`,
        });
      }

      // MODO 2: ATUALIZAR TABELA EXISTENTE EM LOTE
      if (modoReajuste === 'ATUALIZAR_DIRETO') {
        const updateSql = `
          UPDATE itens_referencias
          SET "precoUnitario" = ROUND(("precoUnitario" * ${fatorMultiplicador})::numeric, 2)
          WHERE "tabelaId" = '${tabelaId}';
        `;

        const afetados = await prisma.$executeRawUnsafe(updateSql);

        return NextResponse.json({
          success: true,
          modo: 'ATUALIZAR_DIRETO',
          itensReajustados: afetados,
          mensagem: `${afetados} itens da tabela foram atualizados linearmente com o índice acumulado de ${pct.toFixed(2)}%.`,
        });
      }
    }

    // 6. Carga de itens via JSON/CSV/XLSX (Bulk Upsert)
    if (acao === 'CARGA_ITENS') {
      if (!tabelaId || !Array.isArray(itens) || itens.length === 0) {
        return NextResponse.json({ error: 'Itens não informados para carga.' }, { status: 400 });
      }

      const validItems = itens
        .map((i: any) => {
          const cod = String(i.codigo || '').trim();
          const desc = String(i.descricao || '').trim();
          // Detectar automaticamente se é Insumo ou Serviço se não fornecido
          let tipo = i.tipoItem;
          if (!tipo) {
            // Em SINAPI: códigos puramente numéricos de insumo ou palavras como "MATERIAL", "TUBO", "CABO", "TINTA", "VALVULA"
            if (/assentamento|execu|aplica|instala|fornecimento e instala|alvenaria|concreto|pintura|demoli/i.test(desc)) {
              tipo = 'SERVICO';
            } else if (/parafuso|tubo|cabo|tinta|areia|cimento|bloco|eletroduto|disjuntor|interruptor|lampada|torneira/i.test(desc)) {
              tipo = 'INSUMO';
            } else {
              tipo = 'SERVICO';
            }
          }

          return {
            codigo: cod,
            descricao: desc,
            unidade: String(i.unidade || 'UN').trim(),
            valor: typeof i.valor === 'number' ? i.valor : parseFloat(String(i.valor || '0').replace(',', '.')),
            tipoItem: tipo,
          };
        })
        .filter((i) => i.codigo && !isNaN(i.valor) && i.valor >= 0);

      if (validItems.length === 0) {
        return NextResponse.json({ error: 'Nenhum item com código e preço válido no lote.' }, { status: 400 });
      }

      // Bulk upsert usando SQL nativo ultra-rápido com ON CONFLICT
      const valuesSql = validItems
        .map((it) => {
          const id = crypto.randomUUID();
          const desc = it.descricao.replace(/'/g, "''").slice(0, 500);
          const cod = it.codigo.replace(/'/g, "''").slice(0, 100);
          const un = it.unidade.replace(/'/g, "''").slice(0, 20);
          const tipo = it.tipoItem === 'INSUMO' ? 'INSUMO' : 'SERVICO';
          return `('${id}', '${tabelaId}', '${cod}', '${desc}', '${un}', ${it.valor}, 'HOMOLOGADO', 0, '${tipo}')`;
        })
        .join(', ');

      const sql = `
        INSERT INTO itens_referencias (id, "tabelaId", codigo, descricao, "unidadeMedida", "precoUnitario", status, usos, "tipoItem")
        VALUES ${valuesSql}
        ON CONFLICT ("tabelaId", codigo) DO UPDATE
        SET "precoUnitario" = EXCLUDED."precoUnitario",
            descricao = EXCLUDED.descricao,
            "unidadeMedida" = EXCLUDED."unidadeMedida",
            "tipoItem" = EXCLUDED."tipoItem",
            status = 'HOMOLOGADO';
      `;

      await prisma.$executeRawUnsafe(sql);

      return NextResponse.json({
        success: true,
        inseridos: validItems.length,
        mensagem: `${validItems.length} itens gravados/atualizados com sucesso.`,
      });
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao processar: ' + error.message }, { status: 500 });
  }
}

// Editar dados de Tabela ou Insumo
export async function PUT(req: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'FISCAL_TECNICO')) {
      return NextResponse.json({ error: 'Apenas Administrador ou Fiscal Técnico' }, { status: 403 });
    }

    const body = await req.json();
    const { tipo, id, nome, bdiPercentual, bdiInsumos, bdiServicos, codigo, descricao, unidadeMedida, precoUnitario, tipoItem, status, ativo } = body;

    if (!id) return NextResponse.json({ error: 'ID é obrigatório.' }, { status: 400 });

    if (tipo === 'ITEM') {
      const itemAtualizado = await prisma.itemReferencia.update({
        where: { id },
        data: {
          codigo: codigo ? codigo.trim() : undefined,
          descricao: descricao ? descricao.trim() : undefined,
          unidadeMedida: unidadeMedida ? unidadeMedida.trim() : undefined,
          precoUnitario: precoUnitario !== undefined ? parseFloat(precoUnitario) : undefined,
          tipoItem: tipoItem ? (tipoItem === 'INSUMO' ? 'INSUMO' : 'SERVICO') : undefined,
          status: status || undefined,
        },
      });
      return NextResponse.json({ success: true, item: itemAtualizado });
    }

    // Edição de Tabela
    const tabelaAtualizada = await prisma.tabelaReferencia.update({
      where: { id },
      data: {
        nome: nome ? nome.trim() : undefined,
        bdiInsumos: bdiInsumos !== undefined ? parseFloat(bdiInsumos) : undefined,
        bdiServicos: bdiServicos !== undefined ? parseFloat(bdiServicos) : undefined,
        bdiPercentual: bdiServicos !== undefined ? parseFloat(bdiServicos) : (bdiPercentual !== undefined ? parseFloat(bdiPercentual) : undefined),
        ativa: typeof ativo === 'boolean' ? ativo : undefined,
      },
    });

    return NextResponse.json({ success: true, tabela: tabelaAtualizada });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao atualizar: ' + error.message }, { status: 500 });
  }
}

// Excluir Tabela ou Insumo
export async function DELETE(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Apenas Administrador' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const tipo = searchParams.get('tipo');

    if (!id) return NextResponse.json({ error: 'ID é obrigatório.' }, { status: 400 });

    if (tipo === 'ITEM') {
      await prisma.itemReferencia.delete({ where: { id } });
      return NextResponse.json({ success: true, excluido: true });
    }

    // Exclusão de Tabela com cascata em seus itens
    await prisma.$transaction([
      prisma.itemReferencia.deleteMany({ where: { tabelaId: id } }),
      prisma.tabelaReferencia.delete({ where: { id } }),
    ]);

    return NextResponse.json({ success: true, excluido: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao excluir: ' + error.message }, { status: 500 });
  }
}
