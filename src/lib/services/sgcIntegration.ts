/**
 * Serviço de Integração do Sistema de Manutenção Predial com o SGC (Sistema de Gestão de Contratos)
 * Comunicação direta Server-to-Server com chave de serviço PROAD.
 */

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
    const res = await fetch(`${SGC_BASE_URL}/api/integracao/manutencao/contratos`, {
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
