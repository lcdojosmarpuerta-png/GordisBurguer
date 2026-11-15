import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  CheckCircle2,
  ClipboardList,
  Copy,
  Edit3,
  LogOut,
  MessageCircle,
  Minus,
  Plus,
  Search,
  Share2,
  ShoppingBag,
  Trash2,
  Utensils,
  X,
} from 'lucide-react';
import { useRestaurant } from '../context/RestaurantContext';
import { Order, OrderItem, Product, ProductCategory } from '../types/restaurant';
import { EditOrderModal } from './GerenciaModals';
import {
  PaymentSplitDraft,
  PaymentSplitForm,
  createInitialPaymentSplit,
  validateAndBuildPaymentSplits,
} from './PaymentSplitForm';
import {
  BcvRateBanner,
  BrandLogo,
  OrderStatusText,
  SafeProductImage,
  formatBs,
  formatCurrency,
  formatTime,
  modalityLabel,
} from './SharedUI';

const CATEGORIES: ('Todas' | ProductCategory)[] = [
  'Todas',
  'Hamburguesa',
  'Perro Caliente',
  'Papas Fritas',
];

const TABLES = Array.from({ length: 12 }, (_, i) => i + 1);

export function MeseraModule() {
  const {
    products,
    paymentMethods,
    orders,
    bcvRate,
    createOrder,
    updateOrderStatus,
    getPublicMenuUrl,
    logout,
    showToast,
  } = useRestaurant();

  const [selectedCategory, setSelectedCategory] = useState<'Todas' | ProductCategory>('Todas');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'carta' | 'ordenes'>('carta');
  const [editingSalaOrder, setEditingSalaOrder] = useState<Order | null>(null);

  // Cart State
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [modality, setModality] = useState<'sitio' | 'llevar'>('sitio');
  const [tableNumber, setTableNumber] = useState<number>(1);
  const enabledPaymentMethods = useMemo(
    () => paymentMethods.filter((pm) => pm.enabled),
    [paymentMethods]
  );

  const cartTotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart]
  );

  // Multi-payment splits state
  const [paymentSplits, setPaymentSplits] = useState<PaymentSplitDraft[]>(() => [
    createInitialPaymentSplit(enabledPaymentMethods[0]?.id ?? 'pm-pago-movil', 0),
  ]);

  // Keep single payment split amount synced when cart changes (if user hasn't added a 2nd split yet)
  useEffect(() => {
    setPaymentSplits((prev) => {
      if (prev.length === 1) {
        return [
          {
            ...prev[0],
            methodId:
              enabledPaymentMethods.find((pm) => pm.id === prev[0].methodId)?.id ??
              enabledPaymentMethods[0]?.id ??
              '',
            amountUsd: cartTotal > 0 ? cartTotal.toFixed(2) : '',
          },
        ];
      }
      return prev;
    });
  }, [cartTotal, enabledPaymentMethods]);

  const [generalNotes, setGeneralNotes] = useState('');
  const [mobileCartOpen, setMobileCartOpen] = useState(false);

  // Share Link Modal
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareTable, setShareTable] = useState<number | undefined>(undefined);
  const [copiedLink, setCopiedLink] = useState(false);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (!p.available) return false;
      const matchesCat = selectedCategory === 'Todas' || p.category === selectedCategory;
      const matchesQuery =
        !searchQuery.trim() ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesQuery;
    });
  }, [products, selectedCategory, searchQuery]);

  const activeSalaOrders = useMemo(() => {
    return orders.filter(
      (o) =>
        o.status !== 'cancelado' &&
        o.status !== 'servido' &&
        o.modality !== 'delivery'
    );
  }, [orders]);

  const readyToServeCount = useMemo(
    () => activeSalaOrders.filter((o) => o.status === 'listo').length,
    [activeSalaOrders]
  );

  const cartCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          price: product.price,
          quantity: 1,
          notes: '',
        },
      ];
    });
  };

  const updateItemQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.productId === productId
            ? { ...item, quantity: item.quantity + delta }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const updateItemNotes = (productId: string, notes: string) => {
    setCart((prev) =>
      prev.map((item) => (item.productId === productId ? { ...item, notes } : item))
    );
  };

  const handleConfirmOrder = () => {
    if (cart.length === 0) {
      showToast('Agrega al menos un producto al pedido.', 'error');
      return;
    }
    if (modality === 'sitio' && (!tableNumber || tableNumber < 1)) {
      showToast('Selecciona el número de mesa.', 'error');
      return;
    }
    if (enabledPaymentMethods.length === 0) {
      showToast('No hay métodos de pago activos configurados por Gerencia.', 'error');
      return;
    }

    const validation = validateAndBuildPaymentSplits(
      paymentSplits,
      enabledPaymentMethods,
      cartTotal,
      bcvRate
    );

    if (!validation.ok || !validation.normalizedSplits) {
      showToast(validation.error ?? 'Verifica los datos del pago.', 'error');
      return;
    }

    const order = createOrder({
      source: 'mesera',
      modality,
      tableNumber: modality === 'sitio' ? tableNumber : undefined,
      items: cart.map((item) => ({
        ...item,
        notes: item.notes?.trim() || undefined,
      })),
      total: cartTotal,
      bcvRateAtOrder: bcvRate,
      paymentMethodId: validation.primaryMethodId ?? enabledPaymentMethods[0].id,
      paymentMethodName: validation.primaryMethodName ?? enabledPaymentMethods[0].name,
      payments: validation.normalizedSplits,
      pagoMovilDetails: validation.primaryPagoMovil,
      cashCurrency: validation.primaryCashCurrency,
      notes: generalNotes.trim() || undefined,
    });

    setCart([]);
    setGeneralNotes('');
    setPaymentSplits([
      createInitialPaymentSplit(enabledPaymentMethods[0]?.id ?? 'pm-pago-movil', 0),
    ]);
    setMobileCartOpen(false);
    showToast(`Comanda ${order.code} enviada a Cocina.`, 'success');
  };

  const handleCopyMenuLink = async () => {
    const url = getPublicMenuUrl(shareTable);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      showToast('Enlace del menú digital copiado al portapapeles.', 'success');
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      showToast('No se pudo copiar automáticamente; copia el enlace manualmente.', 'info');
    }
  };

  const shareUrl = getPublicMenuUrl(shareTable);
  const shareMesaTxt = shareTable ? ` para la Mesa ${shareTable}` : '';
  const shareWaHref = `https://wa.me/?text=${encodeURIComponent(
    `¡Hola! Bienvenido a Gordis Burguer. Aquí tienes nuestro menú digital${shareMesaTxt} para hacer tu pedido: ${shareUrl}`
  )}`;

  const renderCartContent = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div>
          <h2 className="font-display text-lg font-bold text-white">Orden Actual</h2>
          <p className="text-xs text-zinc-400 tabular-nums">
            {cartCount} {cartCount === 1 ? 'producto' : 'productos'} · Tasa BCV: Bs.{' '}
            {bcvRate.toFixed(2)}
          </p>
        </div>
        {cart.length > 0 && (
          <button
            type="button"
            onClick={() => setCart([])}
            className="text-xs text-zinc-400 hover:text-red-400 transition-colors cursor-pointer"
          >
            Vaciar
          </button>
        )}
      </div>

      {/* Scrollable Body for Modality + Items + Multi-Payment Form */}
      <div className="flex-1 overflow-y-auto my-3 space-y-4 pr-1">
        {/* Modality Selector */}
        <div>
          <span className="block text-xs font-medium text-zinc-400 mb-2">
            Modalidad de Servicio
          </span>
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-zinc-950 border border-white/10">
            <button
              type="button"
              onClick={() => setModality('sitio')}
              className={`py-2 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                modality === 'sitio'
                  ? 'bg-amber-500 text-zinc-950'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Comer en el sitio
            </button>
            <button
              type="button"
              onClick={() => setModality('llevar')}
              className={`py-2 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                modality === 'llevar'
                  ? 'bg-amber-500 text-zinc-950'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Para llevar
            </button>
          </div>

          {modality === 'sitio' && (
            <div className="mt-3">
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                Número de Mesa
              </label>
              <div className="grid grid-cols-6 gap-1.5">
                {TABLES.map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setTableNumber(num)}
                    className={`py-1.5 rounded-lg font-mono text-xs font-semibold tabular-nums transition-colors cursor-pointer ${
                      tableNumber === num
                        ? 'bg-red-600 text-white shadow-sm'
                        : 'bg-zinc-950 text-zinc-300 border border-white/10 hover:border-amber-500/50'
                    }`}
                  >
                    M{num}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Cart Items */}
        <div className="space-y-2.5">
          {cart.length === 0 ? (
            <div className="h-36 flex flex-col items-center justify-center text-center border border-dashed border-white/10 rounded-xl p-4">
              <ShoppingBag className="w-7 h-7 text-zinc-600 mb-2" />
              <p className="text-xs text-zinc-400">
                Selecciona platos del menú para armar la comanda.
              </p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.productId}
                className="rounded-xl bg-zinc-950/80 border border-white/10 p-3 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{item.name}</p>
                    <p className="text-xs font-mono text-amber-400 tabular-nums">
                      {formatCurrency(item.price * item.quantity)}{' '}
                      <span className="text-zinc-400">
                        · {formatBs(item.price * item.quantity, bcvRate)}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => updateItemQty(item.productId, -1)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg bg-zinc-900 border border-white/10 text-zinc-300 hover:text-white cursor-pointer"
                      aria-label="Restar cantidad"
                    >
                      {item.quantity === 1 ? (
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      ) : (
                        <Minus className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <span className="w-6 text-center font-mono text-xs font-bold text-white tabular-nums">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateItemQty(item.productId, 1)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg bg-zinc-900 border border-white/10 text-zinc-300 hover:text-white cursor-pointer"
                      aria-label="Sumar cantidad"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <input
                  type="text"
                  value={item.notes ?? ''}
                  onChange={(e) => updateItemNotes(item.productId, e.target.value)}
                  placeholder="Nota cocina (ej. sin cebolla, extra salsa)"
                  className="w-full rounded-lg bg-zinc-900 border border-white/10 px-2.5 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-amber-500/50"
                />
              </div>
            ))
          )}
        </div>

        {/* Multi-Payment Form (+ Añadir otro pago, Efectivo $/Bs, Pago Móvil) */}
        <div className="pt-2 border-t border-white/10">
          <PaymentSplitForm
            splits={paymentSplits}
            onChangeSplits={setPaymentSplits}
            enabledMethods={enabledPaymentMethods}
            orderTotalUsd={cartTotal}
            bcvRate={bcvRate}
          />
        </div>

        <input
          type="text"
          value={generalNotes}
          onChange={(e) => setGeneralNotes(e.target.value)}
          placeholder="Observación general del pedido (opcional)"
          className="w-full rounded-xl bg-zinc-950 border border-white/10 px-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-amber-500/50"
        />
      </div>

      {/* Footer Totals & Submit */}
      <div className="pt-3 border-t border-white/10 space-y-2.5">
        <div className="flex items-end justify-between">
          <div>
            <span className="block text-xs text-zinc-400">Total del Pedido</span>
            <span className="font-mono text-xs text-emerald-400 tabular-nums">
              {formatBs(cartTotal, bcvRate)}
            </span>
          </div>
          <span className="font-mono text-2xl font-bold text-white tabular-nums">
            {formatCurrency(cartTotal)}
          </span>
        </div>

        <button
          type="button"
          onClick={handleConfirmOrder}
          disabled={cart.length === 0}
          className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-gradient-to-r from-red-600 to-amber-500 hover:from-red-500 hover:to-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold shadow-lg hover:shadow-xl transition-all cursor-pointer"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Confirmar Orden</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0B0C0E] text-zinc-100 flex flex-col">
      {/* Top Bar Contract */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 px-4 sm:px-8 py-3.5 bg-zinc-950/90 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center gap-3">
          <BrandLogo size="sm" />
          <div className="hidden xl:block">
            <BcvRateBanner compact />
          </div>
        </div>

        <nav className="flex items-center gap-1 p-1 rounded-xl bg-zinc-900 border border-white/10">
          <button
            type="button"
            onClick={() => setActiveTab('carta')}
            className={`px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'carta'
                ? 'bg-amber-500 text-zinc-950'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Tomar Orden
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ordenes')}
            className={`px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'ordenes'
                ? 'bg-red-600 text-white'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Sala ({activeSalaOrders.length})
            {readyToServeCount > 0 ? ` · ${readyToServeCount} Listos` : ''}
          </button>
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShareModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-xs font-semibold text-amber-300 transition-colors whitespace-nowrap cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Link Menú Digital</span>
          </button>
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs font-medium text-zinc-200 transition-colors whitespace-nowrap cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 text-zinc-400" />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-8 py-6 pb-24 lg:pb-8">
        {/* Mobile/Tablet BCV Rate Strip */}
        <div className="xl:hidden mb-4 flex items-center justify-between">
          <BcvRateBanner />
        </div>

        {activeTab === 'carta' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Menu Catalog */}
            <div className="lg:col-span-8 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                        selectedCategory === cat
                          ? 'bg-red-600 text-white'
                          : 'bg-zinc-900 text-zinc-300 border border-white/10 hover:text-white'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar producto..."
                    className="w-full rounded-xl bg-zinc-900 border border-white/10 pl-9 pr-3 py-2 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredProducts.map((product) => {
                  const inCart = cart.find((i) => i.productId === product.id);
                  return (
                    <div
                      key={product.id}
                      className="flex flex-col rounded-2xl bg-zinc-900/80 border border-white/10 overflow-hidden hover:border-amber-500/40 transition-all"
                    >
                      <div className="aspect-[4/3] w-full bg-zinc-950 overflow-hidden">
                        <SafeProductImage
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 flex flex-col justify-between p-4 gap-3">
                        <div>
                          <p className="text-[11px] font-medium text-zinc-400">
                            {product.category}
                          </p>
                          <h3 className="font-display text-base font-bold text-white mt-0.5 leading-snug">
                            {product.name}
                          </h3>
                          <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                            {product.description}
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-white/5">
                          <div>
                            <span className="block font-mono text-base font-bold text-amber-400 tabular-nums">
                              {formatCurrency(product.price)}
                            </span>
                            <span className="block font-mono text-[11px] text-zinc-400 tabular-nums">
                              {formatBs(product.price, bcvRate)}
                            </span>
                          </div>

                          {inCart ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => updateItemQty(product.id, -1)}
                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-800 text-white hover:bg-zinc-700 cursor-pointer"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="w-5 text-center font-mono text-xs font-bold tabular-nums">
                                {inCart.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => addToCart(product)}
                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-amber-500 text-zinc-950 hover:bg-amber-400 cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => addToCart(product)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold transition-colors cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Agregar</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Desktop Floating/Sticky Cart Panel */}
            <aside className="hidden lg:block lg:col-span-4 sticky top-20 rounded-2xl bg-zinc-900/85 backdrop-blur-xl border border-white/15 p-5 shadow-2xl max-h-[calc(100vh-6rem)] flex flex-col">
              {renderCartContent()}
            </aside>
          </div>
        ) : (
          /* Active Room Orders Tab */
          <div className="space-y-4">
            <div>
              <h1 className="font-display text-2xl font-bold text-white">
                Seguimiento de Mesas y Para Llevar
              </h1>
              <p className="text-sm text-zinc-400 mt-1">
                Sincronización en vivo con Cocina · Precios expresados en $ y Bs (Tasa BCV)
              </p>
            </div>

            {activeSalaOrders.length === 0 ? (
              <div className="rounded-2xl bg-zinc-900/60 border border-white/10 p-10 text-center">
                <ClipboardList className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
                <p className="text-sm text-zinc-400">
                  No hay órdenes activas en sala en este momento.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {activeSalaOrders.map((order) => {
                  const rate = order.bcvRateAtOrder ?? bcvRate;
                  return (
                    <div
                      key={order.id}
                      className={`rounded-2xl border p-5 flex flex-col justify-between gap-4 ${
                        order.status === 'listo'
                          ? 'bg-emerald-950/25 border-emerald-500/40'
                          : 'bg-zinc-900/80 border-white/10'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/10">
                          <div>
                            <span className="font-mono text-lg font-bold text-white tabular-nums">
                              {order.code}
                            </span>
                            <span className="text-zinc-500 mx-2">·</span>
                            <span className="text-sm font-semibold text-amber-400">
                              {modalityLabel(order.modality, order.tableNumber)}
                            </span>
                          </div>
                          <OrderStatusText status={order.status} />
                        </div>

                        <ul className="mt-3 space-y-1.5 text-sm text-zinc-200">
                          {order.items.map((it, idx) => (
                            <li key={idx} className="flex items-baseline justify-between gap-2">
                              <span>
                                <strong className="font-mono text-amber-400 tabular-nums">
                                  {it.quantity}x
                                </strong>{' '}
                                {it.name}
                              </span>
                              <span className="font-mono text-xs text-zinc-400 tabular-nums">
                                {formatCurrency(it.price * it.quantity)} ·{' '}
                                {formatBs(it.price * it.quantity, rate)}
                              </span>
                            </li>
                          ))}
                        </ul>

                        {order.payments && order.payments.length > 0 ? (
                          <div className="mt-3 space-y-1">
                            {order.payments.map((sp) => (
                              <div
                                key={sp.id}
                                className="text-xs font-mono text-zinc-300 bg-zinc-950 rounded-lg px-2.5 py-1.5 border border-white/5 tabular-nums"
                              >
                                <span className="font-sans text-amber-400 font-semibold">
                                  {sp.methodName}
                                  {sp.cashCurrency
                                    ? ` (${sp.cashCurrency === 'VES' ? 'Bs' : '$'})`
                                    : ''}
                                  :
                                </span>{' '}
                                {formatCurrency(sp.amountUsd)} ({formatBs(sp.amountUsd, rate)})
                                {sp.pagoMovilDetails && (
                                  <span>
                                    {' '}
                                    · {sp.pagoMovilDetails.bank} · Ref: #
                                    {sp.pagoMovilDetails.referenceLast6}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          order.pagoMovilDetails && (
                            <div className="mt-3 text-xs font-mono text-zinc-300 bg-zinc-950 rounded-lg px-2.5 py-1.5 border border-white/5 tabular-nums">
                              {order.pagoMovilDetails.bank} ·{' '}
                              {formatCurrency(order.pagoMovilDetails.amount)} · Ref:{' '}
                              <strong className="text-amber-400">
                                #{order.pagoMovilDetails.referenceLast6}
                              </strong>
                            </div>
                          )
                        )}
                      </div>

                      <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-3">
                        <div className="text-xs text-zinc-400 tabular-nums">
                          <div>
                            {formatTime(order.createdAt)} · {order.paymentMethodName}
                          </div>
                          <div className="mt-0.5">
                            <strong className="text-white font-mono">
                              {formatCurrency(order.total)}
                            </strong>{' '}
                            <span className="text-emerald-400 font-mono">
                              ({formatBs(order.total, rate)})
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => setEditingSalaOrder(order)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-amber-300 cursor-pointer"
                            title="Modificar pedido (notifica a Cocina)"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Modificar</span>
                          </button>
                          {order.status === 'listo' && (
                            <button
                              type="button"
                              onClick={() => {
                                updateOrderStatus(order.id, 'servido');
                                showToast(`Pedido ${order.code} marcado como servido.`, 'success');
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors cursor-pointer"
                            >
                              <Utensils className="w-3.5 h-3.5" />
                              <span>Servido</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Mobile Bottom Cart Bar (<=15% height) */}
      {activeTab === 'carta' && (
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-zinc-950/95 backdrop-blur-xl border-t border-white/15 px-4 py-3">
          <button
            type="button"
            onClick={() => setMobileCartOpen(true)}
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-amber-500 text-white font-semibold text-sm shadow-lg"
          >
            <span className="inline-flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" />
              <span>Ver Orden ({cartCount})</span>
            </span>
            <span className="font-mono font-bold tabular-nums">
              {formatCurrency(cartTotal)} · {formatBs(cartTotal, bcvRate)}
            </span>
          </button>
        </div>
      )}

      {/* Mobile Cart Sheet */}
      {mobileCartOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end">
          <div className="w-full max-h-[88vh] rounded-t-2xl bg-zinc-900 border-t border-white/15 p-5 overflow-y-auto">
            <div className="flex justify-end mb-2">
              <button
                type="button"
                onClick={() => setMobileCartOpen(false)}
                className="p-2 rounded-lg bg-zinc-800 text-zinc-300"
                aria-label="Cerrar carrito"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {renderCartContent()}
          </div>
        </div>
      )}

      {/* Share Public Menu Modal */}
      {shareModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-zinc-900 border border-white/15 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-white">
                Compartir Menú Digital
              </h3>
              <button
                type="button"
                onClick={() => setShareModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-400">
              Genera un enlace directo para que el cliente seleccione su pedido y registre su pago.
            </p>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Asignar a una mesa (opcional)
              </label>
              <select
                value={shareTable ?? ''}
                onChange={(e) =>
                  setShareTable(e.target.value ? Number(e.target.value) : undefined)
                }
                className="w-full rounded-xl bg-zinc-950 border border-white/15 px-3 py-2.5 text-sm text-white"
              >
                <option value="">Menú general (cliente elige mesa o delivery)</option>
                {TABLES.map((t) => (
                  <option key={t} value={t}>
                    Mesa {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-xl bg-zinc-950 border border-white/10 p-3 font-mono text-xs text-amber-300 break-all">
              {shareUrl}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleCopyMenuLink}
                className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                {copiedLink ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                <span>{copiedLink ? 'Copiado' : 'Copiar Link'}</span>
              </button>
              <a
                href={shareWaHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Enviar WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Edit Order Modal from Sala */}
      {editingSalaOrder && (
        <EditOrderModal
          order={editingSalaOrder}
          onClose={() => setEditingSalaOrder(null)}
        />
      )}
    </div>
  );
}
