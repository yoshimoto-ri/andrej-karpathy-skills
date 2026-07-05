-- =============================================
-- 002: 欄位改名，避免跨表交叉查詢時 name / status 混淆
--   name   → 實體_name（user/material/field/crop/farmer）
--   status → 實體_status（cycle/contract/farmer）
-- 適用：已執行過 schema.sql 的專案，於 SQL Editor 貼上執行
-- =============================================

alter table profiles    rename column name   to user_name;
alter table materials   rename column name   to material_name;
alter table fields      rename column name   to field_name;
alter table crop_types  rename column name   to crop_name;
alter table crop_cycles rename column status to cycle_status;
alter table contracts   rename column status to contract_status;

-- farmers 表僅在「已用舊版 001 建立」時才需要改名；
-- 新版 001 直接以 farmer_name / farmer_status 建表，此段會自動略過
do $$ begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'farmers' and column_name = 'name') then
    alter table farmers rename column name to farmer_name;
  end if;
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'farmers' and column_name = 'status') then
    alter table farmers rename column status to farmer_status;
  end if;
end $$;
