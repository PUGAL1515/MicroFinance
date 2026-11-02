
import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [mobileOpen, setMobileOpen] = useState(false);

  const role = user?.profile?.role || user?.role;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Menu items based on role
  const menuItems = [
    {
      name: "Dashboard",
      path: "/dashboard",
      icon: "📊",
      roles: ["SUPER_ADMIN", "RD_FD_ADMIN", "GROUP_LOAN_ADMIN"],
    },
    {
      name: "Recurring Deposit",
      path: "/rd",
      icon: "🔄",
      roles: ["SUPER_ADMIN", "RD_FD_ADMIN"],
    },
    {
      name: "Fixed Deposit",
      path: "/fd",
      icon: "🏦",
      roles: ["SUPER_ADMIN", "RD_FD_ADMIN"],
    },
    {
      name: "Group Loans",
      path: "/group-loans",
      icon: "👥",
      roles: ["SUPER_ADMIN", "GROUP_LOAN_ADMIN"],
    },
    {
      name: "Customer Management",
      path: "/customers",
      icon: "👤",
      roles: ["SUPER_ADMIN", "GROUP_LOAN_ADMIN"],
    },
    {
      name: "Reports",
      path: "/reports",
      icon: "📈",
      roles: ["SUPER_ADMIN"],
    },
    {
      name: "User Management",
      path: "/users",
      icon: "⚙️",
      roles: ["SUPER_ADMIN"],
    },
    {
      name: "Approved Loans",
      path: "/approved-loans",
      icon: "💳",
      roles: ["SUPER_ADMIN", "GROUP_LOAN_ADMIN"],
    },
  ];

  const filteredMenu = menuItems.filter((item) =>
    item.roles.includes(role)
  );

  const closeMobileMenu = () => {
    setMobileOpen(false);
  };

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-6">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 text-lg font-extrabold text-white shadow-lg shadow-blue-900/30">
          SM
        </div>

        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold tracking-wide text-white">
            SMLNEXGEN
          </h1>
          <p className="mt-0.5 text-xs font-medium tracking-wider text-slate-400">
            MICROFINANCE PORTAL
          </p>
        </div>
      </div>

      {/* Navigation Heading */}
      <div className="px-6 pb-2 pt-7">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
          Main Menu
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-5">
        {filteredMenu.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={closeMobileMenu}
            className={({ isActive }) =>
              `group relative flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-950/30"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`
            }
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/5 text-base transition-colors group-hover:bg-white/10">
              {item.icon}
            </span>

            <span className="truncate">{item.name}</span>
          </NavLink>
        ))}
      </nav>

      {/* User Info + Logout */}
      <div className="border-t border-white/10 p-4">
        <div className="mb-4 flex items-center gap-3 rounded-xl bg-white/5 p-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-base font-bold text-white shadow-md">
            {user?.username?.charAt(0).toUpperCase() || "U"}
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">
              {user?.username || "User"}
            </p>

            <p className="mt-1 truncate text-[10px] font-medium uppercase tracking-wider text-slate-400">
              {role?.replaceAll("_", " ") || "ADMIN"}
            </p>
          </div>

          <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400"></span>
        </div>

        <button
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300 transition-all duration-200 hover:border-red-500 hover:bg-red-500 hover:text-white"
        >
          <span>🚪</span>
          Logout
        </button>

        <p className="mt-4 text-center text-[10px] text-slate-500">
          SMLNEXGEN © {new Date().getFullYear()}
        </p>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Header */}
      <div className="fixed left-0 right-0 top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 shadow-sm md:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 text-sm font-bold text-white">
            SM
          </div>

          <div>
            <h1 className="text-sm font-bold text-slate-900">
              SMLNEXGEN
            </h1>
            <p className="text-[10px] text-slate-500">
              Microfinance Portal
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-xl text-slate-700 transition hover:bg-slate-100"
        >
          {mobileOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden min-h-screen w-64 shrink-0 flex-col border-r border-slate-700/50 bg-[#101c35] text-white md:sticky md:top-0 md:flex md:h-screen">
        {sidebarContent}
      </aside>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={closeMobileMenu}
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm md:hidden"
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={`fixed bottom-0 left-0 top-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-slate-700/50 bg-[#101c35] text-white shadow-2xl transition-transform duration-300 md:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
};

export default Sidebar;
