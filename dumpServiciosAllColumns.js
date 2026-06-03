import axios from 'axios';

async function run() {
  const sheetId = '16kPaOjXPXSzZFzIgVnbBfRjDh6j7SCVO';
  const gid = '171658238';
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&gid=${gid}&headers=0`;
  
  try {
    const res = await axios.get(url);
    const jsonStr = res.data.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);/)[1];
    const data = JSON.parse(jsonStr);
    const rows = data.table.rows;
    
    console.log("=== COLUMNS FOR ROW 7 (index 6) ===");
    const row = rows[6];
    if (row && row.c) {
      row.c.forEach((cell, idx) => {
        console.log(`Col ${String.fromCharCode(65 + idx)} (idx ${idx}): ${cell?.v ?? cell?.f ?? ''}`);
      });
    }
  } catch(e) {
    console.error(e);
  }
}

run();
