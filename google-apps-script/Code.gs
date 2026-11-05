// Cole este arquivo em Extensões > Apps Script, dentro da planilha do grupo.
const SPREADSHEET_ID = '178cuFed-Cvpwn1CVwZ59hO6NN3uv1MBqxzieRfXC-HE';
const TAB_NAME = 'Pedidos';
const HEADERS = ['Data e hora', 'Pedido ID', 'Pessoa', 'Sabor ID', 'Sabor', 'Quantidade'];
const FLAVORS = {
  'aipim-carne-seca': 'Aipim com carne seca',
  'almondega-mucarela': 'Almôndega com muçarela',
  'boi-alcatra-fraldinha': 'Boi (alcatra ou fraldinha)',
  'boi-contra-file': 'Boi (contrafilé)',
  'coracao-frango': 'Coração de frango',
  'costelinha-porco': 'Costelinha de porco',
  'frango-peito': 'Frango (peito)',
  'kafta': 'Kafta',
  'linguica-defumada': 'Linguiça defumada (porco)',
  'medalhao-aipim-carne-seca': 'Medalhão de aipim com carne seca',
  'medalhao-batata': 'Medalhão de batata recheada',
  'medalhao-boi': 'Medalhão de boi',
  'medalhao-cebola': 'Medalhão de cebola',
  'medalhao-coracao': 'Medalhão de coração',
  'medalhao-frango': 'Medalhão de frango',
  'medalhao-frango-mucarela': 'Medalhão de frango recheado com muçarela',
  'medalhao-mucarela': 'Medalhão de muçarela',
  'medalhao-romeu-julieta': 'Medalhão Romeu e Julieta',
  'medalhao-suino': 'Medalhão suíno',
  'medalhao-tilapia': 'Medalhão de tilápia',
  'meio-asa': 'Meio da asa (frango)',
  'mucarela': 'Muçarela',
  'peixe-tilapia': 'Peixe tilápia',
  'porco-pernil': 'Porco (pernil)',
  'salsichao': 'Salsichão',
  'sambiquira': 'Sambiquira',
  'toucinho-barriga': 'Toucinho de barriga',
  'asa-recheada': 'Asa recheada napolitana',
};

function getSheet_() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = spreadsheet.getSheetByName(TAB_NAME);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(TAB_NAME);
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold').setBackground('#f6cf38');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function response_(data, callback) {
  const json = JSON.stringify(data);
  if (callback && /^espetos_[a-f0-9]{32}$/.test(callback)) {
    return ContentService.createTextOutput(callback + '(' + json + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  try {
    const sheet = getSheet_();
    const lastRow = sheet.getLastRow();
    const values = lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues() : [];
    const rows = values.map(row => ({
      timestamp: row[0] instanceof Date ? row[0].toISOString() : String(row[0]),
      orderId: String(row[1]),
      person: String(row[2]),
      flavorId: String(row[3]),
      flavor: String(row[4]),
      quantity: Number(row[5]),
    }));
    return response_({ ok: true, rows }, e && e.parameter && e.parameter.callback);
  } catch (error) {
    return response_({ ok: false, error: String(error.message || error) }, e && e.parameter && e.parameter.callback);
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    const raw = e && e.parameter && e.parameter.payload;
    if (!raw || raw.length > 12000) throw new Error('Pedido vazio ou grande demais.');
    const order = JSON.parse(raw);
    const orderId = String(order.orderId || '');
    const person = String(order.person || '').trim().replace(/\s+/g, ' ');
    if (!/^[a-f0-9-]{36}$/.test(orderId)) throw new Error('ID de pedido inválido.');
    if (!person || person.length > 60 || /^[=+@-]/.test(person)) throw new Error('Nome inválido.');
    if (!Array.isArray(order.items) || !order.items.length || order.items.length > Object.keys(FLAVORS).length) {
      throw new Error('Escolha pelo menos um sabor.');
    }
    const seen = {};
    const items = order.items.map(item => {
      const flavorId = String(item.flavorId || '');
      const quantity = Number(item.quantity);
      if (!Object.prototype.hasOwnProperty.call(FLAVORS, flavorId) || seen[flavorId]) throw new Error('Sabor inválido.');
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) throw new Error('Quantidade inválida.');
      seen[flavorId] = true;
      return { flavorId, quantity };
    });
    lock.waitLock(20000);
    const sheet = getSheet_();
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      const existing = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
      if (existing.some(row => row[0] === orderId)) return response_({ ok: true, duplicate: true });
    }
    const now = new Date();
    const rows = items.map(item => [now, orderId, person, item.flavorId, FLAVORS[item.flavorId], item.quantity]);
    sheet.getRange(lastRow + 1, 1, rows.length, HEADERS.length).setValues(rows);
    SpreadsheetApp.flush();
    return response_({ ok: true, orderId });
  } catch (error) {
    return response_({ ok: false, error: String(error.message || error) });
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}
