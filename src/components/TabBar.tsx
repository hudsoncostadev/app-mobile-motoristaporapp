import React from "react";
import { Chrome as Home, Target, ChartBar as BarChart3, User } from "lucide-react";
import { colors, font } from "../theme";
import { useLocation, useNavigate } from "react-router-dom";

const TABS = [
  { path: "/", label: "Início", icon: Home },
  { path: "/goals", label: "Metas", icon: Target },
  { path: "/balance", label: "Balanço", icon: BarChart3 },
  { path: "/profile", label: "Perfil", icon: User },
];

export const TAB_BAR_HEIGHT = 66;

export default function TabBar() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav
      data-testid="bottom-navigation"
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        backgroundColor: colors.white,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingTop: 10,
        paddingBottom: 0,
        boxShadow: "0 -6px 20px rgba(0,0,0,0.08)",
        zIndex: 100,
        height: TAB_BAR_HEIGHT,
        maxWidth: "480px",
        margin: "0 auto",
      }}
    >
      {TABS.map((tab) => {
        const focused = location.pathname === tab.path;
        const Icon = tab.icon;
        return (
          <button
            key={tab.path}
            data-testid={`tab-${tab.label.toLowerCase()}`}
            onClick={() => navigate(tab.path)}
            style={{
              flex: 1,
              border: "none",
              background: "transparent",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
            }}
          >
            <div style={{
              width: 44,
              height: 34,
              borderRadius: 999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: focused ? colors.card : "transparent",
              transition: "background-color 0.2s",
            }}>
              <Icon
                size={22}
                color={focused ? colors.accent : colors.muted}
                strokeWidth={focused ? 2.4 : 2}
              />
            </div>
            <span style={{
              fontFamily: "Inter, sans-serif",
              fontSize: 11,
              fontWeight: focused ? font.bold : font.medium,
              color: focused ? colors.onSurface : colors.muted,
            }}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
