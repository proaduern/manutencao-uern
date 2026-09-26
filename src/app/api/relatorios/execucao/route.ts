import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/relatorios/execucao
 * Emite relatórios de execução técnica e financeira para auditoria, controle interno e prestação de contas (TCE/RN, Controladoria, Justiça).
 * Contempla os 3 Eixos com demonstrativo fotográfico (ANTES/DEPOIS), comprovantes e planilhas-resumo por Unidade/Setor.
 */
export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const tipo = searchParams.get('tipo') || 'TODOS'; // TODOS, INSUMOS, EVENTUAIS, MAO_OBRA_FIXA
    const deStr = searchParams.get('de');
    const ateStr = searchParams.get('ate');
    const unidadeId = searchParams.get('unidadeId');
    const campus = searchParams.get('campus');

    const agora = new Date();
    const inicioMesPadrao = new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString().slice(0, 10);
    const fimMesPadrao = agora.toISOString().slice(0, 10);

    const de = new Date((deStr || inicioMesPadrao) + 'T00:00:00Z');
    const ate = new Date((ateStr || fimMesPadrao) + 'T23:59:59Z');

    // 1. Obter Contrato Ativo e Parâmetros de Custos de Mão de Obra Residente
    const contratoAtivo = await prisma.contrato.findFirst({
      where: { ativo: true },
      include: {
        itensMaoObra: true,
      },
    });

    // Calcular custo horário médio do posto residente
    let custoHoraMOFixa = 22.50; // Fallback de mercado para oficial de manutenção
    let custoMensalPostoMedio = 3960.00;
    if (contratoAtivo && contratoAtivo.itensMaoObra && contratoAtivo.itensMaoObra.length > 0) {
      const somaMensal = contratoAtivo.itensMaoObra.reduce((acc, it) => {
        const val = parseFloat((it.valorMensalPosto || 0).toString());
        const qtd = it.quantidadePostos || 1;
        return acc + val * qtd;
      }, 0);
      const totalPostos = contratoAtivo.itensMaoObra.reduce((acc, it) => acc + (it.quantidadePostos || 1), 0);
      if (totalPostos > 0) {
        custoMensalPostoMedio = somaMensal / totalPostos;
        custoHoraMOFixa = Number((custoMensalPostoMedio / 220).toFixed(2)); // Carga de 220h mensais
      }
    }

    // 2. Filtro Base de Chamados no Período
    const whereChamados: any = {
      OR: [
        { atendidoEm: { gte: de, lte: ate } },
        { concluidoEm: { gte: de, lte: ate } },
        { abertoEm: { gte: de, lte: ate } },
      ],
      status: {
        in: [
          'AUTORIZADO',
          'EM_EXECUCAO',
          'ATENDIDO',
          'DEVOLVIDO',
          'EM_GARANTIA',
          'REABERTO_GARANTIA',
          'CONCLUIDO',
        ],
      },
    };

    if (unidadeId && unidadeId !== 'TODAS') {
      whereChamados.unidadeId = unidadeId;
    }
    if (campus && campus !== 'TODOS') {
      whereChamados.unidade = { campus };
    }

    const chamados = await prisma.chamado.findMany({
      where: whereChamados,
      include: {
        unidade: true,
        predio: true,
        sublocal: true,
        tipoServico: { include: { categoria: true } },
        funcionario: true,
        fotos: { orderBy: { ordem: 'asc' } },
        insumos: { orderBy: { criadoEm: 'asc' } },
      },
      orderBy: { abertoEm: 'asc' },
    });

    // =========================================================================
    // EIXO I: INSUMOS EXECUTADOS
    // =========================================================================
    let relatorioInsumos: any[] = [];
    const resumoInsumosUnidadeMap: Record<string, { unidadeNome: string; sigla: string; campus: string; qtdItens: number; valorTotal: number; chamadosSet: Set<number> }> = {};

    if (tipo === 'TODOS' || tipo === 'INSUMOS') {
      for (const ch of chamados) {
        // Filtrar insumos executados ou previstos em chamados já autorizados/atendidos
        const insumosDoChamado = ch.insumos.filter((i) => i.tipoInsumo === 'EXECUTADO' || ch.insumos.length > 0);
        const dataReferencia = ch.atendidoEm || ch.concluidoEm || ch.abertoEm;
        const mesAnoRef = `${(dataReferencia.getMonth() + 1).toString().padStart(2, '0')}/${dataReferencia.getFullYear()}`;

        const fotosAntes = ch.fotos.filter((f) => f.tipo === 'ANTES').map((f) => f.url);
        const fotosDepois = ch.fotos.filter((f) => f.tipo === 'DEPOIS').map((f) => f.url);
        const comprovantes = ch.fotos.filter((f) => f.tipo === 'COMPROVANTE').map((f) => f.url);

        for (const ins of insumosDoChamado) {
          const qtd = parseFloat(ins.quantidade.toString());
          const vUnit = parseFloat(ins.valorUnitario.toString());
          const vTot = parseFloat(ins.valorTotal.toString()) || (qtd * vUnit);

          relatorioInsumos.push({
            id: ins.id,
            mesAnoReferencia: mesAnoRef,
            dataExecucao: dataReferencia,
            codigoInsumo: ins.codigo,
            descricaoInsumo: ins.descricao,
            unidadeMedida: ins.unidadeMedida,
            quantidade: qtd,
            valorUnitario: vUnit,
            valorTotal: vTot,
            unidadeBeneficiadaId: ch.unidade.id,
            unidadeBeneficiadaNome: ch.unidade.nome,
            unidadeBeneficiadaSigla: ch.unidade.sigla,
            campus: ch.unidade.campus,
            setorBeneficiado: ch.setorEspecifico || ch.sublocal?.nome || 'Ambiente Geral',
            predioNome: ch.predio?.nome || 'Sede Principal',
            sublocalNome: ch.sublocal?.nome || null,
            chamadoId: ch.id,
            chamadoNumero: ch.numero,
            processoReferencia: `Chamado #${ch.numero.toString().padStart(3, '0')}`,
            descricaoTarefa: ch.titulo || ch.descricao,
            fotosAntes,
            fotosDepois,
            comprovantesAquisicao: comprovantes,
          });

          // Consolidar na Planilha-Resumo de Insumos
          const chave = ch.unidade.id;
          if (!resumoInsumosUnidadeMap[chave]) {
            resumoInsumosUnidadeMap[chave] = {
              unidadeNome: ch.unidade.nome,
              sigla: ch.unidade.sigla,
              campus: ch.unidade.campus,
              qtdItens: 0,
              valorTotal: 0,
              chamadosSet: new Set(),
            };
          }
          resumoInsumosUnidadeMap[chave].qtdItens += qtd;
          resumoInsumosUnidadeMap[chave].valorTotal += vTot;
          resumoInsumosUnidadeMap[chave].chamadosSet.add(ch.numero);
        }
      }
    }

    const planilhaResumoInsumos = Object.values(resumoInsumosUnidadeMap).map((item) => ({
      unidadeNome: item.unidadeNome,
      sigla: item.sigla,
      campus: item.campus,
      quantidadeItens: Number(item.qtdItens.toFixed(2)),
      valorTotal: Number(item.valorTotal.toFixed(2)),
      totalChamadosAtendidos: item.chamadosSet.size,
    })).sort((a, b) => b.valorTotal - a.valorTotal);

    // =========================================================================
    // EIXO II: SERVIÇOS EVENTUAIS EXECUTADOS
    // =========================================================================
    let relatorioServicosEventuais: any[] = [];
    const resumoEventuaisUnidadeMap: Record<string, { unidadeNome: string; sigla: string; campus: string; qtdServicos: number; valorTotal: number }> = {};

    if (tipo === 'TODOS' || tipo === 'EVENTUAIS') {
      // 1. Chamados com regime de mão de obra EVENTUAL
      const chamadosEventuais = chamados.filter((c) => c.maoObra === 'EVENTUAL');
      for (const ch of chamadosEventuais) {
        const dataReferencia = ch.atendidoEm || ch.concluidoEm || ch.abertoEm;
        const mesAnoRef = `${(dataReferencia.getMonth() + 1).toString().padStart(2, '0')}/${dataReferencia.getFullYear()}`;
        const fotosAntes = ch.fotos.filter((f) => f.tipo === 'ANTES').map((f) => f.url);
        const fotosDepois = ch.fotos.filter((f) => f.tipo === 'DEPOIS').map((f) => f.url);

        const totalInsumos = ch.insumos.reduce((acc, i) => acc + parseFloat(i.valorTotal.toString()), 0);
        const totalServico = ch.totalExecutado
          ? parseFloat(ch.totalExecutado.toString())
          : ch.totalPrevisto
          ? parseFloat(ch.totalPrevisto.toString())
          : ch.valorOrcado
          ? parseFloat(ch.valorOrcado.toString())
          : totalInsumos;

        const valorMaoObraEventual = Math.max(0, totalServico - totalInsumos);

        const descricaoInsumos = ch.insumos.length > 0
          ? ch.insumos.map((i) => `${i.descricao} (${i.quantidade} ${i.unidadeMedida})`).join('; ')
          : 'Insumos fornecidos pela contratada inclusos no escopo do serviço';

        relatorioServicosEventuais.push({
          id: ch.id,
          tipoOrigem: 'CHAMADO_EVENTUAL',
          mesAnoReferencia: mesAnoRef,
          dataExecucao: dataReferencia,
          identificacaoServico: ch.tipoServico.nome + ' - ' + (ch.titulo || ch.descricao),
          unidadeBeneficiadaId: ch.unidade.id,
          unidadeBeneficiadaNome: ch.unidade.nome,
          unidadeBeneficiadaSigla: ch.unidade.sigla,
          campus: ch.unidade.campus,
          setorBeneficiado: ch.setorEspecifico || ch.sublocal?.nome || 'Ambiente Geral',
          predioNome: ch.predio?.nome || 'Sede Principal',
          chamadoId: ch.id,
          chamadoNumero: ch.numero,
          processoReferencia: `Chamado Eventual #${ch.numero.toString().padStart(3, '0')}`,
          descricaoInsumos,
          custoInsumos: totalInsumos,
          custoMaoObraEventual: valorMaoObraEventual,
          valorTotalServico: totalServico,
          fotosAntes,
          fotosDepois,
        });

        const chave = ch.unidade.id;
        if (!resumoEventuaisUnidadeMap[chave]) {
          resumoEventuaisUnidadeMap[chave] = {
            unidadeNome: ch.unidade.nome,
            sigla: ch.unidade.sigla,
            campus: ch.unidade.campus,
            qtdServicos: 0,
            valorTotal: 0,
          };
        }
        resumoEventuaisUnidadeMap[chave].qtdServicos += 1;
        resumoEventuaisUnidadeMap[chave].valorTotal += totalServico;
      }

      // 2. Demandas da Agenda de Serviços Programados (Serviços Eventuais Estruturados)
      const whereAgendaDemanda: any = {
        criadoEm: { gte: de, lte: ate },
        status: {
          in: ['AUTORIZADA', 'EM_EXECUCAO', 'AGUARDANDO_ACEITE_UNIDADE', 'EM_CORRECAO_EMPRESA', 'CONCLUIDA'],
        },
      };
      if (unidadeId && unidadeId !== 'TODAS') {
        whereAgendaDemanda.unidadeId = unidadeId;
      }
      if (campus && campus !== 'TODOS') {
        whereAgendaDemanda.unidade = { campus };
      }

      const demandasAgenda = await prisma.agendaDemanda.findMany({
        where: whereAgendaDemanda,
        include: {
          agenda: true,
          unidade: true,
          predio: true,
          sublocal: true,
          proposta: { include: { itens: true } },
          fotos: true,
        },
        orderBy: { criadoEm: 'asc' },
      });

      for (const dem of demandasAgenda) {
        const dataReferencia = dem.dataAutorizacaoUern || dem.dataAceiteUnidade || dem.dataConclusaoEmpresa || dem.criadoEm;
        const mesAnoRef = `${(dataReferencia.getMonth() + 1).toString().padStart(2, '0')}/${dataReferencia.getFullYear()}`;
        const fotosAntes = dem.fotos.filter((f) => f.tipo === 'ANTES').map((f) => f.url);
        const fotosDepois = dem.fotos.filter((f) => f.tipo === 'DEPOIS').map((f) => f.url);

        const valFinal = dem.proposta?.valorFinalHomologado
          ? parseFloat(dem.proposta.valorFinalHomologado.toString())
          : dem.proposta?.valorTotalProposto
          ? parseFloat(dem.proposta.valorTotalProposto.toString())
          : dem.estimativaDemandante
          ? parseFloat(dem.estimativaDemandante.toString())
          : 0;

        const descricaoItens = dem.proposta?.itens?.length
          ? dem.proposta.itens.map((it) => `${it.codigoItem ? `[${it.codigoItem}] ` : ''}${it.descricao} (R$ ${parseFloat(it.valorTotal.toString()).toFixed(2)})`).join('; ')
          : dem.descricaoProblema;

        relatorioServicosEventuais.push({
          id: dem.id,
          tipoOrigem: 'AGENDA_PROGRAMADA',
          mesAnoReferencia: mesAnoRef,
          dataExecucao: dataReferencia,
          identificacaoServico: dem.titulo + ' (Agenda: ' + dem.agenda.titulo + ')',
          unidadeBeneficiadaId: dem.unidade.id,
          unidadeBeneficiadaNome: dem.unidade.nome,
          unidadeBeneficiadaSigla: dem.unidade.sigla,
          campus: dem.unidade.campus,
          setorBeneficiado: dem.sublocal?.nome || dem.localizacaoDetalhada || 'Setor Acadêmico/Administrativo',
          predioNome: dem.predio?.nome || 'Campus Regional',
          chamadoId: dem.id,
          chamadoNumero: dem.numero,
          processoReferencia: `Agenda Programada / Demanda #${dem.numero.toString().padStart(3, '0')}`,
          descricaoInsumos: descricaoItens,
          custoInsumos: valFinal * 0.45, // Proporção estimada insumos/mão de obra na composição SINAPI
          custoMaoObraEventual: valFinal * 0.55,
          valorTotalServico: valFinal,
          fotosAntes,
          fotosDepois,
        });

        const chave = dem.unidade.id;
        if (!resumoEventuaisUnidadeMap[chave]) {
          resumoEventuaisUnidadeMap[chave] = {
            unidadeNome: dem.unidade.nome,
            sigla: dem.unidade.sigla,
            campus: dem.unidade.campus,
            qtdServicos: 0,
            valorTotal: 0,
          };
        }
        resumoEventuaisUnidadeMap[chave].qtdServicos += 1;
        resumoEventuaisUnidadeMap[chave].valorTotal += valFinal;
      }
    }

    const planilhaResumoEventuais = Object.values(resumoEventuaisUnidadeMap).map((item) => ({
      unidadeNome: item.unidadeNome,
      sigla: item.sigla,
      campus: item.campus,
      totalServicosEventuais: item.qtdServicos,
      valorTotal: Number(item.valorTotal.toFixed(2)),
    })).sort((a, b) => b.valorTotal - a.valorTotal);

    // =========================================================================
    // EIXO III: TAREFAS DA MÃO DE OBRA FIXA (RESIDENTE)
    // =========================================================================
    let relatorioMaoObraFixa: any[] = [];
    const resumoMaoObraUnidadeMap: Record<string, { unidadeNome: string; sigla: string; campus: string; totalTarefas: number; totalHoras: number; totalDiarias: number; custoApropriadoTotal: number }> = {};

    if (tipo === 'TODOS' || tipo === 'MAO_OBRA_FIXA') {
      const chamadosMaoObraFixa = chamados.filter((c) => c.maoObra !== 'EVENTUAL');

      for (const ch of chamadosMaoObraFixa) {
        const dataReferencia = ch.atendidoEm || ch.concluidoEm || ch.abertoEm;
        const mesAnoRef = `${(dataReferencia.getMonth() + 1).toString().padStart(2, '0')}/${dataReferencia.getFullYear()}`;
        const fotosAntes = ch.fotos.filter((f) => f.tipo === 'ANTES').map((f) => f.url);
        const fotosDepois = ch.fotos.filter((f) => f.tipo === 'DEPOIS').map((f) => f.url);

        const horasEstimadas = ch.tempoExecucaoHoras
          ? parseFloat(ch.tempoExecucaoHoras.toString())
          : ch.tipoServico.prazoEstimadoHoras
          ? Math.min(8, Math.max(1, Number((ch.tipoServico.prazoEstimadoHoras / 12).toFixed(1))))
          : 2.5;

        const diasDeslocamento = ch.houveDeslocamento ? (ch.diasDeslocamento || 1) : 0;
        const valorDiarias = ch.valorTotalDiarias ? parseFloat(ch.valorTotalDiarias.toString()) : 0;

        // Custo proporcional apropriado da mão de obra fixa no atendimento
        const custoHorasMO = Number((horasEstimadas * custoHoraMOFixa).toFixed(2));
        const custoTotalApropriado = Number((custoHorasMO + valorDiarias).toFixed(2));

        const nomeTrabalhador = ch.funcionario?.nome || ch.trabalhadorDeslocado || 'Equipe Residente de Manutenção Predial';
        const cargoTrabalhador = ch.funcionario?.cargo || 'Oficial de Manutenção';

        const insumosDescricao = ch.insumos.length > 0
          ? ch.insumos.map((i) => `${i.descricao} (${i.quantidade} ${i.unidadeMedida})`).join('; ')
          : 'Ferramental e insumos de almoxarifado residente';

        relatorioMaoObraFixa.push({
          id: ch.id,
          mesAnoReferencia: mesAnoRef,
          dataExecucao: dataReferencia,
          identificacaoServico: ch.tipoServico.nome + ' - ' + (ch.titulo || ch.descricao),
          unidadeBeneficiadaId: ch.unidade.id,
          unidadeBeneficiadaNome: ch.unidade.nome,
          unidadeBeneficiadaSigla: ch.unidade.sigla,
          campus: ch.unidade.campus,
          setorBeneficiado: ch.setorEspecifico || ch.sublocal?.nome || 'Ambiente Geral',
          predioNome: ch.predio?.nome || 'Sede Principal',
          chamadoId: ch.id,
          chamadoNumero: ch.numero,
          processoReferencia: `Chamado Rotineiro #${ch.numero.toString().padStart(3, '0')}`,
          descricaoInsumos: insumosDescricao,
          tempoExecucaoHoras: horasEstimadas,
          houveDeslocamento: ch.houveDeslocamento,
          diasDeslocamento,
          valorTotalDiarias: valorDiarias,
          nomeCompletoTrabalhador: nomeTrabalhador,
          cargoTrabalhador,
          custoHoraReferencia: custoHoraMOFixa,
          custoMaoObraApropriado: custoTotalApropriado,
          fotosAntes,
          fotosDepois,
        });

        const chave = ch.unidade.id;
        if (!resumoMaoObraUnidadeMap[chave]) {
          resumoMaoObraUnidadeMap[chave] = {
            unidadeNome: ch.unidade.nome,
            sigla: ch.unidade.sigla,
            campus: ch.unidade.campus,
            totalTarefas: 0,
            totalHoras: 0,
            totalDiarias: 0,
            custoApropriadoTotal: 0,
          };
        }
        resumoMaoObraUnidadeMap[chave].totalTarefas += 1;
        resumoMaoObraUnidadeMap[chave].totalHoras += horasEstimadas;
        resumoMaoObraUnidadeMap[chave].totalDiarias += valorDiarias;
        resumoMaoObraUnidadeMap[chave].custoApropriadoTotal += custoTotalApropriado;
      }
    }

    const planilhaResumoMaoObra = Object.values(resumoMaoObraUnidadeMap).map((item) => ({
      unidadeNome: item.unidadeNome,
      sigla: item.sigla,
      campus: item.campus,
      totalTarefas: item.totalTarefas,
      totalHorasDedicadas: Number(item.totalHoras.toFixed(1)),
      totalDiariasDeslocamento: Number(item.totalDiarias.toFixed(2)),
      custoApropriadoMaoObra: Number(item.custoApropriadoTotal.toFixed(2)),
    })).sort((a, b) => b.custoApropriadoMaoObra - a.custoApropriadoMaoObra);

    // =========================================================================
    // TOTAIS GERAIS CONSOLIDADOS
    // =========================================================================
    const totalGastoInsumos = relatorioInsumos.reduce((acc, i) => acc + i.valorTotal, 0);
    const totalGastoEventuais = relatorioServicosEventuais.reduce((acc, s) => acc + s.valorTotalServico, 0);
    const totalCustoApropriadoMOFixa = relatorioMaoObraFixa.reduce((acc, m) => acc + m.custoMaoObraApropriado, 0);
    const totalDiarias = relatorioMaoObraFixa.reduce((acc, m) => acc + m.valorTotalDiarias, 0);

    // Lista de todas as unidades para abastecer dropdowns no frontend
    const unidadesDisponiveis = await prisma.unidade.findMany({
      where: { ativo: true },
      select: { id: true, nome: true, sigla: true, campus: true },
      orderBy: { nome: 'asc' },
    });

    const campiDisponiveis = Array.from(new Set(unidadesDisponiveis.map((u) => u.campus))).filter(Boolean);

    return NextResponse.json({
      periodo: {
        de: de.toISOString().slice(0, 10),
        ate: ate.toISOString().slice(0, 10),
      },
      contratoReferencia: contratoAtivo
        ? {
            numero: contratoAtivo.numero,
            ano: contratoAtivo.ano,
            objeto: contratoAtivo.objeto,
            custoHoraMOFixa,
            custoMensalPostoMedio,
          }
        : null,
      totaisConsolidados: {
        totalInsumos: Number(totalGastoInsumos.toFixed(2)),
        totalServicosEventuais: Number(totalGastoEventuais.toFixed(2)),
        totalMaoObraFixaApropriada: Number(totalCustoApropriadoMOFixa.toFixed(2)),
        totalDiariasDeslocamento: Number(totalDiarias.toFixed(2)),
        totalGeralExecutado: Number((totalGastoInsumos + totalGastoEventuais + totalCustoApropriadoMOFixa).toFixed(2)),
        contagemInsumos: relatorioInsumos.length,
        contagemServicosEventuais: relatorioServicosEventuais.length,
        contagemTarefasMOFixa: relatorioMaoObraFixa.length,
      },
      eixoI_Insumos: {
        itens: relatorioInsumos,
        planilhaResumo: planilhaResumoInsumos,
      },
      eixoII_ServicosEventuais: {
        itens: relatorioServicosEventuais,
        planilhaResumo: planilhaResumoEventuais,
      },
      eixoIII_MaoObraFixa: {
        itens: relatorioMaoObraFixa,
        planilhaResumo: planilhaResumoMaoObra,
      },
      unidadesDisponiveis,
      campiDisponiveis,
    });
  } catch (error: any) {
    console.error('Erro ao gerar relatório de execução e prestação de contas:', error);
    return NextResponse.json({ error: 'Erro ao gerar relatório de execução: ' + error.message }, { status: 500 });
  }
}
