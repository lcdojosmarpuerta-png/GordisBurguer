import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  DEFAULT_BCV_RATE,
  INITIAL_CLOSURES,
  INITIAL_CREDENTIALS,
  INITIAL_DRIVERS,
  INITIAL_ORDERS,
  INITIAL_PAYMENT_METHODS,
  INITIAL_PRODUCTS,
  INITIAL_WAITERS,
} from '../data/initialData';
import {
  ActiveModule,
  CashClosureRecord,
  DeliveryDriver,
  Order,
  OrderStatus,
  PaymentMethod,
  Product,
  RoleCredentials,
  ToastMessage,
  UserRole,
} from '../types/restaurant';

const STORAGE_KEY = 'gordis_burguer_state_v3';

interface PersistedState {
  credentials: RoleCredentials;
  products: Product[];
  paymentMethods: PaymentMethod[];
  drivers: DeliveryDriver[];
  waiters: string[];
  orders: Order[];
  closures: CashClosureRecord[];
  nextOrderSeq: number;
  bcvRate: number;
  bcvLastUpdated: string;
}

interface RestaurantContextValue {
  activeModule: ActiveModule;
  currentRole: UserRole | null;
  preselectedTable: number | null;
  credentials: RoleCredentials;
  products: Product[];
  paymentMethods: PaymentMethod[];
  drivers: DeliveryDriver[];
  waiters: string[];
  orders: Order[];
  closures: CashClosureRecord[];
  bcvRate: number;
  bcvLastUpdated: string;
  toasts: ToastMessage[];
  login: (role: UserRole, password: string) => { ok: boolean; error?: string };
  logout: () => void;
  navigateToModule: (mod: ActiveModule) => void;
  updateRolePassword: (role: UserRole, newPassword: string) => void;
  updateBcvRate: (newRate: number) => void;
  syncBcvRateFromApi: (silent?: boolean) => Promise<void>;
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (id: string, updates: Partial<Omit<Product, 'id'>>) => void;
  deleteProduct: (id: string) => void;
  togglePaymentMethod: (id: string) => void;
  updatePaymentMethod: (id: string, updates: Partial<Omit<PaymentMethod, 'id'>>) => void;
  addPaymentMethod: (method: Omit<PaymentMethod, 'id'>) => void;
  addDriver: (driver: Omit<DeliveryDriver, 'id'>) => DeliveryDriver;
  updateDriver: (id: string, updates: Partial<Omit<DeliveryDriver, 'id'>>) => void;
  deleteDriver: (id: string) => void;
  addWaiter: (name: string) => void;
  deleteWaiter: (name: string) => void;
  dispatchOrderWithDriver: (
    orderId: string,
    driver: DeliveryDriver,
    customerPhoneOverride?: string
  ) => void;
  createOrder: (
    orderInput: Omit<Order, 'id' | 'code' | 'status' | 'createdAt' | 'updatedAt'>
  ) => Order;
  updateOrder: (id: string, updates: Partial<Omit<Order, 'id' | 'code' | 'createdAt'>>) => void;
  acknowledgeOrderModification: (id: string) => void;
  updateOrderStatus: (id: string, status: OrderStatus) => void;
  cancelOrder: (id: string) => void;
  confirmOrderForClosure: (id: string) => void;
  confirmAllOpenOrdersForClosure: () => void;
  performCashClosure: () => CashClosureRecord | null;
  clearAllOrdersExceptClosures: () => void;
  getPublicMenuUrl: (tableNumber?: number) => string;
  showToast: (text: string, type?: ToastMessage['type']) => void;
  dismissToast: (id: string) => void;
}

const RestaurantContext = createContext<RestaurantContextValue | null>(null);

function loadInitialState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PersistedState>;
      if (parsed.credentials && parsed.products && parsed.paymentMethods && parsed.orders) {
        return {
          credentials: parsed.credentials,
          products: parsed.products,
          paymentMethods: parsed.paymentMethods,
          drivers: parsed.drivers ?? INITIAL_DRIVERS,
          waiters:
            Array.isArray(parsed.waiters) && parsed.waiters.length > 0
              ? parsed.waiters
              : INITIAL_WAITERS,
          orders: parsed.orders,
          closures: parsed.closures ?? INITIAL_CLOSURES,
          nextOrderSeq: parsed.nextOrderSeq ?? 105,
          bcvRate:
            typeof parsed.bcvRate === 'number' && parsed.bcvRate > 0
              ? parsed.bcvRate
              : DEFAULT_BCV_RATE,
          bcvLastUpdated: parsed.bcvLastUpdated ?? new Date().toISOString(),
        };
      }
    }
  } catch {
    // Fallback to seeded data if storage is unreadable
  }
  return {
    credentials: INITIAL_CREDENTIALS,
    products: INITIAL_PRODUCTS,
    paymentMethods: INITIAL_PAYMENT_METHODS,
    drivers: INITIAL_DRIVERS,
    waiters: INITIAL_WAITERS,
    orders: INITIAL_ORDERS,
    closures: INITIAL_CLOSURES,
    nextOrderSeq: 105,
    bcvRate: DEFAULT_BCV_RATE,
    bcvLastUpdated: new Date().toISOString(),
  };
}

export function RestaurantProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PersistedState>(() => loadInitialState());
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const [initialUrlParams] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const vista = params.get('vista');
    const mesaRaw = params.get('mesa');
    const mesa = mesaRaw ? parseInt(mesaRaw, 10) : null;
    return {
      isPublicMenu: vista === 'menu',
      table: mesa && !Number.isNaN(mesa) && mesa > 0 ? mesa : null,
    };
  });

  const [activeModule, setActiveModule] = useState<ActiveModule>(() =>
    initialUrlParams.isPublicMenu ? 'menu_publico' : 'login'
  );
  const [currentRole, setCurrentRole] = useState<UserRole | null>(null);
  const [preselectedTable] = useState<number | null>(initialUrlParams.table);

  const persistState = useCallback((updater: (prev: PersistedState) => PersistedState) => {
    setState((prev) => {
      const next = updater(prev);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore quota errors in restricted sandboxes
      }
      return next;
    });
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (text: string, type: ToastMessage['type'] = 'success') => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev, { id, type, text }]);
      setTimeout(() => {
        dismissToast(id);
      }, 3600);
    },
    [dismissToast]
  );

  // Sync Official BCV Rate from public API on startup
  const syncBcvRateFromApi = useCallback(
    async (silent = false) => {
      try {
        const res = await fetch('https://ve.dolarapi.com/v1/dolares/oficial');
        if (!res.ok) throw new Error('Respuesta no disponible');
        const data = (await res.json()) as { promedio?: number; fechaActualizacion?: string };
        if (typeof data.promedio === 'number' && data.promedio > 0) {
          const rounded = Number(data.promedio.toFixed(2));
          persistState((prev) => ({
            ...prev,
            bcvRate: rounded,
            bcvLastUpdated: data.fechaActualizacion ?? new Date().toISOString(),
          }));
          if (!silent) {
            showToast(
              `Tasa oficial BCV sincronizada: Bs. ${rounded.toFixed(2)} por $1.`,
              'success'
            );
          }
          return;
        }
      } catch {
        if (!silent) {
          showToast(
            'Usando tasa BCV configurada localmente. Puedes ajustarla manualmente.',
            'info'
          );
        }
      }
    },
    [persistState, showToast]
  );

  useEffect(() => {
    void syncBcvRateFromApi(true);
  }, [syncBcvRateFromApi]);

  const updateBcvRate = useCallback(
    (newRate: number) => {
      if (Number.isNaN(newRate) || newRate <= 0) return;
      const rounded = Number(newRate.toFixed(2));
      persistState((prev) => ({
        ...prev,
        bcvRate: rounded,
        bcvLastUpdated: new Date().toISOString(),
      }));
      showToast(`Tasa oficial BCV actualizada a Bs. ${rounded.toFixed(2)} / $.`, 'success');
    },
    [persistState, showToast]
  );

  // Cross-tab reactive sync
  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY && event.newValue) {
        try {
          const parsed = JSON.parse(event.newValue) as PersistedState;
          setState(parsed);
        } catch {
          // Ignore malformed external storage
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const login = useCallback(
    (role: UserRole, password: string) => {
      const expected = state.credentials[role];
      if (!password.trim()) {
        return { ok: false, error: 'Ingresa la contraseña asignada para este rol.' };
      }
      if (password !== expected) {
        return { ok: false, error: 'Contraseña incorrecta. Verifica con Gerencia.' };
      }
      setCurrentRole(role);
      setActiveModule(role);
      showToast(
        `Bienvenido al panel de ${
          role === 'gerencia' ? 'Gerencia' : role === 'mesera' ? 'Mesera' : 'Cocina KDS'
        }.`,
        'success'
      );
      return { ok: true };
    },
    [state.credentials, showToast]
  );

  const logout = useCallback(() => {
    setCurrentRole(null);
    setActiveModule('login');
    const url = new URL(window.location.href);
    url.searchParams.delete('vista');
    url.searchParams.delete('mesa');
    window.history.replaceState({}, '', url.toString());
  }, []);

  const navigateToModule = useCallback((mod: ActiveModule) => {
    setActiveModule(mod);
  }, []);

  const updateRolePassword = useCallback(
    (role: UserRole, newPassword: string) => {
      const cleaned = newPassword.trim();
      if (!cleaned) return;
      persistState((prev) => ({
        ...prev,
        credentials: {
          ...prev.credentials,
          [role]: cleaned,
        },
      }));
      const roleLabel =
        role === 'gerencia' ? 'Gerencia' : role === 'mesera' ? 'Mesera' : 'Cocina';
      showToast(`Contraseña de ${roleLabel} actualizada correctamente.`, 'success');
    },
    [persistState, showToast]
  );

  const addProduct = useCallback(
    (product: Omit<Product, 'id'>) => {
      const newProduct: Product = {
        ...product,
        id: `prod-${Date.now()}`,
      };
      persistState((prev) => ({
        ...prev,
        products: [newProduct, ...prev.products],
      }));
      showToast(`Producto "${product.name}" agregado al menú.`, 'success');
    },
    [persistState, showToast]
  );

  const updateProduct = useCallback(
    (id: string, updates: Partial<Omit<Product, 'id'>>) => {
      persistState((prev) => ({
        ...prev,
        products: prev.products.map((p) => (p.id === id ? { ...p, ...updates } : p)),
      }));
      showToast('Producto actualizado en el menú.', 'success');
    },
    [persistState, showToast]
  );

  const deleteProduct = useCallback(
    (id: string) => {
      persistState((prev) => ({
        ...prev,
        products: prev.products.filter((p) => p.id !== id),
      }));
      showToast('Producto eliminado del menú.', 'info');
    },
    [persistState, showToast]
  );

  const togglePaymentMethod = useCallback(
    (id: string) => {
      persistState((prev) => ({
        ...prev,
        paymentMethods: prev.paymentMethods.map((pm) =>
          pm.id === id ? { ...pm, enabled: !pm.enabled } : pm
        ),
      }));
      showToast('Estado del método de pago actualizado.', 'info');
    },
    [persistState, showToast]
  );

  const updatePaymentMethod = useCallback(
    (id: string, updates: Partial<Omit<PaymentMethod, 'id'>>) => {
      persistState((prev) => ({
        ...prev,
        paymentMethods: prev.paymentMethods.map((pm) =>
          pm.id === id ? { ...pm, ...updates } : pm
        ),
      }));
      showToast('Datos del método de pago guardados.', 'success');
    },
    [persistState, showToast]
  );

  const addPaymentMethod = useCallback(
    (method: Omit<PaymentMethod, 'id'>) => {
      const newMethod: PaymentMethod = {
        ...method,
        id: `pm-${Date.now()}`,
      };
      persistState((prev) => ({
        ...prev,
        paymentMethods: [...prev.paymentMethods, newMethod],
      }));
      showToast(`Método "${method.name}" agregado.`, 'success');
    },
    [persistState, showToast]
  );

  const addDriver = useCallback(
    (driverInput: Omit<DeliveryDriver, 'id'>): DeliveryDriver => {
      const newDriver: DeliveryDriver = {
        ...driverInput,
        id: `drv-${Date.now()}`,
      };
      persistState((prev) => ({
        ...prev,
        drivers: [...prev.drivers, newDriver],
      }));
      showToast(`Conductor "${driverInput.name}" registrado en Delivery.`, 'success');
      return newDriver;
    },
    [persistState, showToast]
  );

  const updateDriver = useCallback(
    (id: string, updates: Partial<Omit<DeliveryDriver, 'id'>>) => {
      persistState((prev) => ({
        ...prev,
        drivers: prev.drivers.map((d) => (d.id === id ? { ...d, ...updates } : d)),
      }));
      showToast('Datos del conductor actualizados.', 'success');
    },
    [persistState, showToast]
  );

  const deleteDriver = useCallback(
    (id: string) => {
      persistState((prev) => ({
        ...prev,
        drivers: prev.drivers.filter((d) => d.id !== id),
      }));
      showToast('Conductor eliminado de la lista.', 'info');
    },
    [persistState, showToast]
  );

  const addWaiter = useCallback(
    (name: string) => {
      const cleaned = name.trim();
      if (!cleaned) return;
      persistState((prev) => {
        if (prev.waiters.some((w) => w.toLowerCase() === cleaned.toLowerCase())) {
          return prev;
        }
        return {
          ...prev,
          waiters: [...prev.waiters, cleaned],
        };
      });
      showToast(`Mesera/o "${cleaned}" agregado a la lista.`, 'success');
    },
    [persistState, showToast]
  );

  const deleteWaiter = useCallback(
    (name: string) => {
      persistState((prev) => ({
        ...prev,
        waiters: prev.waiters.filter((w) => w !== name),
      }));
      showToast(`Mesera/o "${name}" eliminado de la lista.`, 'info');
    },
    [persistState, showToast]
  );

  const dispatchOrderWithDriver = useCallback(
    (orderId: string, driver: DeliveryDriver, customerPhoneOverride?: string) => {
      const nowIso = new Date().toISOString();
      persistState((prev) => ({
        ...prev,
        orders: prev.orders.map((ord) =>
          ord.id === orderId
            ? {
                ...ord,
                status: 'en_camino',
                customerPhone: customerPhoneOverride?.trim() || ord.customerPhone,
                assignedDriverId: driver.id,
                assignedDriverName: driver.name,
                assignedDriverPhone: driver.phone,
                assignedDriverVehicle: `${driver.vehicleType} · ${driver.vehiclePlate}`,
                dispatchedAt: nowIso,
                updatedAt: nowIso,
              }
            : ord
        ),
      }));
      showToast(`Pedido despachado con ${driver.name}. Notificaciones generadas.`, 'success');
    },
    [persistState, showToast]
  );

  const createOrder = useCallback(
    (orderInput: Omit<Order, 'id' | 'code' | 'status' | 'createdAt' | 'updatedAt'>): Order => {
      const nowIso = new Date().toISOString();
      let createdOrder!: Order;
      persistState((prev) => {
        const seq = prev.nextOrderSeq;
        createdOrder = {
          ...orderInput,
          bcvRateAtOrder: orderInput.bcvRateAtOrder ?? prev.bcvRate,
          confirmedForClosure: orderInput.confirmedForClosure ?? false,
          id: `ord-${Date.now()}-${seq}`,
          code: `#GB-${seq}`,
          status: 'pendiente',
          createdAt: nowIso,
          updatedAt: nowIso,
        };
        return {
          ...prev,
          orders: [createdOrder, ...prev.orders],
          nextOrderSeq: seq + 1,
        };
      });
      return createdOrder;
    },
    [persistState]
  );

  const updateOrder = useCallback(
    (id: string, updates: Partial<Omit<Order, 'id' | 'code' | 'createdAt'>>) => {
      const nowIso = new Date().toISOString();
      persistState((prev) => ({
        ...prev,
        orders: prev.orders.map((ord) => {
          if (ord.id !== id) return ord;

          const changes: string[] = [];
          if (updates.items) {
            const itemsSummary = updates.items
              .map((i) => `${i.quantity}x ${i.name}`)
              .join(', ');
            changes.push(`Platos actualizados (${itemsSummary})`);
          }
          if (updates.notes !== undefined && updates.notes !== ord.notes) {
            changes.push(
              updates.notes
                ? `Nueva observación: "${updates.notes}"`
                : 'Observación eliminada'
            );
          }
          if (updates.modality && updates.modality !== ord.modality) {
            changes.push(`Modalidad cambiada a ${updates.modality}`);
          }
          if (updates.tableNumber !== undefined && updates.tableNumber !== ord.tableNumber) {
            changes.push(`Mesa cambiada a M${updates.tableNumber}`);
          }

          const summaryText =
            changes.length > 0
              ? changes.join(' · ')
              : 'Comanda editada después de su confirmación inicial';

          return {
            ...ord,
            ...updates,
            updatedAt: nowIso,
            isModifiedAfterConfirm: true,
            modifiedAt: nowIso,
            modificationSummary: summaryText,
            modificationAcknowledgedByKitchen: false,
          };
        }),
      }));
      showToast('Pedido modificado. Alerta enviada a Cocina.', 'success');
    },
    [persistState, showToast]
  );

  const acknowledgeOrderModification = useCallback(
    (id: string) => {
      persistState((prev) => ({
        ...prev,
        orders: prev.orders.map((ord) =>
          ord.id === id ? { ...ord, modificationAcknowledgedByKitchen: true } : ord
        ),
      }));
    },
    [persistState]
  );

  const updateOrderStatus = useCallback(
    (id: string, status: OrderStatus) => {
      const nowIso = new Date().toISOString();
      persistState((prev) => ({
        ...prev,
        orders: prev.orders.map((ord) =>
          ord.id === id ? { ...ord, status, updatedAt: nowIso } : ord
        ),
      }));
    },
    [persistState]
  );

  const cancelOrder = useCallback(
    (id: string) => {
      const nowIso = new Date().toISOString();
      persistState((prev) => ({
        ...prev,
        orders: prev.orders.map((ord) =>
          ord.id === id
            ? {
                ...ord,
                status: 'cancelado',
                confirmedForClosure: false,
                updatedAt: nowIso,
              }
            : ord
        ),
      }));
      showToast('Pedido cancelado.', 'info');
    },
    [persistState, showToast]
  );

  const confirmOrderForClosure = useCallback(
    (id: string) => {
      const nowIso = new Date().toISOString();
      let confirmedCode = '';
      persistState((prev) => ({
        ...prev,
        orders: prev.orders.map((ord) => {
          if (ord.id === id) {
            confirmedCode = ord.code;
            return {
              ...ord,
              confirmedForClosure: true,
              confirmedForClosureAt: nowIso,
              updatedAt: nowIso,
            };
          }
          return ord;
        }),
      }));
      showToast(
        `Pedido ${confirmedCode || ''} confirmado y sumado al Cierre de Caja.`,
        'success'
      );
    },
    [persistState, showToast]
  );

  const confirmAllOpenOrdersForClosure = useCallback(() => {
    const nowIso = new Date().toISOString();
    persistState((prev) => ({
      ...prev,
      orders: prev.orders.map((ord) =>
        ord.status !== 'cancelado' && !ord.closedInShiftId && !ord.confirmedForClosure
          ? {
              ...ord,
              confirmedForClosure: true,
              confirmedForClosureAt: nowIso,
              updatedAt: nowIso,
            }
          : ord
      ),
    }));
    showToast('Todos los pedidos abiertos fueron confirmados para el Cierre de Caja.', 'success');
  }, [persistState, showToast]);

  const performCashClosure = useCallback((): CashClosureRecord | null => {
    const confirmedOpenOrders = state.orders.filter(
      (o) => o.status !== 'cancelado' && !o.closedInShiftId && o.confirmedForClosure
    );

    if (confirmedOpenOrders.length === 0) {
      showToast(
        'Confirma al menos un pedido en Caja Principal para sumarlo al Cierre de Caja.',
        'error'
      );
      return null;
    }

    const byMethod: Record<string, number> = {};
    let totalSales = 0;
    const byCurrencySummary = {
      efectivoUsd: 0,
      efectivoBs: 0,
      pagoMovilUsd: 0,
      pagoMovilBs: 0,
      zelleUsd: 0,
      tarjetaUsd: 0,
      otrosUsd: 0,
    };

    for (const order of confirmedOpenOrders) {
      const orderRate = order.bcvRateAtOrder ?? state.bcvRate;
      totalSales += order.total;

      if (order.payments && order.payments.length > 0) {
        for (const split of order.payments) {
          const splitLabel =
            split.methodId === 'pm-efectivo'
              ? `Efectivo (${split.cashCurrency === 'VES' ? 'Bs' : '$'})`
              : split.methodName;
          byMethod[splitLabel] = (byMethod[splitLabel] ?? 0) + split.amountUsd;

          const lower = split.methodName.toLowerCase();
          if (split.methodId === 'pm-efectivo' || lower.includes('efectivo')) {
            if (split.cashCurrency === 'VES') {
              byCurrencySummary.efectivoBs +=
                split.amountBs || split.amountUsd * orderRate;
            } else {
              byCurrencySummary.efectivoUsd += split.amountUsd;
            }
          } else if (
            split.methodId === 'pm-pago-movil' ||
            lower.includes('pago móvil') ||
            lower.includes('pago movil')
          ) {
            byCurrencySummary.pagoMovilUsd += split.amountUsd;
            byCurrencySummary.pagoMovilBs +=
              split.amountBs || split.amountUsd * orderRate;
          } else if (split.methodId === 'pm-zelle' || lower.includes('zelle')) {
            byCurrencySummary.zelleUsd += split.amountUsd;
          } else if (split.methodId === 'pm-tarjeta' || lower.includes('tarjeta')) {
            byCurrencySummary.tarjetaUsd += split.amountUsd;
          } else {
            byCurrencySummary.otrosUsd += split.amountUsd;
          }
        }
      } else {
        byMethod[order.paymentMethodName] =
          (byMethod[order.paymentMethodName] ?? 0) + order.total;
        const lower = order.paymentMethodName.toLowerCase();
        if (order.paymentMethodId === 'pm-efectivo' || lower.includes('efectivo')) {
          if (order.cashCurrency === 'VES') {
            byCurrencySummary.efectivoBs += order.total * orderRate;
          } else {
            byCurrencySummary.efectivoUsd += order.total;
          }
        } else if (
          order.paymentMethodId === 'pm-pago-movil' ||
          lower.includes('pago móvil') ||
          lower.includes('pago movil')
        ) {
          byCurrencySummary.pagoMovilUsd += order.total;
          byCurrencySummary.pagoMovilBs += order.total * orderRate;
        } else if (order.paymentMethodId === 'pm-zelle' || lower.includes('zelle')) {
          byCurrencySummary.zelleUsd += order.total;
        } else if (order.paymentMethodId === 'pm-tarjeta' || lower.includes('tarjeta')) {
          byCurrencySummary.tarjetaUsd += order.total;
        } else {
          byCurrencySummary.otrosUsd += order.total;
        }
      }
    }

    const totalSalesBs = Number((totalSales * state.bcvRate).toFixed(2));
    const confirmedIds = new Set(confirmedOpenOrders.map((o) => o.id));

    const closure: CashClosureRecord = {
      id: `cierre-${Date.now()}`,
      closedAt: new Date().toISOString(),
      totalSales: Number(totalSales.toFixed(2)),
      totalSalesBs,
      bcvRate: state.bcvRate,
      orderCount: confirmedOpenOrders.length,
      byMethod,
      byCurrencySummary,
      orderCodes: confirmedOpenOrders.map((o) => o.code),
      ordersSnapshot: confirmedOpenOrders,
      closedBy: 'Gerencia',
    };

    persistState((prev) => ({
      ...prev,
      orders: prev.orders.map((ord) =>
        confirmedIds.has(ord.id) ? { ...ord, closedInShiftId: closure.id } : ord
      ),
      closures: [closure, ...prev.closures],
    }));

    showToast(
      `Cierre de caja realizado: $${closure.totalSales.toFixed(2)} (Bs. ${totalSalesBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}).`,
      'success'
    );
    return closure;
  }, [state.orders, state.bcvRate, persistState, showToast]);

  const clearAllOrdersExceptClosures = useCallback(() => {
    persistState((prev) => ({
      ...prev,
      orders: [],
    }));
    showToast(
      'Todos los pedidos activos han sido eliminados en todos los módulos. Los reportes de cierre de caja se conservaron intactos.',
      'info'
    );
  }, [persistState, showToast]);

  const getPublicMenuUrl = useCallback((tableNumber?: number) => {
    const base = `${window.location.origin}${window.location.pathname}`;
    return tableNumber ? `${base}?vista=menu&mesa=${tableNumber}` : `${base}?vista=menu`;
  }, []);

  return (
    <RestaurantContext.Provider
      value={{
        activeModule,
        currentRole,
        preselectedTable,
        credentials: state.credentials,
        products: state.products,
        paymentMethods: state.paymentMethods,
        drivers: state.drivers,
        waiters: state.waiters,
        orders: state.orders,
        closures: state.closures,
        bcvRate: state.bcvRate,
        bcvLastUpdated: state.bcvLastUpdated,
        toasts,
        login,
        logout,
        navigateToModule,
        updateRolePassword,
        updateBcvRate,
        syncBcvRateFromApi,
        addProduct,
        updateProduct,
        deleteProduct,
        togglePaymentMethod,
        updatePaymentMethod,
        addPaymentMethod,
        addDriver,
        updateDriver,
        deleteDriver,
        addWaiter,
        deleteWaiter,
        dispatchOrderWithDriver,
        createOrder,
        updateOrder,
        acknowledgeOrderModification,
        updateOrderStatus,
        cancelOrder,
        confirmOrderForClosure,
        confirmAllOpenOrdersForClosure,
        performCashClosure,
        clearAllOrdersExceptClosures,
        getPublicMenuUrl,
        showToast,
        dismissToast,
      }}
    >
      {children}
    </RestaurantContext.Provider>
  );
}

export function useRestaurant() {
  const ctx = useContext(RestaurantContext);
  if (!ctx) {
    throw new Error('useRestaurant debe usarse dentro de RestaurantProvider');
  }
  return ctx;
}
