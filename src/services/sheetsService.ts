/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Area, Branch, Question, ScoreValue, ControlPartItem } from "../types";
import { GID_MAPPING, SHEET_ID_SALTA, SHEET_ID_JUJUY } from "../constants";
import { fetchGoogleSheetTable } from "../lib/googleSheets";

export const sheetsService = {
  async fetchSheetData(sheetId: string, gid: string) {
    return fetchGoogleSheetTable(sheetId, gid);
  },

  async getRepuestosControlData(branch?: Branch): Promise<ControlPartItem[]> {
    const sheetId = branch === Branch.JUJUY ? SHEET_ID_JUJUY : SHEET_ID_SALTA;
    const gid = "280963052";
    try {
      const table = await this.fetchSheetData(sheetId, gid);
      if (!table || !table.rows) return [];
      
      const parts: ControlPartItem[] = [];
      // Rows 2 to 11 correspond to indices 1 to 10 in Gviz rows.
      for (let i = 1; i <= 10; i++) {
        const row = table.rows[i];
        if (!row || !row.c) continue;
        
        const getNum = (cell: any) => cell && cell.v !== undefined ? Number(cell.v) : 0;
        const getString = (cell: any) => cell && cell.v !== undefined ? String(cell.v).trim() : "";
        const getNumOrZero = (cell: any) => cell && cell.v !== undefined ? Number(cell.v) : 0;

        const numVal = getNum(row.c[0]) || i;
        const codeVal = getString(row.c[1]);
        const nameVal = getString(row.c[2]);
        const physQtyVal = getNumOrZero(row.c[3]);
        const sysQtyVal = getNumOrZero(row.c[4]);
        
        // Cantidad coincidencia (Col F - index 5)
        const qtyMatchCell = row.c[5];
        const qtyMatchVal = qtyMatchCell && qtyMatchCell.v !== undefined && qtyMatchCell.v !== null 
          ? Number(qtyMatchCell.v) 
          : (physQtyVal === sysQtyVal ? 1 : 0);

        const physLocVal = getString(row.c[6]);
        const sysLocVal = getString(row.c[7]);

        // Ubicación coincidencia (Col I - index 8)
        const locMatchCell = row.c[8];
        const locMatchVal = locMatchCell && locMatchCell.v !== undefined && locMatchCell.v !== null
          ? Number(locMatchCell.v)
          : (physLocVal === sysLocVal ? 1 : 0);

        parts.push({
          num: numVal,
          code: codeVal,
          name: nameVal,
          physicalQty: physQtyVal,
          systemQty: sysQtyVal,
          qtyMatch: qtyMatchVal,
          physicalLoc: physLocVal,
          systemLoc: sysLocVal,
          locMatch: locMatchVal
        });
      }
      return parts;
    } catch (error) {
      console.error("Error fetching Repuestos control parts data:", error);
      return [];
    }
  },

  async getAdvisors(branch: Branch, area: Area): Promise<string[]> {
    const citasCallAdvisors = ["Joana Orsilli", "Maria Mangini", "Alejandra Olivo", "Luciana Fernandez", "Dana Sarapura"];

    if (branch === Branch.SALTA) {
      if (area === Area.CITAS_CALL) return citasCallAdvisors;
      if (area === Area.CITAS_PRESENCIAL) return ["Oscar Tolaba"];
      if (area === Area.SERVICIOS) return ["López Nahuel", "Padilla Tamara", "Ontiveros Maximiliano", "Andrada Alexis", "García Gonzalo"];
      if (area === Area.TALLER) {
        return [
          "Lopez Juan", "Quispe Marcelo", "Apaza Dante", "Alvarez Pablo", "Gomez Carlos",
          "Jaime Franco", "Fernandez Federico", "Delgado Nahuel", "Ramos Franco", "Rodriguez Matias",
          "Miranda Gonzalo", "Chauque Marcos", "Burgos Gastón", "Gaspar Nicolas", "Mendoza Ricardo",
          "Molina Facundo", "Lencina Jorge", "Gonzalez Manuel", "Pavón Facundo", "Delgado Mauro"
        ];
      }
      if (area === Area.ORDENES) {
        return [
          "López Nahuel", "Padilla Tamara", "Ontiveros Maximiliano", "Andrada Alexis", "García Gonzalo",
          "Oscar Tolaba", ...citasCallAdvisors
        ];
      }
      if (area === Area.GESTION_PVT) {
        return ["Gerente de PVT"];
      }
      if (area === Area.REPUESTOS) {
        return ["Jefe de Repuestos"];
      }
    }

    if (branch === Branch.JUJUY) {
      if (area === Area.CITAS_CALL) return citasCallAdvisors;
      if (area === Area.CITAS_PRESENCIAL) return ["Miriam Martínez"];
      if (area === Area.SERVICIOS) return ["Gutiérrez Facundo", "Cuevas Facundo", "Zumbaño Francisco"];
      if (area === Area.TALLER) {
        return [
          "Torrejón Emanuel", "Mamaní Javier", "Chiliguay Víctor", "Fasciano Augusto", "Fehleisen Federico",
          "Calderón Carlos", "Contreras Ángel", "Zapana Manuel", "Velasquez Luis", "Mamaní Raúl",
          "Guzmán Mariano", "Rios David"
        ];
      }
      if (area === Area.ORDENES) {
        return [
          "Gutiérrez Facundo", "Cuevas Facundo", "Zumbaño Francisco",
          "Miriam Martínez", ...citasCallAdvisors
        ];
      }
      if (area === Area.GESTION_PVT) {
        return ["Gerente de PVT"];
      }
      if (area === Area.REPUESTOS) {
        return ["Jefe de Repuestos"];
      }
    }

    if (branch === Branch.TARTAGAL) {
      if (area === Area.CITAS_CALL) return citasCallAdvisors;
      if (area === Area.CITAS_PRESENCIAL) return ["Alberto Justiano"];
      if (area === Area.SERVICIOS) return ["Orellana Brian"];
      if (area === Area.TALLER) {
        return ["Guerrero Jesus", "Castro Matias", "Romero Franco", "Arias Martin"];
      }
      if (area === Area.ORDENES) {
        return ["Orellana Brian", "Alberto Justiano", ...citasCallAdvisors];
      }
      if (area === Area.GESTION_PVT) {
        return ["Gerente de PVT"];
      }
      if (area === Area.REPUESTOS) {
        return ["Jefe de Repuestos"];
      }
    }

    if (branch === Branch.LA_LAJITAS) {
      if (area === Area.CITAS_CALL) return citasCallAdvisors;
      if (area === Area.CITAS_PRESENCIAL) return ["Emilio Almada"];
      if (area === Area.SERVICIOS) return ["Gabriela Castillo"];
      if (area === Area.TALLER) {
        return ["Saltos Sebastian", "Gramajo Juan", "Gramajo Leandro", "Sanchez Matias"];
      }
      if (area === Area.ORDENES) {
        return ["Gabriela Castillo", "Emilio Almada", ...citasCallAdvisors];
      }
      if (area === Area.GESTION_PVT) {
        return ["Gerente de PVT"];
      }
      if (area === Area.REPUESTOS) {
        return ["Jefe de Repuestos"];
      }
    }

    return [];
  },

  async getQuestions(area: Area, branch: Branch): Promise<Question[]> {
    // Servicios uses a standardized checklist layout. The Jujuy workbook has a
    // different structure there, so we keep Salta as the canonical source for
    // the audit questions across all branches.
    const shouldUseJujuySheet = branch === Branch.JUJUY && area !== Area.SERVICIOS;
    const sheetId = area === Area.REPUESTOS ? SHEET_ID_SALTA : (shouldUseJujuySheet ? SHEET_ID_JUJUY : SHEET_ID_SALTA);
    const gids = Array.isArray(GID_MAPPING[area]) ? (GID_MAPPING[area] as string[]) : [GID_MAPPING[area] as string];
    
    let allQuestions: Question[] = [];

    const getSafeText = (row: any, primaryIdx: number) => {
      if (!row || !row.c) return null;
      
      // Check primary column first (e.g. Column E or F)
      const p = row.c[primaryIdx];
      const pVal = p?.v ?? p?.f;
      if (pVal !== null && pVal !== undefined && String(pVal).trim().length > 0) {
        return String(pVal).trim();
      }
      
      // Fallback: search common text columns if primary is empty
      const alternatives = [4, 5, 3, 2, 1, 6];
      for (const idx of alternatives) {
        const cell = row.c[idx];
        const val = cell?.v ?? cell?.f;
        if (val && typeof val === 'string' && val.trim().length > 10) {
          return val.trim();
        }
      }
      return null;
    };

    for (const gid of gids) {
      try {
        const table = await this.fetchSheetData(sheetId, gid);
        if (!table || !table.rows) continue;

        const questions: Question[] = [];

        if (area === Area.CITAS_PRESENCIAL) {
          // Spreadsheet rows 3, 4, 5, 6, 7, 8, 9, 10, 22, 23, 24 map to these indices
          // in the trimmed Gviz/CSV table response.
          const rowMapping = [
            { rowNum: 3, idx: 2 },
            { rowNum: 4, idx: 3 },
            { rowNum: 5, idx: 4 },
            { rowNum: 6, idx: 5 },
            { rowNum: 7, idx: 6 },
            { rowNum: 8, idx: 7 },
            { rowNum: 9, idx: 8 },
            { rowNum: 10, idx: 9 },
            { rowNum: 22, idx: 10 },
            { rowNum: 23, idx: 11 },
            { rowNum: 24, idx: 12 }
          ];
          rowMapping.forEach(({ rowNum, idx }) => {
            if (table.rows[idx]) {
              const textD = getSafeText(table.rows[idx], 3); // Column D (Pregunta / Criterio)
              const textE = getSafeText(table.rows[idx], 4); // Column E (Descripción del criterio)
              if (textE || textD) {
                questions.push({
                  id: `${area}-${gid}-${rowNum}`,
                  text: textE || textD || "",
                  shortText: textD || textE || ""
                });
              }
            }
          });
        } else if (area === Area.CITAS_CALL) {
          // Spreadsheet rows 11, 12, 13, 15, 16, 17, 18, 19, 20, 21, 22 map to these indices
          // in the trimmed Gviz/CSV table response.
          const rowMapping = [
            { rowNum: 11, idx: 2 },
            { rowNum: 12, idx: 3 },
            { rowNum: 13, idx: 4 },
            { rowNum: 15, idx: 5 },
            { rowNum: 16, idx: 6 },
            { rowNum: 17, idx: 7 },
            { rowNum: 18, idx: 8 },
            { rowNum: 19, idx: 9 },
            { rowNum: 20, idx: 10 },
            { rowNum: 21, idx: 11 },
            { rowNum: 22, idx: 12 }
          ];
          rowMapping.forEach(({ rowNum, idx }) => {
            if (table.rows[idx]) {
              const textD = getSafeText(table.rows[idx], 3); // Column D (Pregunta / Criterio)
              const textE = getSafeText(table.rows[idx], 4); // Column E (Descripción del criterio)
              if (textE || textD) {
                questions.push({
                  id: `${area}-${gid}-${rowNum}`,
                  text: textE || textD || "",
                  shortText: textD || textE || ""
                });
              }
            }
          });
        } else if (area === Area.SERVICIOS) {
          // Spreadsheet row 7 corresponds to Gviz index 2 (RowNum 3 in table.rows).
          // We loop from Gviz index 2 (Pregunta 1) to index 22 (Pregunta 22).
          for (let idx = 2; idx <= 22; idx++) {
            const row = table.rows[idx];
            if (row) {
              const textE = getSafeText(row, 4); // Column E (Pregunta / Criterio title)
              const textF = getSafeText(row, 5); // Column F (Descripción del criterio - full check)
              const textG = getSafeText(row, 6); // Column G (Material Soporte - Col 7)
              const textH = getSafeText(row, 7); // Column H (Evidencia - Col 8)
              
              if (textE || textF) {
                const criteriaParts = [];
                if (textF) criteriaParts.push(textF);
                if (textG) criteriaParts.push(`Soporte: ${textG}`);
                if (textH) criteriaParts.push(`Evidencia: ${textH}`);
                
                questions.push({
                  id: `${area}-${gid}-${idx + 5}`, // Maps back exactly to Spreadsheet Row number (idx=2 is row 7)
                  text: textF || textE || "",
                  shortText: textE || textF || "",
                  criteria: criteriaParts.length > 0 ? criteriaParts.join("\n") : undefined
                });
              }
            }
          }
        } else if (area === Area.REPUESTOS) {
          if (gid === "963206056") {
            let locationPct = 0.0;
            let systemPct = 0.0;
            try {
              // Fetch control table (GID 280963052)
              const controlTable = await this.fetchSheetData(sheetId, "280963052");
              if (controlTable && controlTable.rows) {
                let locMatches = 0;
                let qtyMatches = 0;
                let validRows = 0;
                
                for (let i = 1; i <= 10; i++) {
                  const r = controlTable.rows[i];
                  if (r && r.c) {
                    validRows++;
                    const getNum = (cell: any) => cell && cell.v !== undefined ? Number(cell.v) : 0;
                    const getString = (cell: any) => cell && cell.v !== undefined ? String(cell.v).trim().toUpperCase() : "";
                    
                    const physQty = getNum(r.c[3]);
                    const sysQty = getNum(r.c[4]);
                    const qtyMatchVal = r.c[5] && r.c[5].v !== undefined && r.c[5].v !== null 
                      ? Number(r.c[5].v) 
                      : (physQty === sysQty ? 1 : 0);
                    
                    if (qtyMatchVal === 1) qtyMatches++;

                    const physLoc = getString(r.c[6]);
                    const sysLoc = getString(r.c[7]);
                    const locMatchVal = r.c[8] && r.c[8].v !== undefined && r.c[8].v !== null
                      ? Number(r.c[8].v)
                      : (physLoc.length > 0 && sysLoc.length > 0 && physLoc === sysLoc ? 1 : 0);
                    
                    if (locMatchVal === 1) locMatches++;
                  }
                }
                
                if (validRows > 0) {
                  locationPct = locMatches / validRows;
                  systemPct = qtyMatches / validRows;
                }
              }
            } catch (error) {
              console.error("Error fetching control sheet for Repuestos:", error);
            }

            let locationScore: ScoreValue = 1;
            if (locationPct >= 1.0) {
              locationScore = 1;
            } else if (locationPct >= 0.6) {
              locationScore = 0.5;
            } else {
              locationScore = 0;
            }

            let systemScore: ScoreValue = 1;
            if (systemPct >= 1.0) {
              systemScore = 1;
            } else if (systemPct >= 0.6) {
              systemScore = 0.5;
            } else {
              systemScore = 0;
            }

            // Spreadsheet rows 4 to 19 correspond to indices 1 to 16 in Gviz/CSV (since Row 3 of sheet is index 0 header).
            for (let idx = 1; idx <= 16; idx++) {
              const row = table.rows[idx];
              if (row) {
                const colCVal = row.c[2]?.v ?? row.c[2]?.f;
                const colDVal = row.c[3]?.v ?? row.c[3]?.f;
                const titleText = colCVal ? String(colCVal).trim() : null;
                const criteriaText = colDVal ? String(colDVal).trim() : null;

                if (titleText || criteriaText) {
                  // Spreadsheet Row number is index + 3 (idx 1 is Row 4, idx 16 is Row 19)
                  const qId = `${area}-${gid}-${idx + 3}`; 
                  const q: Question = {
                    id: qId,
                    text: criteriaText || titleText || "",
                    shortText: titleText || criteriaText || "",
                    responsible: "Jefe de repuestos"
                  };

                  if (idx === 6) { // Spreadsheet Row 9 (Index 6)
                    q.text = "Seguimiento de planilla de venta de accesorios. La forma de contacto puede ser telefónica (WhatsApp) o vía mail y se recomienda entregarle al cliente un catálogo de accesorios (digital).";
                  }

                  if (idx === 1) { // Spreadsheet Row 4 (Control de ubicación)
                    const recoMsg = `PRE-LLENADO AUTOMÁTICO: Ubicaciones conformes al ${(locationPct * 100).toFixed(1)}% en la hoja de Control de Repuesto. Especialmente recomendado: ${locationScore === 1 ? "1 (Cumple)" : locationScore === 0.5 ? "0.5 (Cumple Parcialmente)" : "0 (No cumple)"}.`;
                    q.criteria = criteriaText ? `${recoMsg}\n\nDetalles de evaluación:\n${criteriaText}` : recoMsg;
                    q.preFilledScore = locationScore;
                  } else if (idx === 2) { // Spreadsheet Row 5 (Control de sistema)
                    const recoMsg = `PRE-LLENADO AUTOMÁTICO: Cantidades conformes al ${(systemPct * 100).toFixed(1)}% en la hoja de Control de Repuesto. Especialmente recomendado: ${systemScore === 1 ? "1 (Cumple)" : systemScore === 0.5 ? "0.5 (Cumple Parcialmente)" : "0 (No cumple)"}.`;
                    q.criteria = criteriaText ? `${recoMsg}\n\nDetalles de evaluación:\n${criteriaText}` : recoMsg;
                    q.preFilledScore = systemScore;
                  } else if (criteriaText) {
                    q.criteria = criteriaText;
                  }

                  questions.push(q);
                }
              }
            }
          }
        } else if (area === Area.TALLER) {
          // Spreadsheet rows 3 to 10 map exactly to Gviz/CSV indices 2 to 9.
          for (let i = 2; i <= 9; i++) {
            const row = table.rows[i];
            if (row) {
              const textD = getSafeText(row, 3); // Column D (Pregunta / Criterio)
              const textE = getSafeText(row, 4); // Column E (Descripción del criterio - full check)
              if (textE || textD) {
                questions.push({
                  id: `${area}-${gid}-${i + 1}`,
                  text: textE || textD || "",
                  shortText: textD || textE || ""
                });
              }
            }
          }
        } else if (area === Area.ORDENES) {
          // Spreadsheet rows 4 to 83 on GID 541041887 correspond to Gviz/CSV indices 3 to 82.
          // Odd rows are question rows, even rows are criteria rows.
          for (let i = 3; i <= 81; i += 2) {
            const qRow = table.rows[i];
            const cRow = table.rows[i + 1];
            if (!qRow || !qRow.c) continue;
            
            const qText = getSafeText(qRow, 1); // Column B is index 1
            if (!qText) continue;
            
            // Extract criterion from Column B of the next row
            let criteriaText = "";
            if (cRow && cRow.c && cRow.c[1]) {
              const cellVal = cRow.c[1]?.v ?? cRow.c[1]?.f;
              criteriaText = cellVal ? String(cellVal).trim() : "";
            }
            
            // Extract responsible role from Column C of the first row
            let respRaw = "";
            if (qRow.c[2]) {
              const cellVal = qRow.c[2]?.v ?? qRow.c[2]?.f;
              respRaw = cellVal ? String(cellVal).trim() : "";
            }
            
            if (respRaw === "RESPONSABLE" || !respRaw) {
              respRaw = "Asesor de servicio";
            }
            
            // Map/normalize responsible names to match user categories
            let mappedResp = respRaw;
            const upperResp = respRaw.toUpperCase();
            if (upperResp.includes("CITAS") || upperResp.includes("CITA")) {
              mappedResp = "Asesora de citas";
            } else if (upperResp.includes("SERVICIO")) {
              mappedResp = "Asesor de servicio";
            } else if (upperResp.includes("TECNICO") || upperResp.includes("TÉCNICO")) {
              mappedResp = "Tecnico";
            } else if (upperResp.includes("JEFE") || upperResp.includes("LIDER") || upperResp.includes("LÍDER")) {
              mappedResp = "Líder/Jefe de Taller";
            } else if (upperResp.includes("REPUESTO")) {
              mappedResp = "Repuestos";
            }
            
            questions.push({
              id: `${area}-${gid}-${i + 1}`, // Spreadsheet Row number
              text: qText,
              shortText: qText,
              criteria: criteriaText,
              responsible: mappedResp
            });
          }
        } else if (area === Area.GESTION_PVT) {
          // Spreadsheet rows 3 to 13 correspond exactly to indices 2 to 12.
          for (let i = 2; i <= 12; i++) {
            const row = table.rows[i];
            if (!row || !row.c) continue;
            
            // Column D is index 3: Question / Criterion. Column E is index 4: Description. 
            // Column F is index 5: Responsible.
            const qText = getSafeText(row, 3);
            if (!qText) continue;
            
            let criteriaText = "";
            if (row.c[4]) {
              const cellVal = row.c[4]?.v ?? row.c[4]?.f;
              criteriaText = cellVal ? String(cellVal).trim() : "";
            }
            
            let respRaw = "";
            if (row.c[5]) {
              const cellVal = row.c[5]?.v ?? row.c[5]?.f;
              respRaw = cellVal ? String(cellVal).trim() : "";
            }
            
            // Normalize responsible name for reporting display
            let mappedResp = respRaw;
            const upperResp = respRaw.toUpperCase();
            const upperText = qText.toUpperCase();
            if (upperText.includes("QUEJAS") || upperText.includes("MANEJO DE QUEJAS")) {
              mappedResp = "Jefe de Servicios / Sub Gerente";
            } else if (upperResp.includes("JEFE DE SERVICIO") || upperResp.includes("JEFE DE SERVICIOS") || upperResp.includes("JEFA DE SERVICIOS")) {
              mappedResp = "Jefe de Servicios";
            } else if (upperResp.includes("JEFE DE TALLER") || upperResp.includes("JEFE DE TALLERES")) {
              mappedResp = "Jefe de Taller";
            } else if (upperResp.includes("LAVADERO") || upperResp.includes("LIDER DE LAVADERO") || upperResp.includes("LÍDER DE LAVADERO")) {
              mappedResp = "Líder de Lavadero";
            } else if (upperResp.includes("GARANTIA") || upperResp.includes("GARANTÍA") || upperResp.includes("LIDER DE GARANTIA") || upperResp.includes("LÍDER DE GARANTÍA") || upperResp.includes("LIDER DE GARANTIAS") || upperResp.includes("LÍDER DE GARANTÍAS")) {
              mappedResp = "Líder de Garantías";
            } else if (upperResp.includes("SUB GERENTE") || upperResp.includes("SUBGERENTE")) {
              mappedResp = "Sub Gerente";
            } else if (upperResp) {
              mappedResp = respRaw;
            } else {
              mappedResp = "Gerente de PVT"; // fallback
            }
            
            questions.push({
              id: `${area}-${gid}-${i + 1}`,
              text: qText,
              shortText: qText,
              criteria: criteriaText,
              responsible: mappedResp
            });
          }
        }
        allQuestions = [...allQuestions, ...questions];
      } catch (error) {
        console.error(`Error fetching questions for ${area} (GID ${gid}):`, error);
      }
    }

    // If no questions found (e.g. API error), return mock data for the demo
    if (allQuestions.length === 0) {
      return this.getMockQuestions(area);
    }

    return allQuestions;
  },

  getMockQuestions(area: Area): Question[] {
    if (area === Area.GESTION_PVT) {
      return [
        {
          id: `${area}-mock-0`,
          text: "¿Te implementan contramedidas acordes al problema manifestado por el cliente?",
          shortText: "Contramedidas ante reclamos",
          criteria: "Cumplimiento de reclamos correctamente gestionados >=95% = 1. Todos los reclamos generados deben ser gestionados de manera inmediata...",
          responsible: "Jefe de Servicios"
        },
        {
          id: `${area}-mock-1`,
          text: "¿El Concesionario cuenta con herramientas de mano básicas que cumplen con los lineamientos de TASA?",
          shortText: "Herramientas de mano",
          criteria: "El JT debe contar con un registro o carpeta que incluya el inventario de las herramientas entregadas a cada técnico...",
          responsible: "Jefe de Taller"
        },
        {
          id: `${area}-mock-2`,
          text: "¿Se realiza lavado integral del vehículo entregado y control de calidad?",
          shortText: "Lavado e inspección final",
          criteria: "Se debe verificar la limpieza exterior, interior, y que se realice la liberación visual...",
          responsible: "Líder de Lavadero"
        },
        {
          id: `${area}-mock-3`,
          text: "¿Se gestiona correctamente el trámite de garantía y repuestos recuperados?",
          shortText: "Trámite de garantía",
          criteria: "Verificar registro de garantías no rechazadas...",
          responsible: "Líder de Garantías"
        },
        {
          id: `${area}-mock-4`,
          text: "¿Se registran los formatos de manejo de quejas de Clientes?",
          shortText: "Registro de quejas",
          criteria: "El JS debe asegurar que las quejas sean tratadas correctamente segun el formulario y los 7 pasos registrados y autorizados por el Gerente. A. Controlar 1 el registro de 1 queja en el ultimo mes completo.",
          responsible: "Jefe de Servicios / Sub Gerente"
        }
      ];
    }

    const mocks: Record<string, string[]> = {
      [Area.CITAS_CALL]: ["¿Saluda cordialmente?", "¿Ofrece servicios adicionales?", "¿Confirma datos del cliente?"],
      [Area.SERVICIOS]: ["¿Recepción activa realizada?", "¿Explicación de trabajos a realizar?", "¿Uso de fundas protectoras?"],
      [Area.ORDENES]: ["¿Firma de orden de reparación?", "¿Inventario de vehículo realizado?", "¿Fecha de entrega pactada?"],
    };
    const texts = mocks[area] || ["Pregunta de auditoría 1", "Pregunta de auditoría 2", "Pregunta de auditoría 3"];
    return texts.map((t, i) => ({ id: `${area}-mock-${i}`, text: t, shortText: t }));
  }
};
