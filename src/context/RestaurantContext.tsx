import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  INITIAL_CLOSURES,
  INITIAL_CREDENTIALS,
  INITIAL_DRIVERS,
  INITIAL_ORDERS,
  INITIAL_PAYMENT_METHODS,
  INITIAL_PRODUCTS,
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

const STORAGE_KEY = 'gordis_burguer_state_v2';

interface PersistedState {
  credentials: RoleCredentials;
  products: Product[];
  paymentMethods: PaymentMethod[];
  drivers: DeliveryDriver[];
  orders: Order[];
  closures: CashClosureRecord[];
  nextOrderSeq: number;
}

interface RestaurantContextValue {
  activeModule: ActiveModule;
  currentRole: UserRole | null;
  preselectedTable: number | null;
  credentials: RoleCredentials;
  products: Product[];
  paymentMethods: PaymentMethod[];
  drivers: DeliveryDriver[];
  orders: Order[];
  closures: CashClosureRecord[];
  toasts: ToastMessage[];
  login: (role: UserRole, password: string) => { ok: boolean; error?: string };
  logout: () => void;
  navigateToModule: (mod: ActiveModule) => void;
  updateRolePassword: (role: UserRole, newPassword: string) => void;
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (id: string, updates: Partial<Omit<Product, 'id'>>) => void;
  deleteProduct: (id: string) => void;
  togglePaymentMethod: (id: string) => void;
  updatePaymentMethod: (id: string, updates: Partial<Omit<PaymentMethod, 'id'>>) => void;
  addPaymentMethod: (method: Omit<PaymentMethod, 'id'>) => void;
  addDriver: (driver: Omit<DeliveryDriver, 'id'>) => DeliveryDriver;
  updateDriver: (id: string, updates: Partial<Omit<DeliveryDriver, 'id'>>) => void;
  deleteDriver: (id: string) => void;
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
  performCashClosure: () => CashClosureRecord | null;
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
          orders: parsed.orders,
          closures: parsed.closures ?? INITIAL_CLOSURES,
          nextOrderSeq: parsed.nextOrderSeq ?? 105,
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
    orders: INITIAL_ORDERS,
    closures: INITIAL_CLOSURES,
    nextOrderSeq: 105,
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

          // Build a concise summary of what changed for Cocina KDS alert
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
          ord.id === id ? { ...ord, status: 'cancelado', updatedAt: nowIso } : ord
        ),
      }));
      showToast('Pedido cancelado.', 'info');
    },
    [persistState, showToast]
  );

  const performCashClosure = useCallback((): CashClosureRecord | null => {
    const openPaidOrders = state.orders.filter(
      (o) => o.status !== 'cancelado' && !o.closedInShiftId
    );
    if (openPaidOrders.length === 0) {
      showToast('No hay pedidos abiertos pendientes por cerrar en caja.', 'info');
      return null;
    }

    const byMethod: Record<string, number> = {};
    let totalSales = 0;

    for (const order of openPaidOrders) {
      totalSales += order.total;
      byMethod[order.paymentMethodName] = (byMethod[order.paymentMethodName] ?? 0) + order.total;
    }

    const closure: CashClosureRecord = {
      id: `cierre-${Date.now()}`,
      closedAt: new Date().toISOString(),
      totalSales,
      orderCount: openPaidOrders.length,
      byMethod,
      closedBy: 'Gerencia',
    };

    persistState((prev) => ({
      ...prev,
      orders: prev.orders.map((ord) =>
        ord.status !== 'cancelado' && !ord.closedInShiftId
          ? { ...ord, closedInShiftId: closure.id }
          : ord
      ),
      closures: [closure, ...prev.closures],
    }));

    showToast(`Cierre de caja realizado por $${totalSales.toFixed(2)}.`, 'success');
    return closure;
  }, [state.orders, persistState, showToast]);

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
        orders: state.orders,
        closures: state.closures,
        toasts,
        login,
        logout,
        navigateToModule,
        updateRolePassword,
        addProduct,
        updateProduct,
        deleteProduct,
        togglePaymentMethod,
        updatePaymentMethod,
        addPaymentMethod,
        addDriver,
        updateDriver,
        deleteDriver,
        dispatchOrderWithDriver,
        createOrder,
        updateOrder,
        acknowledgeOrderModification,
        updateOrderStatus,
        cancelOrder,
        performCashClosure,
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
