// Cole este arquivo em Extensões > Apps Script, dentro da planilha do grupo.
// Depois recarregue a planilha e rode o menu "🍢 Churrasco > Configurar planilha" uma vez.
const SPREADSHEET_ID = '178cuFed-Cvpwn1CVwZ59hO6NN3uv1MBqxzieRfXC-HE';
const TAB_NAME = 'Pedidos';
const SUMMARY_TAB_NAME = 'Resumo';
const HEADERS = ['Data e hora', 'Pedido ID', 'Pessoa', 'Sabor ID', 'Sabor', 'Quantidade'];
const COLUMN_WIDTHS = [150, 300, 180, 240, 320, 110];
const DEFAULT_TAB_NAMES = ['Página1', 'Pagina1', 'Planilha1', 'Sheet1', 'Folha1'];
const YELLOW = '#f6cf38';
const DARK_BROWN = '#3a2200';
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

// --------------------------------------------------------------- planilha --

function onOpen() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('🍢 Churrasco')
      .addItem('Configurar planilha', 'configurarPlanilha')
      .addSeparator()
      .addItem('Limpar pedidos', 'limparPedidos')
      .addToUi();
  } catch (error) {
    console.log('Sem interface para montar o menu: ' + error);
  }
}

// Monta as abas Pedidos e Resumo. Pode rodar quantas vezes quiser: não apaga pedido nenhum.
function configurarPlanilha() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  spreadsheet.setSpreadsheetLocale('pt_BR');
  spreadsheet.setSpreadsheetTimeZone('America/Sao_Paulo');
  prepararAbaPedidos_(spreadsheet);
  prepararAbaResumo_(spreadsheet);
  removerAbaPadrao_(spreadsheet);
  SpreadsheetApp.flush();
  avisar_('Planilha pronta', 'As abas "' + TAB_NAME + '" e "' + SUMMARY_TAB_NAME + '" estão montadas e esperando os pedidos.');
}

function limparPedidos() {
  let ui = null;
  try {
    ui = SpreadsheetApp.getUi();
  } catch (error) {
    console.log('Rodando sem interface: ' + error);
  }
  if (ui && ui.alert('Limpar pedidos', 'Isso apaga todos os pedidos já registrados. Continuar?', ui.ButtonSet.YES_NO) !== ui.Button.YES) return;
  const sheet = getSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) sheet.deleteRows(2, lastRow - 1);
  SpreadsheetApp.flush();
  avisar_('Pronto', 'A planilha está zerada. O resumo volta a contar do zero.');
}

function avisar_(titulo, mensagem) {
  try {
    const ui = SpreadsheetApp.getUi();
    ui.alert(titulo, mensagem, ui.ButtonSet.OK);
  } catch (error) {
    console.log(titulo + ': ' + mensagem);
  }
}

function prepararAbaPedidos_(spreadsheet) {
  let sheet = spreadsheet.getSheetByName(TAB_NAME);
  if (!sheet) sheet = spreadsheet.insertSheet(TAB_NAME, 0);

  const extraColumns = sheet.getMaxColumns() - HEADERS.length;
  if (extraColumns > 0 && sheet.getLastColumn() <= HEADERS.length) sheet.deleteColumns(HEADERS.length + 1, extraColumns);

  sheet.getRange(1, 1, 1, HEADERS.length)
    .setValues([HEADERS])
    .setFontWeight('bold')
    .setFontColor(DARK_BROWN)
    .setBackground(YELLOW)
    .setVerticalAlignment('middle');
  sheet.setFrozenRows(1);
  sheet.setRowHeight(1, 32);
  COLUMN_WIDTHS.forEach(function (width, index) { sheet.setColumnWidth(index + 1, width); });

  const bodyRows = sheet.getMaxRows() - 1;
  if (bodyRows > 0) {
    sheet.getRange(2, 1, bodyRows, 1).setNumberFormat('dd/mm/yyyy hh:mm');
    sheet.getRange(2, 2, bodyRows, 1).setNumberFormat('@').setFontColor('#9aa0a6');
    sheet.getRange(2, 4, bodyRows, 1).setNumberFormat('@').setFontColor('#9aa0a6');
    sheet.getRange(2, 6, bodyRows, 1).setNumberFormat('0').setHorizontalAlignment('center').setFontWeight('bold');
  }

  if (!sheet.getFilter()) sheet.getRange(1, 1, sheet.getMaxRows(), HEADERS.length).createFilter();
  sheet.setTabColor('#c0392b');
  return sheet;
}

function prepararAbaResumo_(spreadsheet) {
  let sheet = spreadsheet.getSheetByName(SUMMARY_TAB_NAME);
  if (!sheet) sheet = spreadsheet.insertSheet(SUMMARY_TAB_NAME, 1);
  const filtro = sheet.getFilter();
  if (filtro) filtro.remove();
  sheet.clear();

  sheet.getRange('A1:E1').merge()
    .setValue('🍢 CHURRASCO DA GALERA — RESUMO')
    .setFontSize(16)
    .setFontWeight('bold')
    .setBackground(YELLOW)
    .setFontColor(DARK_BROWN)
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');
  sheet.setRowHeight(1, 42);

  sheet.getRange('A2:E2').merge()
    .setValue('Tudo abaixo se atualiza sozinho conforme os pedidos caem na aba ' + TAB_NAME + '.')
    .setFontStyle('italic')
    .setFontColor('#6b5a2a')
    .setHorizontalAlignment('center');

  const indicadores = [
    ['Total de espetos', '=SUM(' + TAB_NAME + '!F2:F)', '0'],
    ['Pessoas', '=IF(COUNTA(' + TAB_NAME + '!C2:C)=0,0,COUNTUNIQUE(' + TAB_NAME + '!C2:C))', '0'],
    ['Sabores diferentes', '=IF(COUNTA(' + TAB_NAME + '!E2:E)=0,0,COUNTUNIQUE(' + TAB_NAME + '!E2:E))', '0'],
    ['Último pedido', '=IF(COUNT(' + TAB_NAME + '!A2:A)=0,"—",MAX(' + TAB_NAME + '!A2:A))', 'dd/mm/yyyy hh:mm'],
  ];
  indicadores.forEach(function (indicador, index) {
    const row = 4 + index;
    sheet.getRange(row, 1).setValue(indicador[0]).setFontWeight('bold');
    sheet.getRange(row, 2).setFormula(indicador[1]).setNumberFormat(indicador[2]).setHorizontalAlignment('left');
  });
  sheet.getRange(4, 1, indicadores.length, 2)
    .setBackground('#fff7d6')
    .setBorder(true, true, true, true, true, true, '#e0c15a', SpreadsheetApp.BorderStyle.SOLID);

  sheet.getRange('A9').setValue('👥 POR PESSOA');
  sheet.getRange('D9').setValue('🍢 POR SABOR');
  sheet.getRange('A9:B9').setFontWeight('bold').setBackground(YELLOW).setFontColor(DARK_BROWN);
  sheet.getRange('D9:E9').setFontWeight('bold').setBackground(YELLOW).setFontColor(DARK_BROWN);

  sheet.getRange('A10').setFormula(consultaResumo_('C', 'Pessoa', 'Ninguém pediu ainda.'));
  sheet.getRange('D10').setFormula(consultaResumo_('E', 'Sabor', 'A brasa ainda está apagada.'));

  [230, 110, 40, 330, 110].forEach(function (width, index) { sheet.setColumnWidth(index + 1, width); });
  sheet.setFrozenRows(2);
  sheet.setTabColor(YELLOW);
  return sheet;
}

// QUERY montado por fora para não repetir aspas: agrupa a coluna pedida e soma as quantidades.
function consultaResumo_(coluna, rotulo, vazio) {
  const consulta = 'select ' + coluna + ', sum(F) where ' + coluna + " is not null group by " + coluna +
    ' order by sum(F) desc label ' + coluna + " '" + rotulo + "', sum(F) 'Espetos'";
  return '=IFERROR(QUERY(' + TAB_NAME + '!A2:F, "' + consulta + '", 0), "' + vazio + '")';
}

function removerAbaPadrao_(spreadsheet) {
  spreadsheet.getSheets().forEach(function (sheet) {
    if (DEFAULT_TAB_NAMES.indexOf(sheet.getName()) === -1) return;
    if (sheet.getLastRow() > 0 || sheet.getLastColumn() > 0) return;
    if (spreadsheet.getSheets().length <= 1) return;
    spreadsheet.deleteSheet(sheet);
  });
}

function getSheet_() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(TAB_NAME);
  return sheet || prepararAbaPedidos_(spreadsheet);
}

// -------------------------------------------------------------------- API --

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
