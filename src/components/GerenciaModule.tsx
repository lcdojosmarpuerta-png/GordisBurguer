import React, { useEffect, useMemo, useState } from 'react';
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
  Download,
  Edit3,
  ExternalLink,
  Eye,
  FileCheck2,
  FileText,
  KeyRound,
  LogOut,
  MessageCircle,
  Phone,
  Plus,
  QrCode,
  Receipt,
  Share2,
  Trash2,
  Truck,
  UserPlus,
  UtensilsCrossed,
  XCircle,
} from 'lucide-react';
import QRCode from 'qrcode';
import { PRESET_PRODUCT_IMAGES } from '../data/initialData';
import { useRestaurant } from '../context/RestaurantContext';
import {
  CashClosureRecord,
  Order,
  Product,
  ProductCategory,
} from '../types/restaurant';
import {
  AddDriverModal,
  ClearAllOrdersConfirmModal,
  CreateGerenciaOrderModal,
  DetailedClosurePdfModal,
  DispatchDeliveryModal,
  EditOrderModal,
  OrderCashierDetailModal,
  PasswordsModal,
} from './GerenciaModals';
import {
  BcvRateBanner,
  BrandLogo,
  OrderStatusText,
  SafeProductImage,
  formatBs,
  formatBsAmount,
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
    bcvRate,
    addProduct,
    updateProduct,
    deleteProduct,
    togglePaymentMethod,
    updatePaymentMethod,
    addPaymentMethod,
    deleteDriver,
    updateOrderStatus,
    cancelOrder,
    confirmOrderForClosure,
    confirmAllOpenOrdersForClosure,
    performCashClosure,
    clearAllOrdersExceptClosures,
    getPublicMenuUrl,
    navigateToModule,
    logout,
    showToast,
  } = useRestaurant();

  const [activeTab, setActiveTab] = useState<GerenciaTab>('caja');
  const [passwordsModalOpen, setPasswordsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [inspectingCashierOrder, setInspectingCashierOrder] = useState<Order | null>(
    null
  );
  const [addDriverModalOpen, setAddDriverModalOpen] = useState(false);
  const [dispatchingOrder, setDispatchingOrder] = useState<Order | null>(null);
  const [createGerenciaOrderOpen, setCreateGerenciaOrderOpen] = useState(false);
  const [clearAllConfirmOpen, setClearAllConfirmOpen] = useState(false);
  const [pdfReportTarget, setPdfReportTarget] = useState<{
    orders: Order[];
    closure?: CashClosureRecord | null;
  } | null>(null);

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
  const [newPmRequiresProof, setNewPmRequiresProof] = useState(false);
  const [editingPmId, setEditingPmId] = useState<string | null>(null);
  const [editingPmDetails, setEditingPmDetails] = useState('');

  // WhatsApp & Public Link + Downloadable QR Code State
  const [waPhone, setWaPhone] = useState('');
  const [waTable, setWaTable] = useState<number | undefined>(undefined);
  const [waMessage, setWaMessage] = useState(
    '¡Hola! Gracias por preferir a Gordis Burguer. Ingresa a nuestro menú digital para armar tu pedido y registrar tu pago:'
  );
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  const generatedPublicUrl = getPublicMenuUrl(waTable);

  // Generate downloadable QR code whenever generatedPublicUrl changes
  useEffect(() => {
    let active = true;
    QRCode.toDataURL(generatedPublicUrl, {
      width: 512,
      margin: 2,
      color: {
        dark: '#0B0C0E',
        light: '#FFFFFF',
      },
    })
      .then((dataUrl) => {
        if (active) setQrCodeDataUrl(dataUrl);
      })
      .catch(() => {
        if (active) setQrCodeDataUrl('');
      });
    return () => {
      active = false;
    };
  }, [generatedPublicUrl]);

  // Live metrics for Caja Principal
  const openShiftOrders = useMemo(
    () => orders.filter((o) => o.status !== 'cancelado' && !o.closedInShiftId),
    [orders]
  );

  const confirmedShiftOrders = useMemo(
    () => openShiftOrders.filter((o) => o.confirmedForClosure),
    [openShiftOrders]
  );

  const unconfirmedShiftOrders = useMemo(
    () => openShiftOrders.filter((o) => !o.confirmedForClosure),
    [openShiftOrders]
  );

  const openShiftTotal = useMemo(
    () => openShiftOrders.reduce((sum, o) => sum + o.total, 0),
    [openShiftOrders]
  );

  const confirmedShiftTotal = useMemo(
    () => confirmedShiftOrders.reduce((sum, o) => sum + o.total, 0),
    [confirmedShiftOrders]
  );

  // Detailed breakdown of collected money (Dinero Recaudado) across confirmed orders
  const collectedBreakdown = useMemo(() => {
    const map: Record<string, { count: number; totalUsd: number; totalBs: number }> = {};
    let efectivoUsd = 0;
    let efectivoBs = 0;
    let pagoMovilUsd = 0;
    let pagoMovilBs = 0;
    let zelleUsd = 0;
    let tarjetaUsd = 0;

    for (const ord of confirmedShiftOrders) {
      const rate = ord.bcvRateAtOrder ?? bcvRate;
      if (ord.payments && ord.payments.length > 0) {
        for (const sp of ord.payments) {
          const label =
            sp.methodId === 'pm-efectivo'
              ? `Efectivo (${sp.cashCurrency === 'VES' ? 'Bs' : '$'})`
              : sp.methodName;
          if (!map[label]) {
            map[label] = { count: 0, totalUsd: 0, totalBs: 0 };
          }
          map[label].count += 1;
          map[label].totalUsd += sp.amountUsd;
          map[label].totalBs += sp.amountBs || sp.amountUsd * rate;

          const lower = sp.methodName.toLowerCase();
          if (sp.methodId === 'pm-efectivo' || lower.includes('efectivo')) {
            if (sp.cashCurrency === 'VES') {
              efectivoBs += sp.amountBs || sp.amountUsd * rate;
            } else {
              efectivoUsd += sp.amountUsd;
            }
          } else if (
            sp.methodId === 'pm-pago-movil' ||
            lower.includes('pago móvil') ||
            lower.includes('pago movil')
          ) {
            pagoMovilUsd += sp.amountUsd;
            pagoMovilBs += sp.amountBs || sp.amountUsd * rate;
          } else if (sp.methodId === 'pm-zelle' || lower.includes('zelle')) {
            zelleUsd += sp.amountUsd;
          } else if (sp.methodId === 'pm-tarjeta' || lower.includes('tarjeta')) {
            tarjetaUsd += sp.amountUsd;
          }
        }
      } else {
        const label = ord.paymentMethodName;
        if (!map[label]) {
          map[label] = { count: 0, totalUsd: 0, totalBs: 0 };
        }
        map[label].count += 1;
        map[label].totalUsd += ord.total;
        map[label].totalBs += ord.total * rate;

        const lower = ord.paymentMethodName.toLowerCase();
        if (ord.paymentMethodId === 'pm-efectivo' || lower.includes('efectivo')) {
          if (ord.cashCurrency === 'VES') {
            efectivoBs += ord.total * rate;
          } else {
            efectivoUsd += ord.total;
          }
        } else if (
          ord.paymentMethodId === 'pm-pago-movil' ||
          lower.includes('pago móvil') ||
          lower.includes('pago movil')
        ) {
          pagoMovilUsd += ord.total;
          pagoMovilBs += ord.total * rate;
        } else if (ord.paymentMethodId === 'pm-zelle' || lower.includes('zelle')) {
          zelleUsd += ord.total;
        } else if (ord.paymentMethodId === 'pm-tarjeta' || lower.includes('tarjeta')) {
          tarjetaUsd += ord.total;
        }
      }
    }

    return {
      byMethod: map,
      efectivoUsd,
      efectivoBs,
      pagoMovilUsd,
      pagoMovilBs,
      zelleUsd,
      tarjetaUsd,
    };
  }, [confirmedShiftOrders, bcvRate]);

  // Export Cash Closure Summary (Current Shift or Past Closure Record)
  const handleExportCashClosureSummary = (closureRecord?: CashClosureRecord) => {
    const nowStr = new Date().toLocaleString('es-VE');
    let lines: string[] = [];

    if (closureRecord) {
      const rate = closureRecord.bcvRate || bcvRate;
      const totalBs = closureRecord.totalSalesBs || closureRecord.totalSales * rate;
      lines = [
        '==============================================================',
        '         GORDIS BURGUER - RESUMEN DE CIERRE DE CAJA           ',
        '==============================================================',
        `ID de Cierre:       ${closureRecord.id}`,
        `Fecha de Cierre:    ${new Date(closureRecord.closedAt).toLocaleString('es-VE')}`,
        `Responsable:        ${closureRecord.closedBy}`,
        `Tasa Oficial BCV:   Bs. ${rate.toFixed(2)} / $1.00`,
        '--------------------------------------------------------------',
        '1. TOTALIDAD VENDIDA',
        `   Pedidos Cerrados:        ${closureRecord.orderCount}`,
        `   Total Vendido ($):       ${formatCurrency(closureRecord.totalSales)}`,
        `   Total Vendido (Bs BCV):  ${formatBsAmount(totalBs)}`,
        '--------------------------------------------------------------',
        '2. DINERO RECAUDADO POR MÉTODO DE PAGO',
        ...Object.entries(closureRecord.byMethod).map(
          ([method, amtUsd]) =>
            `   • ${method.padEnd(26, ' ')}: ${formatCurrency(amtUsd)} (${formatBs(amtUsd, rate)})`
        ),
      ];

      if (closureRecord.byCurrencySummary) {
        const s = closureRecord.byCurrencySummary;
        lines.push(
          '--------------------------------------------------------------',
          '3. ARQUEO DE DINERO RECAUDADO POR MONEDA',
          `   • Efectivo en Dólares ($):   ${formatCurrency(s.efectivoUsd)}`,
          `   • Efectivo en Bolívares (Bs): ${formatBsAmount(s.efectivoBs)}`,
          `   • Pago Móvil Recaudado:      ${formatCurrency(s.pagoMovilUsd)} (${formatBsAmount(s.pagoMovilBs)})`,
          `   • Zelle Recaudado ($):       ${formatCurrency(s.zelleUsd)}`,
          `   • Punto de Venta / Tarjeta:  ${formatCurrency(s.tarjetaUsd)} (${formatBs(s.tarjetaUsd, rate)})`
        );
      }

      lines.push('==============================================================');
    } else {
      // Export current shift summary
      const targetOrders =
        confirmedShiftOrders.length > 0 ? confirmedShiftOrders : openShiftOrders;
      if (targetOrders.length === 0) {
        showToast('No hay pedidos en el turno actual para exportar.', 'error');
        return;
      }

      const totalUsd = targetOrders.reduce((acc, o) => acc + o.total, 0);
      const totalBs = totalUsd * bcvRate;

      lines = [
        '==============================================================',
        '     GORDIS BURGUER - REPORTE DE CIERRE DE CAJA (TURNO)       ',
        '==============================================================',
        `Fecha de Emisión:   ${nowStr}`,
        `Tasa Oficial BCV:   Bs. ${bcvRate.toFixed(2)} / $1.00`,
        `Estado de Órdenes:  ${
          confirmedShiftOrders.length > 0
            ? `${confirmedShiftOrders.length} pedidos confirmados en Caja`
            : `${openShiftOrders.length} pedidos abiertos del turno`
        }`,
        '--------------------------------------------------------------',
        '1. TOTALIDAD VENDIDA',
        `   Cantidad de Pedidos:     ${targetOrders.length}`,
        `   Totalidad Vendida ($):   ${formatCurrency(totalUsd)}`,
        `   Totalidad Vendida (Bs):  ${formatBsAmount(totalBs)}`,
        '--------------------------------------------------------------',
        '2. DINERO RECAUDADO POR MÉTODO Y MONEDA',
        `   • Efectivo en Dólares ($):    ${formatCurrency(collectedBreakdown.efectivoUsd)}`,
        `   • Efectivo en Bolívares (Bs): ${formatBsAmount(collectedBreakdown.efectivoBs)}`,
        `   • Pago Móvil:                 ${formatCurrency(collectedBreakdown.pagoMovilUsd)} (${formatBsAmount(collectedBreakdown.pagoMovilBs)})`,
        `   • Zelle ($):                  ${formatCurrency(collectedBreakdown.zelleUsd)}`,
        `   • Tarjeta / Punto de Venta:   ${formatCurrency(collectedBreakdown.tarjetaUsd)} (${formatBs(collectedBreakdown.tarjetaUsd, bcvRate)})`,
        '--------------------------------------------------------------',
        '3. DETALLE DE PEDIDOS INCLUIDOS',
        ...targetOrders.map((ord) => {
          const r = ord.bcvRateAtOrder ?? bcvRate;
          const itemsStr = ord.items.map((i) => `${i.quantity}x ${i.name}`).join(', ');
          const pmInfo = ord.pagoMovilDetails
            ? ` [Banco: ${ord.pagoMovilDetails.bank}, Ref: #${ord.pagoMovilDetails.referenceLast6}]`
            : '';
          return `   • ${ord.code} (${formatTime(ord.createdAt)}) | ${modalityLabel(
            ord.modality,
            ord.tableNumber
          )} | ${ord.paymentMethodName}${pmInfo} | ${formatCurrency(ord.total)} (${formatBs(
            ord.total,
            r
          )}) | Platos: ${itemsStr}`;
        }),
        '==============================================================',
      ];
    }

    const content = lines.join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = closureRecord
      ? `resumen-${closureRecord.id}-${stamp}.txt`
      : `resumen-cierre-caja-gordis-${stamp}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast('Resumen de Cierre de Caja exportado correctamente.', 'success');
  };

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

  const renderKanbanCard = (order: Order) => {
    const rate = order.bcvRateAtOrder ?? bcvRate;
    return (
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
              {formatTime(order.createdAt)} ·{' '}
              {order.source === 'mesera'
                ? `Mesera${order.waiterName ? `: ${order.waiterName}` : ''}`
                : 'Menú Público'}
              {order.customerName ? ` · ${order.customerName}` : ''}
            </p>
          </div>
          <OrderStatusText status={order.status} />
        </div>

        {order.isModifiedAfterConfirm && (
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-300 bg-amber-500/10 border border-amber-500/25 rounded-lg px-2.5 py-1">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>
              Modificado tras confirmar ({formatTime(order.modifiedAt ?? order.updatedAt)})
            </span>
          </div>
        )}

        <ul className="space-y-1 text-xs text-zinc-200 border-t border-white/5 pt-2.5">
          {order.items.map((it, idx) => (
            <li key={idx} className="flex justify-between gap-2">
              <span className="truncate">
                <strong className="font-mono text-amber-400">{it.quantity}x</strong>{' '}
                {it.name}
              </span>
              <span className="font-mono text-zinc-400 tabular-nums shrink-0">
                {formatCurrency(it.price * it.quantity)}
              </span>
            </li>
          ))}
        </ul>

        {order.pagoMovilDetails && (
          <div className="text-[11px] text-zinc-300 bg-zinc-900/90 rounded-lg px-2.5 py-1.5 border border-white/5 font-mono tabular-nums">
            {order.pagoMovilDetails.bank} ·{' '}
            <strong className="text-amber-300">
              {formatBsAmount(
                order.pagoMovilDetails.amountBs ||
                  order.pagoMovilDetails.amount * rate
              )}
            </strong>{' '}
            ➔{' '}
            <strong className="text-emerald-400">
              {formatCurrency(order.pagoMovilDetails.amount)}
            </strong>{' '}
            · Ref:{' '}
            <strong className="text-amber-400">
              #{order.pagoMovilDetails.referenceLast6}
            </strong>
          </div>
        )}

        <div className="flex items-center justify-between pt-2.5 border-t border-white/10 text-xs">
          <div className="text-zinc-400">
            <span>{order.paymentMethodName} · </span>
            <strong className="font-mono text-white tabular-nums">
              {formatCurrency(order.total)}
            </strong>
            <span className="block font-mono text-[11px] text-emerald-400 tabular-nums">
              {formatBs(order.total, rate)}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setInspectingCashierOrder(order)}
              className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-300 hover:text-emerald-400 transition-colors cursor-pointer"
              title="Ver descripción y pago confirmado"
              aria-label={`Ver detalle ${order.code}`}
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
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
  };

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
            <div className="hidden md:block">
              <BcvRateBanner editable />
            </div>

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
          {/* Mobile BCV Banner */}
          <div className="md:hidden">
            <BcvRateBanner editable />
          </div>

          {/* 1. CAJA PRINCIPAL (CONFIRMACIÓN DE PEDIDOS, MODAL DE DETALLE Y EXPORTACIÓN DE CIERRE) */}
          {activeTab === 'caja' && (
            <section className="space-y-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <h1 className="font-display text-2xl font-bold text-white">
                    Caja Principal & Cierre de Día
                  </h1>
                  <p className="text-sm text-zinc-400 mt-1">
                    Revisa la descripción y el pago confirmado de cada pedido, confírmalos para el cierre de caja y exporta el resumen financiero ($ / Bs BCV)
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setCreateGerenciaOrderOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/15 text-xs font-bold text-white cursor-pointer whitespace-nowrap"
                  >
                    <Plus className="w-4 h-4 text-amber-400" />
                    <span>+ Nueva Orden / Cobro</span>
                  </button>

                  {unconfirmedShiftOrders.length > 0 && (
                    <button
                      type="button"
                      onClick={confirmAllOpenOrdersForClosure}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-emerald-500/35 text-xs font-bold text-emerald-300 cursor-pointer whitespace-nowrap"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>
                        Confirmar Todos ({unconfirmedShiftOrders.length})
                      </span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      const targetOrders =
                        confirmedShiftOrders.length > 0
                          ? confirmedShiftOrders
                          : openShiftOrders;
                      if (targetOrders.length === 0) {
                        showToast(
                          'No hay pedidos en el turno actual para exportar a PDF.',
                          'error'
                        );
                        return;
                      }
                      setPdfReportTarget({
                        orders: targetOrders,
                        closure: null,
                      });
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/45 text-xs font-bold text-amber-300 cursor-pointer whitespace-nowrap"
                  >
                    <FileText className="w-4 h-4 text-amber-400" />
                    <span>Exportar Reporte de Cierre en PDF Detallado</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setClearAllConfirmOpen(true)}
                    disabled={orders.length === 0}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-950/40 hover:bg-red-900/50 disabled:opacity-40 disabled:cursor-not-allowed border border-red-500/40 text-xs font-bold text-red-300 cursor-pointer whitespace-nowrap"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                    <span>Limpiar Todo</span>
                  </button>

                  <button
                    type="button"
                    onClick={performCashClosure}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white text-xs sm:text-sm font-bold shadow-lg cursor-pointer whitespace-nowrap"
                  >
                    <Receipt className="w-4 h-4" />
                    <span>
                      Realizar Cierre de Caja ({confirmedShiftOrders.length})
                    </span>
                  </button>
                </div>
              </div>

              {/* Financial Summary Strip ($ and Bs BCV) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-2xl bg-zinc-900/90 border border-emerald-500/40 p-5">
                  <p className="text-xs text-zinc-400">
                    Totalidad Vendida (Confirmados para Cierre)
                  </p>
                  <p className="font-mono text-2xl sm:text-3xl font-bold text-emerald-400 mt-1 tabular-nums">
                    {formatCurrency(confirmedShiftTotal)}
                  </p>
                  <p className="font-mono text-xs text-zinc-200 mt-0.5 tabular-nums">
                    {formatBs(confirmedShiftTotal, bcvRate)}
                  </p>
                  <p className="text-[11px] text-zinc-400 mt-1.5 tabular-nums">
                    {confirmedShiftOrders.length} de {openShiftOrders.length} pedidos confirmados
                  </p>
                </div>

                <div className="rounded-2xl bg-zinc-900/80 border border-amber-500/35 p-5">
                  <p className="text-xs text-zinc-400">
                    Total Facturado del Turno (Abiertos)
                  </p>
                  <p className="font-mono text-2xl sm:text-3xl font-bold text-amber-400 mt-1 tabular-nums">
                    {formatCurrency(openShiftTotal)}
                  </p>
                  <p className="font-mono text-xs text-zinc-200 mt-0.5 tabular-nums">
                    {formatBs(openShiftTotal, bcvRate)}
                  </p>
                  <p className="text-[11px] text-zinc-400 mt-1.5 tabular-nums">
                    {unconfirmedShiftOrders.length} pendientes por confirmar en caja
                  </p>
                </div>

                <div className="rounded-2xl bg-zinc-900/70 border border-white/10 p-5">
                  <p className="text-xs text-zinc-400">
                    Dinero Recaudado en Efectivo ($ / Bs ➔ $)
                  </p>
                  <div className="mt-1.5 space-y-1 font-mono tabular-nums">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400 font-sans">Efectivo $:</span>
                      <strong className="text-white text-sm">
                        {formatCurrency(collectedBreakdown.efectivoUsd)}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400 font-sans">Efectivo Bs:</span>
                      <strong className="text-amber-400 text-xs">
                        {formatBsAmount(collectedBreakdown.efectivoBs)} ➔{' '}
                        <span className="text-emerald-400">
                          {formatCurrency(collectedBreakdown.efectivoBs / bcvRate)}
                        </span>
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl bg-zinc-900/70 border border-white/10 p-5">
                  <p className="text-xs text-zinc-400">
                    Dinero Recaudado Digital (Pago Móvil Bs ➔ $ / Zelle / POS)
                  </p>
                  <div className="mt-1.5 space-y-1 font-mono text-xs tabular-nums">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400 font-sans">Pago Móvil:</span>
                      <strong className="text-amber-300">
                        {formatBsAmount(collectedBreakdown.pagoMovilBs)} ➔{' '}
                        <span className="text-emerald-400">
                          {formatCurrency(collectedBreakdown.pagoMovilUsd)}
                        </span>
                      </strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400 font-sans">Zelle:</span>
                      <strong className="text-white">
                        {formatCurrency(collectedBreakdown.zelleUsd)}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400 font-sans">Tarjeta / POS:</span>
                      <strong className="text-white">
                        {formatCurrency(collectedBreakdown.tarjetaUsd)}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Live Billed Orders Table with Action Buttons (Ver Pedido y Pago + Confirmar Pedido) */}
              <div className="rounded-2xl bg-zinc-900/70 border border-white/10 overflow-hidden">
                <div className="px-5 py-4 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h2 className="font-display text-base font-bold text-white">
                      Pedidos del Turno Actual
                    </h2>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Inspecciona la descripción completa y el pago confirmado de cada orden, y confírmala para sumarla al cierre de caja
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
                        <th className="py-3 px-4 font-semibold">Modalidad</th>
                        <th className="py-3 px-4 font-semibold">Método de Pago</th>
                        <th className="py-3 px-4 font-semibold">
                          Detalle Pago Móvil / Efectivo ($/Bs)
                        </th>
                        <th className="py-3 px-4 font-semibold text-right">
                          Monto ($ / Bs BCV)
                        </th>
                        <th className="py-3 px-4 font-semibold text-center">
                          Acciones de Caja
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {openShiftOrders.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-zinc-500">
                            No hay pedidos abiertos pendientes por cerrar.
                          </td>
                        </tr>
                      ) : (
                        openShiftOrders.map((ord) => {
                          const rate = ord.bcvRateAtOrder ?? bcvRate;
                          return (
                            <tr
                              key={ord.id}
                              className={`hover:bg-white/[0.02] ${
                                ord.confirmedForClosure ? 'bg-emerald-950/10' : ''
                              }`}
                            >
                              <td className="py-3 px-4">
                                <span className="font-mono font-bold text-white tabular-nums">
                                  {ord.code}
                                </span>
                                <span className="block font-mono text-[11px] text-zinc-400 tabular-nums">
                                  {formatTime(ord.createdAt)}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-zinc-200">
                                <div>{modalityLabel(ord.modality, ord.tableNumber)}</div>
                                {ord.waiterName && (
                                  <div className="text-[11px] text-emerald-300 font-medium">
                                    Mesera/o: {ord.waiterName}
                                  </div>
                                )}
                                <div className="mt-0.5">
                                  <OrderStatusText status={ord.status} />
                                </div>
                              </td>
                              <td className="py-3 px-4 text-zinc-200 font-medium">
                                {ord.paymentMethodName}
                                {ord.payments && ord.payments.length > 1 && (
                                  <span className="block text-[11px] text-amber-400">
                                    {ord.payments.length} pagos combinados
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4">
                                <div className="space-y-1">
                                  {ord.pagoMovilDetails && (
                                    <div className="inline-flex flex-wrap items-center gap-1.5 text-xs font-mono tabular-nums text-zinc-200 bg-zinc-950/90 border border-amber-500/25 rounded-lg px-2.5 py-1">
                                      <span>{ord.pagoMovilDetails.bank}</span>
                                      <span className="text-zinc-600">·</span>
                                      <strong className="text-amber-300">
                                        {formatBsAmount(
                                          ord.pagoMovilDetails.amountBs ||
                                            ord.pagoMovilDetails.amount * rate
                                        )}
                                      </strong>
                                      <span className="text-zinc-500">➔</span>
                                      <strong className="text-emerald-400">
                                        {formatCurrency(ord.pagoMovilDetails.amount)}
                                      </strong>
                                      <span className="text-zinc-600">·</span>
                                      <strong className="text-amber-400">
                                        Ref #{ord.pagoMovilDetails.referenceLast6}
                                      </strong>
                                    </div>
                                  )}
                                  {ord.cashCurrency && (
                                    <div className="text-xs text-emerald-300 font-medium font-mono tabular-nums">
                                      {ord.cashCurrency === 'VES' ? (
                                        <span>
                                          Efectivo (Bs ➔ $):{' '}
                                          <strong className="text-amber-300">
                                            {formatBs(ord.total, rate)}
                                          </strong>{' '}
                                          ➔{' '}
                                          <strong className="text-emerald-400">
                                            {formatCurrency(ord.total)}
                                          </strong>
                                        </span>
                                      ) : (
                                        <span className="font-sans">
                                          Efectivo pagado en: <strong>Dólares ($)</strong>
                                        </span>
                                      )}
                                    </div>
                                  )}
                                  {!ord.pagoMovilDetails && !ord.cashCurrency && (
                                    <span className="text-xs text-zinc-500">
                                      {ord.paymentProofName
                                        ? `Capture Zelle: ${ord.paymentProofName}`
                                        : 'Pago directo'}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-4 text-right font-mono tabular-nums">
                                <span className="block font-bold text-amber-400">
                                  {formatCurrency(ord.total)}
                                </span>
                                <span className="block text-xs text-zinc-300">
                                  {formatBs(ord.total, rate)}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setInspectingCashierOrder(ord)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-white/10 text-xs font-semibold text-zinc-100 cursor-pointer whitespace-nowrap"
                                    title="Abrir ventana con descripción del pedido y método de pago confirmado"
                                  >
                                    <Eye className="w-3.5 h-3.5 text-amber-400" />
                                    <span>Ver Pedido y Pago</span>
                                  </button>

                                  {ord.confirmedForClosure ? (
                                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/35 text-xs font-bold text-emerald-300 whitespace-nowrap">
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                      <span>Confirmado</span>
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => confirmOrderForClosure(ord.id)}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer whitespace-nowrap"
                                      title="Confirmar pedido para sumarlo al cierre de caja"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                      <span>Confirmar Pedido</span>
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Historical Closures with Export Button */}
              {closures.length > 0 && (
                <div className="rounded-2xl bg-zinc-900/70 border border-white/10 p-5 space-y-3">
                  <h2 className="font-display text-base font-bold text-white">
                    Historial de Cierres de Caja Realizados
                  </h2>
                  <div className="space-y-3">
                    {closures.map((c) => {
                      const rate = c.bcvRate || bcvRate;
                      const totalBs = c.totalSalesBs || c.totalSales * rate;
                      return (
                        <div
                          key={c.id}
                          className="rounded-xl bg-zinc-950 border border-white/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div>
                            <p className="text-sm font-semibold text-white">
                              Cierre del {new Date(c.closedAt).toLocaleString('es-VE')}
                            </p>
                            <p className="text-xs text-zinc-400 mt-1">
                              {c.orderCount} pedidos confirmados ·{' '}
                              {Object.entries(c.byMethod)
                                .map(([m, amt]) => `${m}: ${formatCurrency(amt)}`)
                                .join(' · ')}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                            <div className="text-right font-mono tabular-nums mr-1">
                              <span className="block text-lg font-bold text-emerald-400">
                                {formatCurrency(c.totalSales)}
                              </span>
                              <span className="block text-xs text-zinc-300">
                                {formatBsAmount(totalBs)}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const shiftOrders =
                                  c.ordersSnapshot && c.ordersSnapshot.length > 0
                                    ? c.ordersSnapshot
                                    : orders.filter((o) => o.closedInShiftId === c.id);
                                setPdfReportTarget({
                                  orders: shiftOrders,
                                  closure: c,
                                });
                              }}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-xs font-bold text-amber-300 cursor-pointer"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>Exportar Reporte en PDF Detallado</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
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
                <div className="flex flex-wrap items-center gap-3">
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
                        {formatCurrency(openShiftTotal)} ({formatBs(openShiftTotal, bcvRate)})
                      </strong>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCreateGerenciaOrderOpen(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white text-xs font-bold shadow-md cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Nueva Orden / Cobro</span>
                  </button>
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
                            {modalityLabel(ord.modality, ord.tableNumber)} · {ord.items.length}{' '}
                            ítems
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
                    deliveryPending.map((ord) => {
                      const rate = ord.bcvRateAtOrder ?? bcvRate;
                      return (
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
                                Tel: {ord.customerPhone ?? 'N/D'} ·{' '}
                                {ord.deliveryAddress ?? 'Sin dirección'}
                              </p>
                            </div>
                            <OrderStatusText status={ord.status} />
                          </div>

                          <div className="text-xs text-zinc-300 space-y-1">
                            {ord.items.map((it, idx) => (
                              <p key={idx}>
                                <strong className="font-mono text-amber-400">
                                  {it.quantity}x
                                </strong>{' '}
                                {it.name}
                              </p>
                            ))}
                          </div>

                          {ord.pagoMovilDetails && (
                            <div className="text-xs font-mono text-zinc-300 bg-zinc-900 rounded-lg px-2.5 py-1.5 border border-white/5 tabular-nums">
                              Pago Móvil: {ord.pagoMovilDetails.bank} ·{' '}
                              <strong className="text-amber-300">
                                {formatBsAmount(
                                  ord.pagoMovilDetails.amountBs ||
                                    ord.pagoMovilDetails.amount * rate
                                )}
                              </strong>{' '}
                              ➔{' '}
                              <strong className="text-emerald-400">
                                {formatCurrency(ord.pagoMovilDetails.amount)}
                              </strong>{' '}
                              · Ref:{' '}
                              <strong className="text-amber-400">
                                #{ord.pagoMovilDetails.referenceLast6}
                              </strong>
                            </div>
                          )}

                          {ord.paymentProofName && (
                            <div className="inline-flex items-center gap-1.5 text-xs text-emerald-300">
                              <FileCheck2 className="w-3.5 h-3.5" />
                              <span>Comprobante Zelle: {ord.paymentProofName}</span>
                            </div>
                          )}

                          <div className="flex items-center justify-between pt-2 border-t border-white/10">
                            <div className="font-mono text-xs tabular-nums">
                              <strong className="text-sm text-white">
                                {formatCurrency(ord.total)}
                              </strong>{' '}
                              <span className="text-emerald-400">
                                ({formatBs(ord.total, rate)})
                              </span>{' '}
                              · <span className="font-sans text-zinc-300">{ord.paymentMethodName}</span>
                            </div>
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
                      );
                    })
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
                    deliveryDispatched.map((ord) => {
                      const rate = ord.bcvRateAtOrder ?? bcvRate;
                      return (
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
                              {formatCurrency(ord.total)} ({formatBs(ord.total, rate)}) ·{' '}
                              {formatTime(ord.updatedAt)}
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
                      );
                    })
                  )}
                </div>
              </div>
            </section>
          )}

          {/* 5. CARGA DE MENÚ Y PRECIOS (CRUD CON RECONVERSIÓN BCV) */}
          {activeTab === 'menu' && (
            <section className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
              {/* CRUD Form */}
              <div className="xl:col-span-4 rounded-2xl bg-zinc-900/80 border border-white/10 p-5">
                <h2 className="font-display text-lg font-bold text-white mb-1">
                  {editingProductId ? 'Editar Producto' : 'Registrar Nuevo Producto'}
                </h2>
                <p className="text-xs text-zinc-400 mb-4">
                  Ingresa el precio en $ y se mostrará automáticamente en Bs. a tasa BCV
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
                      {parseFloat(prodPrice) > 0 && (
                        <span className="block font-mono text-[11px] text-emerald-400 mt-1 tabular-nums">
                          ≈ {formatBs(parseFloat(prodPrice), bcvRate)}
                        </span>
                      )}
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
                      <span>
                        {editingProductId ? 'Actualizar Producto' : 'Agregar al Menú'}
                      </span>
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
                            <div className="text-right font-mono tabular-nums shrink-0">
                              <span className="block text-sm font-bold text-amber-400">
                                {formatCurrency(prod.price)}
                              </span>
                              <span className="block text-[11px] text-emerald-400">
                                {formatBs(prod.price, bcvRate)}
                              </span>
                            </div>
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

          {/* 6. MÓDULO CLIENTES & WHATSAPP (CON CÓDIGO QR DESCARGABLE) */}
          {activeTab === 'whatsapp' && (
            <section className="space-y-6">
              <div>
                <h1 className="font-display text-2xl font-bold text-white">
                  Clientes, Enlace por WhatsApp & Código QR del Menú Público
                </h1>
                <p className="text-sm text-zinc-400 mt-1">
                  Genera y descarga el código QR oficial o envía el enlace directo por WhatsApp para que el cliente ordene desde su móvil
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Column: WhatsApp Link Generator */}
                <div className="lg:col-span-7 rounded-2xl bg-zinc-900/80 border border-white/10 p-6 space-y-5">
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

                {/* Right Column: Downloadable QR Code Card */}
                <div className="lg:col-span-5 rounded-2xl bg-zinc-900/80 border border-amber-500/35 p-6 flex flex-col items-center text-center space-y-4">
                  <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
                    <QrCode className="w-4 h-4" />
                    <span>
                      Código QR Descargable{' '}
                      {waTable ? `(Mesa ${waTable})` : '(Menú General)'}
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-white shadow-xl border border-amber-400/40">
                    {qrCodeDataUrl ? (
                      <img
                        src={qrCodeDataUrl}
                        alt="Código QR del Menú Público Gordis Burguer"
                        className="w-52 h-52 object-contain"
                      />
                    ) : (
                      <div className="w-52 h-52 flex items-center justify-center text-xs text-zinc-500">
                        Generando QR...
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-zinc-300 max-w-xs">
                    Escanea este código con la cámara del teléfono para abrir directamente el{' '}
                    <strong className="text-white">Menú Público de Gordis Burguer</strong>
                    {waTable ? ` en la Mesa ${waTable}` : ''}.
                  </p>

                  {qrCodeDataUrl && (
                    <a
                      href={qrCodeDataUrl}
                      download={
                        waTable
                          ? `qr-menu-gordis-burguer-mesa-${waTable}.png`
                          : 'qr-menu-gordis-burguer-general.png'
                      }
                      onClick={() =>
                        showToast('Código QR descargado como imagen PNG.', 'success')
                      }
                      className="w-full inline-flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-gradient-to-r from-red-600 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white text-sm font-bold shadow-lg transition-all"
                    >
                      <Download className="w-4 h-4" />
                      <span>Descargar Código QR (PNG)</span>
                    </a>
                  )}
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
                    Activa, desactiva o actualiza los datos bancarios visibles en Mesera y Menú Público (Solo Zelle requiere captura de comprobante)
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
                              {pm.id === 'pm-zelle' || pm.name.toLowerCase().includes('zelle')
                                ? 'Solicita carga de capture (comprobante) en Menú Público'
                                : 'Sin carga de capture (validación directa en formulario)'}
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
                    <span>Solicitar comprobante si aplica</span>
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
      {inspectingCashierOrder && (
        <OrderCashierDetailModal
          order={inspectingCashierOrder}
          onClose={() => setInspectingCashierOrder(null)}
        />
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
      {createGerenciaOrderOpen && (
        <CreateGerenciaOrderModal
          onClose={() => setCreateGerenciaOrderOpen(false)}
        />
      )}
      {pdfReportTarget && (
        <DetailedClosurePdfModal
          orders={pdfReportTarget.orders}
          closureRecord={pdfReportTarget.closure}
          bcvRate={bcvRate}
          onClose={() => setPdfReportTarget(null)}
        />
      )}
      {clearAllConfirmOpen && (
        <ClearAllOrdersConfirmModal
          orderCount={orders.length}
          closureCount={closures.length}
          onConfirm={clearAllOrdersExceptClosures}
          onClose={() => setClearAllConfirmOpen(false)}
        />
      )}
    </div>
  );
}
