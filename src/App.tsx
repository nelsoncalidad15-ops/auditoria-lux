/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Auditor, AuditorInfo, Branch, Area, AuditSession, AuditItem, SectorResponsibles, ControlPartItem } from "./types";
import { AuditorSelector } from "./components/AuditorSelector";
import { AuditConfig } from "./components/AuditConfig";
import { Checklist } from "./components/Checklist";
import { Summary } from "./components/Summary";
import { Layout } from "./components/Layout";
import { motion, AnimatePresence } from "motion/react";
import { auth, testConnection } from "./lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { AuditDashboard } from "./components/AuditDashboard";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isReportView, setIsReportView] = useState(false);
  const [session, setSession] = useState<Partial<AuditSession>>({
    date: new Date().toISOString().split("T")[0],
    items: [],
    completed: false,
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("view") === "report") {
      setIsReportView(true);
    }
  }, []);

  useEffect(() => {
    testConnection();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const [step, setStep] = useState<"auditor" | "config" | "checklist" | "summary">("auditor");
  const [completedSessions, setCompletedSessions] = useState<AuditSession[]>([]);

  const handleAuditorSelect = (auditor: Auditor) => {
    setSession((prev) => ({ ...prev, auditor }));
    setStep("config");
  };

  const handleConfigComplete = (config: Partial<AuditSession>) => {
    setSession((prev) => ({ ...prev, ...config }));
    setStep("checklist");
  };

  const handleChecklistComplete = (items: AuditItem[], generalObservations: string, controlParts?: ControlPartItem[]) => {
    const finalSession = { ...session, items, generalObservations, controlParts, completed: true } as AuditSession;
    setSession(finalSession);
    setCompletedSessions((prev) => {
      // Avoid duplicate advisors for the same branch/area in the current jornada
      const filtered = prev.filter(
        (s) => !(s.advisor === finalSession.advisor && s.area === finalSession.area && s.branch === finalSession.branch)
      );
      return [...filtered, finalSession];
    });
    setStep("summary");
  };

  const handleReset = (keepConfig: boolean) => {
    if (keepConfig) {
      setSession((prev) => ({
        ...prev,
        items: [],
        generalObservations: "",
        completed: false,
      }));
      setStep("checklist");
    } else {
      setSession({
        date: new Date().toISOString().split("T")[0],
        items: [],
        completed: false,
      });
      setCompletedSessions([]);
      setStep("auditor");
    }
  };

  if (isReportView) {
    return (
      <Layout currentAuditor={undefined}>
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-150 shadow-sm">
            <div>
              <h1 className="text-xl font-black text-toyota-black uppercase tracking-tight font-sans">
                📋 Reporte Consolidado de Calidad
              </h1>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-0.5 font-sans">
                Dirección & Jefaturas de Posventa - Autolux S.A.
              </p>
            </div>
            <button
              onClick={() => {
                window.history.replaceState({}, '', window.location.pathname);
                setIsReportView(false);
              }}
              className="bg-toyota-black text-white hover:bg-black font-black uppercase tracking-wider text-[9px] px-4 py-2.5 rounded-lg transition-colors shadow-md self-start sm:self-auto cursor-pointer"
            >
              Comenzar Nueva Auditoría ⚡
            </button>
          </div>
          
          <AuditDashboard initialOpen={true} initialTab="by_area" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout currentAuditor={session.auditor}>
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
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
                onComplete={handleConfigComplete}
                onBack={() => setStep("auditor")}
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
                onBack={() => setStep("config")}
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
