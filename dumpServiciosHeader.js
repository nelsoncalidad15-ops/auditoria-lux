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
    
    console.log("=== HEADER COLS ===");
    for (let r = 0; r < 6; r++) {
      const row = rows[r];
      if (row && row.c) {
        const cols = row.c.map((cell, c_i) => {
          return `${String.fromCharCode(65 + c_i)}: ${cell?.v ?? cell?.f ?? ''}`;
        }).filter(s => !s.endsWith(": ")).join(" | ");
        console.log(`Row ${r+1}: ${cols}`);
      }
    }
  } catch(e) {
    console.error(e);
  }
}

run();
