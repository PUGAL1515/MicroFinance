
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
    headers: token
      ? { Authorization: `Bearer ${token}` }
      : {},
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
      `Request failed (${response.status})`
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
  return new Date(
    date.getTime() - date.getTimezoneOffset() * 60000
  ).toISOString().slice(0, 10);
};

const normalizedStatus = (value) =>
  String(value || "pending").toLowerCase().replaceAll(" ", "_");

function isDisbursed(loan) {
  return ["approved", "disbursed"].includes(
    normalizedStatus(loan?.status)
  );
}

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
    [customer.first_name, customer.last_name]
      .filter(Boolean)
      .join(" ") ||
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
    application.group_name ||
    `Group #${group || application.group_id || ""}`
  );
}

function getIndividualDue(emi) {
  return Number(
    emi.amount_due ??
    emi.total_due ??
    emi.emi_amount ??
    emi.installment_amount ??
    0
  );
}

function getIndividualPaid(emi) {
  return Number(
    emi.amount_paid ??
    emi.paid_amount ??
    0
  );
}

function getGroupDue(emi) {
  return Number(
    emi.total_due ??
    emi.amount_due ??
    emi.emi_amount ??
    emi.installment_amount ??
    0
  );
}

function getGroupPaid(emi) {
  return Number(
    emi.paid_amount ??
    emi.amount_paid ??
    0
  );
}

function getBalance(due, paid, emi) {
  const explicitBalance = emi.balance_due ?? emi.outstanding_amount;

  if (explicitBalance !== undefined && explicitBalance !== null) {
    return Math.max(0, Number(explicitBalance));
  }

  return Math.max(0, Number(due) - Number(paid));
}

function getEmiStatus(emi, due, paid, today) {
  const balance = getBalance(due, paid, emi);

  if (due > 0 && balance <= 0) return "paid";
  if (paid > 0 && balance > 0) return "partial";

  if (
    emi.due_date &&
    emi.due_date.slice(0, 10) < today &&
    balance > 0
  ) {
    return "overdue";
  }

  return "pending";
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

  const value = normalizedStatus(status);

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-3 py-1.5 text-[10px] font-extrabold tracking-wide ring-1 ring-inset ${
        styles[value] || "bg-slate-100 text-slate-600 ring-slate-200"
      }`}
    >
      {value.replaceAll("_", " ").toUpperCase()}
    </span>
  );
}

function StatCard({ title, value, subtitle, icon, color, onClick }) {
  const colors = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-emerald-50 text-emerald-700",
    red: "bg-red-50 text-red-700",
    violet: "bg-violet-50 text-violet-700",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className="group min-w-0 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-500">
          {title}
        </p>

        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl ${
            colors[color]
          }`}
        >
          {icon}
        </span>
      </div>

      <p className="mt-4 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
        {value}
      </p>

      <p className="mt-1 text-xs leading-5 text-slate-500">
        {subtitle}
      </p>
    </button>
  );
}

function EmptyState({ title, message }) {
  return (
    <div className="px-5 py-16 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-3xl">
        📋
      </div>

      <h3 className="mt-4 font-bold text-slate-800">
        {title}
      </h3>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        {message}
      </p>
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

const thClass =
  "whitespace-nowrap px-4 py-4 text-left text-[10px] font-extrabold uppercase tracking-wider text-slate-500";

const tdClass =
  "whitespace-nowrap px-4 py-4 text-sm text-slate-600";

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

  // ---------------------------------------
  // LOAD ALL DASHBOARD DATA
  // ---------------------------------------

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrors([]);
    setSelectedLoan(null);
    setGroupSchedules({});
    setScheduleErrors({});

    const requests = await Promise.allSettled([
      apiRequest("/api/customer/loans/"),
      apiRequest("/api/customer/emis/"),
      apiRequest("/api/group-loan/applications/"),
    ]);

    const nextErrors = [];

    let individualLoanData = [];
    let individualEmiData = [];
    let groupLoanData = [];

    if (requests[0].status === "fulfilled") {
      individualLoanData = listOf(requests[0].value);
      setIndividualLoans(individualLoanData);
    } else {
      setIndividualLoans([]);
      nextErrors.push(
        `Individual loans: ${requests[0].reason?.message || "Unable to load"}`
      );
    }

    if (requests[1].status === "fulfilled") {
      individualEmiData = listOf(requests[1].value);
      setIndividualEmis(individualEmiData);
    } else {
      setIndividualEmis([]);
      nextErrors.push(
        `Individual EMI: ${requests[1].reason?.message || "Unable to load"}`
      );
    }

    if (requests[2].status === "fulfilled") {
      groupLoanData = listOf(requests[2].value);
      setGroupLoans(groupLoanData);
    } else {
      setGroupLoans([]);
      nextErrors.push(
        `Group loans: ${requests[2].reason?.message || "Unable to load"}`
      );
    }

    // IMPORTANT:
    // Load ALL group EMI schedules automatically.
    // Earlier schedules were loaded only after clicking a group loan.
    const activeGroups = groupLoanData.filter(isDisbursed);

    const scheduleResults = await Promise.allSettled(
      activeGroups.map(async (loan) => {
        const data = await apiRequest(
          `/api/group-loan/applications/${loan.id}/installments/`
        );

        return {
          id: loan.id,
          installments: listOf(data),
        };
      })
    );

    const schedules = {};
    const scheduleErrors = {};

    scheduleResults.forEach((result, index) => {
      const loan = activeGroups[index];

      if (result.status === "fulfilled") {
        schedules[loan.id] = result.value.installments;
      } else {
        scheduleErrors[loan.id] =
          result.reason?.message || "Unable to load group EMI schedule.";

        nextErrors.push(
          `Group loan #${loan.id} EMI: ${scheduleErrors[loan.id]}`
        );
      }
    });

    setGroupSchedules(schedules);
    setScheduleErrors(scheduleErrors);
    setErrors(nextErrors);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ---------------------------------------
  // ACTIVE LOANS
  // ---------------------------------------

  const individualActive = useMemo(
    () => individualLoans.filter(isDisbursed),
    [individualLoans]
  );

  const groupActive = useMemo(
    () => groupLoans.filter(isDisbursed),
    [groupLoans]
  );

  // ---------------------------------------
  // INDIVIDUAL EMI NORMALIZATION
  // ---------------------------------------

  const normalizedEmis = useMemo(() => {
    const loanMap = new Map(
      individualLoans.map((loan) => [
        Number(loan.id),
        loan,
      ])
    );

    return individualEmis.map((emi) => {
      const loanId = Number(emi.loan?.id ?? emi.loan);
      const loan = loanMap.get(loanId);

      const due = getIndividualDue(emi);
      const paid = getIndividualPaid(emi);
      const balance = getBalance(due, paid, emi);

      return {
        ...emi,
        loanId,
        loan,
        due,
        paid,
        balance,
        displayStatus: getEmiStatus(
          emi,
          due,
          paid,
          today
        ),
      };
    });
  }, [individualEmis, individualLoans, today]);

  // ---------------------------------------
  // GROUP EMI NORMALIZATION
  // ---------------------------------------

  const groupInstallments = useMemo(() => {
    return Object.entries(groupSchedules).flatMap(
      ([applicationId, installments]) => {
        const application = groupLoans.find(
          (loan) => Number(loan.id) === Number(applicationId)
        );

        return installments.map((emi) => {
          const due = getGroupDue(emi);
          const paid = getGroupPaid(emi);
          const balance = getBalance(due, paid, emi);

          return {
            ...emi,
            applicationId: Number(applicationId),
            application,
            due,
            paid,
            balance,
            displayStatus: getEmiStatus(
              emi,
              due,
              paid,
              today
            ),
          };
        });
      }
    );
  }, [groupSchedules, groupLoans, today]);

  // ---------------------------------------
  // COMBINE LOANS
  // ---------------------------------------

  const allLoans = useMemo(() => {
    const individuals = individualActive.map((loan) => ({
      ...loan,
      recordType: "individual",
      displayName: customerName(loan),
      displayAmount: Number(
        loan.approved_amount ?? loan.requested_amount ?? 0
      ),
      displayInterest: loan.annual_interest_rate,
      displayTenure: loan.tenure_installments,
    }));

    const groups = groupActive.map((loan) => ({
      ...loan,
      recordType: "group",
      displayName: groupName(loan),
      displayAmount: Number(
        loan.approved_total ??
        loan.requested_total ??
        loan.approved_amount ??
        0
      ),
      displayInterest: loan.interest_rate,
      displayTenure: loan.tenure_months,
    }));

    return [...individuals, ...groups];
  }, [individualActive, groupActive]);

  // ---------------------------------------
  // DUE TODAY / OVERDUE
  // ---------------------------------------

  const individualDueToday = normalizedEmis.filter(
    (emi) =>
      emi.due_date?.slice(0, 10) === today &&
      emi.balance > 0 &&
      isDisbursed(emi.loan)
  );

  const individualOverdue = normalizedEmis.filter(
    (emi) =>
      emi.due_date?.slice(0, 10) < today &&
      emi.balance > 0 &&
      isDisbursed(emi.loan)
  );

  const groupDueToday = groupInstallments.filter(
    (emi) =>
      emi.due_date?.slice(0, 10) === today &&
      emi.balance > 0
  );

  const groupOverdue = groupInstallments.filter(
    (emi) =>
      emi.due_date?.slice(0, 10) < today &&
      emi.balance > 0
  );

  const dueTodayRows = [
    ...individualDueToday.map((emi) => ({
      ...emi,
      recordType: "individual",
      displayName: emi.loan ? customerName(emi.loan) : "Customer",
    })),
    ...groupDueToday.map((emi) => ({
      ...emi,
      recordType: "group",
      displayName: emi.application
        ? groupName(emi.application)
        : "Group Loan",
    })),
  ];

  const overdueRows = [
    ...individualOverdue.map((emi) => ({
      ...emi,
      recordType: "individual",
      displayName: emi.loan ? customerName(emi.loan) : "Customer",
    })),
    ...groupOverdue.map((emi) => ({
      ...emi,
      recordType: "group",
      displayName: emi.application
        ? groupName(emi.application)
        : "Group Loan",
    })),
  ];

  const dueTodayAmount = dueTodayRows.reduce(
    (sum, emi) => sum + emi.balance,
    0
  );

  const overdueAmount = overdueRows.reduce(
    (sum, emi) => sum + emi.balance,
    0
  );

  const paidInstallments =
    normalizedEmis.filter(
      (emi) => emi.displayStatus === "paid"
    ).length +
    groupInstallments.filter(
      (emi) => emi.displayStatus === "paid"
    ).length;

  const totalInstallments =
    normalizedEmis.length + groupInstallments.length;

  // ---------------------------------------
  // FILTER LOANS
  // ---------------------------------------

  const filteredLoans = useMemo(() => {
    const query = search.trim().toLowerCase();

    return allLoans.filter((loan) => {
      const matchesType =
        loanType === "all" ||
        loan.recordType === loanType;

      const matchesStatus =
        statusFilter === "all" ||
        normalizedStatus(loan.status) === statusFilter;

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
        matchesType &&
        matchesStatus &&
        (!query || searchable.includes(query))
      );
    });
  }, [allLoans, loanType, search, statusFilter]);

  // ---------------------------------------
  // OPEN EMI SCHEDULE
  // ---------------------------------------

  const openLoan = async (loan) => {
    setSelectedLoan(loan);

    if (loan.recordType !== "group") return;

    const id = loan.id;

    if (Object.prototype.hasOwnProperty.call(groupSchedules, id)) {
      return;
    }

    setScheduleLoading((prev) => ({
      ...prev,
      [id]: true,
    }));

    setScheduleErrors((prev) => ({
      ...prev,
      [id]: "",
    }));

    try {
      const data = await apiRequest(
        `/api/group-loan/applications/${id}/installments/`
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
      setScheduleLoading((prev) => ({
        ...prev,
        [id]: false,
      }));
    }
  };

  const selectedIndividualEmis =
    selectedLoan?.recordType === "individual"
      ? normalizedEmis.filter(
          (emi) => emi.loanId === Number(selectedLoan.id)
        )
      : [];

  const selectedGroupEmis =
    selectedLoan?.recordType === "group"
      ? (groupSchedules[selectedLoan.id] || []).map((emi) => {
          const due = getGroupDue(emi);
          const paid = getGroupPaid(emi);

          return {
            ...emi,
            due,
            paid,
            balance: getBalance(due, paid, emi),
            displayStatus: getEmiStatus(
              emi,
              due,
              paid,
              today
            ),
          };
        })
      : [];

  const visibleEmis =
    selectedLoan?.recordType === "group"
      ? selectedGroupEmis
      : selectedIndividualEmis;

  // ---------------------------------------
  // TABS
  // ---------------------------------------

  const tabs = [
    { id: "all", label: "All Approved Loans" },
    { id: "individual", label: "Individual" },
    { id: "group", label: "Group Loans" },
    { id: "today", label: "Today's Due" },
    { id: "overdue", label: "Overdue" },
  ];

  const changeTab = (value) => {
    setTab(value);

    if (value === "individual") setLoanType("individual");
    else if (value === "group") setLoanType("group");
    else if (value === "all") setLoanType("all");
  };

  // ---------------------------------------
  // RENDER
  // ---------------------------------------

  return (
    <div className="flex min-h-screen w-full bg-slate-50">
      <Sidebar />

      <main className="min-w-0 flex-1 overflow-x-hidden pt-16 md:pt-0">
        <div className="mx-auto w-full max-w-[1700px] space-y-6 p-3 sm:p-5 md:p-7 lg:p-8">

          {/* HEADER */}

          <header className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-900 p-6 text-white shadow-lg sm:p-8">
            <div className="pointer-events-none absolute -right-10 -top-20 h-64 w-64 rounded-full border-[35px] border-white/5" />
            <div className="pointer-events-none absolute -bottom-32 right-40 h-64 w-64 rounded-full bg-blue-400/10 blur-3xl" />

            <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-blue-200">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  SMLNEXGEN / Loan Management
                </div>

                <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
                  Approved Loans
                </h1>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100">
                  Manage approved individual and group loans,
                  monitor repayment schedules, track collections
                  and identify overdue installments.
                </p>
              </div>

              <button
                onClick={loadData}
                disabled={loading}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur transition hover:bg-white/20 disabled:opacity-50"
              >
                <span className="text-lg">↻</span>
                {loading ? "Refreshing..." : "Refresh Dashboard"}
              </button>
            </div>

            <div className="relative mt-7 flex flex-wrap gap-3">
              <span className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-xs font-semibold text-blue-100">
                Individual Loans: {individualActive.length}
              </span>

              <span className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-xs font-semibold text-blue-100">
                Group Loans: {groupActive.length}
              </span>

              <span className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-xs font-semibold text-blue-100">
                Total Installments: {totalInstallments}
              </span>
            </div>
          </header>

          {/* API ERRORS */}

          {errors.length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-3">
                <span className="text-xl">⚠️</span>

                <div className="min-w-0 flex-1">
                  <p className="font-bold text-amber-900">
                    Some information could not be loaded.
                  </p>

                  {errors.map((error, index) => (
                    <p
                      key={index}
                      className="mt-1 break-words text-xs text-amber-800"
                    >
                      {error}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STATS */}

          <section>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">
                  Loan Overview
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Real-time figures from loaded loan and EMI schedules.
                </p>
              </div>

              {loading && (
                <span className="text-xs font-semibold text-blue-700">
                  Updating...
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title="Approved / Disbursed"
                value={loading ? "..." : allLoans.length}
                subtitle={`${individualActive.length} individual · ${groupActive.length} group`}
                icon="💳"
                color="blue"
                onClick={() => changeTab("all")}
              />

              <StatCard
                title="EMIs Due Today"
                value={loading ? "..." : dueTodayRows.length}
                subtitle={`${money(dueTodayAmount)} outstanding`}
                icon="📅"
                color="green"
                onClick={() => changeTab("today")}
              />

              <StatCard
                title="Overdue EMIs"
                value={loading ? "..." : overdueRows.length}
                subtitle={`${money(overdueAmount)} outstanding`}
                icon="⚠️"
                color="red"
                onClick={() => changeTab("overdue")}
              />

              <StatCard
                title="Paid Installments"
                value={loading ? "..." : paidInstallments}
                subtitle={`${totalInstallments} installments loaded`}
                icon="✓"
                color="violet"
                onClick={() => changeTab("all")}
              />
            </div>
          </section>

          {/* LOADING */}

          {loading && !selectedLoan && (
            <div className="flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white p-10">
              <div className="h-7 w-7 animate-spin rounded-full border-4 border-blue-100 border-t-blue-700" />
              <span className="text-sm font-semibold text-slate-500">
                Loading loan information and EMI schedules...
              </span>
            </div>
          )}

          {/* SELECTED LOAN */}

          {selectedLoan ? (
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

              <div className="border-b border-blue-100 bg-gradient-to-r from-blue-50 to-white p-5 sm:p-7">
                <button
                  onClick={() => setSelectedLoan(null)}
                  className="mb-5 rounded-lg px-3 py-2 text-sm font-bold text-blue-700 transition hover:bg-blue-100"
                >
                  ← Back to approved loans
                </button>

                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-blue-700">
                      {selectedLoan.recordType === "group"
                        ? "Group Loan"
                        : "Individual Loan"} · #{selectedLoan.id}
                    </p>

                    <h2 className="mt-2 text-2xl font-extrabold text-slate-900">
                      {selectedLoan.displayName}
                    </h2>

                    <p className="mt-3 text-xs font-semibold text-slate-500">
                      Approved Amount
                    </p>

                    <p className="mt-1 text-3xl font-extrabold text-blue-800">
                      {money(selectedLoan.displayAmount)}
                    </p>
                  </div>

                  <Badge status={selectedLoan.status} />
                </div>
              </div>

              {selectedLoan.recordType === "group" &&
                scheduleLoading[selectedLoan.id] && (
                  <div className="flex items-center justify-center gap-3 p-12">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-100 border-t-blue-700" />
                    <p className="text-sm font-semibold text-slate-500">
                      Loading EMI schedule...
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
                      className="mt-3 rounded-lg bg-red-100 px-4 py-2 font-bold"
                    >
                      Retry
                    </button>
                  </div>
                )}

              {!(
                selectedLoan.recordType === "group" &&
                scheduleLoading[selectedLoan.id]
              ) && (
                <>
                  <div className="grid grid-cols-1 gap-3 border-b border-slate-100 p-5 sm:grid-cols-3 sm:p-6">
                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="text-xs font-semibold text-slate-500">
                        Interest Rate
                      </p>
                      <p className="mt-2 text-xl font-extrabold text-slate-900">
                        {selectedLoan.displayInterest ?? "—"}%
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-4">
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

                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="text-xs font-semibold text-slate-500">
                        Total Installments
                      </p>
                      <p className="mt-2 text-xl font-extrabold text-slate-900">
                        {visibleEmis.length}
                      </p>
                    </div>
                  </div>

                  {selectedLoan.recordType === "group" &&
                  visibleEmis.length === 0 &&
                  !scheduleErrors[selectedLoan.id] ? (
                    <EmptyState
                      title="EMI schedule not found"
                      message="This group application has no saved installments. Generate its EMI schedule from Loan Processing."
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
                            const groupLoan =
                              selectedLoan.recordType === "group";

                            const due = groupLoan
                              ? getGroupDue(emi)
                              : getIndividualDue(emi);

                            const paid = groupLoan
                              ? getGroupPaid(emi)
                              : getIndividualPaid(emi);

                            const balance = getBalance(
                              due,
                              paid,
                              emi
                            );

                            const status = getEmiStatus(
                              emi,
                              due,
                              paid,
                              today
                            );

                            return (
                              <tr
                                key={emi.id}
                                className="transition hover:bg-blue-50/50"
                              >
                                <td className={`${tdClass} font-bold text-slate-900`}>
                                  {emi.installment_number ?? "—"}
                                </td>

                                <td className={tdClass}>
                                  {emi.due_date || "—"}
                                </td>

                                <td className={tdClass}>
                                  {money(
                                    groupLoan
                                      ? emi.principal_due
                                      : emi.principal_amount
                                  )}
                                </td>

                                <td className={tdClass}>
                                  {money(
                                    groupLoan
                                      ? emi.interest_due
                                      : emi.interest_amount
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
                                  <Badge status={status} />
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
                                  No EMI schedule found.
                                </td>
                              </tr>
                            )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </section>
          ) : (
            <>
              {/* TABS */}

              <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
                <div className="flex gap-2 overflow-x-auto">
                  {tabs.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => changeTab(item.id)}
                      className={`shrink-0 rounded-xl px-4 py-3 text-xs font-bold transition sm:text-sm ${
                        tab === item.id
                          ? "bg-blue-700 text-white shadow-md"
                          : "text-slate-600 hover:bg-blue-50 hover:text-blue-700"
                      }`}
                    >
                      {item.label}

                      {item.id === "overdue" &&
                        overdueRows.length > 0 && (
                          <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-[10px] text-red-700">
                            {overdueRows.length}
                          </span>
                        )}

                      {item.id === "today" &&
                        dueTodayRows.length > 0 && (
                          <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] text-blue-700">
                            {dueTodayRows.length}
                          </span>
                        )}
                    </button>
                  ))}
                </div>
              </div>

              {/* TODAY / OVERDUE TABLE */}

              {tab === "today" || tab === "overdue" ? (
                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:p-6">
                    <div>
                      <h2 className="text-lg font-extrabold text-slate-900">
                        {tab === "today"
                          ? "Today's EMI Due"
                          : "Overdue EMI Register"}
                      </h2>

                      <p className="mt-1 text-xs text-slate-500">
                        {tab === "today"
                          ? "All outstanding installments due today."
                          : "All unpaid and partially paid installments past their due date."}
                      </p>
                    </div>

                    <div className="rounded-xl bg-red-50 px-4 py-3">
                      <p className="text-[10px] font-bold uppercase text-red-600">
                        {tab === "today"
                          ? "Today's Outstanding"
                          : "Total Overdue"}
                      </p>

                      <p className="mt-1 text-lg font-extrabold text-red-700">
                        {money(
                          tab === "today"
                            ? dueTodayAmount
                            : overdueAmount
                        )}
                      </p>
                    </div>
                  </div>

                  {(() => {
                    const rows =
                      tab === "today"
                        ? dueTodayRows
                        : overdueRows;

                    if (!rows.length) {
                      return (
                        <EmptyState
                          title={
                            tab === "today"
                              ? "No EMI due today"
                              : "No overdue installments"
                          }
                          message={
                            tab === "today"
                              ? "There are no outstanding installments due today."
                              : "There are no outstanding installments past their due date in the loaded schedules."
                          }
                        />
                      );
                    }

                    return (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[800px] text-left">
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
                            {rows.map((emi) => (
                              <tr
                                key={`${emi.recordType}-${emi.id}`}
                                className="transition hover:bg-blue-50/50"
                              >
                                <td className={tdClass}>
                                  <span className={`rounded-lg px-2.5 py-1 text-[10px] font-extrabold ${
                                    emi.recordType === "group"
                                      ? "bg-violet-50 text-violet-700"
                                      : "bg-sky-50 text-sky-700"
                                  }`}>
                                    {emi.recordType.toUpperCase()}
                                  </span>
                                </td>

                                <td className={`${tdClass} font-bold text-slate-900`}>
                                  {emi.displayName}
                                </td>

                                <td className={tdClass}>
                                  {emi.installment_number ?? "—"}
                                </td>

                                <td className={tdClass}>
                                  {emi.due_date}
                                </td>

                                <td className={`${tdClass} font-semibold`}>
                                  {money(emi.due)}
                                </td>

                                <td className={`${tdClass} text-emerald-700`}>
                                  {money(emi.paid)}
                                </td>

                                <td className={`${tdClass} font-extrabold text-red-700`}>
                                  {money(emi.balance)}
                                </td>

                                <td className={tdClass}>
                                  <Badge status={emi.displayStatus} />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}
                </section>
              ) : (
                /* APPROVED LOANS REGISTER */

                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex flex-col gap-5 border-b border-slate-100 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <h2 className="text-lg font-extrabold text-slate-900">
                        Approved Loans Register
                      </h2>

                      <p className="mt-1 text-xs text-slate-500">
                        {filteredLoans.length} loan records found
                      </p>
                    </div>

                    <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:max-w-2xl lg:grid-cols-3">
                      <input
                        value={search}
                        onChange={(event) =>
                          setSearch(event.target.value)
                        }
                        placeholder="Search customer / loan"
                        className={inputClass}
                      />

                      <select
                        value={loanType}
                        onChange={(event) =>
                          setLoanType(event.target.value)
                        }
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

                  {filteredLoans.length === 0 ? (
                    <EmptyState
                      title="No approved loans found"
                      message="Try changing your filters or check whether the loan application has been approved or disbursed."
                    />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[1050px] text-left">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className={thClass}>Loan / Customer</th>
                            <th className={thClass}>Type</th>
                            <th className={thClass}>Approved Amount</th>
                            <th className={thClass}>Interest</th>
                            <th className={thClass}>Tenure</th>
                            <th className={thClass}>Repayment</th>
                            <th className={thClass}>Status</th>
                            <th className={thClass}>Action</th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100">
                          {filteredLoans.map((loan) => (
                            <tr
                              key={`${loan.recordType}-${loan.id}`}
                              className="transition hover:bg-blue-50/40"
                            >
                              <td className="px-4 py-4">
                                <p className="font-bold text-slate-900">
                                  {loan.recordType === "group"
                                    ? `Group Loan #${loan.id}`
                                    : `Loan #${loan.id}`}
                                </p>

                                <p className="mt-1 text-xs text-slate-500">
                                  {loan.displayName}
                                </p>

                                {loan.application_number && (
                                  <p className="mt-1 text-[10px] text-slate-400">
                                    {loan.application_number}
                                  </p>
                                )}
                              </td>

                              <td className={tdClass}>
                                <span
                                  className={`rounded-lg px-2.5 py-1 text-[10px] font-extrabold ${
                                    loan.recordType === "group"
                                      ? "bg-violet-50 text-violet-700"
                                      : "bg-sky-50 text-sky-700"
                                  }`}
                                >
                                  {loan.recordType.toUpperCase()}
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
                                  className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-blue-800"
                                >
                                  View EMI
                                  <span>→</span>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/70 px-5 py-4">
                    <p className="text-xs text-slate-500">
                      Total approved / disbursed loans
                    </p>

                    <p className="rounded-lg bg-white px-3 py-1.5 text-sm font-extrabold text-slate-800 shadow-sm">
                      {filteredLoans.length}
                    </p>
                  </div>
                </section>
              )}
            </>
          )}

          {/* FOOTER */}

          <footer className="flex flex-col justify-between gap-2 rounded-xl border border-slate-200 bg-white px-5 py-4 text-xs text-slate-500 sm:flex-row sm:items-center">
            <p>
              © {new Date().getFullYear()}{" "}
              <span className="font-extrabold text-slate-800">
                SMLNEXGEN
              </span>
              {" · "}Microfinance Management System
            </p>

            <p>
              Loan Administration · EMI Monitoring
            </p>
          </footer>
        </div>
      </main>
    </div>
  );
}
