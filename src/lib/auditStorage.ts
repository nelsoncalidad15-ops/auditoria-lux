/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AuditSession } from "../types";
import { fetchCsvRows } from "./googleSheets";

const DEFAULT_AUDIT_HISTORY_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ7cvWEvG_Y51nsK0KjXJTNBucHadTqlng6sK0Ob9dwGSikbCSEeyhMKYLC523ayC70ddnMrB0zggud/pub?gid=0&single=true&output=csv";

const APPS_SCRIPT_URL = (import.meta.env.VITE_AUDIT_APPS_SCRIPT_URL || "").trim();
const AUDIT_HISTORY_CSV_URL = (import.meta.env.VITE_AUDIT_HISTORY_CSV_URL || DEFAULT_AUDIT_HISTORY_CSV_URL).trim();

type StoredAuditRecord = AuditSession & {
  id: string;
  score: number;
  createdAt: string;
  updatedAt: string;
};

function sanitizeText(value: string | undefined): string {
  return (value || "").replace(/\r?\n/g, " ").trim();
}

function buildStoredAudit(session: AuditSession, score: number): StoredAuditRecord {
  const timestamp = new Date().toISOString();
  const auditId =
    globalThis.crypto?.randomUUID?.() ||
    `audit-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  return {
    ...session,
    id: auditId,
    score,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function buildAppsScriptPayload(audit: StoredAuditRecord) {
  return {
    action: "appendAudit",
    auditId: audit.id,
    createdAt: audit.createdAt,
    updatedAt: audit.updatedAt,
    date: audit.date,
    auditor: audit.auditor,
    branch: audit.branch,
    area: audit.area,
    advisor: sanitizeText(audit.advisor),
    bookingAdvisor: sanitizeText(audit.bookingAdvisor),
    technician: sanitizeText(audit.technician),
    score: audit.score,
    completed: audit.completed ? "TRUE" : "FALSE",
    itemsJson: JSON.stringify(audit.items || []),
    controlPartsJson: JSON.stringify(audit.controlParts || []),
    generalObservations: sanitizeText(audit.generalObservations),
    payloadJson: JSON.stringify(audit),
  };
}

function csvRowToObject(headers: string[], row: string[]): Record<string, string> {
  return headers.reduce<Record<string, string>>((acc, header, index) => {
    acc[header] = row[index] || "";
    return acc;
  }, {});
}

function parseStoredAudit(row: Record<string, string>): StoredAuditRecord | null {
  const payloadJson = row.payloadJson?.trim();
  if (payloadJson) {
    try {
      return JSON.parse(payloadJson) as StoredAuditRecord;
    } catch (error) {
      console.error("No se pudo parsear payloadJson de auditoria:", error);
    }
  }

  const items = row.itemsJson ? JSON.parse(row.itemsJson) : [];
  const controlParts = row.controlPartsJson ? JSON.parse(row.controlPartsJson) : [];

  if (!row.auditId || !row.area || !row.branch) {
    return null;
  }

  return {
    id: row.auditId,
    createdAt: row.createdAt || "",
    updatedAt: row.updatedAt || row.createdAt || "",
    auditor: row.auditor as AuditSession["auditor"],
    branch: row.branch as AuditSession["branch"],
    area: row.area as AuditSession["area"],
    advisor: row.advisor || "",
    bookingAdvisor: row.bookingAdvisor || undefined,
    technician: row.technician || undefined,
    date: row.date || "",
    items,
    generalObservations: row.generalObservations || undefined,
    completed: (row.completed || "").toUpperCase() === "TRUE",
    controlParts,
    score: Number(row.score || 0),
  };
}

export async function saveAudit(session: AuditSession, score: number) {
  if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL.includes("REEMPLAZAR_POR_TU_SCRIPT")) {
    throw new Error("Falta configurar VITE_AUDIT_APPS_SCRIPT_URL");
  }

  const audit = buildStoredAudit(session, score);
  const payload = buildAppsScriptPayload(audit);

  const response = await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Apps Script devolvio estado ${response.status}`);
  }

  return audit.id;
}

export async function getAudits() {
  if (!AUDIT_HISTORY_CSV_URL) {
    return [];
  }

  const rows = await fetchCsvRows(AUDIT_HISTORY_CSV_URL);
  if (rows.length <= 1) {
    return [];
  }

  const [headers, ...dataRows] = rows;
  return dataRows
    .map((row) => csvRowToObject(headers, row))
    .map(parseStoredAudit)
    .filter((audit): audit is StoredAuditRecord => audit !== null)
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}
