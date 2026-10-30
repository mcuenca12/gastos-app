-- Ejecuta esto en el SQL Editor de tu proyecto de Supabase (una sola vez).

create extension if not exists pgcrypto;

create table if not exists groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  pin text, -- PIN opcional de 4 dígitos, solo para dificultar que alguien adivine el link
  admin_token text, -- secreto distinto del PIN; lo guarda en su navegador quien crea el grupo
  created_at timestamptz not null default now()
);

create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  description text not null,
  amount integer not null check (amount > 0), -- pesos colombianos, sin decimales
  paid_by uuid not null references members(id), -- pagador principal, solo para el historial
  expense_date date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists expense_splits (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references expenses(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  share_amount integer not null check (share_amount >= 0)
);

-- Quién puso la plata de cada gasto: permite que lo paguen varias personas.
-- La suma de amount_paid de un gasto siempre es igual a expenses.amount
-- (se valida en add_group_expense antes de insertar).
create table if not exists expense_payments (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references expenses(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  amount_paid integer not null check (amount_paid > 0)
);

create index if not exists idx_members_group on members(group_id);
create index if not exists idx_expenses_group on expenses(group_id);
create index if not exists idx_splits_expense on expense_splits(expense_id);
create index if not exists idx_payments_expense on expense_payments(expense_id);

-- Row Level Security: el modelo de esta app es "link privado", no login.
-- IMPORTANTE: Postgres RLS no puede obligar a un cliente a filtrar por
-- group_id en su propia consulta, así que NO exponemos las tablas
-- directamente al rol "anon" (la app usa la anon key, que es pública y viaja
-- en el navegador). Todo el acceso pasa por las funciones de abajo, que
-- validan el group_id -y el PIN o el admin_token, según la acción- del lado
-- del servidor antes de leer o escribir nada.
alter table groups enable row level security;
alter table members enable row level security;
alter table expenses enable row level security;
alter table expense_splits enable row level security;
alter table expense_payments enable row level security;

revoke all on table groups, members, expenses, expense_splits, expense_payments
  from anon, authenticated;

-- Valida que el grupo exista y que el PIN coincida (si el grupo tiene uno).
-- Uso interno: no se concede permiso de ejecución a anon/authenticated,
-- solo la pueden invocar las funciones de abajo (mismo owner).
create or replace function _require_group(p_group_id uuid, p_pin text)
returns groups
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group groups;
begin
  select * into v_group from groups where id = p_group_id;
  if v_group.id is null then
    raise exception 'group_not_found' using errcode = 'P0002';
  end if;
  if v_group.pin is not null and v_group.pin <> coalesce(p_pin, '') then
    raise exception 'invalid_pin' using errcode = '28000';
  end if;
  return v_group;
end;
$$;

revoke all on function _require_group(uuid, text) from public, anon, authenticated;

-- Valida que quien llama tenga el admin_token correcto del grupo.
-- Si el grupo no tiene admin_token (grupos creados antes de esta función),
-- se niega el acceso: no hay forma de saber quién debería ser el admin.
create or replace function _require_admin(p_group_id uuid, p_admin_token text)
returns groups
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group groups;
begin
  select * into v_group from groups where id = p_group_id;
  if v_group.id is null then
    raise exception 'group_not_found' using errcode = 'P0002';
  end if;
  if v_group.admin_token is null or v_group.admin_token <> coalesce(p_admin_token, '') then
    raise exception 'not_admin' using errcode = '28000';
  end if;
  return v_group;
end;
$$;

revoke all on function _require_admin(uuid, text) from public, anon, authenticated;

-- Crea un grupo, su token de administrador y al creador como primer
-- integrante (con su propio nombre; nadie más se agrega aquí). El resto se
-- va uniendo por el link con add_group_member.
create or replace function create_group_with_members(
  p_name text,
  p_pin text,
  p_member_name text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group_id uuid;
  v_admin_token text;
  v_member_id uuid;
  v_clean_name text;
begin
  if p_name is null or btrim(p_name) = '' then
    raise exception 'El nombre del grupo es obligatorio';
  end if;

  v_clean_name := btrim(p_member_name);
  if v_clean_name is null or v_clean_name = '' then
    raise exception 'Tu nombre es obligatorio';
  end if;

  v_admin_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');

  insert into groups (name, pin, admin_token)
  values (btrim(p_name), nullif(btrim(p_pin), ''), v_admin_token)
  returning id into v_group_id;

  insert into members (group_id, name)
  values (v_group_id, v_clean_name)
  returning id into v_member_id;

  return json_build_object(
    'group_id', v_group_id,
    'admin_token', v_admin_token,
    'member_id', v_member_id
  );
end;
$$;

grant execute on function create_group_with_members(text, text, text) to anon, authenticated;

-- Devuelve todo lo que la pantalla de grupo necesita en una sola llamada.
-- status: 'ok' | 'not_found' | 'pin_required'
-- Nunca incluye admin_token (solo se entrega una vez, al crear el grupo).
create or replace function get_group_bundle(p_group_id uuid, p_pin text default null)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group groups;
begin
  begin
    v_group := _require_group(p_group_id, p_pin);
  exception
    when sqlstate 'P0002' then
      return json_build_object('status', 'not_found');
    when sqlstate '28000' then
      return json_build_object('status', 'pin_required');
  end;

  return json_build_object(
    'status', 'ok',
    'group', json_build_object(
      'id', v_group.id,
      'name', v_group.name,
      'pin', v_group.pin,
      'created_at', v_group.created_at
    ),
    'members', (
      select coalesce(json_agg(m order by m.created_at), '[]'::json)
      from members m where m.group_id = p_group_id
    ),
    'expenses', (
      select coalesce(json_agg(e order by e.expense_date desc, e.created_at desc), '[]'::json)
      from expenses e where e.group_id = p_group_id
    ),
    'splits', (
      select coalesce(json_agg(s), '[]'::json)
      from expense_splits s
      join expenses e on e.id = s.expense_id
      where e.group_id = p_group_id
    ),
    'payments', (
      select coalesce(json_agg(p), '[]'::json)
      from expense_payments p
      join expenses e on e.id = p.expense_id
      where e.group_id = p_group_id
    )
  );
end;
$$;

grant execute on function get_group_bundle(uuid, text) to anon, authenticated;

-- Unión por link: cualquiera con el PIN entra directo como integrante
-- escribiendo su nombre (sin aprobación previa). El admin puede quitarlo
-- después si hace falta.
create or replace function add_group_member(p_group_id uuid, p_pin text, p_name text)
returns members
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member members;
begin
  perform _require_group(p_group_id, p_pin);

  if p_name is null or btrim(p_name) = '' then
    raise exception 'El nombre es obligatorio';
  end if;

  insert into members (group_id, name)
  values (p_group_id, btrim(p_name))
  returning * into v_member;

  return v_member;
end;
$$;

grant execute on function add_group_member(uuid, text, text) to anon, authenticated;

-- El admin quita a un integrante. No puede quitarse a sí mismo (p_caller_
-- member_id es el suyo), ni a alguien que ya tiene gastos o pagos
-- registrados, para no dejar huecos en el historial.
create or replace function delete_group_member(
  p_group_id uuid,
  p_admin_token text,
  p_member_id uuid,
  p_caller_member_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_has_history boolean;
begin
  perform _require_admin(p_group_id, p_admin_token);

  if p_member_id = p_caller_member_id then
    raise exception 'No puedes quitarte a ti mismo del grupo';
  end if;

  select exists(
    select 1 from expense_splits where member_id = p_member_id
    union all
    select 1 from expense_payments where member_id = p_member_id
  ) into v_has_history;

  if v_has_history then
    raise exception 'No se puede quitar un integrante que ya tiene gastos registrados';
  end if;

  delete from members where id = p_member_id and group_id = p_group_id;
end;
$$;

grant execute on function delete_group_member(uuid, text, uuid, uuid) to anon, authenticated;

-- Agrega un gasto con sus pagadores (expense_payments) y sus partes
-- (expense_splits), de forma atómica. Los montos se calculan en el
-- cliente (lib/balances.ts, lib/money.ts) y se validan aquí antes de
-- insertar. paid_by queda como el primer pagador, solo para el historial.
create or replace function add_group_expense(
  p_group_id uuid,
  p_pin text,
  p_description text,
  p_amount integer,
  p_payer_ids uuid[],
  p_payer_amounts integer[],
  p_participant_ids uuid[],
  p_shares integer[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_expense_id uuid;
  v_sum integer;
  v_match_count int;
begin
  perform _require_group(p_group_id, p_pin);

  if p_description is null or btrim(p_description) = '' then
    raise exception 'La descripción es obligatoria';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'El monto debe ser mayor a 0';
  end if;

  if p_payer_ids is null or array_length(p_payer_ids, 1) is null then
    raise exception 'Selecciona quién pagó';
  end if;
  if array_length(p_payer_ids, 1) <> array_length(p_payer_amounts, 1) then
    raise exception 'Pagadores y montos no coinciden';
  end if;
  select sum(a) into v_sum from unnest(p_payer_amounts) as a;
  if coalesce(v_sum, 0) <> p_amount then
    raise exception 'La suma de lo que pagó cada uno debe ser igual al monto total';
  end if;

  if p_participant_ids is null or array_length(p_participant_ids, 1) is null then
    raise exception 'Selecciona al menos un participante';
  end if;
  if array_length(p_participant_ids, 1) <> array_length(p_shares, 1) then
    raise exception 'Participantes y montos no coinciden';
  end if;
  select sum(a) into v_sum from unnest(p_shares) as a;
  if coalesce(v_sum, 0) <> p_amount then
    raise exception 'La suma de las partes no coincide con el monto';
  end if;

  select count(*) into v_match_count
  from members where group_id = p_group_id and id = any(p_payer_ids);
  if v_match_count <> array_length(p_payer_ids, 1) then
    raise exception 'Algún pagador no pertenece a este grupo';
  end if;

  select count(*) into v_match_count
  from members where group_id = p_group_id and id = any(p_participant_ids);
  if v_match_count <> array_length(p_participant_ids, 1) then
    raise exception 'Algún participante no pertenece a este grupo';
  end if;

  insert into expenses (group_id, description, amount, paid_by)
  values (p_group_id, btrim(p_description), p_amount, p_payer_ids[1])
  returning id into v_expense_id;

  insert into expense_payments (expense_id, member_id, amount_paid)
  select v_expense_id, pid, amt
  from unnest(p_payer_ids, p_payer_amounts) as t(pid, amt);

  insert into expense_splits (expense_id, member_id, share_amount)
  select v_expense_id, pid, sh
  from unnest(p_participant_ids, p_shares) as t(pid, sh);

  return v_expense_id;
end;
$$;

grant execute on function add_group_expense(uuid, text, text, integer, uuid[], integer[], uuid[], integer[]) to anon, authenticated;

-- Borra un gasto (sus pagos y partes se eliminan en cascada por la FK).
create or replace function delete_group_expense(p_group_id uuid, p_pin text, p_expense_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform _require_group(p_group_id, p_pin);
  delete from expenses where id = p_expense_id and group_id = p_group_id;
end;
$$;

grant execute on function delete_group_expense(uuid, text, uuid) to anon, authenticated;
