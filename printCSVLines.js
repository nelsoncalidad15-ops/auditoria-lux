import axios from "axios";

async function run() {
  const sheetId = '16kPaOjXPXSzZFzIgVnbBfRjDh6j7SCVO';
  const gid = '171658238';
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
  
  try {
    const res = await axios.get(url);
    const csv = res.data;
    const lines = csv.split(/\r?\n/);
    console.log("=== CSV LINES 6 TO 32 ===");
    for (let i = 5; i < 32; i++) {
      console.log(`Line ${i + 1}: ${lines[i] ? lines[i].substring(0, 160) : ''}`);
    }
  } catch(e) {
    console.error(e);
  }
}

run();
