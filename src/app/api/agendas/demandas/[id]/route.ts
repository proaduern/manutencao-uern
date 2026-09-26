import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { adicionarDiasUteis, avaliarSLAAgenda, obterCotaUnidadeAgenda } from '@/lib/services/agenda';
import { obterGrandezasContrato } from '@/lib/services/contrato';

interface RouteContext {
  params: { id: string };
}

export const dynamic = 'force-dynamic';

/**
 * GET /api/agendas/demandas/[id]
 * Detalhe completo da demanda da agenda com Proposta Técnica, ART, Diligências, Pareceres SOBE e SLA.
 */
export async function GET(req: Request, { params }: RouteContext) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const demanda = await prisma.agendaDemanda.findUnique({
      where: { id: params.id },
      include: {
        agenda: true,
        unidade: true,
        predio: true,
        sublocal: true,
        ambiente: true,
        criadoPor: { select: { id: true, nome: true, email: true, role: true } },
        fotos: true,
        proposta: {
          include: {
            itens: { orderBy: { id: 'asc' } },
          },
        },
        diligencias: { orderBy: { criadoEm: 'desc' } },
        pareceresSobe: {
          include: {
            tecnicoSobe: { select: { id: true, nome: true, email: true } },
          },
          orderBy: { criadoEm: 'desc' },
        },
        timeline: { orderBy: { criadoEm: 'asc' } },
      },
    });

    if (!demanda) {
      return NextResponse.json({ error: 'Demanda não encontrada' }, { status: 404 });
    }

    // Avaliar situação de SLA e cumprimento de prazos em dias úteis
    const sla = avaliarSLAAgenda(demanda);
    const cotaInfo = await obterCotaUnidadeAgenda(demanda.agendaId, demanda.unidadeId);

    return NextResponse.json({
      demanda,
      sla,
      cotaInfo,
    });
  } catch (error: any) {
    console.error('Erro ao buscar demanda da agenda:', error);
    return NextResponse.json({ error: 'Erro ao carregar demanda: ' + error.message }, { status: 500 });
  }
}

/**
 * PATCH /api/agendas/demandas/[id]
 * Tramitação da demanda da agenda:
 * - Proposta Técnica SINAPI / ART (Empresa)
 * - Diligências & Parecer SOBE (Fiscais / SOBE)
 * - Contestação e Autorização com Provisão de Saldo (Fiscais / Gestor)
 * - Conclusão pela Empresa e Aceite da Unidade (5 dias úteis)
 */
export async function PATCH(req: Request, { params }: RouteContext) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const demanda = await prisma.agendaDemanda.findUnique({
      where: { id: params.id },
      include: {
        agenda: true,
        unidade: true,
        proposta: { include: { itens: true } },
      },
    });

    if (!demanda) {
      return NextResponse.json({ error: 'Demanda não encontrada' }, { status: 404 });
    }

    const body = await req.json();
    const { acao } = body;

    // =========================================================================
    // 1. EMPRESA: SUBMETER PROPOSTA DE EXECUÇÃO DE DEMANDA
    // =========================================================================
    if (acao === 'SUBMETER_PROPOSTA_EMPRESA') {
      if (session.role !== 'EMPRESA' && session.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Apenas a empresa contratada pode submeter proposta de execução.' }, { status: 403 });
      }

      const {
        responsavelTecnicoNome,
        registroProfissional,
        artNumero,
        artArquivoUrl,
        prazoExecucaoDias,
        regimeMaoObra, // "EVENTUAL" ou "FIXA_RESIDENTE"
        justificativaMaoObra,
        itens, // Array: [{ fonteReferencia, codigoItem, descricao, unidadeMedida, quantidade, valorUnitario, anexoCotacoesUrl }]
      } = body;

      if (!responsavelTecnicoNome || !registroProfissional || !artNumero) {
        return NextResponse.json({ error: 'Identificação do profissional habilitado (CREA/CAU) e número da ART são obrigatórios.' }, { status: 400 });
      }

      const prazoDiasNum = parseInt(prazoExecucaoDias);
      if (!prazoDiasNum || prazoDiasNum <= 0) {
        return NextResponse.json({ error: 'Informe um prazo estimado de execução válido (em dias úteis).' }, { status: 400 });
      }

      if (regimeMaoObra === 'FIXA_RESIDENTE' && (!justificativaMaoObra || justificativaMaoObra.trim().length < 15)) {
        return NextResponse.json({
          error: 'A opção por mão de obra residente exige justificativa detalhada garantindo que os serviços rotineiros não serão prejudicados.',
        }, { status: 400 });
      }

      if (!Array.isArray(itens) || itens.length === 0) {
        return NextResponse.json({ error: 'A proposta deve conter ao menos um item de insumo ou serviço orçado.' }, { status: 400 });
      }

      // Calcular valor total da proposta
      let totalProposto = 0;
      for (const it of itens) {
        const q = parseFloat(it.quantidade);
        const v = parseFloat(it.valorUnitario);
        if (q <= 0 || v < 0) {
          return NextResponse.json({ error: 'Quantidade e valor unitário de todos os itens devem ser válidos.' }, { status: 400 });
        }
        totalProposto += q * v;
      }

      const agora = new Date();

      const atualizado = await prisma.$transaction(async (tx) => {
        // Criar ou atualizar a proposta
        const proposta = await tx.agendaProposta.upsert({
          where: { demandaId: demanda.id },
          create: {
            demandaId: demanda.id,
            responsavelTecnicoNome: responsavelTecnicoNome.trim(),
            registroProfissional: registroProfissional.trim(),
            artNumero: artNumero.trim(),
            artArquivoUrl: artArquivoUrl?.trim() || null,
            prazoExecucaoDias: prazoDiasNum,
            regimeMaoObra: regimeMaoObra || 'EVENTUAL',
            justificativaMaoObra: justificativaMaoObra?.trim() || null,
            valorTotalProposto: totalProposto,
          },
          update: {
            responsavelTecnicoNome: responsavelTecnicoNome.trim(),
            registroProfissional: registroProfissional.trim(),
            artNumero: artNumero.trim(),
            artArquivoUrl: artArquivoUrl?.trim() || null,
            prazoExecucaoDias: prazoDiasNum,
            regimeMaoObra: regimeMaoObra || 'EVENTUAL',
            justificativaMaoObra: justificativaMaoObra?.trim() || null,
            valorTotalProposto: totalProposto,
          },
        });

        // Limpar itens anteriores caso reorçando
        await tx.agendaPropostaItem.deleteMany({
          where: { propostaId: proposta.id },
        });

        // Gravar novos itens
        for (const it of itens) {
          const q = parseFloat(it.quantidade);
          const v = parseFloat(it.valorUnitario);
          await tx.agendaPropostaItem.create({
            data: {
              propostaId: proposta.id,
              fonteReferencia: it.fonteReferencia || 'SINAPI',
              codigoItem: it.codigoItem?.trim() || null,
              descricao: it.descricao.trim(),
              unidadeMedida: it.unidadeMedida?.trim() || 'un',
              quantidade: q,
              valorUnitario: v,
              valorTotal: q * v,
              anexoCotacoesUrl: it.anexoCotacoesUrl || null,
            },
          });
        }

        // Atualizar status da demanda para PROPOSTA_EM_ANALISE
        const d = await tx.agendaDemanda.update({
          where: { id: demanda.id },
          data: {
            status: 'PROPOSTA_EM_ANALISE',
            dataSubmissaoProposta: agora,
            prazoExecucaoDias: prazoDiasNum,
          },
        });

        await tx.agendaDemandaTimeline.create({
          data: {
            demandaId: d.id,
            statusNovo: 'PROPOSTA_EM_ANALISE',
            responsavel: session.nome,
            observacao: `Proposta de execução submetida pela contratada (RT: ${responsavelTecnicoNome}, ART: ${artNumero}, Valor: R$ ${totalProposto.toFixed(2)}, Prazo: ${prazoDiasNum} dias úteis). Disponível para análise técnica da UERN.`,
          },
        });

        return d;
      });

      return NextResponse.json({
        success: true,
        demanda: atualizado,
        mensagem: 'Proposta de execução de demanda submetida com sucesso! Aguardando análise da fiscalização técnica.',
      });
    }

    // =========================================================================
    // 2. FISCAL / GESTOR: SOLICITAR DILIGÊNCIA (ADEQUAÇÃO TÉCNICA)
    // =========================================================================
    if (acao === 'SOLICITAR_DILIGENCIA') {
      if (
        session.role !== 'ADMIN' &&
        session.role !== 'GESTOR_CONTRATO' &&
        session.role !== 'FISCAL_TECNICO' &&
        session.role !== 'FISCAL_ADM'
      ) {
        return NextResponse.json({ error: 'Apenas a fiscalização técnica e gestores podem solicitar diligências.' }, { status: 403 });
      }

      const { descricaoDiligencia } = body;
      if (!descricaoDiligencia || descricaoDiligencia.trim().length < 10) {
        return NextResponse.json({ error: 'Descreva os apontamentos técnicos da diligência com ao menos 10 caracteres.' }, { status: 400 });
      }

      const atualizado = await prisma.$transaction(async (tx) => {
        await tx.agendaDiligencia.create({
          data: {
            demandaId: demanda.id,
            solicitanteNome: session.nome,
            solicitanteRole: session.role,
            descricaoDiligencia: descricaoDiligencia.trim(),
          },
        });

        const d = await tx.agendaDemanda.update({
          where: { id: demanda.id },
          data: { status: 'EM_DILIGENCIA' },
        });

        await tx.agendaDemandaTimeline.create({
          data: {
            demandaId: d.id,
            statusNovo: 'EM_DILIGENCIA',
            responsavel: session.nome,
            observacao: `Diligência solicitada pela UERN: ${descricaoDiligencia.trim()}`,
          },
        });

        return d;
      });

      return NextResponse.json({
        success: true,
        demanda: atualizado,
        mensagem: 'Diligência enviada para a contratada com sucesso!',
      });
    }

    // =========================================================================
    // 3. EMPRESA: RESPONDER DILIGÊNCIA
    // =========================================================================
    if (acao === 'RESPONDER_DILIGENCIA') {
      if (session.role !== 'EMPRESA' && session.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Apenas a empresa pode responder à diligência.' }, { status: 403 });
      }

      const { diligenciaId, respostaContratada } = body;
      if (!respostaContratada || respostaContratada.trim().length < 5) {
        return NextResponse.json({ error: 'Informe a resposta explicativa da contratada.' }, { status: 400 });
      }

      const atualizado = await prisma.$transaction(async (tx) => {
        if (diligenciaId) {
          await tx.agendaDiligencia.update({
            where: { id: diligenciaId },
            data: {
              respostaContratada: respostaContratada.trim(),
              respondidoEm: new Date(),
            },
          });
        }

        const d = await tx.agendaDemanda.update({
          where: { id: demanda.id },
          data: { status: 'PROPOSTA_EM_ANALISE' },
        });

        await tx.agendaDemandaTimeline.create({
          data: {
            demandaId: d.id,
            statusNovo: 'PROPOSTA_EM_ANALISE',
            responsavel: session.nome,
            observacao: `Diligência respondida pela contratada: ${respostaContratada.trim()}`,
          },
        });

        return d;
      });

      return NextResponse.json({
        success: true,
        demanda: atualizado,
        mensagem: 'Resposta à diligência enviada com sucesso para a fiscalização!',
      });
    }

    // =========================================================================
    // 4. FISCAL / GESTOR: SOLICITAR PARECER TÉCNICO DA SOBE
    // =========================================================================
    if (acao === 'SOLICITAR_PARECER_SOBE') {
      if (
        session.role !== 'ADMIN' &&
        session.role !== 'GESTOR_CONTRATO' &&
        session.role !== 'FISCAL_TECNICO'
      ) {
        return NextResponse.json({ error: 'Apenas o Fiscal Técnico ou Gestor pode solicitar parecer da SOBE.' }, { status: 403 });
      }

      const { observacaoSolicitacao } = body;

      const atualizado = await prisma.$transaction(async (tx) => {
        const d = await tx.agendaDemanda.update({
          where: { id: demanda.id },
          data: { status: 'AGUARDANDO_SOBE' },
        });

        await tx.agendaDemandaTimeline.create({
          data: {
            demandaId: d.id,
            statusNovo: 'AGUARDANDO_SOBE',
            responsavel: session.nome,
            observacao: `Demanda encaminhada para parecer técnico da Superintendência de Obras e Engenharia da UERN (SOBE). ${observacaoSolicitacao ? 'Obs: ' + observacaoSolicitacao : ''}`,
          },
        });

        return d;
      });

      return NextResponse.json({
        success: true,
        demanda: atualizado,
        mensagem: 'Demanda encaminhada para avaliação técnica da SOBE.',
      });
    }

    // =========================================================================
    // 5. TÉCNICO DA SOBE: EMITIR PARECER TÉCNICO
    // =========================================================================
    if (acao === 'EMITIR_PARECER_SOBE') {
      if (
        session.role !== 'TECNICO_SOBE' &&
        session.role !== 'ADMIN' &&
        session.role !== 'FISCAL_TECNICO'
      ) {
        return NextResponse.json({ error: 'Apenas técnicos habilitados da SOBE ou administradores podem emitir parecer.' }, { status: 403 });
      }

      const { parecerTexto, favoravel, arquivoAnexoUrl } = body;
      if (!parecerTexto || parecerTexto.trim().length < 15) {
        return NextResponse.json({ error: 'O parecer técnico da SOBE deve conter ao menos 15 caracteres de fundamentação.' }, { status: 400 });
      }

      const atualizado = await prisma.$transaction(async (tx) => {
        await tx.agendaParecerSobe.create({
          data: {
            demandaId: demanda.id,
            solicitanteNome: 'Fiscalização UERN',
            tecnicoSobeId: session.id,
            tecnicoSobeNome: session.nome,
            parecerTexto: parecerTexto.trim(),
            favoravel: Boolean(favoravel),
            arquivoAnexoUrl: arquivoAnexoUrl?.trim() || null,
          },
        });

        const d = await tx.agendaDemanda.update({
          where: { id: demanda.id },
          data: { status: 'PROPOSTA_EM_ANALISE' },
        });

        await tx.agendaDemandaTimeline.create({
          data: {
            demandaId: d.id,
            statusNovo: 'PROPOSTA_EM_ANALISE',
            responsavel: `${session.nome} (SOBE)`,
            observacao: `Parecer técnico emitido pela SOBE: ${favoravel ? 'FAVORÁVEL' : 'DESFAVORÁVEL'}. Fundamentação: ${parecerTexto.trim()}`,
          },
        });

        return d;
      });

      return NextResponse.json({
        success: true,
        demanda: atualizado,
        mensagem: 'Parecer técnico da SOBE registrado com sucesso!',
      });
    }

    // =========================================================================
    // 6. FISCAL / GESTOR: CONTESTAR VALORES (ORÇAMENTO AFERIDO PELA UERN)
    // =========================================================================
    if (acao === 'CONTESTAR_VALORES') {
      if (
        session.role !== 'ADMIN' &&
        session.role !== 'GESTOR_CONTRATO' &&
        session.role !== 'FISCAL_TECNICO'
      ) {
        return NextResponse.json({ error: 'Apenas Gestores e Fiscais Técnicos podem contestar valores orçados.' }, { status: 403 });
      }

      const { valorContestado, motivoContestacao } = body;
      const vNum = parseFloat(valorContestado);
      if (!vNum || vNum <= 0 || !motivoContestacao) {
        return NextResponse.json({ error: 'Informe o valor aferido pela UERN e a justificativa técnica de contestação.' }, { status: 400 });
      }

      const atualizado = await prisma.$transaction(async (tx) => {
        if (demanda.proposta) {
          await tx.agendaProposta.update({
            where: { demandaId: demanda.id },
            data: {
              valorContestadoUern: vNum,
              motivoContestacao: motivoContestacao.trim(),
              valorFinalHomologado: vNum, // Passa a valer como o teto para faturamento
            },
          });
        }

        const d = await tx.agendaDemanda.update({
          where: { id: demanda.id },
          data: { status: 'CONTESTADA_UERN' },
        });

        await tx.agendaDemandaTimeline.create({
          data: {
            demandaId: d.id,
            statusNovo: 'CONTESTADA_UERN',
            responsavel: session.nome,
            observacao: `Valores contestados pela fiscalização. Novo orçamento aferido pela UERN: R$ ${vNum.toFixed(2)}. Motivo: ${motivoContestacao.trim()}`,
          },
        });

        return d;
      });

      return NextResponse.json({
        success: true,
        demanda: atualizado,
        mensagem: 'Contestação de valores registrada. O orçamento aferido pela UERN passa a vincular a execução.',
      });
    }

    // =========================================================================
    // 7. FISCAL / GESTOR: AUTORIZAR EXECUÇÃO (COM PROVISIONAMENTO EM DIAS ÚTEIS)
    // =========================================================================
    if (acao === 'AUTORIZAR_EXECUCAO') {
      if (
        session.role !== 'ADMIN' &&
        session.role !== 'GESTOR_CONTRATO' &&
        session.role !== 'FISCAL_TECNICO'
      ) {
        return NextResponse.json({ error: 'Apenas o Gestor do Contrato ou Fiscal Técnico pode autorizar a execução.' }, { status: 403 });
      }

      if (!demanda.proposta) {
        return NextResponse.json({ error: 'A demanda ainda não possui proposta técnica apresentada para autorização.' }, { status: 400 });
      }

      const valorFinal = demanda.proposta.valorFinalHomologado
        ? parseFloat(demanda.proposta.valorFinalHomologado.toString())
        : parseFloat(demanda.proposta.valorTotalProposto.toString());

      // Validar disponibilidade de saldo global do contrato na rubrica de Serviços Eventuais
      const contratoAtivo = await prisma.contrato.findFirst({
        where: { ativo: true },
        select: { id: true },
      });

      if (contratoAtivo) {
        const grandezas = await obterGrandezasContrato(contratoAtivo.id);
        if (grandezas && grandezas.rubricas.servicosEventuais) {
          const saldoRestante = grandezas.rubricas.servicosEventuais.saldoDisponivel;
          if (valorFinal > saldoRestante) {
            return NextResponse.json({
              error: `Saldo insuficiente na rubrica de Serviços Eventuais (Disponível: R$ ${saldoRestante.toFixed(2)} | Necessário: R$ ${valorFinal.toFixed(2)}).`,
            }, { status: 400 });
          }
        }
      }

      const agora = new Date();
      const diasExecucao = demanda.proposta.prazoExecucaoDias || 15;
      // Contagem de prazo de execução em dias úteis
      const dataLimiteExecucao = await adicionarDiasUteis(agora, diasExecucao);

      // Avaliar a cota da unidade na agenda vs Saldo Geral do Contrato
      const cotaInfo = await obterCotaUnidadeAgenda(demanda.agendaId, demanda.unidadeId);
      let observacaoAutorizacao = '';
      let msgRetorno = '';

      if (cotaInfo?.usaSaldoGeral) {
        observacaoAutorizacao = `Execução AUTORIZADA pela fiscalização da UERN! Demanda de unidade sem cota exclusiva, provisionada diretamente no Saldo Global do Contrato (Serviços Eventuais): R$ ${valorFinal.toFixed(2)}. Prazo de ${diasExecucao} dias úteis iniciado (conclusão limite: ${dataLimiteExecucao.toLocaleDateString('pt-BR')}).`;
        msgRetorno = `Execução autorizada com sucesso! Demanda sem cota exclusiva, provisionada diretamente no Saldo Global do Contrato.`;
      } else if (cotaInfo && valorFinal > cotaInfo.saldoDisponivelCota) {
        observacaoAutorizacao = `Execução AUTORIZADA pela PROAD em caráter extraordinário! O valor homologado de R$ ${valorFinal.toFixed(2)} superou o saldo da cota da unidade (R$ ${cotaInfo.saldoDisponivelCota.toFixed(2)} disponíveis), sendo expressamente autorizado com respaldo no Saldo Global do Contrato de Serviços Eventuais. Prazo de ${diasExecucao} dias úteis iniciado (conclusão limite: ${dataLimiteExecucao.toLocaleDateString('pt-BR')}).`;
        msgRetorno = `Execução autorizada pela PROAD com respaldo no Saldo Global do Contrato (valor excedeu a cota da unidade).`;
      } else {
        observacaoAutorizacao = `Execução AUTORIZADA pela fiscalização da UERN! Valor de R$ ${valorFinal.toFixed(2)} provisionado no contrato. Prazo de ${diasExecucao} dias úteis iniciado (conclusão limite: ${dataLimiteExecucao.toLocaleDateString('pt-BR')}).`;
        msgRetorno = `Execução autorizada com sucesso! Valor provisionado no contrato e cronômetro de ${diasExecucao} dias úteis disparado.`;
      }

      const atualizado = await prisma.$transaction(async (tx) => {
        // Homologar valor final e aprovação de MO fixa se houver
        await tx.agendaProposta.update({
          where: { demandaId: demanda.id },
          data: {
            valorFinalHomologado: valorFinal,
            aprovacaoMaoObraFixa: demanda.proposta?.regimeMaoObra === 'FIXA_RESIDENTE' ? true : null,
          },
        });

        const d = await tx.agendaDemanda.update({
          where: { id: demanda.id },
          data: {
            status: 'EM_EXECUCAO',
            dataAutorizacaoUern: agora,
            autorizadoPorNome: session.nome,
            prazoExecucaoDias: diasExecucao,
            dataLimiteExecucao,
          },
        });

        await tx.agendaDemandaTimeline.create({
          data: {
            demandaId: d.id,
            statusNovo: 'EM_EXECUCAO',
            responsavel: session.nome,
            observacao: observacaoAutorizacao,
          },
        });

        return d;
      });

      return NextResponse.json({
        success: true,
        demanda: atualizado,
        mensagem: msgRetorno,
      });
    }

    // =========================================================================
    // 8. EMPRESA: CONCLUIR EXECUÇÃO (PRESTAÇÃO DE CONTAS & FOTOS DO DEPOIS)
    // =========================================================================
    if (acao === 'CONCLUIR_EXECUCAO_EMPRESA') {
      if (session.role !== 'EMPRESA' && session.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Apenas a empresa pode reportar conclusão do serviço.' }, { status: 403 });
      }

      const { relatorioExecucao, fotoDepoisUrl } = body;
      if (!fotoDepoisUrl) {
        return NextResponse.json({ error: 'A fotografia comprobatória de conclusão (DEPOIS) é obrigatória.' }, { status: 400 });
      }

      const agora = new Date();
      // Unidade demandante ganha 5 dias úteis para aprovar ou reprovar
      const prazoLimiteAceite = await adicionarDiasUteis(agora, 5);

      const atualizado = await prisma.$transaction(async (tx) => {
        // Gravar foto do depois
        await tx.agendaDemandaFoto.create({
          data: {
            demandaId: demanda.id,
            tipo: 'DEPOIS',
            url: fotoDepoisUrl,
            descricao: 'Registro fotográfico da conclusão dos serviços pela contratada',
          },
        });

        const d = await tx.agendaDemanda.update({
          where: { id: demanda.id },
          data: {
            status: 'AGUARDANDO_ACEITE_UNIDADE',
            dataConclusaoEmpresa: agora,
            relatorioExecucao: relatorioExecucao?.trim() || null,
            dataEnvioAceiteUnidade: agora,
            prazoLimiteAceite,
          },
        });

        await tx.agendaDemandaTimeline.create({
          data: {
            demandaId: d.id,
            statusNovo: 'AGUARDANDO_ACEITE_UNIDADE',
            responsavel: session.nome,
            observacao: `Serviços declarados como concluídos pela contratada. Janela de 5 dias úteis aberta para validação e aceite da unidade demandante até ${prazoLimiteAceite.toLocaleDateString('pt-BR')}.`,
          },
        });

        return d;
      });

      return NextResponse.json({
        success: true,
        demanda: atualizado,
        mensagem: 'Serviço concluído registrado! Encaminhado para aceite da unidade demandante (5 dias úteis).',
      });
    }

    // =========================================================================
    // 9. UNIDADE DEMANDANTE: ATESTAR / APROVAR OU REPROVAR (5 DIAS ÚTEIS)
    // =========================================================================
    if (acao === 'DECIDIR_ACEITE_UNIDADE') {
      const isMinhaUnidade = session.role === 'DEMANDANTE' && session.unidadeId === demanda.unidadeId;
      const isAdminOuFiscal = session.role === 'ADMIN' || session.role === 'GESTOR_CONTRATO';

      if (!isMinhaUnidade && !isAdminOuFiscal) {
        return NextResponse.json({ error: 'Apenas a unidade demandante solicitante ou a PROAD pode homologar o aceite do serviço.' }, { status: 403 });
      }

      const { aprovado, motivoReprovacao } = body;
      if (!aprovado && (!motivoReprovacao || motivoReprovacao.trim().length < 10)) {
        return NextResponse.json({ error: 'A reprovação do serviço exige a descrição dos defeitos ou inconformidades (mínimo 10 caracteres).' }, { status: 400 });
      }

      const agora = new Date();
      let novoStatus: any = aprovado ? 'CONCLUIDA' : 'EM_CORRECAO_EMPRESA';
      let prazoLimiteCorrecao: Date | null = null;

      if (!aprovado) {
        // Se reprovado, contratada ganha 5 dias úteis para sanar
        prazoLimiteCorrecao = await adicionarDiasUteis(agora, 5);
      }

      const atualizado = await prisma.$transaction(async (tx) => {
        const d = await tx.agendaDemanda.update({
          where: { id: demanda.id },
          data: {
            status: novoStatus,
            aprovadoUnidade: Boolean(aprovado),
            dataAceiteUnidade: agora,
            motivoReprovacao: !aprovado ? motivoReprovacao.trim() : null,
            dataLimiteCorrecao: prazoLimiteCorrecao,
          },
        });

        await tx.agendaDemandaTimeline.create({
          data: {
            demandaId: d.id,
            statusNovo: novoStatus,
            responsavel: session.nome,
            observacao: aprovado
              ? `Serviço APROVADO pela unidade demandante! Demanda concluída com sucesso e valor liquidado.`
              : `Serviço REPROVADO pela unidade demandante por inconformidades: ${motivoReprovacao.trim()}. A empresa possui 5 dias úteis para sanar até ${prazoLimiteCorrecao?.toLocaleDateString('pt-BR')}.`,
          },
        });

        return d;
      });

      return NextResponse.json({
        success: true,
        demanda: atualizado,
        mensagem: aprovado
          ? 'Serviço homologado com sucesso! A demanda da agenda foi concluída e o valor liquidado.'
          : 'Reprovação registrada. A empresa foi notificada e tem 5 dias úteis para realizar as correções.',
      });
    }

    return NextResponse.json({ error: 'Ação não reconhecida' }, { status: 400 });
  } catch (error: any) {
    console.error('Erro na tramitação da demanda da agenda:', error);
    return NextResponse.json({ error: 'Erro ao processar: ' + error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/agendas/demandas/[id]
 * Excluir uma demanda específica da agenda.
 */
export async function DELETE(req: Request, { params }: RouteContext) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const demanda = await prisma.agendaDemanda.findUnique({
      where: { id: params.id },
    });

    if (!demanda) {
      return NextResponse.json({ error: 'Demanda não encontrada' }, { status: 404 });
    }

    const isAdmin = session.role === 'ADMIN' || session.role === 'GESTOR_CONTRATO';
    const isAutor = demanda.criadoPorId === session.id && demanda.status === 'SUBMETIDA';

    if (!isAdmin && !isAutor) {
      return NextResponse.json({ error: 'Você não tem permissão para excluir esta demanda.' }, { status: 403 });
    }

    await prisma.agendaDemanda.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      success: true,
      mensagem: `Demanda #${demanda.numero} excluída com sucesso.`,
    });
  } catch (error: any) {
    console.error('Erro ao excluir demanda:', error);
    return NextResponse.json({ error: 'Erro ao excluir demanda: ' + error.message }, { status: 500 });
  }
}

