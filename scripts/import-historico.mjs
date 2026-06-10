import XLSX from 'xlsx';

const wb = XLSX.readFile('C:/Users/Usuario/Downloads/Vendas do Cidade Nobre.xlsx');
const ws = wb.Sheets['Shopping'];
const data = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false });

function money(s) {
  if (s === null || s === undefined) return 0;
  s = String(s).replace(/R\$/g, '').replace(/,/g, '').trim();
  if (s === '-' || s === '') return 0;
  const v = parseFloat(s);
  return isNaN(v) ? 0 : v;
}
function num(s) {
  if (s === null || s === undefined) return 0;
  s = String(s).replace(/,/g, '').trim();
  const v = parseFloat(s);
  return isNaN(v) ? 0 : v;
}

const rows = [];

// 2023: venda row 2, no cota row, atend/pecas row 28
{
  const venda = data[2];
  const ap = data[28];
  for (let m = 0; m < 12; m++) {
    rows.push({ ano: 2023, mes: m + 1, venda: money(venda[m + 2]), cota: 0, atend: num(ap[1 + m * 2]), pecas: num(ap[2 + m * 2]) });
  }
}
// 2024: cota row 4, venda row 5, atend/pecas row 34
{
  const cota = data[4];
  const venda = data[5];
  const ap = data[34];
  for (let m = 0; m < 12; m++) {
    rows.push({ ano: 2024, mes: m + 1, venda: money(venda[m + 2]), cota: money(cota[m + 2]), atend: num(ap[1 + m * 2]), pecas: num(ap[2 + m * 2]) });
  }
}
// 2025: cota row 12, venda row 13, atend/pecas row 41
{
  const cota = data[12];
  const venda = data[13];
  const ap = data[41];
  for (let m = 0; m < 12; m++) {
    rows.push({ ano: 2025, mes: m + 1, venda: money(venda[m + 2]), cota: money(cota[m + 2]), atend: num(ap[1 + m * 2]), pecas: num(ap[2 + m * 2]) });
  }
}
// 2026: cota row 20, venda row 21, atend/pecas row 48 -- only Jan-Apr (months with closed data)
{
  const cota = data[20];
  const venda = data[21];
  const ap = data[48];
  for (let m = 0; m < 4; m++) {
    rows.push({ ano: 2026, mes: m + 1, venda: money(venda[m + 2]), cota: money(cota[m + 2]), atend: num(ap[1 + m * 2]), pecas: num(ap[2 + m * 2]) });
  }
}

let sql = '';
for (const r of rows) {
  sql += `INSERT INTO historico_loja (ano, mes, venda_total, cota_total, atendimentos, pecas, origem) VALUES (${r.ano}, ${r.mes}, ${r.venda}, ${r.cota}, ${r.atend}, ${r.pecas}, 'importado') ON CONFLICT (ano, mes) DO UPDATE SET venda_total=EXCLUDED.venda_total, cota_total=EXCLUDED.cota_total, atendimentos=EXCLUDED.atendimentos, pecas=EXCLUDED.pecas, origem='importado';\n`;
}
console.log(sql);
