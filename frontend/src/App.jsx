import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import RD from "./pages/RD";
import FD from "./pages/FD";
import GroupLoans from "./pages/GroupLoans";
import Reports from "./pages/Reports";
import Users from "./pages/Users";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />

          {/* Protected routes with Sidebar */}
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />

            <Route
              path="/rd"
              element={
                <ProtectedRoute allowedRoles={["SUPER_ADMIN", "RD_FD_ADMIN"]}>
                  <RD />
                </ProtectedRoute>
              }
            />
            <Route
              path="/fd"
              element={
                <ProtectedRoute allowedRoles={["SUPER_ADMIN", "RD_FD_ADMIN"]}>
                  <FD />
                </ProtectedRoute>
              }
            />
            <Route
              path="/group-loans"
              element={
                <ProtectedRoute allowedRoles={["SUPER_ADMIN", "GROUP_LOAN_ADMIN"]}>
                  <GroupLoans />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute allowedRoles={["SUPER_ADMIN"]}>
                  <Reports />
                </ProtectedRoute>
              }
            />
            <Route
              path="/users"
              element={
                <ProtectedRoute allowedRoles={["SUPER_ADMIN"]}>
                  <Users />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;