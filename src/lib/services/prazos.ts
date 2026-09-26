import prisma from '@/lib/prisma';

export interface EstadoPrazo {
  classe: 'folgado' | 'apertado' | 'vencido' | 'neutro';
  texto: string | null;
}

/**
 * Verifica se uma data coincide com feriado cadastrado (Nacional, Estadual RN, Recesso UERN ou Municipal).
 */
export async function isFeriado(data: Date, municipio?: string | null): Promise<boolean> {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');

  const inicioDia = new Date(`${ano}-${mes}-${dia}T00:00:00.000Z`);
  const fimDia = new Date(`${ano}-${mes}-${dia}T23:59:59.999Z`);

  const orConditions: any[] = [
    { abrangencia: 'NACIONAL' },
    { abrangencia: 'ESTADUAL' },
    { abrangencia: 'UERN' },
  ];

  if (municipio) {
    orConditions.push({
      abrangencia: 'MUNICIPAL',
      municipio: { equals: municipio, mode: 'insensitive' },
    });
  }

  const feriado = await prisma.feriado.findFirst({
    where: {
      data: { gte: inicioDia, lte: fimDia },
      OR: orConditions,
    },
  });

  return !!feriado;
}

/**
 * Calcula a data limite de atendimento com base no nível de urgência, feriados e regra normativa:
 * - EMERGENCIA: 3 horas corridas (24/7)
 * - URGENTE: 24 horas corridas (24/7)
 * - NORMAL: 3 dias úteis (desconsidera sábados, domingos e feriados)
 * - PROGRAMADO: data esperada definida pelo demandante (mínimo de 3 dias úteis de antecedência)
 */
export async function calcularPrazoLimite(
  nivelCodigo: string,
  abertoEm: Date = new Date(),
  dataEsperada?: Date | null,
  fraseUrgenciaId?: number | null,
  municipio?: string | null
): Promise<Date> {
  if (dataEsperada) {
    return new Date(dataEsperada);
  }

  let horasCorridas: number | null = null;
  let diasUteis: number | null = null;

  // 1. Prioridade: Prazo específico configurado na frase de impacto
  if (fraseUrgenciaId) {
    const frase = await prisma.fraseUrgencia.findUnique({ where: { id: fraseUrgenciaId } });
    if (frase?.prazoHorasCorridas) horasCorridas = frase.prazoHorasCorridas;
    if (frase?.prazoDiasUteis) diasUteis = frase.prazoDiasUteis;
  }

  // 2. Se a frase não tiver prazo próprio, consulta o Nível de Urgência
  if (horasCorridas === null && diasUteis === null) {
    const nivel = await prisma.nivelUrgencia.findUnique({
      where: { codigo: nivelCodigo },
    });
    if (nivel?.prazoHorasCorridas) horasCorridas = nivel.prazoHorasCorridas;
    if (nivel?.prazoDiasUteis) diasUteis = nivel.prazoDiasUteis;
  }

  // 3. Fallbacks normativos estritos da especificação UERN caso não parametrizado
  if (horasCorridas === null && diasUteis === null) {
    if (nivelCodigo === 'EMERGENCIA') horasCorridas = 3;
    else if (nivelCodigo === 'URGENTE') horasCorridas = 24;
    else if (nivelCodigo === 'NORMAL') diasUteis = 3;
    else if (nivelCodigo === 'MAXIMA' || nivelCodigo === 'MAXIMA_GARANTIA') horasCorridas = 24;
    else diasUteis = 3;
  }

  // Horas corridas (contagem ininterrupta 24/7)
  if (horasCorridas) {
    return new Date(abertoEm.getTime() + horasCorridas * 60 * 60 * 1000);
  }

  // Dias úteis (pula sábado, domingo e feriados)
  if (diasUteis) {
    let diasRestantes = diasUteis;
    let atual = new Date(abertoEm);

    while (diasRestantes > 0) {
      atual.setDate(atual.getDate() + 1);
      const diaSemana = atual.getDay();
      // Pula sábado (6) e domingo (0)
      if (diaSemana !== 0 && diaSemana !== 6) {
        const ehFeriado = await isFeriado(atual, municipio);
        if (!ehFeriado) {
          diasRestantes--;
        }
      }
    }
    return atual;
  }

  return new Date(abertoEm.getTime() + 72 * 60 * 60 * 1000);
}

/**
 * Valida se a data esperada informada para chamado PROGRAMADO
 * atende ao requisito normativo de antecedência mínima de 3 dias úteis.
 */
export async function validarAntecedenciaDataProgramada(
  dataEsperada: Date | string,
  abertoEm: Date = new Date(),
  municipio?: string | null
): Promise<{ valido: boolean; dataMinimaEsperada: Date; mensagemErro?: string }> {
  const dataEscolhida = new Date(dataEsperada);
  let diasRestantes = 3; // Mínimo de 3 dias úteis normativo
  let atual = new Date(abertoEm);

  while (diasRestantes > 0) {
    atual.setDate(atual.getDate() + 1);
    const diaSemana = atual.getDay();
    if (diaSemana !== 0 && diaSemana !== 6) {
      const ehFeriado = await isFeriado(atual, municipio);
      if (!ehFeriado) {
        diasRestantes--;
      }
    }
  }

  // Normaliza para comparação de dia civil (00:00:00)
  const diaMinimo = new Date(atual.getFullYear(), atual.getMonth(), atual.getDate(), 0, 0, 0);
  const diaEscolhido = new Date(dataEscolhida.getFullYear(), dataEscolhida.getMonth(), dataEscolhida.getDate(), 0, 0, 0);

  const valido = diaEscolhido.getTime() >= diaMinimo.getTime();

  const diaFormatado = String(diaMinimo.getDate()).padStart(2, '0');
  const mesFormatado = String(diaMinimo.getMonth() + 1).padStart(2, '0');
  const anoFormatado = diaMinimo.getFullYear();
  const dataFormatadaStr = `${diaFormatado}/${mesFormatado}/${anoFormatado}`;

  return {
    valido,
    dataMinimaEsperada: diaMinimo,
    mensagemErro: valido
      ? undefined
      : `Para chamados programados, a data esperada deve ter antecedência mínima de 3 dias úteis (a partir de ${dataFormatadaStr}).`,
  };
}

/**
 * Calcula o estado visual do prazo de atendimento de acordo com a regra legada:
 * - Status concluídos ou em garantia são neutros.
 * - Restante <= 0: "Prazo vencido" (vermelho/vencido).
 * - Tempo decorrido >= 70% do prazo total: "apertado" (amarelo).
 * - Caso contrário: "folgado" (verde).
 */
export function calcularEstadoPrazo(
  prazoLimite: Date | string | null | undefined,
  abertoEm: Date | string,
  status: string
): EstadoPrazo {
  const fim = ['CONCLUIDO', 'RECUSADO', 'EM_GARANTIA', 'ATENDIDO'].includes(status);
  if (fim || !prazoLimite) {
    return { classe: 'neutro', texto: null };
  }

  const agora = Date.now();
  const limite = new Date(prazoLimite).getTime();
  const inicio = new Date(abertoEm).getTime();
  const rest = limite - agora;

  if (rest <= 0) {
    return { classe: 'vencido', texto: 'Prazo vencido' };
  }

  const total = limite - inicio;
  const consumido = total > 0 ? (agora - inicio) / total : 0;
  const horasRestantes = Math.floor(rest / (1000 * 60 * 60));

  let texto = '';
  if (horasRestantes < 24) {
    texto = `Faltam ${horasRestantes}h`;
  } else {
    const dias = Math.floor(horasRestantes / 24);
    texto = `Faltam ${dias} dia${dias > 1 ? 's' : ''}`;
  }

  return {
    classe: consumido >= 0.7 ? 'apertado' : 'folgado',
    texto,
  };
}
