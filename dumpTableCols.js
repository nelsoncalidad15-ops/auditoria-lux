import axios from "axios";

async function run() {
  const sheetId = '16kPaOjXPXSzZFzIgVnbBfRjDh6j7SCVO';
  const gid = '171658238';
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&gid=${gid}&headers=0`;
  
  try {
    const res = await axios.get(url);
    const jsonStr = res.data.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);/)[1];
    const data = JSON.parse(jsonStr);
    
    console.log("=== TABLE COLS DEFINITIONS ===");
    data.table.cols.forEach((col, idx) => {
      console.log(`Col idx ${idx} (${String.fromCharCode(65 + idx)}): id="${col.id}", label="${col.label}", type="${col.type}"`);
    });
  } catch(e) {
    console.error(e);
  }
}

run();
