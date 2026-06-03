/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Area } from "./types";

export const SHEET_ID_SALTA = "16kPaOjXPXSzZFzIgVnbBfRjDh6j7SCVO";
export const SHEET_ID_JUJUY = "1N7ImPESSVPjQBHmmcRPl7h1zsMnwG1lHHmoK_vfboA0";

export const GID_MAPPING: Record<Area, string | string[]> = {
  [Area.CITAS_CALL]: "1560292346",
  [Area.CITAS_PRESENCIAL]: "1444184392",
  [Area.SERVICIOS]: "171658238",
  [Area.REPUESTOS]: ["963206056", "280963052"],
  [Area.TALLER]: "824402914",
  [Area.ORDENES]: "541041887",
  [Area.GESTION_PVT]: "1087445563",
};

// Advisors per area (hardcoded as fallback or initial set based on prompt)
export const ADVISORS = {
  SALTA: {
    CALL: ["Joana Orsilli", "Maria Mangini", "Alejandra Olivo", "Luciana Fernandez", "Dana Sarapura"],
    PRESENCIAL: ["Oscar Tolaba"],
    // Others should be fetched from sheets if possible
  }
};
