
const menu = [
  { id: "dashboard", label: "Dashboard", icon: "▦" },
  { id: "plans", label: "Group Loan Plans", icon: "▤" },
  { id: "groups", label: "Manage Groups", icon: "♧" },
  { id: "members", label: "Group Members", icon: "♙" },
  { id: "reports", label: "Reports", icon: "▥" },
];

export default function GroupLoanSidebar({ active, onChange }) {
  return (
    <aside className="flex w-full shrink-0 flex-col bg-slate-950 text-white md:min-h-screen md:w-64">
      <div className="border-b border-slate-800 px-6 py-6">
        <div className="text-xl font-bold tracking-wide">
          SMLNEXGEN
        </div>
        <p className="mt-1 text-xs text-slate-400">
          Microfinance Management
        </p>
      </div>

      <nav className="flex gap-2 overflow-x-auto p-3 md:flex-col">
        {menu.map((item) => (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            className={`flex shrink-0 items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition ${
              active === item.id
                ? "bg-blue-600 text-white shadow-lg shadow-blue-950/40"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <span className="text-lg">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <div className="mt-auto hidden border-t border-slate-800 p-5 md:block">
        <p className="text-sm font-medium">Admin Panel</p>
        <p className="mt-1 text-xs text-slate-400">
          Group Loan Management
        </p>
      </div>
    </aside>
  );
}
