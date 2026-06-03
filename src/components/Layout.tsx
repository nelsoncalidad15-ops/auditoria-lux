/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { Auditor, AuditorInfo } from "../types";
import { User, LogOut, LogIn } from "lucide-react";
import { auth, googleProvider } from "../lib/firebase";
import { signInWithPopup, signOut, onAuthStateChanged, User as FirebaseUser } from "firebase/auth";

interface LayoutProps {
  children: React.ReactNode;
  currentAuditor?: Auditor;
}

export function Layout({ children, currentAuditor }: LayoutProps) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const auditorData = currentAuditor ? AuditorInfo[currentAuditor] : null;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  const handleLogin = () => signInWithPopup(auth, googleProvider);
  const handleLogout = () => signOut(auth);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col font-sans border-t-8 border-toyota-red">
      {/* Toyota Branding Header */}
      <header className="flex items-center justify-between px-8 py-4 bg-white shadow-sm sticky top-0 z-50">
        <div className="flex items-center">
          <div>
            <h1 className="text-2xl font-black tracking-tighter text-toyota-black">AUTOLUX</h1>
            <p className="text-xs font-bold text-toyota-red uppercase tracking-widest">Auditoría Interna Posventa</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-4">
              {auditorData && (
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Auditor Activo</p>
                  <p className="text-sm font-bold text-gray-900 leading-tight">{auditorData.name}</p>
                  <p className="text-[10px] text-gray-400 font-medium">{auditorData.role}</p>
                </div>
              )}
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-gray-100 border-2 border-toyota-red flex items-center justify-center font-bold text-gray-600 shadow-inner">
                  {auditorData ? auditorData.name.split(' ').map(n => n[0]).join('') : <User className="w-5 h-5" />}
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 text-gray-400 hover:text-toyota-red transition-colors"
                  title="Cerrar Sesión"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={handleLogin}
              className="bg-toyota-red text-white px-6 py-2 rounded-lg font-black uppercase tracking-widest text-[10px] flex items-center gap-2 hover:bg-toyota-black transition-all shadow-md active:scale-95"
            >
              <LogIn className="w-3 h-3" /> Ingresar
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        {children}
      </main>

      {/* Footer Bar */}
      <footer className="h-8 bg-gray-900 flex items-center px-8 justify-between">
        <p className="text-[10px] text-gray-500 font-medium tracking-widest uppercase">
          © {new Date().getFullYear()} Autolux - Sistema de Calidad Toyota
        </p>
        <div className="flex gap-4">
           {user && (
             <span className="text-[10px] text-green-500 font-bold uppercase flex items-center gap-1.5">
               <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> Sistema En Línea
             </span>
           )}
        </div>
      </footer>
    </div>
  );
}
