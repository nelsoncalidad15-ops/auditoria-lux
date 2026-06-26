import { AuditSession, Area } from "../types";

const DRAFT_STORAGE_KEY = "audit-lux:services-draft:v1";

export interface StoredAuditDraft {
  session: AuditSession;
  savedAt: string;
}

function canPersistDraft(session: Partial<AuditSession> | null | undefined): session is AuditSession {
  return Boolean(
    session &&
      session.auditor &&
      session.branch &&
      session.area === Area.SERVICIOS &&
      session.advisor &&
      session.date
  );
}

export function loadAuditDraft(): StoredAuditDraft | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as StoredAuditDraft;
    if (!canPersistDraft(parsed?.session)) {
      return null;
    }

    return parsed;
  } catch (error) {
    console.error("No se pudo leer el borrador de auditoria:", error);
    return null;
  }
}

export function saveAuditDraft(session: AuditSession) {
  if (typeof window === "undefined" || !canPersistDraft(session)) {
    return;
  }

  const payload: StoredAuditDraft = {
    session: {
      ...session,
      completed: false,
    },
    savedAt: new Date().toISOString(),
  };

  window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(payload));
}

export function clearAuditDraft() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(DRAFT_STORAGE_KEY);
}
