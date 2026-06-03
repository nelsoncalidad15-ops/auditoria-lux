import axios from "axios";

function parseCSV(csvText) {
  const rows = [];
  const lines = csvText.split(/\r?\n/);
  let currentCells = [];
  let currentVal = "";
  let insideQuotes = false;
  
  for (const line of lines) {
    if (!insideQuotes) {
      currentCells = [];
    } else {
      currentVal += "\n";
    }
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (insideQuotes && line[i + 1] === '"') {
          currentVal += '"';
          i++; 
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        currentCells.push({ v: currentVal });
        currentVal = "";
      } else {
        currentVal += char;
      }
    }
    
    if (!insideQuotes) {
      currentCells.push({ v: currentVal });
      currentVal = "";
      rows.push({ c: currentCells });
    }
  }
  return { table: { rows } };
}

async function test() {
  const sheetId = '16kPaOjXPXSzZFzIgVnbBfRjDh5j7SCVO';
  const gid = '171658238';
  try {
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
    const res = await axios.get(url);
    const parsed = parseCSV(res.data);
    
    console.log("Parsed rows count: ", parsed.table.rows.length);
    console.log("Rows around 5-15:");
    for (let i = 5; i < 15; i++) {
      const row = parsed.table.rows[i];
      if (row && row.c) {
        console.log(`Index ${i} (Row ${i+1}):`);
        row.c.forEach((cell, colIdx) => {
          const colLetter = String.fromCharCode(65 + colIdx);
          console.log(`  Col ${colLetter} (Idx ${colIdx}): ${cell?.v}`);
        });
      }
    }
  } catch(e) {
    console.error(e);
  }
}

test();
