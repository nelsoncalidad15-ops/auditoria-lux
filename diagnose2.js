import axios from "axios";

async function test() {
  const sheetId = '16kPaOjXPXSzZFzIgVnbBfRjDh6j7SCVO';
  
  // 1. Citas Presencial (GID 1444184392)
  try {
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&gid=1444184392&headers=0`;
    const res = await axios.get(url);
    const jsonStr = res.data.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);/)[1];
    const data = JSON.parse(jsonStr);
    
    console.log('=== CITAS PRESENCIAL SECUNDARIO (Rows 22, 23, 24) ===');
    const rows = [21, 22, 23]; // spreadsheet rows 22, 23, 24
    rows.forEach(idx => {
      const row = data.table.rows[idx];
      if (row && row.c) {
        console.log(`Row ${idx+1}: B: ${row.c[1]?.v}, C: ${row.c[2]?.v}, D: ${row.c[3]?.v}, E: ${row.c[4]?.v}`);
      }
    });
  } catch(e) { console.error(e); }

  // 2. Citas Call (GID 1560292346)
  try {
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&gid=1560292346&headers=0`;
    const res = await axios.get(url);
    const jsonStr = res.data.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);/)[1];
    const data = JSON.parse(jsonStr);
    
    console.log('=== CITAS CALL (Rows 11 to 22) ===');
    for (let idx = 10; idx <= 21; idx++) {
      const row = data.table.rows[idx];
      if (row && row.c) {
        console.log(`Row ${idx+1}: B: ${row.c[1]?.v}, C: ${row.c[2]?.v}, D: ${row.c[3]?.v}, E: ${row.c[4]?.v}`);
      }
    }
  } catch(e) { console.error(e); }
}

test();
