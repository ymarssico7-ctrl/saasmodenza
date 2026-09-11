-- ─────────────────────────────────────────────────────────────────────────────
-- Vestui: Tabela de pedidos da vitrine
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.orders (
  id                     uuid          primary key default gen_random_uuid(),
  store_id               uuid          not null references public.stores(id) on delete cascade,
  numero                 text          not null,
  customer_name          text          not null,
  customer_phone         text          not null,
  customer_email         text,
  customer_address       jsonb         not null default '{}'::jsonb,
  items                  jsonb         not null default '[]'::jsonb,
  subtotal               numeric(12,2) not null default 0,
  frete_valor            numeric(12,2) not null default 0,
  frete_tipo             text,
  desconto               numeric(12,2) not null default 0,
  cupom                  text,
  total                  numeric(12,2) not null default 0,
  payment_method         text          not null default 'pix',
  payment_fee            numeric(12,2) not null default 0,
  net_amount             numeric(12,2) not null default 0,
  payment_status         text          not null default 'pendente'
                           check (payment_status in ('pendente','pago','reembolsado','cancelado','chargeback')),
  status                 text          not null default 'novo'
                           check (status in ('novo','confirmado','em_separacao','enviado','entregue','cancelado')),
  tracking_code          text,
  gateway_transaction_id text,
  metadata               jsonb         default '{}'::jsonb,
  created_at             timestamptz   not null default now(),
  updated_at             timestamptz   not null default now()
);

-- Indices
create index if not exists idx_orders_store_id   on public.orders(store_id);
create index if not exists idx_orders_created_at on public.orders(store_id, created_at desc);
create index if not exists idx_orders_status     on public.orders(store_id, status);

-- RLS
alter table public.orders enable row level security;

create policy "vitrine_public_insert_orders"
  on public.orders for insert
  with check (exists (select 1 from public.stores where id = orders.store_id));

create policy "owner_select_orders"
  on public.orders for select
  using (exists (select 1 from public.stores where id = orders.store_id and owner_id = auth.uid()));

create policy "owner_update_orders"
  on public.orders for update
  using (exists (select 1 from public.stores where id = orders.store_id and owner_id = auth.uid()));

create policy "owner_delete_orders"
  on public.orders for delete
  using (exists (select 1 from public.stores where id = orders.store_id and owner_id = auth.uid()));

-- Trigger updated_at
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_orders_updated_at on public.orders;
create trigger set_orders_updated_at
  before update on public.orders
  for each row execute function public.handle_updated_at();
