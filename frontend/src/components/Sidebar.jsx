import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

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
      icon: "📅",
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
      icon: "🤝",
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
      icon: "👥",
      roles: ["SUPER_ADMIN"],
    },
  ];

  const filteredMenu = menuItems.filter((item) => item.roles.includes(role));

  return (
    <aside className="w-64 min-h-screen bg-slate-900 text-white flex flex-col border-r border-slate-700">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-slate-700">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-teal-400 flex items-center justify-center font-bold text-lg">
          MF
        </div>
        <div>
          <h1 className="font-bold text-lg leading-tight">MicroFinance</h1>
          <p className="text-xs text-slate-400">Admin Panel</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-1">
        {filteredMenu.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? "bg-gradient-to-r from-blue-600 to-teal-500 text-white shadow-lg shadow-blue-500/30"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`
            }
          >
            <span className="text-lg">{item.icon}</span>
            {item.name}
          </NavLink>
        ))}
      </nav>

      {/* User Info + Logout */}
      <div className="p-4 border-t border-slate-700">
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center font-semibold">
            {user?.username?.charAt(0).toUpperCase()}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-medium truncate">{user?.username}</p>
            <p className="text-xs text-slate-400 truncate">{role?.replaceAll("_", " ")}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all text-sm font-medium"
        >
          🚪 Logout
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;