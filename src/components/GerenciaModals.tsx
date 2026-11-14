import React, { useState } from 'react';
import {
  Bike,
  Check,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  MessageCircle,
  Minus,
  Phone,
  Plus,
  Save,
  Trash2,
  Truck,
  UserPlus,
  X,
} from 'lucide-react';
import { PAGO_MOVIL_BANKS } from '../data/initialData';
import { useRestaurant } from '../context/RestaurantContext';
import {
  DeliveryDriver,
  Order,
  OrderItem,
  OrderModality,
  OrderStatus,
  UserRole,
} from '../types/restaurant';
import { formatCurrency } from './SharedUI';

export function isPagoMovilMethod(id?: string, name?: string): boolean {
  if (!id && !name) return false;
  if (id === 'pm-pago-movil') return true;
  const lower = (name ?? '').toLowerCase();
  return lower.includes('pago móvil') || lower.includes('pago movil');
}

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

export function EditOrderModal({
  order,
  onClose,
}: {
  order: Order;
  onClose: () => void;
}) {
  const { products, paymentMethods, updateOrder, showToast } = useRestaurant();
  const [items, setItems] = useState<OrderItem[]>(order.items);
  const [modality, setModality] = useState<OrderModality>(order.modality);
  const [tableNumber, setTableNumber] = useState<number>(order.tableNumber ?? 1);
  const [status, setStatus] = useState<OrderStatus>(order.status);
  const [paymentMethodId, setPaymentMethodId] = useState<string>(order.paymentMethodId);
  const [notes, setNotes] = useState<string>(order.notes ?? '');
  const [addProductId, setAddProductId] = useState<string>(products[0]?.id ?? '');

  // Pago Móvil extra fields
  const [pmBank, setPmBank] = useState<string>(
    order.pagoMovilDetails?.bank ?? PAGO_MOVIL_BANKS[0]
  );
  const [pmAmount, setPmAmount] = useState<string>(
    order.pagoMovilDetails?.amount !== undefined
      ? String(order.pagoMovilDetails.amount)
      : String(order.total)
  );
  const [pmRef6, setPmRef6] = useState<string>(
    order.pagoMovilDetails?.referenceLast6 ?? ''
  );

  const computedTotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const selectedPm = paymentMethods.find((p) => p.id === paymentMethodId);
  const isPagoMovil = isPagoMovilMethod(selectedPm?.id, selectedPm?.name);

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

    if (isPagoMovil) {
      const cleanRef = pmRef6.replace(/\D/g, '');
      const parsedAmt = parseFloat(pmAmount);
      if (!pmBank.trim() || Number.isNaN(parsedAmt) || parsedAmt <= 0 || cleanRef.length !== 6) {
        showToast(
          'Para Pago Móvil debes completar Banco, Monto y exactamente los 6 últimos dígitos de referencia.',
          'error'
        );
        return;
      }
    }

    updateOrder(order.id, {
      items,
      total: computedTotal,
      modality,
      tableNumber: modality === 'sitio' ? tableNumber : undefined,
      status,
      paymentMethodId: selectedPm?.id ?? order.paymentMethodId,
      paymentMethodName: selectedPm?.name ?? order.paymentMethodName,
      pagoMovilDetails: isPagoMovil
        ? {
            bank: pmBank.trim(),
            amount: parseFloat(pmAmount) || computedTotal,
            referenceLast6: pmRef6.replace(/\D/g, '').slice(-6),
          }
        : undefined,
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
              Editar Pedido {order.code}
            </h3>
            <p className="text-xs text-amber-400">
              Al guardar cambios se enviará una alerta de pedido modificado a Cocina
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
              Productos del pedido
            </label>
            {items.map((item, idx) => (
              <div
                key={`${item.productId}-${idx}`}
                className="flex items-center justify-between gap-3 rounded-xl bg-zinc-950 border border-white/10 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{item.name}</p>
                  <p className="text-xs font-mono text-amber-400 tabular-nums">
                    {formatCurrency(item.price * item.quantity)}
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
                    {p.name} ({formatCurrency(p.price)})
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                Método de Pago
              </label>
              <select
                value={paymentMethodId}
                onChange={(e) => setPaymentMethodId(e.target.value)}
                className="w-full rounded-xl bg-zinc-950 border border-white/15 px-3 py-2 text-xs text-white"
              >
                {paymentMethods.map((pm) => (
                  <option key={pm.id} value={pm.id}>
                    {pm.name}
                  </option>
                ))}
              </select>
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
          </div>

          {isPagoMovil && (
            <div className="rounded-xl bg-zinc-950 border border-amber-500/30 p-3.5 space-y-3">
              <p className="text-xs font-semibold text-amber-400">
                Datos de Pago Móvil (Obligatorios)
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">Banco</label>
                  <select
                    value={pmBank}
                    onChange={(e) => setPmBank(e.target.value)}
                    className="w-full rounded-lg bg-zinc-900 border border-white/15 px-2.5 py-2 text-xs text-white"
                  >
                    {PAGO_MOVIL_BANKS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">Monto ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={pmAmount}
                    onChange={(e) => setPmAmount(e.target.value)}
                    className="w-full rounded-lg bg-zinc-900 border border-white/15 px-2.5 py-2 text-xs font-mono text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">
                    Referencia (6 últimos dígitos)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    required
                    value={pmRef6}
                    onChange={(e) => setPmRef6(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Ej. 489821"
                    className="w-full rounded-lg bg-zinc-900 border border-white/15 px-2.5 py-2 text-xs font-mono text-white"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-4">
            <div className="text-sm">
              <span className="text-zinc-400">Nuevo total: </span>
              <strong className="font-mono text-lg text-white tabular-nums">
                {formatCurrency(computedTotal)}
              </strong>
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
                disabled={items.length === 0}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-amber-500 text-xs font-bold text-white shadow-lg disabled:opacity-40 cursor-pointer"
              >
                Guardar y Notificar a Cocina
              </button>
            </div>
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
  const { drivers, dispatchOrderWithDriver, showToast } = useRestaurant();
  const [selectedDriverId, setSelectedDriverId] = useState<string>(drivers[0]?.id ?? '');
  const [customerPhone, setCustomerPhone] = useState<string>(order.customerPhone ?? '');
  const [dispatchedState, setDispatchedState] = useState<boolean>(false);
  const [copiedTarget, setCopiedTarget] = useState<'driver' | 'customer' | null>(null);

  const selectedDriver =
    drivers.find((d) => d.id === selectedDriverId) ?? drivers[0];

  const itemsTextList = order.items
    .map((it) => `• ${it.quantity}x ${it.name}${it.notes ? ` (${it.notes})` : ''}`)
    .join('\n');

  const paymentSummaryText = order.pagoMovilDetails
    ? `${order.paymentMethodName} (${order.pagoMovilDetails.bank} · Ref: ${order.pagoMovilDetails.referenceLast6})`
    : order.paymentMethodName;

  const driverMessage = selectedDriver
    ? `🍔 *NUEVO DESPACHO GORDIS BURGUER — ${order.code}*\n` +
      `👤 *Conductor:* ${selectedDriver.name}\n` +
      `🧑 *Cliente:* ${order.customerName ?? 'Cliente Delivery'}\n` +
      `📞 *Teléfono Cliente:* ${customerPhone || 'No indicado'}\n` +
      `📍 *Dirección:* ${order.deliveryAddress ?? 'Por confirmar'}\n\n` +
      `🧾 *Detalle del Pedido:*\n${itemsTextList}\n\n` +
      `💳 *Pago:* ${paymentSummaryText}\n` +
      `💰 *Total:* ${formatCurrency(order.total)}`
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
                  {formatCurrency(order.total)} · {order.paymentMethodName}
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
