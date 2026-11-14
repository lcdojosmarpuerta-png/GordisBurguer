import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bike,
  Check,
  CheckCircle2,
  ChefHat,
  ClipboardList,
  Copy,
  CreditCard,
  DollarSign,
  Edit3,
  ExternalLink,
  FileCheck2,
  KeyRound,
  LogOut,
  MessageCircle,
  Phone,
  Plus,
  Receipt,
  Share2,
  Trash2,
  Truck,
  UserPlus,
  UtensilsCrossed,
  XCircle,
} from 'lucide-react';
import { PRESET_PRODUCT_IMAGES } from '../data/initialData';
import { useRestaurant } from '../context/RestaurantContext';
import { Order, Product, ProductCategory } from '../types/restaurant';
import {
  AddDriverModal,
  DispatchDeliveryModal,
  EditOrderModal,
  PasswordsModal,
} from './GerenciaModals';
import {
  BrandLogo,
  OrderStatusText,
  SafeProductImage,
  formatCurrency,
  formatElapsedMinutes,
  formatTime,
  modalityLabel,
} from './SharedUI';

type GerenciaTab =
  | 'caja'
  | 'pedidos'
  | 'cocina'
  | 'delivery'
  | 'menu'
  | 'whatsapp'
  | 'pagos';

// Reorganized in the exact order requested by the user:
// 1. Caja Principal
// 2. Control de Pedidos
// 3. Cocina
// 4. Delivery
// 5. Menú y Precios
// 6. Clientes & WhatsApp
// 7. Métodos de Pago
const NAV_ITEMS: {
  id: GerenciaTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'caja', label: 'Caja Principal', icon: DollarSign },
  { id: 'pedidos', label: 'Control de Pedidos', icon: ClipboardList },
  { id: 'cocina', label: 'Cocina', icon: ChefHat },
  { id: 'delivery', label: 'Delivery', icon: Bike },
  { id: 'menu', label: 'Menú y Precios', icon: UtensilsCrossed },
  { id: 'whatsapp', label: 'Clientes & WhatsApp', icon: MessageCircle },
  { id: 'pagos', label: 'Métodos de Pago', icon: CreditCard },
];

export function GerenciaModule() {
  const {
    products,
    paymentMethods,
    drivers,
    orders,
    closures,
    addProduct,
    updateProduct,
    deleteProduct,
    togglePaymentMethod,
    updatePaymentMethod,
    addPaymentMethod,
    deleteDriver,
    updateOrderStatus,
    cancelOrder,
    performCashClosure,
    getPublicMenuUrl,
    navigateToModule,
    logout,
    showToast,
  } = useRestaurant();

  const [activeTab, setActiveTab] = useState<GerenciaTab>('caja');
  const [passwordsModalOpen, setPasswordsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [addDriverModalOpen, setAddDriverModalOpen] = useState(false);
  const [dispatchingOrder, setDispatchingOrder] = useState<Order | null>(null);

  // Menu CRUD State
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [prodName, setProdName] = useState('');
  const [prodCategory, setProdCategory] = useState<ProductCategory>('Hamburguesa');
  const [prodDescription, setProdDescription] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodImageUrl, setProdImageUrl] = useState(PRESET_PRODUCT_IMAGES[0].url);

  // Payment Method Form State
  const [newPmName, setNewPmName] = useState('');
  const [newPmDetails, setNewPmDetails] = useState('');
  const [newPmRequiresProof, setNewPmRequiresProof] = useState(true);
  const [editingPmId, setEditingPmId] = useState<string | null>(null);
  const [editingPmDetails, setEditingPmDetails] = useState('');

  // WhatsApp & Public Link State
  const [waPhone, setWaPhone] = useState('');
  const [waTable, setWaTable] = useState<number | undefined>(undefined);
  const [waMessage, setWaMessage] = useState(
    '¡Hola! Gracias por preferir a Gordis Burguer. Ingresa a nuestro menú digital para armar tu pedido y enviar tu comprobante de pago:'
  );
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Live metrics
  const openShiftOrders = useMemo(
    () => orders.filter((o) => o.status !== 'cancelado' && !o.closedInShiftId),
    [orders]
  );

  const openShiftTotal = useMemo(
    () => openShiftOrders.reduce((sum, o) => sum + o.total, 0),
    [openShiftOrders]
  );

  const salesByMethod = useMemo(() => {
    const map: Record<string, { count: number; total: number }> = {};
    for (const ord of openShiftOrders) {
      if (!map[ord.paymentMethodName]) {
        map[ord.paymentMethodName] = { count: 0, total: 0 };
      }
      map[ord.paymentMethodName].count += 1;
      map[ord.paymentMethodName].total += ord.total;
    }
    return map;
  }, [openShiftOrders]);

  // Kanban groups
  const pendingOrders = useMemo(
    () => orders.filter((o) => o.status === 'pendiente'),
    [orders]
  );
  const cookingOrders = useMemo(
    () => orders.filter((o) => o.status === 'en_cocina'),
    [orders]
  );
  const servedOrReadyOrders = useMemo(
    () =>
      orders.filter(
        (o) => o.status === 'listo' || o.status === 'servido' || o.status === 'en_camino'
      ),
    [orders]
  );
  const canceledOrders = useMemo(
    () => orders.filter((o) => o.status === 'cancelado'),
    [orders]
  );

  // Delivery groups
  const deliveryPending = useMemo(
    () =>
      orders.filter(
        (o) =>
          o.modality === 'delivery' &&
          (o.status === 'pendiente' || o.status === 'en_cocina' || o.status === 'listo')
      ),
    [orders]
  );
  const deliveryDispatched = useMemo(
    () =>
      orders.filter(
        (o) =>
          o.modality === 'delivery' &&
          (o.status === 'en_camino' || o.status === 'servido')
      ),
    [orders]
  );

  // Menu CRUD handlers
  const resetProductForm = () => {
    setEditingProductId(null);
    setProdName('');
    setProdCategory('Hamburguesa');
    setProdDescription('');
    setProdPrice('');
    setProdImageUrl(PRESET_PRODUCT_IMAGES[0].url);
  };

  const handleEditProductClick = (product: Product) => {
    setEditingProductId(product.id);
    setProdName(product.name);
    setProdCategory(product.category);
    setProdDescription(product.description);
    setProdPrice(product.price.toString());
    setProdImageUrl(product.imageUrl);
  };

  const handleProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericPrice = parseFloat(prodPrice);
    if (!prodName.trim() || Number.isNaN(numericPrice) || numericPrice <= 0) {
      showToast('Ingresa un nombre válido y un precio mayor a 0.', 'error');
      return;
    }

    if (editingProductId) {
      updateProduct(editingProductId, {
        name: prodName.trim(),
        category: prodCategory,
        description: prodDescription.trim(),
        price: numericPrice,
        imageUrl: prodImageUrl.trim(),
      });
    } else {
      addProduct({
        name: prodName.trim(),
        category: prodCategory,
        description: prodDescription.trim(),
        price: numericPrice,
        imageUrl: prodImageUrl.trim(),
        available: true,
      });
    }
    resetProductForm();
  };

  const handleAddPaymentMethod = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPmName.trim() || !newPmDetails.trim()) {
      showToast('Completa el nombre y los detalles del método de pago.', 'error');
      return;
    }
    addPaymentMethod({
      name: newPmName.trim(),
      details: newPmDetails.trim(),
      requiresProof: newPmRequiresProof,
      enabled: true,
    });
    setNewPmName('');
    setNewPmDetails('');
  };

  const generatedPublicUrl = getPublicMenuUrl(waTable);

  const handleCopyPublicUrl = async () => {
    try {
      await navigator.clipboard.writeText(generatedPublicUrl);
      setCopiedUrl(true);
      showToast('Enlace público copiado.', 'success');
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch {
      showToast('Copia manualmente el enlace mostrado.', 'info');
    }
  };

  const cleanWaPhone = waPhone.replace(/\D/g, '');
  const fullWaText = encodeURIComponent(`${waMessage}\n${generatedPublicUrl}`);
  const waShareHref = cleanWaPhone
    ? `https://wa.me/${cleanWaPhone}?text=${fullWaText}`
    : `https://wa.me/?text=${fullWaText}`;

  const renderKanbanCard = (order: Order) => (
    <div
      key={order.id}
      className="rounded-xl bg-zinc-950/90 border border-white/10 p-4 space-y-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold text-white tabular-nums">
              {order.code}
            </span>
            <span className="text-zinc-600">·</span>
            <span className="text-xs font-semibold text-amber-400">
              {modalityLabel(order.modality, order.tableNumber)}
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 mt-0.5 tabular-nums">
            {formatTime(order.createdAt)} · {order.source === 'mesera' ? 'Mesera' : 'Menú Público'}
            {order.customerName ? ` · ${order.customerName}` : ''}
          </p>
        </div>
        <OrderStatusText status={order.status} />
      </div>

      {order.isModifiedAfterConfirm && (
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-300 bg-amber-500/10 border border-amber-500/25 rounded-lg px-2.5 py-1">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>Modificado tras confirmar ({formatTime(order.modifiedAt ?? order.updatedAt)})</span>
        </div>
      )}

      <ul className="space-y-1 text-xs text-zinc-200 border-t border-white/5 pt-2.5">
        {order.items.map((it, idx) => (
          <li key={idx} className="flex justify-between gap-2">
            <span className="truncate">
              <strong className="font-mono text-amber-400">{it.quantity}x</strong> {it.name}
            </span>
            <span className="font-mono text-zinc-400 tabular-nums shrink-0">
              {formatCurrency(it.price * it.quantity)}
            </span>
          </li>
        ))}
      </ul>

      {order.pagoMovilDetails && (
        <div className="text-[11px] text-zinc-300 bg-zinc-900/90 rounded-lg px-2.5 py-1.5 border border-white/5 font-mono tabular-nums">
          {order.pagoMovilDetails.bank} · Monto: {formatCurrency(order.pagoMovilDetails.amount)} · Ref:{' '}
          <strong className="text-amber-400">{order.pagoMovilDetails.referenceLast6}</strong>
        </div>
      )}

      <div className="flex items-center justify-between pt-2.5 border-t border-white/10 text-xs">
        <div className="text-zinc-400">
          <span>{order.paymentMethodName} · </span>
          <strong className="font-mono text-white tabular-nums">
            {formatCurrency(order.total)}
          </strong>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setEditingOrder(order)}
            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-300 hover:text-amber-400 transition-colors cursor-pointer"
            title="Editar pedido"
            aria-label={`Editar pedido ${order.code}`}
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          {order.status !== 'cancelado' && (
            <button
              type="button"
              onClick={() => cancelOrder(order.id)}
              className="p-1.5 rounded-lg bg-zinc-900 hover:bg-red-950/60 border border-white/10 text-zinc-300 hover:text-red-400 transition-colors cursor-pointer"
              title="Cancelar pedido"
              aria-label={`Cancelar pedido ${order.code}`}
            >
              <XCircle className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0B0C0E] text-zinc-100 flex">
      {/* Desktop Sidebar (256px) */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-zinc-950 border-r border-white/10">
        <div className="px-6 py-5 border-b border-white/10">
          <BrandLogo size="md" />
          <p className="text-xs text-zinc-400 mt-2">Panel de Gerencia</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-gradient-to-r from-red-600/20 to-amber-500/15 text-amber-300 border border-amber-500/30'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10 space-y-2.5">
          <button
            type="button"
            onClick={() => setPasswordsModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/15 text-xs font-semibold text-amber-400 transition-colors cursor-pointer"
          >
            <KeyRound className="w-4 h-4" />
            <span>Asignar Contraseñas</span>
          </button>
          <button
            type="button"
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-transparent hover:bg-zinc-900 text-xs font-medium text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Top Bar Contract */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-4 px-4 sm:px-8 py-3.5 bg-zinc-950/90 backdrop-blur-xl border-b border-white/10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="lg:hidden">
              <BrandLogo size="sm" showWordmark={false} />
            </div>
            <div className="text-sm text-zinc-400 truncate">
              <span>Gerencia</span>
              <span className="mx-2">/</span>
              <span className="font-semibold text-white">
                {NAV_ITEMS.find((n) => n.id === activeTab)?.label}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setPasswordsModalOpen(true)}
              className="lg:hidden inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 border border-white/15 text-xs font-semibold text-amber-400 cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Claves</span>
            </button>

            <button
              type="button"
              onClick={() => navigateToModule('menu_publico')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs font-semibold text-zinc-200 transition-colors whitespace-nowrap cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Ver Menú Público</span>
            </button>

            <button
              type="button"
              onClick={logout}
              className="lg:hidden inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-xs text-zinc-300 cursor-pointer"
              aria-label="Cerrar sesión"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* Mobile/Tablet Horizontal Navigation */}
        <div className="lg:hidden border-b border-white/10 bg-zinc-950 px-4 py-2 overflow-x-auto flex items-center gap-1.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-amber-500 text-zinc-950'
                    : 'bg-zinc-900 text-zinc-300 border border-white/10'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-8 py-6 space-y-6">
          {/* 1. CAJA PRINCIPAL (CIERRE DE DÍA Y CAMPOS PAGO MÓVIL) */}
          {activeTab === 'caja' && (
            <section className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="font-display text-2xl font-bold text-white">
                    Caja Principal & Cierre de Día
                  </h1>
                  <p className="text-sm text-zinc-400 mt-1">
                    Registro en tiempo real de pedidos facturados, verificación de Pago Móvil y desglose por métodos de pago
                  </p>
                </div>

                <button
                  type="button"
                  onClick={performCashClosure}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-red-600 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white text-sm font-bold shadow-lg cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Receipt className="w-4 h-4" />
                  <span>Realizar Cierre de Caja</span>
                </button>
              </div>

              {/* Financial Summary Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-2xl bg-zinc-900/90 border border-amber-500/35 p-5">
                  <p className="text-xs text-zinc-400">Total Ventas del Turno</p>
                  <p className="font-mono text-3xl font-bold text-amber-400 mt-1 tabular-nums">
                    {formatCurrency(openShiftTotal)}
                  </p>
                  <p className="text-xs text-zinc-400 mt-1 tabular-nums">
                    {openShiftOrders.length} pedidos válidos abiertos
                  </p>
                </div>

                {Object.entries(salesByMethod).map(([methodName, data]) => (
                  <div
                    key={methodName}
                    className="rounded-2xl bg-zinc-900/70 border border-white/10 p-5"
                  >
                    <p className="text-xs text-zinc-400 truncate">{methodName}</p>
                    <p className="font-mono text-2xl font-bold text-white mt-1 tabular-nums">
                      {formatCurrency(data.total)}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1 tabular-nums">
                      {data.count} {data.count === 1 ? 'transacción' : 'transacciones'}
                    </p>
                  </div>
                ))}
              </div>

              {/* Live Billed Orders Table with Pago Móvil Details */}
              <div className="rounded-2xl bg-zinc-900/70 border border-white/10 overflow-hidden">
                <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
                  <div>
                    <h2 className="font-display text-base font-bold text-white">
                      Pedidos Facturados del Turno Actual
                    </h2>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Incluye desglose de Banco, Monto y Referencia (6 últimos dígitos) en pagos vía Pago Móvil
                    </p>
                  </div>
                  <span className="font-mono text-xs text-zinc-400 tabular-nums">
                    {openShiftOrders.length} registros
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-zinc-950/80 text-zinc-400 border-b border-white/10">
                      <tr>
                        <th className="py-3 px-4 font-semibold">Código</th>
                        <th className="py-3 px-4 font-semibold">Hora</th>
                        <th className="py-3 px-4 font-semibold">Modalidad</th>
                        <th className="py-3 px-4 font-semibold">Método de Pago</th>
                        <th className="py-3 px-4 font-semibold">
                          Datos Pago Móvil (Banco / Monto / Ref 6 dígitos)
                        </th>
                        <th className="py-3 px-4 font-semibold">Estado</th>
                        <th className="py-3 px-4 font-semibold text-right">Monto Orden</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {openShiftOrders.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-zinc-500">
                            No hay pedidos abiertos pendientes por cerrar.
                          </td>
                        </tr>
                      ) : (
                        openShiftOrders.map((ord) => (
                          <tr key={ord.id} className="hover:bg-white/[0.02]">
                            <td className="py-3 px-4 font-mono font-bold text-white tabular-nums">
                              {ord.code}
                            </td>
                            <td className="py-3 px-4 font-mono text-zinc-400 tabular-nums">
                              {formatTime(ord.createdAt)}
                            </td>
                            <td className="py-3 px-4 text-zinc-200">
                              {modalityLabel(ord.modality, ord.tableNumber)}
                            </td>
                            <td className="py-3 px-4 text-zinc-200 font-medium">
                              {ord.paymentMethodName}
                            </td>
                            <td className="py-3 px-4">
                              {ord.pagoMovilDetails ? (
                                <div className="inline-flex flex-wrap items-center gap-2 text-xs font-mono tabular-nums text-zinc-200 bg-zinc-950/90 border border-amber-500/25 rounded-lg px-2.5 py-1">
                                  <span>
                                    <span className="text-zinc-400 font-sans">Banco:</span>{' '}
                                    {ord.pagoMovilDetails.bank}
                                  </span>
                                  <span className="text-zinc-600">·</span>
                                  <span>
                                    <span className="text-zinc-400 font-sans">Monto:</span>{' '}
                                    <strong className="text-emerald-400">
                                      {formatCurrency(ord.pagoMovilDetails.amount)}
                                    </strong>
                                  </span>
                                  <span className="text-zinc-600">·</span>
                                  <span>
                                    <span className="text-zinc-400 font-sans">Ref:</span>{' '}
                                    <strong className="text-amber-400">
                                      #{ord.pagoMovilDetails.referenceLast6}
                                    </strong>
                                  </span>
                                </div>
                              ) : (
                                <span className="text-xs text-zinc-500">—</span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <OrderStatusText status={ord.status} />
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-amber-400 tabular-nums">
                              {formatCurrency(ord.total)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Historical Closures */}
              {closures.length > 0 && (
                <div className="rounded-2xl bg-zinc-900/70 border border-white/10 p-5 space-y-3">
                  <h2 className="font-display text-base font-bold text-white">
                    Historial de Cierres de Caja
                  </h2>
                  <div className="space-y-3">
                    {closures.map((c) => (
                      <div
                        key={c.id}
                        className="rounded-xl bg-zinc-950 border border-white/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div>
                          <p className="text-sm font-semibold text-white">
                            Cierre del {new Date(c.closedAt).toLocaleString('es-VE')}
                          </p>
                          <p className="text-xs text-zinc-400 mt-1">
                            {c.orderCount} pedidos ·{' '}
                            {Object.entries(c.byMethod)
                              .map(([m, amt]) => `${m}: ${formatCurrency(amt)}`)
                              .join(' · ')}
                          </p>
                        </div>
                        <span className="font-mono text-xl font-bold text-emerald-400 tabular-nums shrink-0">
                          {formatCurrency(c.totalSales)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* 2. CONTROL DE PEDIDOS (LIVE DASHBOARD / KANBAN) */}
          {activeTab === 'pedidos' && (
            <section className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <h1 className="font-display text-2xl font-bold text-white">
                    Control de Pedidos en Tiempo Real
                  </h1>
                  <p className="text-sm text-zinc-400 mt-1">
                    Supervisa órdenes de Sala y Menú Público · Edita o cancela pedidos confirmados
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs sm:text-sm font-mono tabular-nums text-zinc-300">
                  <span>
                    Activos:{' '}
                    <strong className="text-amber-400">
                      {pendingOrders.length + cookingOrders.length}
                    </strong>
                  </span>
                  <span className="text-zinc-600">·</span>
                  <span>
                    Caja abierta:{' '}
                    <strong className="text-emerald-400">
                      {formatCurrency(openShiftTotal)}
                    </strong>
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
                {/* Columna 1: Pendientes */}
                <div className="rounded-2xl bg-zinc-900/60 border border-white/10 p-4 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-white/10">
                    <h2 className="font-display text-sm font-bold text-amber-400">
                      Pendientes
                    </h2>
                    <span className="font-mono text-xs text-zinc-400 tabular-nums">
                      {pendingOrders.length}
                    </span>
                  </div>
                  {pendingOrders.length === 0 ? (
                    <p className="text-xs text-zinc-500 py-6 text-center">
                      Sin pedidos pendientes
                    </p>
                  ) : (
                    pendingOrders.map(renderKanbanCard)
                  )}
                </div>

                {/* Columna 2: En Cocina */}
                <div className="rounded-2xl bg-zinc-900/60 border border-white/10 p-4 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-white/10">
                    <h2 className="font-display text-sm font-bold text-red-400">
                      En Cocina
                    </h2>
                    <span className="font-mono text-xs text-zinc-400 tabular-nums">
                      {cookingOrders.length}
                    </span>
                  </div>
                  {cookingOrders.length === 0 ? (
                    <p className="text-xs text-zinc-500 py-6 text-center">
                      Ningún pedido en preparación
                    </p>
                  ) : (
                    cookingOrders.map(renderKanbanCard)
                  )}
                </div>

                {/* Columna 3: Listos y Servidos en Mesas */}
                <div className="rounded-2xl bg-zinc-900/60 border border-white/10 p-4 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-white/10">
                    <h2 className="font-display text-sm font-bold text-emerald-400">
                      Listos / Servidos en Mesas
                    </h2>
                    <span className="font-mono text-xs text-zinc-400 tabular-nums">
                      {servedOrReadyOrders.length}
                    </span>
                  </div>
                  {servedOrReadyOrders.length === 0 ? (
                    <p className="text-xs text-zinc-500 py-6 text-center">
                      Aún no hay pedidos servidos
                    </p>
                  ) : (
                    servedOrReadyOrders.map(renderKanbanCard)
                  )}
                </div>
              </div>

              {canceledOrders.length > 0 && (
                <div className="rounded-2xl bg-zinc-900/40 border border-white/10 p-4">
                  <h3 className="text-xs font-semibold text-zinc-400 mb-3">
                    Pedidos Cancelados ({canceledOrders.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {canceledOrders.map(renderKanbanCard)}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* 3. COCINA (VISTA GERENCIAL ESPEJO) */}
          {activeTab === 'cocina' && (
            <section className="space-y-6">
              <div>
                <h1 className="font-display text-2xl font-bold text-white">
                  Supervisión de Cocina (Espejo en Vivo)
                </h1>
                <p className="text-sm text-zinc-400 mt-1">
                  Estado en tiempo real de las comandas en proceso y finalizadas en el tablero KDS
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="rounded-2xl bg-zinc-900/70 border border-white/10 p-5 space-y-3">
                  <h2 className="font-display text-base font-bold text-red-400 pb-2 border-b border-white/10">
                    Platos en Cola / Preparación ({pendingOrders.length + cookingOrders.length})
                  </h2>
                  {[...pendingOrders, ...cookingOrders].length === 0 ? (
                    <p className="text-sm text-zinc-500 py-8 text-center">
                      Cocina sin comandas activas.
                    </p>
                  ) : (
                    [...pendingOrders, ...cookingOrders].map((ord) => (
                      <div
                        key={ord.id}
                        className="rounded-xl bg-zinc-950 border border-white/10 p-4 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-sm font-bold text-white tabular-nums">
                            {ord.code} · {modalityLabel(ord.modality, ord.tableNumber)}
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-xs text-zinc-400 tabular-nums">
                              {formatElapsedMinutes(ord.createdAt)}
                            </span>
                            <OrderStatusText status={ord.status} />
                          </div>
                        </div>
                        {ord.isModifiedAfterConfirm && (
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-300 bg-amber-500/10 border border-amber-500/25 rounded-lg px-2.5 py-1">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span>
                              Modificado tras confirmar:{' '}
                              {ord.modificationSummary ?? 'Revisar comanda'}
                            </span>
                          </div>
                        )}
                        <ul className="text-xs text-zinc-200 space-y-1">
                          {ord.items.map((it, idx) => (
                            <li key={idx}>
                              <strong className="font-mono text-amber-400">{it.quantity}x</strong>{' '}
                              {it.name}
                              {it.notes ? ` (${it.notes})` : ''}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))
                  )}
                </div>

                <div className="rounded-2xl bg-zinc-900/70 border border-white/10 p-5 space-y-3">
                  <h2 className="font-display text-base font-bold text-emerald-400 pb-2 border-b border-white/10">
                    Platos Finalizados en Cocina ({servedOrReadyOrders.length})
                  </h2>
                  {servedOrReadyOrders.length === 0 ? (
                    <p className="text-sm text-zinc-500 py-8 text-center">
                      Sin platos finalizados aún.
                    </p>
                  ) : (
                    servedOrReadyOrders.map((ord) => (
                      <div
                        key={ord.id}
                        className="rounded-xl bg-zinc-950 border border-white/10 p-4 flex items-center justify-between gap-3"
                      >
                        <div>
                          <span className="font-mono text-sm font-bold text-white tabular-nums">
                            {ord.code}
                          </span>
                          <span className="text-xs text-zinc-400 ml-2">
                            {modalityLabel(ord.modality, ord.tableNumber)} · {ord.items.length} ítems
                          </span>
                        </div>
                        <OrderStatusText status={ord.status} />
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>
          )}

          {/* 4. DELIVERY (CON REGISTRO DE CONDUCTORES Y MODAL DE DESPACHO) */}
          {activeTab === 'delivery' && (
            <section className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="font-display text-2xl font-bold text-white">
                    Gestión de Delivery y Conductores
                  </h1>
                  <p className="text-sm text-zinc-400 mt-1">
                    Registra conductores, asigna pedidos y envía notificaciones automáticas al chofer y al cliente
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setAddDriverModalOpen(true)}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-red-600 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white text-sm font-bold shadow-lg cursor-pointer whitespace-nowrap shrink-0"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Agregar Conductor</span>
                </button>
              </div>

              {/* Registered Drivers Strip */}
              <div className="rounded-2xl bg-zinc-900/70 border border-white/10 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-sm font-bold text-zinc-200">
                    Conductores Registrados ({drivers.length})
                  </h2>
                </div>
                {drivers.length === 0 ? (
                  <p className="text-xs text-zinc-500 py-4 text-center">
                    No hay conductores registrados. Usa el botón &ldquo;Agregar Conductor&rdquo; para añadir motorizados.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {drivers.map((drv) => (
                      <div
                        key={drv.id}
                        className="rounded-xl bg-zinc-950 border border-white/10 p-3.5 flex items-start justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-display text-sm font-bold text-white truncate">
                              {drv.name}
                            </span>
                            <span className="text-[11px] font-mono text-amber-400">
                              · {drv.vehicleType}
                            </span>
                          </div>
                          <p className="text-xs font-mono text-zinc-300 mt-1 tabular-nums">
                            {drv.idNumber} · Tel: {drv.phone}
                          </p>
                          <p className="text-[11px] text-zinc-400 mt-0.5 truncate">
                            {drv.vehiclePlate}
                            {drv.zone ? ` · ${drv.zone}` : ''}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => deleteDriver(drv.id)}
                          className="p-1.5 rounded-lg bg-zinc-900 hover:bg-red-950/60 border border-white/10 text-zinc-400 hover:text-red-400 cursor-pointer shrink-0"
                          title="Eliminar conductor"
                          aria-label={`Eliminar conductor ${drv.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                {/* Pendientes por enviar */}
                <div className="rounded-2xl bg-zinc-900/70 border border-white/10 p-5 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <h2 className="font-display text-base font-bold text-amber-400">
                      Pendientes por Enviar ({deliveryPending.length})
                    </h2>
                  </div>
                  {deliveryPending.length === 0 ? (
                    <p className="text-sm text-zinc-500 py-8 text-center">
                      No hay pedidos de delivery pendientes por despachar.
                    </p>
                  ) : (
                    deliveryPending.map((ord) => (
                      <div
                        key={ord.id}
                        className="rounded-xl bg-zinc-950 border border-white/10 p-4 space-y-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="font-mono text-base font-bold text-white tabular-nums">
                              {ord.code}
                            </span>
                            <span className="text-zinc-500 mx-2">·</span>
                            <span className="text-sm font-semibold text-white">
                              {ord.customerName ?? 'Cliente Delivery'}
                            </span>
                            <p className="text-xs text-zinc-400 mt-0.5">
                              Tel: {ord.customerPhone ?? 'N/D'} · {ord.deliveryAddress ?? 'Sin dirección'}
                            </p>
                          </div>
                          <OrderStatusText status={ord.status} />
                        </div>

                        <div className="text-xs text-zinc-300 space-y-1">
                          {ord.items.map((it, idx) => (
                            <p key={idx}>
                              <strong className="font-mono text-amber-400">{it.quantity}x</strong>{' '}
                              {it.name}
                            </p>
                          ))}
                        </div>

                        {ord.pagoMovilDetails && (
                          <div className="text-xs font-mono text-zinc-300 bg-zinc-900 rounded-lg px-2.5 py-1.5 border border-white/5 tabular-nums">
                            Pago Móvil: {ord.pagoMovilDetails.bank} ·{' '}
                            {formatCurrency(ord.pagoMovilDetails.amount)} · Ref:{' '}
                            <strong className="text-amber-400">
                              #{ord.pagoMovilDetails.referenceLast6}
                            </strong>
                          </div>
                        )}

                        {ord.paymentProofName && (
                          <div className="inline-flex items-center gap-1.5 text-xs text-emerald-300">
                            <FileCheck2 className="w-3.5 h-3.5" />
                            <span>Comprobante: {ord.paymentProofName}</span>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t border-white/10">
                          <span className="font-mono text-sm font-bold text-white tabular-nums">
                            {formatCurrency(ord.total)} · {ord.paymentMethodName}
                          </span>
                          <button
                            type="button"
                            onClick={() => setDispatchingOrder(ord)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold shadow-md cursor-pointer"
                          >
                            <Truck className="w-3.5 h-3.5" />
                            <span>Despachar Pedido</span>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Despachados */}
                <div className="rounded-2xl bg-zinc-900/70 border border-white/10 p-5 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <h2 className="font-display text-base font-bold text-sky-400">
                      Pedidos Despachados ({deliveryDispatched.length})
                    </h2>
                  </div>
                  {deliveryDispatched.length === 0 ? (
                    <p className="text-sm text-zinc-500 py-8 text-center">
                      No hay envíos en camino o entregados todavía.
                    </p>
                  ) : (
                    deliveryDispatched.map((ord) => (
                      <div
                        key={ord.id}
                        className="rounded-xl bg-zinc-950 border border-white/10 p-4 space-y-2.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="font-mono text-base font-bold text-white tabular-nums">
                              {ord.code}
                            </span>
                            <span className="text-zinc-500 mx-2">·</span>
                            <span className="text-sm font-semibold text-white">
                              {ord.customerName ?? 'Cliente Delivery'}
                            </span>
                            <p className="text-xs text-zinc-400 mt-0.5">
                              Tel Cliente: {ord.customerPhone ?? 'N/D'} · {ord.deliveryAddress}
                            </p>
                          </div>
                          <OrderStatusText status={ord.status} />
                        </div>

                        {ord.assignedDriverName && (
                          <div className="rounded-lg bg-zinc-900/90 border border-white/10 px-3 py-2 text-xs text-zinc-300 flex flex-wrap items-center justify-between gap-2">
                            <span>
                              <strong className="text-amber-400">Chofer:</strong>{' '}
                              {ord.assignedDriverName} ({ord.assignedDriverVehicle})
                            </span>
                            <span className="font-mono text-zinc-400 tabular-nums">
                              <Phone className="w-3 h-3 inline mr-1" />
                              {ord.assignedDriverPhone}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t border-white/10">
                          <span className="font-mono text-xs text-zinc-300 tabular-nums">
                            {formatCurrency(ord.total)} · {formatTime(ord.updatedAt)}
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setDispatchingOrder(ord)}
                              className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs text-amber-400 font-semibold cursor-pointer"
                            >
                              Reenviar Avisos
                            </button>
                            {ord.status === 'en_camino' && (
                              <button
                                type="button"
                                onClick={() => {
                                  updateOrderStatus(ord.id, 'servido');
                                  showToast(`Delivery ${ord.code} entregado.`, 'success');
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Confirmar Entrega</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>
          )}

          {/* 5. CARGA DE MENÚ Y PRECIOS (CRUD) */}
          {activeTab === 'menu' && (
            <section className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
              {/* CRUD Form */}
              <div className="xl:col-span-4 rounded-2xl bg-zinc-900/80 border border-white/10 p-5">
                <h2 className="font-display text-lg font-bold text-white mb-1">
                  {editingProductId ? 'Editar Producto' : 'Registrar Nuevo Producto'}
                </h2>
                <p className="text-xs text-zinc-400 mb-4">
                  Se refleja inmediatamente en Mesera y Menú Público
                </p>

                <form onSubmit={handleProductSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">
                      Nombre del Producto
                    </label>
                    <input
                      type="text"
                      required
                      value={prodName}
                      onChange={(e) => setProdName(e.target.value)}
                      placeholder="Ej. Gordis Triple Cheese"
                      className="w-full rounded-xl bg-zinc-950 border border-white/15 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1">
                        Categoría
                      </label>
                      <select
                        value={prodCategory}
                        onChange={(e) => setProdCategory(e.target.value as ProductCategory)}
                        className="w-full rounded-xl bg-zinc-950 border border-white/15 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                      >
                        <option value="Hamburguesa">Hamburguesa</option>
                        <option value="Perro Caliente">Perro Caliente</option>
                        <option value="Papas Fritas">Papas Fritas</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1">
                        Precio (USD)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.5"
                        required
                        value={prodPrice}
                        onChange={(e) => setProdPrice(e.target.value)}
                        placeholder="9.50"
                        className="w-full rounded-xl bg-zinc-950 border border-white/15 px-3 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">
                      Descripción
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={prodDescription}
                      onChange={(e) => setProdDescription(e.target.value)}
                      placeholder="Ingredientes, tipo de pan, salsas..."
                      className="w-full rounded-xl bg-zinc-950 border border-white/15 px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">
                      URL de Imagen de Referencia
                    </label>
                    <input
                      type="text"
                      value={prodImageUrl}
                      onChange={(e) => setProdImageUrl(e.target.value)}
                      placeholder="https://... o selecciona galería"
                      className="w-full rounded-xl bg-zinc-950 border border-white/15 px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {PRESET_PRODUCT_IMAGES.map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => setProdImageUrl(preset.url)}
                          className="text-[11px] px-2.5 py-1 rounded-lg bg-zinc-950 border border-white/10 hover:border-amber-500/50 text-zinc-300 cursor-pointer"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="submit"
                      className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-red-600 to-amber-500 text-white text-sm font-bold shadow-lg cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{editingProductId ? 'Actualizar Producto' : 'Agregar al Menú'}</span>
                    </button>
                    {editingProductId && (
                      <button
                        type="button"
                        onClick={resetProductForm}
                        className="px-4 py-2.5 rounded-xl bg-zinc-800 text-xs font-semibold text-zinc-200 cursor-pointer"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Products List */}
              <div className="xl:col-span-8 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-lg font-bold text-white">
                    Catálogo Actual ({products.length} productos)
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {products.map((prod) => (
                    <div
                      key={prod.id}
                      className="flex gap-4 rounded-2xl bg-zinc-900/80 border border-white/10 p-4"
                    >
                      <div className="w-24 h-24 rounded-xl overflow-hidden bg-zinc-950 shrink-0">
                        <SafeProductImage
                          src={prod.imageUrl}
                          alt={prod.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs text-zinc-400">{prod.category}</p>
                            <span className="font-mono text-sm font-bold text-amber-400 tabular-nums">
                              {formatCurrency(prod.price)}
                            </span>
                          </div>
                          <h3 className="font-display text-base font-bold text-white truncate">
                            {prod.name}
                          </h3>
                          <p className="text-xs text-zinc-400 line-clamp-2 mt-0.5">
                            {prod.description}
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-2 mt-2 border-t border-white/5">
                          <button
                            type="button"
                            onClick={() =>
                              updateProduct(prod.id, { available: !prod.available })
                            }
                            className={`text-xs font-semibold cursor-pointer ${
                              prod.available ? 'text-emerald-400' : 'text-zinc-500'
                            }`}
                          >
                            {prod.available ? 'Disponible' : 'Pausado'}
                          </button>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleEditProductClick(prod)}
                              className="p-1.5 rounded-lg bg-zinc-950 border border-white/10 text-zinc-300 hover:text-amber-400 cursor-pointer"
                              aria-label={`Editar ${prod.name}`}
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteProduct(prod.id)}
                              className="p-1.5 rounded-lg bg-zinc-950 border border-white/10 text-zinc-300 hover:text-red-400 cursor-pointer"
                              aria-label={`Eliminar ${prod.name}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* 6. MÓDULO CLIENTES & WHATSAPP */}
          {activeTab === 'whatsapp' && (
            <section className="max-w-3xl space-y-6">
              <div>
                <h1 className="font-display text-2xl font-bold text-white">
                  Clientes & Enlace Directo por WhatsApp
                </h1>
                <p className="text-sm text-zinc-400 mt-1">
                  Comparte el Menú Público para que el cliente seleccione productos, pague y adjunte su comprobante
                </p>
              </div>

              <div className="rounded-2xl bg-zinc-900/80 border border-white/10 p-6 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                      Número WhatsApp del Cliente (opcional)
                    </label>
                    <input
                      type="tel"
                      value={waPhone}
                      onChange={(e) => setWaPhone(e.target.value)}
                      placeholder="Ej. 584145558910"
                      className="w-full rounded-xl bg-zinc-950 border border-white/15 px-3.5 py-2.5 text-sm font-mono text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                      Mesa Preseleccionada (opcional)
                    </label>
                    <select
                      value={waTable ?? ''}
                      onChange={(e) =>
                        setWaTable(e.target.value ? Number(e.target.value) : undefined)
                      }
                      className="w-full rounded-xl bg-zinc-950 border border-white/15 px-3.5 py-2.5 text-sm text-white"
                    >
                      <option value="">General (Delivery o elegir mesa)</option>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <option key={m} value={m}>
                          Mesa {m}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Mensaje de invitación
                  </label>
                  <textarea
                    rows={3}
                    value={waMessage}
                    onChange={(e) => setWaMessage(e.target.value)}
                    className="w-full rounded-xl bg-zinc-950 border border-white/15 px-3.5 py-2.5 text-sm text-white"
                  />
                </div>

                <div>
                  <span className="block text-xs font-medium text-zinc-400 mb-1.5">
                    Enlace generado del Menú Público
                  </span>
                  <div className="rounded-xl bg-zinc-950 border border-white/10 p-3 font-mono text-xs text-amber-300 break-all">
                    {generatedPublicUrl}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <a
                    href={waShareHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-lg"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Compartir vía WhatsApp</span>
                  </a>
                  <button
                    type="button"
                    onClick={handleCopyPublicUrl}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-semibold cursor-pointer"
                  >
                    {copiedUrl ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                    <span>{copiedUrl ? 'Enlace Copiado' : 'Copiar Enlace'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => navigateToModule('menu_publico')}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-950 border border-white/15 hover:border-amber-500/50 text-amber-400 text-sm font-semibold cursor-pointer"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Abrir Menú Público Aquí</span>
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* 7. GESTIÓN DE MÉTODOS DE PAGO */}
          {activeTab === 'pagos' && (
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-7 space-y-4">
                <div>
                  <h1 className="font-display text-2xl font-bold text-white">
                    Métodos de Pago Aceptados
                  </h1>
                  <p className="text-sm text-zinc-400 mt-1">
                    Activa, desactiva o actualiza los datos bancarios visibles en Mesera y Menú Público
                  </p>
                </div>

                <div className="space-y-3">
                  {paymentMethods.map((pm) => {
                    const isEditing = editingPmId === pm.id;
                    return (
                      <div
                        key={pm.id}
                        className="rounded-2xl bg-zinc-900/80 border border-white/10 p-5 space-y-3"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <h3 className="font-display text-base font-bold text-white">
                              {pm.name}
                            </h3>
                            <p className="text-xs text-zinc-400">
                              {pm.requiresProof
                                ? 'Solicita comprobante en Menú Público'
                                : 'No requiere captura previa'}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => togglePaymentMethod(pm.id)}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                              pm.enabled
                                ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-zinc-800 text-zinc-400 border border-white/10'
                            }`}
                          >
                            {pm.enabled ? 'Activo' : 'Inactivo'}
                          </button>
                        </div>

                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editingPmDetails}
                              onChange={(e) => setEditingPmDetails(e.target.value)}
                              className="flex-1 rounded-xl bg-zinc-950 border border-white/15 px-3 py-2 text-xs text-white"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                updatePaymentMethod(pm.id, { details: editingPmDetails });
                                setEditingPmId(null);
                              }}
                              className="px-3 py-2 rounded-xl bg-amber-500 text-zinc-950 text-xs font-bold cursor-pointer"
                            >
                              Guardar
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/5">
                            <p className="text-xs text-zinc-300">{pm.details}</p>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingPmId(pm.id);
                                setEditingPmDetails(pm.details);
                              }}
                              className="text-xs font-semibold text-amber-400 hover:underline shrink-0 cursor-pointer"
                            >
                              Editar datos
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="lg:col-span-5 rounded-2xl bg-zinc-900/80 border border-white/10 p-5">
                <h2 className="font-display text-lg font-bold text-white mb-1">
                  Agregar Nuevo Método
                </h2>
                <p className="text-xs text-zinc-400 mb-4">
                  Ejemplo: Binance Pay, PayPal, Transferencia Bancaria
                </p>

                <form onSubmit={handleAddPaymentMethod} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">
                      Nombre del Método
                    </label>
                    <input
                      type="text"
                      required
                      value={newPmName}
                      onChange={(e) => setNewPmName(e.target.value)}
                      placeholder="Ej. Binance Pay"
                      className="w-full rounded-xl bg-zinc-950 border border-white/15 px-3 py-2.5 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">
                      Instrucciones / Cuenta
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={newPmDetails}
                      onChange={(e) => setNewPmDetails(e.target.value)}
                      placeholder="ID de usuario, correo o número de cuenta..."
                      className="w-full rounded-xl bg-zinc-950 border border-white/15 px-3 py-2 text-sm text-white"
                    />
                  </div>
                  <label className="flex items-center gap-2.5 text-xs text-zinc-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newPmRequiresProof}
                      onChange={(e) => setNewPmRequiresProof(e.target.checked)}
                      className="rounded border-white/20 bg-zinc-950 accent-amber-500"
                    />
                    <span>Exigir carga de comprobante al cliente</span>
                  </label>

                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-red-600 to-amber-500 text-white text-sm font-bold shadow-lg cursor-pointer"
                  >
                    Agregar Método de Pago
                  </button>
                </form>
              </div>
            </section>
          )}
        </main>
      </div>

      {/* Modals */}
      {passwordsModalOpen && (
        <PasswordsModal onClose={() => setPasswordsModalOpen(false)} />
      )}
      {editingOrder && (
        <EditOrderModal order={editingOrder} onClose={() => setEditingOrder(null)} />
      )}
      {addDriverModalOpen && (
        <AddDriverModal onClose={() => setAddDriverModalOpen(false)} />
      )}
      {dispatchingOrder && (
        <DispatchDeliveryModal
          order={dispatchingOrder}
          onClose={() => setDispatchingOrder(null)}
          onOpenAddDriver={() => setAddDriverModalOpen(true)}
        />
      )}
    </div>
  );
}
