import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";

// --------------------------------------------------
// API CONFIGURATION
// --------------------------------------------------

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

const getToken = () =>
  localStorage.getItem("access") ||
  localStorage.getItem("access_token") ||
  localStorage.getItem("token") ||
  localStorage.getItem("authToken");

async function apiRequest(endpoint) {
  const token = getToken();

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    throw new Error(`${endpoint} - ${response.status}`);
  }

  return response.json();
}

// --------------------------------------------------
// HELPERS
// --------------------------------------------------

function getList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.payments)) return data.payments;
  if (Array.isArray(data?.applications)) return data.applications;
  return [];
}

function getAmount(value) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

function formatINR(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(getAmount(value));
}

function isToday(value) {
  if (!value) return false;

  const date = new Date(value);
  const today = new Date();

  return (
    !Number.isNaN(date.getTime()) &&
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

function formatDate(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getCustomerName(item) {
  return (
    item.customer_name ||
    item.customer?.full_name ||
    [item.customer?.first_name, item.customer?.last_name]
      .filter(Boolean)
      .join(" ") ||
    item.group_name ||
    "Customer"
  );
}

function getStatus(item) {
  return String(item.status || "").toLowerCase();
}

// --------------------------------------------------
// COLOR STYLES
// --------------------------------------------------

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

// --------------------------------------------------
// SUMMARY CARD
// --------------------------------------------------

function SummaryCard({ card, loading }) {
  const theme = colorStyles[card.color];

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-900/5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-slate-500 sm:text-sm">
            {card.title}
          </p>

          {loading ? (
            <div className="mt-4 h-8 w-32 animate-pulse rounded-lg bg-slate-100" />
          ) : (
            <p className="mt-4 break-words text-2xl font-extrabold tracking-tight text-[#17365D] sm:text-[27px]">
              {card.value}
            </p>
          )}
        </div>

        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg font-bold transition-colors sm:h-11 sm:w-11 sm:text-xl ${theme.icon} ${theme.hover}`}
        >
          {card.icon}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
        <p className="text-xs font-medium text-slate-400">
          {loading ? "Loading..." : card.subtitle}
        </p>
      </div>

      <div className="absolute -bottom-8 -right-8 h-20 w-20 rounded-full bg-blue-50/60 opacity-0 blur-2xl transition-opacity group-hover:opacity-100" />
    </div>
  );
}

// --------------------------------------------------
// SECTION HEADING
// --------------------------------------------------

function SectionHeading({ title, description, action }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-2 sm:gap-3">
      <div className="min-w-0">
        <h2 className="text-base font-extrabold tracking-tight text-[#17365D] sm:text-lg">
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

// --------------------------------------------------
// MAIN DASHBOARD
// --------------------------------------------------

function Dashboard() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [dashboardData, setDashboardData] = useState({
    todayDue: 0,
    collectedToday: 0,
    overdueAmount: 0,
    pendingApprovals: 0,
    disbursedToday: 0,
    dueCustomers: 0,
    overdueCustomers: 0,
    collectionCount: 0,
    disbursedCount: 0,
    payments: [],
    applications: [],
    customerLoans: [],
  });

  // ------------------------------------------------
  // USER INFORMATION
  // ------------------------------------------------

  const role = user?.profile?.role || user?.role || "USER";

  const firstName =
    user?.first_name ||
    user?.profile?.first_name ||
    user?.username ||
    "User";

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

  const roleInfo = rolePermissions[role] || {
    label: String(role)
      .replaceAll("_", " ")
      .toLowerCase()
      .replace(/\b\w/g, (letter) => letter.toUpperCase()),
    description:
      "Your dashboard provides an overview of the features available to your account.",
  };

  const initials = String(firstName).trim().slice(0, 2).toUpperCase();

  // ------------------------------------------------
  // LOAD DASHBOARD DATA
  // ------------------------------------------------

  const loadDashboard = useCallback(async (showRefresh = false) => {
    if (showRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    const endpoints = [
      apiRequest("/api/collection/dashboard/"),
      apiRequest("/api/collection/today-dues/"),
      apiRequest("/api/collection/overdue/"),
      apiRequest("/api/collection/payments/"),
      apiRequest("/api/group-loan/applications/"),
    ];

    const results = await Promise.allSettled(endpoints);

    const [collectionDashboard, todayDues, overdue, payments, applications] =
      results.map((result) =>
        result.status === "fulfilled" ? result.value : null
      );

    const hasAnyData = results.some((result) => result.status === "fulfilled");

    if (!hasAnyData) {
      setError(
        "Unable to load dashboard data. Please check your backend server and API endpoints."
      );
    }

    const dueList = getList(todayDues);
    const overdueList = getList(overdue);
    const paymentList = getList(payments);
    const applicationList = getList(applications);

    const todayPayments = paymentList.filter((payment) =>
      isToday(payment.payment_date || payment.created_at || payment.date)
    );

    const collectedToday = collectionDashboard
      ? getAmount(collectionDashboard.today_collected_amount)
      : todayPayments.reduce(
          (sum, payment) =>
            sum + getAmount(payment.amount || payment.total_amount),
          0
        );

    const todayDue = collectionDashboard
      ? getAmount(collectionDashboard.today_due_amount)
      : dueList.reduce(
          (sum, item) => sum + getAmount(item.balance_due ?? item.total_due),
          0
        );

    const overdueAmount = collectionDashboard
      ? getAmount(collectionDashboard.overdue_amount)
      : overdueList.reduce(
          (sum, item) => sum + getAmount(item.balance_due ?? item.total_due),
          0
        );

    const pendingApplications = applicationList.filter((item) =>
      ["submitted", "pending", "pending_approval", "under_review"].includes(
        getStatus(item)
      )
    );

    const disbursedApplications = applicationList.filter(
      (item) =>
        getStatus(item) === "disbursed" &&
        isToday(item.disbursed_at || item.disbursement_date)
    );

    const disbursedToday = disbursedApplications.reduce(
      (sum, item) =>
        sum +
        getAmount(
          item.approved_total || item.approved_amount || item.disbursed_amount
        ),
      0
    );

    setDashboardData({
      todayDue,
      collectedToday,
      overdueAmount,
      pendingApprovals: pendingApplications.length,
      disbursedToday,
      dueCustomers: collectionDashboard?.today_due_count ?? dueList.length,
      overdueCustomers:
        collectionDashboard?.overdue_count ?? overdueList.length,
      collectionCount:
        collectionDashboard?.today_collection_count ?? todayPayments.length,
      disbursedCount: disbursedApplications.length,
      payments: paymentList,
      applications: applicationList,
      customerLoans: [],
    });

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // ------------------------------------------------
  // SUMMARY CARDS
  // ------------------------------------------------

  const summaryCards = [
    {
      title: "Today's Due",
      value: formatINR(dashboardData.todayDue),
      subtitle: `${dashboardData.dueCustomers} customers`,
      icon: "▦",
      color: "blue",
    },
    {
      title: "Collected Today",
      value: formatINR(dashboardData.collectedToday),
      subtitle: `${dashboardData.collectionCount} collections`,
      icon: "₹",
      color: "green",
    },
    {
      title: "Overdue Amount",
      value: formatINR(dashboardData.overdueAmount),
      subtitle: `${dashboardData.overdueCustomers} customers`,
      icon: "!",
      color: "orange",
    },
    {
      title: "Pending Approvals",
      value: String(dashboardData.pendingApprovals).padStart(2, "0"),
      subtitle: "Applications to review",
      icon: "◷",
      color: "purple",
    },
    {
      title: "Disbursed Today",
      value: formatINR(dashboardData.disbursedToday),
      subtitle: `${dashboardData.disbursedCount} loans`,
      icon: "♧",
      color: "cyan",
    },
  ];

  // ------------------------------------------------
  // QUICK ACTIONS
  // ------------------------------------------------

  const quickActions = [
    {
      title: "Add Customer",
      description: "Register a new customer",
      icon: "♙",
      color: "blue",
      href: "/customers",
    },
    {
      title: "Group Loans",
      description: "Manage loan applications",
      icon: "₹",
      color: "green",
      href: "/group-loans",
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
      href: "/fd",
    },
  ];

  // ------------------------------------------------
  // PENDING ITEMS
  // ------------------------------------------------

  const pendingItems = [
    {
      title: "Loan applications",
      description: "Applications waiting for review",
      count: dashboardData.pendingApprovals,
      color: "bg-purple-50 text-purple-700",
      href: "/group-loans",
    },
    {
      title: "Collection records",
      description: "Collections recorded today",
      count: dashboardData.collectionCount,
      color: "bg-orange-50 text-orange-700",
      href: "/collections",
    },
    {
      title: "Customer KYC",
      description: "Customer documents to verify",
      count: "View",
      color: "bg-blue-50 text-blue-700",
      href: "/kyc-verification",
    },
  ];

  // ------------------------------------------------
  // RECENT ACTIVITIES
  // ------------------------------------------------

  const recentActivities = [
    ...dashboardData.payments.map((payment) => ({
      title: "Loan collection",
      description: `${getCustomerName(payment)} · ${
        payment.payment_method || "Payment"
      }`,
      amount: formatINR(payment.amount || payment.total_amount),
      icon: "₹",
      color: "bg-emerald-50 text-emerald-700",
      date: payment.payment_date || payment.created_at,
    })),
    ...dashboardData.applications.map((application) => ({
      title: "Loan application",
      description: `${
        application.group_name || application.customer_name || "Group loan"
      } · ${application.status || "Submitted"}`,
      amount: application.approved_total
        ? formatINR(application.approved_total)
        : "Application",
      icon: "▤",
      color: "bg-violet-50 text-violet-700",
      date: application.submitted_at || application.created_at,
    })),
  ]
    .sort(
      (a, b) =>
        new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()
    )
    .slice(0, 5);

  // ------------------------------------------------
  // NAVIGATION
  // ------------------------------------------------

  function navigateTo(path) {
    window.location.href = path;
  }

  // ------------------------------------------------
  // EXPORT CSV
  // ------------------------------------------------

  function exportReport() {
    const rows = [
      ["Metric", "Value"],
      ...summaryCards.map((card) => [card.title, card.value]),
    ];

    const csv = rows
      .map((row) =>
        row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")
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

  // ------------------------------------------------
  // UI
  // ------------------------------------------------

  return (
    <div className="min-h-screen bg-[#F4F7FC] text-slate-800 lg:flex lg:h-screen lg:flex-col lg:overflow-hidden">
      {/* HEADER — only on desktop (lg+). Hidden on mobile & tablet */}
      <header className="sticky top-0 z-30 hidden shrink-0 border-b border-slate-200/80 bg-white/95 shadow-sm backdrop-blur-md lg:block">
        <div className="mx-auto flex min-h-[72px] max-w-[1800px] items-center justify-between gap-3 px-8 py-3">
          {/* Brand */}
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-[#17365D] text-lg font-extrabold text-white shadow-md">
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

          {/* Actions */}
          <div className="flex shrink-0 items-center gap-3">
            <button
              type="button"
              aria-label="Notifications"
              onClick={() => navigateTo("/notifications")}
              className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl text-slate-500 transition hover:bg-blue-50 hover:text-blue-700"
            >
              ♧
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
            </button>

            <div className="h-8 border-l border-slate-200" />

            <div className="flex shrink-0 items-center gap-2.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-[#F2D6BF] to-[#E9BFA0] text-sm font-extrabold text-[#825237] shadow-sm ring-1 ring-slate-200">
                {initials}
              </div>
              <div className="min-w-0">
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

      {/* MAIN CONTENT — only this part scrolls on desktop */}
      <main className="mx-auto w-full max-w-[1800px] flex-1 space-y-6 overflow-y-auto p-4 sm:p-6 lg:min-h-0 lg:space-y-7 lg:p-8">
        {/* PAGE TITLE */}
        <section className="mt-12 flex flex-col justify-between gap-4 sm:mt-8 sm:flex-row sm:items-center">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#7890B1]">
              {new Date().toLocaleDateString("en-IN", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
            <h1 className="mt-1.5 text-2xl font-extrabold tracking-tight text-[#17365D] sm:mt-2 sm:text-3xl lg:text-4xl">
              Dashboard
            </h1>
            <p className="mt-1.5 text-sm text-slate-500 sm:mt-2">
              Here's what's happening with your business today.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={exportReport}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
            >
              <span className="text-base sm:text-lg">⇩</span>
              <span>Export</span>
            </button>

            <button
              type="button"
              onClick={() => navigateTo("/group-loans")}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 text-sm font-bold text-white shadow-md transition hover:-translate-y-0.5 hover:from-blue-700 hover:to-blue-800"
            >
              <span className="text-xl">+</span>
              New application
            </button>

            <button
              type="button"
              onClick={() => loadDashboard(true)}
              disabled={refreshing}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm font-bold text-blue-700 transition hover:bg-blue-50 disabled:opacity-50"
            >
              <span className={refreshing ? "animate-spin" : ""}>↻</span>
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </section>

        {/* WELCOME BANNER */}
        <section className="relative isolate overflow-hidden rounded-xl border border-blue-100 bg-gradient-to-r from-[#EEF5FF] via-[#E5F0FF] to-[#D8E9FF] px-4 py-4 shadow-sm sm:px-6 sm:py-5">
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-white/70 px-2.5 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 ring-2 ring-emerald-100" />
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#3972B8]">
                Daily overview
              </span>
            </div>

            <h2 className="mt-2.5 text-lg font-extrabold tracking-tight text-[#17365D] sm:mt-3 sm:text-xl lg:text-2xl">
              {getGreeting()}, {firstName}{" "}
              <span className="text-amber-500">✦</span>
            </h2>

            <p className="mt-1.5 max-w-lg text-xs leading-5 text-[#6582A8] sm:text-sm">
              Small steps today. Big financial dreams tomorrow.
            </p>

            <button
              type="button"
              onClick={() => navigateTo("/reports")}
              className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-white/70 px-2.5 py-1.5 text-xs font-extrabold text-blue-700 transition hover:bg-white hover:text-blue-900 sm:text-sm"
            >
              View business insights
              <span className="text-base">↗</span>
            </button>
          </div>

          <div className="pointer-events-none absolute -right-6 -top-8 h-40 w-40 rounded-full bg-blue-300/30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-10 right-16 h-32 w-32 rounded-full bg-cyan-300/20 blur-3xl" />

          <div className="pointer-events-none absolute bottom-0 right-4 hidden h-28 w-44 items-center justify-center sm:flex lg:right-10">
            <div className="flex h-16 w-16 rotate-[-8deg] items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-800 text-3xl text-white shadow-xl">
              ♜
            </div>
            <div className="absolute bottom-5 right-1 flex h-9 w-9 items-center justify-center rounded-full border-2 border-amber-200 bg-amber-300 text-base font-extrabold text-amber-800 shadow-lg">
              ₹
            </div>
          </div>
        </section>

        {/* ERROR MESSAGE */}
        {error && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => loadDashboard()}
              className="font-bold underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* BUSINESS OVERVIEW */}
        <section>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-extrabold text-[#17365D] sm:text-lg">
                Business overview
              </h2>
              <p className="mt-1 text-xs text-slate-400 sm:text-sm">
                Live financial indicators for today
              </p>
            </div>
            <span className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Today
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
            {summaryCards.map((card) => (
              <SummaryCard key={card.title} card={card} loading={loading} />
            ))}
          </div>
        </section>

        {/* QUICK ACTIONS + PENDING APPROVALS */}
        <section className="grid grid-cols-1 gap-5 xl:grid-cols-5">
          {/* QUICK ACTIONS */}
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
                    className={`group flex min-w-0 items-center gap-4 rounded-xl border border-slate-100 bg-white p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-sm ${theme.border}`}
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

                    <span className="text-base text-slate-300 transition group-hover:translate-x-1 group-hover:text-blue-600 sm:text-lg">
                      →
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* PENDING APPROVALS */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md sm:p-6 xl:col-span-2">
            <SectionHeading
              title="Pending approvals"
              description="Items that may need your attention"
              action={
                <button
                  type="button"
                  onClick={() => navigateTo("/group-loans")}
                  className="shrink-0 rounded-lg px-2 py-1 text-xs font-extrabold text-blue-600 transition hover:bg-blue-50"
                >
                  View all ↗
                </button>
              }
            />

            <div className="mt-5 space-y-3">
              {pendingItems.map((item) => (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => navigateTo(item.href)}
                  className="flex w-full items-center gap-3 rounded-xl border border-slate-100 bg-white p-3.5 text-left transition hover:border-blue-100 hover:bg-slate-50/70"
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
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* RECENT ACTIVITIES + WORKSPACE */}
        <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          {/* RECENT ACTIVITIES */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md sm:p-6 xl:col-span-2">
            <SectionHeading
              title="Recent activity"
              description="Latest loan and collection records"
              action={
                <button
                  type="button"
                  onClick={() => navigateTo("/collections")}
                  className="rounded-lg px-2 py-1 text-xs font-extrabold text-blue-600 transition hover:bg-blue-50"
                >
                  View records ↗
                </button>
              }
            />

            <div className="mt-5 divide-y divide-slate-100">
              {loading ? (
                <div className="py-8 text-center text-sm text-slate-400">
                  Loading activities...
                </div>
              ) : recentActivities.length === 0 ? (
                <div className="py-8 text-center">
                  <div className="text-3xl text-slate-300">▤</div>
                  <p className="mt-2 text-sm font-semibold text-slate-500">
                    No recent activities found
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    New loan and collection records will appear here.
                  </p>
                </div>
              ) : (
                recentActivities.map((activity, index) => (
                  <div
                    key={`${activity.title}-${index}`}
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
                      <p className="mt-1 truncate text-xs text-slate-400">
                        {activity.description}
                      </p>
                      <p className="mt-1 text-[10px] text-slate-400">
                        {formatDate(activity.date)}
                      </p>
                    </div>

                    <span className="shrink-0 text-xs font-extrabold text-slate-600">
                      {activity.amount}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ROLE INFORMATION */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md sm:p-6">
            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-blue-50 blur-2xl" />

            <div className="relative">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-xl text-blue-700">
                ♙
              </div>

              <h2 className="mt-3 text-base font-extrabold text-[#17365D] sm:mt-4 sm:text-lg">
                Your workspace
              </h2>

              <span className="mt-2 inline-flex max-w-full rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-extrabold text-blue-700 sm:px-3 sm:py-1.5">
                {roleInfo.label}
              </span>

              <p className="mt-2.5 text-sm leading-6 text-slate-500 sm:mt-3">
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

        {/* FOOTER */}
        <footer className="border-t border-slate-200/70 pb-3 pt-5 text-center text-xs font-medium text-slate-400">
          SMLNEXGEN · Microfinance Management System
          <span className="mx-1.5 sm:mx-2">•</span>
          Secure workspace
        </footer>
      </main>
    </div>
  );
}

export default Dashboard;