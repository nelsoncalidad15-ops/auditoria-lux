/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import { AuditSession, AuditItem, Question, ScoreValue, Area, ControlPartItem } from "../types";
import { sheetsService } from "../services/sheetsService";
import { ArrowLeft, Camera, AlertCircle, CheckCircle, MinusCircle, Info, Save } from "lucide-react";
import { motion } from "motion/react";

interface ChecklistProps {
  session: AuditSession;
  onComplete: (items: AuditItem[], notes: string, controlParts?: ControlPartItem[]) => void;
  onBack: () => void;
}

export function Checklist({ session, onComplete, onBack }: ChecklistProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [items, setItems] = useState<Record<string, AuditItem>>({});
  const [generalNotes, setGeneralNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [controlParts, setControlParts] = useState<ControlPartItem[]>([]);

  useEffect(() => {
    sheetsService.getQuestions(session.area, session.branch).then((qs) => {
      setQuestions(qs);
      
      const initialItems: Record<string, AuditItem> = {};
      qs.forEach((q) => {
        if (q.preFilledScore !== undefined) {
          initialItems[q.id] = {
            questionId: q.id,
            score: q.preFilledScore,
            observation: q.preFilledScore === 1 
              ? "Cumplimiento validado automáticamente de la planilla de Control." 
              : "Desvío detectado automáticamente de la planilla de Control de Repuesto por diferencia."
          };
        }
      });

      if (session.area === Area.ORDENES && qs.length > 0) {
        initialItems[qs[0].id] = {
          questionId: qs[0].id,
          score: "N/A",
          observation: ""
        };
      }
      
      setItems(initialItems);

      if (session.area === Area.REPUESTOS) {
        sheetsService.getRepuestosControlData(session.branch).then((parts) => {
          setControlParts(parts);
          if (parts.length > 0) {
            const locMatches = parts.filter(p => p.locMatch === 1).length;
            const locPct = locMatches / parts.length;
            
            let locScore: ScoreValue = 1;
            if (locMatches === 10) {
              locScore = 1;
            } else if (locMatches >= 6) {
              locScore = 0.5;
            } else {
              locScore = 0;
            }

            const qtyMatches = parts.filter(p => p.qtyMatch === 1).length;
            const qtyPct = qtyMatches / parts.length;
            
            let qtyScore: ScoreValue = 1;
            if (qtyMatches === 10) {
              qtyScore = 1;
            } else if (qtyMatches >= 6) {
              qtyScore = 0.5;
            } else {
              qtyScore = 0;
            }

            setItems((prev) => {
              const next = { ...prev };
              const q1 = qs[0];
              const q2 = qs[1];
              if (q1) {
                next[q1.id] = {
                  questionId: q1.id,
                  score: locScore,
                  observation: locScore === 1
                    ? `Ubicación conforme al 100% (10/10 coinciden).`
                    : locScore === 0.5
                    ? `Ubicación con desvío parcial: ${(locPct * 100).toFixed(1)}% (${parts.length - locMatches}/10 desalineados).`
                    : `Ubicación no conforme: ${(locPct * 100).toFixed(1)}% (${parts.length - locMatches}/10 desalineados).`
                };
              }
              if (q2) {
                next[q2.id] = {
                  questionId: q2.id,
                  score: qtyScore,
                  observation: qtyScore === 1
                    ? `Cantidades en sistema con 100% de coincidencia (10/10 coinciden).`
                    : qtyScore === 0.5
                    ? `Diferencia de stock parcial: ${(qtyPct * 100).toFixed(1)}% de coincidencia (${parts.length - qtyMatches} piezas con desvío).`
                    : `Diferencia de stock crítica: ${(qtyPct * 100).toFixed(1)}% de coincidencia (${parts.length - qtyMatches} piezas con desvío).`
                };
              }
              return next;
            });
          }
        });
      }
      
      setLoading(false);
    });
  }, [session.area, session.branch]);

  const handleScore = (qId: string, score: ScoreValue) => {
    setItems((prev) => ({
      ...prev,
      [qId]: { ...prev[qId], questionId: qId, score },
    }));
  };

  const handleObservation = (qId: string, observation: string) => {
    setItems((prev) => ({
      ...prev,
      [qId]: { ...prev[qId], questionId: qId, observation },
    }));
  };

  const handleUpdatePart = (num: number, field: keyof ControlPartItem, value: any) => {
    setControlParts((prev) => {
      const updated = prev.map((part) => {
        if (part.num === num) {
          const newPart = { ...part, [field]: value };
          // Auto-recalculate match values
          if (field === "physicalQty" || field === "systemQty") {
            const phys = field === "physicalQty" ? Number(value) : Number(part.physicalQty);
            const sys = field === "systemQty" ? Number(value) : Number(part.systemQty);
            newPart.qtyMatch = phys === sys ? 1 : 0;
          }
          if (field === "physicalLoc" || field === "systemLoc") {
            const phys = field === "physicalLoc" ? String(value).trim() : String(part.physicalLoc).trim();
            const sys = field === "systemLoc" ? String(value).trim() : String(part.systemLoc).trim();
            newPart.locMatch = (phys.length > 0 && sys.length > 0 && phys.toUpperCase() === sys.toUpperCase()) ? 1 : 0;
          }
          return newPart;
        }
        return part;
      });

      // Recalculate scores using scaled criteria (10/10 -> 1, 6-9 -> 0.5, <=5 -> 0)
      const totalLocMatch = updated.filter(p => p.locMatch === 1).length;
      const totalLockPct = updated.length > 0 ? (totalLocMatch / updated.length) : 1.0;
      let newLocScore: ScoreValue = 1;
      if (totalLocMatch === 10) {
        newLocScore = 1;
      } else if (totalLocMatch >= 6) {
        newLocScore = 0.5;
      } else {
        newLocScore = 0;
      }

      const totalQtyMatch = updated.filter(p => p.qtyMatch === 1).length;
      const totalQtyPct = updated.length > 0 ? (totalQtyMatch / updated.length) : 1.0;
      let newQtyScore: ScoreValue = 1;
      if (totalQtyMatch === 10) {
        newQtyScore = 1;
      } else if (totalQtyMatch >= 6) {
        newQtyScore = 0.5;
      } else {
        newQtyScore = 0;
      }

      setItems((prevItems) => {
        const nextItems = { ...prevItems };
        const q1 = questions[0];
        const q2 = questions[1];
        
        if (q1) {
          nextItems[q1.id] = {
            ...nextItems[q1.id],
            questionId: q1.id,
            score: newLocScore,
            observation: newLocScore === 1 
              ? `Ubicación conforme al 100% (10/10 coinciden).`
              : newLocScore === 0.5
              ? `Ubicación con desvío parcial: ${(totalLockPct * 100).toFixed(1)}% (${updated.length - totalLocMatch}/10 desalineados).`
              : `Ubicación no conforme: ${(totalLockPct * 100).toFixed(1)}% (${updated.length - totalLocMatch}/10 desalineados).`
          };
        }
        if (q2) {
          nextItems[q2.id] = {
            ...nextItems[q2.id],
            questionId: q2.id,
            score: newQtyScore,
            observation: newQtyScore === 1
              ? `Cantidades en sistema con 100% de coincidencia (10/10 coinciden).`
              : newQtyScore === 0.5
              ? `Diferencia de stock parcial: ${(totalQtyPct * 100).toFixed(1)}% de coincidencia (${updated.length - totalQtyMatch} piezas con desvío).`
              : `Diferencia de stock crítica: ${(totalQtyPct * 100).toFixed(1)}% de coincidencia (${updated.length - totalQtyMatch} piezas con desvío).`
          };
        }
        return nextItems;
      });

      return updated;
    });
  };

  // Real-time calculation
  const stats = useMemo(() => {
    const total = questions.length;
    const answered = Object.keys(items).length;
    const itemsList = Object.values(items) as AuditItem[];
    
    const cumple = itemsList.filter(i => i.score === 1).length;
    const noCumple = itemsList.filter(i => i.score === 0).length;
    const na = itemsList.filter(i => i.score === "N/A").length;
    
    const divisor = cumple + noCumple;
    const percentage = divisor > 0 ? Math.round((cumple / divisor) * 100) : 0;

    return { total, answered, cumple, noCumple, na, percentage };
  }, [questions, items]);

  const roleScores = useMemo(() => {
    let roles: Array<{ key: string; label: string; keywords: string[] }> = [];

    if (session.area === Area.ORDENES) {
      roles = [
        { key: "citas", label: "Asesor de Citas", keywords: ["CITA"] },
        { key: "servicios", label: "Asesor de Servicios", keywords: ["SERVICIO"] },
        { key: "lider", label: "Líder/Jefe de Taller", keywords: ["JEFE", "LIDER", "LÍDER", "REPUESTOS"] },
        { key: "tecnico", label: "Técnico", keywords: ["TECNICO", "TÉCNICO"] }
      ];
    } else if (session.area === Area.GESTION_PVT) {
      roles = [
        { key: "servicios", label: "Jefe de Servicios", keywords: ["SERVICIO"] },
        { key: "taller", label: "Jefe de Taller", keywords: ["TALLER"] },
        { key: "lavadero", label: "Líder de Lavadero", keywords: ["LAVADERO"] },
        { key: "garantia", label: "Líder de Garantías", keywords: ["GARANTIA", "GARANTÍA"] },
        { key: "subgerente", label: "Sub Gerente", keywords: ["SUB GERENTE", "SUBGERNETE", "SUBGERENTE"] }
      ];
    } else {
      return [];
    }

    const itemsList = Object.values(items) as AuditItem[];

    return roles.map(r => {
      let cumpleCount = 0;
      let noCumpleCount = 0;
      let naCount = 0;

      itemsList.forEach(item => {
        const q = questions.find(qObj => qObj.id === item.questionId);
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
  }, [questions, items, session.area]);

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center">
        <div className="w-16 h-16 border-4 border-toyota-red border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-400 font-black uppercase tracking-[0.2em] text-[10px]">Estandarizando Criterios Toyota...</p>
      </div>
    );
  }

  const isComplete = stats.answered === questions.length && (
    session.area !== Area.ORDENES || (questions[0] && items[questions[0].id]?.observation?.trim() !== "")
  );

  return (
    <div className="grid grid-cols-12 gap-6 py-8">
      
      {/* LEFT PANEL: Configuration Summary */}
      <aside className="col-span-12 lg:col-span-3 flex flex-col gap-4">
        <div className="bento-card sticky top-24">
          <div className="flex items-center justify-between mb-6 border-b pb-2">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Configuración</h3>
            <button 
              onClick={onBack}
              className="p-1 rounded-full hover:bg-gray-100 text-gray-400 transition-colors"
              title="Volver"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
          
          <div className="space-y-6">
            <InfoItem label="Sucursal" value={session.branch} />
            <InfoItem label="Área" value={session.area} />
            {session.area === Area.ORDENES ? (
              <>
                <InfoItem label="Asesor de Servicios" value={session.advisor} />
                {session.bookingAdvisor && <InfoItem label="Asesor de Citas" value={session.bookingAdvisor} />}
                {session.technician && <InfoItem label="Técnico" value={session.technician} />}
              </>
            ) : (
              <InfoItem label="Responsable" value={session.advisor} />
            )}
            
            <div className="pt-4 border-t border-gray-100">
              <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Fecha de Auditoría</p>
              <div className="bg-red-50 px-3 py-2 rounded-lg border border-red-100">
                <p className="text-sm font-black text-toyota-red">{session.date}</p>
              </div>
            </div>

            <button
              onClick={onBack}
              className="w-full mt-4 py-3 bg-gray-50 text-gray-400 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-gray-100 transition-colors border border-gray-200"
            >
              Modificar Configuración
            </button>
          </div>
        </div>
      </aside>

      {/* MIDDLE PANEL: Main Checklist */}
      <section className="col-span-12 lg:col-span-6 flex flex-col gap-6">
        <div className="flex items-center gap-2 mb-2">
          <button 
            onClick={onBack}
            className="p-2 -ml-2 rounded-full hover:bg-gray-100 text-toyota-black transition-all active:scale-90"
            title="Volver"
          >
            <ArrowLeft className="w-5 h-5 transition-transform hover:-translate-x-1" />
          </button>
          <h2 className="text-xl font-black text-toyota-black tracking-tight uppercase">Checklist de Auditoría</h2>
          <div className="flex-grow"></div>
          <span className="px-3 py-1 bg-toyota-red text-white text-[10px] font-black rounded uppercase tracking-widest shadow-sm shadow-toyota-red/20">
            {stats.answered} DE {stats.total} PUNTOS
          </span>
        </div>

        {session.area === Area.ORDENES && (
          <div className="bento-card !border-toyota-red bg-red-50/50">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-toyota-red/10 flex items-center justify-center flex-shrink-0">
                <Camera className="w-5 h-5 text-toyota-red" />
              </div>
              <div>
                <h4 className="text-sm font-black text-toyota-red uppercase mb-1">Requisito de Orden de Reparación</h4>
                <p className="text-[11px] text-toyota-black font-medium leading-relaxed">
                  Para auditar órdenes, es obligatorio subir una foto o PDF de la orden. Puede adjuntarla aquí o en el primer ítem del checklist.
                </p>
                <label className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-toyota-red text-white text-[10px] font-black uppercase tracking-widest rounded-lg cursor-pointer hover:bg-black transition-colors">
                   <Save className="w-3 h-3" /> Adjuntar Orden Principal
                   <input type="file" accept="image/*,application/pdf" className="hidden" />
                </label>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {questions.map((q, idx) => (
            <QuestionItem
              key={q.id}
              index={idx + 1}
              question={q}
              area={session.area}
              currentValue={items[q.id]?.score}
              observation={items[q.id]?.observation || ""}
              onScore={(s) => handleScore(q.id, s)}
              onObserve={(o) => handleObservation(q.id, o)}
              controlParts={controlParts}
              onUpdatePart={handleUpdatePart}
            />
          ))}
        </div>

        <div className="bento-card mt-4">
          <h3 className="text-xs font-black text-toyota-black mb-4 flex items-center gap-2 uppercase tracking-widest">
            <Info className="w-4 h-4 text-toyota-red" /> Observaciones Finales
          </h3>
          <textarea
            value={generalNotes}
            onChange={(e) => setGeneralNotes(e.target.value)}
            placeholder="Hallazgos generales, sugerencias de mejora o comentarios del auditado..."
            className="w-full h-32 text-xs font-medium"
          />
        </div>
      </section>

      {/* RIGHT PANEL: Stats & Actions */}
      <aside className="col-span-12 lg:col-span-3 flex flex-col gap-6">
        <div className="bento-card sticky top-24">
          <h3 className="text-[10px] font-black text-gray-400 uppercase mb-6 tracking-widest text-center">Desempeño En Tiempo Real</h3>
          
          <div className="relative flex items-center justify-center mb-8">
            <svg className="w-32 h-32 transform -rotate-90">
              <circle cx="64" cy="64" r="56" stroke="#f3f4f6" strokeWidth="12" fill="transparent"/>
              <circle cx="64" cy="64" r="56" stroke="#EB0A1E" strokeWidth="12" fill="transparent" 
                strokeDasharray="351.8" 
                strokeDashoffset={351.8 - (351.8 * stats.percentage) / 100}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-3xl font-black text-toyota-black leading-none">{stats.percentage}%</span>
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">Cumplimiento</span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3 mb-8">
            <StatSmall label="Cumples" value={stats.cumple} color="text-green-600 bg-green-50" />
            <StatSmall label="Desvíos" value={stats.noCumple} color="text-toyota-red bg-red-50" />
            <StatSmall label="N/A" value={stats.na} color="text-gray-500 bg-gray-50" />
            <StatSmall label="Pendientes" value={stats.total - stats.answered} color="text-gray-400 bg-white" border />
          </div>

          {(session.area === Area.ORDENES || session.area === Area.GESTION_PVT) && (
            <div className="mb-6 border-t border-gray-100 pt-5 space-y-3">
              <h4 className="text-[10px] font-black uppercase tracking-[0.15em] text-[#1F497D] text-center border-b pb-1.5 border-dashed border-gray-200">
                📊 Cumplimiento por Área/Rol
              </h4>
              <div className="space-y-2">
                {roleScores.map((r, i) => (
                  <div key={i} className="flex items-center justify-between bg-gray-50/50 rounded-lg px-2.5 py-1.5 border border-gray-100">
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] font-bold text-[#1F4E79] truncate">{r.name}</span>
                      <span className="text-[8px] text-gray-400 font-bold uppercase tracking-wider">
                        C: {r.cumple} / NC: {r.noCumple} {r.na > 0 && `/ N/A: ${r.na}`}
                      </span>
                    </div>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded flex-shrink-0 ${
                      r.score === "N/A" 
                        ? "bg-gray-100 text-gray-400" 
                        : r.score >= 90 
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-toyota-red"
                    }`}>
                      {r.score === "N/A" ? "N/A" : `${r.score}%`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-4">
            <button
              onClick={() => onComplete(Object.values(items) as AuditItem[], generalNotes, controlParts)}
              disabled={!isComplete}
              className={`w-full py-4 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] transition-all shadow-xl flex items-center justify-center gap-3 ${
                isComplete ? "bg-toyota-black text-white hover:bg-black shadow-gray-200 active:scale-95" : "bg-gray-100 text-gray-300 shadow-none cursor-not-allowed border border-gray-200"
              }`}
            >
              <Save className="w-4 h-4" /> Finalizar Auditoría
            </button>
            {!isComplete && (
               <p className="text-[9px] text-center text-toyota-red font-black uppercase tracking-widest animate-pulse">
                Faltan {stats.total - stats.answered} puntos
               </p>
            )}
          </div>

          <div className="mt-8 pt-6 border-t border-gray-100">
            <p className="text-[9px] text-gray-400 leading-tight italic text-center uppercase font-bold tracking-tighter">
              "La calidad es responsabilidad de todos en Autolux"
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-sm font-bold text-toyota-black truncate" title={value}>{value}</p>
    </div>
  );
}

function StatSmall({ label, value, color, border }: { label: string; value: number; color: string; border?: boolean }) {
  return (
    <div className={`${color} ${border ? 'border border-gray-100' : ''} p-3 rounded-xl text-center`}>
      <p className="text-[14px] font-black leading-none mb-1">{value}</p>
      <p className="text-[8px] font-black uppercase tracking-widest opacity-70">{label}</p>
    </div>
  );
}

interface QuestionItemProps {
  index: number;
  question: Question;
  area: Area;
  currentValue?: ScoreValue;
  observation: string;
  onScore: (s: ScoreValue) => void;
  onObserve: (o: string) => void;
  controlParts?: ControlPartItem[];
  onUpdatePart?: (num: number, field: keyof ControlPartItem, value: any) => void;
}

const QuestionItem: React.FC<QuestionItemProps> = ({ 
  index, 
  question, 
  area,
  currentValue, 
  observation,
  onScore, 
  onObserve,
  controlParts,
  onUpdatePart
}) => {
  const isOrdenes = area === Area.ORDENES;
  return (
    <div className={`bento-card transition-all !p-5 ${currentValue !== undefined ? "border-gray-100" : "border-toyota-red/30 border-dashed"}`}>
      <div className={isOrdenes ? "w-full" : "flex gap-4"}>
        {!isOrdenes && (
          <span className="w-8 h-8 rounded-lg bg-toyota-black text-white flex items-center justify-center font-black text-xs flex-shrink-0 shadow-lg">
            {String(index).padStart(2, '0')}
          </span>
        )}
        <div className="flex-grow">
          {isOrdenes ? (
            <div className="border border-gray-200 rounded-xl overflow-hidden mb-4 shadow-inner bg-white">
              {/* Question text Header - spreadsheet blue styling mimicking user's workbook */}
              <div className="bg-[#B4C6E7] px-4 py-2.5 border-b border-[#8FAADC] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-start gap-2.5">
                  <span className="w-6 h-6 rounded bg-[#1F497D] text-white flex items-center justify-center font-black text-[11px] flex-shrink-0 shadow-sm shadow-[#1F497D]/20 mt-0.5">
                    {index}
                  </span>
                  <h4 className="text-[12px] font-black text-[#1F4E79] leading-snug uppercase tracking-wide">
                    {question.text}
                  </h4>
                </div>
                {question.responsible && (
                  <div className="flex flex-col items-start sm:items-end flex-shrink-0 bg-white/70 px-2.5 py-0.5 rounded-lg border border-[#8FAADC]/40">
                    <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest leading-none mb-0.5">Responsable</span>
                    <span className="text-[10px] font-black text-[#1F497D] uppercase tracking-wide leading-normal">
                      {question.responsible}
                    </span>
                  </div>
                )}
              </div>
              
              {/* Criterion row - white background showing description */}
              {question.criteria && (
                <div className="bg-white px-4 py-3 border-t border-gray-100 flex flex-col">
                  <span className="text-[9px] font-black text-toyota-red uppercase tracking-widest mb-1 font-sans">
                    Criterio de Evaluación:
                  </span>
                  <p className="text-[11px] text-gray-600 font-bold leading-relaxed whitespace-pre-wrap italic">
                    {question.criteria}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <>
              <h4 className="text-sm font-normal text-toyota-black leading-snug mb-3 whitespace-pre-line">
                {question.text.replace(/EVALUACION:/gi, "\n\nEVALUACION:")}
              </h4>
              {question.responsible && (
                <div className="inline-flex items-center gap-1.5 bg-gray-100 px-2.5 py-1 rounded-full text-[10px] font-bold text-gray-600 uppercase mb-3">
                  <span className="text-toyota-red font-black">●</span> Responsable: {question.responsible}
                </div>
              )}
              {question.criteria && area !== Area.SERVICIOS && (
                <div className="bg-gray-50 p-3 rounded-xl border-l-4 border-toyota-red mb-4 shadow-inner">
                  <p className="text-[9px] font-black text-toyota-red uppercase tracking-widest mb-1 font-sans">Criterio de Evaluación:</p>
                  <p className="text-[11px] text-gray-500 font-medium leading-relaxed italic whitespace-pre-line">{question.criteria}</p>
                </div>
              )}
            </>
          )}

          {area === Area.REPUESTOS && (index === 1 || index === 2) && controlParts && controlParts.length > 0 && (
            <div className="my-4 bg-gray-50 border border-gray-200 rounded-xl overflow-hidden p-3 shadow-inner">
              <div className="flex items-center justify-between mb-3 border-b pb-2">
                <span className="text-[10px] font-black text-toyota-red uppercase tracking-widest flex items-center gap-1.5">
                  📁 Planilla de Control: {index === 1 ? "Muestra de Ubicaciones" : "Muestra de Stock"}
                </span>
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest bg-gray-200/50 px-2.5 py-0.5 rounded-full">
                  10 Piezas Auditadas
                </span>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-[11px] font-medium text-gray-600">
                  <thead className="bg-gray-100/80 text-[10px] uppercase font-black tracking-wider text-gray-700">
                    <tr>
                      <th className="px-2.5 py-2 rounded-l-md">N°</th>
                      <th className="px-2.5 py-2">Código</th>
                      <th className="px-2.5 py-2">Pieza</th>
                      {index === 1 ? (
                        <>
                          <th className="px-2.5 py-2">Ubic. Física</th>
                          <th className="px-2.5 py-2">Ubic. Sistema</th>
                          <th className="px-2.5 py-2 text-center rounded-r-md">Coincide</th>
                        </>
                      ) : (
                        <>
                          <th className="px-2.5 py-2 text-right">Cant. Física</th>
                          <th className="px-2.5 py-2 text-right">Cant. Sistema</th>
                          <th className="px-2.5 py-2 text-center rounded-r-md">Coincide</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {controlParts.map((part) => (
                      <tr key={part.num} className="hover:bg-white/80 transition-colors">
                        <td className="px-2.5 py-1.5 font-bold text-gray-500">{part.num}</td>
                        <td className="px-2.5 py-1.5">
                          <input
                            type="text"
                            value={part.code}
                            onChange={(e) => onUpdatePart?.(part.num, "code", e.target.value)}
                            placeholder="Código"
                            className="w-full bg-white border border-gray-200 rounded px-1.5 py-0.5 text-[10px] font-mono font-bold focus:outline-none focus:border-toyota-red"
                          />
                        </td>
                        <td className="px-2.5 py-1.5">
                          <input
                            type="text"
                            value={part.name}
                            onChange={(e) => onUpdatePart?.(part.num, "name", e.target.value)}
                            placeholder="Nombre de pieza"
                            className="w-full bg-white border border-gray-200 rounded px-1.5 py-0.5 text-[10px] font-bold focus:outline-none focus:border-toyota-red"
                          />
                        </td>
                        {index === 1 ? (
                          <>
                            <td className="px-2.5 py-1.5">
                              <input
                                type="text"
                                value={part.physicalLoc}
                                onChange={(e) => onUpdatePart?.(part.num, "physicalLoc", e.target.value)}
                                className="w-full bg-white border border-gray-200 rounded px-1.5 py-0.5 text-[10px] font-bold focus:outline-none focus:border-toyota-red uppercase"
                              />
                            </td>
                            <td className="px-2.5 py-1.5">
                              <input
                                type="text"
                                value={part.systemLoc}
                                onChange={(e) => onUpdatePart?.(part.num, "systemLoc", e.target.value)}
                                className="w-full bg-white border border-gray-200 rounded px-1.5 py-0.5 text-[10px] font-bold focus:outline-none focus:border-toyota-red uppercase"
                              />
                            </td>
                            <td className="px-2.5 py-1.5 text-center">
                              <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                part.locMatch === 1 ? "bg-green-100 text-green-700" : "bg-red-100 text-toyota-red"
                              }`}>
                                {part.locMatch === 1 ? "SÍ (1)" : "NO (0)"}
                              </span>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-2.5 py-1.5 text-right">
                              <input
                                type="number"
                                value={part.physicalQty}
                                onChange={(e) => onUpdatePart?.(part.num, "physicalQty", Number(e.target.value))}
                                className="text-right w-16 bg-white border border-gray-200 rounded px-1.5 py-0.5 text-[10px] font-bold focus:outline-none focus:border-toyota-red"
                              />
                            </td>
                            <td className="px-2.5 py-1.5 text-right font-bold text-gray-800">
                              <input
                                type="number"
                                value={part.systemQty}
                                onChange={(e) => onUpdatePart?.(part.num, "systemQty", Number(e.target.value))}
                                className="text-right w-16 bg-white border border-gray-200 rounded px-1.5 py-0.5 text-[10px] font-bold focus:outline-none focus:border-toyota-red"
                              />
                            </td>
                            <td className="px-2.5 py-1.5 text-center">
                              <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                part.qtyMatch === 1 ? "bg-green-100 text-green-700" : "bg-red-100 text-toyota-red"
                              }`}>
                                {part.qtyMatch === 1 ? "SÍ (1)" : "NO (0)"}
                              </span>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="mt-2.5 pt-2 border-t border-gray-200/80 flex items-center justify-between text-[11px] font-black text-gray-700">
                <span>PORCENTAJE DE CONFORMIDAD:</span>
                <span className={`text-[12px] ${
                  (index === 1 
                    ? (controlParts.filter(p => p.locMatch === 1).length / controlParts.length) 
                    : (controlParts.filter(p => p.qtyMatch === 1).length / controlParts.length)) >= 1.0 
                    ? "text-green-600" : "text-toyota-red"
                }`}>
                  {((index === 1 
                    ? controlParts.filter(p => p.locMatch === 1).length 
                    : controlParts.filter(p => p.qtyMatch === 1).length) / controlParts.length * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          )}

          {isOrdenes && index === 1 ? (
            <div className="flex flex-col gap-3.5 bg-[#D9E1F2]/20 border border-[#8FAADC]/50 rounded-xl p-4 shadow-inner">
              <label className="text-[10px] font-black uppercase tracking-widest text-[#1F497D] flex items-center gap-1.5">
                🔢 Completar Número de Orden de Reparación (OR):
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={observation}
                  onChange={(e) => {
                    onObserve(e.target.value);
                  }}
                  placeholder="Escriba aquí el número manually... Ej. 2393085"
                  className="flex-grow bg-white border-2 border-dashed border-[#8FAADC] focus:border-[#1F4E79] focus:ring-0 rounded-xl px-4 py-2.5 font-mono text-sm font-black text-[#1F497D]"
                />
                <div className="bg-[#B4C6E7] px-4 py-2 rounded-xl flex items-center justify-center border border-[#8FAADC] flex-shrink-0">
                  <span className="text-[9px] font-black uppercase text-[#1F4E79] tracking-widest">Punto No Medible</span>
                </div>
              </div>
              {observation.trim() === "" ? (
                <p className="text-[9px] text-[#EB0A1E] font-black uppercase tracking-widest animate-pulse flex items-center gap-1">
                  ⚠️ * Este número de orden es requerido antes de finalizar.
                </p>
              ) : (
                <p className="text-[9px] text-green-600 font-black uppercase tracking-widest flex items-center gap-1">
                  ✓ Registrado: OR #{observation}
                </p>
              )}
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="grid grid-cols-3 gap-2 flex-grow max-w-sm">
                <ScoreButton 
                  active={currentValue === 1} 
                  onClick={() => onScore(1)} 
                  label="Cumple" 
                  activeClass="bg-green-600 text-white border-green-600"
                />
                <ScoreButton 
                  active={currentValue === 0} 
                  onClick={() => onScore(0)} 
                  label="No Cumple" 
                  activeClass="bg-[#EB0A1E] text-white border-[#EB0A1E]"
                />
                <ScoreButton 
                  active={currentValue === "N/A"} 
                  onClick={() => onScore("N/A")} 
                  label="N/A" 
                  activeClass="bg-gray-800 text-white border-gray-800"
                />
              </div>

              <div className="flex items-center gap-2 flex-grow">
                <textarea
                  value={observation}
                  onChange={(e) => onObserve(e.target.value)}
                  placeholder="Observaciones específicas..."
                  className="w-full text-[11px] h-10 min-h-[40px] resize-none"
                />
                <label className="cursor-pointer bg-gray-100 p-2.5 rounded-xl hover:bg-gray-200 transition-all flex items-center justify-center flex-shrink-0 w-10 h-10 border border-gray-200">
                  <Camera className="w-4 h-4 text-gray-500" />
                  <input type="file" accept="image/*" capture="environment" className="hidden" />
                </label>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ScoreButton({ active, onClick, label, activeClass }: { active: boolean; onClick: () => void; label: string; activeClass: string }) {
  return (
    <button
      onClick={onClick}
      className={`py-2 pt-3 rounded-xl border-2 text-[9px] font-black uppercase tracking-widest transition-all h-12 flex flex-col items-center justify-center leading-none ${
        active 
          ? activeClass 
          : "bg-white border-gray-100 text-gray-400 hover:border-gray-200 shadow-sm"
      }`}
    >
      <span className="text-sm mb-1">{label === "Cumple" ? "1" : label === "No Cumple" ? "0" : "-"}</span>
      {label}
    </button>
  );
}

function StatBox({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className={`px-4 py-2 rounded-xl text-center min-w-[70px] ${color}`}>
      <span className="block text-[10px] font-black uppercase tracking-widest opacity-70 leading-none mb-1">{label}</span>
      <span className="block text-sm font-black">{value}</span>
    </div>
  );
}
