import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import NotificationBell from "../components/NotificationBell";
import "./Sidebar.css";

const menuItems = [
  {
    title: "MAIN MENU",
    items: [
      {
        name: "Dashboard",
        path: "/dashboard",
        icon: "dashboard",
        roles: ["SUPER_ADMIN", "RD_FD_ADMIN", "GROUP_LOAN_ADMIN", "BRANCH_MANAGER"],
      },
    ],
  },
  {
    title: "FINANCIAL MANAGEMENT",
    items: [
      {
        name: "Recurring Deposit",
        path: "/rd",
        icon: "recurring",
        roles: ["SUPER_ADMIN", "RD_FD_ADMIN"],
      },
      {
        name: "Fixed Deposit",
        path: "/fd",
        icon: "fixed",
        roles: ["SUPER_ADMIN", "RD_FD_ADMIN"],
      },
      {
        name: "Group Loans",
        path: "/group-loans",
        icon: "groups",
        roles: ["SUPER_ADMIN", "GROUP_LOAN_ADMIN"],
      },
      {
        name: "Approved Loans",
        path: "/approved-loans",
        icon: "approved",
        roles: ["SUPER_ADMIN", "GROUP_LOAN_ADMIN"],
      },
      {
        name: "Collections",
        path: "/collections",
        icon: "collections",
        roles: ["SUPER_ADMIN", "GROUP_LOAN_ADMIN", "BRANCH_MANAGER"],
      },
    ],
  },
  {
    title: "CUSTOMER MANAGEMENT",
    items: [
      {
        name: "Customers",
        path: "/customers",
        icon: "customers",
        roles: ["SUPER_ADMIN", "GROUP_LOAN_ADMIN", "BRANCH_MANAGER"],
      },
    ],
  },
  {
    title: "ADMINISTRATION",
    items: [
      {
        name: "Reports",
        path: "/reports",
        icon: "reports",
        roles: ["SUPER_ADMIN", "BRANCH_MANAGER"],
      },
      {
        name: "User Management",
        path: "/users",
        icon: "users",
        roles: ["SUPER_ADMIN"],
      },
    ],
  },
];

const icons = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
    </>
  ),
  recurring: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
      <path d="M5 4 3 7M19 4l2 3" />
    </>
  ),
  fixed: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </>
  ),
  groups: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20v-2a6 6 0 0 1 12 0v2" />
      <path d="M16 5a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 4v2" />
    </>
  ),
  approved: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 3 3 5-6" />
    </>
  ),
  collections: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 10h18M7 15h4" />
    </>
  ),
  customers: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20v-2a6 6 0 0 1 12 0v2" />
      <path d="M17 8h4M19 6v4" />
    </>
  ),
  reports: (
    <>
      <path d="M4 19V5M4 19h17" />
      <path d="m7 15 4-4 3 2 6-7" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20v-2a6 6 0 0 1 12 0v2" />
      <path d="M17 8h4M19 6v4" />
    </>
  ),
};

function Icon({ name, size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
    >
      {icons[name]}
    </svg>
  );
}

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [mobileOpen, setMobileOpen] = useState(false);

  const role = (
    user?.role ||
    user?.user_type ||
    user?.user?.role ||
    ""
  ).toUpperCase();

  const visibleMenus = menuItems
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => item.roles.includes(role)),
    }))
    .filter((section) => section.items.length > 0);

  const handleLogout = async () => {
    try {
      if (logout) {
        await logout();
      }
    } finally {
      navigate("/login");
    }
  };

  const closeMobile = () => setMobileOpen(false);

  return (
    <>
      {/* Mobile Header */}
      <div className="fixed left-0 top-0 z-40 flex h-16.25 w-full items-center justify-between bg-[#071B4D] px-5 shadow-md md:hidden">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-lg font-bold text-[#0B3A91]">
            S
          </div>
          <span className="text-lg font-bold tracking-wide text-white">
            SMLNEXGEN
          </span>
        </div>

        <div className="flex items-center gap-1">
          <NotificationBell />
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="rounded-lg p-2 text-white hover:bg-white/10"
            aria-label="Toggle sidebar"
          >
            <svg
              width="25"
              height="25"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              {mobileOpen ? (
                <path d="M18 6 6 18M6 6l12 12" />
              ) : (
                <path d="M3 6h18M3 12h18M3 18h18" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          onClick={closeMobile}
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed left-0 top-0 z-50
          flex h-screen w-66.25 shrink-0 flex-col
          bg-linear-to-b from-[#0B2D72] to-[#071B4D]
          text-white shadow-xl
          transition-transform duration-300
          md:static md:translate-x-0
          ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        {/* Brand + Notification (Desktop) */}
        <div className="flex h-20.5 shrink-0 items-center justify-between gap-3 border-b border-white/10 px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-xl font-extrabold text-[#0B3A91] shadow-lg">
              S
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-extrabold tracking-wide text-white">
                SMLNEXGEN
              </h1>
              <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[2px] text-blue-200">
                Finance Management
              </p>
            </div>
          </div>

          {/* Desktop notification bell */}
          <div className="hidden shrink-0 md:block">
            <NotificationBell />
          </div>
        </div>

        {/* User Profile */}
        <div className="mx-4 mt-5 flex shrink-0 items-center gap-3 rounded-xl border border-white/10 bg-white/10 p-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-300/20 text-sm font-bold text-white">
            {(user?.first_name || user?.username || "A")
              .charAt(0)
              .toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">
              {user?.first_name
                ? `${user.first_name} ${user.last_name || ""}`
                : user?.username || "Administrator"}
            </p>
            <p className="mt-1 truncate text-[11px] text-blue-200">
              {role.replaceAll("_", " ") || "ADMIN"}
            </p>
          </div>
          <span className="h-2 w-2 rounded-full bg-green-400" />
        </div>

        {/* Navigation */}
        <nav className="sidebar-scroll mt-5 min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 pb-4">
          {visibleMenus.map((section) => (
            <div key={section.title} className="mb-6">
              <p className="mb-3 px-3 text-[10px] font-bold tracking-[1.7px] text-blue-300/70">
                {section.title}
              </p>
              <div className="space-y-1.5">
                {section.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={closeMobile}
                    className={({ isActive }) =>
                      `group flex items-center gap-3 rounded-xl px-3.5 py-3 text-[13px] font-medium transition-all duration-200 ${
                        isActive
                          ? "bg-white text-[#0B3A91] shadow-md"
                          : "text-blue-100 hover:bg-white/10 hover:text-white"
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon name={item.icon} size={19} />
                        <span className="flex-1">{item.name}</span>
                        {isActive && (
                          <span className="h-1.5 w-1.5 rounded-full bg-[#0B3A91]" />
                        )}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="shrink-0 border-t border-white/10 p-4">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium text-blue-100 transition hover:bg-red-500/15 hover:text-red-200"
          >
            <svg
              width="19"
              height="19"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10 17l5-5-5-5M15 12H3" />
              <path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" />
            </svg>
            <span>Logout</span>
          </button>
          <p className="mt-3 text-center text-[10px] text-blue-300/50">
            SMLNEXGEN © 2026
          </p>
        </div>
      </aside>
    </>
  );
}