/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Auditor, AuditorInfo } from "../types";
import { UserCheck, ShieldCheck } from "lucide-react";
import { motion } from "motion/react";
import { AuditDashboard } from "./AuditDashboard";

interface AuditorSelectorProps {
  onSelect: (auditor: Auditor) => void;
}

export function AuditorSelector({ onSelect }: AuditorSelectorProps) {
  return (
    <div className="py-10 flex flex-col items-center">
      <div className="text-center mb-16">
        <h2 className="text-4xl font-black text-toyota-black mb-4 tracking-tighter uppercase">Identificación de Auditor</h2>
        <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Sistema de Gestión de Calidad Autolux</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-3xl">
        <AuditorCard
          auditor={Auditor.LILIANA}
          info={AuditorInfo[Auditor.LILIANA]}
          onSelect={onSelect}
          icon={<ShieldCheck className="w-10 h-10" />}
        />
        <AuditorCard
          auditor={Auditor.ERIC}
          info={AuditorInfo[Auditor.ERIC]}
          onSelect={onSelect}
          icon={<UserCheck className="w-10 h-10" />}
        />
      </div>

      {/* Foldable Audit Results Dashboard */}
      <div className="w-full max-w-3xl mt-12">
        <AuditDashboard />
      </div>
    </div>
  );
}

function AuditorCard({ 
  auditor, 
  info, 
  onSelect, 
  icon 
}: { 
  auditor: Auditor; 
  info: typeof AuditorInfo[Auditor]; 
  onSelect: (a: Auditor) => void;
  icon: React.ReactNode;
}) {
  return (
    <motion.button
      whileHover={{ y: -5, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect(auditor)}
      className="bento-card hover:border-toyota-red transition-all text-left flex items-center gap-8 group p-10 cursor-pointer"
    >
      <div className="p-5 bg-gray-50 rounded-2xl group-hover:bg-toyota-red transition-all duration-300 shadow-inner">
        <div className="text-toyota-red group-hover:text-white transition-colors">
          {icon}
        </div>
      </div>
      <div>
        <h3 className="text-2xl font-black text-toyota-black mb-1 tracking-tight">{info.name}</h3>
        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">{info.role}</p>
        <div className="mt-6 flex items-center text-[10px] font-black text-toyota-red uppercase tracking-widest gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
          Comenzar
          <div className="w-6 h-[2px] bg-toyota-red rounded-full"></div>
        </div>
      </div>
    </motion.button>
  );
}
