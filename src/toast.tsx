import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";

type ToastType = "default" | "error";
type ToastItem = { id: number; message: string; type: ToastType };

type ToastCtx = {
  show: (message: string, type?: ToastType) => void;
};

const Ctx = createContext<ToastCtx>({} as ToastCtx);
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const show = useCallback((message: string, type: ToastType = "default") => {
    const id = ++counter.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  return (
    <Ctx.Provider value={{ show }}>
      {children}
      <div style={{
        position: "fixed",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        alignItems: "center",
        pointerEvents: "none",
      }}>
        {toasts.map((t) => (
          <div key={t.id} style={{
            backgroundColor: t.type === "error" ? "#ff3b30" : "#010101",
            color: "#fff",
            padding: "12px 24px",
            borderRadius: 999,
            fontSize: 14,
            fontWeight: 600,
            fontFamily: "Inter, sans-serif",
            boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
            animation: "toastIn 0.25s ease-out",
            maxWidth: "90vw",
            textAlign: "center",
          }}>
            {t.message}
          </div>
        ))}
      </div>
      <style>{`@keyframes toastIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </Ctx.Provider>
  );
}
