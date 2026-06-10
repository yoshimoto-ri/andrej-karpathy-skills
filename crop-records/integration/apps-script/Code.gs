/**
 * 產銷履歷農事紀錄試算表_TAP_Database — 自動化寫入端點
 *
 * 安裝步驟：
 * 1. 開啟試算表 → 擴充功能 → Apps Script
 * 2. 刪除預設內容，貼上本檔全部程式碼，儲存
 * 3. 右上角「部署」→「新增部署作業」→ 類型選「網頁應用程式」
 *    - 執行身分：我
 *    - 誰可以存取：任何人
 * 4. 按「部署」並複製「網頁應用程式 URL」
 * 5. 回到農作物生產履歷 APP → 設定 → 自動化系統對接 → 貼上該網址並儲存
 */

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(data.sheet);
    if (!sheet) return out({ error: '找不到工作表: ' + data.sheet });
    if (!data.row || !data.row.length) return out({ error: 'row 不可為空' });
    sheet.appendRow(data.row);
    return out({ ok: true });
  } catch (err) {
    return out({ error: String(err) });
  }
}

function out(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
