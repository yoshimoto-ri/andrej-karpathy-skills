-- =============================================
-- 003: 接軌農糧署產銷履歷（官方步驟 1~3）
--   新增：organizations、processing_facilities、processing_sources、processing_steps
--   補欄位：materials（劑型/農藥分類/建議用量）、crop_types（類別/品種）、
--           crop_cycles（批次編號）、processing_records（場所/來源類型/製成品重）
--   庫存：material_stock_view 即時計算（不做實體累計欄位）
--   批次編號：generate_cycle_no 觸發器自動產生（年+作物碼+序，如 2026P01）
-- =============================================

-- =============================================
-- 組織主檔（官方 1-1 L3Trader；單一農場通常僅一筆）
-- =============================================

create table if not exists organizations (
  id           uuid primary key default gen_random_uuid(),
  org_no       text,               -- 組織代碼（接軌官方）
  org_name     text not null,      -- 經營者名稱
  org_type     text,               -- 身分別
  manager_name text,               -- 履歷負責人
  address      text,               -- 設立地址
  notes        text,
  created_at   timestamptz not null default now()
);

-- =============================================
-- 採後處理場所（官方 1-6 L3Postharvest）
-- =============================================

create table if not exists processing_facilities (
  id                uuid primary key default gen_random_uuid(),
  facility_name     text not null,     -- 場所名稱
  facility_type     text,              -- 場所類型
  ownership         text not null default 'self'
                      check (ownership in ('self','outsourced')),  -- 自有/委託
  cert_body         text,              -- 驗證機構
  contact_person    text,              -- 委託單位聯絡人（加值）
  contact_phone     text,              -- 聯絡電話（加值）
  contract_no       text,              -- 委託合約編號（加值）
  contract_file_url text,              -- 合約掃描檔（加值）
  notes             text,
  is_active         boolean not null default true,
  created_at        timestamptz not null default now()
);

-- =============================================
-- 資材補欄位（官方 2-1~2-5；庫存採 view 即時計算，不做累計欄位）
-- =============================================

alter table materials add column if not exists formulation        text;            -- 劑型含量
alter table materials add column if not exists pesticide_class    text;            -- 農藥分類
alter table materials add column if not exists dosage_per_hectare numeric(12,3);   -- 每公頃建議用量
alter table materials add column if not exists water_volume       numeric(12,1);   -- 每公頃用水量（L）

-- =============================================
-- 作物補欄位（官方 1-5 L3Crop）
-- =============================================

alter table crop_types add column if not exists crop_category text;  -- 作物類別（可由農委會分類資料帶入）
alter table crop_types add column if not exists variety       text;  -- 品種

-- =============================================
-- 栽培批次編號（官方 L3CultivationBatch）
-- 格式：年 + 作物代碼 + 當年該作物期序（補零兩位），如 2026P01
-- =============================================

alter table crop_cycles add column if not exists cycle_no text unique;

create or replace function generate_cycle_no(
  p_crop_type_id uuid,
  p_plant_date   date
) returns text language plpgsql security definer set search_path = public as $$
declare
  v_crop_code char(1);
  v_year      int;
  v_seq       int;
begin
  select code into v_crop_code from crop_types where id = p_crop_type_id;
  v_year := extract(year from p_plant_date);

  select count(*) + 1 into v_seq
    from crop_cycles cc
    join crop_types ct on ct.id = cc.crop_type_id
    where ct.code = v_crop_code
      and extract(year from cc.plant_date) = v_year;

  return v_year::text || v_crop_code || lpad(v_seq::text, 2, '0');
end;
$$;

-- 新增批次時若未填 cycle_no 自動產生
create or replace function set_cycle_no()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if NEW.cycle_no is null then
    NEW.cycle_no := generate_cycle_no(NEW.crop_type_id, NEW.plant_date);
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_set_cycle_no on crop_cycles;
create trigger trg_set_cycle_no
  before insert on crop_cycles
  for each row execute function set_cycle_no();

-- =============================================
-- 採後處理補欄位（官方 3-2 L3CultivationPostharvest）
-- 來源規則：單一採收批填 harvest_record_id；混貨/半成品改用 processing_sources
-- =============================================

alter table processing_records alter column harvest_record_id drop not null;
alter table processing_records add column if not exists facility_id uuid references processing_facilities(id);
alter table processing_records add column if not exists source_type text not null default 'raw'
  check (source_type in ('raw','semi'));                                        -- 生鮮/半成品
alter table processing_records add column if not exists output_weight_kg numeric(10,3);  -- 製成品總重

-- 混貨來源（多來源 → 一筆加工；來源為採收批或另一加工批，擇一）
create table if not exists processing_sources (
  id                          uuid primary key default gen_random_uuid(),
  processing_record_id        uuid not null references processing_records(id) on delete cascade,
  source_harvest_record_id    uuid references harvest_records(id) on delete restrict,
  source_processing_record_id uuid references processing_records(id) on delete restrict,
  quantity_used_kg            numeric(10,3),
  notes                       text,
  check (
    (source_harvest_record_id is not null and source_processing_record_id is null) or
    (source_harvest_record_id is null and source_processing_record_id is not null)
  )
);

-- 多道工序（逐筆步驟，每步可指定場所）
create table if not exists processing_steps (
  id                   uuid primary key default gen_random_uuid(),
  processing_record_id uuid not null references processing_records(id) on delete cascade,
  sequence_no          integer not null,
  step_date            date not null default current_date,
  activity             text not null,     -- 工序內容（清洗/分裝/烘乾…）
  facility_id          uuid references processing_facilities(id),
  weight_kg            numeric(10,3),     -- 該步驟後重量
  notes                text,
  created_at           timestamptz not null default now(),
  unique (processing_record_id, sequence_no)
);

create index on processing_sources(processing_record_id);
create index on processing_steps(processing_record_id);

-- =============================================
-- 資材即時庫存 view（剩餘量 = Σ採購 − Σ田間施用 − Σ包裝/標章用量）
-- 負值即為異常（供系統檢核標記）
-- =============================================

create or replace view material_stock_view
with (security_invoker = true) as
select
  m.id as material_id,
  m.material_name,
  m.category,
  m.unit,
  coalesce(p.total_purchased, 0)                            as total_purchased,
  coalesce(fa.total_used, 0)                                as total_field_used,
  coalesce(pk.total_packages, 0) + coalesce(lb.total_labels, 0) as total_processing_used,
  coalesce(p.total_purchased, 0)
    - coalesce(fa.total_used, 0)
    - coalesce(pk.total_packages, 0)
    - coalesce(lb.total_labels, 0)                          as current_stock
from materials m
left join (
  select material_id, sum(quantity) as total_purchased
  from material_purchases group by material_id
) p on p.material_id = m.id
left join (
  select material_id, sum(quantity_used) as total_used
  from field_activities where material_id is not null group by material_id
) fa on fa.material_id = m.id
left join (
  select package_material_id, sum(packages_count) as total_packages
  from processing_records where package_material_id is not null group by package_material_id
) pk on pk.package_material_id = m.id
left join (
  select label_material_id, sum(labels_count) as total_labels
  from processing_records where label_material_id is not null group by label_material_id
) lb on lb.label_material_id = m.id;

-- =============================================
-- Row Level Security
-- =============================================

alter table organizations         enable row level security;
alter table processing_facilities enable row level security;
alter table processing_sources    enable row level security;
alter table processing_steps      enable row level security;

-- 基礎資料：所有登入者可讀，admin 可寫
do $$ declare t text;
begin
  foreach t in array array[
    'organizations','processing_facilities'
  ] loop
    execute format('
      create policy "%s: authenticated can read" on %s for select using (auth.uid() is not null);
      create policy "%s: admin can insert" on %s for insert with check (is_admin());
      create policy "%s: admin can update" on %s for update using (is_admin());
      create policy "%s: admin can delete" on %s for delete using (is_admin());
    ', t,t, t,t, t,t, t,t);
  end loop;
end $$;

-- 產銷記錄：sales + admin 可寫
do $$ declare t text;
begin
  foreach t in array array[
    'processing_sources','processing_steps'
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

grant all on organizations, processing_facilities, processing_sources, processing_steps to authenticated;
grant select on material_stock_view to authenticated;
