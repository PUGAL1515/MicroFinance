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
import CustomerManagement from "./customer/components/CustomerManagement";
import GroupLoanManagement from "./loans/pages/GroupLoanManagement";
import KYCVerification from "./customer/components/KYCVerification";
import ApprovedLoansDashboard from "./loans/pages/ApprovedLoansDashboard";
import GroupCollection from "./loans/components/GroupCollection";

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
                  <GroupLoanManagement/>
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
            <Route path="/customers" element={
              <ProtectedRoute allowedRoles={["SUPER_ADMIN", "GROUP_LOAN_ADMIN"]}>
              <CustomerManagement/>
              </ProtectedRoute>
            } />
            <Route path="/kyc-verification" element={
              <ProtectedRoute allowedRoles={["SUPER_ADMIN", "GROUP_LOAN_ADMIN"]}>
                <KYCVerification/>
              </ProtectedRoute>
            } />
          </Route>
           <Route path="/approved-loans" element={
              <ProtectedRoute allowedRoles={["SUPER_ADMIN", "GROUP_LOAN_ADMIN"]}>
                <ApprovedLoansDashboard/>
              </ProtectedRoute>
            } />
            <Route
  path="/group-loan/applications/:applicationId/collections"
  element={
    <ProtectedRoute allowedRoles={["SUPER_ADMIN", "GROUP_LOAN_ADMIN"]}>
      <GroupCollection/>
    </ProtectedRoute>
  }
/>
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
