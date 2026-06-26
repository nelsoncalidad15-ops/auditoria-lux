/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import { getAudits } from "../lib/auditStorage";
import { sheetsService } from "../services/sheetsService";
import { Area, Branch, Question, AuditSession, AuditItem } from "../types";
import { 
  ChevronDown, 
  ChevronUp, 
  BarChart3, 
  MapPin, 
  Calendar, 
  User, 
  CheckCircle2, 
  XCircle, 
  MinusCircle,
  TrendingUp,
  Award,
  Filter,
  Info,
  Mail,
  Copy,
  Download
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { GLOBAL_PLAN_ACCION_URL, BRANCH_PVT_FOLDER_LINKS, GLOBAL_QUALITY_RECIPIENTS, STATIC_CC_RECIPIENTS } from "../services/distributionService";

// Disciplines defined as user requested:
// - Asesores de Cita
// - Servicios
// - Técnicos
// - Repuesto
// - Gestión PVT
type DisciplineType = "citas" | "servicios" | "tecnicos" | "repuestos" | "gestion_pvt";

interface DisciplineConfig {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

const DISCIPLINE_METADATA: Record<DisciplineType, DisciplineConfig> = {
  citas: {
    label: "Asesores de Cita",
    color: "text-blue-600 bg-blue-50",
    bgColor: "bg-blue-600",
    borderColor: "border-blue-100",
  },
  servicios: {
    label: "Servicios",
    color: "text-emerald-600 bg-emerald-50",
    bgColor: "bg-emerald-600",
    borderColor: "border-emerald-100",
  },
  tecnicos: {
    label: "Técnicos",
    color: "text-purple-600 bg-purple-50",
    bgColor: "bg-purple-600",
    borderColor: "border-purple-100",
  },
  repuestos: {
    label: "Repuestos",
    color: "text-amber-600 bg-amber-50",
    bgColor: "bg-amber-600",
    borderColor: "border-amber-100",
  },
  gestion_pvt: {
    label: "Gestión PVT",
    color: "text-rose-600 bg-rose-50",
    bgColor: "bg-rose-600",
    borderColor: "border-rose-100",
  },
};

// Spanish Month helper
const getSpanishMonthName = (dateStr: string | undefined): string => {
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
};

interface AuditDashboardProps {
  initialOpen?: boolean;
  initialTab?: "summary" | "by_area";
}

export function AuditDashboard({ 
  initialOpen = false, 
  initialTab = "summary" 
}: AuditDashboardProps) {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [activeTab, setActiveTab] = useState<"summary" | "by_area">(initialTab);
  const [loading, setLoading] = useState(false);
  const [audits, setAudits] = useState<any[]>([]);
  const [questionsMap, setQuestionsMap] = useState<Record<string, Question[]>>({});
  const [selectedBranch, setSelectedBranch] = useState<string>("ALL");
  const [selectedMonth, setSelectedMonth] = useState<string>("ALL");
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [expandedAuditId, setExpandedAuditId] = useState<string | null>(null);
  const [copiedEmail, setCopiedEmail] = useState(false);

  // Sync Query Parameters on Mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const qBranch = params.get("branch");
    const qMonth = params.get("month");
    const qView = params.get("view");
    
    if (qView === "report") {
      setIsOpen(true);
      setActiveTab("by_area");
    }
    if (qBranch) {
      setSelectedBranch(qBranch);
    }
    if (qMonth) {
      setSelectedMonth(qMonth.toUpperCase());
    }
  }, []);

  // Load audits on open
  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    setLoading(true);
    try {
      const fetchedAudits = await getAudits();
      setAudits(fetchedAudits);

      // Identify unique (area, branch) to pre-load questions
      setLoadingQuestions(true);
      const uniqueCombos = Array.from(
        new Set(
          fetchedAudits
            .filter(a => a.area && a.branch)
            .map(a => `${a.area}|${a.branch}`)
        )
      );

      const qMap: Record<string, Question[]> = {};
      await Promise.all(
        uniqueCombos.map(async (combo) => {
          const [area, branch] = combo.split("|") as [Area, Branch];
          try {
            const qs = await sheetsService.getQuestions(area, branch);
            qMap[combo] = qs;
          } catch (e) {
            console.error(`Failed to load questions for ${combo}:`, e);
          }
        })
      );
      setQuestionsMap(qMap);
    } catch (e) {
      console.error("Error loading dashboard audits:", e);
    } finally {
      setLoading(false);
      setLoadingQuestions(false);
    }
  };

  // Helper to map an item to a discipline
  const getDiscipline = (questionId: string, area: Area, comboKey: string): DisciplineType | null => {
    const qs = questionsMap[comboKey] || [];
    const q = qs.find(qObj => qObj.id === questionId);

    // Fallbacks based on static area
    if (area === Area.CITAS_CALL || area === Area.CITAS_PRESENCIAL) {
      return "citas";
    }
    if (area === Area.SERVICIOS) {
      return "servicios";
    }
    if (area === Area.TALLER) {
      return "tecnicos";
    }
    if (area === Area.REPUESTOS) {
      return "repuestos";
    }
    if (area === Area.GESTION_PVT) {
      if (q && q.responsible) {
        const resp = q.responsible.toUpperCase();
        if (resp.includes("SERVICIO")) return "servicios";
        if (resp.includes("TALLER") || resp.includes("LAVADERO")) return "tecnicos";
        if (resp.includes("GARANTIA") || resp.includes("GARANTÍA")) return "gestion_pvt";
        if (resp.includes("SUB GERENTE") || resp.includes("SUBGERENTE") || resp.includes("GERENTE")) return "gestion_pvt";
      }
      return "gestion_pvt";
    }
    if (area === Area.ORDENES) {
      // Ordenes / Recepcion se informa como area propia. No debe sumar
      // a las disciplinas de Servicios ni Tecnicos para evitar doble conteo.
      return null;
    }
    return null;
  };

  // Filtered audits by Branch and Month
  const filteredAudits = useMemo(() => {
    return audits.filter(a => {
      const matchBranch = selectedBranch === "ALL" || a.branch === selectedBranch;
      const matchMonth = selectedMonth === "ALL" || getSpanishMonthName(a.date) === selectedMonth;
      return matchBranch && matchMonth;
    });
  }, [audits, selectedBranch, selectedMonth]);

  // Calculations per Area and Discipline (Tab 1)
  const stats = useMemo(() => {
    const areaStats: Record<string, { cumple: number; total: number }> = {};
    const disciplineStats: Record<DisciplineType, { cumple: number; total: number }> = {
      citas: { cumple: 0, total: 0 },
      servicios: { cumple: 0, total: 0 },
      tecnicos: { cumple: 0, total: 0 },
      repuestos: { cumple: 0, total: 0 },
      gestion_pvt: { cumple: 0, total: 0 },
    };

    filteredAudits.forEach(audit => {
      const { area, branch, items } = audit;
      if (!area || !items || !Array.isArray(items)) return;

      const comboKey = `${area}|${branch}`;

      // Initialize area stats
      if (!areaStats[area]) {
        areaStats[area] = { cumple: 0, total: 0 };
      }

      items.forEach((item: AuditItem) => {
        const score = item.score;
        if (score === "N/A") return;

        const isCumple = score === 1;

        // Add to general area stats
        areaStats[area].total += 1;
        if (isCumple) areaStats[area].cumple += 1;

        // Classify to discipline
        const discipline = getDiscipline(item.questionId, area, comboKey);
        if (discipline) {
          disciplineStats[discipline].total += 1;
          if (isCumple) disciplineStats[discipline].cumple += 1;
        }
      });
    });

    return { areaStats, disciplineStats };
  }, [filteredAudits, questionsMap]);

  // Deep Calculations per Area, advisors and deviations (Tab 2)
  const areaDetails = useMemo(() => {
    const detailsMap: Record<Area, {
      score: number;
      auditsCount: number;
      advisors: { name: string; score: number; date: string }[];
      deviations: { advisor: string; questionId: string; text: string; criteria?: string; observation?: string; date: string }[];
    }> = {} as any;

    // Initialize all areas
    Object.values(Area).forEach(area => {
      detailsMap[area] = {
        score: 0,
        auditsCount: 0,
        advisors: [],
        deviations: []
      };
    });

    filteredAudits.forEach(audit => {
      const { area, branch, advisor, date, items } = audit;
      if (!area || !items || !Array.isArray(items)) return;

      const comboKey = `${area}|${branch}`;
      const areaInfo = detailsMap[area as Area];
      if (!areaInfo) return;

      // Calculate score for this specific audit
      const cumples = items.filter(i => i.score === 1).length;
      const nonNA = items.filter(i => i.score !== "N/A" && i.score !== undefined).length;
      const auditScore = nonNA > 0 ? Math.round((cumples / nonNA) * 100) : 0;

      areaInfo.auditsCount += 1;
      
      // Add advisor average score
      areaInfo.advisors.push({
        name: advisor || "Sin Nombre",
        score: auditScore,
        date
      });

      // Collect deviations
      items.forEach((item: AuditItem, idx: number) => {
        if (item.score === 0) {
          const qs = questionsMap[comboKey] || [];
          const q = qs.find(qObj => qObj.id === item.questionId);
          const qText = q?.text || `Pregunta ${idx + 1}`;
          const qCriteria = q?.criteria;
          
          areaInfo.deviations.push({
            advisor: advisor || "Sin Nombre",
            questionId: item.questionId,
            text: qText,
            criteria: qCriteria,
            observation: item.observation,
            date
          });
        }
      });
    });

    // Compute Area Averages
    Object.values(Area).forEach(area => {
      const areaInfo = detailsMap[area as Area];
      if (areaInfo.advisors.length > 0) {
        const sum = areaInfo.advisors.reduce((acc, curr) => acc + curr.score, 0);
        areaInfo.score = Math.round(sum / areaInfo.advisors.length);
      } else {
        areaInfo.score = 0;
      }
    });

    return detailsMap;
  }, [filteredAudits, questionsMap]);

  // How many areas have audits recorded under current filters
  const activeAreasCount = useMemo(() => {
    return Object.values(Area).filter(areaKey => areaDetails[areaKey].auditsCount > 0).length;
  }, [areaDetails]);

  const [isGeneratingMonthly, setIsGeneratingMonthly] = useState(false);

  // Generate PDF for the Monthly report con el nivel de cumplimiento por área
  const generateMonthlyReportPDF = async () => {
    setIsGeneratingMonthly(true);
    try {
      const doc = new jsPDF();
      const month = selectedMonth === "ALL" ? getSpanishMonthName(new Date().toISOString().split("T")[0]) : selectedMonth;
      const branch = selectedBranch === "ALL" ? "SALTA" : selectedBranch;

      // Header Banner (Toyota Red)
      doc.setFillColor(235, 20, 20); // Toyota Red
      doc.rect(0, 0, 210, 40, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("AUTOLUX S.A. - REPORTE DE CALIDAD MENSUAL", 20, 18);
      doc.setFontSize(10);
      doc.text("SISTEMA DE AUDITORÍAS DE PROCESOS POSVENTA TOYOTA", 20, 28);

      // Metadata block
      doc.setTextColor(50, 50, 50);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`Sucursal de Evaluación: ${branch.toUpperCase()}`, 20, 52);
      doc.text(`Mes de Reporte: ${month.toUpperCase()}`, 20, 59);
      doc.text(`Fecha de Emisión: ${new Date().toLocaleDateString()}`, 150, 52);
      doc.text(`Área: Calidad y Procesos`, 150, 59);

      // Calculate general stats
      let totalItems = 0;
      let totalCumple = 0;
      
      Object.keys(stats.areaStats).forEach(key => {
        const areaData = stats.areaStats[key];
        if (areaData && areaData.total > 0) {
          totalItems += areaData.total;
          totalCumple += areaData.cumple;
        }
      });
      
      const overallScore = totalItems > 0 ? Math.round((totalCumple / totalItems) * 100) : 0;
      const totalDeviations = totalItems - totalCumple;

      // Cards with White backgrounds, light gray borders, black text, red scores if disapproved (<90%), black scores if approved
      doc.setDrawColor(220, 220, 220);

      // Card 1: Promedio de Cumplimiento
      doc.setFillColor(255, 255, 255);
      doc.rect(20, 70, 52, 24, "FD");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(0, 0, 0); // Black labels
      doc.text("PROMEDIO DE CUMPLIMIENTO", 23, 76);
      doc.setFontSize(16);
      if (overallScore < 90) {
        doc.setTextColor(235, 20, 20); // Red if disapproved (< 90%)
      } else {
        doc.setTextColor(0, 0, 0); // Black if approved (>= 90%)
      }
      doc.text(`${overallScore}%`, 36, 88);

      // Card 2: Sectores Evaluados
      doc.setFillColor(255, 255, 255);
      doc.rect(79, 70, 52, 24, "FD");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(0, 0, 0); // Black labels
      doc.text("SECTORES PLANIFICADOS", 82, 76);
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      const activeAreasCount = Object.keys(stats.areaStats).filter(key => stats.areaStats[key] && stats.areaStats[key].total > 0).length;
      doc.text(`${activeAreasCount}`, 101, 88);

      // Card 3: Desvíos Detectados
      doc.setFillColor(255, 255, 255);
      doc.rect(138, 70, 52, 24, "FD");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(0, 0, 0); // Black labels
      doc.text("DESVÍOS ACUMULADOS", 141, 76);
      doc.setFontSize(16);
      doc.setTextColor(totalDeviations > 0 ? 235 : 0, totalDeviations > 0 ? 20 : 0, totalDeviations > 0 ? 20 : 0);
      doc.text(`${totalDeviations}`, 160, 88);

      // Main Table Title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(26, 26, 26);
      doc.text("NIVEL DE CUMPLIMIENTO POR SECTOR / ÁREA", 20, 108);

      const areasList = [
        { key: Area.CITAS_CALL, label: "📞 Citas Call" },
        { key: Area.CITAS_PRESENCIAL, label: "🏢 Citas Presencial" },
        { key: Area.SERVICIOS, label: "🛠️ Servicios" },
        { key: Area.TALLER, label: "⚙️ Taller" },
        { key: Area.REPUESTOS, label: "📦 Repuestos" },
        { key: Area.ORDENES, label: "📝 Ordenes / Recepción" },
        { key: Area.GESTION_PVT, label: "👔 Gestión PVT" },
      ];

      // Table mapping areas
      autoTable(doc, {
        startY: 113,
        head: [['Sectores de Posventa', 'Evaluaciones Satisfechas', 'Desvíos Identificados', 'Resultado (%)', 'Estado']],
        body: areasList.map((areaObj) => {
          const areaData = stats.areaStats[areaObj.key];
          const hasData = areaData && areaData.total > 0;
          const pctVal = hasData ? Math.round((areaData.cumple / areaData.total) * 100) : null;
          const pctStr = pctVal !== null ? `${pctVal}%` : "N/A";
          const statusStr = pctVal !== null ? (pctVal >= 90 ? "Aprobado" : "Req. Acción") : "No Evaluado";
          const isApproved = pctVal === null || pctVal >= 90;

          return [
            areaObj.label.startsWith("📞") || areaObj.label.startsWith("🏢") || areaObj.label.startsWith("🛠️") || areaObj.label.startsWith("⚙️") || areaObj.label.startsWith("📦") || areaObj.label.startsWith("📝") || areaObj.label.startsWith("👔") ? areaObj.label.substring(3) : areaObj.label,
            hasData ? areaData.cumple : "-",
            hasData ? (areaData.total - areaData.cumple) : "-",
            {
              content: pctStr,
              styles: { textColor: pctVal === null ? [120, 120, 120] : (isApproved ? [0, 0, 0] : [235, 20, 20]), fontStyle: 'bold' }
            },
            {
              content: statusStr,
              styles: { textColor: pctVal === null ? [120, 120, 120] : (isApproved ? [0, 0, 0] : [235, 20, 20]), fontStyle: 'bold' }
            }
          ];
        }),
        headStyles: { fillColor: [26, 26, 26], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [250, 250, 250] },
        styles: { fontSize: 8 },
        margin: { left: 20, right: 20 }
      });

      let currentY = (doc as any).lastAutoTable.finalY + 15;

      // Add a section for plan action reminder
      if (totalDeviations > 0) {
        doc.setTextColor(235, 20, 20); // Toyota Red
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text("GESTIÓN DE PLANES DE ACCIÓN MANDATORIOS:", 20, currentY);
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        const instructions = `Se han detectado un total de ${totalDeviations} desvíos acumulados de procesos en el mes. Es de carácter mandatario que los responsables sectoriales ingresen las contramedidas inmediatas en la carpeta de Planes de Acción dentro del plazo estipulado.`;
        const splitInstructions = doc.splitTextToSize(instructions, 170);
        doc.text(splitInstructions, 20, currentY + 5);

        doc.setTextColor(31, 78, 121); // Blue link color
        doc.setFont("helvetica", "bold");
        doc.textWithLink("🔗 INGRESAR AL PLAN DE ACCIÓN GLOBAL DE DRIVE", 20, currentY + 16, { url: GLOBAL_PLAN_ACCION_URL });
      } else {
        doc.setTextColor(20, 150, 20); // Green
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text("¡FELICITACIONES POR EXCELENCIA EN PROCESOS!", 20, currentY);
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        const matchText = `La Sucursal ${branch.toUpperCase()} ha alcanzado un sobresaliente 100% de cumplimiento general en posventa para el mes de ${month.toUpperCase()}. Sigan manteniendo este impecable estándar operativo.`;
        const splitMatch = doc.splitTextToSize(matchText, 170);
        doc.text(splitMatch, 20, currentY + 5);
      }

      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text("Este reporte consolidado reúne los niveles de cumplimiento mensual de procesos posventa para Autolux S.A.", 20, 285);

      doc.save(`Reporte_Global_Mensual_${branch}_${month}.pdf`);
    } catch (error) {
      console.error("Error generating monthly PDF report", error);
    } finally {
      setIsGeneratingMonthly(false);
    }
  };

  // Generate Email template for Board of Directors
  const generateDirectorEmail = (isCompact = false) => {
    const month = selectedMonth === "ALL" ? getSpanishMonthName(new Date().toISOString().split("T")[0]) : selectedMonth;
    const branch = selectedBranch === "ALL" ? "SALTA" : selectedBranch;

    const subject = `CALIDAD | LUX - ${branch.toUpperCase()} | Reporte Global Consolidado | Posventa | ${month}`;

    let body = `Estimados:\n\n`;
    body += `Les comparto los resultados de la Auditoría de Procesos PRESENCIAL correspondiente al mes de ${month} en la Sucursal de ${branch.toUpperCase()}. Recuerden que el objetivo de calidad establecido es alcanzar un cumplimiento del 90% o superior (>= 90%).\n\n`;

    const activeAreas = Object.values(Area).filter(area => areaDetails[area as Area].auditsCount > 0);
    const auditedAreasStr = activeAreas.map(a => a.toUpperCase()).join(" y ");
    
    body += `En esta instancia se auditó: ${auditedAreasStr || "las áreas de Posventa"}.\n\n`;
    
    // Platform report URL (safely mapping the developer-restricted preview domain to the public shared view domain)
    let origin = window.location.origin;
    if (origin.includes("-dev-")) {
      origin = origin.replace("-dev-", "-pre-");
    }
    const rawShareUrl = `${origin}${window.location.pathname}?view=report&branch=${branch}&month=${month}`;
    body += `Pueden consultar los resultados dinámicos y analizar los desvíos detallados en el siguiente enlace de la plataforma (acceso libre en modo lectura):\n`;
    body += `LINK: ${rawShareUrl}\n\n`;
    body += `📁 Carpeta de Desvíos en Google Drive:\n${BRANCH_PVT_FOLDER_LINKS[branch as Branch] || "https://drive.google.com"}\n\n`;

    body += `En caso de detectar desvíos, les solicito que completen el Plan de Acción a más tardar dentro del plazo establecido para cada auditoría.\n`;
    body += `Pueden acceder al plan en el siguiente enlace:\n`;
    body += `LINK: ${GLOBAL_PLAN_ACCION_URL}\n\n`;

    body += `==================================================\n`;
    body += `📋 NIVEL DE CUMPLIMIENTO POR ÁREA (OBJETIVO >=90%):\n`;
    body += `==================================================\n\n`;

    const areasList = [
      { key: Area.CITAS_CALL, label: "📞 Citas Call" },
      { key: Area.CITAS_PRESENCIAL, label: "🏢 Citas Presencial" },
      { key: Area.SERVICIOS, label: "🛠️ Servicios" },
      { key: Area.TALLER, label: "⚙️ Taller" },
      { key: Area.REPUESTOS, label: "📦 Repuestos" },
      { key: Area.ORDENES, label: "📝 Ordenes / Recepción" },
      { key: Area.GESTION_PVT, label: "👔 Gestión PVT" },
    ];

    areasList.forEach(areaObj => {
      const data = stats.areaStats[areaObj.key];
      const hasData = data && data.total > 0;
      const pctVal = hasData ? Math.round((data.cumple / data.total) * 100) : null;

      if (pctVal !== null) {
        const isApproved = pctVal >= 90;
        const statusText = isApproved ? "APROBADO ✅" : "REQUIERE ACCIÓN ❌";
        if (isCompact) {
          body += `${areaObj.label}: [ ${pctVal}% ] - ${statusText}\n`;
        } else {
          body += `${areaObj.label}: [ ${pctVal}% ] - ${statusText}\n`;
          body += `   PUNTAJE: ${data.cumple} / ${data.total} ITEMS  |  ${pctVal}% DE ÉXITO\n\n`;
        }
      } else {
        if (!isCompact) {
          body += `${areaObj.label}: [ N/A ] - NO EVALUADO ⚪\n\n`;
        }
      }
    });

    if (isCompact) {
      body += `\n`;
    }

    body += `==================================================\n`;
    body += `⚠️ DETALLE DE DESVÍOS E IMÁGENES DE SOPORTE:\n`;
    body += `==================================================\n\n`;
    body += `Para optimizar la visualización y agilidad, el detalle individualizado de cada desvío detectado por colaborador, los planes de acción correctiva cargados y las fotografías de evidencia se encuentran disponibles directamente ingresando de manera digital al enlace de la plataforma provisto arriba.\n\n`;
    body += `📎 NOTA: Recomendamos descargar el Reporte de Calidad Mensual (PDF) consolidado con el nivel de cumplimiento por área desde la plataforma y adjuntarlo directamente a este correo.\n\n`;
    body += `Saludos cordiales,\nÁrea de Calidad y Procesos - Autolux S.A.`;

    const toEmails = GLOBAL_QUALITY_RECIPIENTS.join(",");
    const ccEmails = STATIC_CC_RECIPIENTS.join(",");

    const mailto = `mailto:${toEmails}?cc=${ccEmails}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    const gmail = `https://mail.google.com/mail/?view=cm&fs=1&to=${toEmails}&cc=${ccEmails}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    return { mailto, gmail, body };
  };

  return (
    <div className="w-full max-w-4xl mx-auto mt-8 border border-gray-150 rounded-2xl bg-white shadow-sm overflow-hidden">
      {/* Header section toggleable */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-gray-50/50 transition-colors focus:outline-none"
      >
        <div className="flex items-center gap-4">
          <div className="p-3 bg-toyota-red/10 text-toyota-red rounded-xl">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-black text-toyota-black tracking-tight uppercase font-sans">
              📊 Resultados de Auditorías Realizadas
            </h3>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-0.5 font-sans">
              Estadísticas consolidadas por área, filtros mensuales y desvíos detallados
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {audits.length > 0 && !isOpen && (
            <span className="bg-gray-100 text-gray-650 font-black text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider font-sans">
              {audits.length} Registradas
            </span>
          )}
          {isOpen ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </button>

      {/* Dynamic folding animation */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="border-t border-gray-100"
          >
            {loading ? (
              <div className="py-16 text-center text-gray-400 font-semibold flex flex-col items-center gap-3">
                <div className="w-8 h-8 rounded-full border-4 border-toyota-red/20 border-t-toyota-red animate-spin" />
                <span>Cargando datos de auditoría...</span>
              </div>
            ) : audits.length === 0 ? (
              <div className="p-12 text-center text-gray-400 font-bold uppercase tracking-wider text-xs font-sans">
                🫙 No hay auditorías completadas registradas en el sistema aún.
              </div>
            ) : (
              <div className="p-6 bg-gray-50/20 space-y-6">
                
                {/* Branch and Month selector & filter */}
                <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between bg-white p-4 rounded-xl border border-gray-150">
                  <div className="flex items-center gap-2 text-xs font-black text-[#1F4E79] uppercase tracking-wider font-sans">
                    <Filter className="w-4 h-4 text-toyota-red" />
                    Filtros de Sucursal y Mes
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center shrink-0">
                    <div className="flex flex-wrap gap-1">
                      {["ALL", Branch.SALTA, Branch.JUJUY, Branch.TARTAGAL, Branch.LA_LAJITAS].map((b) => (
                        <button
                          key={b}
                          type="button"
                          onClick={() => setSelectedBranch(b)}
                          className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-colors border font-sans ${
                            selectedBranch === b
                              ? "bg-toyota-black text-white border-toyota-black shadow-sm"
                              : "bg-gray-50 hover:bg-gray-100 text-gray-500 border-gray-200"
                          }`}
                        >
                          {b === "ALL" ? "Todas" : b}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 max-w-[180px]">
                      <span className="text-[8.5px] font-black uppercase text-gray-400 font-sans">Mes:</span>
                      <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="bg-transparent text-xs font-black text-[#1F4E79] uppercase border-none focus:outline-none focus:ring-0 cursor-pointer pr-1"
                      >
                        <option value="ALL">TODOS</option>
                        {["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"].map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Management Monthly Email section */}
                <div className="bg-[#B4C6E7]/35 p-5 rounded-2xl border border-[#8FAADC]/40 space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-[#1F497D]/10 text-[#1F497D] rounded-xl shrink-0">
                      <Mail className="w-6 h-6" />
                    </div>
                    <div className="space-y-1 font-sans">
                      <h4 className="text-sm font-black text-[#1F4E79] uppercase tracking-wide">
                        📧 Reporte Mensual para la Dirección - {selectedBranch === "ALL" ? "TODAS LAS SUCURSALES" : `SUCURSAL ${selectedBranch.toUpperCase()}`}
                      </h4>
                      <p className="text-[11.5px] text-gray-750 font-semibold leading-relaxed">
                        Prepara y envía la plantilla oficial de correo de calidad dirigida a la Dirección y Jefaturas de Posventa para detallar el desempeño mensual. El cuerpo del mensaje incluye automáticamente el nivel de cumplimiento y puntajes de las 7 áreas de procesos filtrados para el mes de <strong>{selectedMonth === "ALL" ? "Todos los Meses" : selectedMonth}</strong>.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2.5 pt-1 justify-end font-sans">
                    <button
                      type="button"
                      onClick={generateMonthlyReportPDF}
                      disabled={isGeneratingMonthly}
                      className="bg-toyota-red hover:bg-black text-white px-4.5 py-2.5 rounded-lg font-black uppercase tracking-wider text-[10px] flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer font-bold disabled:opacity-50"
                    >
                      <Download className="w-3.5 h-3.5" />
                      {isGeneratingMonthly ? "Generando Reporte..." : "Descargar Reporte Mensual PDF 📄"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const emailData = generateDirectorEmail(false);
                        navigator.clipboard.writeText(emailData.body);
                        setCopiedEmail(true);
                        setTimeout(() => setCopiedEmail(false), 2500);
                      }}
                      className="bg-white hover:bg-gray-50 text-gray-800 border border-gray-350 px-4.5 py-2.5 rounded-lg font-black uppercase tracking-wider text-[10px] flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer font-bold"
                    >
                      {copiedEmail ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 animate-pulse" /> ¡Copiado al Portapapeles!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" /> Copiar Texto de Correo 📋
                        </>
                      )}
                    </button>
                    <a
                      href={generateDirectorEmail(true).gmail}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-[#EA4335] text-white hover:bg-[#D63022] px-4.5 py-2.5 rounded-lg font-black uppercase tracking-wider text-[10px] flex items-center justify-center gap-1.5 transition-all shadow-md no-underline font-bold"
                    >
                      <Mail className="w-3.5 h-3.5" /> Enviar Reporte por Gmail (Recomendado)
                    </a>
                    <a
                      href={generateDirectorEmail(true).mailto}
                      className="bg-[#1F497D] text-white hover:bg-[#153459] px-4.5 py-2.5 rounded-lg font-black uppercase tracking-wider text-[10px] flex items-center justify-center gap-1.5 transition-all shadow-sm no-underline font-bold"
                    >
                      <Mail className="w-3.5 h-3.5" /> Cliente de Correo Tradicional (Mailto)
                    </a>
                  </div>

                   <div className="w-full mt-3 p-3.5 bg-[#E2F0D9] text-[#385723] rounded-lg border border-[#A9D18E] text-[10px] font-semibold space-y-1.5">
                    <p>
                      💡 <strong>Límites de Longitud en Enlaces (Evitar Error 400):</strong> Los botones directos ("Gmail" y "Mailto") abren una plantilla compactada para prevenir el error 'Solicitud incorrecta 400' de Gmail (ocasionado por límites de caracteres en el navegador). Para enviar el desglose de texto completo, presione <strong>"Copiar Texto de Correo 📋"</strong> y péguelo manualmente en su redactor de correos.
                    </p>
                    <p>
                      ✓ <strong>Acceso Abierto (Solo Lectura):</strong> Se habilitó el acceso público en modo lectura para los reportes de calidad. Cualquier directivo o funcionario externo que reciba el enlace podrá abrir la plataforma e ingresar directamente a la hoja de resultados y resumen mensual (sin requerir credenciales de auditor).
                    </p>
                  </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex border-b border-gray-200 bg-white rounded-t-xl overflow-hidden p-1 shadow-inner-sm gap-1">
                  <button
                    type="button"
                    onClick={() => setActiveTab("summary")}
                    className={`flex-1 py-3 text-center text-xs font-black uppercase tracking-wider rounded-lg transition-colors font-sans ${
                      activeTab === "summary"
                        ? "bg-toyota-black text-white shadow-sm"
                        : "hover:bg-gray-50 text-gray-400 hover:text-gray-650"
                    }`}
                  >
                    🏆 Resumen General de Roles
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("by_area")}
                    className={`flex-1 py-3 text-center text-xs font-black uppercase tracking-wider rounded-lg transition-colors font-sans ${
                      activeTab === "by_area"
                        ? "bg-toyota-black text-white shadow-sm"
                        : "hover:bg-gray-50 text-gray-400 hover:text-gray-650"
                    }`}
                  >
                    📂 Resultados por Área ({activeAreasCount})
                  </button>
                </div>

                {/* TAB 1: SUMMARY OF ROLES */}
                {activeTab === "summary" && (
                  <div className="space-y-8">
                    {/* 1. DISCIPLINE COMPLIANCE (ROLES REQUERIDOS) */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-5 h-5 text-[#1F4E79]" />
                        <h4 className="text-xs font-black uppercase tracking-[0.15em] text-[#1F4E79] font-sans">
                          🏆 Cumplimiento por Roles / Disciplinas
                        </h4>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        {(Object.keys(DISCIPLINE_METADATA) as DisciplineType[]).map((discKey) => {
                          const m = DISCIPLINE_METADATA[discKey];
                          const data = stats.disciplineStats[discKey];
                          const hasData = data && data.total > 0;
                          const pct = hasData ? Math.round((data.cumple / data.total) * 100) : "N/A";

                          return (
                            <div
                              key={discKey}
                              className={`bg-white border rounded-xl p-4 flex flex-col justify-between shadow-sm min-h-[110px] transition-all hover:shadow-md ${m.borderColor}`}
                            >
                              <div>
                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded tracking-wider font-sans ${m.color}`}>
                                  {m.label}
                                </span>
                              </div>
                              <div className="mt-4 flex items-baseline justify-between">
                                <span className="text-2xl font-black text-toyota-black tracking-tight font-sans">
                                  {pct === "N/A" ? "N/A" : `${pct}%`}
                                </span>
                                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest font-sans">
                                  {hasData ? `${data.cumple}/${data.total} Pts` : "No Evaluado"}
                                </span>
                              </div>
                              {hasData && typeof pct === "number" && (
                                <div className="w-full bg-gray-100 h-1.5 rounded-full mt-2 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${m.bgColor}`}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* 2. AREA COMPLIANCE */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Award className="w-5 h-5 text-[#1F4E79]" />
                        <h4 className="text-xs font-black uppercase tracking-[0.15em] text-[#1F4E79] font-sans">
                          📊 Nivel de Cumplimiento por Área
                        </h4>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {[
                          { key: Area.CITAS_CALL, label: "📞 Citas Call" },
                          { key: Area.CITAS_PRESENCIAL, label: "🏢 Citas Presencial" },
                          { key: Area.SERVICIOS, label: "🛠️ Servicios" },
                          { key: Area.TALLER, label: "⚙️ Taller" },
                          { key: Area.REPUESTOS, label: "📦 Repuestos" },
                          { key: Area.ORDENES, label: "📝 Ordenes / Recepción" },
                          { key: Area.GESTION_PVT, label: "👔 Gestión PVT" },
                        ].map((areaObj) => {
                          const data = stats.areaStats[areaObj.key];
                          const hasData = data && data.total > 0;
                          const pctVal = hasData ? Math.round((data.cumple / data.total) * 100) : null;

                          return (
                            <div key={areaObj.key} className="bg-white rounded-xl p-4 border border-gray-150 shadow-inner-sm">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-black text-toyota-black truncate max-w-[150px] font-sans">
                                  {areaObj.label}
                                </span>
                                <span className={`text-xs font-black px-2 py-0.5 rounded font-sans ${
                                  pctVal === null
                                    ? "bg-gray-100 text-gray-400"
                                    : pctVal >= 90
                                      ? "bg-green-100 text-green-700"
                                      : "bg-red-100 text-toyota-red"
                                }`}>
                                  {pctVal === null ? "N/A" : `${pctVal}%`}
                                </span>
                              </div>
                              {hasData && pctVal !== null && (
                                <div className="mt-2.5">
                                  <div className="flex justify-between items-center mb-1 text-[9px] font-bold text-gray-400 uppercase tracking-wider font-sans">
                                    <span>Puntaje: {data.cumple} / {data.total} Items</span>
                                    <span>{pctVal}% de éxito</span>
                                  </div>
                                  <div className="w-full bg-gray-50 h-1.5 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${
                                        pctVal >= 90 ? "bg-green-500" : "bg-toyota-red"
                                      }`}
                                      style={{ width: `${pctVal}%` }}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* 3. COLLAPSIBLE RECENT AUDITS HISTORY */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-5 h-5 text-[#1F4E79]" />
                          <h4 className="text-xs font-black uppercase tracking-[0.15em] text-[#1F4E79] font-sans">
                            📜 Historial de Evaluaciones Realizadas
                          </h4>
                        </div>
                      </div>

                      <div className="space-y-2.5">
                        {filteredAudits.slice(0, 15).map((audit) => {
                          const isExpanded = expandedAuditId === audit.id;
                          const scoreVal = audit.score !== undefined ? Math.round(audit.score) : null;

                          return (
                            <div
                              key={audit.id}
                              className="bg-white border border-gray-150 rounded-xl overflow-hidden shadow-sm transition-all hover:border-gray-300"
                            >
                              {/* Accordion Trigger */}
                              <div
                                onClick={() => setExpandedAuditId(isExpanded ? null : audit.id)}
                                className="p-4 flex items-center justify-between text-left cursor-pointer hover:bg-gray-50/50 transition-all font-sans"
                              >
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full mr-4">
                                  <div className="min-w-0">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block font-sans">Sucursal</span>
                                    <span className="text-xs font-bold text-toyota-black truncate block font-sans">{audit.branch}</span>
                                  </div>
                                  <div className="min-w-0">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block font-sans">Área Evaluada</span>
                                    <span className="text-xs font-bold text-[#1F4E79] truncate block uppercase tracking-tight font-sans">{audit.area}</span>
                                  </div>
                                  <div className="min-w-0">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block font-sans">Fecha</span>
                                    <span className="text-xs text-gray-650 block font-bold font-sans">{audit.date}</span>
                                  </div>
                                  <div className="min-w-0">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block font-sans">Auditor</span>
                                    <span className="text-xs text-gray-650 truncate block font-bold font-sans">{audit.auditor}</span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3 shrink-0">
                                  {scoreVal !== null && (
                                    <span className={`text-xs font-black px-2.5 py-1 rounded-lg font-sans ${
                                      scoreVal >= 90
                                        ? "bg-green-100 text-green-700"
                                        : "bg-red-100 text-toyota-red"
                                    }`}>
                                      {scoreVal}%
                                    </span>
                                  )}
                                  {isExpanded ? (
                                    <ChevronUp className="w-4 h-4 text-gray-400" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4 text-gray-400" />
                                  )}
                                </div>
                              </div>

                              {/* Accordion Expanded Content */}
                              <AnimatePresence>
                                {isExpanded && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="border-t border-gray-100 bg-gray-50/50 p-5 space-y-4"
                                  >
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                      <div>
                                        <h5 className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 font-sans">Información Detallada</h5>
                                        <div className="space-y-1.5 text-xs font-sans">
                                          {audit.advisor && (
                                            <div className="flex justify-between py-1 border-b border-gray-100">
                                              <span className="text-gray-400 font-bold uppercase text-[9px] font-sans">Asesor Evaluado:</span>
                                              <span className="font-bold text-toyota-black truncate font-sans">{audit.advisor}</span>
                                            </div>
                                          )}
                                          {audit.technician && (
                                            <div className="flex justify-between py-1 border-b border-gray-100">
                                              <span className="text-gray-400 font-bold uppercase text-[9px] font-sans">Técnico:</span>
                                              <span className="font-bold text-toyota-black truncate font-sans">{audit.technician}</span>
                                            </div>
                                          )}
                                          {audit.bookingAdvisor && (
                                            <div className="flex justify-between py-1 border-b border-gray-100">
                                              <span className="text-gray-400 font-bold uppercase text-[9px] font-sans">Asesor de Reservas:</span>
                                              <span className="font-bold text-toyota-black truncate font-sans">{audit.bookingAdvisor}</span>
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      <div>
                                        <h5 className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 font-sans">Resultados en Items</h5>
                                        <p className="text-xs text-gray-500 font-bold font-sans">
                                          Total items respondidos: <span className="text-toyota-black font-black">{audit.items?.length || 0}</span>
                                        </p>
                                        {audit.generalObservations && (
                                          <div className="mt-3 bg-white border border-gray-200 rounded p-2.5">
                                            <span className="text-[8px] font-black text-toyota-red uppercase tracking-widest block mb-0.5 font-sans">Observación General:</span>
                                            <p className="text-xs text-gray-600 line-clamp-3 font-sans">{audit.generalObservations}</p>
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {/* Custom checklist items status overview */}
                                    <div className="pt-2">
                                      <h5 className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 font-mono">Resumen de respuestas</h5>
                                      <div className="flex flex-wrap gap-1.5 font-sans">
                                        {(audit.items as AuditItem[] || []).map((item, index) => (
                                          <div
                                            key={index}
                                            title={`Item ID: ${item.questionId}`}
                                            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-bold ${
                                              item.score === 1
                                                ? "bg-green-50 text-green-700 border border-green-200"
                                                : item.score === 0
                                                  ? "bg-red-50 text-toyota-red border border-red-200"
                                                  : "bg-gray-100 text-gray-500 border border-gray-200"
                                            }`}
                                          >
                                            <span className="font-bold text-[9px]">#{index + 1}</span>
                                            {item.score === 1 ? (
                                              <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                                            ) : item.score === 0 ? (
                                              <XCircle className="w-3.5 h-3.5 text-toyota-red" />
                                            ) : (
                                              <MinusCircle className="w-3.5 h-3.5 text-gray-400" />
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: DETAILED RESULTS BY AREA */}
                {activeTab === "by_area" && (
                  <div className="space-y-6">
                    {/* Group lists by Area */}
                    <div className="space-y-6">
                      {Object.values(Area).map((areaKey) => {
                        const details = areaDetails[areaKey];
                        if (details.auditsCount === 0) return null; // Only show areas with audits

                        const isApproved = details.score >= 90;

                        return (
                          <div
                            key={areaKey}
                            className={`bg-white border rounded-2xl overflow-hidden shadow-sm transition-all hover:border-gray-200 ${
                              isApproved ? "border-green-150" : "border-toyota-red/20"
                            }`}
                          >
                            {/* Card Header */}
                            <div className={`p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b font-sans ${
                              isApproved ? "bg-green-50/50 border-green-100" : "bg-red-50/30 border-red-100"
                            }`}>
                              <div className="flex items-center gap-3">
                                <span className="text-xs font-black text-toyota-black uppercase tracking-wider">
                                  📂 ÁREA: {areaKey.toUpperCase()}
                                </span>
                              </div>
                              <div className="flex items-center gap-2.5 self-start sm:self-auto font-sans">
                                <span className={`text-[9px] font-black px-2.5 py-1 rounded-full uppercase ${
                                  isApproved
                                    ? "bg-green-100 text-green-700 font-extrabold"
                                    : "bg-red-100 text-toyota-red font-extrabold"
                                }`}>
                                  {isApproved ? "Aprobado (>=90%)" : "Requiere Acción (<90%)"}
                                </span>
                                <div className={`text-xs font-black px-3 py-1 rounded-lg ${
                                  isApproved ? "bg-green-600 text-white" : "bg-toyota-red text-white"
                                }`}>
                                  {details.score}% de Éxito
                                </div>
                              </div>
                            </div>

                            {/* Card Body */}
                            <div className="p-5 space-y-5 font-sans">
                              {/* 1. Evaluated Advisors list */}
                              <div>
                                <h5 className="text-[9.5px] font-black text-gray-400 uppercase tracking-widest mb-2 font-mono">
                                  👥 Colaboradores Evaluados ({details.advisors.length})
                                </h5>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                  {details.advisors.map((adv, idx) => (
                                    <div
                                      key={idx}
                                      className="flex items-center justify-between bg-gray-50 border border-gray-150 p-2.5 rounded-xl text-xs font-sans"
                                    >
                                      <span className="font-extrabold text-gray-750 truncate max-w-[130px]">{adv.name}</span>
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <span className={`font-black px-1.5 py-0.5 rounded text-[10px] ${
                                          adv.score >= 90 ? "bg-green-100 text-green-700" : "bg-red-100 text-toyota-red"
                                        }`}>
                                          {adv.score}%
                                        </span>
                                        <span className="text-[9px] text-gray-400 font-mono">({adv.date.slice(5)})</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* 2. Detected Deviations list */}
                              <div>
                                <div className="flex items-center justify-between border-b pb-1.5 mb-2.5">
                                  <h5 className="text-[9.5px] font-black text-gray-400 uppercase tracking-widest font-mono">
                                    ⚠️ Desvíos Registrados ({details.deviations.length})
                                  </h5>
                                  {details.deviations.length > 0 && (
                                    <span className="text-[9px] font-black text-toyota-red bg-toyota-red/10 px-2 py-0.5 rounded-full uppercase tracking-wider font-sans">
                                      Desvíos Activos
                                    </span>
                                  )}
                                </div>

                                {details.deviations.length === 0 ? (
                                  <div className="text-center py-4 bg-green-50/20 text-green-700 rounded-xl text-xs font-black uppercase tracking-wider font-sans">
                                    🎉 ¡Ningún desvío registrado en este área para los filtros aplicados!
                                  </div>
                                ) : (
                                  <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                                    {details.deviations.map((d, dIdx) => (
                                      <div
                                        key={dIdx}
                                        className="bg-white border border-red-50 rounded-xl p-3.5 space-y-2 relative hover:bg-gray-50/10 transition-colors font-sans"
                                      >
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 font-sans">
                                          <div className="flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-toyota-red shrink-0" />
                                            <span className="text-xs font-black text-toyota-black">
                                              Asesor: {d.advisor}
                                            </span>
                                          </div>
                                          <span className="text-[9px] bg-red-50 text-toyota-red font-black px-2 py-0.5 rounded-md uppercase tracking-wider font-sans">
                                            ID Preg: {d.questionId}
                                          </span>
                                        </div>

                                        <p className="text-xs font-bold text-gray-700 pl-3.5 leading-relaxed font-sans">
                                          {d.text}
                                        </p>

                                        {d.criteria && (
                                          <div className="bg-gray-50 p-2.5 rounded-lg border-l-2 border-toyota-red pl-3 text-[10px] leading-relaxed text-gray-500 whitespace-pre-line italic font-sans">
                                            <strong>Criterio de Evaluación:</strong> {d.criteria}
                                          </div>
                                        )}

                                        {d.observation && (
                                          <div className="bg-amber-50/50 border border-amber-200/50 rounded-lg p-2.5 flex items-start gap-1.5 pl-3">
                                            <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                                            <p className="text-[10.5px] text-amber-900 leading-snug font-sans">
                                              <strong>Observación anotada:</strong> "{d.observation}"
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {Object.values(Area).every((a) => areaDetails[a as Area].auditsCount === 0) && (
                        <div className="py-12 bg-white rounded-2xl border border-gray-150 text-center text-gray-400 font-bold uppercase tracking-wider text-xs font-sans">
                          📭 No se encontraron registros de auditoría para los filtros configurados.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
