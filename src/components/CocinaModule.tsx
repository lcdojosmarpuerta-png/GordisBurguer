import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  Check,
  CheckCircle2,
  ChefHat,
  Clock,
  Flame,
  LogOut,
  Utensils,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useRestaurant } from '../context/RestaurantContext';
import { playNewOrderChime, unlockKitchenAudio } from '../utils/kitchenSound';
import {
  BcvRateBanner,
  BrandLogo,
  formatBs,
  formatCurrency,
  formatElapsedMinutes,
  formatTime,
  modalityLabel,
} from './SharedUI';

const SOUND_PREF_KEY = 'gordis_cocina_sound_enabled';

export function CocinaModule() {
  const {
    orders,
    bcvRate,
    updateOrderStatus,
    acknowledgeOrderModification,
    logout,
    showToast,
  } = useRestaurant();
  const [viewMode, setViewMode] = useState<'activos' | 'completados'>('activos');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(SOUND_PREF_KEY);
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });
  const [highlightedOrderIds, setHighlightedOrderIds] = useState<string[]>([]);

  const pendingAndPrepOrders = useMemo(() => {
    return orders
      .filter((o) => o.status === 'pendiente' || o.status === 'en_cocina')
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [orders]);

  const readyOrders = useMemo(() => {
    return orders
      .filter((o) => o.status === 'listo')
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [orders]);

  // Unacknowledged post-confirmation modifications on active kitchen orders
  const unacknowledgedModifiedOrders = useMemo(
    () =>
      pendingAndPrepOrders.filter(
        (o) => o.isModifiedAfterConfirm && !o.modificationAcknowledgedByKitchen
      ),
    [pendingAndPrepOrders]
  );

  // Track order IDs and modification timestamps so both new orders and modified orders trigger alerts
  const seenOrderIdsRef = useRef<Set<string> | null>(null);
  const seenModifiedTimestampsRef = useRef<Record<string, string>>({});

  useEffect(() => {
    const activeIds = pendingAndPrepOrders.map((o) => o.id);

    if (seenOrderIdsRef.current === null) {
      seenOrderIdsRef.current = new Set(orders.map((o) => o.id));
      const initialModMap: Record<string, string> = {};
      orders.forEach((o) => {
        if (o.modifiedAt) {
          initialModMap[o.id] = o.modifiedAt;
        }
      });
      seenModifiedTimestampsRef.current = initialModMap;
      return;
    }

    // 1. Check for newly arrived orders
    const newlyArrived = pendingAndPrepOrders.filter(
      (o) => !seenOrderIdsRef.current!.has(o.id)
    );

    // 2. Check for orders modified after confirmation
    const newlyModified = pendingAndPrepOrders.filter((o) => {
      if (!o.isModifiedAfterConfirm || !o.modifiedAt) return false;
      const prevStamp = seenModifiedTimestampsRef.current[o.id];
      return prevStamp !== o.modifiedAt;
    });

    if (newlyModified.length > 0) {
      newlyModified.forEach((o) => {
        if (o.modifiedAt) {
          seenModifiedTimestampsRef.current[o.id] = o.modifiedAt;
        }
      });
      const modIds = newlyModified.map((o) => o.id);
      setHighlightedOrderIds((prev) => Array.from(new Set([...prev, ...modIds])));

      const latestMod = newlyModified[newlyModified.length - 1];
      showToast(
        `¡ALERTA COCINA! El pedido ${latestMod.code} fue modificado después de confirmar.`,
        'error'
      );

      if (soundEnabled) {
        void playNewOrderChime();
      }
    }

    if (newlyArrived.length > 0) {
      newlyArrived.forEach((o) => seenOrderIdsRef.current!.add(o.id));
      const newIds = newlyArrived.map((o) => o.id);
      setHighlightedOrderIds((prev) => Array.from(new Set([...prev, ...newIds])));

      const latest = newlyArrived[newlyArrived.length - 1];
      showToast(
        newlyArrived.length === 1
          ? `Nueva comanda ${latest.code} recibida en cocina.`
          : `${newlyArrived.length} nuevas comandas recibidas en cocina.`,
        'info'
      );

      if (soundEnabled) {
        void playNewOrderChime();
      }

      const timer = setTimeout(() => {
        setHighlightedOrderIds((prev) => prev.filter((id) => !newIds.includes(id)));
      }, 6000);
      return () => clearTimeout(timer);
    }

    activeIds.forEach((id) => seenOrderIdsRef.current!.add(id));
  }, [orders, pendingAndPrepOrders, soundEnabled, showToast]);

  // Unlock browser AudioContext silently on first pointer/key interaction in kitchen view
  useEffect(() => {
    if (!soundEnabled) return;
    const handleUnlock = () => {
      void unlockKitchenAudio();
    };
    window.addEventListener('pointerdown', handleUnlock, { once: true });
    window.addEventListener('keydown', handleUnlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', handleUnlock);
      window.removeEventListener('keydown', handleUnlock);
    };
  }, [soundEnabled]);

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    try {
      localStorage.setItem(SOUND_PREF_KEY, String(next));
    } catch {
      // Ignore storage failures
    }
    if (next) {
      void playNewOrderChime();
      showToast('Aviso sonoro de cocina activado.', 'success');
    } else {
      showToast('Aviso sonoro de cocina silenciado.', 'info');
    }
  };

  const handleTestSound = () => {
    void playNewOrderChime();
  };

  const displayedOrders = viewMode === 'activos' ? pendingAndPrepOrders : readyOrders;

  const handleMarkPreparing = (orderId: string, code: string) => {
    updateOrderStatus(orderId, 'en_cocina');
    showToast(`Comanda ${code} marcada como Preparando.`, 'info');
  };

  const handleMarkReady = (orderId: string, code: string) => {
    updateOrderStatus(orderId, 'listo');
    showToast(`Pedido ${code} completado. Mesera y Gerencia notificadas.`, 'success');
  };

  return (
    <div className="min-h-screen bg-[#0B0C0E] text-zinc-100 flex flex-col">
      {/* Top Bar Contract: 3 zones */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-4 sm:gap-8 px-4 sm:px-8 py-3.5 bg-zinc-950/90 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center gap-3">
          <BrandLogo size="sm" />
          <div className="hidden lg:block">
            <BcvRateBanner compact />
          </div>
        </div>

        <nav className="flex items-center gap-1 p-1 rounded-xl bg-zinc-900 border border-white/10">
          <button
            type="button"
            onClick={() => setViewMode('activos')}
            className={`px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              viewMode === 'activos'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Comandas Activas ({pendingAndPrepOrders.length})
          </button>
          <button
            type="button"
            onClick={() => setViewMode('completados')}
            className={`px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              viewMode === 'completados'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Pedidos Realizados ({readyOrders.length})
          </button>
        </nav>

        <button
          type="button"
          onClick={logout}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs sm:text-sm font-medium text-zinc-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <LogOut className="w-4 h-4 text-zinc-400" />
          <span className="hidden sm:inline">Salir</span>
        </button>
      </header>

      {/* Main KDS Board */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-8 py-6">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Pantalla de Cocina (KDS)
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Ordenado por prioridad de llegada · Actualización instantánea con Sala y Gerencia
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* Audio Notification Controls */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-900 border border-white/10">
              <button
                type="button"
                onClick={handleToggleSound}
                aria-pressed={soundEnabled}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  soundEnabled
                    ? 'bg-amber-500/15 text-amber-300'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {soundEnabled ? (
                  <Volume2 className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <VolumeX className="w-3.5 h-3.5 shrink-0" />
                )}
                <span>{soundEnabled ? 'Aviso Sonoro Activo' : 'Sonido Silenciado'}</span>
              </button>
              <button
                type="button"
                onClick={handleTestSound}
                title="Reproducir tono de prueba"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Bell className="w-3.5 h-3.5 shrink-0" />
                <span>Probar</span>
              </button>
            </div>

            <div className="flex items-center gap-4 text-xs sm:text-sm font-mono tabular-nums text-zinc-300">
              <span>
                Pendientes:{' '}
                <strong className="text-amber-400">
                  {pendingAndPrepOrders.filter((o) => o.status === 'pendiente').length}
                </strong>
              </span>
              <span aria-hidden="true" className="text-zinc-600">
                ·
              </span>
              <span>
                En preparación:{' '}
                <strong className="text-red-400">
                  {pendingAndPrepOrders.filter((o) => o.status === 'en_cocina').length}
                </strong>
              </span>
            </div>
          </div>
        </div>

        {/* High-Contrast Alert Banner for Orders Modified After Confirmation */}
        {unacknowledgedModifiedOrders.length > 0 && (
          <div
            role="alert"
            className="mb-6 rounded-2xl bg-red-950/60 border border-red-500/60 p-4 sm:p-5 shadow-xl space-y-3"
          >
            <div className="flex items-center gap-2.5 text-red-300">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
              <h2 className="font-display text-base sm:text-lg font-bold text-white">
                ¡Alerta de Comanda Modificada Después de Confirmar! (
                {unacknowledgedModifiedOrders.length})
              </h2>
            </div>

            <div className="space-y-2">
              {unacknowledgedModifiedOrders.map((modOrd) => (
                <div
                  key={modOrd.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl bg-zinc-950/90 border border-red-500/35 px-4 py-3"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-amber-400 tabular-nums">
                        {modOrd.code}
                      </span>
                      <span className="text-zinc-500">·</span>
                      <span className="text-xs font-semibold text-white">
                        {modalityLabel(modOrd.modality, modOrd.tableNumber)}
                      </span>
                      <span className="text-zinc-500">·</span>
                      <span className="text-xs font-mono text-zinc-400 tabular-nums">
                        Modificado a las {formatTime(modOrd.modifiedAt ?? modOrd.updatedAt)}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-200">
                      {modOrd.modificationSummary ??
                        'Se realizaron cambios en los platos o notas de esta orden.'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      acknowledgeOrderModification(modOrd.id);
                      showToast(
                        `Modificación de ${modOrd.code} confirmada en cocina.`,
                        'info'
                      );
                    }}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold shrink-0 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Enterado del Cambio</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {displayedOrders.length === 0 ? (
          <div className="rounded-2xl bg-zinc-900/50 border border-white/10 p-12 text-center max-w-lg mx-auto mt-12">
            <ChefHat className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
            <h2 className="font-display text-xl font-semibold text-white">
              {viewMode === 'activos'
                ? 'Sin comandas pendientes en cocina'
                : 'No hay pedidos marcados como listos'}
            </h2>
            <p className="text-sm text-zinc-400 mt-2">
              {viewMode === 'activos'
                ? 'Las nuevas órdenes enviadas por Mesera o el Menú Público aparecerán aquí automáticamente.'
                : 'Cuando completes una comanda aparecerá en este historial rápido para entrega.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {displayedOrders.map((order) => {
              const isPreparing = order.status === 'en_cocina';
              const isReady = order.status === 'listo';
              const isNewlyArrived = highlightedOrderIds.includes(order.id);
              const isUnacknowledgedMod =
                order.isModifiedAfterConfirm && !order.modificationAcknowledgedByKitchen;

              return (
                <article
                  key={order.id}
                  className={`flex flex-col justify-between rounded-2xl border p-5 transition-all ${
                    isUnacknowledgedMod
                      ? 'bg-zinc-900 border-red-500 ring-2 ring-red-500/50 shadow-xl shadow-red-950/40'
                      : isNewlyArrived
                      ? 'bg-zinc-900 border-amber-400 ring-2 ring-amber-400/40 shadow-xl shadow-amber-950/30'
                      : isPreparing
                      ? 'bg-zinc-900/95 border-red-500/45 shadow-lg shadow-red-950/20'
                      : isReady
                      ? 'bg-zinc-900/70 border-emerald-500/35'
                      : 'bg-zinc-900/90 border-amber-500/40'
                  }`}
                >
                  <div>
                    {/* Post-confirmation Modification Alert Box inside the Card */}
                    {order.isModifiedAfterConfirm && (
                      <div className="mb-4 rounded-xl bg-red-500/15 border border-red-500/40 p-3 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-300">
                            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                            <span>PEDIDO MODIFICADO</span>
                          </span>
                          <span className="font-mono text-[11px] text-zinc-300 tabular-nums">
                            {formatTime(order.modifiedAt ?? order.updatedAt)}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-200 leading-snug">
                          {order.modificationSummary ??
                            'Esta orden fue editada después de su confirmación inicial.'}
                        </p>
                        {!order.modificationAcknowledgedByKitchen && (
                          <button
                            type="button"
                            onClick={() => acknowledgeOrderModification(order.id)}
                            className="mt-1 w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Confirmar Lectura de Modificación</span>
                          </button>
                        )}
                      </div>
                    )}

                    {/* High-Contrast Banner Header */}
                    <div className="flex items-start justify-between gap-3 pb-4 border-b border-white/10">
                      <div>
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono text-2xl font-bold text-white tabular-nums">
                            {order.code}
                          </span>
                          <span className="text-xs font-semibold text-zinc-400">·</span>
                          <span className="text-sm font-semibold text-amber-400">
                            {modalityLabel(order.modality, order.tableNumber)}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400 mt-1 tabular-nums">
                          <span>{formatTime(order.createdAt)}</span>
                          <span aria-hidden="true">·</span>
                          <span className="text-amber-300/90 font-semibold">
                            {order.source === 'mesera'
                              ? order.waiterName
                                ? `Mesera/o: ${order.waiterName}`
                                : 'Sala / Mesera'
                              : order.waiterName
                                ? `Atendido: ${order.waiterName}`
                                : 'Menú Público'}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono text-zinc-300">
                            {formatCurrency(order.total)} (
                            {formatBs(order.total, order.bcvRateAtOrder ?? bcvRate)})
                          </span>
                          {order.customerName && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="truncate max-w-[140px]">{order.customerName}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-zinc-200 tabular-nums">
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          <span>{formatElapsedMinutes(order.createdAt)}</span>
                        </div>
                        <div className="mt-1">
                          {isPreparing ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-red-400">
                              <Flame className="w-3.5 h-3.5" />
                              Preparando
                            </span>
                          ) : isReady ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Pedido Listo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-400">
                              <Utensils className="w-3.5 h-3.5" />
                              En Cola
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Dish Breakdown List */}
                    <ul className="my-4 space-y-3">
                      {order.items.map((item, idx) => (
                        <li
                          key={`${order.id}-${item.productId}-${idx}`}
                          className="flex flex-col gap-1 pb-2.5 border-b border-white/5 last:border-b-0 last:pb-0"
                        >
                          <div className="flex items-baseline gap-3">
                            <span className="font-mono text-xl font-bold text-amber-400 tabular-nums shrink-0">
                              {item.quantity}x
                            </span>
                            <span className="text-base font-semibold text-white leading-snug">
                              {item.name}
                            </span>
                          </div>
                          {item.notes && (
                            <p className="ml-8 text-xs font-medium text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-1.5">
                              Nota: {item.notes}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>

                    {order.notes && (
                      <div className="mb-4 rounded-xl bg-zinc-950/80 border border-white/10 p-3 text-xs text-zinc-200">
                        <span className="font-semibold text-amber-400">Observación general: </span>
                        {order.notes}
                      </div>
                    )}
                  </div>

                  {/* Quick KDS Action Buttons */}
                  {!isReady && (
                    <div className="pt-3 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        disabled={isPreparing}
                        onClick={() => handleMarkPreparing(order.id, order.code)}
                        className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isPreparing
                            ? 'bg-red-500/15 text-red-300 border border-red-500/30 cursor-default'
                            : 'bg-zinc-800 hover:bg-amber-500 hover:text-zinc-950 text-white border border-white/10 shadow-md'
                        }`}
                      >
                        <Flame className="w-4 h-4 shrink-0" />
                        <span>{isPreparing ? 'En Preparación' : 'Marcar como Preparando'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleMarkReady(order.id, order.code)}
                        className="flex items-center justify-center gap-2 py-3 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg hover:shadow-xl transition-all cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>Confirmar / Pedido Realizado</span>
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
