import axios from 'axios';

async function run() {
  const sheetId = "1N7ImPESSVPjQBHmmcRPl7h1zsMnwG1lHHmoK_vfboA0"; // JUJUY
  const gid = '171658238';
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&gid=${gid}&headers=0`;
  
  try {
    const res = await axios.get(url);
    const jsonStr = res.data.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);/)[1];
    const data = JSON.parse(jsonStr);
    console.log("JUJUY SERVICIOS GID 171658238 SUCCESS! Rows count:", data.table.rows.length);
  } catch(e) {
    console.error("JUJUY SERVICIOS FETCH FAILED:", e.message);
  }
}

run();
