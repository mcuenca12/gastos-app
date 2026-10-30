import { HTMLAttributes, ReactNode } from "react";
import { LucideIcon } from "lucide-react";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  title?: string;
  icon?: LucideIcon;
  children: ReactNode;
};

export default function Card({ title, icon: Icon, children, className = "", ...props }: CardProps) {
  return (
    <section
      className={`rounded-2xl border border-sand-200/70 bg-white p-5 shadow-card sm:p-6 ${className}`}
      {...props}
    >
      {title && (
        <h2 className="mb-4 flex items-center gap-2 font-semibold text-sand-900">
          {Icon && (
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
              <Icon className="h-4 w-4" />
            </span>
          )}
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}
