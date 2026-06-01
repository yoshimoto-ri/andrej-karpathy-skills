-- =============================================
-- 農業生產管理系統 - 資料庫結構
-- =============================================

create extension if not exists "pgcrypto";

-- =============================================
-- 1. 使用者與角色
-- =============================================

create table if not exists profiles (
  id       uuid primary key references auth.users(id) on delete cascade,
  email    text not null,
  name     text not null default '',
  role     text not null default 'field_worker'
             check (role in ('admin', 'field_worker', 'sales')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql
security definer set search_path = public as $$
begin
  insert into public.profiles (id, email)
  values (new.id, coalesce(new.email, ''))
  on conflict (id) do update set email = coalesce(excluded.email, public.profiles.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================
-- 2. 資材母體庫
-- =============================================

create table if not exists materials (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  category            text not null
                        check (category in ('fertilizer','pesticide','seed','packaging','label','other')),
  unit                text not null default 'kg',
  unit_price          numeric(12,2),
  organic_cert_no     text,
  safety_harvest_days integer,       -- 僅農藥類填寫
  cert_file_url       text,          -- Supabase Storage URL
  notes               text,
  is_active           boolean not null default true,
  created_at          timestamptz not null default now()
);

-- =============================================
-- 3. 資材採購紀錄
-- =============================================

create table if not exists material_purchases (
  id           uuid primary key default gen_random_uuid(),
  material_id  uuid not null references materials(id) on delete restrict,
  purchase_date date not null default current_date,
  quantity     numeric(12,3) not null,
  unit_price   numeric(12,2),
  supplier     text,
  batch_no     text,             -- 採購批號
  notes        text,
  created_by   uuid references profiles(id),
  created_at   timestamptz not null default now()
);

-- =============================================
-- 4. 田區
-- =============================================

create table if not exists fields (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  area_sqm   numeric(10,2) not null,   -- 平方公尺
  field_type text not null default 'outdoor'
               check (field_type in ('outdoor','greenhouse')),
  location   text,
  notes      text,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

-- =============================================
-- 5. 作物種類常數表
-- =============================================

create table if not exists crop_types (
  id                  uuid primary key default gen_random_uuid(),
  code                char(1) not null unique,   -- 批號用，A-Z，Admin設定
  name                text not null,
  growth_days         integer,                   -- 標準生長天數
  expected_yield_kg   numeric(10,3),             -- 預估單位產量（每平方公尺）
  nitrate_limit_ppm   integer,                   -- 硝酸鹽容許值（主婦聯盟）
  notes               text,
  is_active           boolean not null default true,
  created_at          timestamptz not null default now()
);

-- =============================================
-- 6. 契作合約
-- =============================================

create table if not exists contracts (
  id                  uuid primary key default gen_random_uuid(),
  company_name        text not null,
  contract_no         text,
  contract_date       date,
  crop_type_id        uuid references crop_types(id),
  contracted_qty_kg   numeric(10,3),
  grade_requirement   text,
  price_per_kg        numeric(10,2),
  delivery_deadline   date,
  payment_terms       text,
  notes               text,
  contract_file_url   text,
  status              text not null default 'active'
                        check (status in ('active','completed','cancelled')),
  created_by          uuid references profiles(id),
  created_at          timestamptz not null default now()
);

-- =============================================
-- 7. 作物週期（每一期栽種）
-- =============================================

create table if not exists crop_cycles (
  id                    uuid primary key default gen_random_uuid(),
  field_id              uuid not null references fields(id) on delete restrict,
  crop_type_id          uuid not null references crop_types(id) on delete restrict,
  contract_id           uuid references contracts(id),      -- 契作則填入
  plant_date            date not null,
  seedling_source       text,
  quantity_planted      numeric(10,2),                      -- 株數或種子量
  quantity_unit         text default '株',
  status                text not null default 'growing'
                          check (status in ('growing','harvested','terminated')),
  harvest_locked_until  date,                               -- 施藥後自動填入
  estimated_harvest_date date,                              -- plant_date + growth_days
  termination_reason    text,                               -- 若 terminated 填原因
  notes                 text,
  created_by            uuid references profiles(id),
  created_at            timestamptz not null default now()
);

-- =============================================
-- 8. 每日環境紀錄
-- =============================================

create table if not exists daily_env_records (
  id               uuid primary key default gen_random_uuid(),
  field_id         uuid not null references fields(id) on delete restrict,
  record_date      date not null default current_date,
  weather          text check (weather in ('晴','多雲','陰','雨','颱風','其他')),
  temp_max         numeric(4,1),
  temp_min         numeric(4,1),
  rainfall_mm      numeric(6,1),
  neighbor_spray   boolean not null default false,
  neighbor_notes   text,
  notes            text,
  recorded_by      uuid references profiles(id),
  created_at       timestamptz not null default now(),
  unique(field_id, record_date)
);

-- =============================================
-- 9. 田間作業紀錄
-- =============================================

create table if not exists field_activities (
  id              uuid primary key default gen_random_uuid(),
  crop_cycle_id   uuid not null references crop_cycles(id) on delete restrict,
  record_date     date not null default current_date,
  activity_type   text not null
                    check (activity_type in (
                      'fertilizing','pest_control','irrigation',
                      'pruning','thinning','other'
                    )),
  material_id     uuid references materials(id),
  quantity_used   numeric(12,3),
  dilution_ratio  text,          -- 稀釋倍數，如 "1:500"
  purpose         text,          -- 施用目的/防治對象
  notes           text,
  recorded_by     uuid references profiles(id),
  created_at      timestamptz not null default now()
);

-- 施藥後自動更新 harvest_locked_until
create or replace function update_harvest_lock()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_safety_days integer;
  v_lock_date   date;
begin
  if NEW.activity_type = 'pest_control' and NEW.material_id is not null then
    select safety_harvest_days into v_safety_days
      from materials where id = NEW.material_id;
    if v_safety_days is not null then
      v_lock_date := NEW.record_date + v_safety_days;
      update crop_cycles
        set harvest_locked_until = greatest(coalesce(harvest_locked_until, '1900-01-01'), v_lock_date)
        where id = NEW.crop_cycle_id;
    end if;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_update_harvest_lock on field_activities;
create trigger trg_update_harvest_lock
  after insert or update on field_activities
  for each row execute function update_harvest_lock();

-- =============================================
-- 10. 農損 / 欠收紀錄
-- =============================================

create table if not exists crop_loss_records (
  id                uuid primary key default gen_random_uuid(),
  crop_cycle_id     uuid not null references crop_cycles(id) on delete restrict,
  record_date       date not null default current_date,
  loss_type         text not null
                      check (loss_type in ('natural_disaster','poor_quality','pest_damage','other')),
  affected_area_sqm numeric(10,2),
  estimated_loss_kg numeric(10,3),
  description       text not null,
  evidence_file_url text,
  recorded_by       uuid references profiles(id),
  created_at        timestamptz not null default now()
);

-- =============================================
-- 11. 採收紀錄 & 批號生成
-- =============================================

create table if not exists harvest_records (
  id                uuid primary key default gen_random_uuid(),
  crop_cycle_id     uuid not null references crop_cycles(id) on delete restrict,
  harvest_date      date not null default current_date,
  lot_no            text not null unique,          -- 系統自動生成
  weight_kg         numeric(10,3) not null,        -- 合格採收量
  rejected_weight_kg numeric(10,3) default 0,     -- 品質不良剔除量
  rejection_reason  text,
  grade             text,
  nitrate_ppm       integer,
  notes             text,
  recorded_by       uuid references profiles(id),
  created_at        timestamptz not null default now()
);

-- 自動生成批號：包裝日+作物碼+當年序號
create or replace function generate_lot_no(
  p_crop_cycle_id uuid,
  p_package_date  date
) returns text language plpgsql security definer set search_path = public as $$
declare
  v_crop_code  char(1);
  v_year       int;
  v_seq        int;
  v_lot_no     text;
begin
  select ct.code into v_crop_code
    from crop_cycles cc
    join crop_types ct on ct.id = cc.crop_type_id
    where cc.id = p_crop_cycle_id;

  v_year := extract(year from p_package_date);

  select count(*) + 1 into v_seq
    from harvest_records hr
    join crop_cycles cc on cc.id = hr.crop_cycle_id
    join crop_types ct on ct.id = cc.crop_type_id
    where ct.code = v_crop_code
      and extract(year from hr.harvest_date) = v_year;

  v_lot_no := to_char(p_package_date, 'YYYYMMDD') || v_crop_code || lpad(v_seq::text, 2, '0');
  return v_lot_no;
end;
$$;

-- =============================================
-- 12. 洗選包裝
-- =============================================

create table if not exists processing_records (
  id                   uuid primary key default gen_random_uuid(),
  harvest_record_id    uuid not null references harvest_records(id) on delete restrict,
  process_date         date not null default current_date,
  packages_count       integer,
  package_material_id  uuid references materials(id),    -- 包裝材料
  labels_count         integer,
  label_material_id    uuid references materials(id),    -- 標章貼紙
  waste_weight_kg      numeric(10,3) default 0,          -- 處理損耗
  waste_reason         text,
  notes                text,
  recorded_by          uuid references profiles(id),
  created_at           timestamptz not null default now()
);

-- =============================================
-- 13. 出貨
-- =============================================

create table if not exists shipments (
  id            uuid primary key default gen_random_uuid(),
  shipment_date date not null default current_date,
  company_name  text not null,
  notes         text,
  recorded_by   uuid references profiles(id),
  created_at    timestamptz not null default now()
);

create table if not exists shipment_items (
  id                    uuid primary key default gen_random_uuid(),
  shipment_id           uuid not null references shipments(id) on delete cascade,
  processing_record_id  uuid references processing_records(id),
  lot_no                text not null,
  product_name          text not null,
  quantity              numeric(10,3) not null,
  unit                  text not null default 'kg',
  unit_price            numeric(10,2),
  total_price           numeric(12,2) generated always as (quantity * unit_price) stored,
  notes                 text
);

-- =============================================
-- Row Level Security
-- =============================================

alter table profiles           enable row level security;
alter table materials          enable row level security;
alter table material_purchases enable row level security;
alter table fields             enable row level security;
alter table crop_types         enable row level security;
alter table contracts          enable row level security;
alter table crop_cycles        enable row level security;
alter table daily_env_records  enable row level security;
alter table field_activities   enable row level security;
alter table crop_loss_records  enable row level security;
alter table harvest_records    enable row level security;
alter table processing_records enable row level security;
alter table shipments          enable row level security;
alter table shipment_items     enable row level security;

-- Helper: 取得目前使用者角色
create or replace function my_role()
returns text language sql security definer stable set search_path = public as $$
  select role from profiles where id = auth.uid()
$$;

-- Helper: 是否為 admin
create or replace function is_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select role = 'admin' from profiles where id = auth.uid()
$$;

-- ---- profiles ----
create policy "profiles: self or admin can read"
  on profiles for select using (id = auth.uid() or is_admin());
create policy "profiles: self can insert"
  on profiles for insert with check (id = auth.uid());
create policy "profiles: self or admin can update"
  on profiles for update using (id = auth.uid() or is_admin());
create policy "profiles: admin can delete"
  on profiles for delete using (is_admin());

-- ---- 共用：所有已登入者可讀，admin 可寫 ----
do $$ declare t text;
begin
  foreach t in array array[
    'materials','fields','crop_types','contracts','crop_cycles'
  ] loop
    execute format('
      create policy "%s: authenticated can read" on %s for select using (auth.uid() is not null);
      create policy "%s: admin can insert" on %s for insert with check (is_admin());
      create policy "%s: admin can update" on %s for update using (is_admin());
      create policy "%s: admin can delete" on %s for delete using (is_admin());
    ', t,t, t,t, t,t, t,t);
  end loop;
end $$;

-- ---- material_purchases ----
create policy "material_purchases: authenticated can read"
  on material_purchases for select using (auth.uid() is not null);
create policy "material_purchases: admin can all"
  on material_purchases for all using (is_admin());

-- ---- 田間記錄：field_worker + admin 可寫 ----
do $$ declare t text;
begin
  foreach t in array array[
    'daily_env_records','field_activities','crop_loss_records'
  ] loop
    execute format('
      create policy "%s: authenticated can read" on %s for select using (auth.uid() is not null);
      create policy "%s: field_worker or admin can insert" on %s for insert
        with check (my_role() in (''field_worker'',''admin''));
      create policy "%s: field_worker or admin can update" on %s for update
        using (my_role() in (''field_worker'',''admin''));
      create policy "%s: admin can delete" on %s for delete using (is_admin());
    ', t,t, t,t, t,t, t,t);
  end loop;
end $$;

-- ---- 產銷記錄：sales + admin 可寫 ----
do $$ declare t text;
begin
  foreach t in array array[
    'harvest_records','processing_records','shipments','shipment_items'
  ] loop
    execute format('
      create policy "%s: authenticated can read" on %s for select using (auth.uid() is not null);
      create policy "%s: sales or admin can insert" on %s for insert
        with check (my_role() in (''sales'',''admin''));
      create policy "%s: sales or admin can update" on %s for update
        using (my_role() in (''sales'',''admin''));
      create policy "%s: admin can delete" on %s for delete using (is_admin());
    ', t,t, t,t, t,t, t,t);
  end loop;
end $$;

-- =============================================
-- 基本 GRANT（authenticated 角色）
-- =============================================

grant usage on schema public to authenticated, anon;

grant all on
  profiles, materials, material_purchases, fields, crop_types,
  contracts, crop_cycles, daily_env_records, field_activities,
  crop_loss_records, harvest_records, processing_records,
  shipments, shipment_items
to authenticated;
