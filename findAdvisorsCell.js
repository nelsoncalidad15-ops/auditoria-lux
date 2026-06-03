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
    
    console.log("=== SEARCHING ADVISOR NAMES IN CELLS ===");
    rows.forEach((row, r_idx) => {
      if (row && row.c) {
        row.c.forEach((cell, c_idx) => {
          const val = cell?.v ?? cell?.f ?? '';
          if (val && (
            String(val).toLowerCase().includes("nahuel") ||
            String(val).toLowerCase().includes("tamara") ||
            String(val).toLowerCase().includes("maximiliano") ||
            String(val).toLowerCase().includes("alexis") ||
            String(val).toLowerCase().includes("gonzalo")
          )) {
            const colLetter = String.fromCharCode(65 + c_idx);
            console.log(`Found name "${val}" at Row ${r_idx + 1}, Col ${colLetter} (idx ${c_idx})`);
          }
        });
      }
    });
  } catch(e) {
    console.error(e);
  }
}

run();
