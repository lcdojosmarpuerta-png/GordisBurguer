import React from 'react';
import {
  AlertCircle,
  Banknote,
  Building2,
  CheckCircle2,
  CreditCard,
  FileCheck2,
  Hash,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react';
import { PAGO_MOVIL_BANKS } from '../data/initialData';
import {
  CashCurrency,
  Order,
  OrderPaymentSplit,
  PagoMovilDetails,
  PaymentMethod,
} from '../types/restaurant';
import { formatBs, formatBsAmount, formatCurrency } from './SharedUI';

export interface PaymentSplitDraft {
  id: string;
  methodId: string;
  amountUsd: string; // Stored in USD string for unified calculation
  cashCurrency: CashCurrency; // 'USD' or 'VES' when Efectivo is selected
  pmBank: string;
  pmReference6: string;
}

export function isPagoMovilMethod(id?: string, name?: string): boolean {
  if (!id && !name) return false;
  if (id === 'pm-pago-movil') return true;
  const lower = (name ?? '').toLowerCase();
  return lower.includes('pago móvil') || lower.includes('pago movil');
}

export function isEfectivoMethod(id?: string, name?: string): boolean {
  if (!id && !name) return false;
  if (id === 'pm-efectivo') return true;
  const lower = (name ?? '').toLowerCase();
  return lower.includes('efectivo');
}

export function isZelleMethod(id?: string, name?: string): boolean {
  if (!id && !name) return false;
  if (id === 'pm-zelle') return true;
  const lower = (name ?? '').toLowerCase();
  return lower.includes('zelle');
}

export function createInitialPaymentSplit(
  defaultMethodId: string,
  orderTotalUsd: number
): PaymentSplitDraft {
  return {
    id: `split-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    methodId: defaultMethodId,
    amountUsd: orderTotalUsd > 0 ? orderTotalUsd.toFixed(2) : '',
    cashCurrency: 'USD',
    pmBank: PAGO_MOVIL_BANKS[0],
    pmReference6: '',
  };
}

export function createSplitsFromExistingOrder(
  order: Order,
  defaultMethodId: string
): PaymentSplitDraft[] {
  if (order.payments && order.payments.length > 0) {
    return order.payments.map((p) => ({
      id: p.id || `split-${Math.random().toString(36).slice(2, 7)}`,
      methodId: p.methodId,
      amountUsd: p.amountUsd.toFixed(2),
      cashCurrency: p.cashCurrency ?? 'USD',
      pmBank: p.pagoMovilDetails?.bank ?? PAGO_MOVIL_BANKS[0],
      pmReference6: p.pagoMovilDetails?.referenceLast6 ?? '',
    }));
  }
  return [
    {
      id: `split-${Date.now()}`,
      methodId: order.paymentMethodId || defaultMethodId,
      amountUsd: order.total.toFixed(2),
      cashCurrency: order.cashCurrency ?? 'USD',
      pmBank: order.pagoMovilDetails?.bank ?? PAGO_MOVIL_BANKS[0],
      pmReference6: order.pagoMovilDetails?.referenceLast6 ?? '',
    },
  ];
}

export function validateAndBuildPaymentSplits(
  splits: PaymentSplitDraft[],
  enabledMethods: PaymentMethod[],
  orderTotalUsd: number,
  bcvRate: number,
  options?: {
    isPublicMenu?: boolean;
    proofFileName?: string;
  }
): {
  ok: boolean;
  error?: string;
  totalLoadedUsd: number;
  remainingUsd: number;
  normalizedSplits?: OrderPaymentSplit[];
  primaryMethodId?: string;
  primaryMethodName?: string;
  primaryPagoMovil?: PagoMovilDetails;
  primaryCashCurrency?: CashCurrency;
} {
  const totalLoadedUsd = Number(
    splits
      .reduce((acc, s) => {
        const val = parseFloat(s.amountUsd);
        return acc + (Number.isNaN(val) || val < 0 ? 0 : val);
      }, 0)
      .toFixed(2)
  );
  const remainingUsd = Math.max(
    0,
    Number((orderTotalUsd - totalLoadedUsd).toFixed(2))
  );

  if (orderTotalUsd <= 0) {
    return {
      ok: false,
      totalLoadedUsd,
      remainingUsd,
      error: 'Selecciona al menos un artículo para calcular el total a cancelar.',
    };
  }

  if (splits.length === 0) {
    return {
      ok: false,
      totalLoadedUsd: 0,
      remainingUsd: orderTotalUsd,
      error: 'Haz clic en "Agregar Pago" para registrar el método de pago del pedido.',
    };
  }

  const built: OrderPaymentSplit[] = [];
  let sumUsd = 0;
  let hasZelle = false;

  for (let i = 0; i < splits.length; i++) {
    const s = splits[i];
    const method =
      enabledMethods.find((pm) => pm.id === s.methodId) ?? enabledMethods[0];
    if (!method) {
      return {
        ok: false,
        totalLoadedUsd,
        remainingUsd,
        error: 'Selecciona un método de pago válido.',
      };
    }

    const amtUsd = parseFloat(s.amountUsd);
    if (Number.isNaN(amtUsd) || amtUsd <= 0) {
      return {
        ok: false,
        totalLoadedUsd,
        remainingUsd,
        error: `Ingresa un monto mayor a $0.00 en el pago #${i + 1} (${method.name}).`,
      };
    }

    const isPm = isPagoMovilMethod(method.id, method.name);
    const isEf = isEfectivoMethod(method.id, method.name);
    const isZe = isZelleMethod(method.id, method.name);

    if (isZe) {
      hasZelle = true;
    }

    let pmDetails: PagoMovilDetails | undefined;
    if (isPm) {
      const cleanRef = s.pmReference6.replace(/\D/g, '');
      if (!s.pmBank.trim()) {
        return {
          ok: false,
          totalLoadedUsd,
          remainingUsd,
          error: `Selecciona el banco emisor para Pago Móvil (Pago #${i + 1}).`,
        };
      }
      if (cleanRef.length !== 6) {
        return {
          ok: false,
          totalLoadedUsd,
          remainingUsd,
          error: `Ingresa los 6 últimos dígitos de referencia de Pago Móvil (Pago #${i + 1}).`,
        };
      }
      pmDetails = {
        bank: s.pmBank.trim(),
        amount: Number(amtUsd.toFixed(2)),
        referenceLast6: cleanRef,
      };
    }

    const roundedUsd = Number(amtUsd.toFixed(2));
    const roundedBs = Number((roundedUsd * bcvRate).toFixed(2));
    sumUsd += roundedUsd;

    built.push({
      id: s.id,
      methodId: method.id,
      methodName: method.name,
      amountUsd: roundedUsd,
      amountBs: roundedBs,
      cashCurrency: isEf ? s.cashCurrency : undefined,
      pagoMovilDetails: pmDetails,
    });
  }

  const diff = Number((orderTotalUsd - sumUsd).toFixed(2));
  if (diff > 0.01) {
    return {
      ok: false,
      totalLoadedUsd: sumUsd,
      remainingUsd: diff,
      error: `Falta cancelar ${formatCurrency(diff)} (${formatBs(
        diff,
        bcvRate
      )}) para completar el total del pedido.`,
    };
  }

  // Only Zelle requires capture in Public Menu
  if (options?.isPublicMenu && hasZelle && !options.proofFileName) {
    return {
      ok: false,
      totalLoadedUsd: sumUsd,
      remainingUsd: 0,
      error: 'Adjunta la captura del comprobante de Zelle para completar el pago.',
    };
  }

  const summaryNames = built.map((b) => {
    if (isEfectivoMethod(b.methodId, b.methodName)) {
      return `Efectivo (${b.cashCurrency === 'VES' ? 'Bs' : '$'})`;
    }
    return b.methodName;
  });
  const uniqueSummary = Array.from(new Set(summaryNames)).join(' + ');

  const firstPm = built.find((b) => b.pagoMovilDetails)?.pagoMovilDetails;
  const firstCash = built.find((b) => b.cashCurrency)?.cashCurrency;

  return {
    ok: true,
    totalLoadedUsd: sumUsd,
    remainingUsd: 0,
    normalizedSplits: built,
    primaryMethodId: built[0].methodId,
    primaryMethodName: uniqueSummary,
    primaryPagoMovil: firstPm,
    primaryCashCurrency: firstCash,
  };
}

interface PaymentSplitFormProps {
  splits: PaymentSplitDraft[];
  onChangeSplits: React.Dispatch<React.SetStateAction<PaymentSplitDraft[]>>;
  enabledMethods: PaymentMethod[];
  orderTotalUsd: number;
  bcvRate: number;
  showZelleProofUpload?: boolean;
  proofFileName?: string;
  proofPreviewUrl?: string;
  onFileUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function PaymentSplitForm({
  splits,
  onChangeSplits,
  enabledMethods,
  orderTotalUsd,
  bcvRate,
  showZelleProofUpload = false,
  proofFileName = '',
  proofPreviewUrl = '',
  onFileUpload,
}: PaymentSplitFormProps) {
  const totalPaidUsd = Number(
    splits
      .reduce((acc, s) => {
        const val = parseFloat(s.amountUsd);
        return acc + (Number.isNaN(val) || val < 0 ? 0 : val);
      }, 0)
      .toFixed(2)
  );

  const remainingUsd = Math.max(0, Number((orderTotalUsd - totalPaidUsd).toFixed(2)));
  const overpaidUsd = Math.max(0, Number((totalPaidUsd - orderTotalUsd).toFixed(2)));
  const progressPct =
    orderTotalUsd > 0
      ? Math.min(100, Math.round((totalPaidUsd / orderTotalUsd) * 100))
      : 0;
  const isFullyCovered = orderTotalUsd > 0 && remainingUsd <= 0.01 && splits.length > 0;

  const hasZelleSelected = splits.some((s) => {
    const m = enabledMethods.find((pm) => pm.id === s.methodId);
    return isZelleMethod(m?.id, m?.name);
  });

  const handleUpdateSplit = (id: string, patch: Partial<PaymentSplitDraft>) => {
    onChangeSplits((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  };

  const handleAddPayment = () => {
    const defaultMethod =
      enabledMethods.find((pm) => !splits.some((s) => s.methodId === pm.id)) ??
      enabledMethods[0];
    if (!defaultMethod) return;

    const currentPaid = splits.reduce((acc, s) => {
      const val = parseFloat(s.amountUsd);
      return acc + (Number.isNaN(val) || val < 0 ? 0 : val);
    }, 0);
    const nextRemaining = Math.max(0, Number((orderTotalUsd - currentPaid).toFixed(2)));

    onChangeSplits((prev) => [
      ...prev,
      {
        id: `split-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        methodId: defaultMethod.id,
        amountUsd: nextRemaining > 0 ? nextRemaining.toFixed(2) : '',
        cashCurrency: 'USD',
        pmBank: PAGO_MOVIL_BANKS[0],
        pmReference6: '',
      },
    ]);
  };

  const handleRemoveSplit = (id: string) => {
    onChangeSplits((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <div className="space-y-3.5">
      {/* 1. TOTAL A CANCELAR & COMPARACIÓN CON PAGO CARGADO */}
      <div className="rounded-xl bg-zinc-950 border border-amber-500/35 p-3.5 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <span className="block text-[11px] font-bold uppercase tracking-wider text-amber-400">
              Total a Cancelar
            </span>
            <span className="font-mono text-xs text-zinc-400 tabular-nums">
              {formatBs(orderTotalUsd, bcvRate)}
            </span>
          </div>
          <span className="font-mono text-2xl font-bold text-white tabular-nums">
            {formatCurrency(orderTotalUsd)}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 rounded-full bg-zinc-900 overflow-hidden border border-white/10">
          <div
            className={`h-full transition-all duration-300 ${
              isFullyCovered ? 'bg-emerald-500' : 'bg-amber-500'
            }`}
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Comparison: Pago Cargado vs Restante por Cancelar */}
        <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
          <div className="rounded-lg bg-zinc-900/90 border border-white/10 px-2.5 py-2">
            <span className="block text-[11px] text-zinc-400">Pago Cargado:</span>
            <strong className="font-mono text-sm text-emerald-400 tabular-nums">
              {formatCurrency(totalPaidUsd)}
            </strong>
            <span className="block font-mono text-[10px] text-zinc-400 tabular-nums">
              {formatBs(totalPaidUsd, bcvRate)}
            </span>
          </div>

          <div
            className={`rounded-lg border px-2.5 py-2 ${
              isFullyCovered
                ? 'bg-emerald-950/30 border-emerald-500/40'
                : 'bg-amber-950/25 border-amber-500/40'
            }`}
          >
            <span className="block text-[11px] text-zinc-300">
              {overpaidUsd > 0.01 ? 'Vuelto / Excedente:' : 'Falta por Cancelar:'}
            </span>
            {overpaidUsd > 0.01 ? (
              <>
                <strong className="font-mono text-sm text-sky-400 tabular-nums">
                  {formatCurrency(overpaidUsd)}
                </strong>
                <span className="block font-mono text-[10px] text-sky-300/80 tabular-nums">
                  {formatBs(overpaidUsd, bcvRate)}
                </span>
              </>
            ) : remainingUsd > 0.01 ? (
              <>
                <strong className="font-mono text-sm text-amber-400 tabular-nums">
                  {formatCurrency(remainingUsd)}
                </strong>
                <span className="block font-mono text-[10px] text-amber-300/80 tabular-nums">
                  {formatBs(remainingUsd, bcvRate)}
                </span>
              </>
            ) : (
              <>
                <strong className="font-mono text-sm text-emerald-400 tabular-nums">
                  $0.00 (Cubierto)
                </strong>
                <span className="block font-mono text-[10px] text-emerald-300/80 tabular-nums">
                  100% completado
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 2. BOTÓN DE ACCIÓN "AGREGAR PAGO" */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-zinc-200">
          Pagos Cargados ({splits.length})
        </span>
        <button
          type="button"
          onClick={handleAddPayment}
          disabled={orderTotalUsd <= 0}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-red-600 hover:from-amber-400 hover:to-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold shadow-md transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{splits.length === 0 ? 'Agregar Pago' : 'Añadir otro pago'}</span>
        </button>
      </div>

      {/* Empty state if user hasn't clicked "Agregar Pago" yet */}
      {splits.length === 0 ? (
        <div className="rounded-xl border border-dashed border-amber-500/40 bg-amber-500/5 p-4 text-center space-y-2">
          <AlertCircle className="w-5 h-5 text-amber-400 mx-auto" />
          <p className="text-xs text-zinc-200 font-medium">
            Aún no has cargado ningún pago para esta orden.
          </p>
          <p className="text-[11px] text-zinc-400">
            Haz clic en el botón <strong className="text-amber-400">&ldquo;Agregar Pago&rdquo;</strong> para seleccionar el método de pago y cubrir el total de{' '}
            <strong className="text-white font-mono">
              {formatCurrency(orderTotalUsd)} ({formatBs(orderTotalUsd, bcvRate)})
            </strong>
            .
          </p>
          <button
            type="button"
            onClick={handleAddPayment}
            disabled={orderTotalUsd <= 0}
            className="mt-1 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-zinc-950 text-xs font-bold shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Agregar Pago Ahora</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {splits.map((split, index) => {
            const method =
              enabledMethods.find((pm) => pm.id === split.methodId) ??
              enabledMethods[0];
            const isPm = isPagoMovilMethod(method?.id, method?.name);
            const isEf = isEfectivoMethod(method?.id, method?.name);
            const numericUsd = parseFloat(split.amountUsd) || 0;
            const numericBs = Number((numericUsd * bcvRate).toFixed(2));

            const otherSplitsUsd = splits.reduce((acc, s) => {
              if (s.id === split.id) return acc;
              const v = parseFloat(s.amountUsd);
              return acc + (Number.isNaN(v) || v < 0 ? 0 : v);
            }, 0);
            const remainingForThisRowUsd = Math.max(
              0,
              Number((orderTotalUsd - otherSplitsUsd).toFixed(2))
            );
            const rowAfterThisUsd = Math.max(
              0,
              Number((remainingForThisRowUsd - numericUsd).toFixed(2))
            );

            return (
              <div
                key={split.id}
                className="rounded-xl bg-zinc-950/95 border border-white/15 p-3 space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                    Pago #{index + 1}
                  </span>
                  <div className="flex items-center gap-2">
                    {Math.abs(numericUsd - remainingForThisRowUsd) > 0.01 &&
                      remainingForThisRowUsd > 0 && (
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateSplit(split.id, {
                              amountUsd: remainingForThisRowUsd.toFixed(2),
                            })
                          }
                          className="text-[11px] font-semibold text-emerald-400 hover:underline cursor-pointer"
                        >
                          Completar restante ({formatCurrency(remainingForThisRowUsd)})
                        </button>
                      )}
                    <button
                      type="button"
                      onClick={() => handleRemoveSplit(split.id)}
                      className="p-1 rounded-lg bg-zinc-900 hover:bg-red-950/60 text-zinc-400 hover:text-red-400 cursor-pointer"
                      title="Quitar este pago"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Method Selector */}
                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">
                    Seleccionar Método de Pago
                  </label>
                  <div className="relative">
                    <CreditCard className="w-3.5 h-3.5 text-amber-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <select
                      value={method?.id ?? ''}
                      onChange={(e) =>
                        handleUpdateSplit(split.id, { methodId: e.target.value })
                      }
                      className="w-full rounded-lg bg-zinc-900 border border-white/15 pl-8 pr-3 py-2 text-xs font-medium text-white focus:outline-none focus:border-amber-500"
                    >
                      {enabledMethods.map((pm) => (
                        <option key={pm.id} value={pm.id} className="bg-zinc-900">
                          {pm.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {method?.details && (
                    <p className="text-[11px] text-zinc-400 mt-1">{method.details}</p>
                  )}
                </div>

                {/* EFECTIVO ($ / Bs): Currency Selector + Dual Input + Restante */}
                {isEf && (
                  <div className="rounded-xl bg-zinc-900/90 border border-emerald-500/30 p-2.5 space-y-2.5">
                    <div>
                      <span className="block text-[11px] font-semibold text-emerald-400 mb-1.5">
                        ¿En cuál moneda se pagó el Efectivo? *
                      </span>
                      <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-zinc-950 border border-white/10">
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateSplit(split.id, { cashCurrency: 'USD' })
                          }
                          className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                            split.cashCurrency === 'USD'
                              ? 'bg-emerald-500 text-zinc-950'
                              : 'text-zinc-400 hover:text-white'
                          }`}
                        >
                          <Banknote className="w-3.5 h-3.5" />
                          <span>Dólares ($)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateSplit(split.id, { cashCurrency: 'VES' })
                          }
                          className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                            split.cashCurrency === 'VES'
                              ? 'bg-amber-500 text-zinc-950'
                              : 'text-zinc-400 hover:text-white'
                          }`}
                        >
                          <Banknote className="w-3.5 h-3.5" />
                          <span>Bolívares (Bs)</span>
                        </button>
                      </div>
                    </div>

                    {split.cashCurrency === 'USD' ? (
                      <div>
                        <label className="block text-[11px] text-zinc-300 mb-1">
                          Monto Pagado en Efectivo ($) *
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          required
                          value={split.amountUsd}
                          onChange={(e) =>
                            handleUpdateSplit(split.id, { amountUsd: e.target.value })
                          }
                          placeholder="0.00"
                          className="w-full rounded-lg bg-zinc-950 border border-white/15 px-2.5 py-1.5 text-xs font-mono text-white tabular-nums focus:outline-none focus:border-emerald-500"
                        />
                        <p className="text-[11px] font-mono text-zinc-400 mt-1 tabular-nums">
                          Equivalente BCV: {formatBsAmount(numericBs)}
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] text-zinc-300 mb-1">
                            Monto en Bolívares (Bs) *
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            required
                            value={numericBs > 0 ? numericBs : ''}
                            onChange={(e) => {
                              const valBs = parseFloat(e.target.value);
                              if (Number.isNaN(valBs) || valBs <= 0) {
                                handleUpdateSplit(split.id, { amountUsd: '' });
                              } else {
                                const usdEq = (valBs / bcvRate).toFixed(2);
                                handleUpdateSplit(split.id, { amountUsd: usdEq });
                              }
                            }}
                            placeholder="0.00"
                            className="w-full rounded-lg bg-zinc-950 border border-amber-500/40 px-2.5 py-1.5 text-xs font-mono text-amber-300 tabular-nums focus:outline-none focus:border-amber-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-zinc-300 mb-1">
                            Equivalente ($) a tasa BCV
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            required
                            value={split.amountUsd}
                            onChange={(e) =>
                              handleUpdateSplit(split.id, { amountUsd: e.target.value })
                            }
                            placeholder="0.00"
                            className="w-full rounded-lg bg-zinc-950 border border-white/15 px-2.5 py-1.5 text-xs font-mono text-white tabular-nums focus:outline-none focus:border-amber-500"
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1.5 border-t border-white/10 text-[11px] font-mono tabular-nums">
                      <span className="text-zinc-400 font-sans">
                        Comparación con Total:
                      </span>
                      <span
                        className={
                          rowAfterThisUsd > 0.01
                            ? 'text-amber-400 font-bold'
                            : 'text-emerald-400 font-bold'
                        }
                      >
                        {rowAfterThisUsd > 0.01
                          ? `Resta: ${formatCurrency(rowAfterThisUsd)} (${formatBs(rowAfterThisUsd, bcvRate)})`
                          : `Pago Completo (${formatCurrency(orderTotalUsd)})`}
                      </span>
                    </div>
                  </div>
                )}

                {/* PAGO MÓVIL: Mandatory Bank, Amount ($/Bs), and 6-digit Reference */}
                {isPm && (
                  <div className="rounded-xl bg-zinc-900/90 border border-amber-500/35 p-2.5 space-y-2.5">
                    <p className="text-[11px] font-semibold text-amber-400">
                      Datos Obligatorios de Pago Móvil (Sin captura)
                    </p>

                    <div>
                      <label className="block text-[11px] text-zinc-300 mb-1">
                        Banco Emisor *
                      </label>
                      <div className="relative">
                        <Building2 className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <select
                          value={split.pmBank}
                          onChange={(e) =>
                            handleUpdateSplit(split.id, { pmBank: e.target.value })
                          }
                          className="w-full rounded-lg bg-zinc-950 border border-white/15 pl-8 pr-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                        >
                          {PAGO_MOVIL_BANKS.map((bank) => (
                            <option key={bank} value={bank}>
                              {bank}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] text-zinc-300 mb-1">
                          Monto ($) *
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          required
                          value={split.amountUsd}
                          onChange={(e) =>
                            handleUpdateSplit(split.id, { amountUsd: e.target.value })
                          }
                          placeholder="0.00"
                          className="w-full rounded-lg bg-zinc-950 border border-white/15 px-2.5 py-1.5 text-xs font-mono text-white tabular-nums focus:outline-none focus:border-amber-500"
                        />
                        <span className="block text-[10px] font-mono text-amber-300/90 mt-0.5 tabular-nums">
                          {formatBsAmount(numericBs)}
                        </span>
                      </div>

                      <div>
                        <label className="block text-[11px] text-zinc-300 mb-1">
                          Ref. (6 últimos dígitos) *
                        </label>
                        <div className="relative">
                          <Hash className="w-3.5 h-3.5 text-amber-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            required
                            value={split.pmReference6}
                            onChange={(e) =>
                              handleUpdateSplit(split.id, {
                                pmReference6: e.target.value
                                  .replace(/\D/g, '')
                                  .slice(0, 6),
                              })
                            }
                            placeholder="Ej. 489821"
                            className="w-full rounded-lg bg-zinc-950 border border-white/15 pl-7 pr-2.5 py-1.5 text-xs font-mono text-white tabular-nums focus:outline-none focus:border-amber-500"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1.5 border-t border-white/10 text-[11px] font-mono tabular-nums">
                      <span className="text-zinc-400 font-sans">
                        Comparación con Total:
                      </span>
                      <span
                        className={
                          rowAfterThisUsd > 0.01
                            ? 'text-amber-400 font-bold'
                            : 'text-emerald-400 font-bold'
                        }
                      >
                        {rowAfterThisUsd > 0.01
                          ? `Resta: ${formatCurrency(rowAfterThisUsd)} (${formatBs(rowAfterThisUsd, bcvRate)})`
                          : `Pago Completo (${formatCurrency(orderTotalUsd)})`}
                      </span>
                    </div>
                  </div>
                )}

                {/* OTHER METHODS (Zelle, Tarjeta, etc.): Amount Input + Restante */}
                {!isEf && !isPm && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-[11px] text-zinc-300">
                        Monto a pagar con {method?.name} ($) *
                      </label>
                      <span className="font-mono text-[11px] text-amber-300 tabular-nums">
                        {formatBsAmount(numericBs)}
                      </span>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={split.amountUsd}
                      onChange={(e) =>
                        handleUpdateSplit(split.id, { amountUsd: e.target.value })
                      }
                      placeholder="0.00"
                      className="w-full rounded-lg bg-zinc-900 border border-white/15 px-2.5 py-1.5 text-xs font-mono text-white tabular-nums focus:outline-none focus:border-amber-500"
                    />
                    <div className="flex items-center justify-between text-[11px] font-mono tabular-nums pt-0.5">
                      <span className="text-zinc-400 font-sans">Comparación con Total:</span>
                      <span
                        className={
                          rowAfterThisUsd > 0.01
                            ? 'text-amber-400 font-bold'
                            : 'text-emerald-400 font-bold'
                        }
                      >
                        {rowAfterThisUsd > 0.01
                          ? `Resta: ${formatCurrency(rowAfterThisUsd)} (${formatBs(rowAfterThisUsd, bcvRate)})`
                          : 'Pago Completo ($0.00)'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ONLY show Capture Upload when Zelle is selected in Public Menu */}
      {showZelleProofUpload && hasZelleSelected && (
        <div className="rounded-xl bg-zinc-950 border border-amber-500/40 p-3.5 space-y-2">
          <label className="block text-xs font-semibold text-white">
            Cargar Comprobante de Pago (Capture Zelle){' '}
            <span className="text-amber-400 font-normal">(Obligatorio para Zelle)</span>
          </label>

          <label className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 bg-zinc-900/60 hover:bg-zinc-900 hover:border-amber-500/50 p-4 cursor-pointer transition-colors">
            {proofFileName ? (
              <>
                <FileCheck2 className="w-5 h-5 text-emerald-400" />
                <span className="text-xs font-semibold text-emerald-300 text-center break-all">
                  {proofFileName}
                </span>
                {proofPreviewUrl && (
                  <img
                    src={proofPreviewUrl}
                    alt="Vista previa de comprobante Zelle"
                    className="mt-1.5 max-h-24 rounded-lg border border-white/10 object-contain"
                  />
                )}
                <span className="text-[11px] text-zinc-400">
                  Haz clic para reemplazar captura de Zelle
                </span>
              </>
            ) : (
              <>
                <Upload className="w-5 h-5 text-amber-400" />
                <span className="text-xs font-medium text-zinc-200 text-center">
                  Subir captura de transferencia Zelle
                </span>
                <span className="text-[11px] text-zinc-500">PNG, JPG o PDF</span>
              </>
            )}
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={onFileUpload}
              className="sr-only"
            />
          </label>
        </div>
      )}

      {/* Status Notice comparing Total vs Pago Cargado */}
      {splits.length > 0 && (
        <div
          className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium border ${
            isFullyCovered
              ? 'bg-emerald-950/30 border-emerald-500/35 text-emerald-300'
              : 'bg-amber-950/30 border-amber-500/35 text-amber-300'
          }`}
        >
          {isFullyCovered ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Pago cargado en su totalidad ({formatCurrency(totalPaidUsd)}). Ya puedes confirmar la orden.
              </span>
            </>
          ) : (
            <>
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                Faltan{' '}
                <strong className="font-mono">
                  {formatCurrency(remainingUsd)} ({formatBs(remainingUsd, bcvRate)})
                </strong>{' '}
                para completar el pago total. Usa &ldquo;Añadir otro pago&rdquo; o ajusta el monto.
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
