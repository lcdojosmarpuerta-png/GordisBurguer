import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  MapPin,
  Minus,
  Phone,
  Plus,
  ShoppingBag,
  Trash2,
  User,
  Utensils,
  X,
} from 'lucide-react';
import { useRestaurant } from '../context/RestaurantContext';
import { Order, OrderItem, Product, ProductCategory } from '../types/restaurant';
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
  modalityLabel,
} from './SharedUI';

const CATEGORIES: ('Todas' | ProductCategory)[] = [
  'Todas',
  'Hamburguesa',
  'Perro Caliente',
  'Papas Fritas',
];

const TABLES = Array.from({ length: 12 }, (_, i) => i + 1);

export function PublicMenuModule() {
  const {
    products,
    paymentMethods,
    orders,
    bcvRate,
    preselectedTable,
    currentRole,
    createOrder,
    navigateToModule,
    showToast,
  } = useRestaurant();

  const [selectedCategory, setSelectedCategory] = useState<'Todas' | ProductCategory>('Todas');
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  // Customer Checkout Fields
  const [modality, setModality] = useState<'sitio' | 'delivery'>('sitio');
  const [tableNumber, setTableNumber] = useState<number>(preselectedTable ?? 1);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');

  const enabledPayments = useMemo(
    () => paymentMethods.filter((pm) => pm.enabled),
    [paymentMethods]
  );

  const cartTotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart]
  );
  const cartCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );

  // Multi-payment splits state (same rules as Mesera: Pago Móvil bank/amount/ref6, Efectivo $/Bs, + Añadir otro pago)
  const [paymentSplits, setPaymentSplits] = useState<PaymentSplitDraft[]>(() => [
    createInitialPaymentSplit(enabledPayments[0]?.id ?? 'pm-pago-movil', 0),
  ]);

  useEffect(() => {
    setPaymentSplits((prev) => {
      if (prev.length === 1) {
        return [
          {
            ...prev[0],
            methodId:
              enabledPayments.find((pm) => pm.id === prev[0].methodId)?.id ??
              enabledPayments[0]?.id ??
              '',
            amountUsd: cartTotal > 0 ? cartTotal.toFixed(2) : '',
          },
        ];
      }
      return prev;
    });
  }, [cartTotal, enabledPayments]);

  // Capture upload ONLY applies when Zelle is chosen
  const [proofFileName, setProofFileName] = useState<string>('');
  const [proofPreviewUrl, setProofPreviewUrl] = useState<string>('');
  const [confirmedOrderId, setConfirmedOrderId] = useState<string | null>(null);

  const visibleProducts = useMemo(() => {
    return products.filter((p) => {
      if (!p.available) return false;
      return selectedCategory === 'Todas' || p.category === selectedCategory;
    });
  }, [products, selectedCategory]);

  const liveTrackedOrder: Order | undefined = useMemo(
    () => orders.find((o) => o.id === confirmedOrderId),
    [orders, confirmedOrderId]
  );

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const found = prev.find((i) => i.productId === product.id);
      if (found) {
        return prev.map((i) =>
          i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        { productId: product.id, name: product.name, price: product.price, quantity: 1 },
      ];
    });
  };

  const updateQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) =>
          i.productId === productId ? { ...i, quantity: i.quantity + delta } : i
        )
        .filter((i) => i.quantity > 0)
    );
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProofFileName(file.name);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setProofPreviewUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    } else {
      setProofPreviewUrl('');
    }
    showToast('Captura de Zelle adjuntada correctamente.', 'success');
  };

  const handleConfirmPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      showToast('Tu carrito está vacío.', 'error');
      return;
    }
    if (enabledPayments.length === 0) {
      showToast('Selecciona un método de pago disponible.', 'error');
      return;
    }
    if (modality === 'delivery') {
      if (!customerName.trim() || !customerPhone.trim() || !deliveryAddress.trim()) {
        showToast('Completa tu nombre, teléfono y dirección para el delivery.', 'error');
        return;
      }
    }

    const validation = validateAndBuildPaymentSplits(
      paymentSplits,
      enabledPayments,
      cartTotal,
      bcvRate,
      {
        isPublicMenu: true,
        proofFileName,
      }
    );

    if (!validation.ok || !validation.normalizedSplits) {
      showToast(validation.error ?? 'Revisa los datos de pago.', 'error');
      return;
    }

    const order = createOrder({
      source: 'menu_publico',
      modality,
      tableNumber: modality === 'sitio' ? tableNumber : undefined,
      customerName: customerName.trim() || undefined,
      customerPhone: customerPhone.trim() || undefined,
      deliveryAddress: modality === 'delivery' ? deliveryAddress.trim() : undefined,
      items: cart,
      total: cartTotal,
      bcvRateAtOrder: bcvRate,
      paymentMethodId: validation.primaryMethodId ?? enabledPayments[0].id,
      paymentMethodName: validation.primaryMethodName ?? enabledPayments[0].name,
      payments: validation.normalizedSplits,
      pagoMovilDetails: validation.primaryPagoMovil,
      cashCurrency: validation.primaryCashCurrency,
      paymentProofName: proofFileName || undefined,
      paymentProofUrl: proofPreviewUrl || undefined,
    });

    setConfirmedOrderId(order.id);
    setCart([]);
    setCheckoutOpen(false);
    setProofFileName('');
    setProofPreviewUrl('');
    setPaymentSplits([
      createInitialPaymentSplit(enabledPayments[0]?.id ?? 'pm-pago-movil', 0),
    ]);
    showToast(`¡Pedido ${order.code} enviado a Cocina y Gerencia!`, 'success');
  };

  return (
    <div className="min-h-screen bg-[#0B0C0E] text-zinc-100 flex flex-col">
      {/* Storefront Top Bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-4 px-4 sm:px-8 py-3.5 bg-zinc-950/90 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center gap-3 sm:gap-4">
          <BrandLogo size="sm" />
          <div className="hidden md:block">
            <BcvRateBanner compact />
          </div>
          <button
            type="button"
            onClick={() => navigateToModule(currentRole ?? 'login')}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{currentRole ? 'Volver al Panel' : 'Acceso Personal'}</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => setCheckoutOpen(true)}
          className="inline-flex items-center gap-2.5 px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white text-xs sm:text-sm font-bold shadow-lg transition-all cursor-pointer whitespace-nowrap shrink-0"
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Mi Pedido ({cartCount})</span>
          <span className="font-mono tabular-nums">
            · {formatCurrency(cartTotal)} ({formatBs(cartTotal, bcvRate)})
          </span>
        </button>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-8 pb-24">
        {/* Hero Intro */}
        <section className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-white/10">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-xs font-semibold text-amber-400 tracking-wide">
                Menú Digital · Pedido Directo sin Esperas
              </span>
              <div className="md:hidden">
                <BcvRateBanner compact />
              </div>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-white tracking-tight mt-1 text-balance">
              Hamburguesas, Perros Calientes y Papas Recién Hechas
            </h1>
            <p className="text-sm text-zinc-400 mt-2 max-w-2xl">
              Precios expresados en Dólares ($) y Bolívares (Bs.) a la tasa oficial del BCV.
              Arma tu orden, selecciona tu mesa o delivery y registra tu pago al instante.
            </p>
          </div>

          {preselectedTable && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold shrink-0">
              <Utensils className="w-4 h-4" />
              <span>Mesa {preselectedTable} detectada</span>
            </div>
          )}
        </section>

        {/* Live Order Confirmation Banner if customer just placed an order */}
        {liveTrackedOrder && (
          <section className="mb-8 rounded-2xl bg-emerald-950/30 border border-emerald-500/35 p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <h2 className="font-display text-lg font-bold text-white">
                    ¡Orden {liveTrackedOrder.code} recibida!
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-zinc-300">
                  {modalityLabel(liveTrackedOrder.modality, liveTrackedOrder.tableNumber)} · Total{' '}
                  <strong className="font-mono text-white tabular-nums">
                    {formatCurrency(liveTrackedOrder.total)} (
                    {formatBs(
                      liveTrackedOrder.total,
                      liveTrackedOrder.bcvRateAtOrder ?? bcvRate
                    )}
                    )
                  </strong>{' '}
                  · Pago vía {liveTrackedOrder.paymentMethodName}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="px-3.5 py-2 rounded-xl bg-zinc-900/90 border border-white/10">
                  <span className="block text-[11px] text-zinc-400">Estado actual</span>
                  <OrderStatusText status={liveTrackedOrder.status} />
                </div>
                <button
                  type="button"
                  onClick={() => setConfirmedOrderId(null)}
                  className="p-2 text-zinc-400 hover:text-white cursor-pointer"
                  aria-label="Cerrar seguimiento"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-amber-500 text-zinc-950 shadow-md'
                  : 'bg-zinc-900 text-zinc-300 border border-white/10 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Responsive Product Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibleProducts.map((product) => {
            const inCart = cart.find((i) => i.productId === product.id);
            return (
              <article
                key={product.id}
                className="flex flex-col rounded-2xl bg-zinc-900/80 border border-white/10 overflow-hidden hover:-translate-y-0.5 hover:border-amber-500/40 transition-all duration-200"
              >
                <div className="aspect-[4/3] w-full bg-zinc-950 overflow-hidden">
                  <SafeProductImage
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex-1 flex flex-col justify-between p-5 gap-4">
                  <div>
                    <p className="text-xs font-medium text-zinc-400">{product.category}</p>
                    <h3 className="font-display text-lg font-bold text-white mt-1">
                      {product.name}
                    </h3>
                    <p className="text-sm text-zinc-400 mt-1.5 leading-relaxed">
                      {product.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-white/10">
                    <div>
                      <span className="block font-mono text-xl font-bold text-amber-400 tabular-nums">
                        {formatCurrency(product.price)}
                      </span>
                      <span className="block font-mono text-xs text-zinc-400 tabular-nums">
                        {formatBs(product.price, bcvRate)}
                      </span>
                    </div>

                    {inCart ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => updateQty(product.id, -1)}
                          className="w-9 h-9 flex items-center justify-center rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white cursor-pointer"
                          aria-label="Quitar uno"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-6 text-center font-mono text-sm font-bold text-white tabular-nums">
                          {inCart.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => addToCart(product)}
                          className="w-9 h-9 flex items-center justify-center rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 cursor-pointer"
                          aria-label="Agregar uno"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => addToCart(product)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs sm:text-sm font-semibold shadow-md transition-colors cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Agregar</span>
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </main>

      {/* Mobile Sticky Bottom Checkout Bar (compact <=15% height) */}
      {cartCount > 0 && !checkoutOpen && (
        <div className="fixed bottom-0 inset-x-0 z-30 bg-zinc-950/95 backdrop-blur-xl border-t border-white/15 px-4 py-3 sm:hidden">
          <button
            type="button"
            onClick={() => setCheckoutOpen(true)}
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-amber-500 text-white font-bold text-sm shadow-lg"
          >
            <span>Finalizar Pedido ({cartCount})</span>
            <span className="font-mono tabular-nums">
              {formatCurrency(cartTotal)} · {formatBs(cartTotal, bcvRate)}
            </span>
          </button>
        </div>
      )}

      {/* Checkout & Payment Drawer */}
      {checkoutOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-lg bg-zinc-950 border-l border-white/15 h-full flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <div>
                <h2 className="font-display text-xl font-bold text-white">
                  Confirmar Pedido y Pago
                </h2>
                <p className="text-xs text-zinc-400">
                  Tasa Oficial BCV: Bs. {bcvRate.toFixed(2)} / $ · Envío directo a Cocina
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCheckoutOpen(false)}
                className="p-2 rounded-lg bg-zinc-900 text-zinc-400 hover:text-white cursor-pointer"
                aria-label="Cerrar panel de pago"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={handleConfirmPayment}
              className="flex-1 overflow-y-auto p-6 space-y-6"
            >
              {/* Cart Summary */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-white">Resumen de Productos</h3>
                {cart.length === 0 ? (
                  <p className="text-sm text-zinc-400 py-4 text-center border border-dashed border-white/10 rounded-xl">
                    Aún no has agregado productos.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {cart.map((item) => (
                      <div
                        key={item.productId}
                        className="flex items-center justify-between gap-3 rounded-xl bg-zinc-900 border border-white/10 px-3.5 py-2.5"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate">{item.name}</p>
                          <p className="text-xs font-mono text-amber-400 tabular-nums">
                            {formatCurrency(item.price)} ({formatBs(item.price, bcvRate)}) c/u
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => updateQty(item.productId, -1)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-zinc-800 text-zinc-200 cursor-pointer"
                          >
                            {item.quantity === 1 ? (
                              <Trash2 className="w-3.5 h-3.5 text-red-400" />
                            ) : (
                              <Minus className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <span className="font-mono text-xs font-bold w-5 text-center tabular-nums">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQty(item.productId, 1)}
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

              {/* Modality Selection */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-white">Modalidad de Entrega</h3>
                <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-zinc-900 border border-white/10">
                  <button
                    type="button"
                    onClick={() => setModality('sitio')}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      modality === 'sitio'
                        ? 'bg-amber-500 text-zinc-950'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Comer en el sitio (Mesa)
                  </button>
                  <button
                    type="button"
                    onClick={() => setModality('delivery')}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      modality === 'delivery'
                        ? 'bg-amber-500 text-zinc-950'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Envío a domicilio (Delivery)
                  </button>
                </div>

                {modality === 'sitio' ? (
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-zinc-400">
                      Selecciona tu Mesa
                    </label>
                    <div className="grid grid-cols-6 gap-1.5">
                      {TABLES.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setTableNumber(t)}
                          className={`py-2 rounded-lg font-mono text-xs font-semibold tabular-nums transition-colors cursor-pointer ${
                            tableNumber === t
                              ? 'bg-red-600 text-white'
                              : 'bg-zinc-900 text-zinc-300 border border-white/10 hover:border-amber-500/40'
                          }`}
                        >
                          M{t}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="relative">
                      <User className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Tu nombre completo"
                        className="w-full rounded-xl bg-zinc-900 border border-white/15 pl-9 pr-3 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        required
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="Teléfono / WhatsApp"
                        className="w-full rounded-xl bg-zinc-900 border border-white/15 pl-9 pr-3 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                      <textarea
                        rows={2}
                        required
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        placeholder="Dirección exacta de entrega"
                        className="w-full rounded-xl bg-zinc-900 border border-white/15 pl-9 pr-3 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Same Payment Measures as Mesera + Capture upload ONLY for Zelle */}
              <div className="space-y-3">
                <PaymentSplitForm
                  splits={paymentSplits}
                  onChangeSplits={setPaymentSplits}
                  enabledMethods={enabledPayments}
                  orderTotalUsd={cartTotal}
                  bcvRate={bcvRate}
                  showZelleProofUpload={true}
                  proofFileName={proofFileName}
                  proofPreviewUrl={proofPreviewUrl}
                  onFileUpload={handleFileUpload}
                />
              </div>

              {/* Total & Confirm Submit */}
              <div className="pt-4 border-t border-white/10 space-y-4">
                <div className="flex items-end justify-between">
                  <div>
                    <span className="block text-sm text-zinc-400">Monto Total a Pagar</span>
                    <span className="font-mono text-xs text-emerald-400 tabular-nums">
                      {formatBs(cartTotal, bcvRate)}
                    </span>
                  </div>
                  <span className="font-mono text-2xl font-bold text-white tabular-nums">
                    {formatCurrency(cartTotal)}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={cart.length === 0}
                  className="w-full py-3.5 px-5 rounded-xl bg-gradient-to-r from-red-600 to-amber-500 hover:from-red-500 hover:to-amber-400 disabled:opacity-40 text-white font-bold text-sm shadow-lg hover:shadow-xl transition-all cursor-pointer"
                >
                  Confirmar Pago y Enviar Pedido
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
