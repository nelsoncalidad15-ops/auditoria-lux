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
    
    console.log("=== HEADER ROW CELLS ===");
    for (let r = 0; r < 6; r++) {
      const row = rows[r];
      if (row && row.c) {
        console.log(`Row ${r+1}:`);
        for (let colIdx = 6; colIdx < row.c.length; colIdx++) {
          const char = String.fromCharCode(65 + colIdx);
          const val = row.c[colIdx]?.v ?? row.c[colIdx]?.f ?? '';
          if (val) {
            console.log(`  Col ${char} (idx ${colIdx}): "${val}"`);
          }
        }
      }
    }
  } catch(e) {
    console.error(e);
  }
}

run();
