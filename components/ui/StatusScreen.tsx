import { LucideIcon } from "lucide-react";

/** Pantalla centrada para estados de una sola acción: pedir PIN, pedir
 * nombre, "no encontrado", cargando, etc. */
export default function StatusScreen({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <main className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-sm rounded-2xl border border-sand-200/70 bg-white p-6 text-center shadow-card animate-fade-in">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-700">
          <Icon className="h-6 w-6" />
        </span>
        <h1 className="text-lg font-semibold text-sand-900">{title}</h1>
        {description && <p className="mt-1.5 text-sm text-sand-600">{description}</p>}
        {children && <div className="mt-5 text-left">{children}</div>}
      </div>
    </main>
  );
}
