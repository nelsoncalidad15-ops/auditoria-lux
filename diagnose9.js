import axios from "axios";

async function test() {
  const sheetId = '16kPaOjXPXSzZFzIgVnbBfRjDh6j7SCVO';
  
  try {
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&gid=1087445563&headers=0`;
    const res = await axios.get(url);
    const jsonStr = res.data.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);/)[1];
    const data = JSON.parse(jsonStr);
    
    console.log('=== GESTION_PVT GVIZ ROWS (Rows 3 to 13) ===');
    for (let r = 3; r <= 13; r++) {
      const idx = r - 1;
      const row = data.table.rows[idx];
      if (row && row.c) {
        const colD = row.c[3]?.v ?? '';
        const colE = row.c[4]?.v ?? '';
        const colF = row.c[5]?.v ?? '';
        console.log(`Sheet Row ${r} (Index ${idx}): Col D: ${String(colD).substring(0, 30)} | Col E: ${String(colE).substring(0, 30)} | Col F: ${String(colF).substring(0, 30)}`);
      } else {
        console.log(`Sheet Row ${r} (Index ${idx}): UNDEFINED`);
      }
    }
  } catch(e) { console.error(e); }
}

test();
