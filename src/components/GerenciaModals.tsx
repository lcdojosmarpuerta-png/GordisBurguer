import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Banknote,
  Bike,
  Building2,
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  Download,
  Eye,
  EyeOff,
  FileCheck2,
  FileText,
  KeyRound,
  MessageCircle,
  Minus,
  Phone,
  Plus,
  Receipt,
  Save,
  Trash2,
  Truck,
  UserCheck,
  UserPlus,
  X,
} from 'lucide-react';
import { useRestaurant } from '../context/RestaurantContext';
import {
  CashClosureRecord,
  DeliveryDriver,
  Order,
  OrderItem,
  OrderModality,
  OrderStatus,
  UserRole,
} from '../types/restaurant';
import {
  buildDetailedClosureReportData,
  downloadDetailedClosurePdf,
} from '../utils/pdfReportGenerator';
import {
  PaymentSplitDraft,
  PaymentSplitForm,
  createSplitsFromExistingOrder,
  isEfectivoMethod,
  isPagoMovilMethod,
  validateAndBuildPaymentSplits,
} from './PaymentSplitForm';
import {
  OrderStatusText,
  formatBs,
  formatBsAmount,
  formatCurrency,
  formatTime,
  modalityLabel,
} from './SharedUI';

export { isPagoMovilMethod, isEfectivoMethod };

export function PasswordsModal({ onClose }: { onClose: () => void }) {
  const { credentials, updateRolePassword } = useRestaurant();
  const [meseraPass, setMeseraPass] = useState(credentials.mesera);
  const [cocinaPass, setCocinaPass] = useState(credentials.cocina);
  const [gerenciaPass, setGerenciaPass] = useState(credentials.gerencia);
  const [visibleRole, setVisibleRole] = useState<UserRole | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (meseraPass.trim()) updateRolePassword('mesera', meseraPass);
    if (cocinaPass.trim()) updateRolePassword('cocina', cocinaPass);
    if (gerenciaPass.trim()) updateRolePassword('gerencia', gerenciaPass);
    onClose();
  };

  const renderField = (
    role: UserRole,
    label: string,
    helper: string,
    value: string,
    onChange: (v: string) => void
  ) => {
    const isVisible = visibleRole === role;
    return (
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-sm font-semibold text-white">{label}</label>
          <span className="text-xs text-zinc-400">{helper}</span>
        </div>
        <div className="relative">
          <input
            type={isVisible ? 'text' : 'password'}
            required
            minLength={3}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full rounded-xl bg-zinc-950 border border-white/15 px-3.5 py-2.5 pr-10 text-sm font-mono text-white focus:outline-none focus:border-amber-500"
          />
          <button
            type="button"
            onClick={() => setVisibleRole(isVisible ? null : role)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white cursor-pointer"
            aria-label="Mostrar u ocultar clave"
          >
            {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-zinc-900 border border-white/15 p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <KeyRound className="w-5 h-5 text-amber-400" />
            <h3 className="font-display text-lg font-bold text-white">
              Asignación de Contraseñas
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="mt-5 space-y-4">
          <p className="text-xs text-zinc-400">
            Crea o actualiza las credenciales de acceso para cada estación operativa. Los cambios aplican inmediatamente en el módulo de Inicio.
          </p>

          {renderField(
            'mesera',
            'Rol Mesera',
            'Toma de órdenes en sala',
            meseraPass,
            setMeseraPass
          )}
          {renderField(
            'cocina',
            'Rol Cocina',
            'Pantalla KDS',
            cocinaPass,
            setCocinaPass
          )}
          {renderField(
            'gerencia',
            'Rol Gerencia',
            'Administración total',
            gerenciaPass,
            setGerenciaPass
          )}

          <div className="pt-3 flex items-center justify-end gap-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-amber-500 hover:from-red-500 hover:to-amber-400 text-xs font-bold text-white shadow-lg cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Guardar Credenciales</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * Detailed Cash Closure PDF Report Modal
 * Replaces the thermal printer modal with a comprehensive PDF Report preview and direct .pdf file export.
 */
export function DetailedClosurePdfModal({
  orders,
  closureRecord,
  bcvRate,
  onClose,
}: {
  orders: Order[];
  closureRecord?: CashClosureRecord | null;
  bcvRate: number;
  onClose: () => void;
}) {
  const { showToast } = useRestaurant();

  const reportData = useMemo(
    () => buildDetailedClosureReportData(orders, bcvRate, closureRecord),
    [orders, bcvRate, closureRecord]
  );

  const handleDownloadPdf = () => {
    downloadDetailedClosurePdf(reportData);
    showToast('Reporte de Cierre en PDF Detallado exportado correctamente.', 'success');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-4xl rounded-2xl bg-zinc-900 border border-white/15 p-5 sm:p-6 shadow-2xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-display text-lg font-bold text-white">
                Reporte de Cierre de Caja en PDF Detallado
              </h3>
              <p className="text-xs text-zinc-400">
                {reportData.subtitle} · Tasa Oficial BCV: Bs.{' '}
                {reportData.bcvRate.toFixed(2)} / $1.00
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Detailed Report Preview */}
        <div className="flex-1 overflow-y-auto my-4 space-y-5 pr-1">
          {/* Header Banner */}
          <div className="rounded-2xl bg-zinc-950 border border-amber-500/35 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-400">
                Gordis Burguer · Documento Financiero Oficial
              </p>
              <h4 className="font-display text-xl font-bold text-white mt-0.5">
                {reportData.title}
              </h4>
              <p className="text-xs text-zinc-400 mt-1 font-mono tabular-nums">
                ID: {reportData.closureId} · Emisión: {reportData.issuedAt} · Responsable:{' '}
                {reportData.closedBy}
              </p>
            </div>
            <div className="text-right font-mono tabular-nums shrink-0 bg-zinc-900 border border-white/10 rounded-xl px-4 py-2.5">
              <span className="block text-[11px] text-zinc-400 font-sans">
                Tasa Oficial BCV
              </span>
              <strong className="text-base text-emerald-400">
                Bs. {reportData.bcvRate.toFixed(2)} / $1.00
              </strong>
            </div>
          </div>

          {/* 1. Resumen Ejecutivo */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="rounded-xl bg-zinc-950 border border-white/10 p-4">
              <span className="text-xs text-zinc-400">Pedidos Procesados</span>
              <p className="font-mono text-2xl font-bold text-white mt-1 tabular-nums">
                {reportData.orderCount} órdenes
              </p>
            </div>
            <div className="rounded-xl bg-zinc-950 border border-emerald-500/35 p-4">
              <span className="text-xs text-zinc-400">Totalidad Vendida ($ USD)</span>
              <p className="font-mono text-2xl font-bold text-emerald-400 mt-1 tabular-nums">
                {formatCurrency(reportData.totalSalesUsd)}
              </p>
            </div>
            <div className="rounded-xl bg-zinc-950 border border-amber-500/35 p-4">
              <span className="text-xs text-zinc-400">Totalidad Vendida (Bs. BCV)</span>
              <p className="font-mono text-2xl font-bold text-amber-400 mt-1 tabular-nums">
                {formatBsAmount(reportData.totalSalesBs)}
              </p>
            </div>
          </div>

          {/* 2. Arqueo por Método y Moneda (Reconversión Bs -> $ y $ -> Bs) */}
          <div className="rounded-2xl bg-zinc-950 border border-white/10 overflow-hidden">
            <div className="px-4 py-3 bg-zinc-900/90 border-b border-white/10 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                2. Desglose de Dinero Recaudado y Reconversión BCV
              </span>
              <span className="text-[11px] text-zinc-400">
                Pago Móvil y Efectivo Bs muestran reconversión de Bs. a $
              </span>
            </div>
            <div className="divide-y divide-white/5 text-xs">
              <div className="px-4 py-3 flex items-center justify-between gap-2">
                <span className="font-semibold text-white">
                  Pago Móvil (Reconversión de Bs. a $)
                </span>
                <span className="font-mono tabular-nums text-amber-300 font-bold">
                  {formatBsAmount(reportData.currencySummary.pagoMovilBs)}{' '}
                  <span className="text-emerald-400">
                    ➔ {formatCurrency(reportData.currencySummary.pagoMovilConvertedUsd)}
                  </span>
                </span>
              </div>
              <div className="px-4 py-3 flex items-center justify-between gap-2">
                <span className="font-semibold text-white">
                  Efectivo en Bolívares (Reconversión de Bs. a $)
                </span>
                <span className="font-mono tabular-nums text-amber-300 font-bold">
                  {formatBsAmount(reportData.currencySummary.efectivoBs)}{' '}
                  <span className="text-emerald-400">
                    ➔ {formatCurrency(reportData.currencySummary.efectivoBsConvertedUsd)}
                  </span>
                </span>
              </div>
              <div className="px-4 py-3 flex items-center justify-between gap-2">
                <span className="font-semibold text-white">Efectivo en Dólares ($)</span>
                <span className="font-mono tabular-nums text-white font-bold">
                  {formatCurrency(reportData.currencySummary.efectivoUsd)}{' '}
                  <span className="text-zinc-400 font-normal">
                    ({formatBs(reportData.currencySummary.efectivoUsd, reportData.bcvRate)})
                  </span>
                </span>
              </div>
              <div className="px-4 py-3 flex items-center justify-between gap-2">
                <span className="font-semibold text-white">Zelle ($ USD)</span>
                <span className="font-mono tabular-nums text-white font-bold">
                  {formatCurrency(reportData.currencySummary.zelleUsd)}{' '}
                  <span className="text-zinc-400 font-normal">
                    ({formatBs(reportData.currencySummary.zelleUsd, reportData.bcvRate)})
                  </span>
                </span>
              </div>
              <div className="px-4 py-3 flex items-center justify-between gap-2">
                <span className="font-semibold text-white">
                  Tarjeta / Punto de Venta
                </span>
                <span className="font-mono tabular-nums text-white font-bold">
                  {formatCurrency(reportData.currencySummary.tarjetaUsd)}{' '}
                  <span className="text-zinc-400 font-normal">
                    ({formatBsAmount(reportData.currencySummary.tarjetaBs)})
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* 3. Relación Detallada de Pedidos */}
          <div className="rounded-2xl bg-zinc-950 border border-white/10 overflow-hidden">
            <div className="px-4 py-3 bg-zinc-900/90 border-b border-white/10 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-white">
                3. Relación Detallada de Pedidos ({reportData.orders.length})
              </span>
            </div>

            {reportData.orders.length === 0 ? (
              <p className="text-xs text-zinc-500 py-6 text-center">
                Este cierre contiene el resumen consolidado de ventas.
              </p>
            ) : (
              <div className="divide-y divide-white/5">
                {reportData.orders.map((ord) => {
                  const r = ord.bcvRateAtOrder || reportData.bcvRate;
                  return (
                    <div key={ord.id} className="p-4 space-y-2 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-sm font-bold text-white tabular-nums">
                            {ord.code}
                          </span>
                          <span className="text-zinc-600">·</span>
                          <span className="font-mono text-zinc-400 tabular-nums">
                            {formatTime(ord.createdAt)}
                          </span>
                          <span className="text-zinc-600">·</span>
                          <span className="font-semibold text-amber-400">
                            {modalityLabel(ord.modality, ord.tableNumber)}
                          </span>
                          {ord.waiterName && (
                            <>
                              <span className="text-zinc-600">·</span>
                              <span className="inline-flex items-center gap-1 text-emerald-300 font-semibold">
                                <UserCheck className="w-3.5 h-3.5" />
                                Mesera/o: {ord.waiterName}
                              </span>
                            </>
                          )}
                          {ord.customerName && (
                            <>
                              <span className="text-zinc-600">·</span>
                              <span className="text-zinc-300">
                                Cliente: {ord.customerName}
                              </span>
                            </>
                          )}
                        </div>
                        <div className="font-mono tabular-nums text-right">
                          <strong className="text-sm text-white">
                            {formatCurrency(ord.total)}
                          </strong>{' '}
                          <span className="text-emerald-400">
                            ({formatBs(ord.total, r)})
                          </span>
                        </div>
                      </div>

                      <p className="text-zinc-300">
                        <strong className="text-zinc-400">Platos:</strong>{' '}
                        {ord.items.map((it) => `${it.quantity}x ${it.name}`).join(', ')}
                      </p>

                      {ord.payments && ord.payments.length > 0 ? (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {ord.payments.map((sp, sIdx) => {
                            const isPm = isPagoMovilMethod(sp.methodId, sp.methodName);
                            const isEf = isEfectivoMethod(sp.methodId, sp.methodName);
                            const isEfBs = isEf && sp.cashCurrency === 'VES';
                            const spBs =
                              sp.amountBs && sp.amountBs > 0
                                ? sp.amountBs
                                : Number((sp.amountUsd * r).toFixed(2));
                            return (
                              <span
                                key={sp.id || sIdx}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 border border-white/10 px-2.5 py-1 font-mono text-[11px] text-zinc-200 tabular-nums"
                              >
                                <strong className="text-amber-400 font-sans">
                                  {isEf
                                    ? `Efectivo (${sp.cashCurrency === 'VES' ? 'Bs' : '$'})`
                                    : sp.methodName}
                                  :
                                </strong>
                                {isPm || isEfBs ? (
                                  <span>
                                    {formatBsAmount(spBs)} ➔{' '}
                                    <strong className="text-emerald-400">
                                      {formatCurrency(sp.amountUsd)}
                                    </strong>
                                  </span>
                                ) : (
                                  <span>
                                    {formatCurrency(sp.amountUsd)} ({formatBsAmount(spBs)})
                                  </span>
                                )}
                                {sp.pagoMovilDetails && (
                                  <span className="text-amber-300">
                                    · {sp.pagoMovilDetails.bank} · Ref #
                                    {sp.pagoMovilDetails.referenceLast6}
                                  </span>
                                )}
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="font-mono text-[11px] text-zinc-400">
                          Pago: {ord.paymentMethodName}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300 cursor-pointer"
          >
            Cerrar Vista Previa
          </button>
          <button
            type="button"
            onClick={handleDownloadPdf}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white text-xs sm:text-sm font-bold shadow-lg cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Descargar Reporte de Cierre en PDF Detallado (.pdf)</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Confirmation Modal for "Limpiar Todo" in Caja Principal.
 * Clears all active/open orders across all modules while preserving historical CashClosureRecord reports.
 */
export function ClearAllOrdersConfirmModal({
  orderCount,
  closureCount,
  onConfirm,
  onClose,
}: {
  orderCount: number;
  closureCount: number;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-zinc-900 border border-red-500/40 p-6 shadow-2xl space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/35 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold text-white">
                ¿Confirmar Limpiar Todo?
              </h3>
              <p className="text-xs text-zinc-400">
                Acción general sobre todos los módulos operativos
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="rounded-xl bg-zinc-950 border border-white/10 p-4 space-y-2.5 text-xs text-zinc-300 leading-relaxed">
          <p>
            Estás a punto de eliminar los{' '}
            <strong className="text-red-400 font-mono">{orderCount} pedidos</strong>{' '}
            actuales en todos los módulos del sistema (
            <strong className="text-white">
              Caja Principal, Control de Pedidos, Cocina, Delivery, Mesera y Menú Público
            </strong>
            ).
          </p>
          <div className="rounded-lg bg-emerald-950/30 border border-emerald-500/30 p-2.5 text-emerald-300">
            <strong className="block text-emerald-400 mb-0.5">
              ✓ Reportes de Cierre de Caja Protegidos:
            </strong>
            Los{' '}
            <strong className="font-mono">{closureCount} reportes históricos</strong> ya
            realizados después del Cierre de Caja se conservarán intactos.
          </div>
        </div>

        <div className="pt-2 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>Sí, Eliminar Todos los Pedidos</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Modal for Caja Principal showing full Order Description, Confirmed Payment Methods
 * (with reverse Bs -> $ conversion for Pago Móvil and Efectivo Bs),
 * and a button to confirm the order so it is summed into the Cash Closure (Cierre de Caja).
 */
export function OrderCashierDetailModal({
  order,
  onClose,
}: {
  order: Order;
  onClose: () => void;
}) {
  const { bcvRate, confirmOrderForClosure } = useRestaurant();
  const rate = order.bcvRateAtOrder ?? bcvRate;

  const handleConfirmForClosure = () => {
    confirmOrderForClosure(order.id);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-zinc-900 border border-white/15 p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-5">
        <div className="flex items-start justify-between gap-3 pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2.5">
              <Receipt className="w-5 h-5 text-amber-400" />
              <h3 className="font-display text-xl font-bold text-white">
                Detalle de Pedido {order.code} y Pago Confirmado
              </h3>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Registrado a las {formatTime(order.createdAt)} · Origen:{' '}
              {order.source === 'mesera' ? 'Sala / Mesera' : 'Menú Público'}
              {order.waiterName ? ` (${order.waiterName})` : ''} · Tasa BCV: Bs.{' '}
              {rate.toFixed(2)} / $
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status & Modality Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl bg-zinc-950 border border-white/10 p-3">
            <span className="block text-[11px] text-zinc-400">Modalidad</span>
            <p className="text-sm font-semibold text-amber-400 mt-0.5">
              {modalityLabel(order.modality, order.tableNumber)}
            </p>
            {order.waiterName && (
              <p className="text-xs text-emerald-300 mt-1 font-medium">
                Mesera/o: {order.waiterName}
              </p>
            )}
          </div>
          <div className="rounded-xl bg-zinc-950 border border-white/10 p-3">
            <span className="block text-[11px] text-zinc-400">Estado Operativo</span>
            <div className="mt-1">
              <OrderStatusText status={order.status} />
            </div>
          </div>
          <div className="rounded-xl bg-zinc-950 border border-white/10 p-3">
            <span className="block text-[11px] text-zinc-400">Estado en Cierre de Caja</span>
            <p
              className={`text-xs font-bold mt-1 ${
                order.confirmedForClosure ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {order.confirmedForClosure
                ? 'Confirmado para Cierre de Caja'
                : 'Pendiente por Confirmar en Caja'}
            </p>
          </div>
        </div>

        {(order.customerName || order.customerPhone || order.deliveryAddress) && (
          <div className="rounded-xl bg-zinc-950 border border-white/10 p-3.5 text-xs space-y-1">
            <p className="font-semibold text-zinc-200">Datos del Cliente / Entrega:</p>
            {order.customerName && (
              <p className="text-zinc-300">
                <span className="text-zinc-500">Cliente:</span> {order.customerName}
              </p>
            )}
            {order.customerPhone && (
              <p className="text-zinc-300 font-mono">
                <span className="text-zinc-500 font-sans">Teléfono:</span>{' '}
                {order.customerPhone}
              </p>
            )}
            {order.deliveryAddress && (
              <p className="text-zinc-300">
                <span className="text-zinc-500">Dirección:</span> {order.deliveryAddress}
              </p>
            )}
          </div>
        )}

        {/* Itemized Order Description */}
        <div className="rounded-xl bg-zinc-950 border border-white/10 overflow-hidden">
          <div className="px-4 py-2.5 bg-zinc-900/80 border-b border-white/10 flex items-center justify-between">
            <span className="text-xs font-bold text-white">Descripción de Platos</span>
            <span className="text-xs text-zinc-400 font-mono tabular-nums">
              {order.items.reduce((acc, i) => acc + i.quantity, 0)} unidades
            </span>
          </div>
          <div className="divide-y divide-white/5">
            {order.items.map((it, idx) => {
              const lineUsd = it.price * it.quantity;
              return (
                <div
                  key={idx}
                  className="px-4 py-3 flex items-start justify-between gap-3 text-xs sm:text-sm"
                >
                  <div>
                    <p className="font-semibold text-white">
                      <span className="font-mono text-amber-400 mr-1.5">{it.quantity}x</span>
                      {it.name}
                    </p>
                    <p className="text-[11px] text-zinc-400 font-mono tabular-nums">
                      Unitario: {formatCurrency(it.price)} ({formatBs(it.price, rate)})
                    </p>
                    {it.notes && (
                      <p className="text-xs text-amber-300 mt-1">Nota: {it.notes}</p>
                    )}
                  </div>
                  <div className="text-right font-mono tabular-nums shrink-0">
                    <p className="font-bold text-white">{formatCurrency(lineUsd)}</p>
                    <p className="text-xs text-emerald-400">{formatBs(lineUsd, rate)}</p>
                  </div>
                </div>
              );
            })}
          </div>
          {order.notes && (
            <div className="px-4 py-2.5 bg-zinc-900/50 border-t border-white/10 text-xs text-zinc-300">
              <strong className="text-amber-400">Observación general:</strong> {order.notes}
            </div>
          )}
        </div>

        {/* Confirmed Payment Method(s) Breakdown */}
        <div className="rounded-xl bg-zinc-950 border border-amber-500/35 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
              <CreditCard className="w-4 h-4" />
              <span>Método(s) de Pago Confirmado(s)</span>
            </span>
            <span className="text-xs font-semibold text-white">
              {order.paymentMethodName}
            </span>
          </div>

          {order.payments && order.payments.length > 0 ? (
            <div className="space-y-2">
              {order.payments.map((split, idx) => {
                const isPm = isPagoMovilMethod(split.methodId, split.methodName);
                const isEf = isEfectivoMethod(split.methodId, split.methodName);
                const isEfBs = isEf && split.cashCurrency === 'VES';
                const splitBs =
                  split.amountBs && split.amountBs > 0
                    ? split.amountBs
                    : Number((split.amountUsd * rate).toFixed(2));

                return (
                  <div
                    key={split.id || idx}
                    className="rounded-lg bg-zinc-900 border border-white/10 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">
                          Pago #{idx + 1}: {split.methodName}
                        </span>
                        {split.cashCurrency && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-semibold">
                            <Banknote className="w-3 h-3" />
                            Moneda pagada:{' '}
                            {split.cashCurrency === 'VES'
                              ? 'Bolívares (Bs ➔ $)'
                              : 'Dólares ($)'}
                          </span>
                        )}
                      </div>

                      {split.pagoMovilDetails && (
                        <div className="font-mono text-zinc-300 tabular-nums">
                          <Building2 className="w-3.5 h-3.5 inline mr-1 text-amber-400" />
                          Banco: <strong>{split.pagoMovilDetails.bank}</strong> · Monto Bs:{' '}
                          <strong className="text-amber-300">
                            {formatBsAmount(splitBs)}
                          </strong>{' '}
                          ➔ Equivalente:{' '}
                          <strong className="text-emerald-400">
                            {formatCurrency(split.amountUsd)}
                          </strong>{' '}
                          · Ref 6 dígitos:{' '}
                          <strong className="text-amber-400">
                            #{split.pagoMovilDetails.referenceLast6}
                          </strong>
                        </div>
                      )}
                    </div>

                    <div className="text-right font-mono tabular-nums shrink-0">
                      {isPm || isEfBs ? (
                        <>
                          <p className="text-sm font-bold text-amber-300">
                            {formatBsAmount(splitBs)}
                          </p>
                          <p className="text-xs text-emerald-400">
                            ➔ {formatCurrency(split.amountUsd)}
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-bold text-white">
                            {formatCurrency(split.amountUsd)}
                          </p>
                          <p className="text-xs text-emerald-400">
                            {formatBsAmount(splitBs)}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-lg bg-zinc-900 border border-white/10 p-3 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white">{order.paymentMethodName}</span>
                <span className="font-mono font-bold text-amber-400 tabular-nums">
                  {order.cashCurrency === 'VES' || order.pagoMovilDetails
                    ? `${formatBs(order.total, rate)} ➔ ${formatCurrency(order.total)}`
                    : `${formatCurrency(order.total)} · ${formatBs(order.total, rate)}`}
                </span>
              </div>
              {order.cashCurrency && (
                <p className="text-emerald-300 font-medium">
                  Moneda en Efectivo:{' '}
                  {order.cashCurrency === 'VES' ? 'Bolívares (Bs ➔ $)' : 'Dólares ($)'}
                </p>
              )}
              {order.pagoMovilDetails && (
                <p className="font-mono text-zinc-300 tabular-nums">
                  Banco: {order.pagoMovilDetails.bank} · Monto:{' '}
                  {formatBs(order.pagoMovilDetails.amount, rate)} ➔{' '}
                  {formatCurrency(order.pagoMovilDetails.amount)} · Ref:{' '}
                  <strong className="text-amber-400">
                    #{order.pagoMovilDetails.referenceLast6}
                  </strong>
                </p>
              )}
            </div>
          )}

          {/* Zelle Capture Preview if attached */}
          {order.paymentProofName && (
            <div className="pt-2 border-t border-white/10 space-y-2">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-300">
                <FileCheck2 className="w-4 h-4" />
                <span>Comprobante Zelle adjunto: {order.paymentProofName}</span>
              </div>
              {order.paymentProofUrl && (
                <div>
                  <img
                    src={order.paymentProofUrl}
                    alt="Captura de comprobante Zelle"
                    className="max-h-44 rounded-lg border border-white/15 object-contain"
                  />
                </div>
              )}
            </div>
          )}

          <div className="pt-2 border-t border-white/10 flex items-center justify-between">
            <span className="text-xs text-zinc-400">Total General de la Orden</span>
            <div className="text-right font-mono tabular-nums">
              <span className="text-lg font-bold text-white">
                {formatCurrency(order.total)}
              </span>
              <span className="text-xs text-emerald-400 ml-2">
                ({formatBs(order.total, rate)})
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions: Confirm Order for Cash Closure */}
        <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 cursor-pointer"
          >
            Cerrar Ventana
          </button>

          {order.confirmedForClosure ? (
            <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/35 text-xs font-bold text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Pedido Confirmado y Sumado al Cierre de Caja</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleConfirmForClosure}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-bold shadow-lg cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirmar Pedido para Cierre de Caja</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Gerencia / Mesera Edit Order Modal using the unified PaymentSplitForm
 */
export function EditOrderModal({
  order,
  onClose,
}: {
  order: Order;
  onClose: () => void;
}) {
  const { products, paymentMethods, waiters, bcvRate, updateOrder, showToast } =
    useRestaurant();
  const [items, setItems] = useState<OrderItem[]>(order.items);
  const [modality, setModality] = useState<OrderModality>(order.modality);
  const [tableNumber, setTableNumber] = useState<number>(order.tableNumber ?? 1);
  const [waiterName, setWaiterName] = useState<string>(order.waiterName ?? '');
  const [status, setStatus] = useState<OrderStatus>(order.status);
  const [notes, setNotes] = useState<string>(order.notes ?? '');
  const [addProductId, setAddProductId] = useState<string>(products[0]?.id ?? '');

  const enabledPaymentMethods = useMemo(
    () => paymentMethods.filter((pm) => pm.enabled),
    [paymentMethods]
  );

  const [paymentSplits, setPaymentSplits] = useState<PaymentSplitDraft[]>(() =>
    createSplitsFromExistingOrder(
      order,
      enabledPaymentMethods[0]?.id ?? 'pm-pago-movil',
      bcvRate
    )
  );

  const computedTotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const paymentValidation = useMemo(
    () =>
      validateAndBuildPaymentSplits(
        paymentSplits,
        enabledPaymentMethods,
        computedTotal,
        bcvRate
      ),
    [paymentSplits, enabledPaymentMethods, computedTotal, bcvRate]
  );

  const handleQtyChange = (idx: number, delta: number) => {
    setItems((prev) =>
      prev
        .map((it, i) => (i === idx ? { ...it, quantity: it.quantity + delta } : it))
        .filter((it) => it.quantity > 0)
    );
  };

  const handleAddProduct = () => {
    const prod = products.find((p) => p.id === addProductId);
    if (!prod) return;
    setItems((prev) => {
      const existingIdx = prev.findIndex((i) => i.productId === prod.id);
      if (existingIdx >= 0) {
        return prev.map((it, i) =>
          i === existingIdx ? { ...it, quantity: it.quantity + 1 } : it
        );
      }
      return [
        ...prev,
        { productId: prod.id, name: prod.name, price: prod.price, quantity: 1 },
      ];
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;

    if (!paymentValidation.ok || !paymentValidation.normalizedSplits) {
      showToast(
        paymentValidation.error ?? 'Completa el pago en su totalidad para guardar.',
        'error'
      );
      return;
    }

    updateOrder(order.id, {
      items,
      total: computedTotal,
      modality,
      tableNumber: modality === 'sitio' ? tableNumber : undefined,
      waiterName: waiterName.trim() || undefined,
      status,
      paymentMethodId:
        paymentValidation.primaryMethodId ?? order.paymentMethodId,
      paymentMethodName:
        paymentValidation.primaryMethodName ?? order.paymentMethodName,
      payments: paymentValidation.normalizedSplits,
      cashCurrency: paymentValidation.primaryCashCurrency,
      pagoMovilDetails: paymentValidation.primaryPagoMovil,
      notes: notes.trim() || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-xl rounded-2xl bg-zinc-900 border border-white/15 p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div>
            <h3 className="font-display text-lg font-bold text-white">
              Editar Pedido y Pagos {order.code}
            </h3>
            <p className="text-xs text-amber-400">
              Compara el total a cancelar con los pagos cargados · Notifica cambios a Cocina
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Modalidad</label>
              <select
                value={modality}
                onChange={(e) => setModality(e.target.value as OrderModality)}
                className="w-full rounded-xl bg-zinc-950 border border-white/15 px-3 py-2 text-xs text-white"
              >
                <option value="sitio">Comer en sitio</option>
                <option value="llevar">Para llevar</option>
                <option value="delivery">Delivery</option>
              </select>
            </div>

            {modality === 'sitio' && (
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Mesa</label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={tableNumber}
                  onChange={(e) => setTableNumber(Number(e.target.value))}
                  className="w-full rounded-xl bg-zinc-950 border border-white/15 px-3 py-2 text-xs font-mono text-white"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                Mesera / Mesero Asignado
              </label>
              <select
                value={waiterName}
                onChange={(e) => setWaiterName(e.target.value)}
                className="w-full rounded-xl bg-zinc-950 border border-white/15 px-3 py-2 text-xs text-white"
              >
                <option value="">Sin asignar / Menú Público</option>
                {waiters.map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Estado</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as OrderStatus)}
                className="w-full rounded-xl bg-zinc-950 border border-white/15 px-3 py-2 text-xs text-white"
              >
                <option value="pendiente">Pendiente</option>
                <option value="en_cocina">En Cocina</option>
                <option value="listo">Listo</option>
                <option value="en_camino">Despachado (Delivery)</option>
                <option value="servido">Servido</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>
          </div>

          {/* Items list */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-zinc-400">
              Artículos Seleccionados
            </label>
            {items.map((item, idx) => (
              <div
                key={`${item.productId}-${idx}`}
                className="flex items-center justify-between gap-3 rounded-xl bg-zinc-950 border border-white/10 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{item.name}</p>
                  <p className="text-xs font-mono text-amber-400 tabular-nums">
                    {formatCurrency(item.price * item.quantity)} ·{' '}
                    {formatBs(item.price * item.quantity, bcvRate)}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleQtyChange(idx, -1)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-zinc-800 text-zinc-200 cursor-pointer"
                  >
                    {item.quantity === 1 ? (
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    ) : (
                      <Minus className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <span className="w-6 text-center font-mono text-xs font-bold tabular-nums">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleQtyChange(idx, 1)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-zinc-800 text-zinc-200 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {/* Quick Add item */}
            <div className="flex items-center gap-2 pt-1">
              <select
                value={addProductId}
                onChange={(e) => setAddProductId(e.target.value)}
                className="flex-1 rounded-xl bg-zinc-950 border border-white/15 px-3 py-2 text-xs text-white"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({formatCurrency(p.price)} / {formatBs(p.price, bcvRate)})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleAddProduct}
                className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-amber-400 cursor-pointer whitespace-nowrap"
              >
                + Añadir plato
              </button>
            </div>
          </div>

          {/* Redesigned Payment Split Form with "Agregar Pago" and Total Comparison */}
          <div className="pt-2 border-t border-white/10">
            <PaymentSplitForm
              splits={paymentSplits}
              onChangeSplits={setPaymentSplits}
              enabledMethods={enabledPaymentMethods}
              orderTotalUsd={computedTotal}
              bcvRate={bcvRate}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">
              Observaciones
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas para cocina o entrega"
              className="w-full rounded-xl bg-zinc-950 border border-white/15 px-3 py-2 text-xs text-white"
            />
          </div>

          <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
            <div className="text-sm">
              <span className="text-zinc-400">Total a Cancelar: </span>
              <strong className="font-mono text-lg text-white tabular-nums">
                {formatCurrency(computedTotal)}
              </strong>
              <span className="font-mono text-xs text-emerald-400 ml-2 tabular-nums">
                ({formatBs(computedTotal, bcvRate)})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 cursor-pointer"
              >
                Cerrar
              </button>
              <button
                type="submit"
                disabled={items.length === 0 || !paymentValidation.ok}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-amber-500 text-xs font-bold text-white shadow-lg disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {paymentValidation.ok
                  ? 'Confirmar Pago y Guardar Cambios'
                  : 'Completa el Pago Total para Guardar'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * New Order / Direct Charge Modal in Gerencia
 */
export function CreateGerenciaOrderModal({ onClose }: { onClose: () => void }) {
  const { products, paymentMethods, waiters, bcvRate, createOrder, showToast } =
    useRestaurant();
  const availableProducts = useMemo(
    () => products.filter((p) => p.available),
    [products]
  );
  const enabledPaymentMethods = useMemo(
    () => paymentMethods.filter((pm) => pm.enabled),
    [paymentMethods]
  );

  const [items, setItems] = useState<OrderItem[]>([]);
  const [selectedProdId, setSelectedProdId] = useState<string>(
    availableProducts[0]?.id ?? ''
  );
  const [modality, setModality] = useState<OrderModality>('sitio');
  const [tableNumber, setTableNumber] = useState<number>(1);
  const [waiterName, setWaiterName] = useState<string>(waiters[0] ?? '');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentSplits, setPaymentSplits] = useState<PaymentSplitDraft[]>([]);

  const orderTotalUsd = useMemo(
    () => items.reduce((acc, i) => acc + i.price * i.quantity, 0),
    [items]
  );

  const paymentValidation = useMemo(
    () =>
      validateAndBuildPaymentSplits(
        paymentSplits,
        enabledPaymentMethods,
        orderTotalUsd,
        bcvRate
      ),
    [paymentSplits, enabledPaymentMethods, orderTotalUsd, bcvRate]
  );

  const handleAddProduct = () => {
    const prod = availableProducts.find((p) => p.id === selectedProdId);
    if (!prod) return;
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === prod.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === prod.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        { productId: prod.id, name: prod.name, price: prod.price, quantity: 1 },
      ];
    });
  };

  const handleQtyChange = (idx: number, delta: number) => {
    setItems((prev) =>
      prev
        .map((it, i) => (i === idx ? { ...it, quantity: it.quantity + delta } : it))
        .filter((it) => it.quantity > 0)
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      showToast('Selecciona al menos un producto.', 'error');
      return;
    }
    if (!paymentValidation.ok || !paymentValidation.normalizedSplits) {
      showToast(
        paymentValidation.error ?? 'Completa el pago en su totalidad antes de confirmar.',
        'error'
      );
      return;
    }

    const created = createOrder({
      source: 'mesera',
      modality,
      tableNumber: modality === 'sitio' ? tableNumber : undefined,
      waiterName: waiterName.trim() || undefined,
      customerName: customerName.trim() || undefined,
      customerPhone: customerPhone.trim() || undefined,
      deliveryAddress: modality === 'delivery' ? deliveryAddress.trim() : undefined,
      items,
      total: orderTotalUsd,
      bcvRateAtOrder: bcvRate,
      paymentMethodId:
        paymentValidation.primaryMethodId ?? enabledPaymentMethods[0]?.id ?? 'pm-efectivo',
      paymentMethodName:
        paymentValidation.primaryMethodName ?? enabledPaymentMethods[0]?.name ?? 'Efectivo',
      payments: paymentValidation.normalizedSplits,
      pagoMovilDetails: paymentValidation.primaryPagoMovil,
      cashCurrency: paymentValidation.primaryCashCurrency,
      confirmedForClosure: true,
      confirmedForClosureAt: new Date().toISOString(),
      notes: notes.trim() || undefined,
    });

    showToast(
      `Orden ${created.code} creada y confirmada en Caja Principal.`,
      'success'
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-xl rounded-2xl bg-zinc-900 border border-white/15 p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div>
            <h3 className="font-display text-lg font-bold text-white">
              Registrar Orden y Pago en Gerencia
            </h3>
            <p className="text-xs text-zinc-400">
              Selecciona los productos, haz clic en &ldquo;Agregar Pago&rdquo; y completa el total para confirmar
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* 1. Product Selector */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-white">
              1. Seleccionar Artículos o Productos
            </label>
            <div className="flex items-center gap-2">
              <select
                value={selectedProdId}
                onChange={(e) => setSelectedProdId(e.target.value)}
                className="flex-1 rounded-xl bg-zinc-950 border border-white/15 px-3 py-2.5 text-xs text-white"
              >
                {availableProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {formatCurrency(p.price)} ({formatBs(p.price, bcvRate)})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleAddProduct}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>Agregar Artículo</span>
              </button>
            </div>

            {items.length === 0 ? (
              <p className="text-xs text-zinc-500 py-3 text-center border border-dashed border-white/10 rounded-xl">
                Agrega uno o más productos para mostrar el total a cancelar.
              </p>
            ) : (
              <div className="space-y-2 pt-1">
                {items.map((item, idx) => (
                  <div
                    key={`${item.productId}-${idx}`}
                    className="flex items-center justify-between gap-3 rounded-xl bg-zinc-950 border border-white/10 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{item.name}</p>
                      <p className="text-xs font-mono text-amber-400 tabular-nums">
                        {formatCurrency(item.price * item.quantity)} ·{' '}
                        {formatBs(item.price * item.quantity, bcvRate)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleQtyChange(idx, -1)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-zinc-800 text-zinc-200 cursor-pointer"
                      >
                        {item.quantity === 1 ? (
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        ) : (
                          <Minus className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <span className="w-6 text-center font-mono text-xs font-bold tabular-nums">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleQtyChange(idx, 1)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-zinc-800 text-zinc-200 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2. Modality & Waiter */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Modalidad</label>
              <select
                value={modality}
                onChange={(e) => setModality(e.target.value as OrderModality)}
                className="w-full rounded-xl bg-zinc-950 border border-white/15 px-3 py-2 text-xs text-white"
              >
                <option value="sitio">Comer en sitio (Mesa)</option>
                <option value="llevar">Para llevar</option>
                <option value="delivery">Delivery</option>
              </select>
            </div>
            {modality === 'sitio' && (
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  Número de Mesa
                </label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={tableNumber}
                  onChange={(e) => setTableNumber(Number(e.target.value))}
                  className="w-full rounded-xl bg-zinc-950 border border-white/15 px-3 py-2 text-xs font-mono text-white"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                Atendido por (Mesera/o)
              </label>
              <select
                value={waiterName}
                onChange={(e) => setWaiterName(e.target.value)}
                className="w-full rounded-xl bg-zinc-950 border border-white/15 px-3 py-2 text-xs text-white"
              >
                <option value="">Caja / Gerencia Directa</option>
                {waiters.map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {modality === 'delivery' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Nombre cliente *"
                className="rounded-xl bg-zinc-950 border border-white/15 px-3 py-2 text-xs text-white"
              />
              <input
                type="tel"
                required
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Teléfono *"
                className="rounded-xl bg-zinc-950 border border-white/15 px-3 py-2 text-xs font-mono text-white"
              />
              <input
                type="text"
                required
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="Dirección entrega *"
                className="rounded-xl bg-zinc-950 border border-white/15 px-3 py-2 text-xs text-white"
              />
            </div>
          )}

          {/* 3. Payment Section with Total a Cancelar + Agregar Pago */}
          <div className="pt-2 border-t border-white/10">
            <PaymentSplitForm
              splits={paymentSplits}
              onChangeSplits={setPaymentSplits}
              enabledMethods={enabledPaymentMethods}
              orderTotalUsd={orderTotalUsd}
              bcvRate={bcvRate}
            />
          </div>

          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Observación general para cocina (opcional)"
            className="w-full rounded-xl bg-zinc-950 border border-white/15 px-3 py-2 text-xs text-white"
          />

          <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={items.length === 0 || !paymentValidation.ok}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-amber-500 hover:from-red-500 hover:to-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold text-white shadow-lg cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {items.length === 0
                  ? 'Selecciona Productos'
                  : paymentValidation.ok
                  ? 'Confirmar Orden en Caja'
                  : 'Completa el Pago en su Totalidad'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function AddDriverModal({
  onClose,
  onDriverCreated,
}: {
  onClose: () => void;
  onDriverCreated?: (driver: DeliveryDriver) => void;
}) {
  const { addDriver, showToast } = useRestaurant();
  const [name, setName] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicleType, setVehicleType] = useState<'Moto' | 'Bicicleta' | 'Auto'>('Moto');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [zone, setZone] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !idNumber.trim() || !phone.trim() || !vehiclePlate.trim()) {
      showToast('Completa nombre, documento, teléfono y placa/vehículo del conductor.', 'error');
      return;
    }

    const created = addDriver({
      name: name.trim(),
      idNumber: idNumber.trim(),
      phone: phone.trim(),
      vehicleType,
      vehiclePlate: vehiclePlate.trim(),
      zone: zone.trim() || undefined,
      available: true,
    });

    if (onDriverCreated) {
      onDriverCreated(created);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-zinc-900 border border-white/15 p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <UserPlus className="w-5 h-5 text-amber-400" />
            <h3 className="font-display text-lg font-bold text-white">
              Agregar Conductor de Delivery
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-3.5">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Nombre Completo del Chofer *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Miguel Ángel Rivas"
              className="w-full rounded-xl bg-zinc-950 border border-white/15 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Cédula / Documento *
              </label>
              <input
                type="text"
                required
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value)}
                placeholder="Ej. V-24.112.890"
                className="w-full rounded-xl bg-zinc-950 border border-white/15 px-3.5 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Teléfono / WhatsApp *
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ej. 584145559900"
                className="w-full rounded-xl bg-zinc-950 border border-white/15 px-3.5 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Tipo de Vehículo *
              </label>
              <select
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value as 'Moto' | 'Bicicleta' | 'Auto')}
                className="w-full rounded-xl bg-zinc-950 border border-white/15 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
              >
                <option value="Moto">Moto</option>
                <option value="Bicicleta">Bicicleta</option>
                <option value="Auto">Auto</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Modelo y Placa *
              </label>
              <input
                type="text"
                required
                value={vehiclePlate}
                onChange={(e) => setVehiclePlate(e.target.value)}
                placeholder="Ej. Empire Horse · AE4K91"
                className="w-full rounded-xl bg-zinc-950 border border-white/15 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Zona Asignada / Observaciones
            </label>
            <input
              type="text"
              value={zone}
              onChange={(e) => setZone(e.target.value)}
              placeholder="Ej. Zona Este / Las Mercedes / Chacao"
              className="w-full rounded-xl bg-zinc-950 border border-white/15 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-amber-500 hover:from-red-500 hover:to-amber-400 text-xs font-bold text-white shadow-lg cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Conductor</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function DispatchDeliveryModal({
  order,
  onClose,
  onOpenAddDriver,
}: {
  order: Order;
  onClose: () => void;
  onOpenAddDriver: () => void;
}) {
  const { drivers, bcvRate, dispatchOrderWithDriver, showToast } = useRestaurant();
  const [selectedDriverId, setSelectedDriverId] = useState<string>(drivers[0]?.id ?? '');
  const [customerPhone, setCustomerPhone] = useState<string>(order.customerPhone ?? '');
  const [dispatchedState, setDispatchedState] = useState<boolean>(false);
  const [copiedTarget, setCopiedTarget] = useState<'driver' | 'customer' | null>(null);

  const rate = order.bcvRateAtOrder ?? bcvRate;

  const selectedDriver =
    drivers.find((d) => d.id === selectedDriverId) ?? drivers[0];

  const itemsTextList = order.items
    .map((it) => `• ${it.quantity}x ${it.name}${it.notes ? ` (${it.notes})` : ''}`)
    .join('\n');

  const paymentSummaryText = order.pagoMovilDetails
    ? `${order.paymentMethodName} (${order.pagoMovilDetails.bank} · ${formatBs(order.pagoMovilDetails.amount, rate)} ➔ ${formatCurrency(order.pagoMovilDetails.amount)} · Ref: ${order.pagoMovilDetails.referenceLast6})`
    : order.paymentMethodName;

  const driverMessage = selectedDriver
    ? `🍔 *NUEVO DESPACHO GORDIS BURGUER — ${order.code}*\n` +
      `👤 *Conductor:* ${selectedDriver.name}\n` +
      `🧑 *Cliente:* ${order.customerName ?? 'Cliente Delivery'}\n` +
      `📞 *Teléfono Cliente:* ${customerPhone || 'No indicado'}\n` +
      `📍 *Dirección:* ${order.deliveryAddress ?? 'Por confirmar'}\n\n` +
      `🧾 *Detalle del Pedido:*\n${itemsTextList}\n\n` +
      `💳 *Pago:* ${paymentSummaryText}\n` +
      `💰 *Total:* ${formatCurrency(order.total)} (${formatBs(order.total, rate)})`
    : '';

  const customerMessage = selectedDriver
    ? `🛵 *¡Tu pedido ${order.code} de Gordis Burguer ya va en camino!*\n\n` +
      `Hola ${order.customerName ?? 'Cliente'}, hemos despachado tu orden:\n` +
      `${itemsTextList}\n\n` +
      `👨‍✈️ *Conductor asignado:* ${selectedDriver.name}\n` +
      `🏍️ *Vehículo:* ${selectedDriver.vehicleType} (${selectedDriver.vehiclePlate})\n` +
      `📱 *Teléfono del conductor:* ${selectedDriver.phone}\n` +
      `📍 *Destino:* ${order.deliveryAddress ?? ''}\n\n` +
      `¡Gracias por preferir a Gordis Burguer!`
    : '';

  const cleanDriverPhone = (selectedDriver?.phone ?? '').replace(/\D/g, '');
  const cleanCustomerPhone = customerPhone.replace(/\D/g, '');

  const driverWhatsAppHref = cleanDriverPhone
    ? `https://wa.me/${cleanDriverPhone}?text=${encodeURIComponent(driverMessage)}`
    : `https://wa.me/?text=${encodeURIComponent(driverMessage)}`;

  const customerWhatsAppHref = cleanCustomerPhone
    ? `https://wa.me/${cleanCustomerPhone}?text=${encodeURIComponent(customerMessage)}`
    : `https://wa.me/?text=${encodeURIComponent(customerMessage)}`;

  const handleConfirmDispatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDriver) {
      showToast('Selecciona o agrega un conductor antes de despachar.', 'error');
      return;
    }
    if (!customerPhone.trim()) {
      showToast('Verifica o ingresa el número de teléfono del cliente.', 'error');
      return;
    }
    dispatchOrderWithDriver(order.id, selectedDriver, customerPhone);
    setDispatchedState(true);
  };

  const handleCopyMessage = async (target: 'driver' | 'customer', text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedTarget(target);
      showToast('Mensaje copiado al portapapeles.', 'success');
      setTimeout(() => setCopiedTarget(null), 2000);
    } catch {
      showToast('No se pudo copiar automáticamente.', 'info');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-zinc-900 border border-white/15 p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <Truck className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-display text-lg font-bold text-white">
                {dispatchedState
                  ? `Pedido ${order.code} Despachado — Enviar Notificaciones`
                  : `Despachar Pedido ${order.code}`}
              </h3>
              <p className="text-xs text-zinc-400">
                {order.customerName ?? 'Cliente Delivery'} · {order.deliveryAddress}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {!dispatchedState ? (
          <form onSubmit={handleConfirmDispatch} className="mt-5 space-y-5">
            {/* Order details summary */}
            <div className="rounded-xl bg-zinc-950 border border-white/10 p-4 space-y-2">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>Detalle del Pedido a Despachar</span>
                <strong className="font-mono text-amber-400 text-sm tabular-nums">
                  {formatCurrency(order.total)} ({formatBs(order.total, rate)}) ·{' '}
                  {order.paymentMethodName}
                </strong>
              </div>
              <ul className="text-xs text-zinc-200 space-y-1 pt-1">
                {order.items.map((it, idx) => (
                  <li key={idx}>
                    <strong className="font-mono text-amber-400">{it.quantity}x</strong> {it.name}
                    {it.notes ? ` (${it.notes})` : ''}
                  </li>
                ))}
              </ul>
            </div>

            {/* Customer Phone Confirmation */}
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Número de Teléfono / WhatsApp del Cliente *
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-amber-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Ej. 584128893210"
                  className="w-full rounded-xl bg-zinc-950 border border-white/15 pl-10 pr-3.5 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Select Driver */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-white">
                  Seleccionar Chofer Asignado ({drivers.length})
                </label>
                <button
                  type="button"
                  onClick={onOpenAddDriver}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400 hover:text-amber-300 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>+ Agregar Conductor</span>
                </button>
              </div>

              {drivers.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/15 p-6 text-center space-y-3">
                  <p className="text-xs text-zinc-400">
                    No hay conductores registrados todavía.
                  </p>
                  <button
                    type="button"
                    onClick={onOpenAddDriver}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-zinc-950 text-xs font-bold cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Agregar Primer Conductor</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {drivers.map((drv) => {
                    const isSelected = selectedDriver?.id === drv.id;
                    return (
                      <button
                        key={drv.id}
                        type="button"
                        onClick={() => setSelectedDriverId(drv.id)}
                        className={`text-left rounded-xl border p-3.5 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500/15 border-amber-400 ring-1 ring-amber-400/40'
                            : 'bg-zinc-950 border-white/10 hover:border-white/25'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-display text-sm font-bold text-white truncate">
                            {drv.name}
                          </span>
                          <span className="text-[11px] font-mono text-amber-400 shrink-0">
                            {drv.vehicleType}
                          </span>
                        </div>
                        <p className="text-xs font-mono text-zinc-300 mt-1">
                          Tel: {drv.phone} · {drv.idNumber}
                        </p>
                        <p className="text-[11px] text-zinc-400 mt-0.5 truncate">
                          {drv.vehiclePlate}
                          {drv.zone ? ` · ${drv.zone}` : ''}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!selectedDriver}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-amber-500 hover:from-red-500 hover:to-amber-400 disabled:opacity-40 text-xs font-bold text-white shadow-lg cursor-pointer"
              >
                <Truck className="w-4 h-4" />
                <span>Confirmar Chofer y Generar Envíos</span>
              </button>
            </div>
          </form>
        ) : (
          /* Post-Dispatch: Send WhatsApp to Driver & Customer */
          <div className="mt-5 space-y-5">
            <div className="rounded-xl bg-emerald-950/30 border border-emerald-500/35 p-4 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div className="text-xs text-zinc-200">
                <p className="font-bold text-white">
                  ¡Orden {order.code} asignada a {selectedDriver?.name} y marcada En Camino!
                </p>
                <p className="text-zinc-400 mt-0.5">
                  Envía la ficha del pedido al número del chofer y el aviso de despacho al número del cliente:
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 1. Driver Notification Card */}
              <div className="rounded-xl bg-zinc-950 border border-amber-500/30 p-4 flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400">
                      <Bike className="w-4 h-4" />
                      1. Mensaje para el Chofer
                    </span>
                    <span className="font-mono text-xs text-zinc-300 tabular-nums">
                      {selectedDriver?.phone}
                    </span>
                  </div>
                  <pre className="text-[11px] text-zinc-300 font-sans whitespace-pre-wrap bg-zinc-900/90 rounded-lg p-3 border border-white/5 max-h-48 overflow-y-auto">
                    {driverMessage}
                  </pre>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <a
                    href={driverWhatsAppHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition-colors"
                  >
                    <MessageCircle className="w-4 h-4 shrink-0" />
                    <span>Enviar al Chofer</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => handleCopyMessage('driver', driverMessage)}
                    className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 cursor-pointer"
                    title="Copiar mensaje del chofer"
                  >
                    {copiedTarget === 'driver' ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* 2. Customer Notification Card */}
              <div className="rounded-xl bg-zinc-950 border border-sky-500/30 p-4 flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-400">
                      <Phone className="w-4 h-4" />
                      2. Aviso al Cliente (En Camino)
                    </span>
                    <span className="font-mono text-xs text-zinc-300 tabular-nums">
                      {customerPhone}
                    </span>
                  </div>
                  <pre className="text-[11px] text-zinc-300 font-sans whitespace-pre-wrap bg-zinc-900/90 rounded-lg p-3 border border-white/5 max-h-48 overflow-y-auto">
                    {customerMessage}
                  </pre>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <a
                    href={customerWhatsAppHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-md transition-colors"
                  >
                    <MessageCircle className="w-4 h-4 shrink-0" />
                    <span>Avisar al Cliente</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => handleCopyMessage('customer', customerMessage)}
                    className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 cursor-pointer"
                    title="Copiar mensaje del cliente"
                  >
                    {copiedTarget === 'customer' ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-white cursor-pointer"
              >
                Finalizar y Cerrar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
