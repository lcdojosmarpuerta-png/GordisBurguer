import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChefHat,
  Clock,
  Info,
  Truck,
  UtensilsCrossed,
  X,
  XCircle,
} from 'lucide-react';
import { BRAND_LOGO_URL } from '../data/initialData';
import { useRestaurant } from '../context/RestaurantContext';
import { OrderModality, OrderStatus } from '../types/restaurant';

export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function formatTime(isoDate: string): string {
  try {
    return new Date(isoDate).toLocaleTimeString('es-VE', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '--:--';
  }
}

export function formatElapsedMinutes(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const mins = Math.max(0, Math.floor(diffMs / 60000));
  if (mins < 1) return 'Ahora';
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return `${hrs}h ${rem}m`;
}

export function modalityLabel(modality: OrderModality, tableNumber?: number): string {
  if (modality === 'sitio') {
    return tableNumber ? `Mesa ${tableNumber}` : 'Comer en el sitio';
  }
  if (modality === 'llevar') return 'Para llevar';
  return 'Delivery';
}

export function BrandLogo({
  size = 'md',
  showWordmark = true,
}: {
  size?: 'sm' | 'md' | 'lg';
  showWordmark?: boolean;
}) {
  const dim =
    size === 'lg' ? 'w-16 h-16' : size === 'md' ? 'w-10 h-10' : 'w-8 h-8';

  return (
    <div className="flex items-center gap-3 shrink-0">
      <div
        className={`${dim} rounded-full overflow-hidden border border-amber-400/35 bg-white shrink-0 shadow-md`}
      >
        <img
          src={BRAND_LOGO_URL}
          alt="Logo de Gordis Burguer"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover scale-110"
        />
      </div>
      {showWordmark && (
        <span
          className={`font-display font-bold tracking-tight text-white whitespace-nowrap shrink-0 ${
            size === 'lg' ? 'text-2xl' : size === 'md' ? 'text-lg' : 'text-base'
          }`}
        >
          Gordis Burguer
        </span>
      )}
    </div>
  );
}

export function SafeProductImage({
  src,
  alt,
  className = '',
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-zinc-800 via-zinc-900 to-black text-zinc-500 select-none ${className}`}
        role="img"
        aria-label={alt}
      >
        <UtensilsCrossed className="w-8 h-8 text-amber-500/50 mb-1.5" />
        <span className="text-xs text-zinc-400 px-3 text-center line-clamp-1">{alt}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={className}
    />
  );
}

export function OrderStatusText({ status }: { status: OrderStatus }) {
  switch (status) {
    case 'pendiente':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400 whitespace-nowrap">
          <Clock className="w-3.5 h-3.5 shrink-0" />
          Pendiente
        </span>
      );
    case 'en_cocina':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-400 whitespace-nowrap">
          <ChefHat className="w-3.5 h-3.5 shrink-0" />
          En Cocina
        </span>
      );
    case 'listo':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 whitespace-nowrap">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          Listo
        </span>
      );
    case 'en_camino':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-400 whitespace-nowrap">
          <Truck className="w-3.5 h-3.5 shrink-0" />
          Despachado
        </span>
      );
    case 'servido':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 whitespace-nowrap">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          Servido
        </span>
      );
    case 'cancelado':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 whitespace-nowrap">
          <XCircle className="w-3.5 h-3.5 shrink-0" />
          Cancelado
        </span>
      );
  }
}

export function ToastContainer() {
  const { toasts, dismissToast } = useRestaurant();

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-zinc-900/95 backdrop-blur-xl border border-white/10 shadow-2xl text-sm text-zinc-100"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {toast.type === 'success' && (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            {toast.type === 'error' && (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            {toast.type === 'info' && (
              <Info className="w-4 h-4 text-amber-400 shrink-0" />
            )}
            <span className="truncate">{toast.text}</span>
          </div>
          <button
            type="button"
            onClick={() => dismissToast(toast.id)}
            className="p-1 text-zinc-400 hover:text-white rounded-md transition-colors shrink-0"
            aria-label="Cerrar notificación"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
