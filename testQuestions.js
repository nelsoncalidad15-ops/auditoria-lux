import { sheetsService } from "./src/services/sheetsService.js";
import { Area, Branch } from "./src/types.js";

sheetsService.fetchSheetData = async function(sheetId, gid) {
  const axios = (await import("axios")).default;
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&gid=${gid}&headers=0`;
  const res = await axios.get(url);
  const jsonStr = res.data.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);/)[1];
  const data = JSON.parse(jsonStr);
  return data.table;
};

async function run() {
  try {
    const qs = await sheetsService.getQuestions(Area.SERVICIOS, Branch.SALTA);
    console.log(`=== ALL PARSED QUESTIONS FOR SERVICIOS (Total: ${qs.length}) ===`);
    qs.forEach((q, i) => {
      console.log(`\nQuestion #${i+1}:`);
      console.log(`  ID:        ${q.id}`);
      console.log(`  ShortText: ${q.shortText}`);
      console.log(`  ShortLen:  ${q.shortText?.length}`);
      console.log(`  Text:      ${q.text}`);
      console.log(`  TextLen:   ${q.text?.length}`);
    });
  } catch(e) {
    console.error(e);
  }
}

run();
