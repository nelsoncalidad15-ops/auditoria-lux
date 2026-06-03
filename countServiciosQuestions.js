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
    
    console.log("=== SCANNING SERVICIOS ROWS FOR VALID QUESTIONS ===");
    rows.forEach((row, idx) => {
      const pregVal = row.c && row.c[1]?.v;
      const colE = row.c && row.c[4]?.v;
      const colF = row.c && row.c[5]?.v;
      if (pregVal !== undefined && pregVal !== null) {
        console.log(`Gviz Index ${idx} (RowNum ${idx + 1}): Preg="${pregVal}", Col E="${colE ? colE.toString().substring(0, 30) : ''}", Col F="${colF ? colF.toString().substring(0, 30) : ''}"`);
      }
    });
  } catch(e) {
    console.error(e);
  }
}

run();
