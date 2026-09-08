-- 0001_init.sql
create extension if not exists "uuid-ossp";

create table sellers (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  platform text,
  monthly_order_volume int,
  has_historical_data boolean default false,
  created_at timestamptz default now()
);

create table customers (
  id uuid primary key default uuid_generate_v4(),
  seller_id uuid references sellers(id) on delete cascade,
  external_customer_id text,
  first_seen_at timestamptz default now(),
  total_orders int default 0,
  total_rto int default 0,
  total_cod_orders int default 0,
  total_cod_success int default 0,
  unique(seller_id, external_customer_id)
);

create table orders (
  id uuid primary key default uuid_generate_v4(),
  seller_id uuid references sellers(id) on delete cascade,
  customer_id uuid references customers(id),
  external_order_id text,
  order_value numeric,
  payment_type text check (payment_type in ('COD','Prepaid')),
  pincode text,
  distance_km numeric,
  is_new_customer boolean,
  category text,
  address_quality_score numeric, -- 0..1, nullable
  landmark_present boolean,
  delivery_zone text,            -- urban/tier2/tier3/rural
  order_date timestamptz default now(),
  final_status text,             -- Delivered / RTO / Pending
  created_at timestamptz default now()
);

create table risk_predictions (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid references orders(id) on delete cascade,
  score numeric,
  probability numeric,
  probability_source text,       -- 'benchmark' | 'seller_history'
  tier text,                     -- LOW/MEDIUM/HIGH/REVIEW
  confidence text,               -- Low/Medium/High
  drivers jsonb,
  predicted_at timestamptz default now()
);

create table interventions (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid references orders(id) on delete cascade,
  risk_prediction_id uuid references risk_predictions(id),
  intervention_type text,
  estimated_cost numeric,
  estimated_savings numeric,
  friction text,                 -- low/medium/high
  status text default 'recommended',
  applied_at timestamptz
);

create table outcomes (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid references orders(id) on delete cascade,
  intervention_id uuid references interventions(id),
  actual_status text,
  attempt_integrity jsonb,
  failure_attribution text,      -- Customer/Address/Logistics/Rider/System/Unknown
  recorded_at timestamptz default now()
);

create table reviews (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid references orders(id) on delete cascade,
  risk_prediction_id uuid references risk_predictions(id),
  system_recommendation text,
  human_decision text,
  human_reason text,
  reviewed_at timestamptz default now()
);

create table audit_logs (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid references orders(id),
  actor text,
  action text,
  detail jsonb,
  created_at timestamptz default now()
);

-- Row Level Security: sellers only see their own data
alter table orders enable row level security;
alter table customers enable row level security;
alter table risk_predictions enable row level security;
create policy "seller_isolation_orders" on orders using (seller_id = auth.uid());
create policy "seller_isolation_customers" on customers using (seller_id = auth.uid());