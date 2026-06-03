import { sheetsService } from "./src/services/sheetsService.js";

async function run() {
  const qs = await sheetsService.getQuestions("Servicios", "SALTA");
  console.log(`Loaded ${qs.length} questions for Area.SERVICIOS:`);
  qs.forEach(q => {
    console.log(`- ID: ${q.id}`);
    console.log(`  Short: ${q.shortText}`);
    console.log(`  Full:  ${q.text}`);
  });
}

run();
