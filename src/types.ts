/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum Auditor {
  LILIANA = "Liliana Guanuco",
  ERIC = "Eric Cardozo",
}

export const AuditorInfo = {
  [Auditor.LILIANA]: {
    name: "Liliana Guanuco",
    role: "Responsable de Calidad - Autolux",
  },
  [Auditor.ERIC]: {
    name: "Eric Cardozo",
    role: "Analista de Calidad - Autolux",
  },
};

export enum Branch {
  SALTA = "Salta",
  JUJUY = "Jujuy",
  TARTAGAL = "Tartagal",
  LA_LAJITAS = "Las Lajitas",
}

export enum Area {
  CITAS_CALL = "Citas Call",
  CITAS_PRESENCIAL = "Citas Presencial",
  SERVICIOS = "Servicios",
  TALLER = "Taller",
  REPUESTOS = "Repuestos",
  ORDENES = "Ordenes",
  GESTION_PVT = "Gestion Pvt",
}

export interface Question {
  id: string;
  text: string;
  shortText?: string;
  criteria?: string;
  category?: string;
  preFilledScore?: ScoreValue;
  responsible?: string;
}

export type ScoreValue = 1 | 0.5 | 0 | "N/A";

export interface ControlPartItem {
  num: number;
  code: string;
  name: string;
  physicalQty: number;
  systemQty: number;
  qtyMatch: number;
  physicalLoc: string;
  systemLoc: string;
  locMatch: number;
}


export interface AuditItem {
  questionId: string;
  score: ScoreValue;
  observation?: string;
  photoUrl?: string;
}

export interface AuditSession {
  auditor: Auditor;
  branch: Branch;
  area: Area;
  advisor: string;
  bookingAdvisor?: string;
  technician?: string;
  date: string;
  items: AuditItem[];
  generalObservations?: string;
  completed: boolean;
  controlParts?: ControlPartItem[];
}

export interface SectorResponsible {
  area: Area;
  role: string;
}

export const SectorResponsibles: Record<Area, string[]> = {
  [Area.CITAS_CALL]: ["Supervisora de Call"],
  [Area.CITAS_PRESENCIAL]: ["Jefe de servicios"],
  [Area.SERVICIOS]: ["Jefe de servicios"],
  [Area.TALLER]: ["Jefe de Taller"],
  [Area.REPUESTOS]: ["Jefe de repuesto"],
  [Area.ORDENES]: ["Jefe de servicios", "Jefe de Taller"],
  [Area.GESTION_PVT]: ["Jefe de taller", "Jefe de servicios", "Sub gerente", "Jefe de lavadero", "Garantías"],
};
