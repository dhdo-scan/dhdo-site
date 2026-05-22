// DHDO Form Submission Handler
// Paste this into Google Apps Script (Extensions → Apps Script)
// Then: Deploy → New Deployment → Web App → Execute as: Me → Who has access: Anyone → Deploy

var SHEET_ID = '1YM3bjUryuq2mkGh_mCHUjCEG34w7RvN8WE5_2SHwDdU';

var LANDING_HEADERS = [
  'Timestamp', 'Name', 'Email', 'Phone', 'Best Time',
  'Preferred Date', 'Backup Date', 'Property Type',
  'Avoid', 'Secondary Name', 'Secondary Phone', 'Notes'
];

var INTAKE_HEADERS = [
  'Timestamp', 'Address', 'City / State / ZIP', 'Property Type',
  'Sq Footage', 'Stories', 'Year Built', 'Access Notes',
  'Items With Receipts', 'Items Without Receipts',
  'High-Value Items', 'Serial Numbers',
  'Secondary Name', 'Secondary Relationship', 'Secondary Email', 'Secondary Phone',
  'General Notes',
  'Ack: Item Repositioning', 'Ack: Scan Ready',
  'Ack: Receipt Cutoff', 'Ack: Payment Terms', 'Ack: Privacy'
];

function doPost(e) {
  try {
    var ss    = SpreadsheetApp.openById(SHEET_ID);
    var data  = e.parameter;
    var type  = data.form_type === 'intake' ? 'intake' : 'landing';

    var sheetName = type === 'intake' ? 'Intake Submissions' : 'Landing Submissions';
    var headers   = type === 'intake' ? INTAKE_HEADERS : LANDING_HEADERS;

    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }

    // Write headers if sheet is brand new
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length)
        .setFontWeight('bold')
        .setBackground('#2E1A47')
        .setFontColor('#C9A24E');
      sheet.setFrozenRows(1);
    }

    var ts = Utilities.formatDate(
      new Date(), 'America/Chicago', 'MM/dd/yyyy HH:mm:ss'
    );

    var row;

    if (type === 'landing') {
      row = [
        ts,
        data.name            || '',
        data.email           || '',
        data.phone           || '',
        data.best_time       || '',
        data.preferred_date  || '',
        data.backup_date     || '',
        data.property_type   || '',
        data.avoid           || '',
        data.secondary_name  || '',
        data.secondary_phone || '',
        data.notes           || ''
      ];
    } else {
      row = [
        ts,
        data.address              || '',
        data.city_state_zip       || '',
        data.property_type        || '',
        data.sqft                 || '',
        data.stories              || '',
        data.year_built           || '',
        data.access_notes         || '',
        data.items_with_receipts  || '',
        data.items_no_receipts    || '',
        data.high_value_items     || '',
        data.serial_numbers       || '',
        data.secondary_name       || '',
        data.secondary_relationship || '',
        data.secondary_email      || '',
        data.secondary_phone      || '',
        data.general_notes        || '',
        data.ack_items      ? 'Yes' : 'No',
        data.ack_scanready  ? 'Yes' : 'No',
        data.ack_receipts   ? 'Yes' : 'No',
        data.ack_payment    ? 'Yes' : 'No',
        data.ack_privacy    ? 'Yes' : 'No'
      ];
    }

    sheet.appendRow(row);

    // Auto-resize columns for readability
    sheet.autoResizeColumns(1, headers.length);

    return ContentService
      .createTextOutput(JSON.stringify({ result: 'success' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ result: 'error', error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Test function — run this manually to verify the sheet is reachable
function testConnection() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  Logger.log('Connected to: ' + ss.getName());
}
