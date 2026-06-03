import axios from "axios";

async function test() {
  const sheetId = '16kPaOjXPXSzZFzIgVnbBfRjDh6j7SCVO';
  
  // 1. Check OR (GID 541041887) rows 4-15
  try {
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&gid=541041887&headers=0`;
    const res = await axios.get(url);
    const jsonStr = res.data.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);/)[1];
    const data = JSON.parse(jsonStr);
    console.log('--- GID 541041887 (ORDENES) ROW 4 to 12 (indexed from 3) ---');
    for (let i = 2; i <= 15; i++) {
      const row = data.table.rows[i];
      if (row && row.c) {
        console.log(`Row ${i+1}: Col A: ${row.c[0]?.v}, Col B: ${row.c[1]?.v}, Col C: ${row.c[2]?.v}`);
      }
    }
  } catch(e) {
    console.error(e);
  }

  // 2. Check CITAS PRESENCIAL (GID 1444184392)
  try {
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&gid=1444184392&headers=0`;
    const res = await axios.get(url);
    const jsonStr = res.data.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);/)[1];
    const data = JSON.parse(jsonStr);
    console.log('--- GID 1444184392 (CITAS PRESENCIAL) ROW 3 to 12 (indexed from 2) ---');
    for (let i = 1; i <= 25; i++) {
      const row = data.table.rows[i];
      if (row && row.c) {
        console.log(`Row ${i+1}: Col D: ${row.c[3]?.v}, Col E: ${row.c[4]?.v}, Col F: ${row.c[5]?.v}`);
      }
    }
  } catch(e) {
    console.error(e);
  }
}

test();
