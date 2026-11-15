import React, { useState } from 'react';
import {
  ArrowRight,
  ChevronDown,
  Eye,
  EyeOff,
  HelpCircle,
  Lock,
  Smartphone,
  UserCheck,
} from 'lucide-react';
import { LOGIN_BG_URL } from '../data/initialData';
import { useRestaurant } from '../context/RestaurantContext';
import { UserRole } from '../types/restaurant';
import { BcvRateBanner, BrandLogo } from './SharedUI';

const ROLE_OPTIONS: { value: UserRole; label: string; subtitle: string }[] = [
  { value: 'gerencia', label: 'Gerencia', subtitle: 'Control total, menú, caja y accesos' },
  { value: 'mesera', label: 'Mesera', subtitle: 'Toma de órdenes en sala y mesas' },
  { value: 'cocina', label: 'Cocina', subtitle: 'Tablero KDS de comandas en vivo' },
];

export function LoginModule() {
  const { login, navigateToModule, credentials } = useRestaurant();
  const [selectedRole, setSelectedRole] = useState<UserRole>('gerencia');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const result = login(selectedRole, password);
    if (!result.ok) {
      setError(result.error ?? 'Error de autenticación.');
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex items-center justify-center lg:justify-start bg-[#0B0C0E]">
      {/* 4K urban fast-food background with slow zoom animation */}
      <div
        className="absolute inset-0 bg-cover bg-center animate-slow-zoom will-change-transform"
        style={{ backgroundImage: `url(${LOGIN_BG_URL})` }}
        aria-hidden="true"
      />

      {/* Dark translucent scrim (65% opacity + directional gradient for legibility) */}
      <div
        className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/65 to-black/50"
        aria-hidden="true"
      />

      {/* Center-left login card */}
      <div className="relative z-10 w-full max-w-md mx-4 sm:mx-8 lg:ml-20 xl:ml-28 my-8">
        <div className="rounded-2xl bg-zinc-950/75 backdrop-blur-2xl border border-white/15 shadow-2xl p-6 sm:p-8">
          {/* Brand Logo Header */}
          <div className="flex flex-col items-start gap-4 pb-6 border-b border-white/10">
            <div className="w-full flex items-center justify-between gap-2 flex-wrap">
              <BrandLogo size="lg" />
              <BcvRateBanner compact />
            </div>
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Acceso al Sistema
              </h1>
              <p className="text-sm text-zinc-400 mt-1">
                Selecciona tu rol operativo e ingresa la contraseña asignada por Gerencia.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            {/* Role Dropdown */}
            <div>
              <label
                htmlFor="login-role"
                className="block text-sm font-medium text-zinc-200 mb-2"
              >
                Perfil de Usuario
              </label>
              <div className="relative">
                <UserCheck className="w-4 h-4 text-amber-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  id="login-role"
                  value={selectedRole}
                  onChange={(e) => {
                    setSelectedRole(e.target.value as UserRole);
                    setError(null);
                  }}
                  className="w-full appearance-none rounded-xl bg-zinc-900/90 border border-white/15 pl-10 pr-10 py-3 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-amber-500/60 focus:border-amber-500 transition-all cursor-pointer"
                >
                  {ROLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-zinc-900 text-white">
                      {opt.label} — {opt.subtitle}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="login-password"
                  className="block text-sm font-medium text-zinc-200"
                >
                  Contraseña
                </label>
                <button
                  type="button"
                  onClick={() => setShowHint((v) => !v)}
                  className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-amber-400 transition-colors"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Credenciales</span>
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(null);
                  }}
                  placeholder="Ingresa tu contraseña"
                  autoComplete="current-password"
                  className="w-full rounded-xl bg-zinc-900/90 border border-white/15 pl-10 pr-11 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/60 focus:border-amber-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-zinc-400 hover:text-white rounded-lg transition-colors"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {showHint && (
              <div className="rounded-xl bg-zinc-900/90 border border-amber-500/25 p-3.5 text-xs text-zinc-300 space-y-1.5">
                <p className="font-semibold text-amber-400">
                  Claves activas (configurables en Gerencia):
                </p>
                <div className="grid grid-cols-3 gap-2 font-mono text-[11px]">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRole('gerencia');
                      setPassword(credentials.gerencia);
                      setError(null);
                    }}
                    className="text-left px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <span className="block text-zinc-400 font-sans">Gerencia</span>
                    <span className="text-white">{credentials.gerencia}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRole('mesera');
                      setPassword(credentials.mesera);
                      setError(null);
                    }}
                    className="text-left px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <span className="block text-zinc-400 font-sans">Mesera</span>
                    <span className="text-white">{credentials.mesera}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRole('cocina');
                      setPassword(credentials.cocina);
                      setError(null);
                    }}
                    className="text-left px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <span className="block text-zinc-400 font-sans">Cocina</span>
                    <span className="text-white">{credentials.cocina}</span>
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-2.5 text-xs font-medium text-red-300"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white font-semibold py-3.5 px-5 text-sm shadow-lg hover:shadow-xl shadow-red-900/30 transition-all duration-200 cursor-pointer"
            >
              <span>Iniciar Sesión</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Direct shortcut to Public Menu (Module 4) */}
          <div className="mt-6 pt-5 border-t border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <span className="text-xs text-zinc-400">¿Vista de cliente externo?</span>
            <button
              type="button"
              onClick={() => navigateToModule('menu_publico')}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs font-semibold text-amber-400 shadow-lg hover:shadow-xl transition-all cursor-pointer whitespace-nowrap"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Abrir Menú Público</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
