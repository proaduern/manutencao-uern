import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const agora = new Date();
    const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);

    const deStr = searchParams.get('de') || inicioMes.toISOString().slice(0, 10);
    const ateStr = searchParams.get('ate') || agora.toISOString().slice(0, 10);
    const agruparPor = searchParams.get('por') || 'unidade';
    const ratingPor = searchParams.get('rating') || 'geral';

    const de = new Date(deStr + 'T00:00:00Z');
    const ate = new Date(ateStr + 'T23:59:59Z');

    // 1. Buscar todos os chamados abertos no período
    const chamados = await prisma.chamado.findMany({
      where: {
        abertoEm: { gte: de, lte: ate },
      },
      include: {
        unidade: true,
        predio: true,
        tipoServico: { include: { categoria: true } },
        funcionario: true,
      },
    });

    // 2. Indicadores Consolidados
    const totalChamados = chamados.length;
    let somaPrevisto = 0;
    let somaExecutado = 0;
    let somaHoras = 0;
    let totalEmergencias = 0;
    let chamadosComSla = 0;
    let chamadosNoPrazo = 0;
    let chamadosRetrabalho = 0;

    const notasReais: number[] = [];
    const notasTacitas: number[] = [];

    for (const c of chamados) {
      const prev = c.totalPrevisto ? parseFloat(c.totalPrevisto.toString()) : c.valorOrcado ? parseFloat(c.valorOrcado.toString()) : 0;
      const exec = c.totalExecutado ? parseFloat(c.totalExecutado.toString()) : 0;
      somaPrevisto += prev;
      somaExecutado += exec;

      if (c.tempoExecucaoHoras) {
        somaHoras += parseFloat(c.tempoExecucaoHoras.toString());
      }
      if (c.nivelCodigo === 'EMERGENCIA' || c.execucaoEmergencial) {
        totalEmergencias++;
      }
      if (c.retrabalho) {
        chamadosRetrabalho++;
      }

      // SLA cumprido
      if (c.atendidoEm && c.prazoLimite) {
        chamadosComSla++;
        if (new Date(c.atendidoEm).getTime() <= new Date(c.prazoLimite).getTime()) {
          chamadosNoPrazo++;
        }
      }

      // Satisfação
      if (c.avaliacaoNota) {
        if (!c.avaliacaoTacita) {
          notasReais.push(c.avaliacaoNota);
        }
        notasTacitas.push(c.avaliacaoNota);
      }
    }

    const slaPct = chamadosComSla > 0 ? Math.round((chamadosNoPrazo / chamadosComSla) * 100) : 100;
    const retrabalhoPct = totalChamados > 0 ? Math.round((chamadosRetrabalho / totalChamados) * 100) : 0;
    const divergencia = somaExecutado - somaPrevisto;

    const mediaReal = notasReais.length > 0 ? (notasReais.reduce((a, b) => a + b, 0) / notasReais.length).toFixed(2) : null;
    const mediaTacita = notasTacitas.length > 0 ? (notasTacitas.reduce((a, b) => a + b, 0) / notasTacitas.length).toFixed(2) : null;

    // 3. Tabela Agrupada
    const grupos: Record<string, { nome: string; chamados: number; previsto: number; executado: number; slaBase: number; slaOk: number; retrabalho: number; notas: number[] }> = {};

    for (const c of chamados) {
      let chave = 'Geral';
      if (agruparPor === 'unidade') chave = c.unidade.nome;
      else if (agruparPor === 'predio') chave = c.predio?.nome || 'Sem prédio';
      else if (agruparPor === 'categoria') chave = c.tipoServico.categoria.nome;
      else if (agruparPor === 'funcionario') chave = c.funcionario?.nome || 'Não atribuído';
      else if (agruparPor === 'nivel') chave = c.nivelCodigo;
      else if (agruparPor === 'status') chave = c.status;

      if (!grupos[chave]) {
        grupos[chave] = { nome: chave, chamados: 0, previsto: 0, executado: 0, slaBase: 0, slaOk: 0, retrabalho: 0, notas: [] };
      }

      const g = grupos[chave];
      g.chamados++;
      g.previsto += c.totalPrevisto ? parseFloat(c.totalPrevisto.toString()) : 0;
      g.executado += c.totalExecutado ? parseFloat(c.totalExecutado.toString()) : 0;
      if (c.retrabalho) g.retrabalho++;
      if (c.atendidoEm && c.prazoLimite) {
        g.slaBase++;
        if (new Date(c.atendidoEm).getTime() <= new Date(c.prazoLimite).getTime()) g.slaOk++;
      }
      if (c.avaliacaoNota && !c.avaliacaoTacita) {
        g.notas.push(c.avaliacaoNota);
      }
    }

    const tabelaAgrupada = Object.values(grupos).map((g) => ({
      grupo: g.nome,
      chamados: g.chamados,
      previsto: g.previsto,
      executado: g.executado,
      slaPct: g.slaBase > 0 ? `${Math.round((g.slaOk / g.slaBase) * 100)}%` : '—',
      retrabalho: g.retrabalho,
      notaMedia: g.notas.length > 0 ? (g.notas.reduce((a, b) => a + b, 0) / g.notas.length).toFixed(2) : '—',
      avaliacoes: g.notas.length,
    }));

    // 4. Rating por grupo (com filtro de amostra mínima < 5 avaliações)
    const ratingMap: Record<string, { nome: string; notasReais: number[]; notasComTacita: number[] }> = {};

    for (const c of chamados) {
      let chave = 'Geral';
      if (ratingPor === 'categoria') chave = c.tipoServico.categoria.nome;
      else if (ratingPor === 'funcionario') chave = c.funcionario?.nome || 'Não atribuído';

      if (!ratingMap[chave]) {
        ratingMap[chave] = { nome: chave, notasReais: [], notasComTacita: [] };
      }

      if (c.avaliacaoNota) {
        if (!c.avaliacaoTacita) ratingMap[chave].notasReais.push(c.avaliacaoNota);
        ratingMap[chave].notasComTacita.push(c.avaliacaoNota);
      }
    }

    const tabelaRating = Object.values(ratingMap).map((r) => {
      const nReal = r.notasReais.length;
      const media = nReal > 0 ? (r.notasReais.reduce((a, b) => a + b, 0) / nReal).toFixed(2) : null;
      const nTotal = r.notasComTacita.length;
      const mediaComTacita = nTotal > 0 ? (r.notasComTacita.reduce((a, b) => a + b, 0) / nTotal).toFixed(2) : null;

      return {
        grupo: r.nome,
        nota: media,
        avaliacoes: nReal,
        amostraSuficiente: nReal >= 5,
        notaComTacita: mediaComTacita,
        avaliacoesComTacita: nTotal,
      };
    });

    // 5. Parecer de Renovação (Janela móvel de 12 meses)
    const dozeMesesAtras = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const chamados12m = await prisma.chamado.findMany({
      where: {
        abertoEm: { gte: dozeMesesAtras },
        avaliacaoNota: { not: null },
        avaliacaoTacita: false,
      },
      select: { avaliacaoNota: true },
    });

    const notas12m = chamados12m.map((c) => c.avaliacaoNota as number);
    const media12m = notas12m.length > 0 ? notas12m.reduce((a, b) => a + b, 0) / notas12m.length : null;

    let veredito = 'AMOSTRA INSUFICIENTE';
    let vereditoClasse = 'neutro';
    const minimoExigido = 3.5;

    if (notas12m.length >= 5 && media12m !== null) {
      if (media12m >= minimoExigido) {
        veredito = 'SEM RESSALVA';
        vereditoClasse = 'bom';
      } else {
        veredito = 'SUGERE NÃO RENOVAÇÃO';
        vereditoClasse = 'grave';
      }
    }

    const parecerRenovacao = {
      desde: dozeMesesAtras.toISOString().slice(0, 10),
      veredito,
      vereditoClasse,
      notaMedia: media12m ? media12m.toFixed(2) : null,
      avaliacoes: notas12m.length,
      minimoExigido,
      limite: minimoExigido,
    };

    return NextResponse.json({
      periodo: { de: deStr, ate: ateStr },
      indicadores: {
        totalChamados,
        somaPrevisto,
        somaExecutado,
        divergencia,
        slaPct,
        retrabalhoPct,
        somaHoras,
        totalEmergencias,
        mediaReal,
        nReal: notasReais.length,
        mediaTacita,
        nTacita: notasTacitas.length,
      },
      tabelaAgrupada,
      tabelaRating,
      parecerRenovacao,
    });
  } catch (error: any) {
    console.error('Erro ao gerar relatório:', error);
    return NextResponse.json({ error: 'Erro ao gerar relatórios: ' + error.message }, { status: 500 });
  }
}
