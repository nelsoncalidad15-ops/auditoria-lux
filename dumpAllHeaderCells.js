import axios from "axios";

async function run() {
  const sheetId = '16kPaOjXPXSzZFzIgVnbBfRjDh6j7SCVO';
  const gid = '171658238';
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&gid=${gid}&headers=0`;
  
  try {
    const res = await axios.get(url);
    const jsonStr = res.data.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);/)[1];
    const data = JSON.parse(jsonStr);
    const rows = data.table.rows;
    
    console.log("=== FULL MATRIX OF ROWS 1-10 ===");
    for (let r = 0; r < 10; r++) {
      const row = rows[r];
      if (row && row.c) {
        console.log(`\n--- Row ${r + 1} ---`);
        row.c.forEach((cell, c_idx) => {
          const val = cell?.v ?? cell?.f ?? '';
          if (val !== null && val !== undefined && String(val).trim().length > 0) {
            console.log(`  Col ${String.fromCharCode(65 + c_idx)} (idx ${c_idx}): "${val}"`);
          }
        });
      }
    }
  } catch(e) {
    console.error(e);
  }
}

run();
