"use client";

import { createContext, useCallback, useContext, useLayoutEffect, useRef, useState } from "react";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";

/* ── Theme ── */
type Theme = "light" | "dark";
const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({ theme: "light", toggle: () => {} });

function applyThemeClass(next: Theme) {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(next === "dark" ? "dark" : "light");
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    const stored = localStorage.getItem("theme") as Theme | null;
    const resolved = stored ?? "dark";
    setTheme(resolved);
    applyThemeClass(resolved);
    setReady(true);
  }, []);

  const toggle = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("theme", next);
    applyThemeClass(next);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      <div className={`theme-ready-wrapper${ready ? " ready" : ""}`}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);

/* ── Toast ── */
type ToastType = "success" | "error" | "info";
type Toast = { id: string; message: string; type: ToastType; exiting?: boolean };

const ToastContext = createContext<(message: string, type?: ToastType) => void>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.map((t) => t.id === id ? { ...t, exiting: true } : t));
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 200);
  }, []);

  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev.slice(-4), { id, message, type }]);
    const timer = setTimeout(() => dismiss(id), 3500);
    timers.current.set(id, timer);
  }, [dismiss]);

  const ICONS: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle2 className="toast-icon h-4 w-4 shrink-0" />,
    error:   <XCircle      className="toast-icon h-4 w-4 shrink-0" />,
    info:    <Info         className="toast-icon h-4 w-4 shrink-0" />,
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-viewport">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}${t.exiting ? " toast-exit" : ""}`}>
            {ICONS[t.type]}
            <p className="flex-1 leading-snug">{t.message}</p>
            <button onClick={() => dismiss(t.id)} className="shrink-0 text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
