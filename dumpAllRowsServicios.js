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
    
    console.log("=== ALL SERVICIOS ROWS (1-35) ===");
    for (let r = 0; r < 35; r++) {
      const row = rows[r];
      if (row) {
        const getColStr = (idx) => {
          if (!row.c || !row.c[idx]) return '';
          return String(row.c[idx].v ?? row.c[idx].f ?? '').trim();
        };
        const b = getColStr(1);
        const c = getColStr(2);
        const d = getColStr(3);
        const e = getColStr(4);
        const f = getColStr(5);
        console.log(`Row ${r + 1}: B="${b}", C="${c}", D="${d}", E="${e}"`);
      }
    }
  } catch(e) {
    console.error(e);
  }
}

run();
