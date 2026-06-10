/**
 * 產銷履歷農事紀錄試算表_TAP_Database — 自動化寫入端點
 *
 * 安裝步驟：
 * 1. 開啟試算表 → 擴充功能 → Apps Script（或在 script.google.com 新建專案亦可）
 * 2. 刪除預設內容，貼上本檔全部程式碼，儲存
 * 3. 先測試：上方函式選單選「testAppend」→ 按「▶執行」
 *    - 第一次會跳出「需要您 Google 帳戶的存取權」→ 按「授權」→ 選你的帳號
 *      → 若出現「Google 尚未驗證這個應用程式」→ 按「進階」→「前往(不安全)」→「允許」
 *      （這是正常流程，因為這是你自己寫的私人腳本，Google 一律先這樣警告）
 *    - 執行成功後，試算表「一般作業記錄」最下方會多一列「測試」資料，確認後可刪除該列
 * 4. 右上角「部署」→「新增部署作業」→ 類型選「網頁應用程式」
 *    - 執行身分：我
 *    - 誰可以存取：任何人
 * 5. 按「部署」並複製「網頁應用程式 URL」
 * 6. 回到農作物生產履歷 APP → 設定 → 自動化系統對接 → 貼上該網址並儲存
 *
 * 注意：doPost 無法用「▶執行」直接測試（它需要外部 POST 請求才有資料），
 *       請改跑 testAppend。
 */

// 產銷履歷農事紀錄試算表_TAP_Database 的 ID（網址中 /d/ 與 /edit 之間那串）
var SPREADSHEET_ID = '1BpQSeqYo6aqQ41tk7yNrk6cmauzdJgcqkb1xHFJPOqs';

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    return out(appendRow(data.sheet, data.row));
  } catch (err) {
    return out({ error: String(err) });
  }
}

function appendRow(sheetName, row) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return { error: '找不到工作表: ' + sheetName };
  if (!row || !row.length) return { error: 'row 不可為空' };
  sheet.appendRow(row);
  return { ok: true };
}

function out(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/** 測試用：在編輯器選這個函式按「▶執行」，會在「一般作業記錄」寫入一列測試資料 */
function testAppend() {
  var result = appendRow('一般作業記錄', [
    new Date().toISOString().slice(0, 10),
    'TEST-001', '澆灌', '測試寫入（可刪除此列）', '自動化', '由 testAppend 產生',
  ]);
  Logger.log(JSON.stringify(result));
}
