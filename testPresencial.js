import { sheetsService } from "./src/services/sheetsService.js";

sheetsService.fetchSheetData = async function(sheetId, gid) {
  const axios = (await import("axios")).default;
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&gid=${gid}&headers=0`;
  const res = await axios.get(url);
  const jsonStr = res.data.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);/)[1];
  const data = JSON.parse(jsonStr);
  return data.table;
};

async function run() {
  const sheetId = '16kPaOjXPXSzZFzIgVnbBfRjDh6j7SCVO';
  try {
    const tablePresencial = await sheetsService.fetchSheetData(sheetId, "1444184392");
    console.log("=== CITAS PRESENCIAL FIRST 15 ROWS ===");
    for (let idx = 0; idx < 15; idx++) {
      const row = tablePresencial.rows[idx];
      if (row && row.c) {
        const colB = row.c[1]?.v ?? '';
        const colE = row.c[4]?.v ?? '';
        const colF = row.c[5]?.v ?? '';
        console.log(`Row ${idx+1}: B: ${colB} | E: ${String(colE).substring(0, 30)} | F: ${String(colF).substring(0, 30)}`);
      }
    }
  } catch(e) { console.error(e); }
}

run();
