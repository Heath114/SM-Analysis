import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import { DashboardProvider } from "./context/DashboardContext";
import AppLayout from "./components/AppLayout";
import AuthPage from "./pages/AuthPage";
import Overview from "./pages/Overview";
import Content from "./pages/Content";
import Audience from "./pages/Audience";
import Platforms from "./pages/Platforms";
import Connections from "./pages/Connections";

function Splash() {
  return (
    <div style={{ height: "100%", display: "grid", placeItems: "center", color: "var(--muted)" }}>
      <span className="brandmark">
        <span className="glyph"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M2 12h4l2.5-7 4 15 3-9 2 3h4.5" /></svg></span>
        <b>PulseBoard</b>
      </span>
    </div>
  );
}

function Gate() {
  const { session, loading } = useAuth();
  if (loading) return <Splash />;
  if (!session) return <AuthPage />;
  return (
    <DashboardProvider>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Overview />} />
          <Route path="content" element={<Content />} />
          <Route path="audience" element={<Audience />} />
          <Route path="platforms" element={<Platforms />} />
          <Route path="connections" element={<Connections />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </DashboardProvider>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <Gate />
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
}
