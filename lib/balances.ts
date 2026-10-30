import { ExpensePayment, ExpenseSplit, Member, Debt } from "./types";

/**
 * Calcula el saldo neto de cada miembro (en pesos, enteros):
 * neto > 0  -> le deben plata (pagó de más)
 * neto < 0  -> debe plata (le pagaron de menos)
 */
export function computeNetBalances(
  members: Member[],
  payments: ExpensePayment[],
  splits: ExpenseSplit[]
): Map<string, number> {
  const net = new Map<string, number>();
  members.forEach((m) => net.set(m.id, 0));

  // Lo que cada quien puso de su bolsillo
  for (const payment of payments) {
    net.set(payment.member_id, (net.get(payment.member_id) ?? 0) + payment.amount_paid);
  }

  // Lo que cada quien debe según su parte en cada gasto
  for (const split of splits) {
    net.set(split.member_id, (net.get(split.member_id) ?? 0) - split.share_amount);
  }

  return net;
}

/**
 * Simplifica las deudas: en vez de que todos le deban a todos,
 * genera la menor cantidad posible de transferencias para saldar cuentas.
 * Algoritmo goloso: siempre empareja al mayor deudor con el mayor acreedor.
 */
export function simplifyDebts(net: Map<string, number>): Debt[] {
  const creditors: { id: string; amount: number }[] = [];
  const debtors: { id: string; amount: number }[] = [];

  net.forEach((amount, id) => {
    if (amount > 0) creditors.push({ id, amount });
    else if (amount < 0) debtors.push({ id, amount: -amount });
  });

  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const debts: Debt[] = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const amount = Math.min(debtor.amount, creditor.amount);

    if (amount > 0) {
      debts.push({ from: debtor.id, to: creditor.id, amount });
    }

    debtor.amount -= amount;
    creditor.amount -= amount;

    if (debtor.amount <= 0) i++;
    if (creditor.amount <= 0) j++;
  }

  return debts;
}

/** Reparte un monto (entero, pesos) en partes iguales entre los participantes
 * seleccionados, ajustando el residuo en el último participante. */
export function splitEqually(amount: number, memberIds: string[]): number[] {
  const n = memberIds.length;
  const base = Math.floor(amount / n);
  const shares = new Array(n).fill(base);
  shares[n - 1] += amount - base * n;
  return shares;
}
