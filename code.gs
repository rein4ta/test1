// Tempel di Spreadsheet: Extensions > Apps Script. Lalu Deploy > New deployment > Web app
// (Execute as: Me, Who has access: Anyone) dan salin URL-nya ke SHEET_URL di app.js.
const SHEET_NAME = "Lobby";
function doPost(e) {
  const d = JSON.parse(e.postData.contents);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) { sh = ss.insertSheet(SHEET_NAME); sh.appendRow(["Waktu", "Lobby", "Kode", "Aksi"]); sh.setFrozenRows(1); }
  sh.appendRow([new Date(), d.lobby || "", d.kode || "", d.aksi || ""]);
  return ContentService.createTextOutput(JSON.stringify({ok: true})).setMimeType(ContentService.MimeType.JSON);
}
function doGet() { return ContentService.createTextOutput("Photobox API aktif"); }
