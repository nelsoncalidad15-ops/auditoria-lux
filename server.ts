import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Google Sheets Proxy to avoid CORS and handle parsing with high-reliability CSV fallback
  app.get("/api/sheets/:sheetId/:gid", async (req, res) => {
    try {
      const { sheetId, gid } = req.params;
      const gvizUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&gid=${gid}&headers=0`;
      
      try {
        const response = await axios.get(gvizUrl, { timeout: 6000 });
        const matchResult = response.data.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);/);
        if (matchResult && matchResult[1]) {
          const data = JSON.parse(matchResult[1]);
          return res.json(data);
        }
        throw new Error("Gviz setResponse match failed");
      } catch (gvizError) {
        console.warn(`Gviz fetch failed for GID ${gid}, attempting robust CSV fallback...`, gvizError.message);
        
        // CSV Fallback URL - works automatically for Link-shared spreadsheets
        const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
        const csvResponse = await axios.get(csvUrl, { timeout: 6000 });
        
        // Multi-line safe CSV parsing into Gviz table format
        const rows: any[] = [];
        const lines = csvResponse.data.split(/\r?\n/);
        let currentCells: any[] = [];
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
                i++; // skip escaped quote
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
        
        res.json({ table: { rows } });
      }
    } catch (error) {
      console.error("Error fetching or parsing sheet:", error);
      res.status(500).json({ error: "Failed to fetch sheet data" });
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
