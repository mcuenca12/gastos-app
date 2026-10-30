"use client";

import { formatCOP, digitsOnly } from "@/lib/money";

type MoneyInputProps = {
  value: string; // dígitos limpios, ej. "2000000"
  onChange: (digits: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  label?: string;
};

/** Input de texto que muestra el monto con separador de miles (es-CO)
 * mientras se escribe, pero guarda internamente solo los dígitos limpios. */
export default function MoneyInput({
  value,
  onChange,
  placeholder,
  className = "",
  autoFocus,
  label,
}: MoneyInputProps) {
  const display = value ? formatCOP(Number(value)) : "";

  return (
    <div>
      {label && <label className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>}
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-sm font-medium text-slate-400">
          $
        </span>
        <input
          type="text"
          inputMode="numeric"
          autoFocus={autoFocus}
          className={`w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-7 pr-3.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 ${className}`}
          placeholder={placeholder}
          value={display}
          onChange={(e) => onChange(digitsOnly(e.target.value))}
        />
      </div>
    </div>
  );
}
