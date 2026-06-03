import axios from "axios";

async function test() {
  const sheetId = '16kPaOjXPXSzZFzIgVnbBfRjDh6j7SCVO';
  
  // Test loading GID 1444184392 (CITAS PRESENCIAL) as CSV
  try {
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=1444184392`;
    const res = await axios.get(url, { responseType: 'text' });
    const lines = res.data.split('\n');
    console.log(`=== CITAS PRESENCIAL CSV (Total lines: ${lines.length}) ===`);
    for (let r = 1; r <= 30; r++) {
      const line = lines[r - 1];
      if (line) {
        console.log(`Sheet Row ${r}: ${line.substring(0, 100)}...`);
      } else {
        console.log(`Sheet Row ${r}: [EMPTY]`);
      }
    }
  } catch(e) {
    console.error(e);
  }

  // Test loading GID 1560292346 (CITAS CALL) as CSV
  try {
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=1560292346`;
    const res = await axios.get(url, { responseType: 'text' });
    const lines = res.data.split('\n');
    console.log(`=== CITAS CALL CSV (Total lines: ${lines.length}) ===`);
    for (let r = 1; r <= 30; r++) {
      const line = lines[r - 1];
      if (line) {
        console.log(`Sheet Row ${r}: ${line.substring(0, 100)}...`);
      } else {
        console.log(`Sheet Row ${r}: [EMPTY]`);
      }
    }
  } catch(e) {
    console.error(e);
  }
}

test();
