
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ role }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="route-loading">
        <div className="loading-spinner" />
        <p>Loading DoveX...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate
        to={role === "admin" ? "/control/login" : "/seller/login"}
        replace
      />
    );
  }

  if (user.role !== role) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
