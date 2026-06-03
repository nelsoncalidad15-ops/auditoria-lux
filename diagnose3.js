import axios from "axios";

async function test() {
  const sheetId = '16kPaOjXPXSzZFzIgVnbBfRjDh6j7SCVO';
  
  // 1. Citas Presencial (GID 1444184392)
  try {
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&gid=1444184392&headers=0`;
    const res = await axios.get(url);
    const jsonStr = res.data.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);/)[1];
    const data = JSON.parse(jsonStr);
    
    console.log('=== CITAS PRESENCIAL BOTH EMPTY AND FULL (Indices 15 to 26) ===');
    for (let i = 15; i <= 26; i++) {
      const row = data.table.rows[i];
      if (!row) {
        console.log(`Index ${i} (Row ${i+1}): UNDEFINED ROW`);
        continue;
      }
      if (!row.c) {
        console.log(`Index ${i} (Row ${i+1}): EMPTY ROW (No cells)`);
        continue;
      }
      const vals = row.c.map((cell, cidx) => `${cidx}: ${cell?.v ?? 'null'}`).join(' | ');
      console.log(`Index ${i} (Row ${i+1}): ${vals}`);
    }
  } catch(e) { console.error(e); }

  // 2. Citas Call (GID 1560292346)
  try {
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&gid=1560292346&headers=0`;
    const res = await axios.get(url);
    const jsonStr = res.data.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);/)[1];
    const data = JSON.parse(jsonStr);
    
    console.log('=== CITAS CALL BOTH EMPTY AND FULL (Indices 10 to 25) ===');
    for (let i = 10; i <= 25; i++) {
      const row = data.table.rows[i];
      if (!row) {
        console.log(`Index ${i} (Row ${i+1}): UNDEFINED ROW`);
        continue;
      }
      if (!row.c) {
        console.log(`Index ${i} (Row ${i+1}): EMPTY ROW (No cells)`);
        continue;
      }
      const vals = row.c.map((cell, cidx) => `${cidx}: ${cell?.v ?? 'null'}`).join(' | ');
      console.log(`Index ${i} (Row ${i+1}): ${vals}`);
    }
  } catch(e) { console.error(e); }
}

test();
