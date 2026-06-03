import axios from "axios";

async function run() {
  const sheetId = '1N7ImPESSVPjQBHmmcRPl7h1zsMnwG1lHHmoK_vfboA0';
  const gid = '171658238';
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
  
  try {
    const res = await axios.get(url);
    const csv = res.data;
    console.log("CSV fetched, size:", csv.length);
    
    const lines = csv.split(/\r?\n/);
    lines.forEach((line, idx) => {
      if (line.toLowerCase().includes("lópez") || line.toLowerCase().includes("lopez") || line.toLowerCase().includes("nahuel")) {
        console.log(`Matched line ${idx+1}: "${line}"`);
      }
    });
  } catch(e) {
    console.error(e);
  }
}

run();
