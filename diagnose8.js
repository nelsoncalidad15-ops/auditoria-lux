import axios from "axios";

async function test() {
  const sheetId = '16kPaOjXPXSzZFzIgVnbBfRjDh6j7SCVO';
  
  // 1. REPUESTOS (GID 963206056)
  try {
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&gid=963206056&headers=0`;
    const res = await axios.get(url);
    const jsonStr = res.data.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);/)[1];
    const data = JSON.parse(jsonStr);
    
    console.log('=== REPUESTOS GVIZ ROWS (Rows 4 to 19) ===');
    for (let r = 4; r <= 19; r++) {
      const idx = r - 1;
      const row = data.table.rows[idx];
      if (row && row.c) {
        const colC = row.c[2]?.v ?? '';
        const colD = row.c[3]?.v ?? '';
        console.log(`Sheet Row ${r} (Index ${idx}): Col C: ${String(colC).substring(0, 30)} | Col D: ${String(colD).substring(0, 40)}`);
      } else {
        console.log(`Sheet Row ${r} (Index ${idx}): UNDEFINED`);
      }
    }
  } catch(e) { console.error(e); }

  // 2. TALLER (GID 824402914)
  try {
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&gid=824402914&headers=0`;
    const res = await axios.get(url);
    const jsonStr = res.data.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);/)[1];
    const data = JSON.parse(jsonStr);
    
    console.log('=== TALLER GVIZ ROWS (Rows 3 to 10) ===');
    for (let r = 3; r <= 10; r++) {
      const idx = r - 1;
      const row = data.table.rows[idx];
      if (row && row.c) {
        const colD = row.c[3]?.v ?? '';
        const colE = row.c[4]?.v ?? '';
        console.log(`Sheet Row ${r} (Index ${idx}): Col D: ${String(colD).substring(0, 30)} | Col E: ${String(colE).substring(0, 40)}`);
      } else {
        console.log(`Sheet Row ${r} (Index ${idx}): UNDEFINED`);
      }
    }
  } catch(e) { console.error(e); }
}

test();
