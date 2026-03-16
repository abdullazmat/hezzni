import { useState, useCallback } from "react";

export type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback(
    (message: string, type: ToastType = "success") => {
      const id = Date.now();
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3500);
    },
    [],
  );

  const ToastContainer = () => (
    <>
      <style>{`
        .settings-toast-container {
          position: fixed;
          bottom: 2rem;
          right: 2rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          z-index: 99999;
          pointer-events: none;
        }
        .settings-toast {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem 1.5rem;
          border-radius: 16px;
          font-weight: 700;
          font-size: 0.95rem;
          box-shadow: 0 10px 25px -5px rgba(0,0,0,0.2);
          animation: settingsToastIn 0.35s cubic-bezier(0.34,1.56,0.64,1);
          min-width: 280px;
          max-width: 420px;
        }
        .settings-toast.success {
          background: #38AC57;
          color: white;
        }
        .settings-toast.error {
          background: #ef4444;
          color: white;
        }
        .settings-toast.info {
          background: #3b82f6;
          color: white;
        }
        .settings-toast-icon {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: rgba(255,255,255,0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          flex-shrink: 0;
          font-weight: 900;
        }
        @keyframes settingsToastIn {
          from { transform: translateX(110%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
      <div className="settings-toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`settings-toast ${t.type}`}>
            <div className="settings-toast-icon">
              {t.type === "success" ? "✓" : t.type === "error" ? "✕" : "i"}
            </div>
            {t.message}
          </div>
        ))}
      </div>
    </>
  );

  return { showToast, ToastContainer };
}
