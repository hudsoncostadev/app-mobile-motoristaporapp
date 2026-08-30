import React from "react";
import { colors, font, radius, spacing } from "../theme";

type Variant = "white" | "dark" | "accent";

export default function PrimaryButton({
  label,
  onClick,
  variant = "white",
  loading = false,
  disabled = false,
  icon,
  testID,
  style,
}: {
  label: string;
  onClick: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  testID?: string;
  style?: React.CSSProperties;
}) {
  const bg = variant === "white" ? colors.white : variant === "accent" ? colors.accent : colors.card;
  const fg = variant === "dark" ? colors.white : colors.card;
  const isDisabled = disabled || loading;

  return (
    <button
      data-testid={testID}
      onClick={onClick}
      disabled={isDisabled}
      style={{
        height: 58,
        borderRadius: radius.pill,
        border: "none",
        backgroundColor: bg,
        color: fg,
        opacity: isDisabled ? 0.55 : 1,
        cursor: isDisabled ? "default" : "pointer",
        fontFamily: "Inter, sans-serif",
        fontWeight: font.bold,
        fontSize: 16,
        letterSpacing: 0.2,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: spacing.sm,
        width: "100%",
        transition: "opacity 0.15s, transform 0.1s",
        ...style,
      }}
      onMouseDown={(e) => { if (!isDisabled) (e.currentTarget as HTMLElement).style.transform = "scale(0.98)"; }}
      onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
    >
      {loading ? (
        <span style={{ width: 20, height: 20, border: "2px solid currentColor", borderTopColor: "transparent", borderRadius: "50%", display: "inline-block", animation: "spin 0.6s linear infinite" }} />
      ) : (
        <>
          {icon}
          <span>{label}</span>
        </>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </button>
  );
}
