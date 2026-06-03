import axios from "axios";

async function test() {
  const sheetId = '16kPaOjXPXSzZFzIgVnbBfRjDh6j7SCVO';
  
  try {
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&gid=171658238&headers=0`;
    const res = await axios.get(url);
    const jsonStr = res.data.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);/)[1];
    const data = JSON.parse(jsonStr);
    
    console.log('=== SERVICIOS GVIZ ROWS (Rows 7 to 27) ===');
    data.table.rows.forEach((row, idx) => {
      if (!row || !row.c) return;
      const colA = row.c[0]?.v ?? '';
      const colB = row.c[1]?.v ?? '';
      const colE = row.c[4]?.v ?? '';
      const colF = row.c[5]?.v ?? '';
      
      if (idx >= 4 && idx <= 30) {
        console.log(`JSON Index ${idx}: Col A: ${colA} | Col B: ${colB} | Col E: ${String(colE).substring(0, 30)} | Col F: ${String(colF).substring(0, 30)}`);
      }
    });
  } catch(e) { console.error(e); }
}

test();
