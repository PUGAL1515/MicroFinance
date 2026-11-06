import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";

// ==================================================
// API CONFIG
// ==================================================

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

const getToken = () =>
  localStorage.getItem("access") ||
  localStorage.getItem("access_token") ||
  localStorage.getItem("token") ||
  localStorage.getItem("authToken");

async function apiRequest(endpoint) {
  const token = getToken();

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
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

// ==================================================
// HELPERS
// ==================================================

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

function formatCompactINR(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    notation: "compact",
    maximumFractionDigits: 1,
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
  if (!value) return "Date unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Date unavailable";

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

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

// ==================================================
// SUMMARY CARD
// ==================================================

const summaryConfig = [
  {
    title: "Today's Collection",
    key: "collectedToday",
    subtitle: "Amount received today",
    icon: "₹",
    color: "emerald",
  },
  {
    title: "Today's Due",
    key: "todayDue",
    subtitle: "Amount scheduled today",
    icon: "▦",
    color: "blue",
  },
  {
    title: "Overdue Amount",
    key: "overdueAmount",
    subtitle: "Pending repayments",
    icon: "!",
    color: "orange",
  },
  {
    title: "Pending Approvals",
    key: "pendingApprovals",
    subtitle: "Applications to review",
    icon: "◷",
    color: "purple",
    isCount: true,
  },
  {
    title: "Disbursed Today",
    key: "disbursedToday",
    subtitle: "Loans disbursed today",
    icon: "₹",
    color: "cyan",
  },
];

const cardColors = {
  blue: "bg-blue-50 text-blue-700",
  emerald: "bg-emerald-50 text-emerald-700",
  orange: "bg-orange-50 text-orange-700",
  purple: "bg-violet-50 text-violet-700",
  cyan: "bg-cyan-50 text-cyan-700",
};

function SummaryCard({ config, value, loading }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-900/5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-500 sm:text-sm">
            {config.title}
          </p>

          {loading ? (
            <div className="mt-4 h-8 w-28 animate-pulse rounded-lg bg-slate-100" />
          ) : (
            <h3 className="mt-3 break-words text-xl font-extrabold tracking-tight text-[#17365D] sm:text-2xl">
              {config.isCount ? value : formatINR(value)}
            </h3>
          )}
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl font-bold ${cardColors[config.color]}`}
        >
          {config.icon}
        </div>
      </div>

      <div className="mt-4 border-t border-slate-100 pt-3">
        <p className="text-[11px] text-slate-400">{config.subtitle}</p>
      </div>
    </div>
  );
}

// ==================================================
// SECTION HEADING
// ==================================================

function SectionHeading({ title, subtitle, action }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="text-base font-extrabold text-[#17365D] sm:text-lg">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-1 text-xs text-slate-400 sm:text-sm">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}

// ==================================================
// COLLECTION PROGRESS
// ==================================================

function CollectionProgress({ collected, due, loading }) {
  const target = collected + due;
  const percentage =
    target > 0 ? Math.min(100, (collected / target) * 100) : 0;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <SectionHeading
        title="Today's collection performance"
        subtitle="Collection progress against today's scheduled dues"
        action={
          <span className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
            {loading ? "Loading" : `${percentage.toFixed(1)}% collected`}
          </span>
        }
      />

      <div className="mt-6 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-medium text-slate-400">Collected amount</p>
          <h3 className="mt-2 text-xl font-extrabold text-emerald-700">
            {loading ? "..." : formatINR(collected)}
          </h3>
        </div>

        <div className="text-right">
          <p className="text-xs font-medium text-slate-400">Remaining due</p>
          <h3 className="mt-2 text-xl font-extrabold text-orange-600">
            {loading ? "..." : formatINR(due)}
          </h3>
        </div>
      </div>

      <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-400 transition-all duration-700"
          style={{ width: `${loading ? 0 : percentage}%` }}
        />
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 text-xs text-slate-400">
        <span>Collection progress</span>
        <span className="font-bold text-slate-600">
          {loading ? "..." : `${percentage.toFixed(1)}%`}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-emerald-50 p-3">
          <p className="text-[11px] font-medium text-emerald-700">Received</p>
          <p className="mt-1 text-sm font-extrabold text-emerald-800">
            {loading ? "..." : formatCompactINR(collected)}
          </p>
        </div>

        <div className="rounded-xl bg-orange-50 p-3">
          <p className="text-[11px] font-medium text-orange-700">Pending</p>
          <p className="mt-1 text-sm font-extrabold text-orange-800">
            {loading ? "..." : formatCompactINR(due)}
          </p>
        </div>
      </div>

      <p className="mt-3 text-[10px] leading-4 text-slate-400">
        Progress is calculated using collected amount and remaining scheduled
        dues returned by the current APIs.
      </p>
    </div>
  );
}

// ==================================================
// WEEKLY COLLECTION CHART
// ==================================================

function CollectionChart({ payments, loading }) {
  const data = useMemo(() => {
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (6 - index));

      const amount = payments.reduce((sum, payment) => {
        const paymentDate = new Date(
          payment.payment_date || payment.created_at || payment.date
        );

        if (Number.isNaN(paymentDate.getTime())) return sum;

        const matches =
          paymentDate.getDate() === date.getDate() &&
          paymentDate.getMonth() === date.getMonth() &&
          paymentDate.getFullYear() === date.getFullYear();

        return matches
          ? sum + getAmount(payment.amount || payment.total_amount)
          : sum;
      }, 0);

      return {
        label: date.toLocaleDateString("en-IN", { weekday: "short" }),
        amount,
      };
    });
  }, [payments]);

  const maxValue = Math.max(...data.map((item) => item.amount), 1);
  const total = data.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <SectionHeading
        title="Collection analytics"
        subtitle="Daily collections for the last 7 days"
        action={
          <span className="rounded-lg bg-blue-50 px-3 py-1.5 text-[10px] font-bold text-blue-700">
            LAST 7 DAYS
          </span>
        }
      />

      <div className="mt-5">
        <p className="text-xs text-slate-400">Total collection</p>
        <h3 className="mt-1 text-2xl font-extrabold text-[#17365D]">
          {loading ? "Loading..." : formatINR(total)}
        </h3>
      </div>

      <div className="mt-6 flex h-48 items-end justify-between gap-2 border-b border-slate-100 px-1">
        {data.map((item, index) => {
          const height =
            item.amount > 0
              ? Math.max(7, (item.amount / maxValue) * 135)
              : 4;

          return (
            <div
              key={index}
              className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"
            >
              <div className="flex w-full flex-1 items-end justify-center">
                <div
                  title={`${item.label}: ${formatINR(item.amount)}`}
                  className={`w-full max-w-9 rounded-t-lg transition-all duration-500 ${
                    index === 6
                      ? "bg-blue-700"
                      : "bg-blue-400 hover:bg-blue-600"
                  }`}
                  style={{ height: loading ? "4px" : `${height}px` }}
                />
              </div>
              <span className="pb-2 text-[10px] font-semibold text-slate-400">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-sm bg-blue-600" />
        <span className="text-xs text-slate-500">Actual collections</span>
      </div>
    </div>
  );
}

// ==================================================
// LOAN APPLICATION OVERVIEW
// ==================================================

function LoanOverview({ applications, loading }) {
  const stats = useMemo(() => {
    const counts = {
      pending: 0,
      approved: 0,
      disbursed: 0,
      rejected: 0,
    };

    applications.forEach((item) => {
      const status = getStatus(item);

      if (
        ["submitted", "pending", "pending_approval", "under_review"].includes(
          status
        )
      ) {
        counts.pending++;
      } else if (["approved", "accepted"].includes(status)) {
        counts.approved++;
      } else if (status === "disbursed") {
        counts.disbursed++;
      } else if (status === "rejected") {
        counts.rejected++;
      }
    });

    return counts;
  }, [applications]);

  const rows = [
    {
      label: "Pending review",
      count: stats.pending,
      color: "bg-orange-500",
      text: "text-orange-700",
      bg: "bg-orange-50",
    },
    {
      label: "Approved",
      count: stats.approved,
      color: "bg-blue-500",
      text: "text-blue-700",
      bg: "bg-blue-50",
    },
    {
      label: "Disbursed",
      count: stats.disbursed,
      color: "bg-emerald-500",
      text: "text-emerald-700",
      bg: "bg-emerald-50",
    },
    {
      label: "Rejected",
      count: stats.rejected,
      color: "bg-red-500",
      text: "text-red-700",
      bg: "bg-red-50",
    },
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <SectionHeading
        title="Loan application overview"
        subtitle="Application status breakdown"
      />

      <div className="mt-6 space-y-5">
        {rows.map((item) => (
          <div key={item.label}>
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-600">
                {item.label}
              </span>
              <span
                className={`rounded-lg px-2.5 py-1 text-xs font-extrabold ${item.bg} ${item.text}`}
              >
                {loading ? "..." : item.count}
              </span>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${item.color}`}
                style={{
                  width: `${
                    !loading && applications.length
                      ? (item.count / applications.length) * 100
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-xl bg-slate-50 p-4">
        <p className="text-xs text-slate-400">Total applications received</p>
        <h3 className="mt-1 text-2xl font-extrabold text-[#17365D]">
          {loading ? "..." : applications.length}
        </h3>
      </div>

      <p className="mt-3 text-[10px] leading-4 text-slate-400">
        These counts represent loan applications returned by the applications
        API, not all active loan accounts.
      </p>
    </div>
  );
}

// ==================================================
// QUICK ACTIONS
// ==================================================

function QuickActions({ navigateTo }) {
  const actions = [
    {
      title: "Add Customer",
      description: "Register a new customer",
      icon: "♙",
      color: "bg-blue-50 text-blue-700",
      href: "/customers",
    },
    {
      title: "New Loan",
      description: "Create a loan application",
      icon: "▤",
      color: "bg-violet-50 text-violet-700",
      href: "/group-loans",
    },
    {
      title: "Record Collection",
      description: "Enter repayment details",
      icon: "₹",
      color: "bg-emerald-50 text-emerald-700",
      href: "/collections",
    },
    {
      title: "FD / RD Account",
      description: "Manage deposit accounts",
      icon: "▣",
      color: "bg-orange-50 text-orange-700",
      href: "/fd",
    },
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <SectionHeading
        title="Quick actions"
        subtitle="Frequently used operations"
      />

      <div className="mt-5 grid grid-cols-2 gap-3">
        {actions.map((action) => (
          <button
            key={action.title}
            type="button"
            onClick={() => navigateTo(action.href)}
            className="group rounded-xl border border-slate-100 p-3 text-left transition hover:-translate-y-1 hover:border-blue-200 hover:bg-slate-50 hover:shadow-sm sm:p-4"
          >
            <span
              className={`flex h-11 w-11 items-center justify-center rounded-xl text-xl font-bold ${action.color}`}
            >
              {action.icon}
            </span>

            <p className="mt-3 text-xs font-extrabold text-slate-700 sm:text-sm">
              {action.title}
            </p>

            <p className="mt-1 text-[10px] leading-4 text-slate-400">
              {action.description}
            </p>

            <span className="mt-2 block text-sm font-bold text-blue-600 transition group-hover:translate-x-1">
              →
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ==================================================
// RECENT ACTIVITIES
// ==================================================

function RecentActivities({ payments, applications, loading, navigateTo }) {
  const activities = useMemo(() => {
    const paymentActivities = payments.map((payment) => ({
      id: payment.id || payment._id,
      type: "Collection received",
      name: getCustomerName(payment),
      detail: payment.payment_method || "Payment",
      amount: getAmount(payment.amount || payment.total_amount),
      date: payment.payment_date || payment.created_at || payment.date,
      icon: "₹",
      color: "bg-emerald-50 text-emerald-700",
    }));

    const applicationActivities = applications.map((application) => ({
      id: application.id || application._id,
      type: "Loan application",
      name:
        application.group_name || application.customer_name || "Group loan",
      detail: application.status || "Submitted",
      amount: getAmount(
        application.approved_total || application.approved_amount
      ),
      date: application.submitted_at || application.created_at,
      icon: "▤",
      color: "bg-violet-50 text-violet-700",
    }));

    return [...paymentActivities, ...applicationActivities]
      .sort(
        (a, b) =>
          new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()
      )
      .slice(0, 6);
  }, [payments, applications]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <SectionHeading
        title="Recent transactions"
        subtitle="Latest collection and loan activities"
        action={
          <button
            type="button"
            onClick={() => navigateTo("/collections")}
            className="text-xs font-bold text-blue-600 hover:text-blue-800"
          >
            View all →
          </button>
        }
      />

      <div className="mt-5 divide-y divide-slate-100">
        {loading ? (
          <div className="py-8 text-center text-sm text-slate-400">
            Loading transactions...
          </div>
        ) : activities.length === 0 ? (
          <div className="py-10 text-center">
            <div className="text-3xl text-slate-300">▤</div>
            <p className="mt-2 text-sm font-bold text-slate-500">
              No transactions yet
            </p>
            <p className="mt-1 text-xs text-slate-400">
              New activities will appear here.
            </p>
          </div>
        ) : (
          activities.map((activity, index) => (
            <div
              key={`${activity.type}-${activity.id || index}`}
              className="flex items-center gap-3 py-4 first:pt-0 last:pb-0"
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold ${activity.color}`}
              >
                {activity.icon}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-xs font-extrabold text-slate-700 sm:text-sm">
                  {activity.type}
                </p>
                <p className="mt-1 truncate text-xs text-slate-500">
                  {activity.name} · {activity.detail}
                </p>
                <p className="mt-1 text-[10px] text-slate-400">
                  {formatDate(activity.date)}
                </p>
              </div>

              <div className="shrink-0 text-right">
                <p className="text-xs font-extrabold text-slate-700">
                  {activity.amount > 0 ? formatINR(activity.amount) : "—"}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ==================================================
// ATTENTION / PENDING TASKS
// ==================================================

function PendingTasks({
  pendingApprovals,
  overdueCustomers,
  dueCustomers,
  navigateTo,
}) {
  const tasks = [
    {
      title: "Loan approvals",
      description: "Applications waiting for review",
      count: pendingApprovals,
      href: "/group-loans",
      icon: "▤",
      color: "bg-violet-50 text-violet-700",
    },
    {
      title: "Overdue follow-ups",
      description: "Customers with overdue payments",
      count: overdueCustomers,
      href: "/collections",
      icon: "!",
      color: "bg-orange-50 text-orange-700",
    },
    {
      title: "Today's collection",
      description: "Customers scheduled for collection",
      count: dueCustomers,
      href: "/collections",
      icon: "₹",
      color: "bg-blue-50 text-blue-700",
    },
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <SectionHeading
        title="Attention required"
        subtitle="Tasks to monitor today"
      />

      <div className="mt-5 space-y-3">
        {tasks.map((task) => (
          <button
            key={task.title}
            type="button"
            onClick={() => navigateTo(task.href)}
            className="flex w-full items-center gap-3 rounded-xl border border-slate-100 p-3 text-left transition hover:border-blue-200 hover:bg-slate-50"
          >
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-extrabold ${task.color}`}
            >
              {task.icon}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-extrabold text-slate-700">
                {task.title}
              </p>
              <p className="mt-1 text-[10px] leading-4 text-slate-400">
                {task.description}
              </p>
            </div>

            <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-extrabold text-slate-700">
              {task.count}
            </span>

            <span className="text-slate-300">›</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ==================================================
// MAIN DASHBOARD
// ==================================================

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
  });

  // USER
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

  // NAVIGATION
  const navigateTo = (path) => {
    window.location.href = path;
  };

  // DATE
  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  // FETCH DATA
  const loadDashboard = useCallback(async (showRefresh = false) => {
    if (showRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const endpoints = [
        apiRequest("/api/collection/dashboard/"),
        apiRequest("/api/collection/today-dues/"),
        apiRequest("/api/collection/overdue/"),
        apiRequest("/api/collection/payments/"),
        apiRequest("/api/group-loan/applications/"),
      ];

      const results = await Promise.allSettled(endpoints);

      const [
        collectionDashboard,
        todayDues,
        overdue,
        payments,
        applications,
      ] = results.map((result) =>
        result.status === "fulfilled" ? result.value : null
      );

      const hasAnyData = results.some(
        (result) => result.status === "fulfilled"
      );

      if (!hasAnyData) {
        throw new Error(
          "Unable to load dashboard. Please check your backend API."
        );
      }

      const dueList = getList(todayDues);
      const overdueList = getList(overdue);
      const paymentList = getList(payments);
      const applicationList = getList(applications);

      const todayPayments = paymentList.filter((payment) =>
        isToday(
          payment.payment_date || payment.created_at || payment.date
        )
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
            (sum, item) =>
              sum + getAmount(item.balance_due ?? item.total_due),
            0
          );

      const overdueAmount = collectionDashboard
        ? getAmount(collectionDashboard.overdue_amount)
        : overdueList.reduce(
            (sum, item) =>
              sum + getAmount(item.balance_due ?? item.total_due),
            0
          );

      const pendingApplications = applicationList.filter((item) =>
        [
          "submitted",
          "pending",
          "pending_approval",
          "under_review",
        ].includes(getStatus(item))
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
            item.approved_total ||
              item.approved_amount ||
              item.disbursed_amount
          ),
        0
      );

      setDashboardData({
        todayDue,
        collectedToday,
        overdueAmount,
        pendingApprovals: pendingApplications.length,
        disbursedToday,
        dueCustomers:
          collectionDashboard?.today_due_count ?? dueList.length,
        overdueCustomers:
          collectionDashboard?.overdue_count ?? overdueList.length,
        collectionCount:
          collectionDashboard?.today_collection_count ??
          todayPayments.length,
        disbursedCount: disbursedApplications.length,
        payments: paymentList,
        applications: applicationList,
      });
    } catch (err) {
      console.error("Dashboard loading error:", err);
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // SUMMARY DATA
  const summaryValues = {
    collectedToday: dashboardData.collectedToday,
    todayDue: dashboardData.todayDue,
    overdueAmount: dashboardData.overdueAmount,
    pendingApprovals: dashboardData.pendingApprovals,
    disbursedToday: dashboardData.disbursedToday,
  };

  // CSV EXPORT
  const exportReport = () => {
    const rows = [
      ["Metric", "Value"],
      ...summaryConfig.map((item) => [
        item.title,
        item.isCount
          ? summaryValues[item.key]
          : formatINR(summaryValues[item.key]),
      ]),
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
    link.download = "smlnexgen-dashboard-report.csv";
    link.click();

    URL.revokeObjectURL(url);
  };

  // ==================================================
  // UI
  // ==================================================

  return (
    <div className="min-h-screen bg-[#F4F7FC] text-slate-800 lg:flex lg:h-screen lg:flex-col lg:overflow-hidden">
      {/* HEADER — desktop only */}
      <header className="sticky top-0 z-30 hidden shrink-0 border-b border-slate-200/80 bg-white/95 shadow-sm backdrop-blur-md lg:block">
        <div className="mx-auto flex min-h-[72px] max-w-[1800px] items-center justify-between gap-3 px-8 py-3">
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

      {/* MAIN CONTENT */}
      <main className="mx-auto w-full max-w-[1800px] flex-1 space-y-6 overflow-y-auto p-4 sm:p-6 lg:min-h-0 lg:space-y-7 lg:p-8">
        {/* PAGE HEADER */}
        <section className="mt-12 flex flex-col justify-between gap-4 sm:mt-8 sm:flex-row sm:items-center lg:mt-0">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {today}
            </p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#17365D] sm:text-3xl">
              {getGreeting()}, {firstName} 👋
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Here's your financial and collection overview for today.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={exportReport}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 shadow-sm transition hover:bg-blue-50 hover:text-blue-700"
            >
              ⇩ Export report
            </button>

            <button
              type="button"
              onClick={() => loadDashboard(true)}
              disabled={refreshing}
              className="rounded-xl bg-[#1D5DB5] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-800 disabled:opacity-50"
            >
              {refreshing ? "↻ Refreshing..." : "↻ Refresh"}
            </button>
          </div>
        </section>

        {/* ERROR */}
        {error && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
            <button
              type="button"
              onClick={() => loadDashboard()}
              className="font-bold underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* FINANCIAL SUMMARY */}
        <section>
          <SectionHeading
            title="Financial summary"
            subtitle="Important financial indicators for your business"
          />
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
            {summaryConfig.map((config) => (
              <SummaryCard
                key={config.key}
                config={config}
                value={summaryValues[config.key]}
                loading={loading}
              />
            ))}
          </div>
        </section>

        {/* COLLECTION PROGRESS */}
        <section>
          <CollectionProgress
            collected={dashboardData.collectedToday}
            due={dashboardData.todayDue}
            loading={loading}
          />
        </section>

        {/* ANALYTICS */}
        <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <CollectionChart
            payments={dashboardData.payments}
            loading={loading}
          />
          <LoanOverview
            applications={dashboardData.applications}
            loading={loading}
          />
        </section>

        {/* QUICK ACTIONS */}
        <section>
          <QuickActions navigateTo={navigateTo} />
        </section>

        {/* RECENT TRANSACTIONS + PENDING TASKS */}
        <section className="grid grid-cols-1 gap-5 xl:grid-cols-5">
          <div className="xl:col-span-3">
            <RecentActivities
              payments={dashboardData.payments}
              applications={dashboardData.applications}
              loading={loading}
              navigateTo={navigateTo}
            />
          </div>
          <div className="xl:col-span-2">
            <PendingTasks
              pendingApprovals={dashboardData.pendingApprovals}
              overdueCustomers={dashboardData.overdueCustomers}
              dueCustomers={dashboardData.dueCustomers}
              navigateTo={navigateTo}
            />
          </div>
        </section>

        {/* FOOTER */}
        <footer className="border-t border-slate-200 pt-5 text-center text-xs text-slate-400">
          SMLNEXGEN · Microfinance Management System · Secure Workspace
        </footer>
      </main>
    </div>
  );
}

export default Dashboard;