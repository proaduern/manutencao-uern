import prisma from '@/lib/prisma';

/**
 * Algoritmo de Meeus/Jones/Butcher para cálculo da data da Páscoa no calendário Gregoriano.
 */
function calcularPascoa(ano: number): Date {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31); // 3 = Março, 4 = Abril
  const dia = ((h + l - 7 * m + 114) % 31) + 1;

  return new Date(ano, mes - 1, dia);
}

function somarDias(data: Date, dias: number): Date {
  const res = new Date(data);
  res.setDate(res.getDate() + dias);
  return res;
}

export interface FeriadoInfo {
  data: Date;
  descricao: string;
  abrangencia: 'NACIONAL' | 'ESTADUAL' | 'MUNICIPAL' | 'UERN';
  municipio?: string | null;
  ano: number;
}

/**
 * Gera automaticamente o calendário de feriados completo para um determinado ano:
 * - Feriados Nacionais fixos
 * - Feriados Nacionais móveis (Carnaval, Sexta-feira da Paixão, Páscoa, Corpus Christi)
 * - Feriado Estadual do Rio Grande do Norte (03 de Outubro - Mártires de Cunhaú e Uruaçu)
 * - Feriados Municipais dos campi da UERN (Mossoró, Natal, Caicó, Assu, Patu, Pau dos Ferros)
 */
export async function gerarFeriadosAno(ano: number): Promise<number> {
  const pascoa = calcularPascoa(ano);
  const carnavalSegunda = somarDias(pascoa, -48);
  const carnavalTerca = somarDias(pascoa, -47);
  const quartaCinzas = somarDias(pascoa, -46);
  const sextaPaixao = somarDias(pascoa, -2);
  const corpusChristi = somarDias(pascoa, 60);

  // Segunda quinta-feira da Festa de Sant'Ana em Caicó (tradicionalmente penúltima quinta de julho)
  const primeiraQuintaJulho = (() => {
    const d = new Date(ano, 6, 1);
    while (d.getDay() !== 4) d.setDate(d.getDate() + 1);
    d.setDate(d.getDate() + 21); // 4ª quinta-feira ou 2ª quinta da festa
    return d;
  })();

  const lista: FeriadoInfo[] = [
    // --- NACIONAIS ---
    { data: new Date(ano, 0, 1), descricao: 'Confraternização Universal', abrangencia: 'NACIONAL', ano },
    { data: sextaPaixao, descricao: 'Paixão de Cristo (Sexta-feira Santa)', abrangencia: 'NACIONAL', ano },
    { data: new Date(ano, 3, 21), descricao: 'Tiradentes', abrangencia: 'NACIONAL', ano },
    { data: new Date(ano, 4, 1), descricao: 'Dia do Trabalhador', abrangencia: 'NACIONAL', ano },
    { data: new Date(ano, 8, 7), descricao: 'Independência do Brasil', abrangencia: 'NACIONAL', ano },
    { data: new Date(ano, 9, 12), descricao: 'Nossa Senhora Aparecida', abrangencia: 'NACIONAL', ano },
    { data: new Date(ano, 10, 2), descricao: 'Finados', abrangencia: 'NACIONAL', ano },
    { data: new Date(ano, 10, 15), descricao: 'Proclamação da República', abrangencia: 'NACIONAL', ano },
    { data: new Date(ano, 10, 20), descricao: 'Dia da Consciência Negra', abrangencia: 'NACIONAL', ano },
    { data: new Date(ano, 11, 25), descricao: 'Natal', abrangencia: 'NACIONAL', ano },

    // --- UERN / PONTOS FACULTATIVOS ---
    { data: carnavalSegunda, descricao: 'Carnaval (Ponto Facultativo)', abrangencia: 'UERN', ano },
    { data: carnavalTerca, descricao: 'Carnaval', abrangencia: 'UERN', ano },
    { data: quartaCinzas, descricao: 'Quarta-feira de Cinzas (até 14h)', abrangencia: 'UERN', ano },
    { data: corpusChristi, descricao: 'Corpus Christi (Ponto Facultativo)', abrangencia: 'UERN', ano },

    // --- ESTADUAIS (RIO GRANDE DO NORTE) ---
    { data: new Date(ano, 9, 3), descricao: 'Mártires de Cunhaú e Uruaçu (Feriado Estadual RN)', abrangencia: 'ESTADUAL', ano },

    // --- MUNICIPAIS / DATAS MAGNAS ---
    // Natal (RN)
    { data: new Date(ano, 0, 6), descricao: 'Dia de Reis (Santos Reis)', abrangencia: 'MUNICIPAL', municipio: 'Natal', ano },
    { data: new Date(ano, 7, 7), descricao: 'Dia do Rio Grande do Norte (Data Magna)', abrangencia: 'MUNICIPAL', municipio: 'Natal', ano },
    { data: new Date(ano, 10, 21), descricao: 'Nossa Senhora da Apresentação (Padroeira de Natal)', abrangencia: 'MUNICIPAL', municipio: 'Natal', ano },

    // Mossoró
    { data: new Date(ano, 8, 30), descricao: 'Abolição da Escravatura em Mossoró', abrangencia: 'MUNICIPAL', municipio: 'Mossoró', ano },
    { data: new Date(ano, 11, 13), descricao: 'Dia de Santa Luzia (Padroeira de Mossoró)', abrangencia: 'MUNICIPAL', municipio: 'Mossoró', ano },

    // Pau dos Ferros
    { data: new Date(ano, 8, 4), descricao: 'Emancipação Política do Município (Lei nº 1.317/2012)', abrangencia: 'MUNICIPAL', municipio: 'Pau dos Ferros', ano },
    { data: new Date(ano, 11, 8), descricao: 'Nossa Senhora da Conceição (Padroeira de Pau dos Ferros)', abrangencia: 'MUNICIPAL', municipio: 'Pau dos Ferros', ano },

    // Assu
    { data: new Date(ano, 5, 24), descricao: 'São João Batista (Padroeiro de Assu)', abrangencia: 'MUNICIPAL', municipio: 'Assu', ano },
    { data: new Date(ano, 9, 16), descricao: 'Emancipação Política de Assú', abrangencia: 'MUNICIPAL', municipio: 'Assu', ano },

    // Caicó
    { data: primeiraQuintaJulho, descricao: "Segunda quinta-feira da Festa de Sant'Ana (Padroeira de Caicó)", abrangencia: 'MUNICIPAL', municipio: 'Caicó', ano },
    { data: new Date(ano, 6, 26), descricao: "Dia de Sant'Ana (Caicó)", abrangencia: 'MUNICIPAL', municipio: 'Caicó', ano },
    { data: new Date(ano, 10, 2), descricao: 'Dia de Finados (Feriado Municipal de Caicó)', abrangencia: 'MUNICIPAL', municipio: 'Caicó', ano },
    { data: new Date(ano, 11, 16), descricao: 'Aniversário de Emancipação Política de Caicó', abrangencia: 'MUNICIPAL', municipio: 'Caicó', ano },

    // Patu
    { data: new Date(ano, 8, 15), descricao: 'Nossa Senhora das Dores (Padroeira de Patu)', abrangencia: 'MUNICIPAL', municipio: 'Patu', ano },
    { data: new Date(ano, 8, 25), descricao: 'Feira da Cultura / Emancipação de Patu', abrangencia: 'MUNICIPAL', municipio: 'Patu', ano },
  ];

  let inseridos = 0;
  for (const f of lista) {
    try {
      const inicio = new Date(f.data);
      inicio.setHours(0, 0, 0, 0);

      const existente = await prisma.feriado.findFirst({
        where: {
          data: inicio,
          descricao: f.descricao,
          municipio: f.municipio || null,
        },
      });

      if (!existente) {
        await prisma.feriado.create({
          data: {
            data: inicio,
            descricao: f.descricao,
            abrangencia: f.abrangencia,
            municipio: f.municipio || null,
            ano: f.ano,
          },
        });
        inseridos++;
      }
    } catch (e) {
      // Ignora erro individual
    }
  }

  return inseridos;
}
