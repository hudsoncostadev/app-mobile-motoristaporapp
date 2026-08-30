import React from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth";
import { ToastProvider } from "./toast";
import TabBar from "./components/TabBar";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Goals from "./pages/Goals";
import Balance from "./pages/Balance";
import Profile from "./pages/Profile";
import CloseDay from "./pages/CloseDay";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#f4f4f4" }}>
        <div style={{ width: 32, height: 32, border: "3px solid #010101", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.6s linear infinite" }}>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#f4f4f4" }}>
        <div style={{ width: 32, height: 32, border: "3px solid #010101", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.6s linear infinite" }}>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/close-day" element={<ProtectedRoute><CloseDay /></ProtectedRoute>} />
      <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
      <Route path="/goals" element={<ProtectedRoute><Goals /></ProtectedRoute>} />
      <Route path="/balance" element={<ProtectedRoute><Balance /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function Shell() {
  const location = useLocation();
  const showTabBar = location.pathname !== "/login" && location.pathname !== "/close-day";

  return (
    <>
      <AppRoutes />
      {showTabBar && <TabBar />}
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Shell />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
