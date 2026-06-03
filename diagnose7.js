import axios from "axios";

async function test() {
  const sheetId = '16kPaOjXPXSzZFzIgVnbBfRjDh6j7SCVO';
  
  try {
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&gid=171658238&headers=0`;
    const res = await axios.get(url);
    const jsonStr = res.data.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);/)[1];
    const data = JSON.parse(jsonStr);
    
    console.log('=== SERVICIOS FIRST 30 ROWS ===');
    for (let idx = 0; idx < 30; idx++) {
      const row = data.table.rows[idx];
      if (!row) {
        console.log(`JSON Index ${idx}: UNDEFINED ROW`);
        continue;
      }
      if (!row.c) {
        console.log(`JSON Index ${idx}: EMPTY CELLS`);
        continue;
      }
      const colA = row.c[0]?.v ?? '';
      const colB = row.c[1]?.v ?? '';
      const colE = row.c[4]?.v ?? '';
      const colF = row.c[5]?.v ?? '';
      console.log(`JSON Index ${idx}: A: ${colA} | B: ${colB} | E: ${String(colE).substring(0, 30)} | F: ${String(colF).substring(0, 30)}`);
    }
  } catch(e) { console.error(e); }
}

test();
