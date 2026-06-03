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
    
    console.log("=== RAW SERVICIOS SHEET DUMP ===");
    rows.forEach((row, idx) => {
      const colE_cell = row?.c?.[4];
      const colF_cell = row?.c?.[5];
      const colE_val = colE_cell?.v ?? colE_cell?.f ?? '';
      const colF_val = colF_cell?.v ?? colF_cell?.f ?? '';
      console.log(`Row ${idx+1} (idx ${idx}):`);
      console.log(`  Col E (len ${colE_val.length}): ${String(colE_val).substring(0, 100)}`);
      console.log(`  Col F (len ${colF_val.length}): ${String(colF_val).substring(0, 100)}`);
    });
  } catch(e) {
    console.error(e);
  }
}

run();
