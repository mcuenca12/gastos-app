export type Group = {
  id: string;
  name: string;
  pin: string | null;
  created_at: string;
};

export type Member = {
  id: string;
  group_id: string;
  name: string;
  created_at: string;
};

export type Expense = {
  id: string;
  group_id: string;
  description: string;
  amount: number; // pesos colombianos, sin decimales
  paid_by: string; // pagador principal, solo para mostrar en el historial
  expense_date: string;
  created_at: string;
};

export type ExpenseSplit = {
  id: string;
  expense_id: string;
  member_id: string;
  share_amount: number;
};

export type ExpensePayment = {
  id: string;
  expense_id: string;
  member_id: string;
  amount_paid: number;
};

export type Debt = {
  from: string; // member_id que debe
  to: string; // member_id que recibe
  amount: number;
};

// Forma del JSON que devuelve la función RPC get_group_bundle.
export type GroupBundle =
  | { status: "not_found" }
  | { status: "pin_required" }
  | {
      status: "ok";
      group: Group;
      members: Member[];
      expenses: Expense[];
      splits: ExpenseSplit[];
      payments: ExpensePayment[];
    };

// Forma del JSON que devuelve create_group_with_members.
export type CreateGroupResult = {
  group_id: string;
  admin_token: string;
  member_id: string;
};
