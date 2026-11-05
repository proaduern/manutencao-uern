/**
 * Serviço de Integração do Sistema de Manutenção Predial com o SGC (Sistema de Gestão de Contratos)
 * Comunicação direta Server-to-Server com chave de serviço PROAD.
 */

import prisma from '@/lib/prisma';
import { limparCacheGrandezasContrato } from '@/lib/services/contrato';

const SGC_BASE_URL = process.env.SGC_URL || 'https://sgc-uern.vercel.app';
const SERVICE_KEY = process.env.PROAD_SERVICE_KEY || 'proad_interop_internal_service_key_2026_uern';

export function formatarCnpj(cnpj?: string | null): string {
  if (!cnpj) return '';
  const clean = cnpj.replace(/\D/g, '');
  if (clean.length === 14) {
    return clean.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  }
  return cnpj.trim();
}

export interface ItemContratoSgcInfo {
  id: string;
  numeroItem: number;
  cidade?: string | null;
  descricao: string;
  unidadeMedida: string;
  categoriaItem?: string | null;
  quantidadeAnual?: number | null;
  quantidadeOriginal?: number | null;
  saldoQuantidade: number;
  valorUnitario: number;
  valorTotalAnual?: number | null;
  valorTotalPlurianual?: number | null;
  valorTotalAtual?: number | null;
}

export interface TrabalhadorSgcInfo {
  id: string;
  nomeCompleto: string;
  cpf: string;
  funcao: string;
  campus?: string | null;
  setorLotacao?: string | null;
}

export interface ContratoSgcInfo {
  id: string;
  numeroContrato: string;
  objeto: string;
  processoSei: string;
  vigenciaInicio?: string;
  vigenciaFim?: string;
  anosVigencia?: number;
  valorGlobal?: number;
  valorAtualizado: number;
  totalEmpenhadoOs: number;
  totalMedido?: number;
  saldoDisponivel: number;
  percentualConsumido: number;
  execucaoPorRubrica?: {
    maoObra: number;
    servicosEventuais: number;
    insumos: number;
    diarias: number;
    totalExecutado: number;
  };
  fornecedor: {
    id: string;
    razaoSocial: string;
    nomeFantasia?: string | null;
    cnpj: string;
    telefone?: string | null;
    email?: string | null;
  };
  itens?: ItemContratoSgcInfo[];
  trabalhadores?: TrabalhadorSgcInfo[];
}

export interface ReservaOsParams {
  contratoId?: string;
  numeroContratoRef?: string;
  numeroOs?: string;
  ano?: number;
  processoSeiDespesa?: string;
  descricaoServico: string;
  valorEstimado: number;
  autorizadoPorNome?: string;
  autorizadoPorEmail?: string;
  origemChamadoId?: number | string;
  origemDemandaId?: number | string;
  unidadeDemandante?: string;
}

export interface MedicaoParams {
  ordemServicoId?: string;
  numeroOs?: string;
  contratoId?: string;
  valorMedido: number;
  numeroNotaFiscal?: string;
  referenciaMesAno?: string;
  processoSeiDespesa?: string;
}

/**
 * Consulta a lista de contratos de manutenção predial vigentes no SGC com saldos e itens em tempo real.
 */
export async function buscarContratosManutencaoSgc(): Promise<ContratoSgcInfo[]> {
  const urlsTentativa = Array.from(
    new Set([SGC_BASE_URL, 'https://sgc-uern.vercel.app', 'http://localhost:3000'].filter(Boolean))
  );

  for (const baseUrl of urlsTentativa) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(`${baseUrl}/api/integracao/manutencao/contratos?tipo=PREDIAL`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${SERVICE_KEY}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        continue;
      }

      const data = await res.json();
      if (Array.isArray(data.contratos) && data.contratos.length > 0) {
        return data.contratos;
      }
    } catch (error) {
      // Tenta a próxima URL disponível
    }
  }

  console.warn('[SGC Interop] Não foi possível obter contratos via HTTP nas URLs configuradas.');
  return [];
}

/**
 * Registra a emissão da Ordem de Serviço no SGC e faz a trava/reserva de saldo contratual.
 */
export async function reservarSaldoOsNoSgc(params: ReservaOsParams) {
  try {
    const res = await fetch(`${SGC_BASE_URL}/api/integracao/manutencao/ordens-servico`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        sucesso: false,
        status: res.status,
        erro: data.error || 'Erro ao provisionar OS no SGC.',
        saldoDisponivel: data.saldoDisponivel,
      };
    }

    return {
      sucesso: true,
      ordemServico: data.ordemServico,
      mensagem: data.mensagem,
    };
  } catch (error: any) {
    console.error('[SGC Interop] Erro de conexão com o SGC:', error);
    return {
      sucesso: false,
      erro: 'Serviço de contratos SGC temporariamente indisponível.',
    };
  }
}

/**
 * Envia uma medição física atestada para o faturamento no SGC.
 */
export async function enviarMedicaoAoSgc(params: MedicaoParams) {
  try {
    const res = await fetch(`${SGC_BASE_URL}/api/integracao/manutencao/medicoes`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        sucesso: false,
        erro: data.error || 'Erro ao registrar medição no SGC.',
      };
    }

    return {
      sucesso: true,
      medicao: data.medicao,
      mensagem: data.mensagem,
    };
  } catch (error: any) {
    console.error('[SGC Interop] Erro ao sincronizar medição com SGC:', error);
    return {
      sucesso: false,
      erro: 'Erro de conexão com o SGC para medição.',
    };
  }
}

/**
 * Extrai e classifica os itens do contrato do SGC nas 4 rubricas do sistema de Manutenção Predial:
 * 1. Mão de Obra Residente (Itens DEMO / Mensais -> postos e valores mensais)
 * 2. Serviços Eventuais (NAO_DEMO)
 * 3. Insumos / Materiais de Reposição (NAO_DEMO)
 * 4. Diárias de Deslocamento (NAO_DEMO)
 */
function extrairRubricasEPostosDoContratoSgc(c: ContratoSgcInfo) {
  const dataInicio = c.vigenciaInicio ? new Date(c.vigenciaInicio) : new Date('2026-02-12T00:00:00.000Z');
  const dataFim = c.vigenciaFim
    ? new Date(c.vigenciaFim)
    : new Date(dataInicio.getTime() + 730 * 24 * 60 * 60 * 1000);

  const diffDays = Math.ceil(Math.abs(dataFim.getTime() - dataInicio.getTime()) / (1000 * 60 * 60 * 24));
  const mesesCalculados = Math.max(1, Math.round(diffDays / 30.4375));
  const mesesVigencia = c.anosVigencia && c.anosVigencia > 0 ? c.anosVigencia * 12 : mesesCalculados;
  const anosVigencia = Math.max(1, mesesVigencia / 12);

  const itens = Array.isArray(c.itens) ? c.itens : [];

  // Contar quantas vezes cada descrição de cargo aparece para anexar a cidade quando houver múltiplas lotações
  const contagemDescricao: Record<string, number> = {};
  for (const it of itens) {
    const chave = (it.descricao || '').trim().toUpperCase();
    contagemDescricao[chave] = (contagemDescricao[chave] || 0) + 1;
  }

  // Cidades conhecidas por numeroItem no Contrato 01/2016 caso a API antiga não tenha enviado o campo cidade
  const mapaCidadeItemPadrao: Record<number, string> = {
    1: 'Mossoró',
    2: 'Mossoró',
    3: 'Mossoró',
    4: 'Mossoró',
    5: 'Mossoró',
    6: 'Mossoró',
    7: 'Mossoró',
    8: 'Mossoró',
    9: 'Mossoró',
    10: 'Pau dos Ferros',
    11: 'Assú',
    12: 'Patu',
    13: 'Caicó',
    14: 'Natal',
  };

  const itensMaoObra: Array<{
    funcao: string;
    quantidadePostos: number;
    valorMensalPosto: number;
    valorTotalMensal: number;
  }> = [];

  let valorAnualServicosEventuais = 0;
  let valorServicosEventuais = 0;

  let valorAnualInsumos = 0;
  let valorInsumos = 0;

  let valorAnualDiarias = 0;
  let valorDiarias = 0;

  let somaTotalMaoObraPlurianual = 0;

  for (const it of itens) {
    const descUpper = (it.descricao || '').trim().toUpperCase();
    const unidadeUpper = (it.unidadeMedida || '').trim().toUpperCase();
    const isDemo =
      it.categoriaItem === 'DEMO' ||
      unidadeUpper === 'MÊS' ||
      unidadeUpper === 'MES' ||
      unidadeUpper === 'POSTO';

    const qtd = Number(it.saldoQuantidade ?? it.quantidadeOriginal ?? 1);
    const valUnit = Number(it.valorUnitario ?? 0);

    if (isDemo) {
      const cidadeItem = it.cidade || mapaCidadeItemPadrao[it.numeroItem] || '';
      const precisaSufixoCidade =
        cidadeItem &&
        cidadeItem !== 'Geral/Todos' &&
        (contagemDescricao[descUpper] > 1 || cidadeItem !== 'Mossoró');

      const nomeFuncao = precisaSufixoCidade
        ? `${it.descricao.trim()} — ${cidadeItem}`
        : it.descricao.trim();

      const totalMensal = Number((qtd * valUnit).toFixed(2));
      const totalVigenciaItem = it.valorTotalAtual
        ? Number(it.valorTotalAtual)
        : Number((totalMensal * mesesVigencia).toFixed(2));

      somaTotalMaoObraPlurianual += totalVigenciaItem;

      itensMaoObra.push({
        funcao: nomeFuncao,
        quantidadePostos: Math.max(1, Math.round(qtd)),
        valorMensalPosto: Number(valUnit.toFixed(2)),
        valorTotalMensal: totalMensal,
      });
    } else {
      // Item sob demanda (NAO_DEMO)
      // Se valorUnitario já é o valor anual (ex: 1.500.000 com saldoQuantidade = 2 anos -> total 3.000.000)
      const totalVigenciaItem = it.valorTotalAtual
        ? Number(it.valorTotalAtual)
        : it.valorTotalPlurianual
        ? Number(it.valorTotalPlurianual)
        : Number((valUnit * qtd).toFixed(2));

      const totalAnualItem = it.valorTotalAnual
        ? Number(it.valorTotalAnual)
        : qtd === anosVigencia && valUnit > 1000
        ? valUnit
        : Number((totalVigenciaItem / anosVigencia).toFixed(2));

      if (descUpper.includes('EVENTUA')) {
        valorAnualServicosEventuais += totalAnualItem;
        valorServicosEventuais += totalVigenciaItem;
      } else if (descUpper.includes('INSUMO') || descUpper.includes('MATERIA') || descUpper.includes('REPOSI')) {
        valorAnualInsumos += totalAnualItem;
        valorInsumos += totalVigenciaItem;
      } else if (descUpper.includes('DIÁRIA') || descUpper.includes('DIARIA') || descUpper.includes('DESLOCAMENTO')) {
        valorAnualDiarias += totalAnualItem;
        valorDiarias += totalVigenciaItem;
      }
    }
  }

  const valorTotalContrato = Number(c.valorAtualizado || c.valorGlobal || 0);
  const custoMensalTotal = itensMaoObra.reduce((acc, i) => acc + i.valorTotalMensal, 0);
  const valorMaoObraResidente =
    somaTotalMaoObraPlurianual > 0
      ? Number(somaTotalMaoObraPlurianual.toFixed(2))
      : Number((custoMensalTotal * mesesVigencia).toFixed(2));

  return {
    dataInicio,
    dataFim,
    mesesVigencia,
    valorMaoObraResidente,
    valorAnualServicosEventuais: Number(valorAnualServicosEventuais.toFixed(2)),
    valorServicosEventuais: Number(valorServicosEventuais.toFixed(2)),
    valorAnualInsumos: Number(valorAnualInsumos.toFixed(2)),
    valorInsumos: Number(valorInsumos.toFixed(2)),
    valorAnualDiarias: Number(valorAnualDiarias.toFixed(2)),
    valorDiarias: Number(valorDiarias.toFixed(2)),
    valorTotalContrato:
      valorTotalContrato > 0
        ? valorTotalContrato
        : Number(
            (valorMaoObraResidente + valorServicosEventuais + valorInsumos + valorDiarias).toFixed(2)
          ),
    itensMaoObra,
  };
}

/**
 * Importa ou atualiza os contratos de manutenção predial do SGC para o banco do sistema,
 * carregando integralmente as 4 rubricas financeiras, vigência e os postos de mão de obra residente.
 */
export async function sincronizarContratosManutencaoComSgc(): Promise<{
  importados: number;
  atualizados: number;
  detalhes: any[];
}> {
  const contratosSgc = await buscarContratosManutencaoSgc();
  if (contratosSgc.length === 0) {
    throw new Error('Nenhum contrato de manutenção predial ativo foi retornado pelo SGC.');
  }

  let importados = 0;
  let atualizados = 0;
  const detalhes: any[] = [];
  const idsContratosSincronizados: string[] = [];

  for (const c of contratosSgc) {
    if (!c.numeroContrato) continue;

    // Extrair número e ano (ex: "01/2016" -> numero: "01", ano: 2016)
    const numStr = c.numeroContrato.replace(/[^0-9\/]/g, '').trim();
    const partes = numStr.split('/');
    const numero = partes[0] || '01';
    const ano = partes[1] ? parseInt(partes[1], 10) : new Date().getFullYear();

    const cnpjLimpo = (c.fornecedor?.cnpj || '').replace(/\D/g, '');
    const cnpjFormatado = formatarCnpj(c.fornecedor?.cnpj);

    // 1. Garante e unifica a Empresa Contratada (evita duplicatas com/sem máscara de CNPJ)
    const empresasEncontradas = await prisma.empresa.findMany({
      where: {
        OR: [
          ...(cnpjLimpo ? [{ cnpj: cnpjLimpo }, { cnpj: cnpjFormatado }] : []),
          { razaoSocial: { equals: c.fornecedor.razaoSocial, mode: 'insensitive' } },
        ],
      },
      orderBy: { criadoEm: 'asc' },
    });

    let empresa = empresasEncontradas[0] || null;

    if (!empresa) {
      empresa = await prisma.empresa.create({
        data: {
          razaoSocial: c.fornecedor.razaoSocial,
          nomeFantasia: c.fornecedor.nomeFantasia || c.fornecedor.razaoSocial,
          cnpj: cnpjFormatado || c.fornecedor.cnpj,
          email: c.fornecedor.email || 'contato@fornecedor.com.br',
          telefone: c.fornecedor.telefone || null,
          ativo: true,
        },
      });
    } else {
      empresa = await prisma.empresa.update({
        where: { id: empresa.id },
        data: {
          razaoSocial: c.fornecedor.razaoSocial,
          nomeFantasia: c.fornecedor.nomeFantasia || empresa.nomeFantasia || c.fornecedor.razaoSocial,
          email: c.fornecedor.email || empresa.email,
          telefone: c.fornecedor.telefone || empresa.telefone,
          ativo: true,
        },
      });
    }

    // 2. Extrai valores das 4 rubricas, vigência real e postos de mão de obra residente a partir dos itens do SGC
    const extraido = extrairRubricasEPostosDoContratoSgc(c);

    // 3. Verifica se já existe o contrato pelo par (numero, ano) ou se era o 01/2016 da mesma empresa atualizado para 01/2026
    let contratoExistente = await prisma.contrato.findUnique({
      where: {
        numero_ano: {
          numero,
          ano,
        },
      },
      include: {
        itensMaoObra: {
          include: { funcionarios: true },
        },
      },
    });

    if (!contratoExistente && numero === '01' && ano === 2026) {
      contratoExistente = await prisma.contrato.findFirst({
        where: {
          numero: '01',
          ano: 2016,
          empresaId: empresa.id,
        },
        include: {
          itensMaoObra: {
            include: { funcionarios: true },
          },
        },
      });
    }

    let contratoIdFinal: string;

    if (contratoExistente) {
      const atualizado = await prisma.contrato.update({
        where: { id: contratoExistente.id },
        data: {
          numero,
          ano,
          empresaId: empresa.id,
          objeto: c.objeto || 'Serviços de Manutenção Predial',
          dataInicio: extraido.dataInicio,
          dataFim: extraido.dataFim,
          mesesVigencia: extraido.mesesVigencia,
          valorMaoObraResidente: extraido.valorMaoObraResidente,
          valorAnualServicosEventuais: extraido.valorAnualServicosEventuais,
          valorServicosEventuais: extraido.valorServicosEventuais,
          valorAnualInsumos: extraido.valorAnualInsumos,
          valorInsumos: extraido.valorInsumos,
          valorAnualDiarias: extraido.valorAnualDiarias,
          valorDiarias: extraido.valorDiarias,
          valorTotal: extraido.valorTotalContrato,
          saldoDisponivel: Number(c.saldoDisponivel ?? extraido.valorTotalContrato),
          ativo: true,
        },
      });
      contratoIdFinal = atualizado.id;
      atualizados++;
    } else {
      const criado = await prisma.contrato.create({
        data: {
          numero,
          ano,
          empresaId: empresa.id,
          objeto: c.objeto || 'Serviços de Manutenção Predial',
          dataInicio: extraido.dataInicio,
          dataFim: extraido.dataFim,
          prazoGarantiaDias: 90,
          mesesVigencia: extraido.mesesVigencia,
          valorMaoObraResidente: extraido.valorMaoObraResidente,
          valorAnualServicosEventuais: extraido.valorAnualServicosEventuais,
          valorServicosEventuais: extraido.valorServicosEventuais,
          valorAnualInsumos: extraido.valorAnualInsumos,
          valorInsumos: extraido.valorInsumos,
          valorAnualDiarias: extraido.valorAnualDiarias,
          valorDiarias: extraido.valorDiarias,
          valorTotal: extraido.valorTotalContrato,
          saldoDisponivel: Number(c.saldoDisponivel ?? extraido.valorTotalContrato),
          ativo: true,
        },
      });
      contratoIdFinal = criado.id;
      importados++;
    }

    idsContratosSincronizados.push(contratoIdFinal);

    // 3.1. Persistir resumo de execução/faturamento sincronizado do SGC por rubrica (em ContratoAditivo tipo EXECUCAO_SGC)
    if (c.execucaoPorRubrica) {
      await prisma.contratoAditivo.deleteMany({
        where: { contratoId: contratoIdFinal, tipo: 'EXECUCAO_SGC' },
      });
      await prisma.contratoAditivo.create({
        data: {
          contratoId: contratoIdFinal,
          numero: 'SGC-EXECUCAO-SINCRONIZADA',
          tipo: 'EXECUCAO_SGC',
          valorAjuste: Number(c.execucaoPorRubrica.totalExecutado || c.totalMedido || 0),
          objeto: JSON.stringify(c.execucaoPorRubrica),
        },
      });
    }

    // Helper para extrair cidade normalizada a partir do campus do SGC
    const extrairCidadeCampus = (campus?: string | null): string => {
      const cp = (campus || '').toUpperCase();
      if (cp.includes('PAU DOS FERROS')) return 'Pau dos Ferros';
      if (cp.includes('ASSÚ') || cp.includes('ASSU')) return 'Assú';
      if (cp.includes('PATU')) return 'Patu';
      if (cp.includes('CAICÓ') || cp.includes('CAICO')) return 'Caicó';
      if (cp.includes('NATAL')) return 'Natal';
      return 'Mossoró';
    };

    // 3.2. Sincronizar lista nominal na tabela FuncionarioEmpresa (funcionarios_empresas)
    if (Array.isArray(c.trabalhadores) && c.trabalhadores.length > 0) {
      for (const trab of c.trabalhadores) {
        if (!trab.cpf || !trab.nomeCompleto) continue;
        const cidadeLotacao = extrairCidadeCampus(trab.campus);
        await prisma.funcionarioEmpresa.upsert({
          where: { cpf: trab.cpf.trim() },
          update: {
            empresaId: empresa.id,
            nome: trab.nomeCompleto.trim(),
            cargo: (trab.funcao || 'Profissional de Manutenção').trim(),
            cidadeLotacao,
            ativo: true,
          },
          create: {
            empresaId: empresa.id,
            nome: trab.nomeCompleto.trim(),
            cpf: trab.cpf.trim(),
            cargo: (trab.funcao || 'Profissional de Manutenção').trim(),
            cidadeLotacao,
            ativo: true,
          },
        });
      }
    }

    // 4. Sincronizar os Postos de Mão de Obra Residente (ContratoItemMaoObra) e vincular trabalhadores por função + cidade
    if (extraido.itensMaoObra.length > 0) {
      const funcionariosPorFuncao = new Map<string, Array<{ nomeCompleto: string; cpf: string }>>();

      if (Array.isArray(c.trabalhadores) && c.trabalhadores.length > 0) {
        for (const trab of c.trabalhadores) {
          const funcaoLimpa = (trab.funcao || '').trim().toUpperCase();
          const cidadeTrab = extrairCidadeCampus(trab.campus).toUpperCase();
          const chaveComCidade = `${funcaoLimpa} — ${cidadeTrab}`;

          // Registra na chave com cidade
          const listaCidade = funcionariosPorFuncao.get(chaveComCidade) || [];
          if (!listaCidade.some((f) => f.cpf.replace(/\D/g, '') === (trab.cpf || '').replace(/\D/g, ''))) {
            listaCidade.push({ nomeCompleto: trab.nomeCompleto, cpf: trab.cpf });
            funcionariosPorFuncao.set(chaveComCidade, listaCidade);
          }

          // Registra na chave base apenas se for de Mossoró (para postos únicos de Mossoró que não levam sufixo de cidade)
          if (cidadeTrab === 'MOSSORÓ') {
            const listaBase = funcionariosPorFuncao.get(funcaoLimpa) || [];
            if (!listaBase.some((f) => f.cpf.replace(/\D/g, '') === (trab.cpf || '').replace(/\D/g, ''))) {
              listaBase.push({ nomeCompleto: trab.nomeCompleto, cpf: trab.cpf });
              funcionariosPorFuncao.set(funcaoLimpa, listaBase);
            }
          }
        }
      } else if (contratoExistente?.itensMaoObra) {
        for (const itemAntigo of contratoExistente.itensMaoObra) {
          const chave = itemAntigo.funcao.trim().toUpperCase();
          if (itemAntigo.funcionarios?.length > 0) {
            funcionariosPorFuncao.set(
              chave,
              itemAntigo.funcionarios.map((f) => ({ nomeCompleto: f.nomeCompleto, cpf: f.cpf }))
            );
          }
        }
      }

      await prisma.contratoItemMaoObra.deleteMany({
        where: { contratoId: contratoIdFinal },
      });

      for (const posto of extraido.itensMaoObra) {
        const itemCriado = await prisma.contratoItemMaoObra.create({
          data: {
            contratoId: contratoIdFinal,
            funcao: posto.funcao,
            quantidadePostos: posto.quantidadePostos,
            valorMensalPosto: posto.valorMensalPosto,
            valorTotalMensal: posto.valorTotalMensal,
          },
        });

        const chavePosto = posto.funcao.trim().toUpperCase();
        const temCidadeNoPosto = chavePosto.includes('—');
        const funcsParaVincular = temCidadeNoPosto
          ? funcionariosPorFuncao.get(chavePosto) || []
          : funcionariosPorFuncao.get(chavePosto) || [];

        for (const func of funcsParaVincular) {
          await prisma.contratoFuncionarioPosto.create({
            data: {
              itemMaoObraId: itemCriado.id,
              nomeCompleto: func.nomeCompleto,
              cpf: func.cpf,
              ativo: true,
            },
          });
        }
      }
    }

    // 5. Se a empresa duplicada antiga ficou órfã de contratos e chamados, removê-la
    if (empresasEncontradas.length > 1) {
      for (const empExtra of empresasEncontradas.slice(1)) {
        await prisma.contrato.updateMany({
          where: { empresaId: empExtra.id },
          data: { empresaId: empresa.id },
        });
        await prisma.chamado.updateMany({
          where: { empresaId: empExtra.id },
          data: { empresaId: empresa.id },
        });
        await prisma.usuario.updateMany({
          where: { empresaId: empExtra.id },
          data: { empresaId: empresa.id },
        });
        await prisma.empresa.delete({ where: { id: empExtra.id } }).catch(() => {});
      }
    }

    detalhes.push({
      numero: `${numero}/${ano}`,
      acao: contratoExistente ? 'ATUALIZADO' : 'IMPORTADO',
      valorTotal: extraido.valorTotalContrato,
      valorMaoObraResidente: extraido.valorMaoObraResidente,
      valorServicosEventuais: extraido.valorServicosEventuais,
      valorInsumos: extraido.valorInsumos,
      valorDiarias: extraido.valorDiarias,
      postosSincronizados: extraido.itensMaoObra.length,
    });
  }

  // 6. Desativar contratos de demonstração/anteriores que não vieram do SGC para que o contrato real do SGC seja o ativo principal
  if (idsContratosSincronizados.length > 0) {
    await prisma.contrato.updateMany({
      where: {
        id: { notIn: idsContratosSincronizados },
      },
      data: {
        ativo: false,
      },
    });
  }

  // 7. Limpar cache de grandezas financeiras para refletir os valores imediatamente na interface
  limparCacheGrandezasContrato();

  return { importados, atualizados, detalhes };
}
