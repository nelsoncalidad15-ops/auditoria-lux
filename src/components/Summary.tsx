/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { AuditSession, AuditorInfo, SectorResponsibles, Question, AuditItem } from "../types";
import { CheckCircle2, FileText, Send, UserPlus, Home, Mail, Download, AlertTriangle, CloudUpload, X, Plus } from "lucide-react";
import { getDistributionRecipients, buildMailtoUrl, buildMailtoUrlCustom, buildGmailComposeUrlCustom, GLOBAL_PLAN_ACCION_URL, BRANCH_PVT_FOLDER_LINKS, getSpanishMonthName } from "../services/distributionService";

interface RoleScore {
  name: string;
  cumple: number;
  noCumple: number;
  na: number;
  score: number | "N/A";
}

const getRoleScores = (qs: Question[], items: AuditItem[], area: string): RoleScore[] => {
  let roles: Array<{ key: string; label: string; keywords: string[] }> = [];

  if (area === "Ordenes") {
    roles = [
      { key: "citas", label: "Asesor de Citas", keywords: ["CITA"] },
      { key: "servicios", label: "Asesor de Servicios", keywords: ["SERVICIO"] },
      { key: "lider", label: "Líder/Jefe de Taller", keywords: ["JEFE", "LIDER", "LÍDER", "REPUESTOS"] },
      { key: "tecnico", label: "Técnico", keywords: ["TECNICO", "TÉCNICO"] }
    ];
  } else if (area === "Gestion Pvt") {
    roles = [
      { key: "servicios", label: "Jefe de Servicios", keywords: ["SERVICIO"] },
      { key: "taller", label: "Jefe de Taller", keywords: ["TALLER"] },
      { key: "lavadero", label: "Líder de Lavadero", keywords: ["LAVADERO"] },
      { key: "garantia", label: "Líder de Garantías", keywords: ["GARANTIA", "GARANTÍA"] },
      { key: "subgerente", label: "Sub Gerente", keywords: ["SUB GERENTE", "SUBGERNETE", "SUBGERENTE"] }
    ];
  } else {
    const uniques = Array.from(new Set(qs.map(q => q.responsible).filter(Boolean))) as string[];
    if (uniques.length === 0) return [];
    roles = uniques.map(name => ({
      key: name.toLowerCase().replace(/\s+/g, ""),
      label: name,
      keywords: [name.toUpperCase()]
    }));
  }

  return roles.map(r => {
    let cumpleCount = 0;
    let noCumpleCount = 0;
    let naCount = 0;

    items.forEach(item => {
      const q = qs.find(qObj => qObj.id === item.questionId);
      if (q && q.responsible) {
        const respUpper = q.responsible.toUpperCase();
        const matches = r.keywords.some(keyword => respUpper.includes(keyword));
        if (matches) {
          if (item.score === 1) cumpleCount++;
          else if (item.score === 0) noCumpleCount++;
          else if (item.score === "N/A") naCount++;
        }
      }
    });

    const divisor = cumpleCount + noCumpleCount;
    const scoreVal = divisor > 0 ? Math.round((cumpleCount / divisor) * 100) : "N/A";

    return {
      name: r.label,
      cumple: cumpleCount,
      noCumple: noCumpleCount,
      na: naCount,
      score: scoreVal
    };
  });
};
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { motion } from "motion/react";
import { saveAudit } from "../lib/firebase";

interface SummaryProps {
  session: AuditSession;
  onReset: (keepConfig: boolean) => void;
  completedSessions?: AuditSession[];
}

export function Summary({ session, onReset, completedSessions = [] }: SummaryProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingConsolidated, setIsGeneratingConsolidated] = useState(false);
  const [isSaving, setIsSaving] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);

  useEffect(() => {
    import("../services/sheetsService").then(({ sheetsService }) => {
      sheetsService.getQuestions(session.area, session.branch).then((qs) => {
        setQuestions(qs);
        setLoadingQuestions(false);
      });
    });
  }, [session.area, session.branch]);
  
  const auditorInfo = AuditorInfo[session.auditor];
  
  const cumple = session.items.filter(i => i.score === 1).length;
  const noCumple = session.items.filter(i => i.score === 0).length;
  const na = session.items.filter(i => i.score === "N/A").length;
  const divisor = cumple + noCumple;
  const score = divisor > 0 ? Math.round((cumple / divisor) * 100) : 0;

  useEffect(() => {
    async function persist() {
      try {
        await saveAudit(session, score);
        setIsSaving(false);
      } catch (e) {
        console.error("Save failed:", e);
        setSaveError("Error al sincronizar con la nube. El reporte local es válido.");
        setIsSaving(false);
      }
    }
    persist();
  }, [session, score]);

  const type = score >= 90 ? "Aprobado" : "Requiere Acción";
  const typeColor = score >= 90 ? "text-green-500 bg-green-500/10" : "text-toyota-red bg-toyota-red/10";

  const [toList, setToList] = useState<string[]>([]);
  const [globalList, setGlobalList] = useState<string[]>([]);
  const [ccList, setCcList] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [newEmailTarget, setNewEmailTarget] = useState<"to" | "cc" | "globalControl">("to");

  const [showSentConfirmation, setShowSentConfirmation] = useState(false);
  const [showDriveInstructions, setShowDriveInstructions] = useState(false);
  const [lastSentChannel, setLastSentChannel] = useState<string | null>(null);
  const [sentTimestamp, setSentTimestamp] = useState<string | null>(null);

  useEffect(() => {
    const r = getDistributionRecipients(session.branch, session.area);
    setToList(r.to);
    setGlobalList(r.globalControl);
    setCcList(r.cc);
  }, [session.branch, session.area]);

  const mailtoUrl = buildMailtoUrlCustom(
    session.branch,
    session.area,
    score,
    session.advisor,
    auditorInfo.name,
    session.date,
    noCumple,
    toList,
    [...globalList, ...ccList]
  );

  const gmailComposeUrl = buildGmailComposeUrlCustom(
    session.branch,
    session.area,
    score,
    session.advisor,
    auditorInfo.name,
    session.date,
    noCumple,
    toList,
    [...globalList, ...ccList]
  );

  const generatePDF = async () => {
    setIsGenerating(true);
    const doc = new jsPDF();
    
    // Header
    doc.setFillColor(235, 20, 20); // Toyota Red
    doc.rect(0, 0, 210, 40, "F");
    
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("AUTOLUX S.A.", 20, 20);
    doc.setFontSize(12);
    doc.text("REPORTE DE AUDITORÍA INTERNA POSVENTA", 20, 30);
    
    // Info Table
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text(`Fecha: ${session.date}`, 150, 50);
    doc.text(`Sucursal: ${session.branch}`, 20, 60);
    doc.text(`Área: ${session.area}`, 20, 68);
    doc.text(`Auditor: ${auditorInfo.name}`, 150, 60);

    let startTableY = 100;
    if (session.area === "Ordenes") {
      doc.text(`Asesor de Servicio: ${session.advisor}`, 20, 76);
      doc.text(`Asesor de Citas: ${session.bookingAdvisor || "-"}`, 20, 84);
      doc.text(`Técnico de Taller: ${session.technician || "-"}`, 20, 92);
      const firstItem = session.items[0];
      const orNumberText = firstItem ? firstItem.observation : "";
      if (orNumberText) {
        doc.text(`Número de OR: ${orNumberText}`, 150, 68);
      }
      startTableY = 110;
    } else {
      doc.text(`Asesor/Responsable: ${session.advisor}`, 20, 76);
      const responsibles = SectorResponsibles[session.area]?.join(", ") || "";
      doc.text(`Responsable(s) Área: ${responsibles}`, 20, 84);
    }
    
    // Score Badge
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(255, 255, 255); // White background
    doc.rect(140, 75, 50, 22, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0); // Black letters
    doc.text("RESULTADO FINAL", 143, 81);
    doc.setFontSize(22);
    if (score < 90) {
      doc.setTextColor(235, 20, 20); // Red if disapproved (< 95%, here < 90%)
    } else {
      doc.setTextColor(0, 0, 0); // Black if approved (>= 90%)
    }
    doc.text(`${score}%`, 155, 93);
    
    // Items table
    autoTable(doc, {
      startY: startTableY,
      head: [['Punto de Auditoría', 'Resultado', 'Observaciones']],
      body: session.items.map((item, index) => {
        const qObj = questions.find(q => q.id === item.questionId);
        let label = qObj ? `${index + 1}) ${qObj.shortText || qObj.text}` : `Ítem ${index + 1}`;
        if (session.area === "Ordenes" && index === 0) {
          label = `Número de OR: ${item.observation || "-"}`;
        }
        return [
          label,
          item.score === 1 ? "Cumple" : item.score === 0 ? "No Cumple" : "N/A",
          index === 0 && session.area === "Ordenes" ? "-" : (item.observation || "-")
        ];
      }),
      headStyles: { fillColor: [26, 26, 26], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      styles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 105 },
        1: { cellWidth: 20 },
        2: { cellWidth: 45 }
      }
    });

    const finalYItems = (doc as any).lastAutoTable.finalY + 12;

    const roleScores = getRoleScores(questions, session.items, session.area);
    const hasRoles = questions.some(q => q.responsible);

    if (hasRoles) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(26, 26, 26);
      doc.text("RENDIMIENTO POR SECTOR / RESPONSABLE", 20, finalYItems);

      autoTable(doc, {
        startY: finalYItems + 4,
        head: [['Sector / Responsable', 'Cumple', 'No Cumple', 'N/A', 'Resultado (%)']],
        body: roleScores.map(r => [
          r.name,
          r.cumple,
          r.noCumple,
          r.na,
          r.score === "N/A" ? "N/A" : `${r.score}%`
        ]),
        headStyles: { fillColor: [31, 78, 121], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        styles: { fontSize: 8 }
      });
    }

    const finalY = (doc as any).lastAutoTable.finalY + 20;

    // Corrective Action Clause
    if (noCumple > 0) {
      doc.setTextColor(235, 20, 20); // Red
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("CLÁUSULA DE ACCIÓN CORRECTIVA:", 20, finalY);
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      const clauseText = `En caso de desvíos, completar el Plan de Acción en un plazo máximo de 7 días hábiles para garantizar la estandarización Toyota.`;
      const splitClause = doc.splitTextToSize(clauseText, 170);
      doc.text(splitClause, 20, finalY + 5);
      
      doc.setTextColor(31, 78, 121); // Blue link
      doc.setFont("helvetica", "bold");
      doc.textWithLink("🔗 VER PLAN DE ACCIÓN GLOBAL EN DRIVE", 20, finalY + 13, { url: GLOBAL_PLAN_ACCION_URL });
    }

    const signatureY = finalY + 34;
    doc.line(20, signatureY, 80, signatureY);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("Firma del Auditor", 20, signatureY + 5);
    doc.setFont("helvetica", "normal");
    doc.text(auditorInfo.name, 20, signatureY + 10);
    doc.text(`${auditorInfo.role} - Autolux S.A.`, 20, signatureY + 15);

    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text("Este documento es confidencial y propiedad de Autolux S.A. Prohibida su reproducción total o parcial sin autorización.", 20, 285);

    doc.save(`Auditoria_${session.area}_${session.advisor}_${session.date}.pdf`);
    setIsGenerating(false);
  };

  const getConsolidatedMailContent = () => {
    const month = getSpanishMonthName(session.date);
    const subject = `CALIDAD | LUX - ${session.branch.toUpperCase()} | Reporte Global Consolidado | ${session.area.toUpperCase()} | ${month}`;
    
    // Calculate global stats first
    let totalAdvisorsScore = 0;
    let totalNoCumple = 0;
    
    completedSessions.forEach((s) => {
      const sCumple = s.items.filter(i => i.score === 1).length;
      const sNoCumple = s.items.filter(i => i.score === 0).length;
      const sDivisor = sCumple + sNoCumple;
      const sScore = sDivisor > 0 ? Math.round((sCumple / sDivisor) * 100) : 0;
      
      totalAdvisorsScore += sScore;
      totalNoCumple += sNoCumple;
    });
    
    const globalAvg = completedSessions.length > 0 
      ? Math.round(totalAdvisorsScore / completedSessions.length) 
      : 0;

    // Helper to build horizontal emoji progress bars
    const getProgressBar = (percentage: number) => {
      const totalBlocks = 10;
      const activeBlocks = Math.round((percentage / 100) * totalBlocks);
      const inactiveBlocks = totalBlocks - activeBlocks;
      const blockEmoji = percentage >= 90 ? "🟩" : "🟥"; // Green for Approved (>= 90%), Red for Action (< 90%)
      return blockEmoji.repeat(activeBlocks) + "⬜".repeat(inactiveBlocks);
    };

    const globalBar = getProgressBar(globalAvg);
    const globalStatusStr = globalAvg >= 90 ? "APROBADO" : "REQUIERE ACCIÓN INMEDIATA";

    // Build email body with GLOBAL RESULTS and CHARTS FIRST
    let body = `Estimado Equipo,\n\nSe ha completado la Jornada de Auditorías de Posventa para la sucursal de ${session.branch.toUpperCase()} (Área: ${session.area.toUpperCase()}) el día ${session.date}.\n\n`;
    
    body += `==================================================\n`;
    body += `📊 DESEMPEÑO GLOBAL DE LA JORNADA (PROMEDIO)\n`;
    body += `==================================================\n\n`;
    body += `📈 PROMEDIO GENERAL DE LA SUCURSAL:\n`;
    body += `${globalBar}  ${globalAvg}% (${globalStatusStr})\n\n`;
    body += `⚠️ Desvíos totales detectados en la jornada: ${totalNoCumple} desvíos\n`;
    body += `==================================================\n\n`;
    
    body += `👤 DESGLOSE DETALLADO POR ASESOR / COLABORADOR:\n\n`;
    
    completedSessions.forEach((s, idx) => {
      const sCumple = s.items.filter(i => i.score === 1).length;
      const sNoCumple = s.items.filter(i => i.score === 0).length;
      const sDivisor = sCumple + sNoCumple;
      const sScore = sDivisor > 0 ? Math.round((sCumple / sDivisor) * 100) : 0;
      const advisorBar = getProgressBar(sScore);
      
      body += `${idx + 1}. Colaborador: ${s.advisor}\n`;
      body += `   • Desempeño: ${advisorBar}  ${sScore}%\n`;
      body += `   • Desvíos Detectados: ${sNoCumple}\n`;
      body += `   • Estado: ${sScore >= 90 ? "Aprobado" : "Requiere Acción"}\n\n`;
    });
    
    body += `--------------------------------------------------\n\n`;
    
    if (totalNoCumple > 0) {
      body += `⚠️ IMPORTANTE: Se han identificado desvíos en el desempeño del equipo. Por normativa Toyota, es mandatorio que los responsables ingresen al siguiente enlace para confeccionar el Plan de Acción correspondiente:\n\n🔗 Plan de Acción Global: ${GLOBAL_PLAN_ACCION_URL}\n\n`;
    } else {
      body += `✅ ¡Felicitaciones a todo el equipo! Cumplimiento del 100% general. Sigan manteniendo este excelente nivel de servicio y de cumplimiento de procesos.\n\n`;
    }
    
    body += `📁 Carpeta de Desvíos en Google Drive:\n${BRANCH_PVT_FOLDER_LINKS[session.branch] || "https://drive.google.com"}\n\n`;
    body += `📎 NOTA: Recuerda descargar el Reporte PDF Consolidado y arrastrarlo o adjuntarlo directamente a este correo.\n\n`;
    body += `Saludos cordiales,\nÁrea de Calidad y Procesos - Autolux S.A.`;
    
    return {
      subject: encodeURIComponent(subject),
      body: encodeURIComponent(body)
    };
  };

  const consolidatedMailtoUrl = () => {
    const { subject, body } = getConsolidatedMailContent();
    const toEmails = toList.join(",");
    const ccEmails = [...globalList, ...ccList].join(",");
    return `mailto:${toEmails}?cc=${ccEmails}&subject=${subject}&body=${body}`;
  };

  const consolidatedGmailUrl = () => {
    const { subject, body } = getConsolidatedMailContent();
    const toEmails = toList.join(",");
    const ccEmails = [...globalList, ...ccList].join(",");
    return `https://mail.google.com/mail/?view=cm&fs=1&to=${toEmails}&cc=${ccEmails}&su=${subject}&body=${body}`;
  };

  const generateConsolidatedPDF = async () => {
    setIsGeneratingConsolidated(true);
    const doc = new jsPDF();
    
    // PAGE 1: GLOBAL DASHBOARD
    doc.setFillColor(235, 20, 20); // Toyota Red
    doc.rect(0, 0, 210, 40, "F");
    
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("AUTOLUX S.A. - REPORTE CONSOLIDADO", 20, 18);
    doc.setFontSize(10);
    doc.text("SISTEMA DE AUDITORÍAS DE PROCESOS POSVENTA TOYOTA", 20, 28);
    
    // Metadata block
    doc.setTextColor(50, 50, 50);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Sucursal: ${session.branch.toUpperCase()}`, 20, 52);
    doc.text(`Área Evaluada: ${session.area.toUpperCase()}`, 20, 59);
    doc.text(`Fecha de Auditoría: ${session.date}`, 150, 52);
    doc.text(`Auditor: ${auditorInfo.name}`, 150, 59);

    // Calculate metrics
    let totalAdvisorsScore = 0;
    let globalNoCumple = 0;
    let globalCumple = 0;
    
    completedSessions.forEach((s) => {
      const sCumple = s.items.filter(i => i.score === 1).length;
      const sNoCumple = s.items.filter(i => i.score === 0).length;
      const sDivisor = sCumple + sNoCumple;
      const sScore = sDivisor > 0 ? Math.round((sCumple / sDivisor) * 100) : 0;
      totalAdvisorsScore += sScore;
      globalNoCumple += sNoCumple;
      globalCumple += sCumple;
    });
    
    const globalAvg = completedSessions.length > 0 
      ? Math.round(totalAdvisorsScore / completedSessions.length) 
      : 0;

    // KPI Cards
    doc.setDrawColor(220, 220, 220);

    // Card 1: Promedio Global
    doc.setFillColor(255, 255, 255); // White background
    doc.rect(20, 70, 52, 24, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(0, 0, 0); // Black labels
    doc.text("CUMPLIMIENTO PROMEDIO", 23, 76);
    doc.setFontSize(16);
    if (globalAvg < 90) {
      doc.setTextColor(235, 20, 20); // Red if disapproved (< 90%)
    } else {
      doc.setTextColor(0, 0, 0); // Black if approved (>= 90%)
    }
    doc.text(`${globalAvg}%`, 36, 88);

    // Card 2: Colaboradores
    doc.setFillColor(255, 255, 255); // White background
    doc.rect(79, 70, 52, 24, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(0, 0, 0); // Black labels
    doc.text("ASESORES EVALUADOS", 82, 76);
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0); // Black
    doc.text(`${completedSessions.length}`, 101, 88);

    // Card 3: Desvíos Detectados
    doc.setFillColor(255, 255, 255); // White background
    doc.rect(138, 70, 52, 24, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(0, 0, 0); // Black labels
    doc.text("DESVÍOS TOTALES", 141, 76);
    doc.setFontSize(16);
    doc.setTextColor(globalNoCumple > 0 ? 235 : 0, globalNoCumple > 0 ? 20 : 0, globalNoCumple > 0 ? 20 : 0); // Red if deviations, else Black
    doc.text(`${globalNoCumple}`, 160, 88);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(26, 26, 26);
    doc.text("DESGLOSE DE EVALUACIONES POR ASESOR", 20, 108);

    // Master Table of advisors
    autoTable(doc, {
      startY: 113,
      head: [['Colaborador / Asesor', 'Cumple', 'No Cumple', 'Resultado (%)', 'Estado']],
      body: completedSessions.map((s) => {
        const sCumple = s.items.filter(i => i.score === 1).length;
        const sNoCumple = s.items.filter(i => i.score === 0).length;
        const sDivisor = sCumple + sNoCumple;
        const sScore = sDivisor > 0 ? Math.round((sCumple / sDivisor) * 100) : 0;
        const isApproved = sScore >= 90;
        return [
          s.advisor,
          sCumple,
          sNoCumple,
          {
            content: `${sScore}%`,
            styles: { textColor: isApproved ? [0, 0, 0] : [235, 20, 20], fontStyle: 'bold' }
          },
          {
            content: isApproved ? "Aprobado" : "Req. Acción",
            styles: { textColor: isApproved ? [0, 0, 0] : [235, 20, 20], fontStyle: 'bold' }
          }
        ];
      }),
      headStyles: { fillColor: [26, 26, 26], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      styles: { fontSize: 8 }
    });

    let currentY = (doc as any).lastAutoTable.finalY + 15;

    // Corrective Action Clause
    if (globalNoCumple > 0) {
      doc.setTextColor(235, 20, 20); // Red
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("REQUERIMIENTO DE PLANES DE ACCIÓN CORRECTIVA:", 20, currentY);
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      const clauseText = `Se han identificado ${globalNoCumple} desvíos acumulados en la jornada. Es mandatorio registrar las contramedidas en el Plan de Acción en un plazo máximo de 7 días hábiles.`;
      const splitClause = doc.splitTextToSize(clauseText, 170);
      doc.text(splitClause, 20, currentY + 5);
      
      doc.setTextColor(31, 78, 121); // Blue link
      doc.setFont("helvetica", "bold");
      doc.textWithLink("🔗 VER PLAN DE ACCIÓN GLOBAL EN DRIVE", 20, currentY + 15, { url: GLOBAL_PLAN_ACCION_URL });
      
      currentY += 24;
    } else {
      doc.setTextColor(20, 150, 20); // Green
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("¡FELICITACIONES POR EXCELENCIA EN PROCESOS!", 20, currentY);
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text("Todas las auditorías registraron cumplimiento completo del 100%. No se requieren planes de acción correctiva de desvíos.", 20, currentY + 5);
      
      currentY += 15;
    }

    const signatureY = currentY + 15;
    if (signatureY < 270) {
      doc.line(20, signatureY, 80, signatureY);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("Firma del Auditor", 20, signatureY + 5);
      doc.setFont("helvetica", "normal");
      doc.text(auditorInfo.name, 20, signatureY + 10);
      doc.text(`${auditorInfo.role} - Autolux S.A.`, 20, signatureY + 15);
    }

    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text("Este documento consolidado reúne múltiples auditorías de procesos y es para uso de calidad Autolux S.A.", 20, 285);

    // APPEND INDIVIDUAL PAGES FOR EACH ADVISOR
    completedSessions.forEach((s) => {
      doc.addPage();
      
      // Individual advisor header
      doc.setFillColor(31, 78, 121); // Dark Steel Blue for details
      doc.rect(0, 0, 210, 32, "F");
      
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text(`AUDITORÍA INDIVIDUAL: ${s.advisor.toUpperCase()}`, 20, 14);
      doc.setFontSize(9);
      doc.text(`ÁREA: ${s.area.toUpperCase()}  |  SUCURSAL: ${s.branch.toUpperCase()}`, 20, 23);
      
      // Calculations for individual
      const sCumple = s.items.filter(i => i.score === 1).length;
      const sNoCumple = s.items.filter(i => i.score === 0).length;
      const sDivisor = sCumple + sNoCumple;
      const sScore = sDivisor > 0 ? Math.round((sCumple / sDivisor) * 100) : 0;
      
      // Draw individual meta
      doc.setTextColor(50, 50, 50);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`Fecha: ${s.date}`, 20, 42);
      doc.text(`Auditor: ${auditorInfo.name}`, 20, 48);
      doc.text(`Asesor Evaluado: ${s.advisor}`, 120, 42);
      
      // Dynamic score coloring (red if disapproved < 90%, black if approved)
      if (sScore < 90) {
        doc.setTextColor(235, 20, 20); // Red
      } else {
        doc.setTextColor(0, 0, 0); // Black
      }
      doc.setFont("helvetica", "bold");
      doc.text(`Resultado Individual: ${sScore}%`, 120, 48);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(50, 50, 50); // Restore normal text color

      // Render table
      autoTable(doc, {
        startY: 55,
        head: [['Punto de Auditoría', 'Resultado', 'Observaciones']],
        body: s.items.map((item, index) => {
          const qObj = questions.find(q => q.id === item.questionId);
          let label = qObj ? `${index + 1}) ${qObj.shortText || qObj.text}` : `Ítem ${index + 1}`;
          if (s.area === "Ordenes" && index === 0) {
            label = `Número de OR: ${item.observation || "-"}`;
          }
          return [
            label,
            item.score === 1 ? "Cumple" : item.score === 0 ? "No Cumple" : "N/A",
            index === 0 && s.area === "Ordenes" ? "-" : (item.observation || "-")
          ];
        }),
        headStyles: { fillColor: [31, 75, 115], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        styles: { fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 105 },
          1: { cellWidth: 20 },
          2: { cellWidth: 45 }
        }
      });

      const sFinalY = (doc as any).lastAutoTable.finalY + 10;
      if (s.generalObservations && sFinalY < 270) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(`Observaciones adicionales de ${s.advisor}: "${s.generalObservations}"`, 20, sFinalY);
      }
    });

    const monthStr = getSpanishMonthName(session.date);
    doc.save(`REPORTE_CONSOLIDADO_${session.branch.toUpperCase()}_${session.area.toUpperCase()}_${monthStr}.pdf`);
    setIsGeneratingConsolidated(false);
  };

  return (
    <div className="py-12 max-w-4xl mx-auto space-y-8">
      <div className="bento-card !p-0 overflow-hidden">
        <div className={`p-16 text-center text-white relative overflow-hidden transition-colors duration-1000 ${score >= 90 ? "bg-toyota-red" : "bg-toyota-black"}`}>
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-10 pointer-events-none">
             <div className="absolute -top-24 -right-24 w-96 h-96 border-8 border-white rounded-full"></div>
             <div className="absolute -bottom-24 -left-24 w-96 h-96 border-8 border-white rounded-full"></div>
          </div>

          <motion.div
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", damping: 12 }}
            className="w-32 h-32 bg-white rounded-2xl mx-auto flex flex-col items-center justify-center mb-8 shadow-2xl relative z-10"
          >
            <span className="text-4xl font-black text-toyota-black leading-none">{score}%</span>
            <span className="text-[8px] font-black text-gray-400 uppercase tracking-tighter mt-1">Score Total</span>
          </motion.div>
          
          <h2 className="text-4xl font-black mb-4 uppercase tracking-tighter relative z-10">¡Auditoría Finalizada!</h2>
          <div className={`inline-flex px-6 py-2 rounded-lg font-black text-[10px] uppercase tracking-[0.2em] shadow-lg relative z-10 ${typeColor}`}>
             Categoría: {type}
          </div>

          {/* Horizontal Metadata Summary Strip */}
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 mt-8 text-xs font-bold text-white/85 uppercase tracking-wide relative z-10 max-w-3xl mx-auto border-t border-b border-white/20 py-4">
            <div>
              <span className="text-white/50 text-[9px] font-black tracking-widest block mb-0.5">SUCURSAL</span>
              <span>{session.branch}</span>
            </div>
            <div className="border-l border-white/10 hidden md:block"></div>
            <div>
              <span className="text-white/50 text-[9px] font-black tracking-widest block mb-0.5">ÁREA AUDITADA</span>
              <span>{session.area}</span>
            </div>
            <div className="border-l border-white/10 hidden md:block"></div>
            {session.area === "Ordenes" ? (
              <>
                <div>
                  <span className="text-white/50 text-[9px] font-black tracking-widest block mb-0.5">ASESOR SERVICIO</span>
                  <span>{session.advisor}</span>
                </div>
                {session.bookingAdvisor && (
                  <>
                    <div className="border-l border-white/10 hidden md:block"></div>
                    <div>
                      <span className="text-[#B4C6E7] text-[9px] font-black tracking-widest block mb-0.5">ASESOR CITA</span>
                      <span>{session.bookingAdvisor}</span>
                    </div>
                  </>
                )}
                {session.technician && (
                  <>
                    <div className="border-l border-white/10 hidden md:block"></div>
                    <div>
                      <span className="text-white/50 text-[9px] font-black tracking-widest block mb-0.5">TÉCNICO</span>
                      <span>{session.technician}</span>
                    </div>
                  </>
                )}
                {session.items[0]?.observation && (
                  <>
                    <div className="border-l border-white/10 hidden md:block"></div>
                    <div>
                      <span className="text-[#B4C6E7] text-[9px] font-black tracking-widest block mb-0.5">NÚMERO DE OR</span>
                      <span className="font-mono text-white font-black bg-white/25 px-1.5 py-0.5 rounded text-xs">{session.items[0].observation}</span>
                    </div>
                  </>
                )}
              </>
            ) : (
              <div>
                <span className="text-white/50 text-[9px] font-black tracking-widest block mb-0.5">RESPONSABLE</span>
                <span>{session.advisor}</span>
              </div>
            )}
          </div>

          <div className="flex justify-center h-4 mt-6">
            {isSaving && (
              <div className="flex items-center gap-2 text-[10px] uppercase font-black tracking-widest opacity-60 animate-pulse">
                <CloudUpload className="w-3 h-3" /> Sincronizando resultados...
              </div>
            )}
            {saveError && (
              <div className="text-[10px] uppercase font-black tracking-widest text-yellow-300">
                ⚠️ {saveError}
              </div>
            )}
            {!isSaving && !saveError && (
              <div className="flex items-center gap-2 text-[10px] uppercase font-black tracking-widest text-green-300">
                ✓ Resultados Asegurados en la Nube
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-3 gap-8 max-w-lg mx-auto mt-16 pt-10 border-t border-white/20 relative z-10">
            <StatResult label="Cumplidos" value={cumple} />
            <StatResult label="Desvíos" value={noCumple} />
            <StatResult label="N/A" value={na} />
          </div>
        </div>

        <div className="p-10 bg-white space-y-8">
          {/* Rendimiento por Sector / Responsable */}
          {!loadingQuestions && questions.some(q => q.responsible) && (
            <div className="bg-[#D9E1F2]/20 rounded-2xl p-6 border border-gray-150 shadow-inner">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-200">
                <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-[#1F497D] flex items-center gap-2">
                  📊 Rendimiento por Sector / Responsable
                </h4>
                <span className="text-[10px] font-black text-toyota-red uppercase bg-[#B4C6E7]/30 px-2.5 py-0.5 rounded-full">
                  Muestra Auditada
                </span>
              </div>
              
              <div className="overflow-x-auto font-sans">
                <table className="min-w-full text-left text-xs font-semibold text-gray-650">
                  <thead className="bg-[#B4C6E7] text-[10px] uppercase font-black tracking-wider text-[#1F4E79]">
                    <tr>
                      <th className="px-4 py-2 rounded-l-lg">Sector / Responsable</th>
                      <th className="px-4 py-2 text-center">Cumple</th>
                      <th className="px-4 py-2 text-center">No Cumple</th>
                      <th className="px-4 py-2 text-center">N/A</th>
                      <th className="px-4 py-2 text-right rounded-r-lg">Porcentaje de Resultado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-150">
                    {getRoleScores(questions, session.items, session.area).map((r, i) => (
                      <tr key={i} className="hover:bg-white transition-colors">
                        <td className="px-4 py-2.5 font-bold text-gray-800">{r.name}</td>
                        <td className="px-4 py-2.5 text-center text-green-600 font-bold">{r.cumple}</td>
                        <td className="px-4 py-2.5 text-center text-toyota-red font-bold">{r.noCumple}</td>
                        <td className="px-4 py-2.5 text-center text-gray-400 font-bold">{r.na}</td>
                        <td className="px-4 py-2.5 text-right w-36">
                          <span className={`inline-block font-black text-xs px-2.5 py-0.5 rounded-md ${
                            r.score === "N/A" 
                              ? "bg-gray-100 text-gray-400" 
                              : r.score >= 90 
                                ? "bg-green-100 text-green-700" 
                                : "bg-red-100 text-toyota-red"
                          }`}>
                            {r.score === "N/A" ? "N/A" : `${r.score}%`}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-6">
                 <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 shadow-inner">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1F4E79] mb-4 flex items-center gap-2">
                      <Mail className="w-3 h-3 text-toyota-red" /> Canales de Distribución Calidad
                    </h4>
                    
                    <div className="space-y-4 mb-5">
                      <div>
                        <span className="text-[9px] font-black uppercase text-gray-400 tracking-wider block mb-1">Destinatario (PARA):</span>
                        {toList.length === 0 ? (
                          <div className="text-[10px] text-gray-400 italic">No hay destinatarios principales</div>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {toList.map((email, idx) => (
                              <span key={idx} className="inline-flex items-center gap-1 bg-[#1F4E79]/10 text-[#1F4E79] font-bold text-[10px] pl-2 pr-1 py-0.5 rounded border border-[#1F4E79]/20" title={email}>
                                <span className="truncate max-w-[150px]">{email}</span>
                                <button
                                  type="button"
                                  onClick={() => setToList(prev => prev.filter((_, i) => i !== idx))}
                                  className="text-[#1F4E79] hover:bg-[#1F4E79] hover:text-white rounded-full p-0.5 transition-all cursor-pointer"
                                  title="Eliminar correo"
                                >
                                  <X className="w-2.5 h-2.5" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div>
                        <span className="text-[9px] font-black uppercase text-gray-400 tracking-wider block mb-1">Copias de Control (CC GLOBAL):</span>
                        {globalList.length === 0 ? (
                          <div className="text-[10px] text-gray-400 italic">No hay copias de control de calidad</div>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {globalList.map((email, idx) => (
                              <span key={idx} className="inline-flex items-center gap-1 bg-red-50 text-toyota-red font-bold text-[10px] pl-2 pr-1 py-0.5 rounded border border-red-100" title={email}>
                                <span className="truncate max-w-[150px]">{email}</span>
                                <button
                                  type="button"
                                  onClick={() => setGlobalList(prev => prev.filter((_, i) => i !== idx))}
                                  className="text-toyota-red hover:bg-toyota-red hover:text-white rounded-full p-0.5 transition-all cursor-pointer"
                                  title="Eliminar correo"
                                >
                                  <X className="w-2.5 h-2.5" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div>
                        <span className="text-[9px] font-black uppercase text-gray-400 tracking-wider block mb-1">Siempre Cc (Sucursal CC):</span>
                        {ccList.length === 0 ? (
                          <div className="text-[10px] text-gray-400 italic">No hay copias siempre CC</div>
                        ) : (
                          <div className="flex flex-wrap gap-1 max-h-[100px] overflow-y-auto pt-0.5">
                            {ccList.map((email, idx) => (
                              <span key={idx} className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 font-semibold text-[9px] pl-2 pr-1 py-0.5 rounded border border-gray-200" title={email}>
                                <span className="truncate max-w-[140px]">{email}</span>
                                <button
                                  type="button"
                                  onClick={() => setCcList(prev => prev.filter((_, i) => i !== idx))}
                                  className="text-gray-500 hover:bg-gray-400 hover:text-white rounded-full p-0.5 transition-all cursor-pointer"
                                  title="Eliminar correo"
                                >
                                  <X className="w-2.5 h-2.5" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-dashed border-gray-200">
                        <span className="text-[9px] font-black uppercase text-[#1F4E79] tracking-wider block mb-1.5">➕ Agregar Correo Destinatario (Para prueba u otro)</span>
                        <div className="flex gap-1">
                          <input
                            type="email"
                            placeholder="ejemplo@autolux.com.ar"
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                if (!newEmail || !newEmail.includes("@")) return;
                                if (newEmailTarget === "to") setToList(prev => [...prev, newEmail.trim()]);
                                else if (newEmailTarget === "globalControl") setGlobalList(prev => [...prev, newEmail.trim()]);
                                else setCcList(prev => [...prev, newEmail.trim()]);
                                setNewEmail("");
                              }
                            }}
                            className="flex-1 text-[11px] px-2 text-toyota-black py-1 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1F4E79]/30 font-semibold"
                          />
                          <select
                            value={newEmailTarget}
                            onChange={(e) => setNewEmailTarget(e.target.value as "to" | "cc" | "globalControl")}
                            className="text-[10px] font-black text-gray-700 bg-white border border-gray-300 rounded-lg px-1"
                          >
                            <option value="to">PARA</option>
                            <option value="globalControl">CC GLOBAL</option>
                            <option value="cc">SUCURSAL CC</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => {
                              if (!newEmail || !newEmail.includes("@")) return;
                              if (newEmailTarget === "to") setToList(prev => [...prev, newEmail.trim()]);
                              else if (newEmailTarget === "globalControl") setGlobalList(prev => [...prev, newEmail.trim()]);
                              else setCcList(prev => [...prev, newEmail.trim()]);
                              setNewEmail("");
                            }}
                            className="bg-[#1F4E79] hover:bg-[#1A4269] text-white text-[10px] font-black px-2.5 py-1 rounded-lg transition-colors uppercase cursor-pointer"
                          >
                            Añadir
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 pt-2 border-t border-dashed border-gray-200">
                      <span className="text-[9px] font-black uppercase text-gray-400 tracking-wider block">Despachar Reporte:</span>
                      
                      <div className="grid grid-cols-1 gap-2">
                        {/* Option 1: Gmail Web Compose */}
                        <a
                          href={gmailComposeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => {
                            generatePDF();
                            setLastSentChannel("Gmail Web");
                            setSentTimestamp(new Date().toLocaleTimeString());
                            setShowSentConfirmation(true);
                          }}
                          className="w-full bg-[#EA4335] hover:bg-[#D63022] text-white py-3 rounded-xl font-semibold uppercase tracking-wider text-[10px] flex items-center justify-center gap-2.5 transition-all shadow-md text-center no-underline font-bold"
                        >
                          <Mail className="w-3.5 h-3.5" /> Redactar en Gmail (Recomendado)
                        </a>

                        {/* Option 2: Local mail client */}
                        <a
                          href={mailtoUrl}
                          onClick={() => {
                            generatePDF();
                            setLastSentChannel("Outlook / Correo Local");
                            setSentTimestamp(new Date().toLocaleTimeString());
                            setShowSentConfirmation(true);
                          }}
                          className="w-full bg-[#1F4E79] hover:bg-[#1A4269] text-white py-3 rounded-xl font-semibold uppercase tracking-wider text-[10px] flex items-center justify-center gap-2.5 transition-all shadow-sm text-center no-underline font-bold"
                        >
                          <Mail className="w-3.5 h-3.5" /> Enviar por Aplicación Local
                        </a>
                      </div>

                      {/* Manual Confirmation Status Indicator */}
                      <button
                        type="button"
                        onClick={() => {
                          setLastSentChannel("Confirmación Manual");
                          setSentTimestamp(new Date().toLocaleTimeString());
                          setShowSentConfirmation(true);
                        }}
                        className="w-full mt-1 bg-white hover:bg-gray-50 text-gray-600 border border-gray-200 py-1.5 rounded-lg text-[9px] font-extrabold uppercase tracking-widest transition-all cursor-pointer"
                      >
                        Marcar como Enviado Manualmente
                      </button>
                    </div>

                    {showSentConfirmation && (
                      <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl mt-4 animate-in fade-in slide-in-from-top-4 duration-300">
                        <div className="flex items-start gap-2.5">
                          <span className="p-1 bg-emerald-500 text-white rounded-lg flex items-center justify-center mt-0.5">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </span>
                          <div className="flex-1">
                            <h5 className="text-[10px] font-black uppercase tracking-wider text-emerald-800">
                              ✓ Reporte Registrado como Enviado
                            </h5>
                            <p className="text-[11px] text-emerald-700/80 font-medium leading-normal mt-0.5">
                              Despachado vía: <strong className="uppercase">{lastSentChannel}</strong> a las <span className="font-bold">{sentTimestamp}</span>.
                            </p>

                            <div className="mt-2.5 bg-amber-50 border border-amber-200 p-3 rounded-lg text-[9.5px] text-amber-900 leading-normal space-y-2">
                              <div>
                                <span className="font-extrabold uppercase text-amber-800 block mb-0.5">📎 CÓMO GUARDAR Y ADJUNTAR EL PDF:</span>
                                <p className="font-semibold text-[10px]">
                                  ¡El PDF se ha descargado automáticamente en tu dispositivo!
                                </p>
                              </div>
                              <div className="pt-1.5 border-t border-amber-200/50 space-y-1 font-semibold text-amber-900">
                                <p>
                                  1. <strong>Correo:</strong> Debes arrastrar o adjuntar el PDF descargado directamente al correo que se acaba de abrir en tu pantalla.
                                </p>
                                <p>
                                  2. <strong>Carpeta de Desvíos:</strong> Es mandatorio guardar el PDF y reportes mensuales en la carpeta de <strong>{session.branch.toUpperCase()}</strong>:
                                  <a
                                    href={BRANCH_PVT_FOLDER_LINKS[session.branch] || "https://drive.google.com"}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 font-bold text-blue-800 hover:text-blue-900 underline block mt-1"
                                  >
                                    📁 Abrir Carpeta de Desvíos en Google Drive ({session.branch}) →
                                  </a>
                                </p>
                              </div>
                            </div>
                            
                            <div className="mt-2.5 bg-white/70 p-2 rounded border border-emerald-500/10 text-[9.5px] space-y-1">
                              <div><span className="font-extrabold text-[#1F4E79]">PARA:</span> <span className="text-gray-600 font-medium">{toList.join(", ")}</span></div>
                              <div><span className="font-extrabold text-[#1F4E79]">CC:</span> <span className="text-gray-650 font-medium">{[...globalList, ...ccList].join(", ")}</span></div>
                            </div>
                            
                            <button
                              type="button"
                              onClick={() => setShowSentConfirmation(false)}
                              className="mt-2 text-[9px] font-black uppercase tracking-wider text-[#1F4E79] hover:text-blue-950 underline cursor-pointer block"
                            >
                              Ocultar confirmación
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                 </div>

                 {noCumple > 0 && (
                    <div className="bg-red-50 border border-red-100 p-6 rounded-2xl flex items-start gap-4">
                      <div className="p-2 bg-toyota-red rounded-lg shadow-lg">
                        <AlertTriangle className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h5 className="text-[11px] font-black uppercase tracking-widest text-toyota-red mb-1">Plan de Acción Requerido</h5>
                        <p className="text-[12px] text-red-900/70 font-medium leading-relaxed">Se han detectado {noCumple} desvíos. Según normativa Toyota, deben corregirse en un plazo máximo de 7 días hábiles.</p>
                      </div>
                    </div>
                  )}
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                   <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block">Observaciones Finales</label>
                   <div className="bg-gray-50 border border-gray-100 p-6 rounded-2xl min-h-[140px] shadow-inner">
                     <p className="text-sm font-medium text-gray-600 italic">
                       {session.generalObservations ? `"${session.generalObservations}"` : "Sin observaciones adicionales registradas."}
                     </p>
                   </div>
                </div>

                <div className="flex flex-col gap-4">
                  <button 
                    onClick={generatePDF}
                    disabled={isGenerating}
                    className="w-full bg-toyota-black text-white py-4 rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 hover:bg-black transition-all shadow-xl active:scale-[0.98]"
                  >
                    <Download className="w-4 h-4" /> {isGenerating ? "Generando Reporte..." : "Descargar Reporte PDF"}
                  </button>
                  
                  <a
                    href={BRANCH_PVT_FOLDER_LINKS[session.branch] || "https://drive.google.com"}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                      generatePDF(); // Download PDF automatically so they can save it
                      setShowDriveInstructions(true);
                    }}
                    className="w-full bg-[#EBF5FF] border border-blue-200 text-[#1F4E79] py-4 rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 hover:bg-blue-100/60 transition-all active:scale-[0.98] no-underline text-center font-bold"
                  >
                    <CloudUpload className="w-4 h-4 animate-bounce" /> Descargar y Guardar en Carpeta de Desvíos ({session.branch.toUpperCase()})
                  </a>

                  {showDriveInstructions && (
                    <div className="bg-blue-50 border border-blue-200 p-5 rounded-2xl space-y-3 animate-in fade-in slide-in-from-top-4 duration-300">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-[#1F4E79] text-white rounded-lg mt-0.5">
                          <CloudUpload className="w-4 h-4" />
                        </div>
                        <div>
                          <h5 className="text-[11px] font-black uppercase tracking-widest text-[#1F4E79] mb-1">Guía para Guardar en Google Drive</h5>
                          <p className="text-[11.5px] text-blue-900/80 font-bold leading-relaxed mb-2">
                            El PDF de la auditoría se ha descargado a tu computadora y acabamos de abrir la carpeta oficial de Drive de <strong>{session.branch.toUpperCase()}</strong> en otra pestaña.
                          </p>
                          <div className="space-y-1.5 text-[11px] text-gray-700 font-semibold">
                            <p>1. Ve al archivo descargado en tu equipo (barra e historial de descargas).</p>
                            <p>2. Arrástralo y suéltalo dentro de la carpeta de Google Drive que acabamos de abrir para guardarlo permanentemente.</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowDriveInstructions(false)}
                            className="mt-3 text-[10px] font-black uppercase tracking-wider text-[#1F4E79] hover:text-blue-950 underline cursor-pointer block"
                          >
                            Entendido, ocultar guía
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <a
                    href={GLOBAL_PLAN_ACCION_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-white border-2 border-gray-200 text-toyota-black py-4 rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 hover:bg-gray-50 transition-all active:scale-[0.98] no-underline text-center font-bold"
                  >
                    <Send className="w-4 h-4 text-toyota-red" /> Gestionar Plan de Acción
                  </a>
                </div>
              </div>
           </div>
        </div>
      </div>

      {/* SECCIÓN JORNADA MULTI-ASESOR (CONSOLIDADO) */}
      {completedSessions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bento-card overflow-hidden border border-dashed border-[#1F4E79]/40 bg-[#F8FAFC] !p-8 rounded-3xl space-y-6 shadow-sm"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-200/60">
            <div>
              <span className="bg-[#1F4E79] text-white text-[9px] font-black uppercase px-2.5 py-1 rounded-full tracking-wider">
                Resumen de la Jornada
              </span>
              <h3 className="text-xl font-black tracking-tight text-toyota-black mt-2">
                Consolidado de Colaboradores Evaluados
              </h3>
              <p className="text-xs text-gray-400 font-bold mt-1 uppercase tracking-wider">
                Sucursal: <span className="text-[#1F4E79]">{session.branch}</span> | Área: <span className="text-[#1F4E79]">{session.area}</span>
              </p>
            </div>
            
            {/* Average calculator badge */}
            <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-gray-100 shadow-sm self-start md:self-auto">
              <div className="text-right">
                <span className="text-[8px] font-black uppercase text-gray-400 block tracking-wider">PROMEDIO GLOBAL</span>
                <span className="text-lg font-black text-toyota-black leading-none mt-0.5 block">
                  {(() => {
                    let sum = 0;
                    completedSessions.forEach(s => {
                      const c = s.items.filter(i => i.score === 1).length;
                      const n = s.items.filter(i => i.score === 0).length;
                      const d = c + n;
                      const sc = d > 0 ? Math.round((c / d) * 100) : 0;
                      sum += sc;
                    });
                    return completedSessions.length > 0 ? Math.round(sum / completedSessions.length) : 0;
                  })()}%
                </span>
              </div>
              <div className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center text-toyota-red">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* List of completed advisors in current block */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {completedSessions.map((s, idx) => {
              const c = s.items.filter(i => i.score === 1).length;
              const n = s.items.filter(i => i.score === 0).length;
              const d = c + n;
              const sc = d > 0 ? Math.round((c / d) * 100) : 0;
              return (
                <div key={idx} className="bg-white border border-gray-100 p-4 rounded-xl shadow-sm flex items-center justify-between gap-3 hover:border-blue-100 transition-all">
                  <div className="space-y-1">
                    <p className="text-[8px] font-black uppercase text-gray-400 leading-none">Colaborador #{idx + 1}</p>
                    <h5 className="text-sm font-black text-gray-900 leading-tight">{s.advisor}</h5>
                    <div className="flex gap-2 text-[10px] font-bold text-gray-400 uppercase">
                      <span className="text-green-600">✓ {c} Cumple</span>
                      <span className={n > 0 ? "text-red-500 font-extrabold" : ""}>✗ {n} No Cumple</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block text-xs font-black px-2 py-1 rounded-lg ${sc >= 90 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                      {sc}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Consolidated actions */}
          <div className="bg-white border border-[#1F4E79]/15 p-5 rounded-2xl shadow-sm space-y-4">
            <h4 id="despacho-global" className="text-[10px] font-black uppercase text-[#1F4E79] tracking-widest flex items-center gap-1.5 font-sans">
              📧 Enviar Mail Consolidado al Jefe de Área (Un Solo Mail)
            </h4>
            <p className="text-[11px] text-gray-500 font-semibold leading-relaxed">
              Al finalizar de auditar a todos los asesores del área ({session.area}), presiona el botón para enviar un solo correo unificado al Jefe del Área correspondiente con el detalle de desempeño, desvíos detectados y enlaces de planes de acción para todo el equipo.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={generateConsolidatedPDF}
                disabled={isGeneratingConsolidated}
                className="bg-toyota-black text-white hover:bg-black py-3 rounded-lg font-black uppercase tracking-wider text-[9px] flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                {isGeneratingConsolidated ? "Generando consolidado..." : "Descargar PDF Consolidado de la Jornada"}
              </button>

              <div className="grid grid-cols-2 gap-2">
                <a
                  href={consolidatedGmailUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-[#EA4335] text-white hover:bg-[#D63022] py-3 rounded-lg font-black uppercase tracking-wider text-[9px] flex items-center justify-center gap-1.5 transition-all shadow-md text-center no-underline font-bold"
                >
                  <Mail className="w-3.5 h-3.5" /> Enviar por Gmail
                </a>
                <a
                  href={consolidatedMailtoUrl()}
                  className="bg-[#1F4E79] text-white hover:bg-[#1A4269] py-3 rounded-lg font-black uppercase tracking-wider text-[9px] flex items-center justify-center gap-1.5 transition-all shadow-sm text-center no-underline font-bold"
                >
                  <Mail className="w-3.5 h-3.5" /> Correo Local
                </a>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-[10.5px] text-amber-900 leading-normal font-semibold space-y-1 mt-2">
              <p className="font-extrabold uppercase text-amber-800">📌 INSTRUCCIONES PARA DESPACHO CONSOLIDADO:</p>
              <p>1. Presiona <strong>"Descargar PDF Consolidado de la Jornada"</strong> para descargar el reporte maestro unificado.</p>
              <p>2. Presiona cualquiera de los botones de envío de mail (Gmail o Cliente Local).</p>
              <p>3. Arrastre y adjunta el PDF consolidado descargado directamente al borrador del correo abierto.</p>
            </div>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <SummaryAction 
          onClick={() => onReset(true)}
          icon={<UserPlus className="w-6 h-6" />}
          label="Continuar con Otro Asesor"
          sub="Mantiene Sucursal y Área"
          color="toyota-red"
        />
        <SummaryAction 
          onClick={() => onReset(false)}
          icon={<Home className="w-6 h-6" />}
          label="Finalizar Jornada"
          sub="Reiniciar Configuración Global"
          color="toyota-black"
        />
      </div>
    </div>
  );
}

function StatResult({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center group">
      <p className="text-[9px] uppercase font-black text-white/50 tracking-[0.2em] mb-2 group-hover:text-white transition-colors">{label}</p>
      <p className="text-4xl font-black group-hover:scale-110 transition-transform">{value}</p>
    </div>
  );
}

function SummaryAction({ onClick, icon, label, sub, color }: { onClick: () => void; icon: React.ReactNode; label: string; sub: string; color: string }) {
  const isRed = color === "toyota-red";
  return (
    <motion.button
      whileHover={{ y: -4, shadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)" }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="bento-card !p-8 flex flex-col items-center gap-4 group cursor-pointer text-center"
    >
      <div className={`p-5 rounded-2xl transition-all duration-300 ${isRed ? 'bg-red-50 text-toyota-red group-hover:bg-toyota-red group-hover:text-white' : 'bg-gray-50 text-toyota-black group-hover:bg-toyota-black group-hover:text-white'}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm font-black uppercase tracking-tight text-toyota-black mb-1 leading-none">{label}</p>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{sub}</p>
      </div>
    </motion.button>
  );
}

function ReportStatus({ label, sub }: { label: string; sub: string }) {
  return (
    <div className="flex items-center justify-between bg-white px-4 py-3 rounded-xl border border-gray-100 shadow-sm">
      <div>
        <p className="text-xs font-black text-gray-900">{label}</p>
        <p className="text-[10px] font-bold text-gray-400 capitalize">{sub}</p>
      </div>
      <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
        <CheckCircle2 className="w-4 h-4 text-green-600" />
      </div>
    </div>
  );
}
