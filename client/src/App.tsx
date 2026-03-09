import { Navigate, Route, Routes, Outlet } from "react-router-dom";
import { useMe } from "./hooks/useMe";
import Board from "./pages/Board";
import Analytics from "./pages/Analytics";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

function AppLoader() {
  return (
    <div className="appBoot">
      <div className="appBootCard">
        <div className="appBootSpinner" />
        <div className="appBootTitle">Loading session...</div>
        <div className="appBootSub">Preparing your workspace</div>
      </div>
    </div>
  );
}

function RequireAuth() {
  const { data, isLoading, isError } = useMe();

  if (isLoading) return <AppLoader />;
  if (isError || !data?.user) return <Navigate to="/login" replace />;

  return <Outlet />;
}

function PublicOnly() {
  const { data, isLoading } = useMe();

  if (isLoading) return <AppLoader />;
  if (data?.user) return <Navigate to="/board" replace />;

  return <Outlet />;
}

export default function App() {
  return (
    <Routes>
      {/* Public-only */}
      <Route element={<PublicOnly />}>
        <Route path="/login" element={<Auth initial="login" />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Keep this URL working, but don’t render a separate page */}
        <Route path="/register" element={<Navigate to="/login" replace />} />
      </Route>

      {/* Protected */}
      <Route element={<RequireAuth />}>
        <Route path="/board" element={<Board />} />
        <Route path="/analytics" element={<Analytics />} />
      </Route>

      {/* Default */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}