import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  TrendingUp,
  Wallet,
  AlertTriangle,
  Download,
  RefreshCw,
  Search,
  Users,
  CreditCard,
  CheckCircle2,
  Clock3,
  Filter,
  Receipt,
  UserCheck,
  PiggyBank,
  Scale,
  Layers,
  IndianRupee,
} from "lucide-react";

import collectionApi from "../services/collectionApi";
// Create this later: import reportsApi from "../services/reportsApi";

/* ------------------------------------------------------------------ */
/*  HELPERS                                                           */
/* ------------------------------------------------------------------ */

const getList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.payments)) return data.payments;
  if (Array.isArray(data?.items)) return data.items;
  return [];
};

const getAmount = (item) =>
  Number(
    item?.amount_collected ??
      item?.collected_amount ??
      item?.payment_amount ??
      item?.paid_amount ??
      item?.amount_paid ??
      item?.amount ??
      item?.total_amount ??
      0
  ) || 0;

const getCustomer = (item) => {
  const customer =
    item?.customer ||
    item?.emi?.customer ||
    item?.loan?.customer ||
    item?.loan?.application?.customer ||
    {};
  if (typeof customer === "string") return customer;
  return (
    item?.customer_name ||
    customer?.full_name ||
    [customer?.first_name, customer?.last_name].filter(Boolean).join(" ") ||
    item?.member_name ||
    item?.group_name ||
    item?.group?.name ||
    "Unknown Customer"
  );
};

const getPaymentDate = (item) =>
  item?.payment_date ||
  item?.collected_at ||
  item?.collection_date ||
  item?.created_at ||
  item?.date ||
  "";

const getPaymentMode = (item) =>
  String(
    item?.payment_mode ||
      item?.payment_method ||
      item?.mode ||
      item?.method ||
      "Other"
  ).toUpperCase();

const formatMoney = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const today = () => {
  const date = new Date();
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
};

const getStatus = (item) =>
  String(item?.status || item?.payment_status || "completed").toLowerCase();

const isSuccessful = (item) =>
  !["failed", "cancelled", "rejected", "pending"].includes(getStatus(item));

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

/* ------------------------------------------------------------------ */
/*  REPORT TYPES                                                      */
/* ------------------------------------------------------------------ */

const REPORT_TYPES = [
  { id: "collection", label: "Collection", icon: Wallet },
  { id: "due-vs-collected", label: "Due vs Collected", icon: BarChart3 },
  { id: "officer", label: "Branch / Officer", icon: UserCheck },
  { id: "portfolio", label: "Disbursement & Portfolio", icon: TrendingUp },
  { id: "overdue-aging", label: "Overdue Aging", icon: AlertTriangle },
  { id: "customer-history", label: "Customer History", icon: Receipt },
  { id: "loan-status", label: "Loan Status", icon: CreditCard },
  { id: "fd-rd", label: "FD / RD", icon: PiggyBank },
  { id: "pnl", label: "Profit & Loss", icon: Scale },
];

/* ------------------------------------------------------------------ */
/*  REUSABLE UI COMPONENTS                                            */
/* ------------------------------------------------------------------ */

function StatCard({ title, value, subtitle, icon: Icon, color = "blue" }) {
  const styles = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-emerald-50 text-emerald-700",
    orange: "bg-orange-50 text-orange-700",
    red: "bg-rose-50 text-rose-700",
    violet: "bg-violet-50 text-violet-700",
    slate: "bg-slate-100 text-slate-700",
  };
  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-500">{title}</p>
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${styles[color]}`}>
          <Icon size={21} />
        </div>
      </div>
      <h3 className="mt-4 break-words text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
        {value}
      </h3>
      {subtitle && <p className="mt-2 text-xs text-slate-500">{subtitle}</p>}
    </div>
  );
}

function SectionCard({ title, subtitle, children, action }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <h2 className="text-base font-extrabold text-slate-900">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function EmptyState({ message = "No records found for the selected filters." }) {
  return (
    <div className="px-5 py-14 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
        <Receipt size={27} />
      </div>
      <h3 className="mt-4 font-bold text-slate-800">No data available</h3>
      <p className="mt-2 text-sm text-slate-500">{message}</p>
    </div>
  );
}

function ProgressBar({ value, max, color = "bg-blue-600" }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-3 overflow-hidden rounded-full bg-slate-100">
      <div
        className={`h-full rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  MAIN COMPONENT                                                    */
/* ------------------------------------------------------------------ */

export default function Reports() {
  // -------- State --------
  const [activeReport, setActiveReport] = useState("collection");
  const [dashboard, setDashboard] = useState({});
  const [payments, setPayments] = useState([]);
  const [dues, setDues] = useState([]);
  const [overdue, setOverdue] = useState([]);
  const [followUps, setFollowUps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // FD / RD
  const [fdRdSummary, setFdRdSummary] = useState(null);
  const [fdAccounts, setFdAccounts] = useState([]);
  const [rdAccounts, setRdAccounts] = useState([]);
  const [fdRdLoading, setFdRdLoading] = useState(false);
  const [fdRdStatus, setFdRdStatus] = useState("ACTIVE"); // ACTIVE | MATURED | PREMATURE_CLOSED

  // Shared filters
  const [search, setSearch] = useState("");
  const [paymentMode, setPaymentMode] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [period, setPeriod] = useState("all");
  const [branchId, setBranchId] = useState("all");
  const [officerId, setOfficerId] = useState("all");

  // Placeholder lists (replace with real API later)
  const [branches] = useState([
    { id: "all", name: "All Branches" },
    { id: "b1", name: "Main Branch" },
    { id: "b2", name: "North Branch" },
    { id: "b3", name: "South Branch" },
  ]);
  const [officers] = useState([
    { id: "all", name: "All Officers" },
    { id: "o1", name: "Ravi Kumar" },
    { id: "o2", name: "Priya S" },
    { id: "o3", name: "Anand M" },
  ]);

  // -------- Load Collection Data --------
  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const results = await Promise.allSettled([
        collectionApi.dashboard?.() ?? Promise.resolve({}),
        collectionApi.paymentHistory?.() ?? Promise.resolve([]),
        collectionApi.todayDues?.() ?? Promise.resolve([]),
        collectionApi.overdue?.() ?? Promise.resolve([]),
        collectionApi.followUps?.() ?? Promise.resolve([]),
      ]);

      const errors = [];
      if (results[0].status === "fulfilled") setDashboard(results[0].value || {});
      else {
        setDashboard({});
        errors.push("Dashboard data unavailable.");
      }
      if (results[1].status === "fulfilled") setPayments(getList(results[1].value));
      else {
        setPayments([]);
        errors.push("Payment history unavailable.");
      }
      if (results[2].status === "fulfilled") setDues(getList(results[2].value));
      else {
        setDues([]);
        errors.push("Today's dues unavailable.");
      }
      if (results[3].status === "fulfilled") setOverdue(getList(results[3].value));
      else {
        setOverdue([]);
        errors.push("Overdue information unavailable.");
      }
      if (results[4].status === "fulfilled") setFollowUps(getList(results[4].value));
      else {
        setFollowUps([]);
        errors.push("Follow-up information unavailable.");
      }

      if (errors.length === 5) {
        throw new Error("Unable to load reports. Please check your API.");
      }
      if (errors.length) setError(errors.join(" "));
    } catch (err) {
      setError(err.message || "Unable to load reports.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // -------- Load FD / RD Data --------
  const loadFdRd = useCallback(async () => {
    setFdRdLoading(true);
    try {
      const base = "/api/collection/fd-rd";
      const statusParam = fdRdStatus ? `?status=${fdRdStatus}` : "";

      const [summaryRes, fdRes, rdRes] = await Promise.all([
        fetch(`${base}/summary/`).then((r) => r.json()),
        fetch(`${base}/fd-accounts/${statusParam}`).then((r) => r.json()),
        fetch(`${base}/rd-accounts/${statusParam}`).then((r) => r.json()),
      ]);

      setFdRdSummary(summaryRes);
      setFdAccounts(getList(fdRes));
      setRdAccounts(getList(rdRes));
    } catch (err) {
      console.error("FD/RD load error:", err);
      setFdRdSummary(null);
      setFdAccounts([]);
      setRdAccounts([]);
    } finally {
      setFdRdLoading(false);
    }
  }, [fdRdStatus]);

  useEffect(() => {
    if (activeReport === "fd-rd") {
      loadFdRd();
    }
  }, [activeReport, loadFdRd]);

  // -------- Period Handler --------
  const handlePeriod = (value) => {
    setPeriod(value);
    const end = today();
    const start = new Date();

    if (value === "all") {
      setDateFrom("");
      setDateTo("");
      return;
    }
    if (value === "today") {
      setDateFrom(end);
      setDateTo(end);
    } else if (value === "7days") {
      start.setDate(start.getDate() - 6);
      setDateFrom(
        new Date(start.getTime() - start.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 10)
      );
      setDateTo(end);
    } else if (value === "30days") {
      start.setDate(start.getDate() - 29);
      setDateFrom(
        new Date(start.getTime() - start.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 10)
      );
      setDateTo(end);
    } else if (value === "month") {
      const first = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      setDateFrom(
        new Date(first.getTime() - first.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 10)
      );
      setDateTo(end);
    }
  };

  // -------- Filtered Payments --------
  const filteredPayments = useMemo(() => {
    const query = search.trim().toLowerCase();
    return payments.filter((item) => {
      const date = getPaymentDate(item);
      const dateValue = date ? String(date).slice(0, 10) : "";
      const matchesSearch =
        !query ||
        [getCustomer(item), item.id, item.receipt_number, item.transaction_id, item.reference_number]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query);
      const matchesMode =
        paymentMode === "all" || getPaymentMode(item).toLowerCase() === paymentMode;
      const matchesFrom = !dateFrom || dateValue >= dateFrom;
      const matchesTo = !dateTo || dateValue <= dateTo;
      return matchesSearch && matchesMode && matchesFrom && matchesTo;
    });
  }, [payments, search, paymentMode, dateFrom, dateTo]);

  const successfulPayments = useMemo(
    () => filteredPayments.filter(isSuccessful),
    [filteredPayments]
  );

  const totalCollected = useMemo(
    () => successfulPayments.reduce((sum, item) => sum + getAmount(item), 0),
    [successfulPayments]
  );

  const totalDue = useMemo(
    () =>
      dues.reduce((sum, item) => {
        const due = Number(
          item.balance_due ?? item.balance ?? item.amount_due ?? item.total_due ?? 0
        );
        return sum + Math.max(0, due);
      }, 0),
    [dues]
  );

  const totalOverdue = useMemo(
    () =>
      overdue.reduce((sum, item) => {
        const due = Number(
          item.balance_due ?? item.balance ?? item.amount_due ?? item.total_due ?? 0
        );
        const paid = Number(item.paid_amount ?? item.amount_paid ?? 0);
        return sum + Math.max(0, due - paid);
      }, 0),
    [overdue]
  );

  const uniqueCustomers = useMemo(
    () =>
      new Set(
        successfulPayments.map(
          (item) =>
            item.customer?.id ||
            item.customer_id ||
            item.loan?.customer?.id ||
            getCustomer(item)
        )
      ).size,
    [successfulPayments]
  );

  // Payment mode stats
  const modeStats = useMemo(() => {
    const modes = {};
    successfulPayments.forEach((item) => {
      const mode = getPaymentMode(item);
      modes[mode] = (modes[mode] || 0) + getAmount(item);
    });
    return Object.entries(modes)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [successfulPayments]);

  const maxModeAmount = Math.max(1, ...modeStats.map((i) => i.amount));

  // Daily stats
  const dailyStats = useMemo(() => {
    const days = {};
    successfulPayments.forEach((item) => {
      const date = String(getPaymentDate(item)).slice(0, 10);
      if (!date) return;
      days[date] = (days[date] || 0) + getAmount(item);
    });
    return Object.entries(days)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-14)
      .map(([date, amount]) => ({ date, amount }));
  }, [successfulPayments]);

  const maxDailyAmount = Math.max(1, ...dailyStats.map((i) => i.amount));

  // -------- Overdue Aging --------
  const agingBuckets = useMemo(() => {
    const buckets = {
      "0-30": { label: "0 – 30 Days", count: 0, amount: 0 },
      "31-60": { label: "31 – 60 Days", count: 0, amount: 0 },
      "61-90": { label: "61 – 90 Days", count: 0, amount: 0 },
      "90+": { label: "90+ Days", count: 0, amount: 0 },
    };

    overdue.forEach((item) => {
      const dueDate = item.due_date || item.emi_date || item.next_due_date;
      let days = 0;
      if (dueDate) {
        const d = new Date(dueDate);
        const now = new Date();
        days = Math.floor((now - d) / (1000 * 60 * 60 * 24));
      }
      const amount = Math.max(
        0,
        Number(item.balance_due ?? item.balance ?? item.amount_due ?? 0) -
          Number(item.paid_amount ?? item.amount_paid ?? 0)
      );

      if (days <= 30) {
        buckets["0-30"].count += 1;
        buckets["0-30"].amount += amount;
      } else if (days <= 60) {
        buckets["31-60"].count += 1;
        buckets["31-60"].amount += amount;
      } else if (days <= 90) {
        buckets["61-90"].count += 1;
        buckets["61-90"].amount += amount;
      } else {
        buckets["90+"].count += 1;
        buckets["90+"].amount += amount;
      }
    });

    return Object.values(buckets);
  }, [overdue]);

  // -------- Export CSV --------
  const exportCSV = (rows, filename) => {
    if (!rows.length) {
      alert("No records available to export.");
      return;
    }
    const headers = Object.keys(rows[0]);
    const escape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [headers, ...rows.map((r) => headers.map((h) => escape(r[h])))]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `SMLNEXGEN-${filename}-${today()}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleExport = () => {
    if (activeReport === "collection") {
      const rows = filteredPayments.map((item) => ({
        "Receipt Number": item.receipt_number || item.receipt_no || item.id || "",
        Customer: getCustomer(item),
        "Payment Date": getPaymentDate(item),
        "Payment Mode": getPaymentMode(item),
        Amount: getAmount(item),
        Status: getStatus(item),
        "Transaction ID": item.transaction_id || item.reference_number || "",
      }));
      exportCSV(rows, "Collection-Report");
    } else if (activeReport === "overdue-aging") {
      const rows = agingBuckets.map((b) => ({
        Bucket: b.label,
        Count: b.count,
        Amount: b.amount,
      }));
      exportCSV(rows, "Overdue-Aging");
    } else if (activeReport === "fd-rd") {
      const rows = [
        ...fdAccounts.map((a) => ({
          Type: "FD",
          "Account No": a.account_number,
          Customer: a.customer,
          Amount: a.deposit_amount,
          Status: a.status,
          "Maturity Date": a.maturity_date,
        })),
        ...rdAccounts.map((a) => ({
          Type: "RD",
          "Account No": a.account_number,
          Customer: a.customer,
          Amount: a.total_paid || a.monthly_instalment,
          Status: a.status,
          "Maturity Date": a.maturity_date,
        })),
      ];
      exportCSV(rows, `FD-RD-${fdRdStatus}`);
    } else {
      alert("Export for this report will be available once the backend endpoint is ready.");
    }
  };

  // -------- Loading --------
  if (loading) {
    return (
      <div className="grid min-h-[450px] place-items-center">
        <div className="text-center">
          <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-blue-100 border-t-blue-700" />
          <p className="mt-4 text-sm font-semibold text-slate-600">
            Preparing reports...
          </p>
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------------ */
  /*  RENDER FUNCTIONS                                                  */
  /* ------------------------------------------------------------------ */

  const renderCollection = () => (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Collected"
          value={formatMoney(totalCollected)}
          subtitle={`${successfulPayments.length} successful payments`}
          icon={Wallet}
          color="green"
        />
        <StatCard
          title="Outstanding Today"
          value={formatMoney(totalDue)}
          subtitle={`${dues.length} installment records`}
          icon={Clock3}
          color="blue"
        />
        <StatCard
          title="Total Overdue"
          value={formatMoney(totalOverdue)}
          subtitle={`${overdue.length} overdue records`}
          icon={AlertTriangle}
          color="red"
        />
        <StatCard
          title="Customers Collected"
          value={uniqueCustomers}
          subtitle={`${followUps.length} follow-ups`}
          icon={Users}
          color="violet"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <SectionCard title="Daily Collection Trend" subtitle="Last 14 available payment dates">
          {dailyStats.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-5 p-5 sm:p-6">
              {dailyStats.map((item) => (
                <div key={item.date}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-slate-600">
                      {formatDate(item.date)}
                    </span>
                    <span className="text-sm font-extrabold text-slate-900">
                      {formatMoney(item.amount)}
                    </span>
                  </div>
                  <ProgressBar value={item.amount} max={maxDailyAmount} />
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Payment Mode Breakdown" subtitle="Successful collection by payment method">
          {modeStats.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-6 p-5 sm:p-6">
              {modeStats.map((item, index) => (
                <div key={item.name}>
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                        <CreditCard size={16} />
                      </span>
                      <span className="text-sm font-bold text-slate-700">{item.name}</span>
                    </div>
                    <span className="text-sm font-extrabold text-slate-900">
                      {formatMoney(item.amount)}
                    </span>
                  </div>
                  <ProgressBar
                    value={item.amount}
                    max={maxModeAmount}
                    color={
                      index === 0
                        ? "bg-blue-600"
                        : index === 1
                          ? "bg-emerald-500"
                          : index === 2
                            ? "bg-violet-500"
                            : "bg-orange-500"
                    }
                  />
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard
        title="Collection Payment Register"
        subtitle="All payment transactions"
        action={
          <span className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700">
            {filteredPayments.length} Records
          </span>
        }
      >
        <div className="border-b border-slate-100 p-4 sm:p-5">
          <div className="relative max-w-md">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customer, receipt or transaction..."
              className={`${inputClass} pl-10`}
            />
          </div>
        </div>

        {filteredPayments.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left">
              <thead className="bg-slate-50">
                <tr>
                  {["Receipt No.", "Customer", "Payment Date", "Mode", "Amount", "Status"].map(
                    (h) => (
                      <th
                        key={h}
                        className="whitespace-nowrap px-5 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-500"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPayments.map((item, index) => (
                  <tr
                    key={item.id || item.receipt_number || index}
                    className="transition hover:bg-blue-50/40"
                  >
                    <td className="px-5 py-4 text-sm font-bold text-blue-700">
                      {item.receipt_number || item.receipt_no || `#${item.id || index + 1}`}
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm font-bold text-slate-800">{getCustomer(item)}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {item.transaction_id || item.reference_number || "—"}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                      {formatDate(getPaymentDate(item))}
                    </td>
                    <td className="px-5 py-4">
                      <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700">
                        {getPaymentMode(item)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-sm font-extrabold text-slate-900">
                      {formatMoney(getAmount(item))}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-3 py-1.5 text-[11px] font-bold ${
                          isSuccessful(item)
                            ? "bg-emerald-50 text-emerald-700"
                            : getStatus(item) === "pending"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-rose-50 text-rose-700"
                        }`}
                      >
                        {getStatus(item).toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </>
  );

  const renderDueVsCollected = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard title="Total Due" value={formatMoney(totalDue)} icon={Clock3} color="blue" />
        <StatCard title="Collected" value={formatMoney(totalCollected)} icon={CheckCircle2} color="green" />
        <StatCard title="Overdue" value={formatMoney(totalOverdue)} icon={AlertTriangle} color="red" />
      </div>

      <SectionCard title="Due vs Collected Overview" subtitle="High-level comparison">
        <div className="p-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-5 text-center">
              <p className="text-sm font-semibold text-slate-500">Due</p>
              <p className="mt-2 text-2xl font-extrabold text-blue-700">{formatMoney(totalDue)}</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-5 text-center">
              <p className="text-sm font-semibold text-slate-500">Collected</p>
              <p className="mt-2 text-2xl font-extrabold text-emerald-700">{formatMoney(totalCollected)}</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-5 text-center">
              <p className="text-sm font-semibold text-slate-500">Gap (Overdue)</p>
              <p className="mt-2 text-2xl font-extrabold text-rose-700">{formatMoney(totalOverdue)}</p>
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );

  const renderOfficerPerformance = () => (
    <SectionCard title="Branch / Officer Performance" subtitle="Collection performance by officer and branch">
      <div className="p-6">
        <EmptyState message="Connect officer & branch performance API to see rankings, targets vs achievement." />
      </div>
    </SectionCard>
  );

  const renderPortfolio = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Disbursed" value="—" icon={IndianRupee} color="blue" />
        <StatCard title="Outstanding Portfolio" value="—" icon={Layers} color="violet" />
        <StatCard title="Active Loans" value="—" icon={CreditCard} color="green" />
        <StatCard title="Closed Loans" value="—" icon={CheckCircle2} color="slate" />
      </div>
      <SectionCard title="Disbursement & Outstanding Portfolio" subtitle="Portfolio health">
        <EmptyState message="Connect portfolio / loan summary API." />
      </SectionCard>
    </div>
  );

  const renderOverdueAging = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {agingBuckets.map((b, i) => (
          <StatCard
            key={b.label}
            title={b.label}
            value={formatMoney(b.amount)}
            subtitle={`${b.count} accounts`}
            icon={AlertTriangle}
            color={i === 0 ? "orange" : "red"}
          />
        ))}
      </div>

      <SectionCard title="Overdue Aging Analysis" subtitle="Bucket-wise overdue amount">
        <div className="space-y-5 p-5 sm:p-6">
          {agingBuckets.map((b, index) => (
            <div key={b.label}>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700">{b.label}</span>
                <span className="text-sm font-extrabold text-slate-900">
                  {formatMoney(b.amount)} ({b.count})
                </span>
              </div>
              <ProgressBar
                value={b.amount}
                max={Math.max(...agingBuckets.map((x) => x.amount), 1)}
                color={
                  index === 0
                    ? "bg-amber-500"
                    : index === 1
                      ? "bg-orange-500"
                      : index === 2
                        ? "bg-rose-500"
                        : "bg-red-700"
                }
              />
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );

  const renderCustomerHistory = () => (
    <SectionCard title="Customer Repayment History" subtitle="Search a customer to view full repayment trail">
      <div className="p-6">
        <div className="mb-6 max-w-md">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by customer name or ID..."
              className={`${inputClass} pl-10`}
            />
          </div>
        </div>
        <EmptyState message="Enter a customer name or ID and connect the customer repayment history API." />
      </div>
    </SectionCard>
  );

  const renderLoanStatus = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard title="Active" value="—" icon={CheckCircle2} color="green" />
        <StatCard title="Closed" value="—" icon={Clock3} color="slate" />
        <StatCard title="Default" value="—" icon={AlertTriangle} color="red" />
        <StatCard title="Restructured" value="—" icon={Layers} color="violet" />
      </div>
      <SectionCard title="Loan Status Summary" subtitle="Distribution of loans by status">
        <EmptyState message="Connect loan status summary API." />
      </SectionCard>
    </div>
  );

  // ====================== FD / RD REPORT ======================
  const renderFdRd = () => {
    if (fdRdLoading) {
      return (
        <div className="grid place-items-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-100 border-t-blue-700" />
        </div>
      );
    }

    const fd = fdRdSummary?.fd || {};
    const rd = fdRdSummary?.rd || {};

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Active FD"
            value={fd.active_count ?? "—"}
            subtitle={formatMoney(fd.active_amount)}
            icon={PiggyBank}
            color="green"
          />
          <StatCard
            title="Active RD"
            value={rd.active_count ?? "—"}
            subtitle={formatMoney(rd.active_amount)}
            icon={Wallet}
            color="blue"
          />
          <StatCard
            title="Matured (FD+RD)"
            value={(fd.matured_count || 0) + (rd.matured_count || 0)}
            subtitle="Ready for payout"
            icon={CheckCircle2}
            color="violet"
          />
          <StatCard
            title="Premature Closures"
            value={(fd.premature_count || 0) + (rd.premature_count || 0)}
            subtitle="Closed before maturity"
            icon={AlertTriangle}
            color="orange"
          />
        </div>

        {/* Status Filter */}
        <div className="flex flex-wrap gap-2">
          {[
            { id: "ACTIVE", label: "Active" },
            { id: "MATURED", label: "Matured" },
            { id: "PREMATURE_CLOSED", label: "Premature Closed" },
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => setFdRdStatus(s.id)}
              className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                fdRdStatus === s.id
                  ? "bg-blue-700 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* FD Accounts Table */}
        <SectionCard
          title={`Fixed Deposits — ${fdRdStatus.replace("_", " ")}`}
          subtitle={`${fdAccounts.length} accounts`}
        >
          {fdAccounts.length === 0 ? (
            <EmptyState message={`No ${fdRdStatus.toLowerCase()} FD accounts found.`} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left">
                <thead className="bg-slate-50">
                  <tr>
                    {["Account No", "Customer", "Product", "Deposit", "Rate", "Maturity", "Status"].map((h) => (
                      <th key={h} className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {fdAccounts.map((acc) => (
                    <tr key={acc.id} className="hover:bg-blue-50/40">
                      <td className="px-5 py-4 text-sm font-bold text-blue-700">{acc.account_number}</td>
                      <td className="px-5 py-4 text-sm font-medium text-slate-800">{acc.customer}</td>
                      <td className="px-5 py-4 text-sm text-slate-600">{acc.product}</td>
                      <td className="px-5 py-4 text-sm font-semibold">{formatMoney(acc.deposit_amount)}</td>
                      <td className="px-5 py-4 text-sm">{acc.interest_rate}%</td>
                      <td className="px-5 py-4 text-sm">{formatDate(acc.maturity_date)}</td>
                      <td className="px-5 py-4">
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700">
                          {acc.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

        {/* RD Accounts Table */}
        <SectionCard
          title={`Recurring Deposits — ${fdRdStatus.replace("_", " ")}`}
          subtitle={`${rdAccounts.length} accounts`}
        >
          {rdAccounts.length === 0 ? (
            <EmptyState message={`No ${fdRdStatus.toLowerCase()} RD accounts found.`} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left">
                <thead className="bg-slate-50">
                  <tr>
                    {["Account No", "Customer", "Monthly", "Total Paid", "Tenure", "Maturity Amt", "Status"].map((h) => (
                      <th key={h} className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rdAccounts.map((acc) => (
                    <tr key={acc.id} className="hover:bg-blue-50/40">
                      <td className="px-5 py-4 text-sm font-bold text-blue-700">{acc.account_number}</td>
                      <td className="px-5 py-4 text-sm font-medium text-slate-800">{acc.customer}</td>
                      <td className="px-5 py-4 text-sm">{formatMoney(acc.monthly_instalment)}</td>
                      <td className="px-5 py-4 text-sm font-semibold">{formatMoney(acc.total_paid)}</td>
                      <td className="px-5 py-4 text-sm">{acc.tenure_months} m</td>
                      <td className="px-5 py-4 text-sm font-semibold">
                        {formatMoney(acc.expected_maturity_amount)}
                      </td>
                      <td className="px-5 py-4">
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700">
                          {acc.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </div>
    );
  };

  const renderPnL = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard title="Total Income" value="—" icon={TrendingUp} color="green" />
        <StatCard title="Total Expenses" value="—" icon={Wallet} color="red" />
        <StatCard title="Net Profit / Loss" value="—" icon={Scale} color="violet" />
      </div>
      <SectionCard title="Profit & Loss Statement" subtitle="Income vs Expenses overview">
        <EmptyState message="Connect accounting / P&L API." />
      </SectionCard>
    </div>
  );

  const reportContent = {
    collection: renderCollection,
    "due-vs-collected": renderDueVsCollected,
    officer: renderOfficerPerformance,
    portfolio: renderPortfolio,
    "overdue-aging": renderOverdueAging,
    "customer-history": renderCustomerHistory,
    "loan-status": renderLoanStatus,
    "fd-rd": renderFdRd,
    pnl: renderPnL,
  };

  /* ------------------------------------------------------------------ */
  /*  MAIN UI                                                           */
  /* ------------------------------------------------------------------ */

  return (
    <div className="min-h-screen space-y-6 bg-slate-50/70">
      {/* HEADER */}
      <header className="flex flex-col justify-between gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:flex-row lg:items-center">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-700">
            <BarChart3 size={15} />
            SMLNEXGEN / Reports
          </div>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Reports
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            One powerful module for Collection, Portfolio, Overdue, Officer performance, FD/RD and P&L reports.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              loadData();
              if (activeReport === "fd-rd") loadFdRd();
            }}
            disabled={loading || fdRdLoading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
          <button
            onClick={handleExport}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-800"
          >
            <Download size={17} />
            Export CSV
          </button>
        </div>
      </header>

      {/* ERROR */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <AlertTriangle size={19} className="shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* REPORT TYPE TABS */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        <div className="flex min-w-max gap-1">
          {REPORT_TYPES.map((r) => {
            const Icon = r.icon;
            const active = activeReport === r.id;
            return (
              <button
                key={r.id}
                onClick={() => setActiveReport(r.id)}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                  active
                    ? "bg-blue-700 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Icon size={16} />
                {r.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* SHARED FILTERS */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Filter size={18} className="text-blue-700" />
          <h2 className="font-bold text-slate-900">Report Filters</h2>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
          <select value={period} onChange={(e) => handlePeriod(e.target.value)} className={inputClass}>
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="month">This Month</option>
          </select>

          <input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPeriod("custom");
            }}
            className={inputClass}
          />

          <input
            type="date"
            value={dateTo}
            min={dateFrom || undefined}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPeriod("custom");
            }}
            className={inputClass}
          />

          <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className={inputClass}>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          <select value={officerId} onChange={(e) => setOfficerId(e.target.value)} className={inputClass}>
            {officers.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>

          <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} className={inputClass}>
            <option value="all">All Payment Modes</option>
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
            <option value="bank">Bank</option>
            <option value="online">Online</option>
            <option value="cheque">Cheque</option>
          </select>
        </div>

        <div className="mt-3 flex justify-end">
          <button
            onClick={() => {
              setPeriod("all");
              setDateFrom("");
              setDateTo("");
              setPaymentMode("all");
              setBranchId("all");
              setOfficerId("all");
              setSearch("");
            }}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
          >
            Clear Filters
          </button>
        </div>
      </section>

      {/* ACTIVE REPORT */}
      <div className="space-y-6">{reportContent[activeReport]?.()}</div>

      {/* FOOTER */}
      <footer className="rounded-xl border border-slate-200 bg-white px-5 py-4 text-xs leading-6 text-slate-500">
        <span className="font-extrabold text-slate-800">SMLNEXGEN</span>
        {" · "}Unified Reports Module — Collection, Portfolio, Overdue, Officer & P&L.
        <p className="mt-1">
          Collection, Due, Overdue Aging and FD/RD reports are connected. Other reports will light up as you add the remaining APIs.
        </p>
      </footer>
    </div>
  );
}