import React from 'react';
import {
  Banknote,
  Building2,
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
  normalizedSplits?: OrderPaymentSplit[];
  primaryMethodId?: string;
  primaryMethodName?: string;
  primaryPagoMovil?: PagoMovilDetails;
  primaryCashCurrency?: CashCurrency;
} {
  if (splits.length === 0) {
    return { ok: false, error: 'Agrega al menos un método de pago.' };
  }

  const built: OrderPaymentSplit[] = [];
  let sumUsd = 0;
  let hasZelle = false;

  for (let i = 0; i < splits.length; i++) {
    const s = splits[i];
    const method =
      enabledMethods.find((pm) => pm.id === s.methodId) ?? enabledMethods[0];
    if (!method) {
      return { ok: false, error: 'Selecciona un método de pago válido.' };
    }

    const amtUsd = parseFloat(s.amountUsd);
    if (Number.isNaN(amtUsd) || amtUsd <= 0) {
      return {
        ok: false,
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
          error: `Selecciona el banco emisor para Pago Móvil (Pago #${i + 1}).`,
        };
      }
      if (cleanRef.length !== 6) {
        return {
          ok: false,
          error: `Ingresa obligatoriamente los 6 últimos dígitos de referencia de Pago Móvil (Pago #${i + 1}).`,
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

  const remaining = Number((orderTotalUsd - sumUsd).toFixed(2));
  if (remaining > 0.02) {
    return {
      ok: false,
      error: `Falta cubrir ${formatCurrency(remaining)} (${formatBs(remaining, bcvRate)}) del total del pedido. Usa "Añadir otro pago" o ajusta el monto.`,
    };
  }

  // Only Zelle requires capture in Public Menu
  if (options?.isPublicMenu && hasZelle && !options.proofFileName) {
    return {
      ok: false,
      error: 'Para pagos por Zelle es obligatorio adjuntar la captura del comprobante.',
    };
  }

  // Build concise summary label for paymentMethodName
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
  const totalPaidUsd = splits.reduce((acc, s) => {
    const val = parseFloat(s.amountUsd);
    return acc + (Number.isNaN(val) ? 0 : val);
  }, 0);

  const remainingUsd = Math.max(0, Number((orderTotalUsd - totalPaidUsd).toFixed(2)));
  const overpaidUsd = Math.max(0, Number((totalPaidUsd - orderTotalUsd).toFixed(2)));

  const hasZelleSelected = splits.some((s) => {
    const m = enabledMethods.find((pm) => pm.id === s.methodId);
    return isZelleMethod(m?.id, m?.name);
  });

  const handleUpdateSplit = (id: string, patch: Partial<PaymentSplitDraft>) => {
    onChangeSplits((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  };

  const handleAddSplit = () => {
    const defaultMethod =
      enabledMethods.find((pm) => !splits.some((s) => s.methodId === pm.id)) ??
      enabledMethods[0];
    if (!defaultMethod) return;

    const currentPaid = splits.reduce((acc, s) => {
      const val = parseFloat(s.amountUsd);
      return acc + (Number.isNaN(val) ? 0 : val);
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
    onChangeSplits((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((item) => item.id !== id);
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-zinc-200">
          Desglose de Pago ({splits.length})
        </span>
        <button
          type="button"
          onClick={handleAddSplit}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-xs font-bold text-amber-300 transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Añadir otro pago</span>
        </button>
      </div>

      {/* Live Payment Balance Banner (Total vs Pagado vs Restante) */}
      <div className="rounded-xl bg-zinc-950 border border-white/10 p-3 space-y-1.5 text-xs">
        <div className="flex items-center justify-between text-zinc-300">
          <span>Total del Pedido:</span>
          <strong className="font-mono text-white tabular-nums">
            {formatCurrency(orderTotalUsd)} · {formatBs(orderTotalUsd, bcvRate)}
          </strong>
        </div>
        <div className="flex items-center justify-between text-zinc-300">
          <span>Pagado / Registrado:</span>
          <strong className="font-mono text-emerald-400 tabular-nums">
            {formatCurrency(totalPaidUsd)} · {formatBs(totalPaidUsd, bcvRate)}
          </strong>
        </div>
        <div className="flex items-center justify-between pt-1.5 border-t border-white/10">
          <span className="font-semibold text-zinc-200">
            {overpaidUsd > 0.01 ? 'Vuelto / Excedente:' : 'Restante por Pagar:'}
          </span>
          {overpaidUsd > 0.01 ? (
            <strong className="font-mono text-sky-400 tabular-nums">
              {formatCurrency(overpaidUsd)} · {formatBs(overpaidUsd, bcvRate)}
            </strong>
          ) : remainingUsd > 0.01 ? (
            <strong className="font-mono text-amber-400 tabular-nums">
              {formatCurrency(remainingUsd)} · {formatBs(remainingUsd, bcvRate)}
            </strong>
          ) : (
            <strong className="font-mono text-emerald-400 tabular-nums">
              $0.00 · Bs. 0,00 (Completo)
            </strong>
          )}
        </div>
      </div>

      {/* Individual Payment Splits */}
      <div className="space-y-3">
        {splits.map((split, index) => {
          const method =
            enabledMethods.find((pm) => pm.id === split.methodId) ??
            enabledMethods[0];
          const isPm = isPagoMovilMethod(method?.id, method?.name);
          const isEf = isEfectivoMethod(method?.id, method?.name);
          const numericUsd = parseFloat(split.amountUsd) || 0;
          const numericBs = Number((numericUsd * bcvRate).toFixed(2));

          // Other splits sum to compute exact remaining for this row
          const otherSplitsUsd = splits.reduce((acc, s) => {
            if (s.id === split.id) return acc;
            const v = parseFloat(s.amountUsd);
            return acc + (Number.isNaN(v) ? 0 : v);
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
              className="rounded-xl bg-zinc-950/90 border border-white/15 p-3 space-y-2.5"
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
                        Usar restante ({formatCurrency(remainingForThisRowUsd)})
                      </button>
                    )}
                  {splits.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveSplit(split.id)}
                      className="p-1 rounded-lg bg-zinc-900 hover:bg-red-950/60 text-zinc-400 hover:text-red-400 cursor-pointer"
                      title="Eliminar este pago"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Method Selector */}
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">
                  Método de Pago
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
                      Restante / Total tras este efectivo:
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
                        : `Cubierto (${formatCurrency(orderTotalUsd)})`}
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
                      Restante / Total del pedido:
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
                        : `Cubierto (${formatCurrency(orderTotalUsd)})`}
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
                    <span className="text-zinc-400 font-sans">Restante del pedido:</span>
                    <span
                      className={
                        rowAfterThisUsd > 0.01
                          ? 'text-amber-400 font-bold'
                          : 'text-emerald-400 font-bold'
                      }
                    >
                      {rowAfterThisUsd > 0.01
                        ? `${formatCurrency(rowAfterThisUsd)} (${formatBs(rowAfterThisUsd, bcvRate)})`
                        : 'Cubierto ($0.00)'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

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
    </div>
  );
}
