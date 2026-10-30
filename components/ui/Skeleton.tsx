export default function GroupSkeleton() {
  return (
    <main className="space-y-6">
      <div className="h-7 w-48 animate-pulse rounded-md bg-slate-200" />
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-28 animate-pulse rounded-2xl border border-slate-200/70 bg-white shadow-card"
        />
      ))}
    </main>
  );
}
