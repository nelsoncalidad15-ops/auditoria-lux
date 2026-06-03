/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Branch, Area } from "../types";

// 1. ENLACE GLOBAL DE PLAN DE ACCIÓN
export const GLOBAL_PLAN_ACCION_URL = "https://docs.google.com/spreadsheets/d/1UHP44vuxYq-ibf0opSxX8vX262fLhBHYJS5QqFFzwtc/edit?gid=1763038686#gid=1763038686";

// 1.5. ENLACES A CARPETAS PVT DE GOOGLE DRIVE POR SUCURSAL
export const BRANCH_PVT_FOLDER_LINKS: Record<Branch, string> = {
  [Branch.SALTA]: "https://drive.google.com/drive/u/1/folders/1XF2kS7ZajcuXyZGlHQmAHrKBDekoTJQ9",
  [Branch.JUJUY]: "https://drive.google.com/drive/u/1/folders/1uVrTuEQuOKRortPsZL_RaUnMQ_zYrFsw",
  [Branch.TARTAGAL]: "https://drive.google.com/drive/u/1/folders/1EhQKwFqY7_YaenItKCnbdRvkZNWN-sLz",
  [Branch.LA_LAJITAS]: "https://drive.google.com/drive/u/1/folders/1TpYZ3icSRnVwU-RrxrlB28N0IVJ4WEkI"
};

// 2. DESTINATARIOS GLOBALES DE CONTROL (Calidad)
export const GLOBAL_QUALITY_RECIPIENTS = [
  "calidad.autolux@gmail.com",
  "analistacalidad23@gmail.com"
];

// Always CC List
export const STATIC_CC_RECIPIENTS = [
  "analista.calidad@autolux.com.ar",
  "calidad@autolux.com.ar",
  "Daniel.colque@autolux.com.ar",
  "sistemasdegestion@cenoa.com.ar",
  "adrian.dicostanzo@autolux.com.ar"
];

export interface NotificationRecipients {
  to: string[];
  cc: string[];
  globalControl: string[];
}

/**
 * Resolves the email recipients and CC list for a given branch and area.
 */
export function getDistributionRecipients(branch: Branch, area: Area): NotificationRecipients {
  const toList: string[] = [];

  // Determine recipients based on branch and area impact rules
  switch (branch) {
    case Branch.SALTA:
      if (area === Area.CITAS_PRESENCIAL || area === Area.SERVICIOS) {
        toList.push("mauricio.pepa@autolux.com.ar");
      } else if (area === Area.TALLER) {
        toList.push("ricardo.calvetti@autolux.com.ar");
      } else if (area === Area.REPUESTOS) {
        toList.push("franco.fernandez@autolux.com.ar");
      } else if (area === Area.CITAS_CALL) {
        toList.push("marina.albornoz@autolux.com.ar");
      } else {
        // Fallback or compound area (e.g., ORDENES, GESTION_PVT)
        toList.push("mauricio.pepa@autolux.com.ar", "ricardo.calvetti@autolux.com.ar");
      }
      break;

    case Branch.JUJUY:
      if (area === Area.CITAS_PRESENCIAL || area === Area.SERVICIOS) {
        toList.push("facundo.gallardo@autolux.com.ar");
      } else if (area === Area.TALLER) {
        toList.push("francisco.medina@autolux.com.ar");
      } else if (area === Area.REPUESTOS) {
        toList.push("miguel.gutierrez@autolux.com.ar");
      } else if (area === Area.CITAS_CALL) {
        toList.push("marina.albornoz@autolux.com.ar");
      } else {
        // Fallback or compound area
        toList.push("facundo.gallardo@autolux.com.ar", "francisco.medina@autolux.com.ar");
      }
      break;

    case Branch.TARTAGAL:
      if (area === Area.CITAS_PRESENCIAL || area === Area.SERVICIOS) {
        toList.push("natalia.sneidenit@autolux.com.ar");
      } else if (area === Area.TALLER) {
        toList.push("Alejandro.lopez@autolux.com.ar");
      } else if (area === Area.REPUESTOS) {
        toList.push("repuestostartagal@autolux.com.ar");
      } else if (area === Area.CITAS_CALL) {
        toList.push("marina.albornoz@autolux.com.ar");
      } else {
        // Fallback or compound area
        toList.push("natalia.sneidenit@autolux.com.ar", "Alejandro.lopez@autolux.com.ar");
      }
      break;

    case Branch.LA_LAJITAS:
      // Las Lajitas has a single general impact recipient for all areas
      toList.push("jose.castillo@autolux.com.ar");
      break;

    default:
      // Fallback fallback
      toList.push("calidad.autolux@gmail.com");
      break;
  }

  return {
    to: toList,
    cc: [...STATIC_CC_RECIPIENTS],
    globalControl: [...GLOBAL_QUALITY_RECIPIENTS]
  };
}

/**
 * Helper to extract Spanish Month Name in Uppercase from a date string (YYYY-MM-DD).
 */
export function getSpanishMonthName(dateStr: string | undefined): string {
  const months = [
    "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
    "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"
  ];
  if (!dateStr) {
    return months[new Date().getMonth()];
  }
  try {
    const parts = dateStr.split("-");
    if (parts.length >= 2) {
      const monthNum = parseInt(parts[1], 10);
      if (monthNum >= 1 && monthNum <= 12) {
        return months[monthNum - 1];
      }
    }
  } catch (e) {
    // Fallback
  }
  return months[new Date().getMonth()];
}

/**
 * Builds a mailto: link for sending the report notifications smoothly from preconfigured templates.
 */
export function buildMailtoUrl(
  branch: Branch,
  area: Area,
  score: number,
  advisor: string,
  auditorName: string,
  date: string,
  noCumpleCount: number
): string {
  const config = getDistributionRecipients(branch, area);
  
  // Combine TO and CC
  const toEmails = config.to.join(",");
  const ccEmails = [...config.globalControl, ...config.cc].join(",");

  const month = getSpanishMonthName(date);
  const subject = encodeURIComponent(`CALIDAD | LUX - ${branch.toUpperCase()} | Resultados de auditoria de procesos | ${month}`);
  
  const greeting = `Estimado Equipo,\n\nSe ha completado la Auditoría Posventa realizada en la sucursal de ${branch} el día ${date}.\n\n`;
  const info = `• Área Evaluada: ${area}\n• Colaborador/Asesor: ${advisor}\n• Auditor: ${auditorName}\n• Resultado Final: ${Math.round(score)}%\n• Desvíos Detectados: ${noCumpleCount}\n\n`;
  
  let actionRequired = "";
  if (noCumpleCount > 0) {
    actionRequired = `⚠️ IMPORTANTE: Se han identificado ${noCumpleCount} desvíos. Por favor, ingrese al siguiente enlace dentro del plazo de 7 días hábiles para completar el Plan de Acción mandatorio:\n\n🔗 Plan de Acción: ${GLOBAL_PLAN_ACCION_URL}\n\n`;
  } else {
    actionRequired = `✅ ¡Felicitaciones! Cumplimiento del 100%. Sigan manteniendo los exigentes estándares de Autolux Toyota.\n\n`;
  }
  
  const footer = `Saludos cordiales,\nÁrea de Calidad y Procesos - Autolux S.A.`;
  const bodyText = greeting + info + actionRequired + footer;
  const body = encodeURIComponent(bodyText);

  return `mailto:${toEmails}?cc=${ccEmails}&subject=${subject}&body=${body}`;
}

/**
 * Builds a mailto: link using fully customized lists of TO and CC emails.
 */
export function buildMailtoUrlCustom(
  branch: Branch,
  area: Area,
  score: number,
  advisor: string,
  auditorName: string,
  date: string,
  noCumpleCount: number,
  toEmailsList: string[],
  ccEmailsList: string[]
): string {
  const toEmails = toEmailsList.join(",");
  const ccEmails = ccEmailsList.join(",");

  const month = getSpanishMonthName(date);
  const subject = encodeURIComponent(`CALIDAD | LUX - ${branch.toUpperCase()} | Resultados de auditoria de procesos | ${month}`);
  
  const greeting = `Estimado Equipo,\n\nSe ha completado la Auditoría Posventa realizada en la sucursal de ${branch} el día ${date}.\n\n`;
  const info = `• Área Evaluada: ${area}\n• Colaborador/Asesor: ${advisor}\n• Auditor: ${auditorName}\n• Resultado Final: ${Math.round(score)}%\n• Desvíos Detectados: ${noCumpleCount}\n\n`;
  
  let actionRequired = "";
  if (noCumpleCount > 0) {
    actionRequired = `⚠️ IMPORTANTE: Se han identificado ${noCumpleCount} desvíos. Por favor, ingrese al siguiente enlace dentro del plazo de 7 días hábiles para completar el Plan de Acción mandatorio:\n\n🔗 Plan de Acción: ${GLOBAL_PLAN_ACCION_URL}\n\n`;
  } else {
    actionRequired = `✅ ¡Felicitaciones! Cumplimiento del 100%. Sigan manteniendo los exigentes estándares de Autolux Toyota.\n\n`;
  }
  
  const footer = `Saludos cordiales,\nÁrea de Calidad y Procesos - Autolux S.A.`;
  const bodyText = greeting + info + actionRequired + footer;
  const body = encodeURIComponent(bodyText);

  return `mailto:${toEmails}?cc=${ccEmails}&subject=${subject}&body=${body}`;
}

/**
 * Builds a web Gmail compose URL using fully customized lists of TO and CC emails.
 */
export function buildGmailComposeUrlCustom(
  branch: Branch,
  area: Area,
  score: number,
  advisor: string,
  auditorName: string,
  date: string,
  noCumpleCount: number,
  toEmailsList: string[],
  ccEmailsList: string[]
): string {
  const toEmails = toEmailsList.join(",");
  const ccEmails = ccEmailsList.join(",");

  const month = getSpanishMonthName(date);
  const subject = encodeURIComponent(`CALIDAD | LUX - ${branch.toUpperCase()} | Resultados de auditoria de procesos | ${month}`);
  
  const greeting = `Estimado Equipo,\n\nSe ha completado la Auditoría Posventa realizada en la sucursal de ${branch} el día ${date}.\n\n`;
  const info = `• Área Evaluada: ${area}\n• Colaborador/Asesor: ${advisor}\n• Auditor: ${auditorName}\n• Resultado Final: ${Math.round(score)}%\n• Desvíos Detectados: ${noCumpleCount}\n\n`;
  
  let actionRequired = "";
  if (noCumpleCount > 0) {
    actionRequired = `⚠️ IMPORTANTE: Se han identificado ${noCumpleCount} desvíos. Por favor, ingrese al siguiente enlace dentro del plazo de 7 días hábiles para completar el Plan de Acción mandatorio:\n\n🔗 Plan de Acción: ${GLOBAL_PLAN_ACCION_URL}\n\n`;
  } else {
    actionRequired = `✅ ¡Felicitaciones! Cumplimiento del 100%. Sigan manteniendo los exigentes estándares de Autolux Toyota.\n\n`;
  }
  
  const footer = `Saludos cordiales,\nÁrea de Calidad y Procesos - Autolux S.A.`;
  const bodyText = greeting + info + actionRequired + footer;
  const body = encodeURIComponent(bodyText);

  return `https://mail.google.com/mail/?view=cm&fs=1&to=${toEmails}&cc=${ccEmails}&su=${subject}&body=${body}`;
}
