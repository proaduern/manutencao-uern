/**
 * Serviço de Integração do Sistema de Manutenção Predial com o SGC (Sistema de Gestão de Contratos)
 * Comunicação direta Server-to-Server com chave de serviço PROAD.
 */

import prisma from '@/lib/prisma';

const SGC_BASE_URL = process.env.SGC_URL || 'http://localhost:3000';
const SERVICE_KEY = process.env.PROAD_SERVICE_KEY || 'proad_interop_internal_service_key_2026_uern';

export interface ContratoSgcInfo {
  id: string;
  numeroContrato: string;
  objeto: string;
  processoSei: string;
  valorAtualizado: number;
  totalEmpenhadoOs: number;
  saldoDisponivel: number;
  percentualConsumido: number;
  fornecedor: {
    id: string;
    razaoSocial: string;
    cnpj: string;
  };
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
 * Consulta a lista de contratos de manutenção predial vigentes no SGC com saldos em tempo real.
 */
export async function buscarContratosManutencaoSgc(): Promise<ContratoSgcInfo[]> {
  try {
    const res = await fetch(`${SGC_BASE_URL}/api/integracao/manutencao/contratos?tipo=PREDIAL`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      console.warn(`[SGC Interop] Falha ao consultar contratos: status ${res.status}`);
      return [];
    }

    const data = await res.json();
    return data.contratos || [];
  } catch (error) {
    console.error('[SGC Interop] Erro de rede ao consultar contratos no SGC:', error);
    return [];
  }
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
 * Importa ou atualiza os contratos de manutenção predial do SGC para o banco do sistema.
 */
export async function sincronizarContratosManutencaoComSgc(): Promise<{
  importados: number;
  atualizados: number;
  detalhes: any[];
}> {
  const contratosSgc = await buscarContratosManutencaoSgc();
  let importados = 0;
  let atualizados = 0;
  const detalhes: any[] = [];

  for (const c of contratosSgc) {
    if (!c.numeroContrato) continue;

    // Extrair número e ano (ex: "Contrato nº 14/2025" -> numero: "14", ano: 2025)
    const numStr = c.numeroContrato.replace(/[^0-9\/]/g, '').trim();
    const partes = numStr.split('/');
    const numero = partes[0] || '14';
    const ano = partes[1] ? parseInt(partes[1], 10) : new Date().getFullYear();

    // Garante a Empresa Contratada
    let empresa = await prisma.empresa.findFirst({
      where: {
        OR: [
          { cnpj: c.fornecedor.cnpj },
          { razaoSocial: c.fornecedor.razaoSocial },
        ],
      },
    });

    if (!empresa) {
      empresa = await prisma.empresa.create({
        data: {
          razaoSocial: c.fornecedor.razaoSocial,
          cnpj: c.fornecedor.cnpj,
          email: 'contato@fornecedor.com.br',
          ativo: true,
        },
      });
    }

    const contratoExistente = await prisma.contrato.findUnique({
      where: {
        numero_ano: {
          numero,
          ano,
        },
      },
    });

    const dataInicio = new Date();
    const dataFim = new Date();
    dataFim.setFullYear(dataFim.getFullYear() + 1);

    if (contratoExistente) {
      await prisma.contrato.update({
        where: { id: contratoExistente.id },
        data: {
          empresaId: empresa.id,
          objeto: c.objeto || 'Serviços de Manutenção Predial',
          valorTotal: c.valorAtualizado,
          saldoDisponivel: c.saldoDisponivel,
          ativo: true,
        },
      });
      atualizados++;
      detalhes.push({ numero: `${numero}/${ano}`, acao: 'ATUALIZADO' });
    } else {
      await prisma.contrato.create({
        data: {
          numero,
          ano,
          empresaId: empresa.id,
          objeto: c.objeto || 'Serviços de Manutenção Predial',
          dataInicio,
          dataFim,
          valorTotal: c.valorAtualizado,
          saldoDisponivel: c.saldoDisponivel,
          prazoGarantiaDias: 90,
          mesesVigencia: 12,
          ativo: true,
        },
      });
      importados++;
      detalhes.push({ numero: `${numero}/${ano}`, acao: 'IMPORTADO' });
    }
  }

  return { importados, atualizados, detalhes };
}

