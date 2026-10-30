
import { useAuth } from "../context/AuthContext";

const summaryCards = [
  {
    title: "Today's Due",
    value: "₹1,28,450",
    subtitle: "18 customers",
    icon: "▦",
    color: "blue",
    trend: "↘",
  },
  {
    title: "Collected Today",
    value: "₹98,750",
    subtitle: "76.9% of target",
    icon: "₹",
    color: "green",
    trend: "↗",
  },
  {
    title: "Overdue Amount",
    value: "₹72,300",
    subtitle: "12 customers",
    icon: "!",
    color: "orange",
    trend: "↘",
  },
  {
    title: "Pending Approvals",
    value: "02",
    subtitle: "Requests to review",
    icon: "◷",
    color: "purple",
    trend: "",
  },
  {
    title: "Disbursed Today",
    value: "₹2,50,000",
    subtitle: "5 loans",
    icon: "♧",
    color: "cyan",
    trend: "↗",
  },
];

const quickActions = [
  {
    title: "Add Customer",
    description: "Register a new customer",
    icon: "♙",
    color: "blue",
    href: "/customers",
  },
  {
    title: "New Loan",
    description: "Create a loan application",
    icon: "₹",
    color: "green",
    href: "/loans",
  },
  {
    title: "Record Collection",
    description: "Enter a repayment",
    icon: "▣",
    color: "purple",
    href: "/collections",
  },
  {
    title: "FD & RD Account",
    description: "Manage deposit accounts",
    icon: "▤",
    color: "orange",
    href: "/fd-rd",
  },
];

const pendingItems = [
  {
    title: "Loan applications",
    description: "Applications waiting for review",
    count: "02",
    color: "bg-purple-50 text-purple-700",
  },
  {
    title: "Collection verification",
    description: "Collections pending confirmation",
    count: "05",
    color: "bg-orange-50 text-orange-700",
  },
  {
    title: "Customer KYC",
    description: "Customer documents to verify",
    count: "03",
    color: "bg-blue-50 text-blue-700",
  },
];

const recentActivities = [
  {
    title: "Daily collection",
    description: "Collection entry recorded",
    amount: "₹5,000",
    icon: "₹",
    color: "bg-emerald-50 text-emerald-700",
  },
  {
    title: "New customer",
    description: "Customer registration activity",
    amount: "Customer",
    icon: "♙",
    color: "bg-blue-50 text-blue-700",
  },
  {
    title: "Loan application",
    description: "Loan application submitted",
    amount: "Review",
    icon: "▤",
    color: "bg-violet-50 text-violet-700",
  },
];

const rolePermissions = {
  SUPER_ADMIN: {
    label: "Super Administrator",
    description:
      "Manage customers, loans, collections, deposits, finance and user access.",
  },
  RD_FD_ADMIN: {
    label: "RD & FD Administrator",
    description:
      "Manage recurring deposits, fixed deposits and related customer accounts.",
  },
  GROUP_LOAN_ADMIN: {
    label: "Group Loan Administrator",
    description:
      "Manage group loan operations, repayment tracking and collections.",
  },
  BRANCH_MANAGER: {
    label: "Branch Manager",
    description:
      "Monitor branch operations, customer accounts, loan activity and collections.",
  },
};

const colorStyles = {
  blue: {
    icon: "bg-blue-50 text-blue-600",
    hover: "group-hover:bg-blue-100",
  },
  green: {
    icon: "bg-emerald-50 text-emerald-600",
    hover: "group-hover:bg-emerald-100",
  },
  orange: {
    icon: "bg-orange-50 text-orange-600",
    hover: "group-hover:bg-orange-100",
  },
  purple: {
    icon: "bg-violet-50 text-violet-600",
    hover: "group-hover:bg-violet-100",
  },
  cyan: {
    icon: "bg-cyan-50 text-cyan-600",
    hover: "group-hover:bg-cyan-100",
  },
};

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function SummaryCard({ card }) {
  const theme = colorStyles[card.color];

  return (
    <div className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium leading-5 text-slate-500 sm:text-sm">
          {card.title}
        </p>

        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg font-bold ${theme.icon} ${theme.hover}`}
        >
          {card.icon}
        </div>
      </div>

      <p className="mt-5 break-words text-2xl font-extrabold tracking-tight text-[#17365D] sm:text-[26px]">
        {card.value}
      </p>

      <div className="mt-3 flex items-center justify-between gap-2">
        <p className="text-xs text-slate-400">{card.subtitle}</p>

        {card.trend && (
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-lg text-sm font-bold ${
              card.color === "orange"
                ? "bg-orange-50 text-orange-600"
                : "bg-emerald-50 text-emerald-600"
            }`}
          >
            {card.trend}
          </span>
        )}
      </div>
    </div>
  );
}

function Dashboard() {
  const { user } = useAuth();

  const role = user?.profile?.role || user?.role || "USER";

  const firstName =
    user?.first_name ||
    user?.profile?.first_name ||
    user?.username ||
    "User";

  const roleInfo = rolePermissions[role] || {
    label: String(role)
      .replaceAll("_", " ")
      .toLowerCase()
      .replace(/\b\w/g, (letter) => letter.toUpperCase()),
    description:
      "Your dashboard provides an overview of the features available to your account.",
  };

  const initials = String(firstName)
    .trim()
    .slice(0, 2)
    .toUpperCase();

  function navigateTo(path) {
    // Uses the application's existing browser routes.
    window.location.href = path;
  }

  function exportReport() {
    const rows = [
      ["Metric", "Value"],
      ...summaryCards.map((card) => [card.title, card.value]),
    ];

    const csv = rows
      .map((row) =>
        row
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(",")
      )
      .join("\r\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "smlnexgen-dashboard-summary.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-[#F4F7FC] text-slate-800">
      {/* Top navigation */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="flex min-h-[76px] items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="min-w-0">
            <p className="text-xs text-slate-400">Workspace</p>
            <h1 className="mt-1 truncate text-sm font-bold text-slate-800 sm:text-base">
              Dashboard
            </h1>
          </div>

          <div className="flex items-center gap-3 sm:gap-5">
            <label className="hidden min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 md:flex md:w-64 lg:w-80">
              <span className="text-lg text-slate-400">⌕</span>
              <input
                type="search"
                placeholder="Search customers, loans..."
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
                onKeyDown={(event) => {
                  if (event.key === "Enter" && event.currentTarget.value.trim()) {
                    navigateTo(
                      `/customers?search=${encodeURIComponent(
                        event.currentTarget.value.trim()
                      )}`
                    );
                  }
                }}
              />
            </label>

            <button
              type="button"
              aria-label="Notifications"
              onClick={() => navigateTo("/notifications")}
              className="relative flex h-10 w-10 items-center justify-center rounded-xl text-xl text-slate-500 hover:bg-slate-100"
            >
              ♧
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
            </button>

            <div className="hidden h-9 border-l border-slate-200 sm:block" />

            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F2D6BF] text-sm font-bold text-[#825237]">
                {initials}
              </div>

              <div className="hidden min-w-0 sm:block">
                <p className="max-w-36 truncate text-sm font-bold text-slate-800">
                  {firstName}
                </p>
                <p className="max-w-40 truncate text-xs text-slate-400">
                  {roleInfo.label}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Dashboard content */}
      <main className="mx-auto max-w-[1800px] space-y-6 p-4 sm:p-6 lg:space-y-7 lg:p-8">
        {/* Heading and actions */}
        <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#7890B1]">
              {new Date().toLocaleDateString("en-IN", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>

            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-[#17365D] sm:text-4xl">
              Dashboard
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Here&apos;s what&apos;s happening with your business today.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={exportReport}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
            >
              <span className="text-lg">⇩</span>
              Export report
            </button>

            <button
              type="button"
              onClick={() => navigateTo("/loans")}
              className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              <span className="text-xl leading-none">+</span>
              New application
            </button>
          </div>
        </section>

        {/* Welcome banner */}
        <section className="relative isolate overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-r from-[#EEF5FF] via-[#E5F0FF] to-[#D8E9FF] px-6 py-7 sm:px-9 sm:py-8">
          <div className="relative z-10 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 ring-4 ring-emerald-100" />
              <span className="text-xs font-extrabold uppercase tracking-widest text-[#3972B8]">
                Daily overview
              </span>
            </div>

            <h2 className="mt-5 text-2xl font-extrabold tracking-tight text-[#17365D] sm:text-3xl">
              {getGreeting()}, {firstName} <span className="text-amber-500">✦</span>
            </h2>

            <p className="mt-2 text-sm text-[#6582A8] sm:text-base">
              Small steps today. Big financial dreams tomorrow.
            </p>

            <button
              type="button"
              onClick={() => navigateTo("/finance")}
              className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-800"
            >
              View business insights <span className="text-lg">↗</span>
            </button>
          </div>

          <div className="pointer-events-none absolute -right-8 -top-12 h-64 w-64 rounded-full bg-blue-300/20 blur-3xl" />

          <div className="pointer-events-none absolute bottom-0 right-8 hidden h-40 w-64 items-center justify-center sm:flex lg:right-16">
            <div className="relative flex h-24 w-24 rotate-[-8deg] items-center justify-center rounded-[26px] bg-blue-600 text-5xl text-white shadow-xl shadow-blue-300/60">
              ♜
            </div>
            <div className="absolute bottom-7 right-2 flex h-12 w-12 items-center justify-center rounded-full border-4 border-amber-200 bg-amber-300 text-xl font-bold text-amber-800 shadow-lg">
              ₹
            </div>
            <span className="absolute right-0 top-1 text-4xl text-teal-500">
              ✦
            </span>
            <span className="absolute left-2 top-5 text-3xl text-teal-400">
              ✧
            </span>
          </div>
        </section>

        {/* Summary cards */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
          {summaryCards.map((card) => (
            <SummaryCard key={card.title} card={card} />
          ))}
        </section>

        {/* Quick actions and approvals */}
        <section className="grid grid-cols-1 gap-5 xl:grid-cols-5">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6 xl:col-span-3">
            <div>
              <h2 className="text-lg font-extrabold text-[#17365D]">
                Quick actions
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Common tasks right at your fingertips
              </p>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {quickActions.map((action) => {
                const theme = colorStyles[action.color];

                return (
                  <button
                    key={action.title}
                    type="button"
                    onClick={() => navigateTo(action.href)}
                    className="group flex min-w-0 items-center gap-4 rounded-xl border border-slate-100 p-4 text-left transition hover:border-blue-200 hover:bg-blue-50/40"
                  >
                    <span
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl font-bold ${theme.icon} ${theme.hover}`}
                    >
                      {action.icon}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold text-slate-700">
                        {action.title}
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-slate-400">
                        {action.description}
                      </span>
                    </span>

                    <span className="text-lg text-slate-300 transition group-hover:translate-x-1 group-hover:text-blue-600">
                      →
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pending approvals */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6 xl:col-span-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-extrabold text-[#17365D]">
                  Pending approvals
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Items that may need your attention
                </p>
              </div>

              <button
                type="button"
                onClick={() => navigateTo("/loans")}
                className="shrink-0 text-xs font-bold text-blue-600 hover:text-blue-800"
              >
                View all ↗
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {pendingItems.map((item) => (
                <div
                  key={item.title}
                  className="flex items-center gap-3 rounded-xl border border-slate-100 p-3.5"
                >
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold ${item.color}`}
                  >
                    {item.count}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-700">
                      {item.title}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-400">
                      {item.description}
                    </p>
                  </div>

                  <span className="text-slate-300">›</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Recent activity and role */}
        <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6 xl:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-extrabold text-[#17365D]">
                  Recent activity
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Latest activity overview
                </p>
              </div>

              <button
                type="button"
                onClick={() => navigateTo("/collections")}
                className="text-xs font-bold text-blue-600 hover:text-blue-800"
              >
                View records ↗
              </button>
            </div>

            <div className="mt-5 divide-y divide-slate-100">
              {recentActivities.map((activity) => (
                <div
                  key={activity.title}
                  className="flex items-center gap-3 py-4 first:pt-0 last:pb-0"
                >
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg font-bold ${activity.color}`}
                  >
                    {activity.icon}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-700">
                      {activity.title}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {activity.description}
                    </p>
                  </div>

                  <span className="shrink-0 text-xs font-bold text-slate-600">
                    {activity.amount}
                  </span>
                </div>
              ))}
            </div>

            <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
              Sample activity only. Connect your backend to display actual records.
            </p>
          </div>

          {/* Role information */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-xl text-blue-700">
              ♙
            </div>

            <h2 className="mt-4 text-lg font-extrabold text-[#17365D]">
              Your workspace
            </h2>

            <p className="mt-1 text-sm font-semibold text-blue-700">
              {roleInfo.label}
            </p>

            <p className="mt-3 text-sm leading-6 text-slate-500">
              {roleInfo.description}
            </p>

            <div className="mt-5 rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Signed in as
              </p>
              <p className="mt-2 break-words text-sm font-bold text-slate-700">
                {user?.username || firstName}
              </p>
              <p className="mt-1 break-words text-xs text-slate-400">
                {role}
              </p>
            </div>
          </div>
        </section>

        <footer className="pb-2 text-center text-xs text-slate-400">
          SMLNEXGEN · Microfinance Management System
        </footer>
      </main>
    </div>
  );
}

export default Dashboard;
