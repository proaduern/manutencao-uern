import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/tabelas/buscar?q=...&tabelaId=...&limite=25
 * Endpoint ultra-rápido para busca e autocomplete de itens da tabela SINAPI / referencial oficial.
 * Suporta busca por código numérico ou múltiplas palavras sem distinção de acentos (unaccent).
 */
export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim();
    const tabelaId = searchParams.get('tabelaId') || undefined;
    const limite = Math.min(Math.max(parseInt(searchParams.get('limite') || '25', 10), 1), 50);

    if (!q || q.length < 2) {
      return NextResponse.json({ success: true, itens: [] });
    }

    // Se tabelaId não foi informada, buscar na tabela ativa
    let idTabela = tabelaId;
    if (!idTabela) {
      const tabelaAtiva = await prisma.tabelaReferencia.findFirst({
        where: { ativa: true },
        select: { id: true },
      });
      if (tabelaAtiva) {
        idTabela = tabelaAtiva.id;
      }
    }

    const palavras = q
      .split(/\s+/)
      .map((p) => p.trim().replace(/'/g, "''"))
      .filter((p) => p.length > 0);

    const safeQ = q.replace(/'/g, "''");

    const whereDesc = palavras
      .map((p) => `unaccent(i.descricao) ILIKE unaccent('%${p}%')`)
      .join(' AND ');

    const tabelaFilter = idTabela ? `AND i."tabelaId" = '${idTabela}'` : '';

    const sql = `
      SELECT 
        i.id,
        i.codigo,
        i.descricao,
        i."unidadeMedida",
        i."precoUnitario",
        i.status,
        i."tabelaId",
        t.nome AS "tabelaNome",
        t.versao AS "tabelaVersao",
        t."bdiPercentual" AS "tabelaBdi"
      FROM itens_referencias i
      JOIN tabelas_referencias t ON t.id = i."tabelaId"
      WHERE ((${whereDesc}) OR i.codigo ILIKE '%${safeQ}%') ${tabelaFilter}
      ORDER BY i.usos DESC, i.codigo ASC
      LIMIT ${limite};
    `;

    const rawItens: any[] = await prisma.$queryRawUnsafe(sql);

    const itens = rawItens.map((it) => ({
      id: it.id,
      codigo: it.codigo,
      descricao: it.descricao,
      unidadeMedida: it.unidadeMedida,
      precoUnitario: parseFloat(it.precoUnitario) || 0,
      status: it.status,
      tabela: {
        id: it.tabelaId,
        nome: it.tabelaNome,
        versao: it.tabelaVersao,
        bdiPercentual: it.tabelaBdi ? parseFloat(it.tabelaBdi) : null,
      },
    }));

    return NextResponse.json({
      success: true,
      total: itens.length,
      itens,
    });
  } catch (error: any) {
    console.error('Erro ao buscar itens da tabela de referência:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar itens: ' + error.message },
      { status: 500 }
    );
  }
}
