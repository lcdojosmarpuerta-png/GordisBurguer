import React, { useState } from 'react';
import { Eye, EyeOff, KeyRound, Minus, Plus, Save, Trash2, X } from 'lucide-react';
import { useRestaurant } from '../context/RestaurantContext';
import {
  Order,
  OrderItem,
  OrderModality,
  OrderStatus,
  UserRole,
} from '../types/restaurant';
import { formatCurrency } from './SharedUI';

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
  const { products, paymentMethods, updateOrder } = useRestaurant();
  const [items, setItems] = useState<OrderItem[]>(order.items);
  const [modality, setModality] = useState<OrderModality>(order.modality);
  const [tableNumber, setTableNumber] = useState<number>(order.tableNumber ?? 1);
  const [status, setStatus] = useState<OrderStatus>(order.status);
  const [paymentMethodId, setPaymentMethodId] = useState<string>(order.paymentMethodId);
  const [notes, setNotes] = useState<string>(order.notes ?? '');
  const [addProductId, setAddProductId] = useState<string>(products[0]?.id ?? '');

  const computedTotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

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
    const pm = paymentMethods.find((p) => p.id === paymentMethodId);
    updateOrder(order.id, {
      items,
      total: computedTotal,
      modality,
      tableNumber: modality === 'sitio' ? tableNumber : undefined,
      status,
      paymentMethodId: pm?.id ?? order.paymentMethodId,
      paymentMethodName: pm?.name ?? order.paymentMethodName,
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
            <p className="text-xs text-zinc-400">
              Modifica productos, modalidad, estado o método de pago
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
                Guardar Cambios
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
