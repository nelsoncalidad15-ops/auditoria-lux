/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { Auditor, Branch, Area, AuditSession, AuditItem, ControlPartItem } from "./types";
import { AuditorSelector } from "./components/AuditorSelector";
import { AuditConfig } from "./components/AuditConfig";
import { Checklist } from "./components/Checklist";
import { Summary } from "./components/Summary";
import { Layout } from "./components/Layout";
import { motion, AnimatePresence } from "motion/react";
import { AuditDashboard } from "./components/AuditDashboard";

type AppStep = "auditor" | "config" | "checklist" | "summary";

function parseEnumValue<T extends string>(value: string | null, values: T[]): T | undefined {
  if (!value) return undefined;
  return values.find((item) => item === value);
}

function getDefaultSession(): Partial<AuditSession> {
  return {
    date: new Date().toISOString().split("T")[0],
    items: [],
    completed: false,
  };
}

function readUrlState() {
  const params = new URLSearchParams(window.location.search);

  return {
    isReportView: params.get("view") === "report",
    step: parseEnumValue<AppStep>(params.get("step"), ["auditor", "config", "checklist", "summary"]) || "auditor",
    session: {
      auditor: parseEnumValue<Auditor>(params.get("auditor"), Object.values(Auditor)),
      branch: parseEnumValue<Branch>(params.get("branch"), Object.values(Branch)),
      area: parseEnumValue<Area>(params.get("area"), Object.values(Area)),
      advisor: params.get("advisor") || undefined,
      bookingAdvisor: params.get("bookingAdvisor") || undefined,
      technician: params.get("technician") || undefined,
      date: params.get("date") || undefined,
    } as Partial<AuditSession>,
  };
}

function buildUrl(step: AppStep, session: Partial<AuditSession>, isReportView: boolean) {
  const params = new URLSearchParams();

  if (isReportView) {
    params.set("view", "report");
  } else {
    params.set("step", step);
    if (session.auditor) params.set("auditor", session.auditor);
    if (session.branch) params.set("branch", session.branch);
    if (session.area) params.set("area", session.area);
    if (session.advisor) params.set("advisor", session.advisor);
    if (session.bookingAdvisor) params.set("bookingAdvisor", session.bookingAdvisor);
    if (session.technician) params.set("technician", session.technician);
    if (session.date) params.set("date", session.date);
  }

  const query = params.toString();
  return `${window.location.pathname}${query ? `?${query}` : ""}`;
}

export default function App() {
  const initialUrlState = readUrlState();
  const [isReportView, setIsReportView] = useState(initialUrlState.isReportView);
  const [session, setSession] = useState<Partial<AuditSession>>({
    ...getDefaultSession(),
    ...initialUrlState.session,
  });
  const [step, setStep] = useState<AppStep>(initialUrlState.step);
  const [completedSessions, setCompletedSessions] = useState<AuditSession[]>([]);

  useEffect(() => {
    const handlePopState = () => {
      const next = readUrlState();
      setIsReportView(next.isReportView);
      setStep(next.step);
      setSession((prev) => ({
        ...prev,
        ...getDefaultSession(),
        ...next.session,
        items: prev.items,
        generalObservations: prev.generalObservations,
        controlParts: prev.controlParts,
        completed: prev.completed ?? false,
      }));
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const syncUrl = (nextStep: AppStep, nextSession: Partial<AuditSession>, nextReportView: boolean, replace = false) => {
    const nextUrl = buildUrl(nextStep, nextSession, nextReportView);
    if (replace) {
      window.history.replaceState({}, "", nextUrl);
    } else {
      window.history.pushState({}, "", nextUrl);
    }
  };

  const navigate = (nextStep: AppStep, nextSession?: Partial<AuditSession>, options?: { replace?: boolean; reportView?: boolean }) => {
    const mergedSession = { ...session, ...nextSession };
    const nextReportView = options?.reportView ?? false;
    syncUrl(nextStep, mergedSession, nextReportView, options?.replace);
    setSession(mergedSession);
    setStep(nextStep);
    setIsReportView(nextReportView);
  };

  const handleAuditorSelect = (auditor: Auditor) => {
    navigate("config", { auditor });
  };

  const handleConfigChange = (config: Partial<AuditSession>) => {
    setSession((prev) => {
      const nextSession = { ...prev, ...config };
      syncUrl("config", nextSession, false, true);
      return nextSession;
    });
  };

  const handleConfigComplete = (config: Partial<AuditSession>) => {
    navigate("checklist", config);
  };

  const handleChecklistComplete = (items: AuditItem[], generalObservations: string, controlParts?: ControlPartItem[]) => {
    const finalSession = { ...session, items, generalObservations, controlParts, completed: true } as AuditSession;
    setSession(finalSession);
    setCompletedSessions((prev) => {
      const filtered = prev.filter(
        (current) => !(current.advisor === finalSession.advisor && current.area === finalSession.area && current.branch === finalSession.branch)
      );
      return [...filtered, finalSession];
    });
    syncUrl("summary", finalSession, false);
    setStep("summary");
  };

  const handleReset = (keepConfig: boolean) => {
    if (keepConfig) {
      const nextSession = {
        ...session,
        items: [],
        generalObservations: "",
        completed: false,
      };
      setSession(nextSession);
      syncUrl("checklist", nextSession, false);
      setStep("checklist");
      return;
    }

    const nextSession = getDefaultSession();
    setSession(nextSession);
    setCompletedSessions([]);
    syncUrl("auditor", nextSession, false);
    setStep("auditor");
  };

  const goToStep = (targetStep: AppStep) => {
    if (targetStep === step) return;
    if (targetStep === "auditor") {
      navigate("auditor");
      return;
    }
    if (targetStep === "config" && session.auditor) {
      navigate("config");
      return;
    }
    if (targetStep === "checklist" && session.auditor && session.branch && session.area && session.advisor) {
      navigate("checklist");
    }
  };

  if (isReportView) {
    return (
      <Layout currentAuditor={undefined}>
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-150 shadow-sm">
            <div>
              <h1 className="text-xl font-black text-toyota-black uppercase tracking-tight font-sans">
                ðŸ“‹ Reporte Consolidado de Calidad
              </h1>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-0.5 font-sans">
                DirecciÃ³n & Jefaturas de Posventa - Autolux S.A.
              </p>
            </div>
            <button
              onClick={() => navigate("auditor", getDefaultSession(), { reportView: false })}
              className="bg-toyota-black text-white hover:bg-black font-black uppercase tracking-wider text-[9px] px-4 py-2.5 rounded-lg transition-colors shadow-md self-start sm:self-auto cursor-pointer"
            >
              Comenzar Nueva AuditorÃ­a âš¡
            </button>
          </div>

          <AuditDashboard initialOpen={true} initialTab="by_area" />
        </div>
      </Layout>
    );
  }

  const breadcrumbItems: Array<{ step: AppStep; label: string; enabled: boolean }> = [
    { step: "auditor", label: "Inicio", enabled: true },
    { step: "config", label: "ConfiguraciÃ³n", enabled: Boolean(session.auditor) },
    { step: "checklist", label: "Checklist", enabled: Boolean(session.auditor && session.branch && session.area && session.advisor) },
    { step: "summary", label: "Resumen", enabled: step === "summary" },
  ];

  const contextBadges = [session.branch, session.area, session.advisor].filter(Boolean) as string[];

  return (
    <Layout currentAuditor={session.auditor}>
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="mb-6 bg-white p-5 rounded-2xl border border-gray-150 shadow-sm flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-black uppercase tracking-wider">
            {breadcrumbItems.map((item, index) => (
              <React.Fragment key={item.step}>
                <button
                  type="button"
                  onClick={() => goToStep(item.step)}
                  disabled={!item.enabled}
                  className={`transition-colors ${step === item.step ? "text-toyota-red" : item.enabled ? "text-gray-700 hover:text-toyota-black" : "text-gray-300 cursor-not-allowed"}`}
                >
                  {item.label}
                </button>
                {index < breadcrumbItems.length - 1 && <span className="text-gray-300">/</span>}
              </React.Fragment>
            ))}
          </div>

          {contextBadges.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {contextBadges.map((badge) => (
                <span key={badge} className="px-2.5 py-1 rounded-full bg-red-50 text-toyota-red text-[10px] font-black uppercase tracking-wider border border-red-100">
                  {badge}
                </span>
              ))}
            </div>
          )}
        </div>

        <AnimatePresence mode="wait">
          {step === "auditor" && (
            <motion.div
              key="auditor"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <AuditorSelector onSelect={handleAuditorSelect} />
            </motion.div>
          )}

          {step === "config" && (
            <motion.div
              key="config"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <AuditConfig
                initialConfig={session}
                onChange={handleConfigChange}
                onComplete={handleConfigComplete}
                onBack={() => goToStep("auditor")}
              />
            </motion.div>
          )}

          {step === "checklist" && (
            <motion.div
              key="checklist"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Checklist
                session={session as AuditSession}
                onComplete={handleChecklistComplete}
                onBack={() => goToStep("config")}
              />
            </motion.div>
          )}

          {step === "summary" && (
            <motion.div
              key="summary"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <Summary
                session={session as AuditSession}
                onReset={handleReset}
                completedSessions={completedSessions}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}
