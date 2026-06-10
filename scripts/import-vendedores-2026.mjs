import XLSX from 'xlsx';

const wb = XLSX.readFile('C:/Users/Usuario/Downloads/26 CN Planilha Vendedores 2026 (Cidade Nobre).xlsx');

const VENDEDORES = {
  Iana: 'fc80fe04-6566-444b-93d3-da8e2b34551b',
  Andre: 'f32326db-22dc-4ede-9f29-79167ecac2ce',
};
const CRIADO_POR = '2d34d4e7-eb46-4878-955d-c641842f26cf'; // Jorge (gestor)

const SHEET_MONTH = { Jan: ['Jan', 1], Fev: ['Feb', 2], Mar: ['Mar', 3], Abr: ['Apr', 4], Mai: ['May', 5], Jun: ['Jun', 6] };

function money(s) {
  if (s === null || s === undefined) return null;
  s = String(s).replace(/R\$/g, '').replace(/,/g, '').trim();
  if (s === '' || s === '-' || s === '#DIV/0!' || s === '#VALUE!' || s === '-----' || s === 'Feriado' || s === 'AT') return null;
  const v = parseFloat(s);
  return isNaN(v) ? null : v;
}
function intval(s) {
  const v = money(s);
  return v === null ? null : Math.round(v);
}

const distRows = [];
const lancRows = [];

for (const [sheetName, [monthAbbr, monthNum]] of Object.entries(SHEET_MONTH)) {
  const ws = wb.Sheets[sheetName];
  if (!ws) continue;
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false });
  const header0 = data[0] || [];

  for (const [vendName, vendId] of Object.entries(VENDEDORES)) {
    const startCol = header0.findIndex((c) => c === vendName);
    if (startCol === -1) continue; // vendor not present this month

    for (let r = 2; r < data.length; r++) {
      const row = data[r];
      if (!row || row.length === 0) continue;
      const diaCell = row[startCol];
      const weekday = row[startCol + 1];
      if (!diaCell || typeof diaCell !== 'string') continue;
      const m = diaCell.match(/^(\d{1,2})-([A-Za-z]{3})$/);
      if (!m) continue; // skip "Semanal"/"Mensal" rows
      const [, dayStr, monAbbr] = m;
      if (monAbbr !== monthAbbr) continue; // belongs to adjacent month, skip (handled by its own sheet)
      const day = parseInt(dayStr, 10);

      const atendRaw = row[startCol + 2];
      const pecasRaw = row[startCol + 3];
      const cotaRaw = row[startCol + 5];
      const vendaRaw = row[startCol + 6];

      const dateStr = `2026-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      if (atendRaw === '-----') continue; // vendor didn't exist yet, skip entirely

      let situacaoDist = 'normal';
      let cota = money(cotaRaw);
      if (cotaRaw === 'Feriado' || atendRaw === 'Feriado') {
        situacaoDist = 'feriado';
        cota = 0;
      } else if (cota === null) {
        cota = 0;
      }

      distRows.push({ vendId, data: dateStr, cota, situacao: situacaoDist });

      if (situacaoDist === 'feriado') continue;

      if (atendRaw === 'AT') {
        lancRows.push({ vendId, data: dateStr, atend: 0, pecas: 0, valor: 0, situacao: 'atestado' });
        continue;
      }

      const atend = intval(atendRaw);
      const pecas = intval(pecasRaw);
      const venda = money(vendaRaw);
      if (atend === null && venda === null) continue; // future day, no data yet

      lancRows.push({ vendId, data: dateStr, atend: atend ?? 0, pecas: pecas ?? 0, valor: venda ?? 0, situacao: 'normal' });
    }
  }
}

console.log('-- distribuicao_diaria:', distRows.length, 'rows');
console.log('-- lancamentos:', lancRows.length, 'rows');

let sql = '';
for (const r of distRows) {
  sql += `INSERT INTO distribuicao_diaria (vendedor_id, data, cota_valor, cota_atendimentos, cota_pecas, situacao) VALUES ('${r.vendId}', '${r.data}', ${r.cota}, 0, 0, '${r.situacao}') ON CONFLICT (vendedor_id, data) DO UPDATE SET cota_valor=EXCLUDED.cota_valor, situacao=EXCLUDED.situacao;\n`;
}
for (const r of lancRows) {
  sql += `INSERT INTO lancamentos (vendedor_id, data, atendimentos, pecas, valor, situacao_vendedor, criado_por) VALUES ('${r.vendId}', '${r.data}', ${r.atend}, ${r.pecas}, ${r.valor}, '${r.situacao}', '${CRIADO_POR}');\n`;
}

import { writeFileSync } from 'fs';
writeFileSync('scripts/out-vendedores-2026.sql', sql);
console.log('written scripts/out-vendedores-2026.sql, total lines:', sql.split('\n').length);
