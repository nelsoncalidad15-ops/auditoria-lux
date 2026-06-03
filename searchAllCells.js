import axios from "axios";

async function run() {
  const sheetId = '1N7ImPESSVPjQBHmmcRPl7h1zsMnwG1lHHmoK_vfboA0';
  const gid = '171658238';
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&gid=${gid}&headers=0`;
  
  try {
    const res = await axios.get(url);
    const jsonStr = res.data.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);/)[1];
    const data = JSON.parse(jsonStr);
    const rows = data.table.rows;
    
    console.log("=== SCANNING WORLD ===");
    rows.forEach((row, r_idx) => {
      if (row && row.c) {
        row.c.forEach((cell, c_idx) => {
          const val = cell?.v ?? cell?.f ?? '';
          if (val) {
            const str = String(val).toLowerCase();
            if (str.includes("lópez") || str.includes("lopez") || str.includes("nahuel") || str.includes("tamara") || str.includes("padilla")) {
              console.log(`Matched row ${r_idx+1}, col ${String.fromCharCode(65 + c_idx)} (idx ${c_idx}): "${val}"`);
            }
          }
        });
      }
    });
  } catch(e) {
    console.error(e);
  }
}

run();
