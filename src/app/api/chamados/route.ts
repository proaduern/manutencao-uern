import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { calcularPrazoLimite, calcularEstadoPrazo, validarAntecedenciaDataProgramada } from '@/lib/services/prazos';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const statusFiltro = searchParams.get('status');
    const unidadeFiltro = searchParams.get('unidade');
    const predioFiltro = searchParams.get('predio');
    const ordemFiltro = searchParams.get('ordem') || 'urgencia';
    const busca = searchParams.get('busca')?.toLowerCase().trim();

    // Filtros de visibilidade de acordo com o papel (RBAC)
    const where: any = {};

    if (session.role === 'DEMANDANTE') {
      if (session.unidadeId) {
        where.unidadeId = session.unidadeId;
      } else {
        where.abertoPorId = session.id;
      }
    } else if (session.role === 'FISCAL_SETORIAL') {
      const unidadesAutorizadas = await prisma.fiscalSetorialUnidade.findMany({
        where: { usuarioId: session.id },
        select: { unidadeId: true },
      });
      const ids = unidadesAutorizadas.map((u) => u.unidadeId);
      if (ids.length > 0) {
        where.unidadeId = { in: ids };
      } else if (session.unidadeId) {
        where.unidadeId = session.unidadeId;
      }
    } else if (session.role === 'EMPRESA') {
      // A empresa vê chamados em andamento (não concluídos nem recusados na fila ativa)
      if (predioFiltro && predioFiltro !== 'TODOS') {
        where.predioId = predioFiltro;
      }
    }

    if (statusFiltro && statusFiltro !== '' && statusFiltro !== 'TODOS') {
      where.status = statusFiltro;
    }

    if (unidadeFiltro && unidadeFiltro !== '' && unidadeFiltro !== 'TODAS') {
      where.unidadeId = unidadeFiltro;
    }

    if (busca) {
      where.OR = [
        { descricao: { contains: busca, mode: 'insensitive' } },
        { setorEspecifico: { contains: busca, mode: 'insensitive' } },
        { tipoServico: { nome: { contains: busca, mode: 'insensitive' } } },
        { unidade: { nome: { contains: busca, mode: 'insensitive' } } },
      ];
      const numBusca = parseInt(busca.replace(/\D/g, ''));
      if (!isNaN(numBusca)) {
        where.OR.push({ numero: numBusca });
      }
    }

    // Ordenação
    let orderBy: any = [{ nivelOrdem: 'asc' }, { prazoLimite: 'asc' }];
    if (ordemFiltro === 'prazo') {
      orderBy = [{ prazoLimite: 'asc' }];
    } else if (ordemFiltro === 'abertura') {
      orderBy = [{ abertoEm: 'desc' }];
    } else if (ordemFiltro === 'tipo') {
      orderBy = [{ tipoServico: { nome: 'asc' } }];
    }

    const chamados = await prisma.chamado.findMany({
      where,
      include: {
        unidade: { select: { id: true, nome: true, sigla: true, campus: true } },
        predio: { select: { id: true, nome: true, campus: true } },
        sublocal: { select: { id: true, nome: true } },
        tipoServico: { select: { id: true, nome: true, categoria: { select: { id: true, nome: true } } } },
        tipoAmbiente: { select: { id: true, nome: true } },
        fraseUrgencia: { select: { id: true, frase: true, nivelCodigo: true } },
        abertoPor: { select: { id: true, nome: true, email: true } },
        funcionario: { select: { id: true, nome: true, cargo: true } },
        fotos: { select: { id: true, tipo: true, url: true, rodada: true } },
      },
      orderBy,
    });

    // Formatar cada chamado com SLA dinâmico e flags do modelo legado
    const isDemandante = session.role === 'DEMANDANTE';

    const formatados = chamados.map((c) => {
      const prazo = calcularEstadoPrazo(c.prazoLimite, c.abertoEm, c.status);
      const temFotoAntes = c.fotos.some((f) => f.tipo === 'ANTES');
      const temFotoDepois = c.fotos.some((f) => f.tipo === 'DEPOIS');

      return {
        ...c,
        // O demandante nunca vê o nível de urgência nem o prazo derivado (Seção 5)
        nivelCodigo: isDemandante ? null : c.nivelCodigo,
        nivelOrdem: isDemandante ? null : c.nivelOrdem,
        prazoLimite: isDemandante ? null : c.prazoLimite,
        prazoTexto: isDemandante ? null : prazo.texto,
        prazoClasse: isDemandante ? 'neutro' : prazo.classe,
        temFotoAntes,
        temFotoDepois,
      };
    });

    return NextResponse.json({ chamados: formatados });
  } catch (error: any) {
    console.error('Erro ao listar chamados:', error);
    return NextResponse.json({ error: 'Erro ao buscar chamados' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const {
      unidadeId,
      predioId,
      sublocalId,
      tipoServicoId,
      tipoAmbienteId,
      setorEspecifico,
      descricao,
      fraseUrgenciaId,
      dataEsperada,
      fotoUrl,
      fotoSha256,
    } = body;

    // Validações obrigatórias fiéis ao modelo legado
    if (!tipoServicoId) return NextResponse.json({ error: 'Tipo de serviço é obrigatório.' }, { status: 400 });
    if (!tipoAmbienteId) return NextResponse.json({ error: 'Tipo de ambiente é obrigatório.' }, { status: 400 });
    if (!setorEspecifico || setorEspecifico.trim().length < 3) {
      return NextResponse.json({ error: 'Informe o local exato com pelo menos 3 caracteres.' }, { status: 400 });
    }
    if (!descricao || descricao.trim().length < 10) {
      return NextResponse.json({ error: 'Descreva o problema com pelo menos 10 caracteres.' }, { status: 400 });
    }
    if (!fraseUrgenciaId) return NextResponse.json({ error: 'Selecione o impacto no ambiente.' }, { status: 400 });
    if (!fotoUrl) return NextResponse.json({ error: 'A foto comprobatória do problema é obrigatória.' }, { status: 400 });

    const frase = await prisma.fraseUrgencia.findUnique({
      where: { id: parseInt(fraseUrgenciaId) },
    });
    if (!frase) return NextResponse.json({ error: 'Frase de urgência inválida.' }, { status: 400 });

    // Determinar Unidade e Prédio
    const finalUnidadeId = unidadeId || session.unidadeId;
    if (!finalUnidadeId) {
      return NextResponse.json({ error: 'Unidade demandante não identificada.' }, { status: 400 });
    }

    const unidade = await prisma.unidade.findUnique({
      where: { id: finalUnidadeId },
      include: {
        predio: true,
        prediosVinculados: { include: { predio: true } },
      },
    });

    let predioFinalId: string | null = predioId || null;
    if (!predioFinalId) {
      predioFinalId = unidade?.predioId || (unidade?.prediosVinculados && unidade.prediosVinculados.length > 0 ? unidade.prediosVinculados[0].predioId : null);
    }

    const predioEscolhido = predioFinalId
      ? await prisma.cidadePredio.findUnique({ where: { id: predioFinalId } })
      : unidade?.predio;
    const campusEfetivo = predioEscolhido?.campus || unidade?.campus || 'MOSSORÓ';

    if (frase.exigeData || frase.nivelCodigo === 'PROGRAMADO') {
      if (!dataEsperada) {
        return NextResponse.json({ error: 'Esta situação de impacto exige informar a data esperada para o serviço.' }, { status: 400 });
      }

      // Validação normativa: data esperada deve ser >= 3 dias úteis após a abertura
      const validacaoData = await validarAntecedenciaDataProgramada(
        dataEsperada,
        new Date(),
        campusEfetivo
      );

      if (!validacaoData.valido) {
        return NextResponse.json({ error: validacaoData.mensagemErro }, { status: 400 });
      }
    }

    // Verificar se a foto já foi usada em outro chamado (prevenção de fotos falsas/duplicadas)
    if (fotoSha256) {
      const fotoExistente = await prisma.chamadoFoto.findFirst({
        where: { sha256: fotoSha256 },
      });
      if (fotoExistente) {
        return NextResponse.json(
          { error: 'Esta mesma foto já foi enviada em outro chamado. Tire uma foto nova do local.' },
          { status: 400 }
        );
      }
    }

    const abertoEm = new Date();
    const dataLimite = await calcularPrazoLimite(
      frase.nivelCodigo,
      abertoEm,
      dataEsperada ? new Date(dataEsperada) : null,
      frase.id,
      campusEfetivo
    );

    // Buscar a empresa contratada ativa do contrato vigente
    const contratoAtivo = await prisma.contrato.findFirst({
      where: { ativo: true },
      select: { empresaId: true },
    });

    // Inserção no banco com transação garantindo chamado, foto e timeline
    const chamadoCriado = await prisma.$transaction(async (tx) => {
      const c = await tx.chamado.create({
        data: {
          unidadeId: finalUnidadeId,
          predioId: predioFinalId,
          sublocalId: sublocalId || null,
          tipoServicoId: parseInt(tipoServicoId),
          tipoAmbienteId: parseInt(tipoAmbienteId),
          fraseUrgenciaId: frase.id,
          setorEspecifico: setorEspecifico.trim(),
          descricao: descricao.trim(),
          nivelCodigo: frase.nivelCodigo,
          nivelOrdem: frase.nivelSugerido,
          status: 'ABERTO',
          abertoPorId: session.id,
          empresaId: contratoAtivo?.empresaId || null,
          abertoEm,
          dataEsperada: dataEsperada ? new Date(dataEsperada) : null,
          prazoLimite: dataLimite,
        },
      });

      // Foto do antes
      await tx.chamadoFoto.create({
        data: {
          chamadoId: c.id,
          tipo: 'ANTES',
          url: fotoUrl,
          sha256: fotoSha256 || null,
          rodada: 1,
        },
      });

      // Evento inicial na timeline
      await tx.chamadoTimeline.create({
        data: {
          chamadoId: c.id,
          statusNovo: 'ABERTO',
          responsavel: session.nome,
          usuarioId: session.id,
          papel: session.role,
          observacao: `Abertura de chamado de urgência ${frase.nivelCodigo}. Foto registrada.`,
        },
      });

      return c;
    });

    return NextResponse.json({
      success: true,
      chamado: chamadoCriado,
      mensagem: `Chamado nº ${chamadoCriado.numero} aberto com sucesso!`,
    });
  } catch (error: any) {
    console.error('Erro ao abrir chamado:', error);
    return NextResponse.json({ error: 'Erro interno ao criar chamado: ' + error.message }, { status: 500 });
  }
}
