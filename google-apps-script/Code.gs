const SHEET_NAME = 'Auditorias';

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents || '{}');
    const sheet = getOrCreateSheet_();
    ensureHeaders_(sheet);

    sheet.appendRow([
      payload.auditId || '',
      payload.createdAt || '',
      payload.updatedAt || '',
      payload.date || '',
      payload.auditor || '',
      payload.branch || '',
      payload.area || '',
      payload.advisor || '',
      payload.bookingAdvisor || '',
      payload.technician || '',
      payload.score || '',
      payload.completed || '',
      payload.generalObservations || '',
      payload.itemsJson || '[]',
      payload.controlPartsJson || '[]',
      payload.payloadJson || '{}',
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, auditId: payload.auditId || '' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(error) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, message: 'Apps Script activo' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateSheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const existing = spreadsheet.getSheetByName(SHEET_NAME);
  return existing || spreadsheet.insertSheet(SHEET_NAME);
}

function ensureHeaders_(sheet) {
  if (sheet.getLastRow() > 0) {
    return;
  }

  sheet.appendRow([
    'auditId',
    'createdAt',
    'updatedAt',
    'date',
    'auditor',
    'branch',
    'area',
    'advisor',
    'bookingAdvisor',
    'technician',
    'score',
    'completed',
    'generalObservations',
    'itemsJson',
    'controlPartsJson',
    'payloadJson',
  ]);
}
