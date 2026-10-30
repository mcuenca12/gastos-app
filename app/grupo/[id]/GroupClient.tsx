"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Lock,
  UserRound,
  Scale,
  CheckCircle2,
  Users,
  X,
  PlusCircle,
  ChevronDown,
  Receipt,
  Trash2,
  Copy,
  Check,
  ArrowRight,
  SearchX,
  WifiOff,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { Group, Member, Expense, ExpenseSplit, ExpensePayment, GroupBundle } from "@/lib/types";
import { computeNetBalances, simplifyDebts, splitEqually } from "@/lib/balances";
import { formatCOP } from "@/lib/money";
import { getAdminToken, getStoredMemberId, setStoredMemberId } from "@/lib/storage";
import MoneyInput from "@/components/MoneyInput";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Avatar from "@/components/ui/Avatar";
import Alert from "@/components/ui/Alert";
import EmptyState from "@/components/ui/EmptyState";
import StatusScreen from "@/components/ui/StatusScreen";
import GroupSkeleton from "@/components/ui/Skeleton";

function pinStorageKey(groupId: string) {
  return `gastos-pin:${groupId}`;
}

export default function GroupClient({ groupId }: { groupId: string }) {
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [splits, setSplits] = useState<ExpenseSplit[]>([]);
  const [payments, setPayments] = useState<ExpensePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // PIN de acceso al grupo (si el grupo lo tiene configurado)
  const [pin, setPin] = useState("");
  const [needsPin, setNeedsPin] = useState(false);
  const [pinAttempted, setPinAttempted] = useState(false);
  const [pinInput, setPinInput] = useState("");

  // Identidad del navegador: mi member_id siempre, y el admin_token si fui
  // quien creó el grupo. Ambos viven en localStorage (ver lib/storage.ts).
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [myMemberId, setMyMemberId] = useState<string | null>(null);
  const [joinName, setJoinName] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [memberError, setMemberError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // formulario de nuevo gasto
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState(""); // dígitos limpios, ej. "2000000"
  const [paidBy, setPaidBy] = useState("");
  const [isMultiPayer, setIsMultiPayer] = useState(false);
  const [selectedPayers, setSelectedPayers] = useState<Set<string>>(new Set());
  const [payerAmountDigits, setPayerAmountDigits] = useState<Record<string, string>>({});
  const [participants, setParticipants] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [expenseError, setExpenseError] = useState<string | null>(null);

  const load = useCallback(
    async (pinOverride?: string) => {
      setLoading(true);
      setLoadError(null);
      const effectivePin = pinOverride ?? pin;

      const { data, error } = await supabase.rpc("get_group_bundle", {
        p_group_id: groupId,
        p_pin: effectivePin || null,
      });

      if (error || !data) {
        setLoadError("No se pudo cargar el grupo. Intenta de nuevo.");
        setLoading(false);
        return;
      }

      const bundle = data as GroupBundle;

      if (bundle.status === "not_found") {
        setNotFound(true);
        setLoading(false);
        return;
      }

      if (bundle.status === "pin_required") {
        setNeedsPin(true);
        setPinAttempted(pinOverride !== undefined);
        setLoading(false);
        return;
      }

      setNeedsPin(false);
      setGroup(bundle.group);
      setMembers(bundle.members);
      setExpenses(bundle.expenses);
      setSplits(bundle.splits);
      setPayments(bundle.payments);

      if (bundle.members.length > 0 && !paidBy) {
        setPaidBy(bundle.members[0].id);
        setParticipants(new Set(bundle.members.map((m) => m.id)));
      }

      setAdminToken(getAdminToken(groupId));
      setMyMemberId(getStoredMemberId(groupId));

      setLoading(false);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [groupId]
  );

  useEffect(() => {
    let storedPin = "";
    try {
      storedPin = sessionStorage.getItem(pinStorageKey(groupId)) ?? "";
    } catch {
      // almacenamiento no disponible (modo privado, etc.) — seguimos sin PIN guardado
    }
    setPin(storedPin);
    load(storedPin);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  async function handlePinSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      sessionStorage.setItem(pinStorageKey(groupId), pinInput);
    } catch {
      // si no se puede guardar, igual seguimos: solo se pedirá de nuevo al refrescar
    }
    setPin(pinInput);
    await load(pinInput);
  }

  async function handleJoinSubmit(e: React.FormEvent) {
    e.preventDefault();
    setJoinError(null);
    if (!joinName.trim()) return;

    const { data, error } = await supabase.rpc("add_group_member", {
      p_group_id: groupId,
      p_pin: pin || null,
      p_name: joinName.trim(),
    });

    if (error || !data) {
      setJoinError("No se pudo completar el ingreso. Intenta de nuevo.");
      return;
    }

    setStoredMemberId(groupId, (data as Member).id);
    window.location.reload();
  }

  async function removeMember(memberId: string) {
    setMemberError(null);
    const { error } = await supabase.rpc("delete_group_member", {
      p_group_id: groupId,
      p_admin_token: adminToken,
      p_member_id: memberId,
      p_caller_member_id: myMemberId,
    });

    if (error) {
      setMemberError(error.message || "No se pudo quitar al integrante.");
      return;
    }

    load();
  }

  function togglePayer(id: string) {
    const next = new Set(selectedPayers);
    if (next.has(id)) {
      next.delete(id);
      setPayerAmountDigits((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
    } else {
      next.add(id);
    }
    setSelectedPayers(next);
  }

  function toggleParticipant(id: string) {
    const next = new Set(participants);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setParticipants(next);
  }

  function nameOf(id: string) {
    return members.find((m) => m.id === id)?.name ?? "?";
  }

  function payersLabel(expenseId: string, fallbackPaidBy: string) {
    const rows = payments.filter((p) => p.expense_id === expenseId);
    if (rows.length === 0) return nameOf(fallbackPaidBy);
    if (rows.length === 1) return nameOf(rows[0].member_id);
    const names = rows.map((r) => nameOf(r.member_id));
    return `${names.slice(0, -1).join(", ")} y ${names[names.length - 1]}`;
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // si el navegador bloquea el clipboard, no hay mucho más que hacer
    }
  }

  async function addExpense(e: React.FormEvent) {
    e.preventDefault();
    setExpenseError(null);

    const amt = Number(amount);
    if (!desc.trim() || !amt || amt <= 0) {
      setExpenseError("Completa la descripción y el monto.");
      return;
    }

    let payerIds: string[];
    let payerAmounts: number[];
    let participantIds: string[];

    if (members.length === 1) {
      const onlyId = members[0].id;
      payerIds = [onlyId];
      payerAmounts = [amt];
      participantIds = [onlyId];
    } else if (isMultiPayer) {
      payerIds = Array.from(selectedPayers);
      if (payerIds.length === 0) {
        setExpenseError("Selecciona quién pagó.");
        return;
      }
      payerAmounts = payerIds.map((id) => Number(payerAmountDigits[id] || "0"));
      const sum = payerAmounts.reduce((a, b) => a + b, 0);
      if (sum !== amt) {
        setExpenseError("La suma de lo que pagó cada uno debe ser igual al monto total.");
        return;
      }
      participantIds = Array.from(participants);
    } else {
      if (!paidBy) {
        setExpenseError("Selecciona quién pagó.");
        return;
      }
      payerIds = [paidBy];
      payerAmounts = [amt];
      participantIds = Array.from(participants);
    }

    if (participantIds.length === 0) {
      setExpenseError("Selecciona al menos un participante.");
      return;
    }

    setSaving(true);
    const shares = splitEqually(amt, participantIds);
    const { error } = await supabase.rpc("add_group_expense", {
      p_group_id: groupId,
      p_pin: pin || null,
      p_description: desc.trim(),
      p_amount: amt,
      p_payer_ids: payerIds,
      p_payer_amounts: payerAmounts,
      p_participant_ids: participantIds,
      p_shares: shares,
    });

    if (error) {
      setExpenseError(error.message || "No se pudo guardar el gasto.");
      setSaving(false);
      return;
    }

    setDesc("");
    setAmount("");
    setSelectedPayers(new Set());
    setPayerAmountDigits({});
    setSaving(false);
    load();
  }

  async function deleteExpense(id: string) {
    setExpenseError(null);
    const { error } = await supabase.rpc("delete_group_expense", {
      p_group_id: groupId,
      p_pin: pin || null,
      p_expense_id: id,
    });

    if (error) {
      setExpenseError("No se pudo borrar el gasto. Intenta de nuevo.");
      return;
    }

    load();
  }

  if (loading) return <GroupSkeleton />;

  if (notFound)
    return (
      <StatusScreen
        icon={SearchX}
        title="No encontramos ese grupo"
        description="Revisa el link que te compartieron."
      />
    );

  if (loadError)
    return (
      <StatusScreen icon={WifiOff} title="Algo salió mal" description={loadError}>
        <Button variant="outline" className="w-full" onClick={() => load()}>
          Reintentar
        </Button>
      </StatusScreen>
    );

  if (needsPin) {
    return (
      <StatusScreen
        icon={Lock}
        title="Este grupo tiene PIN"
        description="Ingresa el PIN que te compartieron junto con el link."
      >
        <form onSubmit={handlePinSubmit} className="space-y-3">
          <Input
            autoFocus
            placeholder="PIN"
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value)}
            maxLength={6}
          />
          <Button type="submit" className="w-full">
            Entrar
          </Button>
          {pinAttempted && <Alert>PIN incorrecto.</Alert>}
        </form>
      </StatusScreen>
    );
  }

  const haveJoined = !!myMemberId && members.some((m) => m.id === myMemberId);

  if (!haveJoined) {
    return (
      <StatusScreen
        icon={UserRound}
        title={group?.name ?? "Unirme al grupo"}
        description="¿Cómo te llamas? Así te identificamos dentro del grupo."
      >
        <form onSubmit={handleJoinSubmit} className="space-y-3">
          <Input
            autoFocus
            placeholder="Tu nombre"
            value={joinName}
            onChange={(e) => setJoinName(e.target.value)}
          />
          <Button type="submit" className="w-full">
            Unirme
          </Button>
          {joinError && <Alert>{joinError}</Alert>}
        </form>
      </StatusScreen>
    );
  }

  const isAdmin = !!adminToken;

  const net = computeNetBalances(members, payments, splits);
  const debts = simplifyDebts(net);
  const currentUrl = typeof window !== "undefined" ? window.location.href : "";

  return (
    <main className="space-y-6">
      <header className="flex items-start justify-between gap-3 animate-fade-in">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold tracking-tight text-slate-900">
            {group?.name}
          </h1>
          <p className="mt-0.5 truncate text-xs text-slate-400">{currentUrl}</p>
        </div>
        <Button variant="outline" size="sm" onClick={copyLink} className="shrink-0">
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copiado" : "Copiar link"}
        </Button>
      </header>

      <Card title="Saldos" icon={Scale}>
        {debts.length === 0 ? (
          <EmptyState icon={CheckCircle2}>Todos están a paz y salvo.</EmptyState>
        ) : (
          <ul className="space-y-2">
            {debts.map((d, i) => (
              <li
                key={i}
                className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2.5"
              >
                <div className="flex min-w-0 items-center gap-2 text-sm">
                  <Avatar name={nameOf(d.from)} size="sm" />
                  <span className="truncate font-medium text-slate-700">{nameOf(d.from)}</span>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <Avatar name={nameOf(d.to)} size="sm" />
                  <span className="truncate font-medium text-slate-700">{nameOf(d.to)}</span>
                </div>
                <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                  ${formatCOP(d.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Integrantes" icon={Users}>
        <ul className="flex flex-wrap gap-2">
          {members.map((m) => (
            <li
              key={m.id}
              className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-3 text-sm"
            >
              <Avatar name={m.name} size="sm" />
              <span className="font-medium text-slate-700">{m.name}</span>
              {isAdmin && m.id !== myMemberId && (
                <button
                  type="button"
                  onClick={() => removeMember(m.id)}
                  className="text-slate-300 transition-colors hover:text-red-500"
                  title="Quitar integrante"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
        {memberError && (
          <div className="mt-3">
            <Alert>{memberError}</Alert>
          </div>
        )}
      </Card>

      <Card title="Registrar gasto" icon={PlusCircle}>
        <form onSubmit={addExpense} className="space-y-4">
          <Input
            placeholder="Descripción (ej. Almuerzo)"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
          <MoneyInput placeholder="Monto" value={amount} onChange={setAmount} />

          {members.length > 1 && (
            <>
              <label
                className="flex cursor-pointer items-center justify-between rounded-lg bg-slate-50 px-3.5 py-2.5 text-sm text-slate-600"
                onClick={() => setIsMultiPayer((v) => !v)}
              >
                <span>¿Lo pagaron varias personas?</span>
                <span
                  role="switch"
                  aria-checked={isMultiPayer}
                  className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                    isMultiPayer ? "bg-brand-600" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 translate-x-0.5 transform rounded-full bg-white shadow transition-transform ${
                      isMultiPayer ? "translate-x-4" : ""
                    }`}
                  />
                </span>
              </label>

              {!isMultiPayer ? (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-500">Pagó</label>
                  <div className="relative">
                    <select
                      className="w-full appearance-none rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 pr-9 text-sm text-slate-900 transition-colors focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                      value={paidBy}
                      onChange={(e) => setPaidBy(e.target.value)}
                    >
                      {members.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-500">
                    ¿Quién pagó cuánto?
                  </label>
                  <div className="flex flex-col gap-2">
                    {members.map((m) => {
                      const checked = selectedPayers.has(m.id);
                      return (
                        <div key={m.id} className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => togglePayer(m.id)}
                            className={`flex min-w-[8.5rem] items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                              checked
                                ? "border-brand-500 bg-brand-50 text-brand-700"
                                : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                            }`}
                          >
                            <Avatar name={m.name} size="sm" />
                            {m.name}
                          </button>
                          {checked && (
                            <MoneyInput
                              className="w-28 py-1.5"
                              placeholder="0"
                              value={payerAmountDigits[m.id] ?? ""}
                              onChange={(digits) =>
                                setPayerAmountDigits((prev) => ({ ...prev, [m.id]: digits }))
                              }
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-500">
                  Entre quiénes se divide
                </label>
                <div className="flex flex-wrap gap-2">
                  {members.map((m) => {
                    const checked = participants.has(m.id);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => toggleParticipant(m.id)}
                        className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                          checked
                            ? "border-brand-500 bg-brand-50 text-brand-700"
                            : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                        }`}
                      >
                        <Avatar name={m.name} size="sm" />
                        {m.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {expenseError && <Alert>{expenseError}</Alert>}
          <Button type="submit" loading={saving} className="w-full">
            {saving ? "Guardando..." : "Agregar gasto"}
          </Button>
        </form>
      </Card>

      <Card title="Historial" icon={Receipt}>
        {expenses.length === 0 ? (
          <EmptyState icon={Receipt}>Aún no hay gastos registrados.</EmptyState>
        ) : (
          <ul className="divide-y divide-slate-100">
            {expenses.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                    <Receipt className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-800">{e.description}</p>
                    <p className="truncate text-xs text-slate-400">
                      Pagó {payersLabel(e.id, e.paid_by)} · {e.expense_date}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="font-semibold text-slate-800">
                    ${formatCOP(Number(e.amount))}
                  </span>
                  <button
                    onClick={() => deleteExpense(e.id)}
                    className="text-slate-300 transition-colors hover:text-red-500"
                    title="Borrar gasto"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </main>
  );
}
