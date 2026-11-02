
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white px-10 py-8 shadow-sm">
          <div className="relative mb-5 h-12 w-12">
            <div className="absolute inset-0 rounded-full border-4 border-blue-100"></div>
            <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-blue-700"></div>
          </div>

          <h2 className="text-lg font-semibold text-slate-800">
            Please wait
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Verifying your access...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If roles are specified, check them
  if (allowedRoles.length > 0) {
    const userRole = user.profile?.role || user.role;

    if (!allowedRoles.includes(userRole)) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
