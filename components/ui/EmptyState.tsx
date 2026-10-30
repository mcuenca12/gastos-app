import { LucideIcon } from "lucide-react";

export default function EmptyState({
  icon: Icon,
  children,
}: {
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 py-6 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sand-100 text-sand-500">
        <Icon className="h-5 w-5" />
      </span>
      <p className="text-sm text-sand-500">{children}</p>
    </div>
  );
}
