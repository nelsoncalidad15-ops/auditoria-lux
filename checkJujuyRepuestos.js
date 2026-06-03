import axios from 'axios';

async function run() {
  const sheetId = "1N7ImPESSVPjQBHmmcRPl7h1zsMnwG1lHHmoK_vfboA0"; // JUJUY
  const gid = "280963052";
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&gid=${gid}&headers=0`;
  
  try {
    const res = await axios.get(url);
    const jsonStr = res.data.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);/)[1];
    const data = JSON.parse(jsonStr);
    console.log("JUJUY REPUESTOS GID 280963052 SUCCESS!");
  } catch(e) {
    console.error("JUJUY REPUESTOS FETCH FAILED:", e.message);
  }
}

run();
