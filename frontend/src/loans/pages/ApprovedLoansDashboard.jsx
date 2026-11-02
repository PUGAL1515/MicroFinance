
import { useCallback, useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/Sidebar";

const API_URL = import.meta.env.VITE_API_BASE_URL || "";

async function apiRequest(path) {
  const token =
    localStorage.getItem("access") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("authToken");

  const response = await fetch(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  const text = await response.text();
  let data;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    throw new Error(
      data?.detail ||
        (typeof data === "string" ? data : JSON.stringify(data)) ||
        `Request failed (${response.status})`,
    );
  }

  return data;
}

function listOf(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.installments)) return data.installments;
  if (Array.isArray(data?.schedule)) return data.schedule;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const todayString = () => {
  const date = new Date();
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
};

function customerName(loan) {
  const customer = loan.application?.customer || loan.customer;

  if (!customer) {
    return (
      loan.group?.name ||
      loan.group_name ||
      loan.group?.group_name ||
      `Loan #${loan.id}`
    );
  }

  return (
    customer.full_name ||
    [customer.first_name, customer.last_name].filter(Boolean).join(" ") ||
    `Customer #${customer.id || ""}`
  );
}

function groupName(application) {
  const group = application.group;

  if (group && typeof group === "object") {
    return (
      group.name ||
      group.group_name ||
      group.group_code ||
      `Group #${group.id || application.group_id || ""}`
    );
  }

  return (
    application.group_name || `Group #${group || application.group_id || ""}`
  );
}

function Badge({ status }) {
  const styles = {
    approved: "bg-blue-50 text-blue-700 ring-blue-200",
    disbursed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    closed: "bg-slate-100 text-slate-600 ring-slate-200",
    paid: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    pending: "bg-amber-50 text-amber-700 ring-amber-200",
    partial: "bg-orange-50 text-orange-700 ring-orange-200",
    overdue: "bg-red-50 text-red-700 ring-red-200",
    rejected: "bg-red-50 text-red-700 ring-red-200",
    cancelled: "bg-slate-100 text-slate-600 ring-slate-200",
  };

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-bold ring-1 ring-inset ${
        styles[String(status || "").toLowerCase()] ||
        "bg-slate-100 text-slate-600 ring-slate-200"
      }`}
    >
      {String(status || "pending").replaceAll("_", " ").toUpperCase()}
    </span>
  );
}

function StatCard({ title, value, subtitle, icon, accent }) {
  const accents = {
    blue: "bg-blue-50 text-blue-700",
    emerald: "bg-emerald-50 text-emerald-700",
    red: "bg-red-50 text-red-700",
    violet: "bg-violet-50 text-violet-700",
  };

  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-500">{title}</p>
        <span
          className={`flex h-11 w-11 items-center justify-center rounded-xl text-xl ${
            accents[accent] || accents.blue
          }`}
        >
          {icon}
        </span>
      </div>
      <p className="mt-4 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
        {value}
      </p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{subtitle}</p>
    </div>
  );
}

function EmptyState({ title, message }) {
  return (
    <div className="px-5 py-14 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-3xl">
        📋
      </div>
      <h3 className="mt-4 font-bold text-slate-800">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        {message}
      </p>
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

const thClass =
  "whitespace-nowrap px-4 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500";

const tdClass = "whitespace-nowrap px-4 py-4 text-sm text-slate-600";

export default function ApprovedLoansDashboard() {
  const [individualLoans, setIndividualLoans] = useState([]);
  const [individualEmis, setIndividualEmis] = useState([]);
  const [groupLoans, setGroupLoans] = useState([]);

  const [groupSchedules, setGroupSchedules] = useState({});
  const [scheduleLoading, setScheduleLoading] = useState({});
  const [scheduleErrors, setScheduleErrors] = useState({});

  const [selectedLoan, setSelectedLoan] = useState(null);
  const [tab, setTab] = useState("all");
  const [loanType, setLoanType] = useState("all");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState([]);

  const today = todayString();

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrors([]);

    const requests = await Promise.allSettled([
      apiRequest("/api/customer/loans/"),
      apiRequest("/api/customer/emis/"),
      apiRequest("/api/group-loan/applications/"),
    ]);

    const nextErrors = [];

    if (requests[0].status === "fulfilled") {
      setIndividualLoans(listOf(requests[0].value));
    } else {
      setIndividualLoans([]);
      nextErrors.push(
        `Individual loans: ${requests[0].reason?.message || "Unable to load"}`,
      );
    }

    if (requests[1].status === "fulfilled") {
      setIndividualEmis(listOf(requests[1].value));
    } else {
      setIndividualEmis([]);
      nextErrors.push(
        `Individual EMI schedules: ${requests[1].reason?.message || "Unable to load"}`,
      );
    }

    if (requests[2].status === "fulfilled") {
      setGroupLoans(listOf(requests[2].value));
    } else {
      setGroupLoans([]);
      nextErrors.push(
        `Group loans: ${requests[2].reason?.message || "Unable to load"}`,
      );
    }

    setErrors(nextErrors);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const individualActive = useMemo(
    () =>
      individualLoans.filter((loan) =>
        ["approved", "disbursed"].includes(
          String(loan.status || "").toLowerCase(),
        ),
      ),
    [individualLoans],
  );

  const groupActive = useMemo(
    () =>
      groupLoans.filter((loan) =>
        ["approved", "disbursed"].includes(
          String(loan.status || "").toLowerCase(),
        ),
      ),
    [groupLoans],
  );

  const normalizedEmis = useMemo(() => {
    const loanMap = new Map(
      individualLoans.map((loan) => [Number(loan.id), loan]),
    );

    return individualEmis.map((emi) => {
      const loanId = Number(emi.loan?.id ?? emi.loan);
      const loan = loanMap.get(loanId);
      const due = Number(emi.amount_due || 0);
      const paid = Number(emi.amount_paid || 0);
      const balance = Math.max(0, due - paid);

      let displayStatus = String(emi.status || "pending").toLowerCase();

      if (due > 0 && balance <= 0) {
        displayStatus = "paid";
      } else if (paid > 0 && balance > 0) {
        displayStatus = "partial";
      } else if (emi.due_date < today && balance > 0) {
        displayStatus = "overdue";
      } else if (balance > 0) {
        displayStatus = "pending";
      }

      return {
        ...emi,
        loanId,
        loan,
        due,
        paid,
        balance,
        displayStatus,
        loanType: "individual",
      };
    });
  }, [individualEmis, individualLoans, today]);

  const allLoans = useMemo(() => {
    const individuals = individualActive.map((loan) => ({
      ...loan,
      recordType: "individual",
      displayName: customerName(loan),
      displayAmount: Number(loan.approved_amount || 0),
      displayInterest: loan.annual_interest_rate,
      displayTenure: loan.tenure_installments,
    }));

    const groups = groupActive.map((loan) => ({
      ...loan,
      recordType: "group",
      displayName: groupName(loan),
      displayAmount: Number(loan.approved_total ?? loan.requested_total ?? 0),
      displayInterest: loan.interest_rate,
      displayTenure: loan.tenure_months,
    }));

    return [...individuals, ...groups];
  }, [individualActive, groupActive]);

  const filteredLoans = useMemo(() => {
    const query = search.trim().toLowerCase();

    return allLoans.filter((loan) => {
      const matchesType = loanType === "all" || loan.recordType === loanType;

      const matchesStatus =
        statusFilter === "all" ||
        String(loan.status).toLowerCase() === statusFilter;

      const searchable = [
        loan.displayName,
        loan.id,
        loan.application_number,
        loan.application?.application_number,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        matchesType && matchesStatus && (!query || searchable.includes(query))
      );
    });
  }, [allLoans, loanType, search, statusFilter]);

  const groupInstallments = useMemo(
    () => Object.values(groupSchedules).flat(),
    [groupSchedules],
  );

  const groupDueToday = groupInstallments.filter(
    (emi) => emi.due_date === today && Number(emi.balance_due ?? 0) > 0,
  );

  const groupOverdue = groupInstallments.filter(
    (emi) => emi.due_date < today && Number(emi.balance_due ?? 0) > 0,
  );

  const individualDueToday = normalizedEmis.filter(
    (emi) =>
      emi.due_date === today &&
      emi.balance > 0 &&
      emi.loan?.status === "disbursed",
  );

  const individualOverdue = normalizedEmis.filter(
    (emi) =>
      emi.due_date < today &&
      emi.balance > 0 &&
      emi.loan?.status === "disbursed",
  );

  const dueTodayAmount =
    individualDueToday.reduce((sum, emi) => sum + emi.balance, 0) +
    groupDueToday.reduce((sum, emi) => sum + Number(emi.balance_due || 0), 0);

  const overdueAmount =
    individualOverdue.reduce((sum, emi) => sum + emi.balance, 0) +
    groupOverdue.reduce((sum, emi) => sum + Number(emi.balance_due || 0), 0);

  const paidInstallments =
    normalizedEmis.filter((emi) => emi.displayStatus === "paid").length +
    groupInstallments.filter((emi) => emi.status === "paid").length;

  const totalInstallments = normalizedEmis.length + groupInstallments.length;

  const openLoan = async (loan) => {
    setSelectedLoan(loan);

    if (loan.recordType !== "group") return;

    const id = loan.id;

    if (Object.prototype.hasOwnProperty.call(groupSchedules, id)) return;

    setScheduleLoading((prev) => ({ ...prev, [id]: true }));
    setScheduleErrors((prev) => ({ ...prev, [id]: "" }));

    try {
      const data = await apiRequest(
        `/api/group-loan/applications/${id}/installments/`,
      );

      setGroupSchedules((prev) => ({
        ...prev,
        [id]: listOf(data),
      }));
    } catch (err) {
      setScheduleErrors((prev) => ({
        ...prev,
        [id]: err.message || "Unable to load EMI schedule.",
      }));
    } finally {
      setScheduleLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  const selectedIndividualEmis =
    selectedLoan?.recordType === "individual"
      ? normalizedEmis.filter((emi) => emi.loanId === Number(selectedLoan.id))
      : [];

  const selectedGroupEmis =
    selectedLoan?.recordType === "group"
      ? groupSchedules[selectedLoan.id] || []
      : [];

  const visibleEmis =
    selectedLoan?.recordType === "group"
      ? selectedGroupEmis
      : selectedIndividualEmis;

  const tabs = [
    { id: "all", label: "All Approved Loans" },
    { id: "individual", label: "Individual" },
    { id: "group", label: "Group Loans" },
    { id: "today", label: "Today's Due" },
    { id: "overdue", label: "Overdue" },
  ];

  return (
    <div className="flex min-h-screen w-full bg-slate-50">
      <Sidebar />

      <main className="min-w-0 flex-1 overflow-x-hidden pt-16 md:pt-0">
        <div className="mx-auto w-full max-w-[1600px] space-y-6 p-3 sm:p-5 md:p-7 lg:p-8">
          {/* Page Header */}
          <header className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:flex-row lg:items-center">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-700">
                <span className="h-2 w-2 rounded-full bg-blue-600" />
                SMLNEXGEN / Loan Management
              </div>

              <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                Approved Loans
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Manage approved individual and group loans, monitor EMI
                schedules and track outstanding balances.
              </p>
            </div>

            <button
              onClick={loadData}
              disabled={loading}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="text-lg">↻</span>
              {loading ? "Refreshing..." : "Refresh Dashboard"}
            </button>
          </header>

          {/* API Errors */}
          {errors.length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-3">
                <span className="text-xl">⚠️</span>
                <div className="min-w-0 space-y-1 text-sm text-amber-900">
                  <p className="font-bold">
                    Some information could not be loaded.
                  </p>
                  {errors.map((error) => (
                    <p key={error} className="break-words">
                      {error}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Dashboard Statistics */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Approved / Disbursed"
              value={allLoans.length}
              subtitle={`${individualActive.length} individual · ${groupActive.length} group`}
              icon="💳"
              accent="blue"
            />

            <StatCard
              title="EMIs Due Today"
              value={individualDueToday.length + groupDueToday.length}
              subtitle={`${money(dueTodayAmount)} outstanding in loaded schedules`}
              icon="📅"
              accent="emerald"
            />

            <StatCard
              title="Overdue EMIs"
              value={individualOverdue.length + groupOverdue.length}
              subtitle={`${money(overdueAmount)} overdue in loaded schedules`}
              icon="⚠️"
              accent="red"
            />

            <StatCard
              title="Paid Installments"
              value={paidInstallments}
              subtitle={`${totalInstallments} installments loaded`}
              icon="✅"
              accent="violet"
            />
          </div>

          {/* Selected Loan EMI Details */}
          {selectedLoan ? (
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-blue-100 bg-gradient-to-r from-blue-50 via-white to-white p-5 sm:p-6">
                <button
                  onClick={() => setSelectedLoan(null)}
                  className="mb-5 inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-bold text-blue-700 transition hover:bg-blue-100"
                >
                  ← Back to approved loans
                </button>

                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-blue-700">
                      {selectedLoan.recordType === "group"
                        ? "Group Loan"
                        : "Individual Loan"}{" "}
                      · #{selectedLoan.id}
                    </p>

                    <h2 className="mt-2 text-xl font-extrabold text-slate-900 sm:text-2xl">
                      {selectedLoan.displayName}
                    </h2>

                    <p className="mt-2 text-sm text-slate-600">
                      Approved amount
                    </p>
                    <p className="mt-1 text-2xl font-extrabold text-blue-800">
                      {money(selectedLoan.displayAmount)}
                    </p>
                  </div>

                  <Badge status={selectedLoan.status} />
                </div>
              </div>

              {selectedLoan.recordType === "group" &&
                scheduleLoading[selectedLoan.id] && (
                  <div className="flex flex-col items-center justify-center gap-3 p-12 text-center">
                    <div className="h-9 w-9 animate-spin rounded-full border-4 border-blue-100 border-t-blue-700" />
                    <p className="text-sm font-medium text-slate-500">
                      Loading saved EMI schedule...
                    </p>
                  </div>
                )}

              {selectedLoan.recordType === "group" &&
                scheduleErrors[selectedLoan.id] && (
                  <div className="m-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    <p>{scheduleErrors[selectedLoan.id]}</p>
                    <button
                      onClick={() => {
                        setGroupSchedules((prev) => {
                          const next = { ...prev };
                          delete next[selectedLoan.id];
                          return next;
                        });
                        openLoan(selectedLoan);
                      }}
                      className="mt-3 rounded-lg bg-red-100 px-3 py-2 font-bold text-red-700 transition hover:bg-red-200"
                    >
                      Retry loading schedule
                    </button>
                  </div>
                )}

              {!(
                selectedLoan.recordType === "group" &&
                scheduleLoading[selectedLoan.id]
              ) && (
                <div className="grid grid-cols-1 gap-3 border-b border-slate-100 p-5 sm:grid-cols-3 sm:p-6">
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-xs font-semibold text-slate-500">
                      Interest Rate
                    </p>
                    <p className="mt-2 text-xl font-extrabold text-slate-900">
                      {selectedLoan.displayInterest ?? "—"}%
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-xs font-semibold text-slate-500">
                      Tenure
                    </p>
                    <p className="mt-2 text-xl font-extrabold text-slate-900">
                      {selectedLoan.displayTenure ?? "—"}{" "}
                      {selectedLoan.recordType === "group"
                        ? "months"
                        : "installments"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-xs font-semibold text-slate-500">
                      Installments
                    </p>
                    <p className="mt-2 text-xl font-extrabold text-slate-900">
                      {visibleEmis.length}
                    </p>
                  </div>
                </div>
              )}

              {selectedLoan.recordType === "group" &&
              !scheduleLoading[selectedLoan.id] &&
              !scheduleErrors[selectedLoan.id] &&
              visibleEmis.length === 0 ? (
                <EmptyState
                  title="EMI schedule not found"
                  message="This application has no saved installments yet. Open Loan Processing, approve the application and generate its EMI schedule first."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[850px] text-left">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className={thClass}>EMI #</th>
                        <th className={thClass}>Due Date</th>
                        <th className={thClass}>Principal</th>
                        <th className={thClass}>Interest</th>
                        <th className={thClass}>EMI Amount</th>
                        <th className={thClass}>Paid</th>
                        <th className={thClass}>Balance</th>
                        <th className={thClass}>Status</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {visibleEmis.map((emi) => {
                        const groupLoan = selectedLoan.recordType === "group";
                        const due =
                          Number(groupLoan ? emi.total_due : emi.amount_due) ||
                          0;
                        const paid =
                          Number(
                            groupLoan ? emi.paid_amount : emi.amount_paid,
                          ) || 0;
                        const balance = Math.max(0, due - paid);

                        let displayStatus = String(
                          emi.status || "pending",
                        ).toLowerCase();

                        if (balance <= 0 && due > 0) {
                          displayStatus = "paid";
                        } else if (paid > 0 && balance > 0) {
                          displayStatus = "partial";
                        } else if (emi.due_date < today && balance > 0) {
                          displayStatus = "overdue";
                        }

                        return (
                          <tr
                            key={emi.id}
                            className="transition hover:bg-blue-50/50"
                          >
                            <td className={`${tdClass} font-bold text-slate-900`}>
                              {emi.installment_number}
                            </td>
                            <td className={tdClass}>{emi.due_date || "—"}</td>
                            <td className={tdClass}>
                              {money(
                                groupLoan
                                  ? emi.principal_due
                                  : emi.principal_amount,
                              )}
                            </td>
                            <td className={tdClass}>
                              {money(
                                groupLoan
                                  ? emi.interest_due
                                  : emi.interest_amount,
                              )}
                            </td>
                            <td className={`${tdClass} font-bold text-slate-900`}>
                              {money(due)}
                            </td>
                            <td className={`${tdClass} font-semibold text-emerald-700`}>
                              {money(paid)}
                            </td>
                            <td className={`${tdClass} font-bold text-red-700`}>
                              {money(balance)}
                            </td>
                            <td className={tdClass}>
                              <Badge status={displayStatus} />
                            </td>
                          </tr>
                        );
                      })}

                      {selectedLoan.recordType === "individual" &&
                        visibleEmis.length === 0 && (
                          <tr>
                            <td
                              colSpan={8}
                              className="p-10 text-center text-sm text-slate-500"
                            >
                              No EMI schedule found for this individual loan.
                            </td>
                          </tr>
                        )}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ) : (
            <>
              {/* Navigation Tabs */}
              <div className="flex gap-2 overflow-x-auto pb-1">
                {tabs.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setTab(item.id)}
                    className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                      tab === item.id
                        ? "bg-blue-700 text-white shadow-sm"
                        : "border border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Due Today / Overdue */}
              {tab === "today" || tab === "overdue" ? (
                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-100 p-5 sm:p-6">
                    <h2 className="text-lg font-extrabold text-slate-900">
                      {tab === "today" ? "Today's EMI Due" : "Overdue EMI List"}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Only installments from the schedules currently loaded
                      are counted.
                    </p>
                  </div>

                  {(() => {
                    const individualRows =
                      tab === "today" ? individualDueToday : individualOverdue;
                    const groupRows =
                      tab === "today" ? groupDueToday : groupOverdue;

                    if (!individualRows.length && !groupRows.length) {
                      return (
                        <EmptyState
                          title="No installments found"
                          message="No outstanding installments match this date category in the schedules currently loaded."
                        />
                      );
                    }

                    return (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[750px] text-left">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className={thClass}>Loan Type</th>
                              <th className={thClass}>Customer / Group</th>
                              <th className={thClass}>EMI #</th>
                              <th className={thClass}>Due Date</th>
                              <th className={thClass}>EMI Amount</th>
                              <th className={thClass}>Paid</th>
                              <th className={thClass}>Balance</th>
                              <th className={thClass}>Status</th>
                            </tr>
                          </thead>

                          <tbody className="divide-y divide-slate-100">
                            {individualRows.map((emi) => (
                              <tr
                                key={`individual-${emi.id}`}
                                className="hover:bg-blue-50/50"
                              >
                                <td className={tdClass}>Individual</td>
                                <td className={`${tdClass} font-semibold text-slate-900`}>
                                  {emi.loan ? customerName(emi.loan) : "—"}
                                </td>
                                <td className={tdClass}>
                                  {emi.installment_number}
                                </td>
                                <td className={tdClass}>{emi.due_date}</td>
                                <td className={tdClass}>{money(emi.due)}</td>
                                <td className={tdClass}>{money(emi.paid)}</td>
                                <td className={`${tdClass} font-bold text-red-700`}>
                                  {money(emi.balance)}
                                </td>
                                <td className={tdClass}>
                                  <Badge status={emi.displayStatus} />
                                </td>
                              </tr>
                            ))}

                            {groupRows.map((emi) => {
                              const application = groupActive.find(
                                (loan) =>
                                  Number(loan.id) === Number(emi.application),
                              );
                              const due = Number(emi.total_due || 0);
                              const paid = Number(emi.paid_amount || 0);
                              const balance = Math.max(0, due - paid);

                              return (
                                <tr
                                  key={`group-${emi.id}`}
                                  className="hover:bg-blue-50/50"
                                >
                                  <td className={tdClass}>Group</td>
                                  <td className={`${tdClass} font-semibold text-slate-900`}>
                                    {application
                                      ? groupName(application)
                                      : "Group loan"}
                                  </td>
                                  <td className={tdClass}>
                                    {emi.installment_number}
                                  </td>
                                  <td className={tdClass}>{emi.due_date}</td>
                                  <td className={tdClass}>{money(due)}</td>
                                  <td className={tdClass}>{money(paid)}</td>
                                  <td className={`${tdClass} font-bold text-red-700`}>
                                    {money(balance)}
                                  </td>
                                  <td className={tdClass}>
                                    <Badge
                                      status={
                                        balance <= 0
                                          ? "paid"
                                          : paid > 0
                                            ? "partial"
                                            : emi.due_date < today
                                              ? "overdue"
                                              : "pending"
                                      }
                                    />
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}
                </section>
              ) : (
                /* Approved Loans Register */
                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <h2 className="text-lg font-extrabold text-slate-900">
                        Approved Loans Register
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        {filteredLoans.length} loan records found
                      </p>
                    </div>

                    <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 lg:max-w-2xl lg:grid-cols-3">
                      <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search loan or customer"
                        className={inputClass}
                      />

                      <select
                        value={loanType}
                        onChange={(event) => setLoanType(event.target.value)}
                        className={inputClass}
                      >
                        <option value="all">All loan types</option>
                        <option value="individual">Individual loans</option>
                        <option value="group">Group loans</option>
                      </select>

                      <select
                        value={statusFilter}
                        onChange={(event) =>
                          setStatusFilter(event.target.value)
                        }
                        className={inputClass}
                      >
                        <option value="all">All statuses</option>
                        <option value="approved">Approved</option>
                        <option value="disbursed">Disbursed</option>
                      </select>
                    </div>
                  </div>

                  {loading ? (
                    <div className="flex flex-col items-center justify-center gap-3 p-14">
                      <div className="h-9 w-9 animate-spin rounded-full border-4 border-blue-100 border-t-blue-700" />
                      <p className="text-sm font-medium text-slate-500">
                        Loading approved loans...
                      </p>
                    </div>
                  ) : filteredLoans.length === 0 ? (
                    <EmptyState
                      title="No approved loans found"
                      message="Try another filter. If you expected a group loan here, confirm that the group application API returns status approved or disbursed."
                    />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[1000px] text-left">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className={thClass}>Loan / Customer</th>
                            <th className={thClass}>Type</th>
                            <th className={thClass}>Approved Amount</th>
                            <th className={thClass}>Interest</th>
                            <th className={thClass}>Tenure</th>
                            <th className={thClass}>Repayment</th>
                            <th className={thClass}>Status</th>
                            <th className={thClass}>EMI Schedule</th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100">
                          {filteredLoans.map((loan) => (
                            <tr
                              key={`${loan.recordType}-${loan.id}`}
                              className="transition hover:bg-blue-50/50"
                            >
                              <td className="px-4 py-4">
                                <p className="font-bold text-slate-900">
                                  {loan.recordType === "group"
                                    ? `Group Loan #${loan.id}`
                                    : `Loan #${loan.id}`}
                                </p>
                                <p className="mt-1 text-sm text-slate-500">
                                  {loan.displayName}
                                </p>
                                {loan.application_number && (
                                  <p className="mt-1 text-xs text-slate-400">
                                    {loan.application_number}
                                  </p>
                                )}
                              </td>

                              <td className={tdClass}>
                                <span
                                  className={`inline-flex rounded-lg px-2.5 py-1 text-[11px] font-bold ${
                                    loan.recordType === "group"
                                      ? "bg-violet-50 text-violet-700"
                                      : "bg-sky-50 text-sky-700"
                                  }`}
                                >
                                  {loan.recordType === "group"
                                    ? "GROUP"
                                    : "INDIVIDUAL"}
                                </span>
                              </td>

                              <td className={`${tdClass} font-extrabold text-slate-900`}>
                                {money(loan.displayAmount)}
                              </td>

                              <td className={tdClass}>
                                {loan.displayInterest ?? "—"}%
                              </td>

                              <td className={tdClass}>
                                {loan.displayTenure ?? "—"}{" "}
                                {loan.recordType === "group"
                                  ? "months"
                                  : "installments"}
                              </td>

                              <td className={`${tdClass} capitalize`}>
                                {(
                                  loan.repayment_frequency ||
                                  loan.application?.repayment_frequency ||
                                  "—"
                                ).replaceAll("_", " ")}
                              </td>

                              <td className={tdClass}>
                                <Badge status={loan.status} />
                              </td>

                              <td className={tdClass}>
                                <button
                                  onClick={() => openLoan(loan)}
                                  className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl bg-blue-700 px-3.5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-blue-800"
                                >
                                  View EMI Schedule
                                  <span>→</span>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              )}
            </>
          )}

          <footer className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs leading-5 text-slate-500">
            <span className="font-bold text-slate-700">SMLNEXGEN</span>
            {" · "}Data is loaded from the configured backend APIs. Group EMI
            totals on this dashboard include only group schedules opened and
            loaded during this session. For accurate collection balances, the
            backend must update each installment's paid amount and status
            after recording payment.
          </footer>
        </div>
      </main>
    </div>
  );
}
