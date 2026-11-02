
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
    border: "hover:border-blue-200",
  },
  green: {
    icon: "bg-emerald-50 text-emerald-600",
    hover: "group-hover:bg-emerald-100",
    border: "hover:border-emerald-200",
  },
  orange: {
    icon: "bg-orange-50 text-orange-600",
    hover: "group-hover:bg-orange-100",
    border: "hover:border-orange-200",
  },
  purple: {
    icon: "bg-violet-50 text-violet-600",
    hover: "group-hover:bg-violet-100",
    border: "hover:border-violet-200",
  },
  cyan: {
    icon: "bg-cyan-50 text-cyan-600",
    hover: "group-hover:bg-cyan-100",
    border: "hover:border-cyan-200",
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
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-900/5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-500 sm:text-sm">
            {card.title}
          </p>
          <p className="mt-4 break-words text-2xl font-extrabold tracking-tight text-[#17365D] sm:text-[27px]">
            {card.value}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl font-bold transition-colors ${theme.icon} ${theme.hover}`}
        >
          {card.icon}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
        <p className="text-xs font-medium text-slate-400">
          {card.subtitle}
        </p>

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

      <div className="absolute -bottom-8 -right-8 h-20 w-20 rounded-full bg-blue-50/60 opacity-0 blur-2xl transition-opacity group-hover:opacity-100" />
    </div>
  );
}

function SectionHeading({ title, description, action }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-lg font-extrabold tracking-tight text-[#17365D]">
          {title}
        </h2>
        <p className="mt-1 text-xs leading-5 text-slate-400 sm:text-sm">
          {description}
        </p>
      </div>
      {action}
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
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 shadow-sm backdrop-blur-md">
        <div className="mx-auto flex min-h-[72px] max-w-[1800px] items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-[#17365D] text-lg font-extrabold text-white shadow-md shadow-blue-900/15">
              S
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold tracking-wide text-[#17365D]">
                SMLNEXGEN
              </p>
              <p className="mt-0.5 text-[11px] font-medium text-slate-400">
                Microfinance workspace
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <label className="hidden min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 transition focus-within:border-blue-300 focus-within:bg-white md:flex md:w-60 lg:w-80">
              <span className="text-lg text-slate-400">⌕</span>
              <input
                type="search"
                placeholder="Search customers, loans..."
                aria-label="Search customers and loans"
                className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
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
              className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl text-slate-500 transition hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              ♧
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-white bg-red-500" />
            </button>

            <div className="hidden h-9 border-l border-slate-200 sm:block" />

            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-[#F2D6BF] to-[#E9BFA0] text-sm font-extrabold text-[#825237] shadow-sm ring-1 ring-slate-200">
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
            <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#7890B1]">
              {new Date().toLocaleDateString("en-IN", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>

            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#17365D] sm:text-4xl">
              Dashboard
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Here's what's happening with your business today.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={exportReport}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <span className="text-lg">⇩</span>
              Export report
            </button>

            <button
              type="button"
              onClick={() => navigateTo("/loans")}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 text-sm font-bold text-white shadow-md shadow-blue-600/20 transition hover:-translate-y-0.5 hover:from-blue-700 hover:to-blue-800 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              <span className="text-xl leading-none">+</span>
              New application
            </button>
          </div>
        </section>

        {/* Welcome banner */}
        <section className="relative isolate overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-r from-[#EEF5FF] via-[#E5F0FF] to-[#D8E9FF] px-5 py-7 shadow-sm sm:px-8 sm:py-9">
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white/70 px-3 py-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400 ring-4 ring-emerald-100" />
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#3972B8]">
                Daily overview
              </span>
            </div>

            <h2 className="mt-5 text-2xl font-extrabold tracking-tight text-[#17365D] sm:text-3xl">
              {getGreeting()}, {firstName}{" "}
              <span className="text-amber-500">✦</span>
            </h2>

            <p className="mt-2 max-w-lg text-sm leading-6 text-[#6582A8] sm:text-base">
              Small steps today. Big financial dreams tomorrow.
            </p>

            <button
              type="button"
              onClick={() => navigateTo("/finance")}
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-white/70 px-3 py-2 text-sm font-extrabold text-blue-700 transition hover:bg-white hover:text-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              View business insights <span className="text-lg">↗</span>
            </button>
          </div>

          <div className="pointer-events-none absolute -right-8 -top-12 h-64 w-64 rounded-full bg-blue-300/30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 right-20 h-48 w-48 rounded-full bg-cyan-300/20 blur-3xl" />

          <div className="pointer-events-none absolute bottom-0 right-8 hidden h-40 w-64 items-center justify-center sm:flex lg:right-16">
            <div className="relative flex h-24 w-24 rotate-[-8deg] items-center justify-center rounded-[26px] bg-gradient-to-br from-blue-500 to-blue-800 text-5xl text-white shadow-xl shadow-blue-300/60">
              ♜
            </div>
            <div className="absolute bottom-7 right-2 flex h-12 w-12 items-center justify-center rounded-full border-4 border-amber-200 bg-amber-300 text-xl font-extrabold text-amber-800 shadow-lg">
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
        <section>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold text-[#17365D]">
                Business overview
              </h2>
              <p className="mt-1 text-xs text-slate-400 sm:text-sm">
                Key financial indicators for today
              </p>
            </div>
            <span className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Today
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
            {summaryCards.map((card) => (
              <SummaryCard key={card.title} card={card} />
            ))}
          </div>
        </section>

        {/* Quick actions and approvals */}
        <section className="grid grid-cols-1 gap-5 xl:grid-cols-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md sm:p-6 xl:col-span-3">
            <SectionHeading
              title="Quick actions"
              description="Common tasks right at your fingertips"
            />

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {quickActions.map((action) => {
                const theme = colorStyles[action.color];

                return (
                  <button
                    key={action.title}
                    type="button"
                    onClick={() => navigateTo(action.href)}
                    className={`group flex min-w-0 items-center gap-4 rounded-xl border border-slate-100 bg-white p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${theme.border}`}
                  >
                    <span
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl font-bold transition-colors ${theme.icon} ${theme.hover}`}
                    >
                      {action.icon}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-extrabold text-slate-700">
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
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md sm:p-6 xl:col-span-2">
            <SectionHeading
              title="Pending approvals"
              description="Items that may need your attention"
              action={
                <button
                  type="button"
                  onClick={() => navigateTo("/loans")}
                  className="shrink-0 rounded-lg px-2 py-1 text-xs font-extrabold text-blue-600 transition hover:bg-blue-50 hover:text-blue-800"
                >
                  View all ↗
                </button>
              }
            />

            <div className="mt-5 space-y-3">
              {pendingItems.map((item) => (
                <div
                  key={item.title}
                  className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-3.5 transition hover:border-blue-100 hover:bg-slate-50/70"
                >
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold ${item.color}`}
                  >
                    {item.count}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-extrabold text-slate-700">
                      {item.title}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-400">
                      {item.description}
                    </p>
                  </div>

                  <span className="text-lg text-slate-300">›</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Recent activity and role */}
        <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md sm:p-6 xl:col-span-2">
            <SectionHeading
              title="Recent activity"
              description="Latest activity overview"
              action={
                <button
                  type="button"
                  onClick={() => navigateTo("/collections")}
                  className="rounded-lg px-2 py-1 text-xs font-extrabold text-blue-600 transition hover:bg-blue-50 hover:text-blue-800"
                >
                  View records ↗
                </button>
              }
            />

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
                    <p className="text-sm font-extrabold text-slate-700">
                      {activity.title}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {activity.description}
                    </p>
                  </div>

                  <span className="shrink-0 text-xs font-extrabold text-slate-600">
                    {activity.amount}
                  </span>
                </div>
              ))}
            </div>

            <p className="mt-5 flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50 px-3 py-3 text-xs leading-5 text-amber-800">
              <span className="mt-0.5">ⓘ</span>
              <span>
                Sample activity only. Connect your backend to display actual
                records.
              </span>
            </p>
          </div>

          {/* Role information */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md sm:p-6">
            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-blue-50 blur-2xl" />

            <div className="relative">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-xl text-blue-700">
                ♙
              </div>

              <h2 className="mt-4 text-lg font-extrabold text-[#17365D]">
                Your workspace
              </h2>

              <span className="mt-2 inline-flex max-w-full rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-extrabold text-blue-700">
                {roleInfo.label}
              </span>

              <p className="mt-3 text-sm leading-6 text-slate-500">
                {roleInfo.description}
              </p>

              <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                  Signed in as
                </p>
                <p className="mt-2 break-words text-sm font-extrabold text-slate-700">
                  {user?.username || firstName}
                </p>
                <p className="mt-1 break-words text-xs font-medium text-slate-400">
                  {role}
                </p>
              </div>
            </div>
          </div>
        </section>

        <footer className="border-t border-slate-200/70 pb-3 pt-5 text-center text-xs font-medium text-slate-400">
          SMLNEXGEN · Microfinance Management System
          <span className="mx-2">•</span>
          Secure workspace
        </footer>
      </main>
    </div>
  );
}

export default Dashboard;
