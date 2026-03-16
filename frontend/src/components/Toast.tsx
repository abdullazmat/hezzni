import { CheckCircle2, XCircle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "info";

export interface ToastProps {
  open: boolean;
  type?: ToastType;
  title: string;
  message?: string;
  onClose: () => void;
}

const paletteByType: Record<
  ToastType,
  { bg: string; border: string; icon: string }
> = {
  success: { bg: "#ecfdf3", border: "#a7f3d0", icon: "#16a34a" },
  error: { bg: "#fef2f2", border: "#fecaca", icon: "#dc2626" },
  info: { bg: "#eff6ff", border: "#bfdbfe", icon: "#2563eb" },
};

function ToastIcon({ type }: { type: ToastType }) {
  const color = paletteByType[type].icon;
  if (type === "success") return <CheckCircle2 size={20} color={color} />;
  if (type === "error") return <XCircle size={20} color={color} />;
  return <Info size={20} color={color} />;
}

export function Toast({
  open,
  type = "info",
  title,
  message,
  onClose,
}: ToastProps) {
  const palette = paletteByType[type];

  return (
    <div
      style={{
        position: "fixed",
        top: 24,
        right: 24,
        zIndex: 10050,
        pointerEvents: "none",
      }}
      aria-live="polite"
      aria-atomic="true"
    >
      <div
        style={{
          minWidth: 320,
          maxWidth: 420,
          border: `1px solid ${palette.border}`,
          background: palette.bg,
          borderRadius: 16,
          boxShadow: "0 16px 30px rgba(15, 23, 42, 0.14)",
          padding: "14px 14px 14px 12px",
          display: "flex",
          gap: 10,
          alignItems: "flex-start",
          opacity: open ? 1 : 0,
          transform: open ? "translateY(0)" : "translateY(-8px)",
          transition: "opacity 180ms ease, transform 180ms ease",
          pointerEvents: open ? "auto" : "none",
        }}
      >
        <div style={{ marginTop: 1 }}>
          <ToastIcon type={type} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, color: "#111827", fontSize: 14 }}>
            {title}
          </div>
          {message ? (
            <div style={{ color: "#374151", fontSize: 13, marginTop: 2 }}>
              {message}
            </div>
          ) : null}
        </div>
        <button
          onClick={onClose}
          style={{
            border: "none",
            background: "transparent",
            cursor: "pointer",
            color: "#4b5563",
            padding: 2,
            lineHeight: 0,
          }}
          aria-label="Close notification"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
