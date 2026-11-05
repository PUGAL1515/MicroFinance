
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  TrendingUp,
  Wallet,
  AlertTriangle,
  CalendarDays,
  Download,
  RefreshCw,
  Search,
  IndianRupee,
  Users,
  CreditCard,
  CheckCircle2,
  Clock3,
  FileSpreadsheet,
  Filter,
  ArrowUpRight,
  Receipt,
} from "lucide-react";

import collectionApi from "../services/collectionApi";

// --------------------------------------------------
// HELPERS
// --------------------------------------------------

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
    [customer?.first_name, customer?.last_name]
      .filter(Boolean)
      .join(" ") ||
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
  return new Date(
    date.getTime() - date.getTimezoneOffset() * 60000
  ).toISOString().slice(0, 10);
};

const getStatus = (item) =>
  String(item?.status || item?.payment_status || "completed").toLowerCase();

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

const isSuccessful = (item) =>
  !["failed", "cancelled", "rejected", "pending"].includes(
    getStatus(item)
  );

// --------------------------------------------------
// STAT CARD
// --------------------------------------------------

function StatCard({ title, value, subtitle, icon: Icon, color }) {
  const styles = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-emerald-50 text-emerald-700",
    orange: "bg-orange-50 text-orange-700",
    red: "bg-rose-50 text-rose-700",
    violet: "bg-violet-50 text-violet-700",
  };

  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-500">
          {title}
        </p>

        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${styles[color]}`}>
          <Icon size={21} />
        </div>
      </div>

      <h3 className="mt-4 break-words text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
        {value}
      </h3>

      <p className="mt-2 text-xs text-slate-500">
        {subtitle}
      </p>
    </div>
  );
}

// --------------------------------------------------
// SECTION CARD
// --------------------------------------------------

function SectionCard({ title, subtitle, children, action }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <h2 className="text-base font-extrabold text-slate-900">
            {title}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {subtitle}
          </p>
        </div>
        {action}
      </div>

      {children}
    </section>
  );
}

// --------------------------------------------------
// EMPTY STATE
// --------------------------------------------------

function EmptyState() {
  return (
    <div className="px-5 py-14 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
        <Receipt size={27} />
      </div>

      <h3 className="mt-4 font-bold text-slate-800">
        No collection records found
      </h3>

      <p className="mt-2 text-sm text-slate-500">
        Try changing the date filter or search criteria.
      </p>
    </div>
  );
}

// --------------------------------------------------
// MAIN REPORTS PAGE
// --------------------------------------------------

export default function Reports() {
  const [dashboard, setDashboard] = useState({});
  const [payments, setPayments] = useState([]);
  const [dues, setDues] = useState([]);
  const [overdue, setOverdue] = useState([]);
  const [followUps, setFollowUps] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [paymentMode, setPaymentMode] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [period, setPeriod] = useState("all");

  // -----------------------------------------------
  // LOAD API DATA
  // -----------------------------------------------

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const results = await Promise.allSettled([
        collectionApi.dashboard(),
        collectionApi.paymentHistory(),
        collectionApi.todayDues(),
        collectionApi.overdue(),
        collectionApi.followUps(),
      ]);

      const errors = [];

      if (results[0].status === "fulfilled") {
        setDashboard(results[0].value || {});
      } else {
        setDashboard({});
        errors.push("Dashboard data unavailable.");
      }

      if (results[1].status === "fulfilled") {
        setPayments(getList(results[1].value));
      } else {
        setPayments([]);
        errors.push("Payment history unavailable.");
      }

      if (results[2].status === "fulfilled") {
        setDues(getList(results[2].value));
      } else {
        setDues([]);
        errors.push("Today's dues unavailable.");
      }

      if (results[3].status === "fulfilled") {
        setOverdue(getList(results[3].value));
      } else {
        setOverdue([]);
        errors.push("Overdue information unavailable.");
      }

      if (results[4].status === "fulfilled") {
        setFollowUps(getList(results[4].value));
      } else {
        setFollowUps([]);
        errors.push("Follow-up information unavailable.");
      }

      if (errors.length === 5) {
        throw new Error("Unable to load collection reports. Please check your API.");
      }

      if (errors.length) {
        setError(errors.join(" "));
      }
    } catch (err) {
      setError(err.message || "Unable to load reports.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // -----------------------------------------------
  // DATE FILTER
  // -----------------------------------------------

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
      const first = new Date(
        new Date().getFullYear(),
        new Date().getMonth(),
        1
      );

      setDateFrom(
        new Date(first.getTime() - first.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 10)
      );
      setDateTo(end);
    }
  };

  // -----------------------------------------------
  // FILTER PAYMENTS
  // -----------------------------------------------

  const filteredPayments = useMemo(() => {
    const query = search.trim().toLowerCase();

    return payments.filter((item) => {
      const date = getPaymentDate(item);
      const dateValue = date ? String(date).slice(0, 10) : "";

      const matchesSearch =
        !query ||
        [
          getCustomer(item),
          item.id,
          item.receipt_number,
          item.transaction_id,
          item.reference_number,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query);

      const matchesMode =
        paymentMode === "all" ||
        getPaymentMode(item).toLowerCase() === paymentMode;

      const matchesFrom = !dateFrom || dateValue >= dateFrom;
      const matchesTo = !dateTo || dateValue <= dateTo;

      return (
        matchesSearch &&
        matchesMode &&
        matchesFrom &&
        matchesTo
      );
    });
  }, [payments, search, paymentMode, dateFrom, dateTo]);

  // -----------------------------------------------
  // CALCULATIONS
  // -----------------------------------------------

  const successfulPayments = useMemo(
    () => filteredPayments.filter(isSuccessful),
    [filteredPayments]
  );

  const totalCollected = useMemo(
    () =>
      successfulPayments.reduce(
        (sum, item) => sum + getAmount(item),
        0
      ),
    [successfulPayments]
  );

  const totalDue = useMemo(
    () => dues.reduce((sum, item) => {
      const due = Number(
        item.balance_due ??
        item.balance ??
        item.amount_due ??
        item.total_due ??
        0
      );
      return sum + Math.max(0, due);
    }, 0),
    [dues]
  );

  const totalOverdue = useMemo(
    () => overdue.reduce((sum, item) => {
      const due = Number(
        item.balance_due ??
        item.balance ??
        item.amount_due ??
        item.total_due ??
        0
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

  // -----------------------------------------------
  // PAYMENT MODE BREAKDOWN
  // -----------------------------------------------

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

  const maxModeAmount = Math.max(
    1,
    ...modeStats.map((item) => item.amount)
  );

  // -----------------------------------------------
  // DAILY COLLECTION BREAKDOWN
  // -----------------------------------------------

  const dailyStats = useMemo(() => {
    const days = {};

    successfulPayments.forEach((item) => {
      const date = String(getPaymentDate(item)).slice(0, 10);

      if (!date) return;

      days[date] = (days[date] || 0) + getAmount(item);
    });

    return Object.entries(days)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-7)
      .map(([date, amount]) => ({ date, amount }));
  }, [successfulPayments]);

  const maxDailyAmount = Math.max(
    1,
    ...dailyStats.map((item) => item.amount)
  );

  // -----------------------------------------------
  // CSV EXPORT
  // -----------------------------------------------

  const exportCSV = () => {
    if (!filteredPayments.length) {
      alert("No payment records available to export.");
      return;
    }

    const headers = [
      "Receipt Number",
      "Customer",
      "Payment Date",
      "Payment Mode",
      "Amount",
      "Status",
      "Transaction ID",
    ];

    const rows = filteredPayments.map((item) => [
      item.receipt_number || item.receipt_no || item.id || "",
      getCustomer(item),
      getPaymentDate(item),
      getPaymentMode(item),
      getAmount(item),
      getStatus(item),
      item.transaction_id || item.reference_number || "",
    ]);

    const escapeCSV = (value) =>
      `"${String(value ?? "").replace(/"/g, '""')}"`;

    const csv = [
      headers,
      ...rows,
    ]
      .map((row) => row.map(escapeCSV).join(","))
      .join("\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `SMLNEXGEN-Collection-Report-${today()}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  };

  // -----------------------------------------------
  // LOADING
  // -----------------------------------------------

  if (loading) {
    return (
      <div className="grid min-h-[450px] place-items-center">
        <div className="text-center">
          <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-blue-100 border-t-blue-700" />
          <p className="mt-4 text-sm font-semibold text-slate-600">
            Preparing collection reports...
          </p>
        </div>
      </div>
    );
  }

  // -----------------------------------------------
  // UI
  // -----------------------------------------------

  return (
    <div className="min-h-screen space-y-6 bg-slate-50/70">

      {/* HEADER */}

      <header className="flex flex-col justify-between gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:flex-row lg:items-center">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-700">
            <BarChart3 size={15} />
            SMLNEXGEN / Analytics
          </div>

          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Collection Reports
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Analyze collections, customer repayments, outstanding dues
            and payment performance.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={16} />
            Refresh
          </button>

          <button
            onClick={exportCSV}
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

      {/* FILTER */}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Filter size={18} className="text-blue-700" />
          <h2 className="font-bold text-slate-900">
            Report Filters
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <select
            value={period}
            onChange={(e) => handlePeriod(e.target.value)}
            className={inputClass}
          >
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
            aria-label="From date"
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
            aria-label="To date"
          />

          <select
            value={paymentMode}
            onChange={(e) => setPaymentMode(e.target.value)}
            className={inputClass}
          >
            <option value="all">All Payment Modes</option>
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
            <option value="bank">Bank</option>
            <option value="online">Online</option>
            <option value="cheque">Cheque</option>
          </select>

          <button
            onClick={() => {
              setPeriod("all");
              setDateFrom("");
              setDateTo("");
              setPaymentMode("all");
              setSearch("");
            }}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
          >
            Clear Filters
          </button>
        </div>
      </section>

      {/* STATISTICS */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

        <StatCard
          title="Total Collected"
          value={formatMoney(totalCollected)}
          subtitle={`${successfulPayments.length} successful payment records`}
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
          subtitle={`${followUps.length} follow-up records`}
          icon={Users}
          color="violet"
        />
      </div>

      {/* ADDITIONAL SUMMARY */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-500">
              Total Transactions
            </span>
            <Receipt size={20} className="text-blue-600" />
          </div>
          <p className="mt-3 text-2xl font-extrabold text-slate-900">
            {filteredPayments.length}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-500">
              Successful Payments
            </span>
            <CheckCircle2 size={20} className="text-emerald-600" />
          </div>
          <p className="mt-3 text-2xl font-extrabold text-emerald-700">
            {successfulPayments.length}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-500">
              Average Collection
            </span>
            <TrendingUp size={20} className="text-violet-600" />
          </div>
          <p className="mt-3 text-2xl font-extrabold text-slate-900">
            {formatMoney(
              successfulPayments.length
                ? totalCollected / successfulPayments.length
                : 0
            )}
          </p>
        </div>
      </div>

      {/* CHARTS */}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">

        {/* DAILY COLLECTION */}

        <SectionCard
          title="Daily Collection Trend"
          subtitle="Collection amount over the last 7 available payment dates"
        >
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

                  <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-500 transition-all duration-500"
                      style={{
                        width: `${(item.amount / maxDailyAmount) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* PAYMENT MODES */}

        <SectionCard
          title="Payment Mode Breakdown"
          subtitle="Successful collection amount by payment method"
        >
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
                      <span className="text-sm font-bold text-slate-700">
                        {item.name}
                      </span>
                    </div>

                    <span className="text-sm font-extrabold text-slate-900">
                      {formatMoney(item.amount)}
                    </span>
                  </div>

                  <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        index === 0
                          ? "bg-blue-600"
                          : index === 1
                            ? "bg-emerald-500"
                            : index === 2
                              ? "bg-violet-500"
                              : "bg-orange-500"
                      }`}
                      style={{
                        width: `${(item.amount / maxModeAmount) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {/* PAYMENT REGISTER */}

      <SectionCard
        title="Collection Payment Register"
        subtitle="Review all payment transactions and customer collection details"
        action={
          <span className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700">
            {filteredPayments.length} Records
          </span>
        }
      >
        <div className="border-b border-slate-100 p-4 sm:p-5">
          <div className="relative max-w-md">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
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
                  {[
                    "Receipt No.",
                    "Customer",
                    "Payment Date",
                    "Payment Mode",
                    "Amount",
                    "Status",
                  ].map((heading) => (
                    <th
                      key={heading}
                      className="whitespace-nowrap px-5 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-500"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredPayments.map((item, index) => (
                  <tr
                    key={item.id || item.receipt_number || index}
                    className="transition hover:bg-blue-50/40"
                  >
                    <td className="px-5 py-4 text-sm font-bold text-blue-700">
                      {item.receipt_number ||
                        item.receipt_no ||
                        `#${item.id || index + 1}`}
                    </td>

                    <td className="px-5 py-4">
                      <p className="text-sm font-bold text-slate-800">
                        {getCustomer(item)}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {item.transaction_id ||
                          item.reference_number ||
                          "No transaction reference"}
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

      {/* OVERDUE SUMMARY */}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">

        <div className="rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50 to-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-rose-700">
                Overdue Collections
              </p>
              <h3 className="mt-2 text-2xl font-extrabold text-rose-800">
                {formatMoney(totalOverdue)}
              </h3>
              <p className="mt-2 text-sm text-rose-600">
                {overdue.length} overdue installment records
              </p>
            </div>

            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-700">
              <AlertTriangle size={27} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-emerald-700">
                Collection Performance
              </p>
              <h3 className="mt-2 text-2xl font-extrabold text-emerald-800">
                {successfulPayments.length} Payments
              </h3>
              <p className="mt-2 text-sm text-emerald-600">
                {formatMoney(totalCollected)} successfully collected
              </p>
            </div>

            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
              <ArrowUpRight size={27} />
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER */}

      <footer className="rounded-xl border border-slate-200 bg-white px-5 py-4 text-xs leading-6 text-slate-500">
        <span className="font-extrabold text-slate-800">
          SMLNEXGEN
        </span>
        {" · "}Collection analytics and reports.

        <p className="mt-1">
          Reports are calculated from the collection APIs currently
          available. Outstanding and overdue totals represent the
          records returned by their respective endpoints.
        </p>
      </footer>
    </div>
  );
}
