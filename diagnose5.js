import axios from "axios";

async function test() {
  const sheetId = '16kPaOjXPXSzZFzIgVnbBfRjDh6j7SCVO';
  
  // 1. Citas Presencial (GID 1444184392)
  try {
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&gid=1444184392&headers=0`;
    const res = await axios.get(url);
    const jsonStr = res.data.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);/)[1];
    const data = JSON.parse(jsonStr);
    
    console.log('=== CITAS PRESENCIAL GVIZ ROWS ===');
    data.table.rows.forEach((row, i) => {
      if (!row || !row.c) return;
      const colA = row.c[0]?.v ?? '';
      const colD = row.c[3]?.v ?? '';
      const colE = row.c[4]?.v ?? '';
      console.log(`JSON Index ${i}: Col A (ID): ${colA} | Col D (Question): ${String(colD).substring(0, 40)} | Col E (Criteria): ${String(colE).substring(0, 40)}`);
    });
  } catch(e) { console.error(e); }

  // 2. Citas Call (GID 1560292346)
  try {
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&gid=1560292346&headers=0`;
    const res = await axios.get(url);
    const jsonStr = res.data.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);/)[1];
    const data = JSON.parse(jsonStr);
    
    console.log('=== CITAS CALL GVIZ ROWS ===');
    data.table.rows.forEach((row, i) => {
      if (!row || !row.c) return;
      const colA = row.c[0]?.v ?? '';
      const colD = row.c[3]?.v ?? '';
      const colE = row.c[4]?.v ?? '';
      console.log(`JSON Index ${i}: Col A (ID): ${colA} | Col D (Question): ${String(colD).substring(0, 40)} | Col E (Criteria): ${String(colE).substring(0, 40)}`);
    });
  } catch(e) { console.error(e); }
}

test();
