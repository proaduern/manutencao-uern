import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'FISCAL_TECNICO' && session.role !== 'GESTOR_CONTRATO')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const [categorias, tiposServico, ambientes, frases, niveis] = await Promise.all([
      prisma.categoriaServico.findMany({
        include: {
          _count: { select: { tipos: true } },
        },
        orderBy: { nome: 'asc' },
      }),
      prisma.tipoServico.findMany({
        include: {
          categoria: { select: { id: true, nome: true } },
          _count: { select: { chamados: true } },
        },
        orderBy: { nome: 'asc' },
      }),
      prisma.tipoAmbiente.findMany({
        include: {
          _count: { select: { chamados: true } },
        },
        orderBy: { nome: 'asc' },
      }),
      prisma.fraseUrgencia.findMany({
        include: {
          _count: { select: { chamados: true } },
        },
        orderBy: [{ nivelSugerido: 'asc' }, { ordemExibicao: 'asc' }],
      }),
      prisma.nivelUrgencia.findMany({
        orderBy: { ordem: 'asc' },
      }),
    ]);

    // Contagem de chamados e frases agrupados por nivelCodigo para enriquecer os níveis
    const [chamadosPorNivel, frasesPorNivel] = await Promise.all([
      prisma.chamado.groupBy({
        by: ['nivelCodigo'],
        _count: { id: true },
      }),
      prisma.fraseUrgencia.groupBy({
        by: ['nivelCodigo'],
        _count: { id: true },
      }),
    ]);

    const mapaChamados: Record<string, number> = {};
    chamadosPorNivel.forEach((item) => {
      mapaChamados[item.nivelCodigo] = item._count.id;
    });

    const mapaFrases: Record<string, number> = {};
    frasesPorNivel.forEach((item) => {
      mapaFrases[item.nivelCodigo] = item._count.id;
    });

    const niveisEnriquecidos = niveis.map((n) => ({
      ...n,
      _count: {
        chamados: mapaChamados[n.codigo] || 0,
        frases: mapaFrases[n.codigo] || 0,
      },
    }));

    return NextResponse.json({ categorias, tiposServico, ambientes, frases, niveis: niveisEnriquecidos });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao carregar catálogo: ' + error.message }, { status: 500 });
  }
}

// Criar itens no catálogo
export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Apenas Administrador pode gerenciar o catálogo' }, { status: 403 });
    }

    const body = await req.json();
    const { entidade } = body;

    // 1. Categoria de Serviço
    if (entidade === 'CATEGORIA') {
      const { nome, descricao, icone } = body;
      if (!nome || nome.trim().length < 2) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 });

      const cat = await prisma.categoriaServico.create({
        data: {
          nome: nome.trim(),
          descricao: descricao ? descricao.trim() : null,
          icone: icone ? icone.trim() : 'Wrench',
          ativo: true,
        },
      });
      return NextResponse.json({ success: true, item: cat }, { status: 201 });
    }

    // 2. Tipo de Serviço
    if (entidade === 'TIPO_SERVICO') {
      const { categoriaId, nome, descricao, prazoEstimadoHoras } = body;
      if (!categoriaId || !nome) return NextResponse.json({ error: 'Categoria e Nome são obrigatórios' }, { status: 400 });

      const tipo = await prisma.tipoServico.create({
        data: {
          categoriaId: parseInt(categoriaId),
          nome: nome.trim(),
          descricao: descricao ? descricao.trim() : null,
          prazoEstimadoHoras: prazoEstimadoHoras ? parseInt(prazoEstimadoHoras) : 72,
          ativo: true,
        },
      });
      return NextResponse.json({ success: true, item: tipo }, { status: 201 });
    }

    // 3. Tipo de Ambiente
    if (entidade === 'AMBIENTE') {
      const { nome, descricao } = body;
      if (!nome || nome.trim().length < 2) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 });

      const amb = await prisma.tipoAmbiente.create({
        data: {
          nome: nome.trim(),
          descricao: descricao ? descricao.trim() : null,
          ativo: true,
        },
      });
      return NextResponse.json({ success: true, item: amb }, { status: 201 });
    }

    // 4. Frase de Urgência & Impacto no Ambiente com Prazo Associado
    if (entidade === 'FRASE_URGENCIA') {
      const { frase, nivelCodigo, nivelSugerido, prazoHorasCorridas, prazoDiasUteis, exigeData, ordemExibicao } = body;
      if (!frase || frase.trim().length < 5) return NextResponse.json({ error: 'A frase de impacto deve ter ao menos 5 caracteres' }, { status: 400 });

      const f = await prisma.fraseUrgencia.create({
        data: {
          frase: frase.trim(),
          nivelCodigo: nivelCodigo || 'NORMAL',
          nivelSugerido: nivelSugerido ? parseInt(nivelSugerido) : 3,
          prazoHorasCorridas: prazoHorasCorridas ? parseInt(prazoHorasCorridas) : null,
          prazoDiasUteis: prazoDiasUteis ? parseInt(prazoDiasUteis) : null,
          exigeData: Boolean(exigeData),
          ordemExibicao: ordemExibicao ? parseInt(ordemExibicao) : 1,
          ativo: true,
        },
      });
      return NextResponse.json({ success: true, item: f }, { status: 201 });
    }

    // 5. Nível de Urgência & Prazos SLA
    if (entidade === 'NIVEL_URGENCIA') {
      const { codigo, nome, ordem, prazoHorasCorridas, prazoDiasUteis, usaDataEsperada, selecionavelPorFrase } = body;
      if (!codigo || codigo.trim().length < 2) {
        return NextResponse.json({ error: 'O código identificador do nível de urgência é obrigatório (mínimo 2 letras).' }, { status: 400 });
      }
      if (!nome || nome.trim().length < 2) {
        return NextResponse.json({ error: 'O nome descritivo do nível de urgência é obrigatório.' }, { status: 400 });
      }

      const codigoFormatado = codigo.trim().toUpperCase().replace(/\s+/g, '_');

      // Verificar duplicidade
      const jaExiste = await prisma.nivelUrgencia.findUnique({
        where: { codigo: codigoFormatado },
      });
      if (jaExiste) {
        return NextResponse.json({ error: `Já existe um nível de urgência cadastrado com o código "${codigoFormatado}".` }, { status: 400 });
      }

      const novoNivel = await prisma.nivelUrgencia.create({
        data: {
          codigo: codigoFormatado,
          nome: nome.trim(),
          ordem: ordem ? parseInt(ordem) : 1,
          prazoHorasCorridas: prazoHorasCorridas ? parseInt(prazoHorasCorridas) : null,
          prazoDiasUteis: prazoDiasUteis ? parseInt(prazoDiasUteis) : null,
          usaDataEsperada: Boolean(usaDataEsperada),
          selecionavelPorFrase: selecionavelPorFrase !== undefined ? Boolean(selecionavelPorFrase) : true,
        },
      });

      return NextResponse.json({ success: true, item: novoNivel }, { status: 201 });
    }

    return NextResponse.json({ error: 'Entidade não reconhecida' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao cadastrar no catálogo: ' + error.message }, { status: 500 });
  }
}

// Editar itens no catálogo
export async function PUT(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Apenas Administrador pode gerenciar o catálogo' }, { status: 403 });
    }

    const body = await req.json();
    const { entidade, id } = body;
    if (!entidade || !id) return NextResponse.json({ error: 'Entidade e ID obrigatórios' }, { status: 400 });

    const numId = parseInt(id);

    // 1. Categoria
    if (entidade === 'CATEGORIA') {
      const { nome, descricao, icone, ativo } = body;
      const cat = await prisma.categoriaServico.update({
        where: { id: numId },
        data: {
          nome: nome ? nome.trim() : undefined,
          descricao: descricao !== undefined ? descricao?.trim() : undefined,
          icone: icone !== undefined ? icone?.trim() : undefined,
          ativo: ativo !== undefined ? Boolean(ativo) : undefined,
        },
      });
      return NextResponse.json({ success: true, item: cat });
    }

    // 2. Tipo de Serviço
    if (entidade === 'TIPO_SERVICO') {
      const { categoriaId, nome, descricao, prazoEstimadoHoras, ativo } = body;
      const tipo = await prisma.tipoServico.update({
        where: { id: numId },
        data: {
          categoriaId: categoriaId ? parseInt(categoriaId) : undefined,
          nome: nome ? nome.trim() : undefined,
          descricao: descricao !== undefined ? descricao?.trim() : undefined,
          prazoEstimadoHoras: prazoEstimadoHoras ? parseInt(prazoEstimadoHoras) : undefined,
          ativo: ativo !== undefined ? Boolean(ativo) : undefined,
        },
      });
      return NextResponse.json({ success: true, item: tipo });
    }

    // 3. Tipo de Ambiente
    if (entidade === 'AMBIENTE') {
      const { nome, descricao, ativo } = body;
      const amb = await prisma.tipoAmbiente.update({
        where: { id: numId },
        data: {
          nome: nome ? nome.trim() : undefined,
          descricao: descricao !== undefined ? descricao?.trim() : undefined,
          ativo: ativo !== undefined ? Boolean(ativo) : undefined,
        },
      });
      return NextResponse.json({ success: true, item: amb });
    }

    // 4. Frase de Urgência & Impacto
    if (entidade === 'FRASE_URGENCIA') {
      const { frase, nivelCodigo, nivelSugerido, prazoHorasCorridas, prazoDiasUteis, exigeData, ordemExibicao, ativo } = body;
      const f = await prisma.fraseUrgencia.update({
        where: { id: numId },
        data: {
          frase: frase ? frase.trim() : undefined,
          nivelCodigo: nivelCodigo !== undefined ? nivelCodigo : undefined,
          nivelSugerido: nivelSugerido !== undefined ? parseInt(nivelSugerido) : undefined,
          prazoHorasCorridas: prazoHorasCorridas !== undefined ? (prazoHorasCorridas ? parseInt(prazoHorasCorridas) : null) : undefined,
          prazoDiasUteis: prazoDiasUteis !== undefined ? (prazoDiasUteis ? parseInt(prazoDiasUteis) : null) : undefined,
          exigeData: exigeData !== undefined ? Boolean(exigeData) : undefined,
          ordemExibicao: ordemExibicao !== undefined ? parseInt(ordemExibicao) : undefined,
          ativo: ativo !== undefined ? Boolean(ativo) : undefined,
        },
      });
      return NextResponse.json({ success: true, item: f });
    }

    // 5. Nível de Urgência & Prazos SLA
    if (entidade === 'NIVEL_URGENCIA') {
      const { codigo, nome, ordem, prazoHorasCorridas, prazoDiasUteis, usaDataEsperada, selecionavelPorFrase } = body;

      const nivelAtual = await prisma.nivelUrgencia.findUnique({
        where: { id: numId },
      });
      if (!nivelAtual) {
        return NextResponse.json({ error: 'Nível de urgência não encontrado.' }, { status: 404 });
      }

      let novoCodigo = nivelAtual.codigo;
      if (codigo && codigo.trim().length >= 2) {
        novoCodigo = codigo.trim().toUpperCase().replace(/\s+/g, '_');
        if (novoCodigo !== nivelAtual.codigo) {
          const jaExiste = await prisma.nivelUrgencia.findUnique({
            where: { codigo: novoCodigo },
          });
          if (jaExiste && jaExiste.id !== numId) {
            return NextResponse.json({ error: `Já existe outro nível cadastrado com o código "${novoCodigo}".` }, { status: 400 });
          }
        }
      }

      const nivelAtualizado = await prisma.$transaction(async (tx) => {
        // Se o código mudou, atualiza em cascata nos chamados e frases para manter a integridade
        if (novoCodigo !== nivelAtual.codigo) {
          await tx.fraseUrgencia.updateMany({
            where: { nivelCodigo: nivelAtual.codigo },
            data: { nivelCodigo: novoCodigo },
          });
          await tx.chamado.updateMany({
            where: { nivelCodigo: nivelAtual.codigo },
            data: { nivelCodigo: novoCodigo },
          });
        }

        return tx.nivelUrgencia.update({
          where: { id: numId },
          data: {
            codigo: novoCodigo,
            nome: nome ? nome.trim() : undefined,
            ordem: ordem !== undefined ? parseInt(ordem) : undefined,
            prazoHorasCorridas: prazoHorasCorridas !== undefined ? (prazoHorasCorridas ? parseInt(prazoHorasCorridas) : null) : undefined,
            prazoDiasUteis: prazoDiasUteis !== undefined ? (prazoDiasUteis ? parseInt(prazoDiasUteis) : null) : undefined,
            usaDataEsperada: usaDataEsperada !== undefined ? Boolean(usaDataEsperada) : undefined,
            selecionavelPorFrase: selecionavelPorFrase !== undefined ? Boolean(selecionavelPorFrase) : undefined,
          },
        });
      }, { maxWait: 15000, timeout: 30000 });

      return NextResponse.json({ success: true, item: nivelAtualizado });
    }

    return NextResponse.json({ error: 'Entidade inválida' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao atualizar catálogo: ' + error.message }, { status: 500 });
  }
}

// Excluir itens do catálogo
export async function DELETE(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Apenas Administrador pode gerenciar o catálogo' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const entidade = searchParams.get('entidade');
    const idStr = searchParams.get('id');

    if (!entidade || !idStr) return NextResponse.json({ error: 'Entidade e ID obrigatórios' }, { status: 400 });
    const id = parseInt(idStr);

    if (entidade === 'CATEGORIA') {
      const tiposCount = await prisma.tipoServico.count({ where: { categoriaId: id } });
      if (tiposCount > 0) {
        await prisma.categoriaServico.update({ where: { id }, data: { ativo: false } });
        return NextResponse.json({ success: true, inativado: true, mensagem: 'Categoria inativada devido a tipos vinculados.' });
      }
      await prisma.categoriaServico.delete({ where: { id } });
      return NextResponse.json({ success: true, excluido: true });
    }

    if (entidade === 'TIPO_SERVICO') {
      const chamadosCount = await prisma.chamado.count({ where: { tipoServicoId: id } });
      if (chamadosCount > 0) {
        await prisma.tipoServico.update({ where: { id }, data: { ativo: false } });
        return NextResponse.json({ success: true, inativado: true, mensagem: 'Tipo inativado devido a chamados históricos.' });
      }
      await prisma.tipoServico.delete({ where: { id } });
      return NextResponse.json({ success: true, excluido: true });
    }

    if (entidade === 'AMBIENTE') {
      const chamadosCount = await prisma.chamado.count({ where: { tipoAmbienteId: id } });
      if (chamadosCount > 0) {
        await prisma.tipoAmbiente.update({ where: { id }, data: { ativo: false } });
        return NextResponse.json({ success: true, inativado: true, mensagem: 'Ambiente inativado devido a chamados históricos.' });
      }
      await prisma.tipoAmbiente.delete({ where: { id } });
      return NextResponse.json({ success: true, excluido: true });
    }

    if (entidade === 'FRASE_URGENCIA') {
      const chamadosCount = await prisma.chamado.count({ where: { fraseUrgenciaId: id } });
      if (chamadosCount > 0) {
        await prisma.fraseUrgencia.update({ where: { id }, data: { ativo: false } });
        return NextResponse.json({ success: true, inativado: true, mensagem: 'Frase inativada devido a chamados históricos.' });
      }
      await prisma.fraseUrgencia.delete({ where: { id } });
      return NextResponse.json({ success: true, excluido: true });
    }

    if (entidade === 'NIVEL_URGENCIA') {
      const nivel = await prisma.nivelUrgencia.findUnique({ where: { id } });
      if (!nivel) return NextResponse.json({ error: 'Nível de urgência não encontrado.' }, { status: 404 });

      const chamadosCount = await prisma.chamado.count({ where: { nivelCodigo: nivel.codigo } });
      if (chamadosCount > 0) {
        return NextResponse.json(
          { error: `Não é possível excluir o nível "${nivel.nome}" (${nivel.codigo}) porque existem ${chamadosCount} chamados históricos com este nível.` },
          { status: 400 }
        );
      }

      const frasesCount = await prisma.fraseUrgencia.count({ where: { nivelCodigo: nivel.codigo } });
      if (frasesCount > 0) {
        return NextResponse.json(
          { error: `Não é possível excluir o nível "${nivel.nome}" (${nivel.codigo}) porque existem ${frasesCount} frases de impacto associadas a ele. Reatribua as frases para outro nível antes de excluir.` },
          { status: 400 }
        );
      }

      await prisma.nivelUrgencia.delete({ where: { id } });
      return NextResponse.json({ success: true, excluido: true });
    }

    return NextResponse.json({ error: 'Entidade inválida' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao excluir do catálogo: ' + error.message }, { status: 500 });
  }
}
