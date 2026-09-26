import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

interface RouteContext {
  params: { id: string };
}

export const dynamic = 'force-dynamic';

/**
 * GET /api/agendas/[id]/pdf
 * Gera relatório oficial consolidado das demandas da agenda para impressão / download em PDF,
 * destinado ao despacho e ratificação formal junto ao Gabinete da Reitoria.
 */
export async function GET(req: Request, { params }: RouteContext) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const agenda = await prisma.agendaServico.findUnique({
      where: { id: params.id },
      include: {
        criadoPor: true,
        demandas: {
          include: {
            unidade: true,
            predio: true,
            sublocal: true,
            ambiente: true,
            criadoPor: true,
            proposta: true,
          },
          orderBy: { numero: 'asc' },
        },
      },
    });

    if (!agenda) {
      return NextResponse.json({ error: 'Agenda de serviços não encontrada' }, { status: 404 });
    }

    const totalEstimado = agenda.demandas.reduce((acc, d) => {
      const val = d.proposta?.valorFinalHomologado
        ? parseFloat(d.proposta.valorFinalHomologado.toString())
        : d.proposta?.valorTotalProposto
        ? parseFloat(d.proposta.valorTotalProposto.toString())
        : d.estimativaDemandante
        ? parseFloat(d.estimativaDemandante.toString())
        : 0;
      return acc + val;
    }, 0);

    const dataEmissao = new Date().toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Relatório Oficial de Demandas - ${agenda.titulo}</title>
  <style>
    @page {
      size: A4;
      margin: 15mm 15mm 20mm 15mm;
    }
    body {
      font-family: 'Times New Roman', Times, serif;
      color: #111827;
      background: #ffffff;
      margin: 0;
      padding: 20px;
      font-size: 11pt;
      line-height: 1.4;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 12px;
      margin-bottom: 20px;
    }
    .brasao {
      font-size: 14pt;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .subbrasao {
      font-size: 11pt;
      font-weight: normal;
      margin-top: 2px;
      color: #374151;
    }
    .titulo-doc {
      font-size: 13pt;
      font-weight: bold;
      text-align: center;
      margin: 16px 0 6px 0;
      text-transform: uppercase;
      color: #1e3a8a;
    }
    .subtitulo-doc {
      font-size: 10.5pt;
      text-align: center;
      margin-bottom: 16px;
      font-style: italic;
      color: #4b5563;
    }
    .box-info {
      border: 1px solid #cbd5e1;
      background-color: #f8fafc;
      padding: 10px 14px;
      border-radius: 4px;
      margin-bottom: 18px;
      font-size: 10pt;
    }
    .grid-info {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      font-size: 9.5pt;
    }
    th, td {
      border: 1px solid #94a3b8;
      padding: 6px 8px;
      vertical-align: top;
    }
    th {
      background-color: #f1f5f9;
      font-weight: bold;
      text-align: left;
      color: #0f172a;
    }
    .td-num { text-align: center; font-weight: bold; width: 35px; }
    .td-valor { text-align: right; white-space: nowrap; font-weight: bold; }
    .badge-status {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 8pt;
      font-weight: bold;
      background: #e2e8f0;
      color: #1e293b;
    }
    .total-box {
      text-align: right;
      font-size: 11pt;
      font-weight: bold;
      margin-top: 10px;
      padding: 8px 12px;
      background-color: #f8fafc;
      border: 1px solid #cbd5e1;
    }
    .despacho-box {
      margin-top: 30px;
      border: 1px dashed #64748b;
      padding: 14px;
      border-radius: 4px;
      page-break-inside: avoid;
    }
    .assinaturas {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-top: 45px;
      text-align: center;
      page-break-inside: avoid;
    }
    .linha-assinatura {
      border-top: 1px solid #111827;
      padding-top: 5px;
      font-size: 9.5pt;
    }
    .no-print {
      margin-bottom: 20px;
      text-align: right;
    }
    .btn-print {
      background-color: #1e3a8a;
      color: #ffffff;
      border: none;
      padding: 8px 16px;
      font-size: 10pt;
      font-weight: bold;
      border-radius: 4px;
      cursor: pointer;
    }
    @media print {
      .no-print { display: none !important; }
      body { padding: 0; }
    }
  </style>
</head>
<body>

  <div class="no-print">
    <button class="btn-print" onclick="window.print()">🖨️ Imprimir / Salvar como PDF</button>
  </div>

  <div class="header">
    <div class="brasao">UNIVERSIDADE DO ESTADO DO RIO GRANDE DO NORTE – UERN</div>
    <div class="subbrasao">PRÓ-REITORIA DE ADMINISTRAÇÃO – PROAD</div>
    <div class="subbrasao">Superintendência de Obras e Engenharia / Gestão de Contratos de Manutenção</div>
  </div>

  <div class="titulo-doc">PROCESSO DE RATIFICAÇÃO – AGENDA DE SERVIÇOS PROGRAMADOS</div>
  <div class="subtitulo-doc">${agenda.titulo} – Exercício ${agenda.anoReferencia}</div>

  <div class="box-info">
    <div class="grid-info">
      <div><strong>Período de Coleta:</strong> ${new Date(agenda.periodoInicioColeta).toLocaleDateString('pt-BR')} a ${new Date(agenda.periodoFimColeta).toLocaleDateString('pt-BR')}</div>
      <div><strong>Status Atual do Ciclo:</strong> ${agenda.status}</div>
      <div><strong>Teto Global Disponibilizado:</strong> R$ ${Number(agenda.valorTotalDisponivel).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
      <div><strong>Cota Padrão por Unidade:</strong> R$ ${Number(agenda.cotaPadraoUnidade).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (máx. ${agenda.maxDemandasPadrao} solicitações)</div>
    </div>
  </div>

  <p style="text-align: justify; text-indent: 30px; font-size: 10pt;">
    Encaminha-se a Vossa Magnificência a relação consolidada de demandas submetidas pelas Unidades Administrativas e Acadêmicas no âmbito da presente Agenda de Serviços Programados, em consonância com as diretrizes de governança orçamentária e a disponibilidade da rubrica de Serviços Eventuais do Contrato de Manutenção Predial vigente, para fins de ratificação superior do Gabinete da Reitoria.
  </p>

  <table>
    <thead>
      <tr>
        <th class="td-num">Item</th>
        <th style="width: 140px;">Unidade / Campus</th>
        <th style="width: 130px;">Local / Prédio</th>
        <th>Descrição da Necessidade e Justificativa</th>
        <th style="width: 100px;">Status</th>
        <th class="td-valor" style="width: 110px;">Valor Estimado</th>
      </tr>
    </thead>
    <tbody>
      ${agenda.demandas.map((d, index) => {
        const val = d.proposta?.valorFinalHomologado
          ? parseFloat(d.proposta.valorFinalHomologado.toString())
          : d.proposta?.valorTotalProposto
          ? parseFloat(d.proposta.valorTotalProposto.toString())
          : d.estimativaDemandante
          ? parseFloat(d.estimativaDemandante.toString())
          : 0;

        return `
        <tr>
          <td class="td-num">${String(index + 1).padStart(2, '0')}</td>
          <td>
            <strong>${d.unidade.nome}</strong><br>
            <span style="font-size: 8.5pt; color: #4b5563;">${d.unidade.campus}</span>
          </td>
          <td>
            ${d.predio ? d.predio.nome : 'Sede Principal'}<br>
            <span style="font-size: 8.5pt; color: #4b5563;">${d.sublocal ? d.sublocal.nome : (d.localizacaoDetalhada || '-')}</span>
          </td>
          <td>
            <strong>${d.titulo}</strong><br>
            <span style="font-size: 8.5pt;">${d.descricaoProblema}</span><br>
            <em style="font-size: 8pt; color: #4b5563;">Justificativa: ${d.justificativa}</em>
          </td>
          <td>
            <span class="badge-status">${d.status}</span>
          </td>
          <td class="td-valor">
            R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </td>
        </tr>
        `;
      }).join('')}
    </tbody>
  </table>

  <div class="total-box">
    TOTAL GERAL ESTIMADO DAS DEMANDAS COLETADAS: R$ ${totalEstimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
  </div>

  <div class="despacho-box">
    <strong>DESPACHO DO GABINETE DA REITORIA:</strong><br><br>
    ( &nbsp; ) <strong>RATIFICO</strong> integralmente o rol de demandas constantes da presente Agenda de Serviços Programados, autorizando a Pró-Reitoria de Administração a proceder com a tramitação e envio formal à empresa CONTRATADA para elaboração das respectivas Propostas de Execução de Demanda e orçamentos baseados no SINAPI.<br><br>
    ( &nbsp; ) <strong>DILIGENCIO / RESSALVO</strong> conforme despacho em separado.<br><br>
    Mossoró/RN, em _____ de ____________________ de ${agenda.anoReferencia}.
  </div>

  <div class="assinaturas">
    <div>
      <div class="linha-assinatura">
        <strong>PRÓ-REITOR(A) DE ADMINISTRAÇÃO</strong><br>
        UERN / PROAD
      </div>
    </div>
    <div>
      <div class="linha-assinatura">
        <strong>REITOR(A) / GABINETE DA REITORIA</strong><br>
        UERN
      </div>
    </div>
  </div>

</body>
</html>
    `;

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  } catch (error: any) {
    console.error('Erro ao gerar relatório da agenda:', error);
    return NextResponse.json({ error: 'Erro ao gerar relatório: ' + error.message }, { status: 500 });
  }
}
