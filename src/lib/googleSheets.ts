/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface GoogleSheetTableCell {
  v: string | null;
}

export interface GoogleSheetTableRow {
  c: GoogleSheetTableCell[];
}

export interface GoogleSheetTable {
  rows: GoogleSheetTableRow[];
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentValue = "";
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentValue += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }

    if (char === "," && !insideQuotes) {
      currentRow.push(currentValue);
      currentValue = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (char === "\r" && nextChar === "\n") {
        i++;
      }
      currentRow.push(currentValue);
      if (currentRow.some((cell) => cell.trim().length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentValue = "";
      continue;
    }

    currentValue += char;
  }

  if (currentValue.length > 0 || currentRow.length > 0) {
    currentRow.push(currentValue);
    if (currentRow.some((cell) => cell.trim().length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

export function csvRowsToTable(rows: string[][]): GoogleSheetTable {
  return {
    rows: rows.map((row) => ({
      c: row.map((value) => ({ v: value })),
    })),
  };
}

export async function fetchCsvRows(csvUrl: string): Promise<string[][]> {
  const response = await fetch(csvUrl, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Sheet CSV request failed with status ${response.status}`);
  }
  const text = await response.text();
  return parseCsv(text);
}

export async function fetchGoogleSheetTable(sheetId: string, gid: string): Promise<GoogleSheetTable> {
  const gvizUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&gid=${gid}&headers=0`;

  try {
    const response = await fetch(gvizUrl, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`GViz request failed with status ${response.status}`);
    }

    const text = await response.text();
    const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);/);
    if (!match || !match[1]) {
      throw new Error("GViz response format was not recognized");
    }

    const parsed = JSON.parse(match[1]);
    if (!parsed.table?.rows) {
      throw new Error("GViz payload did not include table rows");
    }

    return parsed.table as GoogleSheetTable;
  } catch (gvizError) {
    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
    const rows = await fetchCsvRows(csvUrl);
    if (rows.length === 0) {
      throw gvizError;
    }
    return csvRowsToTable(rows);
  }
}
