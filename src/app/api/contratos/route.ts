import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { obterGrandezasContrato } from '@/lib/services/contrato';

export const dynamic = 'force-dynamic';

// Função de cálculo proporcional à vigência
function calcularValoresContrato(
  dataInicio: Date,
  dataFim: Date,
  valorAnualServicosEventuais: number,
  valorAnualInsumos: number,
  valorAnualDiarias: number = 0,
  itensMaoObra: Array<{ quantidadePostos: number; valorMensalPosto: number }>
) {
  const diffTime = Math.abs(dataFim.getTime() - dataInicio.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const mesesVigencia = Math.max(1, Math.round(diffDays / 30.4375));

  let custoMensalMaoObra = 0;
  for (const item of itensMaoObra) {
    const q = Number(item.quantidadePostos) || 0;
    const v = Number(item.valorMensalPosto) || 0;
    custoMensalMaoObra += q * v;
  }
  const valorTotalMaoObra = custoMensalMaoObra * mesesVigencia;

  const valorServicosEventuaisProporcional = (Number(valorAnualServicosEventuais || 0) / 12) * mesesVigencia;
  const valorInsumosProporcional = (Number(valorAnualInsumos || 0) / 12) * mesesVigencia;
  const valorDiariasProporcional = (Number(valorAnualDiarias || 0) / 12) * mesesVigencia;
  const valorTotalContrato = valorTotalMaoObra + valorServicosEventuaisProporcional + valorInsumosProporcional + valorDiariasProporcional;

  return {
    mesesVigencia,
    custoMensalMaoObra,
    valorTotalMaoObra: Number(valorTotalMaoObra.toFixed(2)),
    valorServicosEventuaisProporcional: Number(valorServicosEventuaisProporcional.toFixed(2)),
    valorInsumosProporcional: Number(valorInsumosProporcional.toFixed(2)),
    valorDiariasProporcional: Number(valorDiariasProporcional.toFixed(2)),
    valorTotalContrato: Number(valorTotalContrato.toFixed(2)),
  };
}

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const contratoIdParam = searchParams.get('id');

    // 1. Buscar todos os contratos cadastrados para permitir alternância
    const todosContratos = await prisma.contrato.findMany({
      orderBy: [{ ano: 'desc' }, { numero: 'desc' }],
      include: {
        empresa: { select: { id: true, razaoSocial: true, cnpj: true } },
      },
    });

    if (todosContratos.length === 0) {
      const [empresas, todasUnidades] = await Promise.all([
        prisma.empresa.findMany({ where: { ativo: true }, orderBy: { razaoSocial: 'asc' } }),
        prisma.unidade.findMany({ where: { ativo: true }, orderBy: { nome: 'asc' } }),
      ]);
      return NextResponse.json({ contrato: null, todosContratos: [], cotas: [], empresas, todasUnidades });
    }

    // Selecionar o contrato solicitado ou o primeiro ativo
    const idBusca = contratoIdParam || todosContratos.find((c) => c.ativo)?.id || todosContratos[0].id;

    const [contrato, empresas, todasUnidades] = await Promise.all([
      prisma.contrato.findUnique({
        where: { id: idBusca },
        include: {
          empresa: true,
          itensMaoObra: {
            include: {
              funcionarios: { where: { ativo: true }, orderBy: { nomeCompleto: 'asc' } },
            },
            orderBy: { funcao: 'asc' },
          },
          repactuacoes: { orderBy: { dataRepactuacao: 'desc' } },
          aditivos: { orderBy: { criadoEm: 'desc' } },
          unidades: {
            include: {
              unidade: { select: { id: true, nome: true, campus: true, sigla: true, email: true, telefone: true } },
            },
            orderBy: { unidade: { nome: 'asc' } },
          },
        },
      }),
      prisma.empresa.findMany({
        where: { ativo: true },
        include: {
          _count: { select: { contratos: true } },
        },
        orderBy: { razaoSocial: 'asc' },
      }),
      prisma.unidade.findMany({
        where: { ativo: true },
        select: { id: true, nome: true, campus: true, sigla: true },
        orderBy: { nome: 'asc' },
      }),
    ]);

    if (!contrato) {
      return NextResponse.json({ error: 'Contrato não encontrado' }, { status: 404 });
    }

    // Calcular as Três Grandezas Financeiras da Seção 8 (Contratado, Provisionado, Liquidado e Disponível)
    const dadosGrandezas = await obterGrandezasContrato(idBusca);

    if (!dadosGrandezas) {
      return NextResponse.json({ error: 'Erro ao calcular grandezas do contrato' }, { status: 500 });
    }

    const { grandezasContrato, cotas: cotasGrandezas } = dadosGrandezas;

    // Formatar Itens de Mão de Obra
    const itensMaoObraFormatados = contrato.itensMaoObra.map((item) => {
      const q = item.quantidadePostos;
      const v = parseFloat(item.valorMensalPosto.toString());
      const totalMensal = q * v;
      const meses = contrato.mesesVigencia || 12;
      const totalVigencia = totalMensal * meses;

      return {
        id: item.id,
        funcao: item.funcao,
        quantidadePostos: q,
        valorMensalPosto: v,
        valorTotalMensal: totalMensal,
        valorTotalVigencia: totalVigencia,
        funcionarios: item.funcionarios.map((f) => ({
          id: f.id,
          nomeCompleto: f.nomeCompleto,
          cpf: f.cpf,
        })),
      };
    });

    // Formatar cotas das unidades demandantes com as três grandezas separadas
    const cotasFormatadas = cotasGrandezas.map((c) => ({
      ...c,
      cotaAnual: c.cotaContratada,
      consumido: c.valorProvisionado + c.valorLiquidado,
      saldo: c.saldoDisponivel,
    }));

    return NextResponse.json({
      contrato: {
        ...contrato,
        valorTotal: grandezasContrato.valorContratado,
        valorContratado: grandezasContrato.valorContratado,
        valorProvisionado: grandezasContrato.valorProvisionado,
        valorLiquidado: grandezasContrato.valorLiquidado,
        saldoDisponivel: grandezasContrato.saldoDisponivel,
        percentualConsumido: grandezasContrato.percentualConsumido,
        totalProvisionado: grandezasContrato.valorProvisionado,
        totalLiquidado: grandezasContrato.valorLiquidado,
        valorAnualServicosEventuais: contrato.valorAnualServicosEventuais ? parseFloat(contrato.valorAnualServicosEventuais.toString()) : 0,
        valorAnualInsumos: contrato.valorAnualInsumos ? parseFloat(contrato.valorAnualInsumos.toString()) : 0,
        valorAnualDiarias: contrato.valorAnualDiarias ? parseFloat(contrato.valorAnualDiarias.toString()) : 0,
        valorDiariaUnitario: contrato.valorDiariaUnitario ? parseFloat(contrato.valorDiariaUnitario.toString()) : 150.0,
        valorMaoObraResidente: contrato.valorMaoObraResidente ? parseFloat(contrato.valorMaoObraResidente.toString()) : 0,
        valorServicosEventuais: contrato.valorServicosEventuais ? parseFloat(contrato.valorServicosEventuais.toString()) : 0,
        valorInsumos: contrato.valorInsumos ? parseFloat(contrato.valorInsumos.toString()) : 0,
        valorDiarias: contrato.valorDiarias ? parseFloat(contrato.valorDiarias.toString()) : 0,
        itensMaoObra: itensMaoObraFormatados,
      },
      rubricas: dadosGrandezas.rubricas,
      todosContratos: todosContratos.map((c) => ({
        id: c.id,
        numero: c.numero,
        ano: c.ano,
        empresaNome: c.empresa.razaoSocial,
        valorTotal: parseFloat(c.valorTotal.toString()),
        ativo: c.ativo,
      })),
      cotas: cotasFormatadas,
      empresas,
      todasUnidades,
    });
  } catch (error: any) {
    console.error('Erro ao buscar contratos:', error);
    return NextResponse.json({ error: 'Erro ao carregar dados do contrato' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'GESTOR_CONTRATO')) {
      return NextResponse.json({ error: 'Apenas Administrador ou Gestor de Contrato' }, { status: 403 });
    }

    const body = await req.json();
    const { acao } = body;

    // 1. Cadastrar Novo Contrato com Cálculo Proporcional Automático
    if (acao === 'CRIAR_CONTRATO') {
      const {
        numero,
        ano,
        empresaId,
        dataInicio,
        dataFim,
        objeto,
        valorAnualServicosEventuais,
        valorAnualInsumos,
        valorAnualDiarias,
        valorDiariaUnitario,
        itensMaoObra, // array de { funcao, quantidadePostos, valorMensalPosto, funcionarios: [{ nomeCompleto, cpf }] }
      } = body;

      if (!numero || !ano || !empresaId || !dataInicio || !dataFim) {
        return NextResponse.json({ error: 'Número, ano, empresa, data de início e término são obrigatórios.' }, { status: 400 });
      }

      const dtInicio = new Date(dataInicio);
      const dtFim = new Date(dataFim);

      if (dtFim <= dtInicio) {
        return NextResponse.json({ error: 'A data de término deve ser posterior à data de início.' }, { status: 400 });
      }

      const calc = calcularValoresContrato(
        dtInicio,
        dtFim,
        parseFloat(valorAnualServicosEventuais || '0'),
        parseFloat(valorAnualInsumos || '0'),
        parseFloat(valorAnualDiarias || '0'),
        Array.isArray(itensMaoObra) ? itensMaoObra : []
      );

      const novoContrato = await prisma.$transaction(async (tx) => {
        const c = await tx.contrato.create({
          data: {
            numero: numero.trim(),
            ano: parseInt(ano),
            objeto: objeto?.trim() || `Contrato de Prestação de Serviços de Manutenção Predial nº ${numero}/${ano}`,
            empresaId,
            dataInicio: dtInicio,
            dataFim: dtFim,
            mesesVigencia: calc.mesesVigencia,
            valorAnualServicosEventuais: parseFloat(valorAnualServicosEventuais || '0'),
            valorAnualInsumos: parseFloat(valorAnualInsumos || '0'),
            valorAnualDiarias: parseFloat(valorAnualDiarias || '0'),
            valorDiariaUnitario: parseFloat(valorDiariaUnitario || '150'),
            valorMaoObraResidente: calc.valorTotalMaoObra,
            valorServicosEventuais: calc.valorServicosEventuaisProporcional,
            valorInsumos: calc.valorInsumosProporcional,
            valorDiarias: calc.valorDiariasProporcional,
            valorTotal: calc.valorTotalContrato,
            saldoDisponivel: calc.valorTotalContrato,
            ativo: true,
          },
        });

        // Inserir itens de mão de obra e seus funcionários vinculados
        if (Array.isArray(itensMaoObra) && itensMaoObra.length > 0) {
          for (const item of itensMaoObra) {
            const q = parseInt(item.quantidadePostos) || 1;
            const v = parseFloat(item.valorMensalPosto) || 0;

            const itemCriado = await tx.contratoItemMaoObra.create({
              data: {
                contratoId: c.id,
                funcao: item.funcao.trim(),
                quantidadePostos: q,
                valorMensalPosto: v,
                valorTotalMensal: q * v,
              },
            });

            if (Array.isArray(item.funcionarios) && item.funcionarios.length > 0) {
              for (const func of item.funcionarios) {
                if (func.nomeCompleto && func.cpf) {
                  await tx.contratoFuncionarioPosto.create({
                    data: {
                      itemMaoObraId: itemCriado.id,
                      nomeCompleto: func.nomeCompleto.trim(),
                      cpf: func.cpf.trim(),
                      ativo: true,
                    },
                  });
                }
              }
            }
          }
        }

        return c;
      }, { maxWait: 15000, timeout: 30000 });

      return NextResponse.json({ success: true, contrato: novoContrato }, { status: 201 });
    }

    // 2. Editar Contrato Existente e Recalcular Proporcionalmente
    if (acao === 'EDITAR_CONTRATO') {
      const {
        contratoId,
        numero,
        ano,
        empresaId,
        dataInicio,
        dataFim,
        objeto,
        valorAnualServicosEventuais,
        valorAnualInsumos,
        valorAnualDiarias,
        valorDiariaUnitario,
        itensMaoObra, // array opcional com { id, funcao, quantidadePostos, valorMensalPosto }
      } = body;

      if (!contratoId) {
        return NextResponse.json({ error: 'ID do contrato é obrigatório.' }, { status: 400 });
      }

      const contratoExistente = await prisma.contrato.findUnique({
        where: { id: contratoId },
        include: { itensMaoObra: true },
      });

      if (!contratoExistente) {
        return NextResponse.json({ error: 'Contrato não encontrado.' }, { status: 404 });
      }

      const dtInicio = dataInicio ? new Date(dataInicio) : contratoExistente.dataInicio;
      const dtFim = dataFim ? new Date(dataFim) : contratoExistente.dataFim;

      const contratoAtualizado = await prisma.$transaction(async (tx) => {
        // Sincronizar itens de mão de obra se fornecidos
        if (Array.isArray(itensMaoObra)) {
          const idsEnviados = itensMaoObra.filter((i) => i.id).map((i) => i.id);

          // Remover itens que não foram enviados
          await tx.contratoItemMaoObra.deleteMany({
            where: {
              contratoId,
              id: { notIn: idsEnviados },
            },
          });

          // Atualizar ou criar itens enviados
          for (const item of itensMaoObra) {
            const q = parseInt(item.quantidadePostos) || 1;
            const v = parseFloat(item.valorMensalPosto) || 0;

            let itemAtualId = item.id;

            if (item.id) {
              await tx.contratoItemMaoObra.update({
                where: { id: item.id },
                data: {
                  funcao: item.funcao?.trim(),
                  quantidadePostos: q,
                  valorMensalPosto: v,
                  valorTotalMensal: q * v,
                },
              });
            } else if (item.funcao?.trim()) {
              const novoItem = await tx.contratoItemMaoObra.create({
                data: {
                  contratoId,
                  funcao: item.funcao.trim(),
                  quantidadePostos: q,
                  valorMensalPosto: v,
                  valorTotalMensal: q * v,
                },
              });
              itemAtualId = novoItem.id;
            }

            // Sincronizar funcionários vinculados a este posto se fornecidos
            if (itemAtualId && Array.isArray(item.funcionarios)) {
              const funcIdsEnviados = item.funcionarios.filter((f: any) => f.id).map((f: any) => f.id);

              await tx.contratoFuncionarioPosto.deleteMany({
                where: {
                  itemMaoObraId: itemAtualId,
                  id: { notIn: funcIdsEnviados },
                },
              });

              for (const func of item.funcionarios) {
                if (func.nomeCompleto?.trim() && func.cpf?.trim()) {
                  if (func.id) {
                    await tx.contratoFuncionarioPosto.update({
                      where: { id: func.id },
                      data: {
                        nomeCompleto: func.nomeCompleto.trim(),
                        cpf: func.cpf.trim(),
                      },
                    });
                  } else {
                    await tx.contratoFuncionarioPosto.create({
                      data: {
                        itemMaoObraId: itemAtualId,
                        nomeCompleto: func.nomeCompleto.trim(),
                        cpf: func.cpf.trim(),
                        ativo: true,
                      },
                    });
                  }
                }
              }
            }
          }
        }

        // Buscar lista atualizada de itens de mão de obra
        const itensAtualizados = await tx.contratoItemMaoObra.findMany({
          where: { contratoId },
        });

        const vServicos = valorAnualServicosEventuais !== undefined ? parseFloat(valorAnualServicosEventuais) : parseFloat(contratoExistente.valorAnualServicosEventuais?.toString() || '0');
        const vInsumos = valorAnualInsumos !== undefined ? parseFloat(valorAnualInsumos) : parseFloat(contratoExistente.valorAnualInsumos?.toString() || '0');
        const vDiarias = valorAnualDiarias !== undefined ? parseFloat(valorAnualDiarias) : parseFloat(contratoExistente.valorAnualDiarias?.toString() || '0');
        const vDiariaUnit = valorDiariaUnitario !== undefined ? parseFloat(valorDiariaUnitario) : parseFloat(contratoExistente.valorDiariaUnitario?.toString() || '150');

        const calc = calcularValoresContrato(
          dtInicio,
          dtFim,
          vServicos,
          vInsumos,
          vDiarias,
          itensAtualizados.map((i) => ({
            quantidadePostos: i.quantidadePostos,
            valorMensalPosto: parseFloat(i.valorMensalPosto.toString()),
          }))
        );

        const atualizado = await tx.contrato.update({
          where: { id: contratoId },
          data: {
            numero: numero !== undefined ? numero.trim() : undefined,
            ano: ano !== undefined ? parseInt(ano) : undefined,
            empresaId: empresaId || undefined,
            objeto: objeto !== undefined ? objeto.trim() : undefined,
            dataInicio: dtInicio,
            dataFim: dtFim,
            mesesVigencia: calc.mesesVigencia,
            valorAnualServicosEventuais: vServicos,
            valorAnualInsumos: vInsumos,
            valorAnualDiarias: vDiarias,
            valorDiariaUnitario: vDiariaUnit,
            valorMaoObraResidente: calc.valorTotalMaoObra,
            valorServicosEventuais: calc.valorServicosEventuaisProporcional,
            valorInsumos: calc.valorInsumosProporcional,
            valorDiarias: calc.valorDiariasProporcional,
            valorTotal: calc.valorTotalContrato,
          },
        });

        return atualizado;
      }, { maxWait: 15000, timeout: 30000 });

      return NextResponse.json({ success: true, contrato: contratoAtualizado });
    }

    // 2.1 Cadastrar ou Editar Trabalhador Vinculado a uma Função
    if (acao === 'SALVAR_TRABALHADOR') {
      const { funcionarioId, itemMaoObraId, nomeCompleto, cpf } = body;

      if (!itemMaoObraId || !nomeCompleto || !cpf) {
        return NextResponse.json({ error: 'Função de vínculo, nome completo e CPF são obrigatórios.' }, { status: 400 });
      }

      if (funcionarioId) {
        // Atualizar
        const trabalhadorAtualizado = await prisma.contratoFuncionarioPosto.update({
          where: { id: funcionarioId },
          data: {
            itemMaoObraId,
            nomeCompleto: nomeCompleto.trim(),
            cpf: cpf.trim(),
          },
        });
        return NextResponse.json({ success: true, trabalhador: trabalhadorAtualizado });
      } else {
        // Criar
        const novoTrabalhador = await prisma.contratoFuncionarioPosto.create({
          data: {
            itemMaoObraId,
            nomeCompleto: nomeCompleto.trim(),
            cpf: cpf.trim(),
            ativo: true,
          },
        });
        return NextResponse.json({ success: true, trabalhador: novoTrabalhador }, { status: 201 });
      }
    }

    // 3. Adicionar Item de Mão de Obra Residente ao Contrato
    if (acao === 'ADICIONAR_ITEM_MAO_OBRA') {
      const { contratoId, funcao, quantidadePostos, valorMensalPosto, funcionarios } = body;

      if (!contratoId || !funcao || !quantidadePostos || !valorMensalPosto) {
        return NextResponse.json({ error: 'Função, quantidade de postos e valor mensal são obrigatórios.' }, { status: 400 });
      }

      const q = parseInt(quantidadePostos);
      const v = parseFloat(valorMensalPosto);

      const itemCriado = await prisma.$transaction(async (tx) => {
        const item = await tx.contratoItemMaoObra.create({
          data: {
            contratoId,
            funcao: funcao.trim(),
            quantidadePostos: q,
            valorMensalPosto: v,
            valorTotalMensal: q * v,
          },
        });

        if (Array.isArray(funcionarios)) {
          for (const func of funcionarios) {
            if (func.nomeCompleto && func.cpf) {
              await tx.contratoFuncionarioPosto.create({
                data: {
                  itemMaoObraId: item.id,
                  nomeCompleto: func.nomeCompleto.trim(),
                  cpf: func.cpf.trim(),
                  ativo: true,
                },
              });
            }
          }
        }

        // Recalcular totais do contrato
        const c = await tx.contrato.findUnique({
          where: { id: contratoId },
          include: { itensMaoObra: true },
        });

        if (c) {
          const calc = calcularValoresContrato(
            c.dataInicio,
            c.dataFim,
            parseFloat(c.valorAnualServicosEventuais?.toString() || '0'),
            parseFloat(c.valorAnualInsumos?.toString() || '0'),
            parseFloat(c.valorAnualDiarias?.toString() || '0'),
            c.itensMaoObra.map((i) => ({
              quantidadePostos: i.quantidadePostos,
              valorMensalPosto: parseFloat(i.valorMensalPosto.toString()),
            }))
          );

          await tx.contrato.update({
            where: { id: contratoId },
            data: {
              valorMaoObraResidente: calc.valorTotalMaoObra,
              valorDiarias: calc.valorDiariasProporcional,
              valorTotal: calc.valorTotalContrato,
            },
          });
        }

        return item;
      }, { maxWait: 15000, timeout: 30000 });

      return NextResponse.json({ success: true, item: itemCriado }, { status: 201 });
    }

    // 3.1 Editar Item de Mão de Obra Residente Existente
    if (acao === 'EDITAR_ITEM_MAO_OBRA') {
      const { itemId, contratoId, funcao, quantidadePostos, valorMensalPosto } = body;

      if (!itemId || !funcao || !quantidadePostos || !valorMensalPosto) {
        return NextResponse.json({ error: 'ID do item, função, quantidade de postos e valor mensal são obrigatórios.' }, { status: 400 });
      }

      const q = parseInt(quantidadePostos);
      const v = parseFloat(valorMensalPosto);

      const itemAtualizado = await prisma.$transaction(async (tx) => {
        const item = await tx.contratoItemMaoObra.update({
          where: { id: itemId },
          data: {
            funcao: funcao.trim(),
            quantidadePostos: q,
            valorMensalPosto: v,
            valorTotalMensal: q * v,
          },
        });

        const idContrato = contratoId || item.contratoId;

        // Recalcular totais do contrato
        const c = await tx.contrato.findUnique({
          where: { id: idContrato },
          include: { itensMaoObra: true },
        });

        if (c) {
          const calc = calcularValoresContrato(
            c.dataInicio,
            c.dataFim,
            parseFloat(c.valorAnualServicosEventuais?.toString() || '0'),
            parseFloat(c.valorAnualInsumos?.toString() || '0'),
            parseFloat(c.valorAnualDiarias?.toString() || '0'),
            c.itensMaoObra.map((i) => ({
              quantidadePostos: i.quantidadePostos,
              valorMensalPosto: parseFloat(i.valorMensalPosto.toString()),
            }))
          );

          await tx.contrato.update({
            where: { id: idContrato },
            data: {
              valorMaoObraResidente: calc.valorTotalMaoObra,
              valorDiarias: calc.valorDiariasProporcional,
              valorTotal: calc.valorTotalContrato,
            },
          });
        }

        return item;
      }, { maxWait: 15000, timeout: 30000 });

      return NextResponse.json({ success: true, item: itemAtualizado });
    }

    // 4. Repactuação de Posto por Convenção Coletiva
    if (acao === 'REPACTUAR_POSTO') {
      const { itemId, novoValorMensalPosto, motivo, detalhes, numeroRepactuacao } = body;

      if (!itemId || !novoValorMensalPosto || !motivo) {
        return NextResponse.json({ error: 'Item, novo valor do posto e motivo da convenção coletiva são obrigatórios.' }, { status: 400 });
      }

      const novoValor = parseFloat(novoValorMensalPosto);

      const repactuacao = await prisma.$transaction(async (tx) => {
        const item = await tx.contratoItemMaoObra.findUnique({
          where: { id: itemId },
          include: { contrato: true },
        });

        if (!item) throw new Error('Item de mão de obra não encontrado.');

        const valorAnterior = parseFloat(item.valorMensalPosto.toString());
        const diferencaMensal = (novoValor - valorAnterior) * item.quantidadePostos;
        const meses = item.contrato.mesesVigencia || 12;
        const diferencaTotal = diferencaMensal * meses;

        // Atualizar valor do item
        await tx.contratoItemMaoObra.update({
          where: { id: itemId },
          data: {
            valorMensalPosto: novoValor,
            valorTotalMensal: item.quantidadePostos * novoValor,
          },
        });

        // Registrar termo de repactuação
        const rep = await tx.contratoRepactuacao.create({
          data: {
            contratoId: item.contratoId,
            numero: numeroRepactuacao || `Repactuação CCT - ${item.funcao}`,
            motivo: motivo.trim(),
            detalhes: detalhes || `Reajuste de posto da função ${item.funcao} de R$ ${valorAnterior.toFixed(2)} para R$ ${novoValor.toFixed(2)}`,
            valorAjusteTotal: diferencaTotal,
          },
        });

        // Recalcular contrato
        const itensAtualizados = await tx.contratoItemMaoObra.findMany({
          where: { contratoId: item.contratoId },
        });

        const calc = calcularValoresContrato(
          item.contrato.dataInicio,
          item.contrato.dataFim,
          parseFloat(item.contrato.valorAnualServicosEventuais?.toString() || '0'),
          parseFloat(item.contrato.valorAnualInsumos?.toString() || '0'),
          parseFloat(item.contrato.valorAnualDiarias?.toString() || '0'),
          itensAtualizados.map((i) => ({
            quantidadePostos: i.quantidadePostos,
            valorMensalPosto: parseFloat(i.valorMensalPosto.toString()),
          }))
        );

        await tx.contrato.update({
          where: { id: item.contratoId },
          data: {
            valorMaoObraResidente: calc.valorTotalMaoObra,
            valorDiarias: calc.valorDiariasProporcional,
            valorTotal: calc.valorTotalContrato,
          },
        });

        return rep;
      });

      return NextResponse.json({ success: true, repactuacao });
    }

    // 5. Vincular Funcionário a um Posto de Mão de Obra
    if (acao === 'VINCULAR_FUNCIONARIO') {
      const { itemMaoObraId, nomeCompleto, cpf } = body;

      if (!itemMaoObraId || !nomeCompleto || !cpf) {
        return NextResponse.json({ error: 'Posto, nome completo e CPF são obrigatórios.' }, { status: 400 });
      }

      const novoFuncionario = await prisma.contratoFuncionarioPosto.create({
        data: {
          itemMaoObraId,
          nomeCompleto: nomeCompleto.trim(),
          cpf: cpf.trim(),
          ativo: true,
        },
      });

      return NextResponse.json({ success: true, funcionario: novoFuncionario }, { status: 201 });
    }

    // 6. Definir Cota de Unidade
    if (acao === 'DEFINIR_COTA') {
      const { contratoId, unidadeId, cotaMensal, cotaAnual } = body;
      if (!contratoId || !unidadeId || !cotaAnual) {
        return NextResponse.json({ error: 'Contrato, unidade e cota anual são obrigatórios.' }, { status: 400 });
      }

      const cAnual = parseFloat(cotaAnual);
      const cMensal = cotaMensal ? parseFloat(cotaMensal) : cAnual / 12;

      const cota = await prisma.contratoUnidade.upsert({
        where: { contratoId_unidadeId: { contratoId, unidadeId } },
        update: {
          cotaAnual: cAnual,
          cotaMensal: cMensal,
          saldoDisponivel: cAnual,
        },
        create: {
          contratoId,
          unidadeId,
          cotaAnual: cAnual,
          cotaMensal: cMensal,
          saldoDisponivel: cAnual,
        },
      });

      return NextResponse.json({ success: true, cota });
    }

    // 7. Cadastrar Nova Empresa Contratada
    if (acao === 'CRIAR_EMPRESA') {
      const { razaoSocial, nomeFantasia, cnpj, email, telefone } = body;
      if (!razaoSocial || !cnpj || !email) {
        return NextResponse.json({ error: 'Razão Social, CNPJ e E-mail são obrigatórios.' }, { status: 400 });
      }

      const existe = await prisma.empresa.findFirst({
        where: { cnpj: cnpj.trim() },
      });

      if (existe) {
        return NextResponse.json({ error: 'Já existe uma empresa contratada cadastrada com este CNPJ.' }, { status: 400 });
      }

      const novaEmpresa = await prisma.empresa.create({
        data: {
          razaoSocial: razaoSocial.trim(),
          nomeFantasia: nomeFantasia ? nomeFantasia.trim() : null,
          cnpj: cnpj.trim(),
          email: email.trim().toLowerCase(),
          telefone: telefone ? telefone.trim() : null,
          ativo: true,
        },
      });

      return NextResponse.json({ success: true, empresa: novaEmpresa }, { status: 201 });
    }

    // 8. Editar Empresa Contratada
    if (acao === 'EDITAR_EMPRESA') {
      const { empresaId, razaoSocial, nomeFantasia, cnpj, email, telefone } = body;
      if (!empresaId || !razaoSocial || !cnpj || !email) {
        return NextResponse.json({ error: 'ID, Razão Social, CNPJ e E-mail são obrigatórios.' }, { status: 400 });
      }

      const empresaAtualizada = await prisma.empresa.update({
        where: { id: empresaId },
        data: {
          razaoSocial: razaoSocial.trim(),
          nomeFantasia: nomeFantasia ? nomeFantasia.trim() : null,
          cnpj: cnpj.trim(),
          email: email.trim().toLowerCase(),
          telefone: telefone ? telefone.trim() : null,
        },
      });

      return NextResponse.json({ success: true, empresa: empresaAtualizada });
    }

    // 9. Cadastrar Termo Aditivo
    const { contratoId, numero, tipo, valorAjuste, novaDataFim, notaEmpenho, dataReforcoEmpenho, objeto } = body;

    if (!contratoId || !numero || !tipo) {
      return NextResponse.json({ error: 'Dados incompletos para aditivo.' }, { status: 400 });
    }

    if (tipo === 'VALOR') {
      if (!valorAjuste || !notaEmpenho || !dataReforcoEmpenho) {
        return NextResponse.json({ error: 'Aditivo de valor exige valor de acréscimo, nota de empenho e data do reforço.' }, { status: 400 });
      }
    }

    const aditivoCriado = await prisma.$transaction(async (tx) => {
      const aditivo = await tx.contratoAditivo.create({
        data: {
          contratoId,
          numero,
          tipo,
          valorAjuste: tipo === 'VALOR' ? parseFloat(valorAjuste) : null,
          novaDataFim: tipo === 'PRAZO' && novaDataFim ? new Date(novaDataFim) : null,
          notaEmpenho: tipo === 'VALOR' ? notaEmpenho : null,
          dataReforcoEmpenho: tipo === 'VALOR' && dataReforcoEmpenho ? new Date(dataReforcoEmpenho) : null,
          objeto,
        },
      });

      if (tipo === 'VALOR' && valorAjuste) {
        const val = parseFloat(valorAjuste);
        await tx.contrato.update({
          where: { id: contratoId },
          data: {
            valorTotal: { increment: val },
            saldoDisponivel: { increment: val },
          },
        });
      }

      if (tipo === 'PRAZO' && novaDataFim) {
        const dtNova = new Date(novaDataFim);
        await tx.contrato.update({
          where: { id: contratoId },
          data: { dataFim: dtNova },
        });
      }

      return aditivo;
    });

    return NextResponse.json({ success: true, aditivo: aditivoCriado }, { status: 201 });
  } catch (error: any) {
    console.error('Erro na rota de contratos:', error);
    return NextResponse.json({ error: error.message || 'Erro ao processar contrato' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'GESTOR_CONTRATO')) {
      return NextResponse.json({ error: 'Apenas Administrador ou Gestor de Contrato' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const tipo = searchParams.get('tipo'); // CONTRATO, ITEM_MAO_OBRA, FUNCIONARIO_POSTO, REPACTUACAO, ADITIVO, COTA

    if (!id || !tipo) {
      return NextResponse.json({ error: 'ID e tipo são obrigatórios.' }, { status: 400 });
    }

    // 1. Excluir Contrato Inteiro
    if (tipo === 'CONTRATO') {
      await prisma.contrato.delete({
        where: { id },
      });
      return NextResponse.json({ success: true, message: 'Contrato excluído com sucesso.' });
    }

    // 2. Excluir Item de Mão de Obra
    if (tipo === 'ITEM_MAO_OBRA') {
      const item = await prisma.contratoItemMaoObra.findUnique({
        where: { id },
        include: { contrato: true },
      });

      if (!item) return NextResponse.json({ error: 'Item não encontrado' }, { status: 404 });

      await prisma.$transaction(async (tx) => {
        await tx.contratoItemMaoObra.delete({ where: { id } });

        // Recalcular totais do contrato
        const itensRestantes = await tx.contratoItemMaoObra.findMany({
          where: { contratoId: item.contratoId },
        });

        const calc = calcularValoresContrato(
          item.contrato.dataInicio,
          item.contrato.dataFim,
          parseFloat(item.contrato.valorAnualServicosEventuais?.toString() || '0'),
          parseFloat(item.contrato.valorAnualInsumos?.toString() || '0'),
          parseFloat(item.contrato.valorAnualDiarias?.toString() || '0'),
          itensRestantes.map((i) => ({
            quantidadePostos: i.quantidadePostos,
            valorMensalPosto: parseFloat(i.valorMensalPosto.toString()),
          }))
        );

        await tx.contrato.update({
          where: { id: item.contratoId },
          data: {
            valorMaoObraResidente: calc.valorTotalMaoObra,
            valorDiarias: calc.valorDiariasProporcional,
            valorTotal: calc.valorTotalContrato,
          },
        });
      });

      return NextResponse.json({ success: true, message: 'Item de mão de obra excluído.' });
    }

    // 3. Excluir Funcionário / Trabalhador do Posto
    if (tipo === 'FUNCIONARIO_POSTO' || tipo === 'TRABALHADOR') {
      await prisma.contratoFuncionarioPosto.delete({ where: { id } });
      return NextResponse.json({ success: true, message: 'Trabalhador desvinculado do posto com sucesso.' });
    }

    // 4. Excluir Termo de Repactuação
    if (tipo === 'REPACTUACAO') {
      await prisma.contratoRepactuacao.delete({ where: { id } });
      return NextResponse.json({ success: true, message: 'Repactuação excluída.' });
    }

    // 5. Excluir Aditivo
    if (tipo === 'ADITIVO') {
      const aditivo = await prisma.contratoAditivo.findUnique({ where: { id } });
      if (!aditivo) return NextResponse.json({ error: 'Aditivo não encontrado' }, { status: 404 });

      await prisma.$transaction(async (tx) => {
        if (aditivo.tipo === 'VALOR' && aditivo.valorAjuste) {
          const val = parseFloat(aditivo.valorAjuste.toString());
          await tx.contrato.update({
            where: { id: aditivo.contratoId },
            data: {
              valorTotal: { decrement: val },
              saldoDisponivel: { decrement: val },
            },
          });
        }
        await tx.contratoAditivo.delete({ where: { id } });
      });

      return NextResponse.json({ success: true, message: 'Aditivo excluído.' });
    }

    // 6. Excluir Cota de Unidade
    if (tipo === 'COTA') {
      await prisma.contratoUnidade.delete({ where: { id } });
      return NextResponse.json({ success: true, message: 'Cota de unidade excluída.' });
    }

    // 7. Excluir / Inativar Empresa
    if (tipo === 'EMPRESA') {
      const empresa = await prisma.empresa.findUnique({
        where: { id },
        include: { _count: { select: { contratos: true, chamados: true } } },
      });

      if (!empresa) return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 });

      if (empresa._count.contratos > 0 || empresa._count.chamados > 0) {
        await prisma.empresa.update({
          where: { id },
          data: { ativo: false },
        });
        return NextResponse.json({ success: true, message: 'Empresa inativada com sucesso (possui histórico vinculado).' });
      }

      await prisma.empresa.delete({ where: { id } });
      return NextResponse.json({ success: true, message: 'Empresa excluída com sucesso.' });
    }

    return NextResponse.json({ error: 'Tipo de exclusão inválido.' }, { status: 400 });
  } catch (error: any) {
    console.error('Erro ao excluir entidade de contrato:', error);
    return NextResponse.json({ error: error.message || 'Erro ao excluir' }, { status: 500 });
  }
}
