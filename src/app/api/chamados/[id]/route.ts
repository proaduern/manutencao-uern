import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { calcularEstadoPrazo } from '@/lib/services/prazos';
import { verificarAlcadaOrcamentaria } from '@/lib/services/alcada';
import { verificarSaldoParaOrcamento } from '@/lib/services/contrato';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: { id: string };
}

export async function GET(req: Request, { params }: RouteContext) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const chamado = await prisma.chamado.findUnique({
      where: { id: params.id },
      include: {
        unidade: true,
        predio: true,
        sublocal: true,
        tipoServico: { include: { categoria: true } },
        tipoAmbiente: true,
        fraseUrgencia: true,
        abertoPor: { select: { id: true, nome: true, email: true, matricula: true } },
        empresa: true,
        funcionario: true,
        fotos: { orderBy: { criadoEm: 'asc' } },
        insumos: { orderBy: { id: 'asc' } },
        autorizacoes: { include: { usuario: { select: { nome: true, role: true } } }, orderBy: { dataDecisao: 'desc' } },
        timeline: { orderBy: { criadoEm: 'asc' } },
      },
    });

    if (!chamado) {
      return NextResponse.json({ error: 'Chamado não encontrado' }, { status: 404 });
    }

    const isDemandante = session.role === 'DEMANDANTE';
    const prazo = calcularEstadoPrazo(chamado.prazoLimite, chamado.abertoEm, chamado.status);

    return NextResponse.json({
      chamado: {
        ...chamado,
        // O demandante nunca vê o nível de urgência nem o prazo derivado (Seção 5)
        nivelCodigo: isDemandante ? null : chamado.nivelCodigo,
        nivelOrdem: isDemandante ? null : chamado.nivelOrdem,
        prazoLimite: isDemandante ? null : chamado.prazoLimite,
        prazoTexto: isDemandante ? null : prazo.texto,
        prazoClasse: isDemandante ? 'neutro' : prazo.classe,
      },
    });
  } catch (error: any) {
    console.error('Erro ao buscar chamado:', error);
    return NextResponse.json({ error: 'Erro ao carregar chamado' }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: RouteContext) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const chamado = await prisma.chamado.findUnique({
      where: { id: params.id },
      include: { tipoServico: true, fotos: true },
    });

    if (!chamado) {
      return NextResponse.json({ error: 'Chamado não encontrado' }, { status: 404 });
    }

    const body = await req.json();
    const { acao } = body;

    // =========================================================================
    // 1. EMPRESA: Receber chamado na fila
    // =========================================================================
    if (acao === 'RECEBER') {
      if (chamado.status === 'ABERTO') {
        const atualizado = await prisma.$transaction(async (tx) => {
          const c = await tx.chamado.update({
            where: { id: chamado.id },
            data: { status: 'RECEBIDO' },
          });
          await tx.chamadoTimeline.create({
            data: {
              chamadoId: c.id,
              statusNovo: 'RECEBIDO',
              responsavel: session.nome,
              observacao: 'Chamado recebido e alocado na fila de atendimento da contratada.',
            },
          });
          return c;
        });
        return NextResponse.json({ success: true, chamado: atualizado });
      }
      return NextResponse.json({ success: true, chamado });
    }

    // =========================================================================
    // 2. EMPRESA: Enviar Orçamento (Previsto)
    // =========================================================================
    if (acao === 'ENVIAR_ORCAMENTO') {
      const { itens, tabelaId } = body;
      if (!Array.isArray(itens) || itens.length === 0) {
        return NextResponse.json({ error: 'Informe ao menos um insumo no orçamento.' }, { status: 400 });
      }

      // Calcular valor total orçado
      let totalOrcado = 0;
      for (const item of itens) {
        const qtd = parseFloat(item.quantidade);
        const val = parseFloat(item.valorUnitario);
        if (qtd <= 0 || val < 0) {
          return NextResponse.json({ error: 'Quantidade e valor unitário devem ser positivos.' }, { status: 400 });
        }
        totalOrcado += qtd * val;
      }

      // Verificar regra de alçada e 30 dias acumulados
      const alcada = await verificarAlcadaOrcamentaria(
        chamado.unidadeId,
        chamado.tipoServicoId,
        totalOrcado
      );

      // Regra Seção 8: Verificar disponibilidade de saldo (cota da unidade ou contrato global)
      const validacaoSaldo = await verificarSaldoParaOrcamento(
        chamado.unidadeId,
        totalOrcado,
        chamado.id,
        chamado.empresaId || undefined
      );

      // Determinar próximo status
      let novoStatus: any = 'AUTORIZADO';
      let observacaoTimeline = `Orçamento de R$ ${totalOrcado.toFixed(2)} aprovado automaticamente (dentro da alçada direta). Valor provisionado no contrato.`;

      if (!validacaoSaldo.temSaldo) {
        novoStatus = 'BLOQUEADO_SEM_SALDO';
        observacaoTimeline = `Orçamento de R$ ${totalOrcado.toFixed(2)} lançado, mas chamado BLOQUEADO POR FALTA DE SALDO: ${validacaoSaldo.motivo}`;
      } else if (chamado.execucaoEmergencial) {
        novoStatus = 'EM_EXECUCAO';
        observacaoTimeline = `Orçamento de R$ ${totalOrcado.toFixed(2)} registrado para execução emergencial já em andamento. Valor provisionado.`;
      } else if (alcada.precisaAutorizacao) {
        novoStatus = 'AGUARDANDO_AUTORIZACAO';
        observacaoTimeline = `Orçamento de R$ ${totalOrcado.toFixed(2)} enviado para autorização da fiscalização. Motivo: ${alcada.motivo}`;
      }

      const atualizado = await prisma.$transaction(async (tx) => {
        // Remover insumos previstos anteriores se estiver reorçando
        await tx.chamadoInsumo.deleteMany({
          where: { chamadoId: chamado.id, tipoInsumo: 'PREVISTO' },
        });

        // Inserir insumos previstos
        for (const item of itens) {
          let itemRefId = item.itemReferenciaId || null;

          // Se for item novo fora da tabela oficial, cadastra como PENDENTE_HOMOLOGACAO
          if (!itemRefId && item.codigo && tabelaId) {
            const novoItemRef = await tx.itemReferencia.create({
              data: {
                tabelaId,
                codigo: item.codigo.trim(),
                descricao: item.descricao.trim(),
                unidadeMedida: item.unidadeMedida || 'un',
                precoUnitario: parseFloat(item.valorUnitario),
                status: 'PENDENTE_HOMOLOGACAO',
              },
            });
            itemRefId = novoItemRef.id;
          }

          const qtd = parseFloat(item.quantidade);
          const val = parseFloat(item.valorUnitario);
          await tx.chamadoInsumo.create({
            data: {
              chamadoId: chamado.id,
              tipoInsumo: 'PREVISTO',
              itemReferenciaId: itemRefId,
              codigo: item.codigo,
              descricao: item.descricao,
              unidadeMedida: item.unidadeMedida || 'un',
              quantidade: qtd,
              valorUnitario: val,
              valorTotal: qtd * val,
            },
          });
        }

        const c = await tx.chamado.update({
          where: { id: chamado.id },
          data: {
            valorOrcado: totalOrcado,
            totalPrevisto: totalOrcado,
            status: novoStatus,
            autorizadoEm: novoStatus === 'AUTORIZADO' ? new Date() : null,
          },
        });

        await tx.chamadoTimeline.create({
          data: {
            chamadoId: c.id,
            statusNovo: novoStatus,
            responsavel: session.nome,
            observacao: observacaoTimeline,
          },
        });

        return c;
      });

      let mensagemRetorno = 'Orçamento aprovado automaticamente. A empresa pode iniciar os serviços!';
      if (novoStatus === 'BLOQUEADO_SEM_SALDO') {
        mensagemRetorno = 'Orçamento registrado, mas o chamado foi BLOQUEADO POR FALTA DE SALDO orçamentário. Gestão do contrato e fiscalização notificadas.';
      } else if (novoStatus === 'AGUARDANDO_AUTORIZACAO') {
        mensagemRetorno = 'Orçamento enviado para autorização da fiscalização técnica.';
      }

      return NextResponse.json({
        success: true,
        chamado: atualizado,
        novoStatus,
        mensagem: mensagemRetorno,
      });
    }

    // =========================================================================
    // 3. EMPRESA: Iniciar Execução
    // =========================================================================
    if (acao === 'INICIAR_EXECUCAO') {
      const {
        maoObra,
        funcionarioId,
        houveDeslocamento,
        diasDeslocamento,
        justificativaDeslocamento,
        trabalhadorDeslocado,
      } = body;

      const podeIniciar =
        ['AUTORIZADO', 'DEVOLVIDO', 'REABERTO_GARANTIA'].includes(chamado.status) ||
        (chamado.status === 'RECEBIDO' && chamado.nivelCodigo === 'EMERGENCIA');

      if (!podeIniciar) {
        return NextResponse.json({ error: 'O chamado não está autorizado para início de execução.' }, { status: 400 });
      }

      if (maoObra === 'FIXA' && !funcionarioId) {
        return NextResponse.json({ error: 'Mão de obra fixa exige a indicação do funcionário.' }, { status: 400 });
      }

      // Buscar valor unitário da diária no contrato ativo
      const contratoAtivo = await prisma.contrato.findFirst({
        where: { ativo: true },
        select: { valorDiariaUnitario: true },
      });
      const vDiariaUnit = contratoAtivo?.valorDiariaUnitario
        ? parseFloat(contratoAtivo.valorDiariaUnitario.toString())
        : 150.0;

      const qtdDias = houveDeslocamento ? parseInt(diasDeslocamento) || 0 : 0;
      const valorTotalDiarias = qtdDias > 0 ? qtdDias * vDiariaUnit : null;

      const isEmergencia = chamado.status === 'RECEBIDO' && chamado.nivelCodigo === 'EMERGENCIA';

      const atualizado = await prisma.$transaction(async (tx) => {
        const c = await tx.chamado.update({
          where: { id: chamado.id },
          data: {
            status: 'EM_EXECUCAO',
            maoObra: maoObra || 'FIXA',
            funcionarioId: funcionarioId || null,
            execucaoEmergencial: isEmergencia ? true : chamado.execucaoEmergencial,
            houveDeslocamento: Boolean(houveDeslocamento),
            diasDeslocamento: qtdDias,
            valorDiariaUnitario: qtdDias > 0 ? vDiariaUnit : null,
            valorTotalDiarias: valorTotalDiarias,
            justificativaDeslocamento: justificativaDeslocamento?.trim() || null,
            trabalhadorDeslocado: trabalhadorDeslocado?.trim() || null,
          },
        });

        const obsExtra = houveDeslocamento && qtdDias > 0
          ? ` Deslocamento de sede: ${qtdDias} diária(s) (R$ ${valorTotalDiarias?.toFixed(2)}).`
          : '';

        await tx.chamadoTimeline.create({
          data: {
            chamadoId: c.id,
            statusNovo: 'EM_EXECUCAO',
            responsavel: session.nome,
            observacao: isEmergencia
              ? `Execução emergencial iniciada antes de orçamento prévio por risco imediato.${obsExtra}`
              : `Execução iniciada com mão de obra ${maoObra || 'FIXA'}.${obsExtra}`,
          },
        });

        return c;
      });

      return NextResponse.json({ success: true, chamado: atualizado });
    }

    // =========================================================================
    // 4. EMPRESA: Registrar Atendimento (Prestação de contas + Foto do Depois)
    // =========================================================================
    if (acao === 'REGISTRAR_ATENDIMENTO') {
      if (chamado.status !== 'EM_EXECUCAO') {
        return NextResponse.json({ error: 'Chamado precisa estar em execução para registrar atendimento.' }, { status: 400 });
      }

      const { horas, fotoDepoisUrl, itensExecutados } = body;
      if (!horas || parseFloat(horas) <= 0) {
        return NextResponse.json({ error: 'Informe o tempo de execução em horas.' }, { status: 400 });
      }

      const temFotoDepois = chamado.fotos.some((f) => f.tipo === 'DEPOIS');
      if (!temFotoDepois && !fotoDepoisUrl) {
        return NextResponse.json({ error: 'A foto do depois é obrigatória para encerrar o serviço.' }, { status: 400 });
      }

      let totalExecutado = 0;
      if (Array.isArray(itensExecutados) && itensExecutados.length > 0) {
        totalExecutado = itensExecutados.reduce((acc, i) => acc + parseFloat(i.quantidade) * parseFloat(i.valorUnitario), 0);
      } else {
        totalExecutado = chamado.totalPrevisto ? parseFloat(chamado.totalPrevisto.toString()) : 0;
      }

      const atualizado = await prisma.$transaction(async (tx) => {
        // Gravar foto do depois se informada
        if (fotoDepoisUrl) {
          await tx.chamadoFoto.create({
            data: {
              chamadoId: chamado.id,
              tipo: 'DEPOIS',
              url: fotoDepoisUrl,
              rodada: 1,
            },
          });
        }

        // Lançar itens executados se fornecidos
        if (Array.isArray(itensExecutados) && itensExecutados.length > 0) {
          await tx.chamadoInsumo.deleteMany({
            where: { chamadoId: chamado.id, tipoInsumo: 'EXECUTADO' },
          });

          for (const item of itensExecutados) {
            const qtd = parseFloat(item.quantidade);
            const val = parseFloat(item.valorUnitario);
            await tx.chamadoInsumo.create({
              data: {
                chamadoId: chamado.id,
                tipoInsumo: 'EXECUTADO',
                codigo: item.codigo,
                descricao: item.descricao,
                unidadeMedida: item.unidadeMedida || 'un',
                quantidade: qtd,
                valorUnitario: val,
                valorTotal: qtd * val,
              },
            });
          }
        }

        // Atualizar deslocamento se fornecido na prestação de contas
        let houveDeslocamentoAtualizado = chamado.houveDeslocamento;
        let diasDeslocamentoAtualizado = chamado.diasDeslocamento;
        let valorDiariaUnitarioAtualizado = chamado.valorDiariaUnitario ? parseFloat(chamado.valorDiariaUnitario.toString()) : null;
        let valorTotalDiariasAtualizado = chamado.valorTotalDiarias ? parseFloat(chamado.valorTotalDiarias.toString()) : null;
        let justificativaAtualizada = chamado.justificativaDeslocamento;
        let trabalhadorAtualizado = chamado.trabalhadorDeslocado;

        if (body.houveDeslocamento !== undefined) {
          const houve = Boolean(body.houveDeslocamento);
          const qtdDias = houve ? (parseInt(body.diasDeslocamento, 10) || 0) : 0;
          let vDiaria = valorDiariaUnitarioAtualizado;
          if (!vDiaria) {
            const ct = await tx.contrato.findFirst({ where: { ativo: true } });
            vDiaria = ct?.valorDiariaUnitario ? parseFloat(ct.valorDiariaUnitario.toString()) : 150.00;
          }
          houveDeslocamentoAtualizado = houve;
          diasDeslocamentoAtualizado = qtdDias;
          valorDiariaUnitarioAtualizado = qtdDias > 0 ? vDiaria : null;
          valorTotalDiariasAtualizado = qtdDias > 0 ? (qtdDias * vDiaria) : null;
          justificativaAtualizada = body.justificativaDeslocamento?.trim() || null;
          trabalhadorAtualizado = body.trabalhadorDeslocado?.trim() || null;
        }

        const c = await tx.chamado.update({
          where: { id: chamado.id },
          data: {
            status: 'ATENDIDO',
            atendidoEm: new Date(),
            tempoExecucaoHoras: parseFloat(horas),
            totalExecutado,
            houveDeslocamento: houveDeslocamentoAtualizado,
            diasDeslocamento: diasDeslocamentoAtualizado,
            valorDiariaUnitario: valorDiariaUnitarioAtualizado,
            valorTotalDiarias: valorTotalDiariasAtualizado,
            justificativaDeslocamento: justificativaAtualizada,
            trabalhadorDeslocado: trabalhadorAtualizado,
          },
        });

        await tx.chamadoTimeline.create({
          data: {
            chamadoId: c.id,
            statusNovo: 'ATENDIDO',
            responsavel: session.nome,
            observacao: `Atendimento registrado (${horas} horas executadas). Aguardando validação do demandante.`,
          },
        });

        return c;
      });

      return NextResponse.json({
        success: true,
        chamado: atualizado,
        mensagem: 'Atendimento registrado com sucesso! Notificação enviada ao demandante.',
      });
    }

    // =========================================================================
    // 5. DEMANDANTE: Validar Atendimento (Aceite ou Devolução com Retrabalho)
    // =========================================================================
    if (acao === 'VALIDAR') {
      if (chamado.status !== 'ATENDIDO') {
        return NextResponse.json({ error: 'Apenas chamados atendidos podem ser validados.' }, { status: 400 });
      }

      const { nota, aceitar, observacoes } = body;
      if (!nota || nota < 1 || nota > 5) {
        return NextResponse.json({ error: 'Selecione uma nota de 1 a 5 para a qualidade do serviço.' }, { status: 400 });
      }

      if (!aceitar && (!observacoes || observacoes.trim().length < 10)) {
        return NextResponse.json({ error: 'Para devolver, descreva o que continua errado com pelo menos 10 caracteres.' }, { status: 400 });
      }

      const garantiaDias = 90;
      const garantiaAte = new Date(Date.now() + garantiaDias * 24 * 60 * 60 * 1000);
      const totalExecutadoFinal = chamado.totalExecutado ?? chamado.totalPrevisto ?? chamado.valorOrcado ?? 0;

      const atualizado = await prisma.$transaction(async (tx) => {
        const c = await tx.chamado.update({
          where: { id: chamado.id },
          data: {
            status: aceitar ? 'EM_GARANTIA' : 'DEVOLVIDO',
            totalExecutado: aceitar ? totalExecutadoFinal : chamado.totalExecutado,
            avaliacaoNota: parseInt(nota),
            avaliacaoComentario: observacoes ? observacoes.trim() : null,
            garantiaAte: aceitar ? garantiaAte : null,
            retrabalho: !aceitar ? true : chamado.retrabalho,
            concluidoEm: aceitar ? new Date() : null,
          },
        });

        await tx.chamadoTimeline.create({
          data: {
            chamadoId: c.id,
            statusNovo: aceitar ? 'EM_GARANTIA' : 'DEVOLVIDO',
            responsavel: session.nome,
            observacao: aceitar
              ? `Serviço ACEITO pelo demandante com nota ${nota}/5. Valor de R$ ${Number(totalExecutadoFinal).toFixed(2)} liquidado definitivamente no contrato. Período de garantia ativo até ${garantiaAte.toLocaleDateString('pt-BR')}.`
              : `Serviço DEVOLVIDO à empresa (Retrabalho apontado). Justificativa: ${observacoes}`,
          },
        });

        return c;
      });

      return NextResponse.json({
        success: true,
        chamado: atualizado,
        mensagem: aceitar
          ? 'Serviço aceito com sucesso! O chamado entrou em período de garantia e o valor executado foi liquidado.'
          : 'Chamado devolvido à empresa para correções.',
      });
    }

    // =========================================================================
    // 6. FISCAL / GESTOR: Decisão de Alçada Orçamentária
    // =========================================================================
    if (acao === 'DECIDIR_ALCADA') {
      if (
        session.role !== 'ADMIN' &&
        session.role !== 'GESTOR_CONTRATO' &&
        session.role !== 'FISCAL_ADM' &&
        session.role !== 'FISCAL_TECNICO'
      ) {
        return NextResponse.json({ error: 'Apenas o Gestor do Contrato ou Fiscais podem deliberar sobre alçada orçamentária.' }, { status: 403 });
      }

      const { autorizar, justificativa } = body;
      if (!autorizar && (!justificativa || justificativa.trim().length < 10)) {
        return NextResponse.json({ error: 'A recusa de orçamento exige justificativa com pelo menos 10 caracteres.' }, { status: 400 });
      }

      if (autorizar) {
        const orcadoNum = chamado.valorOrcado ? parseFloat(chamado.valorOrcado.toString()) : 0;
        const validacaoSaldo = await verificarSaldoParaOrcamento(
          chamado.unidadeId,
          orcadoNum,
          chamado.id,
          chamado.empresaId || undefined
        );

        if (!validacaoSaldo.temSaldo) {
          const cBloqueado = await prisma.$transaction(async (tx) => {
            const cb = await tx.chamado.update({
              where: { id: chamado.id },
              data: { status: 'BLOQUEADO_SEM_SALDO' },
            });
            await tx.chamadoTimeline.create({
              data: {
                chamadoId: cb.id,
                statusNovo: 'BLOQUEADO_SEM_SALDO',
                responsavel: session.nome,
                observacao: `Tentativa de autorização rejeitada por falta de saldo: ${validacaoSaldo.motivo}`,
              },
            });
            return cb;
          });

          return NextResponse.json({
            error: `Saldo orçamentário insuficiente para autorização: ${validacaoSaldo.motivo}. O chamado foi movido para BLOQUEADO_SEM_SALDO.`,
            chamado: cBloqueado,
          }, { status: 400 });
        }
      }

      const novoStatus = autorizar ? 'AUTORIZADO' : 'RECUSADO';

      const atualizado = await prisma.$transaction(async (tx) => {
        const c = await tx.chamado.update({
          where: { id: chamado.id },
          data: {
            status: novoStatus,
            autorizadoEm: autorizar ? new Date() : null,
            valorAutorizado: autorizar ? chamado.valorOrcado : null,
            justificativaRecusa: !autorizar ? justificativa.trim() : null,
          },
        });

        await tx.chamadoAutorizacao.create({
          data: {
            chamadoId: c.id,
            usuarioId: session.id,
            decisao: autorizar ? 'AUTORIZADO' : 'RECUSADO',
            aprovado: autorizar,
            valorChamado: chamado.valorOrcado,
            valorAprovado: autorizar ? chamado.valorOrcado : null,
            justificativa: justificativa ? justificativa.trim() : null,
          },
        });

        await tx.chamadoTimeline.create({
          data: {
            chamadoId: c.id,
            statusNovo: novoStatus,
            responsavel: session.nome,
            observacao: autorizar
              ? `Orçamento autorizado pela fiscalização. Liberado para execução e provisionado no contrato.`
              : `Orçamento recusado pela fiscalização. Justificativa: ${justificativa}`,
          },
        });

        return c;
      });

      return NextResponse.json({
        success: true,
        chamado: atualizado,
        mensagem: autorizar ? 'Chamado autorizado. A empresa já pode iniciar.' : 'Chamado recusado com sucesso.',
      });
    }

    // =========================================================================
    // 6.1 FISCAL / GESTOR: Desbloquear Chamado Sem Saldo (Seção 4 e 8)
    // =========================================================================
    if (acao === 'DESBLOQUEAR_SALDO') {
      if (
        session.role !== 'ADMIN' &&
        session.role !== 'GESTOR_CONTRATO' &&
        session.role !== 'FISCAL_ADM' &&
        session.role !== 'FISCAL_TECNICO'
      ) {
        return NextResponse.json({ error: 'Apenas Gestores e Fiscais podem desbloquear chamados.' }, { status: 403 });
      }

      if (chamado.status !== 'BLOQUEADO_SEM_SALDO') {
        return NextResponse.json({ error: 'Apenas chamados com status BLOQUEADO_SEM_SALDO podem ser desbloqueados.' }, { status: 400 });
      }

      const orcadoNum = chamado.valorOrcado ? parseFloat(chamado.valorOrcado.toString()) : 0;
      const validacaoSaldo = await verificarSaldoParaOrcamento(
        chamado.unidadeId,
        orcadoNum,
        chamado.id,
        chamado.empresaId || undefined
      );

      if (!validacaoSaldo.temSaldo) {
        return NextResponse.json({
          error: `Saldo orçamentário ainda insuficiente para desbloqueio: ${validacaoSaldo.motivo}. Alavanque termo aditivo ou ajuste a cota da unidade.`,
        }, { status: 400 });
      }

      const alcada = await verificarAlcadaOrcamentaria(
        chamado.unidadeId,
        chamado.tipoServicoId,
        orcadoNum
      );

      const novoStatus = alcada.precisaAutorizacao ? 'AGUARDANDO_AUTORIZACAO' : 'AUTORIZADO';

      const atualizado = await prisma.$transaction(async (tx) => {
        const c = await tx.chamado.update({
          where: { id: chamado.id },
          data: {
            status: novoStatus,
            autorizadoEm: novoStatus === 'AUTORIZADO' ? new Date() : null,
          },
        });

        await tx.chamadoTimeline.create({
          data: {
            chamadoId: c.id,
            statusNovo: novoStatus,
            responsavel: session.nome,
            observacao: `Chamado desbloqueado por ${session.nome} (${session.role}) após verificação de saldo disponível. Status atualizado para ${novoStatus}.`,
          },
        });

        return c;
      });

      return NextResponse.json({
        success: true,
        chamado: atualizado,
        novoStatus,
        mensagem: 'Chamado desbloqueado com sucesso! Saldo orçamentário provisionado.',
      });
    }

    // =========================================================================
    // 7. INTERAÇÃO / COMENTÁRIO (Demandantes da mesma unidade, Fiscais, Admin, Empresa)
    // =========================================================================
    if (acao === 'COMENTAR') {
      const { mensagem } = body;
      if (!mensagem || mensagem.trim().length < 3) {
        return NextResponse.json({ error: 'Mensagem deve ter ao menos 3 caracteres.' }, { status: 400 });
      }

      // Validar permissão: se demandante, deve pertencer à mesma unidade do chamado
      if (session.role === 'DEMANDANTE' && session.unidadeId && session.unidadeId !== chamado.unidadeId) {
        return NextResponse.json({ error: 'Você só pode interagir nos chamados da sua unidade.' }, { status: 403 });
      }

      const rotuloOrigem = session.role === 'DEMANDANTE'
        ? `${session.nome} (Unidade Demandante)`
        : `${session.nome} (${session.role})`;

      const timelineItem = await prisma.chamadoTimeline.create({
        data: {
          chamadoId: chamado.id,
          statusNovo: chamado.status,
          responsavel: rotuloOrigem,
          usuarioId: session.id,
          papel: session.role,
          observacao: mensagem.trim(),
        },
      });

      return NextResponse.json({ success: true, timelineItem });
    }

    // =========================================================================
    // 8. ANEXAR FOTO DE ACOMPANHAMENTO
    // =========================================================================
    if (acao === 'ANEXAR_FOTO') {
      const { url, tipo, sha256 } = body;
      if (!url) return NextResponse.json({ error: 'URL da foto obrigatória.' }, { status: 400 });

      if (session.role === 'DEMANDANTE' && session.unidadeId && session.unidadeId !== chamado.unidadeId) {
        return NextResponse.json({ error: 'Você só pode anexar fotos aos chamados da sua unidade.' }, { status: 403 });
      }

      const foto = await prisma.chamadoFoto.create({
        data: {
          chamadoId: chamado.id,
          url,
          tipo: tipo || 'COMPROVANTE',
          sha256: sha256 || null,
        },
      });

      await prisma.chamadoTimeline.create({
        data: {
          chamadoId: chamado.id,
          statusNovo: chamado.status,
          responsavel: `${session.nome} (${session.role})`,
          usuarioId: session.id,
          papel: session.role,
          observacao: `Nova evidência fotográfica anexada (${foto.tipo}).`,
        },
      });

      return NextResponse.json({ success: true, foto });
    }

    // =========================================================================
    // 9. ADMIN: Edição Direta de Dados do Chamado
    // =========================================================================
    if (acao === 'EDITAR_ADMIN') {
      if (session.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Apenas Administrador pode editar diretamente os dados do chamado.' }, { status: 403 });
      }

      const { setorEspecifico, descricao, status, nivelCodigo, funcionarioId, maoObra } = body;

      const atualizado = await prisma.$transaction(async (tx) => {
        const c = await tx.chamado.update({
          where: { id: chamado.id },
          data: {
            setorEspecifico: setorEspecifico ? setorEspecifico.trim() : undefined,
            descricao: descricao ? descricao.trim() : undefined,
            status: status || undefined,
            nivelCodigo: nivelCodigo || undefined,
            funcionarioId: funcionarioId !== undefined ? (funcionarioId || null) : undefined,
            maoObra: maoObra !== undefined ? (maoObra || null) : undefined,
          },
        });

        await tx.chamadoTimeline.create({
          data: {
            chamadoId: c.id,
            statusNovo: c.status,
            responsavel: `${session.nome} (Administrador)`,
            usuarioId: session.id,
            papel: 'ADMIN',
            observacao: 'Dados do chamado alterados manualmente pela administração.',
          },
        });

        return c;
      });

      return NextResponse.json({ success: true, chamado: atualizado });
    }

    return NextResponse.json({ error: 'Ação não reconhecida.' }, { status: 400 });
  } catch (error: any) {
    console.error('Erro na operação do chamado:', error);
    return NextResponse.json({ error: 'Erro interno: ' + error.message }, { status: 500 });
  }
}

// =========================================================================
// DELETE: Exclusão de Chamado (Apenas Administrador)
// =========================================================================
export async function DELETE(req: Request, { params }: RouteContext) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Apenas Administrador pode excluir chamados.' }, { status: 403 });
    }

    const chamado = await prisma.chamado.findUnique({
      where: { id: params.id },
      select: { id: true, numero: true },
    });

    if (!chamado) {
      return NextResponse.json({ error: 'Chamado não encontrado.' }, { status: 404 });
    }

    // Transação de exclusão de fotos, insumos, timeline e chamado
    await prisma.$transaction([
      prisma.chamadoFoto.deleteMany({ where: { chamadoId: params.id } }),
      prisma.chamadoInsumo.deleteMany({ where: { chamadoId: params.id } }),
      prisma.chamadoAutorizacao.deleteMany({ where: { chamadoId: params.id } }),
      prisma.chamadoTimeline.deleteMany({ where: { chamadoId: params.id } }),
      prisma.chamado.delete({ where: { id: params.id } }),
    ]);

    return NextResponse.json({ success: true, mensagem: `Chamado nº ${chamado.numero} excluído com sucesso.` });
  } catch (error: any) {
    console.error('Erro ao excluir chamado:', error);
    return NextResponse.json({ error: 'Erro ao excluir chamado: ' + error.message }, { status: 500 });
  }
}
