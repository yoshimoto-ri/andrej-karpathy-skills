-- =============================================
-- 001: 農民官方身分資料 + 地籍/農地資料
-- （自 crop-records 線的 schema 移植，改為本系統單一組織 + my_role() 權限風格）
-- 適用：已執行過 schema.sql 的專案，於 SQL Editor 貼上執行
-- =============================================

-- =============================================
-- 農民（官方身分資料，供認證/申報用，獨立於登入帳號 profiles）
-- =============================================

create table if not exists farmers (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  id_number     text not null unique,   -- 身分證字號
  phone         text,
  email         text,
  farmer_no     text,                   -- 農民編號
  class_ser_no  text,                   -- 產銷班班員編號
  status        text not null default 'active' check (status in ('active','inactive')),
  notes         text,
  created_at    timestamptz not null default now()
);

-- =============================================
-- 地籍/農地（官方地籍資料，可關聯農民與田區）
-- =============================================

create table if not exists farmlands (
  id                   uuid primary key default gen_random_uuid(),
  farmer_id            uuid references farmers(id) on delete set null,
  field_id             uuid references fields(id) on delete set null,  -- 對應系統田區
  city                 text not null,      -- 縣市
  town                 text not null,      -- 鄉鎮市區
  section              text,               -- 段
  section_sub          text,               -- 小段
  lot_no_main          text,               -- 地號（母號）
  lot_no_sub           text,               -- 地號（子號）
  is_river_land        boolean not null default false,  -- 河川地
  land_area_sqm        numeric(10,2),      -- 土地面積
  cultivable_area_sqm  numeric(10,2),      -- 可耕作面積
  notes                text,
  created_at           timestamptz not null default now()
);

-- =============================================
-- 地籍持分人清單
-- =============================================

create table if not exists farmland_owners (
  id               uuid primary key default gen_random_uuid(),
  farmland_id      uuid not null references farmlands(id) on delete cascade,
  owner_name       text not null,
  owner_id_number  text,
  owner_area_sqm   numeric(10,2)
);

create index on farmlands(farmer_id);
create index on farmlands(field_id);
create index on farmland_owners(farmland_id);

-- =============================================
-- Row Level Security（比照基礎資料：所有已登入者可讀，admin 可寫）
-- =============================================

alter table farmers         enable row level security;
alter table farmlands       enable row level security;
alter table farmland_owners enable row level security;

do $$ declare t text;
begin
  foreach t in array array[
    'farmers','farmlands','farmland_owners'
  ] loop
    execute format('
      create policy "%s: authenticated can read" on %s for select using (auth.uid() is not null);
      create policy "%s: admin can insert" on %s for insert with check (is_admin());
      create policy "%s: admin can update" on %s for update using (is_admin());
      create policy "%s: admin can delete" on %s for delete using (is_admin());
    ', t,t, t,t, t,t, t,t);
  end loop;
end $$;

grant all on farmers, farmlands, farmland_owners to authenticated;
