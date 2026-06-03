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
    
    console.log("=== COMPARING COLUMNS ===");
    for (let r = 2; r < 25; r++) {
      const row = rows[r];
      if (row && row.c) {
        const getCol = (c) => row.c[c]?.v ?? row.c[c]?.f ?? '';
        console.log(`Row index ${r} (RowNum ${r+1}):`);
        console.log(`  Col E (idx 4, Column 5): "${getCol(4).substring(0, 40)}"`);
        console.log(`  Col F (idx 5, Column 6): "${getCol(5).substring(0, 40)}"`);
        console.log(`  Col G (idx 6, Column 7): "${getCol(6).substring(0, 40)}"`);
        console.log(`  Col H (idx 7, Column 8): "${getCol(7).substring(0, 40)}"`);
      }
    }
  } catch(e) {
    console.error(e);
  }
}

run();
