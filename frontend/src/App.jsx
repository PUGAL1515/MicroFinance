
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";

// Pages
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import RD from "./pages/RD";
import FD from "./pages/FD";
import GroupLoans from "./pages/GroupLoans";
import Reports from "../src/pages/Reports";
import Users from "./pages/Users";

// Customer
import CustomerManagement from "./customer/components/CustomerManagement";
import KYCVerification from "./customer/components/KYCVerification";

// Loans
import GroupLoanManagement from "./loans/pages/GroupLoanManagement";
import ApprovedLoansDashboard from "./loans/pages/ApprovedLoansDashboard";
import GroupCollection from "./loans/components/GroupCollection";

// Collections
import CollectionsPage from "../src/collections/components/CollectionsPage";

// Collections CSS
import "../src/styles/collections.css";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>

          {/* ================= PUBLIC ROUTES ================= */}

          <Route path="/login" element={<Login />} />


          {/* ================= PROTECTED ROUTES ================= */}

          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >

            {/* Dashboard */}
            <Route
              path="/dashboard"
              element={<Dashboard />}
            />

            {/* Recurring Deposit */}
            <Route
              path="/rd"
              element={
                <ProtectedRoute
                  allowedRoles={["SUPER_ADMIN", "RD_FD_ADMIN"]}
                >
                  <RD />
                </ProtectedRoute>
              }
            />

            {/* Fixed Deposit */}
            <Route
              path="/fd"
              element={
                <ProtectedRoute
                  allowedRoles={["SUPER_ADMIN", "RD_FD_ADMIN"]}
                >
                  <FD />
                </ProtectedRoute>
              }
            />

            {/* Group Loans */}
            <Route
              path="/group-loans"
              element={
                <ProtectedRoute
                  allowedRoles={["SUPER_ADMIN", "GROUP_LOAN_ADMIN"]}
                >
                  <GroupLoanManagement />
                </ProtectedRoute>
              }
            />

            {/* Customer Management */}
            <Route
              path="/customers"
              element={
                <ProtectedRoute
                  allowedRoles={["SUPER_ADMIN", "GROUP_LOAN_ADMIN"]}
                >
                  <CustomerManagement />
                </ProtectedRoute>
              }
            />

            {/* KYC Verification */}
            <Route
              path="/kyc-verification"
              element={
                <ProtectedRoute
                  allowedRoles={["SUPER_ADMIN", "GROUP_LOAN_ADMIN"]}
                >
                  <KYCVerification />
                </ProtectedRoute>
              }
            />

            {/* ================= COLLECTIONS MODULE ================= */}

            <Route
              path="/collections"
              element={
                <ProtectedRoute
                  allowedRoles={["SUPER_ADMIN", "GROUP_LOAN_ADMIN"]}
                >
                  <CollectionsPage />
                </ProtectedRoute>
              }
            />

            {/* Reports */}
            <Route
              path="/reports"
              element={
                <ProtectedRoute
                  allowedRoles={["SUPER_ADMIN"]}
                >
                  <Reports/>
                </ProtectedRoute>
              }
            />

            {/* User Management */}
            <Route
              path="/users"
              element={
                <ProtectedRoute
                  allowedRoles={["SUPER_ADMIN"]}
                >
                  <Users />
                </ProtectedRoute>
              }
            />

          </Route>


          {/* ================= OTHER PROTECTED ROUTES ================= */}

          {/* Approved Loans */}
          <Route
            path="/approved-loans"
            element={
              <ProtectedRoute
                allowedRoles={["SUPER_ADMIN", "GROUP_LOAN_ADMIN"]}
              >
                <ApprovedLoansDashboard />
              </ProtectedRoute>
            }
          />

          {/* Existing Group Loan Collection */}
          <Route
            path="/group-loan/applications/:applicationId/collections"
            element={
              <ProtectedRoute
                allowedRoles={["SUPER_ADMIN", "GROUP_LOAN_ADMIN"]}
              >
                <GroupCollection />
              </ProtectedRoute>
            }
          />


          {/* ================= FALLBACK ================= */}

          <Route
            path="*"
            element={<Navigate to="/dashboard" replace />}
          />

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
