import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'FISCAL_TECNICO')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const [tabelas, itens] = await Promise.all([
      prisma.tabelaReferencia.findMany({
        include: {
          _count: { select: { itens: true } },
        },
        orderBy: { id: 'asc' },
      }),
      prisma.itemReferencia.findMany({
        take: 500,
        orderBy: { codigo: 'asc' },
        include: { tabela: { select: { id: true, nome: true } } },
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
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Apenas Administrador' }, { status: 403 });
    }

    const body = await req.json();
    const { acao, tabelaId, itens, bdiPercentual, itemId, justificativa, nome, codigo, descricao, unidadeMedida, precoUnitario } = body;

    // 1. Criar Nova Tabela de Referência
    if (acao === 'CRIAR_TABELA') {
      if (!nome || nome.trim().length < 2) {
        return NextResponse.json({ error: 'Nome da tabela é obrigatório.' }, { status: 400 });
      }

      const novaTabela = await prisma.tabelaReferencia.create({
        data: {
          nome: nome.trim(),
          bdiPercentual: bdiPercentual ? parseFloat(bdiPercentual) : 25.0,
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
          status: 'HOMOLOGADO',
        },
      });
      return NextResponse.json({ success: true, item }, { status: 201 });
    }

    // 3. Atualizar BDI
    if (acao === 'SALVAR_BDI') {
      const atualizada = await prisma.tabelaReferencia.update({
        where: { id: tabelaId },
        data: {
          bdiPercentual: bdiPercentual ? parseFloat(bdiPercentual) : null,
        },
      });
      return NextResponse.json({ success: true, tabela: atualizada });
    }

    // 4. Reverter homologação
    if (acao === 'REVERTER_ITEM') {
      if (!justificativa || justificativa.trim().length < 15) {
        return NextResponse.json({ error: 'A reversão exige justificativa com pelo menos 15 caracteres.' }, { status: 400 });
      }

      const item = await prisma.itemReferencia.update({
        where: { id: itemId },
        data: {
          status: 'PENDENTE_HOMOLOGACAO',
          justificativaReversao: justificativa.trim(),
        },
      });
      return NextResponse.json({ success: true, item });
    }

    // 5. Carga de itens via JSON/CSV/XLSX (Bulk Upsert de alta performance)
    if (acao === 'CARGA_ITENS') {
      if (!tabelaId || !Array.isArray(itens) || itens.length === 0) {
        return NextResponse.json({ error: 'Itens não informados para carga.' }, { status: 400 });
      }

      const validItems = itens
        .map((i: any) => ({
          codigo: String(i.codigo || '').trim(),
          descricao: String(i.descricao || '').trim(),
          unidade: String(i.unidade || 'UN').trim(),
          valor: typeof i.valor === 'number' ? i.valor : parseFloat(String(i.valor || '0').replace(',', '.')),
        }))
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
          return `('${id}', '${tabelaId}', '${cod}', '${desc}', '${un}', ${it.valor}, 'HOMOLOGADO', 0)`;
        })
        .join(', ');

      const sql = `
        INSERT INTO itens_referencias (id, "tabelaId", codigo, descricao, "unidadeMedida", "precoUnitario", status, usos)
        VALUES ${valuesSql}
        ON CONFLICT ("tabelaId", codigo) DO UPDATE
        SET "precoUnitario" = EXCLUDED."precoUnitario",
            descricao = EXCLUDED.descricao,
            "unidadeMedida" = EXCLUDED."unidadeMedida",
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
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Apenas Administrador' }, { status: 403 });
    }

    const body = await req.json();
    const { tipo, id, nome, bdiPercentual, codigo, descricao, unidadeMedida, precoUnitario, status, ativo } = body;

    if (!id) return NextResponse.json({ error: 'ID é obrigatório.' }, { status: 400 });

    if (tipo === 'ITEM') {
      const itemAtualizado = await prisma.itemReferencia.update({
        where: { id },
        data: {
          codigo: codigo ? codigo.trim() : undefined,
          descricao: descricao ? descricao.trim() : undefined,
          unidadeMedida: unidadeMedida ? unidadeMedida.trim() : undefined,
          precoUnitario: precoUnitario !== undefined ? parseFloat(precoUnitario) : undefined,
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
        bdiPercentual: bdiPercentual !== undefined ? parseFloat(bdiPercentual) : undefined,
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
