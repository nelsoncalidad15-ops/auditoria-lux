/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Branch, Area, AuditSession, SectorResponsibles } from "../types";
import { ChevronRight, Calendar, MapPin, Briefcase, UserCircle } from "lucide-react";
import { sheetsService } from "../services/sheetsService";

interface AuditConfigProps {
  initialConfig: Partial<AuditSession>;
  onComplete: (config: Partial<AuditSession>) => void;
  onBack: () => void;
}

export function AuditConfig({ initialConfig, onComplete, onBack }: AuditConfigProps) {
  const [config, setConfig] = useState<Partial<AuditSession>>({
    branch: Branch.SALTA,
    area: Area.CITAS_CALL,
    date: new Date().toISOString().split("T")[0],
    advisor: "",
    ...initialConfig,
  });

  const [advisors, setAdvisors] = useState<string[]>([]);
  const [bookingAdvisors, setBookingAdvisors] = useState<string[]>([]);
  const [technicians, setTechnicians] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (config.branch && config.area) {
      setLoading(true);
      if (config.area === Area.ORDENES) {
        const p1 = sheetsService.getAdvisors(config.branch as Branch, Area.SERVICIOS);
        const p2 = Promise.all([
          sheetsService.getAdvisors(config.branch as Branch, Area.CITAS_CALL),
          sheetsService.getAdvisors(config.branch as Branch, Area.CITAS_PRESENCIAL)
        ]).then(([list1, list2]) => {
          return Array.from(new Set([...list1, ...list2])).sort();
        });
        const p3 = sheetsService.getAdvisors(config.branch as Branch, Area.TALLER);

        Promise.all([p1, p2, p3]).then(([serviceList, bookingList, techList]) => {
          setAdvisors(serviceList);
          setBookingAdvisors(bookingList);
          setTechnicians(techList);
          setLoading(false);
        }).catch((err) => {
          console.error("Error loading multiple advisors for ORDENES:", err);
          setLoading(false);
        });
      } else {
        sheetsService.getAdvisors(config.branch as Branch, config.area as Area).then((list) => {
          setAdvisors(list);
          setBookingAdvisors([]);
          setTechnicians([]);
          setLoading(false);
          if (list.length === 1) {
            setConfig((prev) => ({ ...prev, advisor: list[0] }));
          }
        });
      }
    }
  }, [config.branch, config.area]);

  const isValid = 
    config.branch && 
    config.area && 
    config.date && 
    config.advisor && 
    (config.area !== Area.ORDENES || (config.bookingAdvisor && config.technician));

  return (
    <div className="py-12 max-w-2xl mx-auto">
      <div className="bento-card !p-0 overflow-hidden">
        <div className="bg-toyota-black p-8 text-white relative">
          <button 
            onClick={onBack}
            className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 hover:text-white transition-colors mb-6 flex items-center gap-2 group"
          >
            <span className="group-hover:-translate-x-1 transition-transform">←</span> Volver al Perfil
          </button>
          <h2 className="text-3xl font-black tracking-tighter uppercase mb-1">Configuración</h2>
          <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Parámetros de Auditoría Interna</p>
          
          <div className="absolute top-8 right-8 bg-toyota-red px-3 py-1 rounded shadow-lg shadow-toyota-red/20">
            <span className="text-[10px] font-black uppercase tracking-widest">Paso 02</span>
          </div>
        </div>

        <div className="p-8 space-y-10">
          <div className="grid grid-cols-1 gap-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Branch Selection */}
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                  <MapPin className="w-3 h-3 text-toyota-red" /> Sucursal
                </label>
                <select
                  value={config.branch}
                  onChange={(e) => setConfig({ ...config, branch: e.target.value as Branch, advisor: "" })}
                  className="w-full font-bold text-toyota-black cursor-pointer"
                >
                  {Object.values(Branch).map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              {/* Area Selection */}
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                  <Briefcase className="w-3 h-3 text-toyota-red" /> Área a Auditar
                </label>
                <select
                  value={config.area}
                  onChange={(e) => setConfig({ ...config, area: e.target.value as Area, advisor: "" })}
                  className="w-full font-bold text-toyota-black cursor-pointer"
                >
                  {Object.values(Area).map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
                {config.area && SectorResponsibles[config.area as Area] && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {SectorResponsibles[config.area as Area].map((role, idx) => (
                      <span key={idx} className="text-[8px] font-black bg-toyota-red/10 text-toyota-red px-1.5 py-0.5 rounded flex items-center gap-1 uppercase tracking-tighter">
                        Responsable: {role}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Date Selection */}
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                  <Calendar className="w-3 h-3 text-toyota-red" /> Fecha de Auditoría
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={config.date}
                    onChange={(e) => setConfig({ ...config, date: e.target.value })}
                    className="w-full font-bold text-toyota-black cursor-pointer bg-red-50/50 border-red-100"
                  />
                </div>
              </div>

              {/* Advisor / Primary Role Selection */}
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                  <UserCircle className="w-3 h-3 text-toyota-red" /> {config.area === Area.TALLER ? "Técnico" : config.area === Area.ORDENES ? "Asesor de Servicio" : "Asesor / Responsable"}
                </label>
                <div className="relative">
                  <select
                    value={config.advisor}
                    onChange={(e) => setConfig({ ...config, advisor: e.target.value })}
                    disabled={loading}
                    className="w-full font-bold text-toyota-black cursor-pointer disabled:opacity-50"
                  >
                    <option value="">Seleccione un nombre...</option>
                    {advisors.map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                  {loading && (
                    <div className="absolute right-10 top-1/2 -translate-y-1/2">
                      <div className="w-4 h-4 border-2 border-toyota-red border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>
                {loading && <p className="text-[8px] text-toyota-red font-black uppercase tracking-tighter animate-pulse">Consultando bases de datos de Toyota...</p>}
              </div>
            </div>

            {/* Extra Dropdowns for ORDENES area (Booking Advisor and Technician) */}
            {config.area === Area.ORDENES && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-gray-100">
                {/* Booking Advisor (Asesor de Cita) Selector */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#1F497D] flex items-center gap-2">
                    <UserCircle className="w-3 h-3 text-[#1F497D]" /> Asesor de Citas (Citas / Call)
                  </label>
                  <div className="relative">
                    <select
                      value={config.bookingAdvisor || ""}
                      onChange={(e) => setConfig({ ...config, bookingAdvisor: e.target.value })}
                      disabled={loading}
                      className="w-full font-bold text-toyota-black cursor-pointer disabled:opacity-50 border-[#8FAADC]/60 focus:border-[#1F4E79] focus:ring-1 focus:ring-[#1F4E79]"
                    >
                      <option value="">Seleccione Asesor de Citas...</option>
                      {bookingAdvisors.map((name) => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Technician (Técnico) Selector */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 flex items-center gap-2">
                    <UserCircle className="w-3 h-3 text-gray-500" /> Técnico de Taller
                  </label>
                  <div className="relative">
                    <select
                      value={config.technician || ""}
                      onChange={(e) => setConfig({ ...config, technician: e.target.value })}
                      disabled={loading}
                      className="w-full font-bold text-toyota-black cursor-pointer disabled:opacity-50"
                    >
                      <option value="">Seleccione Técnico...</option>
                      {technicians.map((name) => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="pt-8 border-t border-gray-100 flex flex-col gap-4">
            <button
              onClick={() => onComplete(config)}
              disabled={!isValid || loading}
              className="w-full bg-toyota-red py-4 rounded-xl text-white font-black uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-3 hover:bg-toyota-black disabled:bg-gray-200 transition-all shadow-xl shadow-toyota-red/20 active:scale-[0.98]"
            >
              Comenzar Checklist
              <ChevronRight className="w-4 h-4" />
            </button>
            <p className="text-[9px] text-center text-gray-400 font-bold uppercase tracking-widest italic">
              * Todos los campos son obligatorios para garantizar la estandarización
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
