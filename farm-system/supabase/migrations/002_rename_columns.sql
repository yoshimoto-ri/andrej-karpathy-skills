-- =============================================
-- 002: 欄位改名，避免跨表交叉查詢時 name / status 混淆
--   name   → 實體_name（user/material/field/crop/farmer）
--   status → 實體_status（cycle/contract/farmer）
-- 全部條件式執行：舊欄位存在才改名。
-- （schema.sql 已直接使用新名稱，全新安裝時本檔自動全數略過）
-- =============================================

do $$
declare
  r record;
begin
  for r in
    select * from (values
      ('profiles',    'name',   'user_name'),
      ('materials',   'name',   'material_name'),
      ('fields',      'name',   'field_name'),
      ('crop_types',  'name',   'crop_name'),
      ('farmers',     'name',   'farmer_name'),
      ('crop_cycles', 'status', 'cycle_status'),
      ('contracts',   'status', 'contract_status'),
      ('farmers',     'status', 'farmer_status')
    ) as t(tbl, old_col, new_col)
  loop
    if exists (select 1 from information_schema.columns
               where table_schema = 'public'
                 and table_name = r.tbl and column_name = r.old_col) then
      execute format('alter table %I rename column %I to %I', r.tbl, r.old_col, r.new_col);
    end if;
  end loop;
end $$;
