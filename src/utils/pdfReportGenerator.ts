import { CashClosureRecord, Order } from '../types/restaurant';
import {
  formatBs,
  formatBsAmount,
  formatCurrency,
  formatTime,
  modalityLabel,
} from '../components/SharedUI';
import { isEfectivoMethod, isPagoMovilMethod } from '../components/PaymentSplitForm';

export interface DetailedClosureReportData {
  title: string;
  subtitle: string;
  closureId: string;
  issuedAt: string;
  closedBy: string;
  bcvRate: number;
  orderCount: number;
  totalSalesUsd: number;
  totalSalesBs: number;
  byMethod: Record<string, { amountUsd: number; amountBs: number; isReverseBs: boolean }>;
  currencySummary: {
    efectivoUsd: number;
    efectivoBs: number;
    efectivoBsConvertedUsd: number;
    pagoMovilBs: number;
    pagoMovilConvertedUsd: number;
    zelleUsd: number;
    tarjetaUsd: number;
    tarjetaBs: number;
  };
  orders: Order[];
}

export function buildDetailedClosureReportData(
  orders: Order[],
  bcvRate: number,
  closureRecord?: CashClosureRecord | null
): DetailedClosureReportData {
  const effectiveRate = closureRecord?.bcvRate || bcvRate;
  const sourceOrders =
    closureRecord?.ordersSnapshot && closureRecord.ordersSnapshot.length > 0
      ? closureRecord.ordersSnapshot
      : orders;

  const byMethod: Record<
    string,
    { amountUsd: number; amountBs: number; isReverseBs: boolean }
  > = {};

  let totalSalesUsd = 0;
  let efectivoUsd = 0;
  let efectivoBs = 0;
  let efectivoBsConvertedUsd = 0;
  let pagoMovilBs = 0;
  let pagoMovilConvertedUsd = 0;
  let zelleUsd = 0;
  let tarjetaUsd = 0;

  if (sourceOrders.length > 0) {
    for (const ord of sourceOrders) {
      const r = ord.bcvRateAtOrder || effectiveRate;
      totalSalesUsd += ord.total;

      if (ord.payments && ord.payments.length > 0) {
        for (const sp of ord.payments) {
          const isPm = isPagoMovilMethod(sp.methodId, sp.methodName);
          const isEf = isEfectivoMethod(sp.methodId, sp.methodName);
          const isEfBs = isEf && sp.cashCurrency === 'VES';
          const isReverseBs = isPm || isEfBs;

          const label = isEf
            ? `Efectivo (${sp.cashCurrency === 'VES' ? 'Bs ➔ $' : '$'})`
            : isPm
            ? 'Pago Móvil (Bs ➔ $)'
            : sp.methodName;

          const spBs =
            sp.amountBs && sp.amountBs > 0
              ? sp.amountBs
              : sp.pagoMovilDetails?.amountBs && sp.pagoMovilDetails.amountBs > 0
              ? sp.pagoMovilDetails.amountBs
              : Number((sp.amountUsd * r).toFixed(2));

          if (!byMethod[label]) {
            byMethod[label] = { amountUsd: 0, amountBs: 0, isReverseBs };
          }
          byMethod[label].amountUsd += sp.amountUsd;
          byMethod[label].amountBs += spBs;

          const lower = sp.methodName.toLowerCase();
          if (isEf) {
            if (sp.cashCurrency === 'VES') {
              efectivoBs += spBs;
              efectivoBsConvertedUsd += sp.amountUsd;
            } else {
              efectivoUsd += sp.amountUsd;
            }
          } else if (isPm) {
            pagoMovilBs += spBs;
            pagoMovilConvertedUsd += sp.amountUsd;
          } else if (sp.methodId === 'pm-zelle' || lower.includes('zelle')) {
            zelleUsd += sp.amountUsd;
          } else if (sp.methodId === 'pm-tarjeta' || lower.includes('tarjeta')) {
            tarjetaUsd += sp.amountUsd;
          }
        }
      } else {
        const isPm = isPagoMovilMethod(ord.paymentMethodId, ord.paymentMethodName);
        const isEf = isEfectivoMethod(ord.paymentMethodId, ord.paymentMethodName);
        const isEfBs = isEf && ord.cashCurrency === 'VES';
        const isReverseBs = isPm || isEfBs;

        const label = isEf
          ? `Efectivo (${ord.cashCurrency === 'VES' ? 'Bs ➔ $' : '$'})`
          : isPm
          ? 'Pago Móvil (Bs ➔ $)'
          : ord.paymentMethodName;

        const ordBs =
          ord.pagoMovilDetails?.amountBs && ord.pagoMovilDetails.amountBs > 0
            ? ord.pagoMovilDetails.amountBs
            : Number((ord.total * r).toFixed(2));

        if (!byMethod[label]) {
          byMethod[label] = { amountUsd: 0, amountBs: 0, isReverseBs };
        }
        byMethod[label].amountUsd += ord.total;
        byMethod[label].amountBs += ordBs;

        const lower = ord.paymentMethodName.toLowerCase();
        if (isEf) {
          if (ord.cashCurrency === 'VES') {
            efectivoBs += ordBs;
            efectivoBsConvertedUsd += ord.total;
          } else {
            efectivoUsd += ord.total;
          }
        } else if (isPm) {
          pagoMovilBs += ordBs;
          pagoMovilConvertedUsd += ord.total;
        } else if (ord.paymentMethodId === 'pm-zelle' || lower.includes('zelle')) {
          zelleUsd += ord.total;
        } else if (ord.paymentMethodId === 'pm-tarjeta' || lower.includes('tarjeta')) {
          tarjetaUsd += ord.total;
        }
      }
    }
  } else if (closureRecord) {
    totalSalesUsd = closureRecord.totalSales;
    for (const [m, amtUsd] of Object.entries(closureRecord.byMethod)) {
      const lower = m.toLowerCase();
      const isRev = lower.includes('pago móvil') || lower.includes('pago movil') || lower.includes('(bs)');
      byMethod[m] = {
        amountUsd: amtUsd,
        amountBs: Number((amtUsd * effectiveRate).toFixed(2)),
        isReverseBs: isRev,
      };
    }
    if (closureRecord.byCurrencySummary) {
      const s = closureRecord.byCurrencySummary;
      efectivoUsd = s.efectivoUsd;
      efectivoBs = s.efectivoBs;
      efectivoBsConvertedUsd = s.efectivoBs / effectiveRate;
      pagoMovilBs = s.pagoMovilBs;
      pagoMovilConvertedUsd = s.pagoMovilUsd;
      zelleUsd = s.zelleUsd;
      tarjetaUsd = s.tarjetaUsd;
    }
  }

  const finalOrderCount = closureRecord
    ? closureRecord.orderCount
    : sourceOrders.length;
  const finalTotalUsd = closureRecord ? closureRecord.totalSales : totalSalesUsd;
  const finalTotalBs = closureRecord
    ? closureRecord.totalSalesBs || finalTotalUsd * effectiveRate
    : finalTotalUsd * effectiveRate;

  return {
    title: 'GORDIS BURGUER — REPORTE DETALLADO DE CIERRE DE CAJA',
    subtitle: closureRecord
      ? `Cierre Oficial Registrado (${closureRecord.id})`
      : 'Reporte Detallado de Turno en Curso',
    closureId: closureRecord ? closureRecord.id : `TURNO-${new Date().toISOString().slice(0, 10)}`,
    issuedAt: closureRecord
      ? new Date(closureRecord.closedAt).toLocaleString('es-VE')
      : new Date().toLocaleString('es-VE'),
    closedBy: closureRecord?.closedBy || 'Gerencia General',
    bcvRate: effectiveRate,
    orderCount: finalOrderCount,
    totalSalesUsd: Number(finalTotalUsd.toFixed(2)),
    totalSalesBs: Number(finalTotalBs.toFixed(2)),
    byMethod,
    currencySummary: {
      efectivoUsd: Number(efectivoUsd.toFixed(2)),
      efectivoBs: Number(efectivoBs.toFixed(2)),
      efectivoBsConvertedUsd: Number(efectivoBsConvertedUsd.toFixed(2)),
      pagoMovilBs: Number(pagoMovilBs.toFixed(2)),
      pagoMovilConvertedUsd: Number(pagoMovilConvertedUsd.toFixed(2)),
      zelleUsd: Number(zelleUsd.toFixed(2)),
      tarjetaUsd: Number(tarjetaUsd.toFixed(2)),
      tarjetaBs: Number((tarjetaUsd * effectiveRate).toFixed(2)),
    },
    orders: sourceOrders,
  };
}

/**
 * Escapes WinAnsi (Latin-1) strings for standard PDF text operators.
 */
function pdfEscape(str: string): string {
  const normalized = str
    .replace(/➔|→/g, '->')
    .replace(/•/g, '-')
    .replace(/—|–/g, '-')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, '');

  let out = '';
  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized[i];
    const code = normalized.charCodeAt(i);
    if (ch === '(' || ch === ')' || ch === '\\') {
      out += '\\' + ch;
    } else if (code > 127) {
      out += '\\' + code.toString(8).padStart(3, '0');
    } else {
      out += ch;
    }
  }
  return out;
}

/**
 * Generates and downloads a valid, standards-compliant multi-page PDF 1.4 document (.pdf)
 * with corporate header, financial summary cards, payment breakdown (with Bs -> $ reconversion),
 * and itemized order table.
 */
export function downloadDetailedClosurePdf(report: DetailedClosureReportData): void {
  const PAGE_W = 595.28; // A4 width in pt
  const PAGE_H = 841.89; // A4 height in pt
  const MARGIN = 36;

  const pages: string[][] = [[]];
  let currentPageIdx = 0;
  let cursorY = PAGE_H - MARGIN;

  const emit = (cmd: string) => {
    pages[currentPageIdx].push(cmd);
  };

  const ensureSpace = (neededPt: number) => {
    if (cursorY - neededPt < MARGIN + 28) {
      pages.push([]);
      currentPageIdx = pages.length - 1;
      cursorY = PAGE_H - MARGIN;
      drawContinuationHeader();
    }
  };

  const drawRect = (
    x: number,
    yTop: number,
    w: number,
    h: number,
    fillRgb?: [number, number, number],
    strokeRgb?: [number, number, number]
  ) => {
    const yBottom = yTop - h;
    if (fillRgb && strokeRgb) {
      emit(
        `${fillRgb[0]} ${fillRgb[1]} ${fillRgb[2]} rg ${strokeRgb[0]} ${strokeRgb[1]} ${strokeRgb[2]} RG 0.7 w ${x.toFixed(2)} ${yBottom.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re B`
      );
    } else if (fillRgb) {
      emit(
        `${fillRgb[0]} ${fillRgb[1]} ${fillRgb[2]} rg ${x.toFixed(2)} ${yBottom.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`
      );
    } else if (strokeRgb) {
      emit(
        `${strokeRgb[0]} ${strokeRgb[1]} ${strokeRgb[2]} RG 0.7 w ${x.toFixed(2)} ${yBottom.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re S`
      );
    }
  };

  const drawText = (
    text: string,
    x: number,
    y: number,
    font: 'F1' | 'F2' | 'F3' = 'F1',
    size = 9,
    rgb: [number, number, number] = [0.1, 0.1, 0.12]
  ) => {
    emit(
      `BT /${font} ${size} Tf ${rgb[0]} ${rgb[1]} ${rgb[2]} rg ${x.toFixed(2)} ${y.toFixed(2)} Td (${pdfEscape(text)}) Tj ET`
    );
  };

  const drawContinuationHeader = () => {
    drawRect(MARGIN, cursorY, PAGE_W - MARGIN * 2, 24, [0.09, 0.09, 0.11]);
    drawText(
      `GORDIS BURGUER — REPORTE DETALLADO DE CIERRE DE CAJA (${report.closureId})`,
      MARGIN + 10,
      cursorY - 15,
      'F2',
      9,
      [1, 0.78, 0.2]
    );
    cursorY -= 32;
  };

  // --- PAGE 1 HEADER BANNER ---
  const contentW = PAGE_W - MARGIN * 2;
  drawRect(MARGIN, cursorY, contentW, 64, [0.08, 0.08, 0.1]);
  drawRect(MARGIN, cursorY, 6, 64, [0.9, 0.22, 0.2]);
  drawText('GORDIS BURGUER', MARGIN + 16, cursorY - 22, 'F2', 16, [1, 1, 1]);
  drawText(
    'REPORTE DETALLADO DE CIERRE DE CAJA Y ARQUEO FINANCIERO',
    MARGIN + 16,
    cursorY - 38,
    'F2',
    10,
    [0.98, 0.75, 0.18]
  );
  drawText(
    `ID: ${report.closureId}  |  Emision: ${report.issuedAt}  |  Tasa Oficial BCV: Bs. ${report.bcvRate.toFixed(2)} / $1.00`,
    MARGIN + 16,
    cursorY - 53,
    'F1',
    8.5,
    [0.85, 0.85, 0.88]
  );
  cursorY -= 76;

  // --- SECTION 1: RESUMEN EJECUTIVO DE VENTAS ---
  drawText('1. RESUMEN EJECUTIVO DE VENTAS DEL CIERRE', MARGIN, cursorY, 'F2', 10.5, [
    0.1, 0.1, 0.12,
  ]);
  cursorY -= 8;

  const boxW = (contentW - 16) / 3;
  drawRect(MARGIN, cursorY, boxW, 48, [0.96, 0.97, 0.98], [0.82, 0.84, 0.88]);
  drawText('PEDIDOS PROCESADOS', MARGIN + 10, cursorY - 15, 'F2', 7.5, [0.4, 0.42, 0.46]);
  drawText(`${report.orderCount} ordenes`, MARGIN + 10, cursorY - 33, 'F2', 13, [
    0.08, 0.08, 0.1,
  ]);

  drawRect(
    MARGIN + boxW + 8,
    cursorY,
    boxW,
    48,
    [0.94, 0.99, 0.96],
    [0.16, 0.65, 0.42]
  );
  drawText(
    'TOTALIDAD VENDIDA ($ USD)',
    MARGIN + boxW + 18,
    cursorY - 15,
    'F2',
    7.5,
    [0.1, 0.48, 0.3]
  );
  drawText(
    formatCurrency(report.totalSalesUsd),
    MARGIN + boxW + 18,
    cursorY - 33,
    'F2',
    13,
    [0.06, 0.42, 0.25]
  );

  drawRect(
    MARGIN + (boxW + 8) * 2,
    cursorY,
    boxW,
    48,
    [0.99, 0.97, 0.92],
    [0.85, 0.58, 0.12]
  );
  drawText(
    'TOTALIDAD VENDIDA (Bs. BCV)',
    MARGIN + (boxW + 8) * 2 + 10,
    cursorY - 15,
    'F2',
    7.5,
    [0.65, 0.38, 0.05]
  );
  drawText(
    formatBsAmount(report.totalSalesBs),
    MARGIN + (boxW + 8) * 2 + 10,
    cursorY - 33,
    'F2',
    12,
    [0.55, 0.3, 0.04]
  );

  cursorY -= 64;

  // --- SECTION 2: ARQUEO DE DINERO RECAUDADO POR MONEDA Y MÉTODO ---
  drawText(
    '2. DINERO RECAUDADO POR METODO DE PAGO Y RECONVERSION (Bs. -> $ / $ -> Bs.)',
    MARGIN,
    cursorY,
    'F2',
    10.5,
    [0.1, 0.1, 0.12]
  );
  cursorY -= 8;

  const s = report.currencySummary;
  const summaryRows: [string, string, string][] = [
    [
      'Pago Movil (Reconversion de Bs. a $ BCV)',
      formatBsAmount(s.pagoMovilBs),
      `-> Equivalente: ${formatCurrency(s.pagoMovilConvertedUsd)}`,
    ],
    [
      'Efectivo en Bolivares (Reconversion de Bs. a $ BCV)',
      formatBsAmount(s.efectivoBs),
      `-> Equivalente: ${formatCurrency(s.efectivoBsConvertedUsd)}`,
    ],
    [
      'Efectivo en Dolares ($)',
      formatCurrency(s.efectivoUsd),
      `Ref. BCV: ${formatBs(s.efectivoUsd, report.bcvRate)}`,
    ],
    [
      'Zelle ($ USD)',
      formatCurrency(s.zelleUsd),
      `Ref. BCV: ${formatBs(s.zelleUsd, report.bcvRate)}`,
    ],
    [
      'Tarjeta / Punto de Venta',
      formatCurrency(s.tarjetaUsd),
      `Equiv. BCV: ${formatBsAmount(s.tarjetaBs)}`,
    ],
  ];

  // Table header
  drawRect(MARGIN, cursorY, contentW, 20, [0.14, 0.15, 0.18]);
  drawText('METODO DE PAGO / MODALIDAD MONETARIA', MARGIN + 8, cursorY - 13, 'F2', 8, [
    1, 1, 1,
  ]);
  drawText('MONTO ORIGINAL RECAUDADO', MARGIN + 260, cursorY - 13, 'F2', 8, [1, 1, 1]);
  drawText('RECONVERSION OFICIAL BCV', MARGIN + 395, cursorY - 13, 'F2', 8, [1, 1, 1]);
  cursorY -= 20;

  summaryRows.forEach((row, idx) => {
    const bg: [number, number, number] =
      idx % 2 === 0 ? [0.98, 0.98, 0.99] : [0.94, 0.95, 0.97];
    drawRect(MARGIN, cursorY, contentW, 19, bg, [0.86, 0.87, 0.9]);
    drawText(row[0], MARGIN + 8, cursorY - 13, 'F1', 8.5, [0.12, 0.12, 0.15]);
    drawText(row[1], MARGIN + 260, cursorY - 13, 'F2', 8.5, [0.08, 0.08, 0.1]);
    drawText(row[2], MARGIN + 395, cursorY - 13, 'F2', 8.5, [0.08, 0.45, 0.28]);
    cursorY -= 19;
  });

  cursorY -= 16;

  // --- SECTION 3: DETALLE DE PEDIDOS INCLUIDOS EN EL CIERRE ---
  ensureSpace(60);
  drawText(
    `3. RELACION DETALLADA DE PEDIDOS DEL CIERRE (${report.orders.length} REGISTROS)`,
    MARGIN,
    cursorY,
    'F2',
    10.5,
    [0.1, 0.1, 0.12]
  );
  cursorY -= 8;

  if (report.orders.length === 0) {
    drawRect(MARGIN, cursorY, contentW, 26, [0.97, 0.97, 0.98], [0.85, 0.85, 0.88]);
    drawText(
      'Resumen historico consolidado (sin desglose individual de comandas).',
      MARGIN + 10,
      cursorY - 16,
      'F1',
      8.5,
      [0.4, 0.4, 0.45]
    );
    cursorY -= 34;
  } else {
    for (const ord of report.orders) {
      const rate = ord.bcvRateAtOrder || report.bcvRate;
      const itemsLine = ord.items
        .map((it) => `${it.quantity}x ${it.name}`)
        .join(', ');
      const staffOrClient = ord.waiterName
        ? `Mesera/o: ${ord.waiterName}`
        : ord.customerName
        ? `Cliente: ${ord.customerName}`
        : ord.source === 'mesera'
        ? 'Sala / Mesera'
        : 'Menu Publico';

      const paymentLines: string[] = [];
      if (ord.payments && ord.payments.length > 0) {
        for (const sp of ord.payments) {
          const isPm = isPagoMovilMethod(sp.methodId, sp.methodName);
          const isEf = isEfectivoMethod(sp.methodId, sp.methodName);
          const isEfBs = isEf && sp.cashCurrency === 'VES';
          const spBs =
            sp.amountBs && sp.amountBs > 0
              ? sp.amountBs
              : Number((sp.amountUsd * rate).toFixed(2));
          if (isPm) {
            const pmInfo = sp.pagoMovilDetails
              ? ` [${sp.pagoMovilDetails.bank} | Ref #${sp.pagoMovilDetails.referenceLast6}]`
              : '';
            paymentLines.push(
              `Pago Movil: ${formatBsAmount(spBs)} -> ${formatCurrency(sp.amountUsd)}${pmInfo}`
            );
          } else if (isEfBs) {
            paymentLines.push(
              `Efectivo (Bs): ${formatBsAmount(spBs)} -> ${formatCurrency(sp.amountUsd)}`
            );
          } else if (isEf) {
            paymentLines.push(
              `Efectivo ($): ${formatCurrency(sp.amountUsd)} (${formatBsAmount(spBs)})`
            );
          } else {
            paymentLines.push(
              `${sp.methodName}: ${formatCurrency(sp.amountUsd)} (${formatBsAmount(spBs)})`
            );
          }
        }
      } else {
        paymentLines.push(
          `${ord.paymentMethodName}: ${formatCurrency(ord.total)} (${formatBs(ord.total, rate)})`
        );
      }

      const cardH = 44 + paymentLines.length * 12;
      ensureSpace(cardH + 8);

      drawRect(MARGIN, cursorY, contentW, cardH, [0.98, 0.98, 0.99], [0.83, 0.85, 0.89]);
      drawText(
        `${ord.code}  |  ${formatTime(ord.createdAt)}  |  ${modalityLabel(ord.modality, ord.tableNumber)}  |  ${staffOrClient}`,
        MARGIN + 8,
        cursorY - 13,
        'F2',
        8.5,
        [0.08, 0.08, 0.12]
      );
      drawText(
        `Total: ${formatCurrency(ord.total)} (${formatBs(ord.total, rate)})`,
        PAGE_W - MARGIN - 155,
        cursorY - 13,
        'F2',
        8.5,
        [0.06, 0.45, 0.26]
      );

      const clippedItems =
        itemsLine.length > 95 ? itemsLine.slice(0, 92) + '...' : itemsLine;
      drawText(`Platos: ${clippedItems}`, MARGIN + 8, cursorY - 26, 'F1', 8, [
        0.25, 0.26, 0.3,
      ]);

      paymentLines.forEach((pLine, pIdx) => {
        drawText(
          `Pago #${pIdx + 1}: ${pLine}`,
          MARGIN + 8,
          cursorY - 38 - pIdx * 12,
          'F3',
          7.5,
          [0.18, 0.2, 0.25]
        );
      });

      cursorY -= cardH + 6;
    }
  }

  // --- FOOTER TOTAL ---
  ensureSpace(44);
  cursorY -= 4;
  drawRect(MARGIN, cursorY, contentW, 32, [0.09, 0.09, 0.11]);
  drawText(
    `TOTAL GENERAL RECAUDADO EN CAJA: ${formatCurrency(report.totalSalesUsd)}  |  ${formatBsAmount(report.totalSalesBs)}`,
    MARGIN + 12,
    cursorY - 20,
    'F2',
    10,
    [0.98, 0.78, 0.2]
  );

  // --- ASSEMBLE PDF 1.4 BINARY ---
  const objects: string[] = [];
  const addObj = (body: string) => {
    objects.push(body);
    return objects.length;
  };

  const fontRegularId = addObj(
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'
  );
  const fontBoldId = addObj(
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'
  );
  const fontMonoId = addObj(
    '<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>'
  );

  const pagesRootPlaceholderIndex = objects.length;
  objects.push(''); // placeholder for Pages object
  const pagesRootId = pagesRootPlaceholderIndex + 1;

  const pageIds: number[] = [];

  for (let i = 0; i < pages.length; i++) {
    const footerCmd = `BT /F1 7.5 Tf 0.45 0.45 0.5 rg ${MARGIN} 18 Td (${pdfEscape(
      `Gordis Burguer — Reporte Detallado de Cierre de Caja — Pagina ${i + 1} de ${pages.length}`
    )}) Tj ET`;
    const streamContent = [...pages[i], footerCmd].join('\n');
    const contentId = addObj(
      `<< /Length ${streamContent.length} >>\nstream\n${streamContent}\nendstream`
    );
    const pageId = addObj(
      `<< /Type /Page /Parent ${pagesRootId} 0 R /MediaBox [0 0 ${PAGE_W.toFixed(2)} ${PAGE_H.toFixed(
        2
      )}] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R /F3 ${fontMonoId} 0 R >> >> /Contents ${contentId} 0 R >>`
    );
    pageIds.push(pageId);
  }

  objects[pagesRootPlaceholderIndex] = `<< /Type /Pages /Kids [${pageIds
    .map((id) => `${id} 0 R`)
    .join(' ')}] /Count ${pageIds.length} >>`;

  const catalogId = addObj(`<< /Type /Catalog /Pages ${pagesRootId} 0 R >>`);

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];

  for (let i = 0; i < objects.length; i++) {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${offsets[i].toString().padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  // Convert Latin-1 string to Uint8Array so accented characters are preserved accurately
  const bytes = new Uint8Array(pdf.length);
  for (let i = 0; i < pdf.length; i++) {
    bytes[i] = pdf.charCodeAt(i) & 0xff;
  }

  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dateStamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `reporte-cierre-detallado-${report.closureId.toLowerCase()}-${dateStamp}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
