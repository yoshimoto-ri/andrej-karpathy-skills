# 農業生產管理系統

有機/友善農業生產履歷與產銷管理後台。三種角色：管理員（Admin）、田間作業員、產銷人員。

## 本機開發（Chromebook Linux）

```bash
cd farm-system
cp .env.example .env   # 填入 Supabase URL 與 anon key
npm install
npm run dev            # http://localhost:5173
```

## 初次設定

1. 到 Supabase SQL Editor 執行 `supabase/schema.sql`，再依序執行 `supabase/migrations/` 內的增量 SQL
2. 在登入頁註冊第一個帳號
3. 到 SQL Editor 把自己升級為管理員：

```sql
update profiles set role = 'admin', user_name = '你的名字'
where email = 'your@email.com';
```

4. 重新整理網頁，即可看到完整管理選單

## 角色權限

| 模組 | Admin | 田間作業員 | 產銷人員 |
|------|:---:|:---:|:---:|
| 資材庫 / 田區 / 作物 / 契作 | 讀寫 | 唯讀 | 唯讀 |
| 栽種週期 / 環境 / 田間作業 | 讀寫 | 讀寫 | 唯讀 |
| 農損紀錄 | 讀寫 | 讀寫 | 讀寫 |
| 採收 / 包裝 / 出貨 | 讀寫 | 唯讀 | 讀寫 |
| 帳號管理 / 刪除任何資料 | ✓ | | |

## 開發進度

- [x] 階段一：權限帳號、資材庫、採購、田區、作物、契作合約
- [ ] 階段二：栽種週期、環境紀錄、田間作業（施藥自動鎖採收）、農損
- [ ] 階段三：採收批號、洗選包裝、出貨
- [ ] 消費者溯源頁：免登入以批號查詢（商品 QR / 商城連結 → `/trace/{lot_no}`）生產履歷與生產者公開資料。
      公開資料走專用 security definer view：僅已出貨批次、僅安全欄位（排除 id_number/phone 等個資），
      供未來商城以 lot_no 回溯原始農產批次
- [ ] 階段四：成本分析、產銷平衡稽核表、驗證報表、溯源查詢
