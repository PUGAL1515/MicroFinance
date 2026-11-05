
import { useCallback, useEffect, useState } from "react";
import { loanApi } from "../loanApi";

import GroupLoanStats from "../components/GroupLoanStats";
import GroupLoanPlanForm from "../components/GroupLoanPlanForm";
import GroupLoanPlanList from "../components/GroupLoanPlanList";
import GroupCreateForm from "../components/GroupCreateForm";
import GroupMemberManager from "../components/GroupMemberManager";
import GroupLoanReports from "../components/GroupLoanReports";
import GroupLoanCollection from "../components/GroupLoanCollection";
import KYCVerification from "../../customer/components/KYCVerification";
import GroupKYCVerification from "../../customer/components/GroupKYCVerification";
import GroupLoanWorkflow from "../components/GroupLoanWorkflow";

/* =====================================================
   NAVIGATION
===================================================== */

const navigation = [
  { id: "dashboard", label: "Overview", icon: "▦" },
  { id: "plans", label: "Loan Plans", icon: "▤" },
  { id: "groups", label: "Groups", icon: "♧" },
  { id: "members", label: "Members", icon: "♙" },
  { id: "kyc", label: "KYC Verification", icon: "✓" },
  { id: "loan-processing", label: "Loan Processing", icon: "₹" },
  { id: "loan-collections", label: "Collections", icon: "⇄" },
  { id: "reports", label: "Reports", icon: "▥" },
];

const pageTitles = {
  dashboard: {
    title: "Group Loan Dashboard",
    description:
      "Monitor group lending performance, loan plans and member activities.",
    eyebrow: "Dashboard",
  },
  plans: {
    title: "Loan Plans",
    description:
      "Create, configure and manage group lending schemes.",
    eyebrow: "Loan Configuration",
  },
  groups: {
    title: "Group Management",
    description:
      "Create borrower groups and manage their loan membership.",
    eyebrow: "Borrower Management",
  },
  members: {
    title: "Group Members",
    description:
      "View and manage customers associated with borrower groups.",
    eyebrow: "Member Management",
  },
  kyc: {
    title: "KYC Verification",
    description:
      "Manage customer documents and monitor group verification readiness.",
    eyebrow: "Compliance & Verification",
  },
  "loan-processing": {
    title: "Loan Processing",
    description:
      "Manage applications, approvals, disbursement and EMI schedules.",
    eyebrow: "Loan Operations",
  },
  "loan-collections": {
    title: "Loan Collections",
    description:
      "Manage disbursed loans, installment schedules and repayments.",
    eyebrow: "Repayment Management",
  },
  reports: {
    title: "Group Loan Reports",
    description:
      "Review lending performance and repayment summaries.",
    eyebrow: "Analytics & Reports",
  },
};

/* =====================================================
   HELPERS
===================================================== */

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

/* =====================================================
   LOADING COMPONENT
===================================================== */

function LoadingState() {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-14 shadow-sm">
      <div className="h-11 w-11 animate-spin rounded-full border-[4px] border-blue-100 border-t-blue-700" />

      <h3 className="mt-5 text-sm font-bold text-slate-800">
        Loading group loan data
      </h3>

      <p className="mt-2 text-center text-xs text-slate-500">
        Please wait while we fetch the latest information.
      </p>
    </div>
  );
}

/* =====================================================
   ERROR COMPONENT
===================================================== */

function ErrorState({ error, onRetry }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-white p-5 shadow-sm sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-50 text-2xl text-red-600">
          ⚠
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-slate-900">
            Unable to load group loan data
          </h3>

          <p className="mt-2 break-words whitespace-pre-line text-sm leading-6 text-red-600">
            {error}
          </p>

          <button
            type="button"
            onClick={onRetry}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-800 sm:w-auto"
          >
            ↻ Try Again
          </button>
        </div>
      </div>
    </div>
  );
}

/* =====================================================
   GROUP STATUS BADGE
===================================================== */

function GroupStatus({ status }) {
  const normalized = String(status || "forming").toLowerCase();

  const styles = {
    active: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    forming: "bg-amber-50 text-amber-700 ring-amber-200",
    pending: "bg-blue-50 text-blue-700 ring-blue-200",
    closed: "bg-slate-100 text-slate-600 ring-slate-200",
  };

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-3 py-1.5 text-[10px] font-extrabold tracking-wide ring-1 ring-inset ${
        styles[normalized] ||
        "bg-slate-100 text-slate-600 ring-slate-200"
      }`}
    >
      {normalized.replaceAll("_", " ").toUpperCase()}
    </span>
  );
}

/* =====================================================
   GROUP MANAGEMENT COMPONENT
===================================================== */

export default function GroupLoanManagement() {
  const [active, setActive] = useState("dashboard");

  const [plans, setPlans] = useState([]);
  const [groups, setGroups] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editingPlan, setEditingPlan] = useState(null);
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [showGroupForm, setShowGroupForm] = useState(false);

  /* =====================================================
     LOAD API DATA
  ===================================================== */

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [planData, groupData] = await Promise.all([
        loanApi.getPlans(),
        loanApi.getGroups(),
      ]);

      setPlans(normalizeList(planData));
      setGroups(normalizeList(groupData));
    } catch (err) {
      setError(
        err.message ||
          "Unable to load group loan data. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* =====================================================
     NAVIGATION HANDLERS
  ===================================================== */

  const changePage = (page) => {
    setActive(page);
    setShowPlanForm(false);
    setEditingPlan(null);
    setShowGroupForm(false);
    setError("");
  };

  const savedPlan = async () => {
    setShowPlanForm(false);
    setEditingPlan(null);
    await loadData();
  };

  const savedGroup = async () => {
    setShowGroupForm(false);
    await loadData();
  };

  const openPlanCreate = () => {
    setEditingPlan(null);
    setShowPlanForm(true);
  };

  const openPlanEdit = (plan) => {
    setEditingPlan(plan);
    setShowPlanForm(true);
  };

  /* =====================================================
     GROUP TABLE AND MOBILE CARDS
  ===================================================== */

  const renderGroups = () => (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

      {/* Section Header */}

      <div className="flex flex-col gap-4 border-b border-slate-100 p-4 sm:p-6 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-600" />

            <span className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-blue-700">
              Group Management
            </span>
          </div>

          <h2 className="mt-2 text-lg font-extrabold text-slate-900 sm:text-xl">
            Registered Groups
          </h2>

          <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
            View borrower groups, loan plans and membership details.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowGroupForm(true)}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-800 active:scale-[0.98] md:w-auto"
        >
          <span className="text-xl leading-none">+</span>
          Create Group
        </button>
      </div>

      {groups.length === 0 ? (
        <div className="px-5 py-16 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-3xl text-blue-700">
            ♧
          </div>

          <h3 className="mt-5 font-bold text-slate-800">
            No groups found
          </h3>

          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
            Create your first borrower group to get started with group lending.
          </p>

          <button
            type="button"
            onClick={() => setShowGroupForm(true)}
            className="mt-5 rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-800"
          >
            + Create Your First Group
          </button>
        </div>
      ) : (
        <>
          {/* Desktop Table */}

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50">
                <tr>
                  {[
                    "Group Name",
                    "Group Code",
                    "Loan Plan",
                    "Members",
                    "Status",
                    "Action",
                  ].map((heading) => (
                    <th
                      key={heading}
                      className="whitespace-nowrap px-5 py-4 text-[10px] font-extrabold uppercase tracking-wider text-slate-500"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {groups.map((group) => (
                  <tr
                    key={group.id}
                    className="transition hover:bg-blue-50/40"
                  >
                    <td className="px-5 py-4">
                      <p className="font-bold text-slate-900">
                        {group.name || "Unnamed Group"}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        Group ID: #{group.id}
                      </p>
                    </td>

                    <td className="px-5 py-4 font-medium text-slate-600">
                      {group.group_code || "—"}
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {group.plan_name || group.plan || "—"}
                    </td>

                    <td className="px-5 py-4">
                      <span className="inline-flex min-w-9 justify-center rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-extrabold text-blue-700">
                        {group.active_member_count ??
                          group.member_count ??
                          0}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <GroupStatus status={group.status} />
                    </td>

                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => changePage("members")}
                        className="whitespace-nowrap rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-50"
                      >
                        View Members →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}

          <div className="grid gap-3 p-3 md:hidden">
            {groups.map((group) => (
              <article
                key={group.id}
                className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-blue-200"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="break-words text-sm font-extrabold text-slate-900">
                      {group.name || "Unnamed Group"}
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      {group.group_code || `Group #${group.id}`}
                    </p>
                  </div>

                  <GroupStatus status={group.status} />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      Loan Plan
                    </p>

                    <p className="mt-1 break-words text-sm font-bold text-slate-800">
                      {group.plan_name || group.plan || "—"}
                    </p>
                  </div>

                  <div className="rounded-xl bg-blue-50 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-blue-600">
                      Active Members
                    </p>

                    <p className="mt-1 text-xl font-extrabold text-blue-800">
                      {group.active_member_count ??
                        group.member_count ??
                        0}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => changePage("members")}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs font-extrabold text-blue-700 transition hover:bg-blue-100"
                >
                  Manage Group Members
                  <span>→</span>
                </button>
              </article>
            ))}
          </div>
        </>
      )}

      {/* Footer */}

      <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-4 py-4 sm:px-6">
        <span className="text-xs font-medium text-slate-500">
          Total registered groups
        </span>

        <span className="rounded-lg bg-white px-3 py-1.5 text-sm font-extrabold text-slate-800 shadow-sm">
          {groups.length}
        </span>
      </div>
    </section>
  );

  /* =====================================================
     PAGE CONTENT
  ===================================================== */

  const renderContent = () => {
    if (loading) {
      return <LoadingState />;
    }

    if (
      error &&
      active !== "kyc" &&
      active !== "loan-processing"
    ) {
      return <ErrorState error={error} onRetry={loadData} />;
    }

    /* DASHBOARD */

    if (active === "dashboard") {
      return (
        <div className="space-y-5 sm:space-y-6">
          <GroupLoanStats
            plans={plans}
            groups={groups}
            loading={loading}
          />

          <div className="grid grid-cols-1 gap-5 2xl:grid-cols-2 sm:gap-6">
            <GroupLoanPlanList
              plans={plans.slice(0, 5)}
              onCreate={() => {
                setActive("plans");
                openPlanCreate();
              }}
              onEdit={(plan) => {
                setActive("plans");
                openPlanEdit(plan);
              }}
            />

            {renderGroups()}
          </div>
        </div>
      );
    }

    /* LOAN PLANS */

    if (active === "plans") {
      if (showPlanForm) {
        return (
          <GroupLoanPlanForm
            editingPlan={editingPlan}
            onSaved={savedPlan}
            onCancel={() => {
              setShowPlanForm(false);
              setEditingPlan(null);
            }}
          />
        );
      }

      return (
        <GroupLoanPlanList
          plans={plans}
          onCreate={openPlanCreate}
          onEdit={openPlanEdit}
        />
      );
    }

    /* GROUPS */

    if (active === "groups") {
      if (showGroupForm) {
        return (
          <GroupCreateForm
            plans={plans}
            onSaved={savedGroup}
            onCancel={() => setShowGroupForm(false)}
          />
        );
      }

      return renderGroups();
    }

    /* MEMBERS */

    if (active === "members") {
      return <GroupMemberManager groups={groups} />;
    }

    /* KYC */

    if (active === "kyc") {
      return (
        <div className="space-y-5 sm:space-y-7">
          <KYCVerification />

          <GroupKYCVerification groups={groups} />
        </div>
      );
    }

    /* LOAN PROCESSING */

    if (active === "loan-processing") {
      return <GroupLoanWorkflow groups={groups} />;
    }

    /* COLLECTIONS */

    if (active === "loan-collections") {
      return <GroupLoanCollection groups={groups} />;
    }

    /* REPORTS */

    if (active === "reports") {
      return (
        <GroupLoanReports
          groups={groups}
          plans={plans}
        />
      );
    }

    return null;
  };

  /* =====================================================
     DYNAMIC PAGE HEADING
  ===================================================== */

  const page = pageTitles[active] || pageTitles.dashboard;

  const heading =
    showPlanForm && active === "plans"
      ? editingPlan
        ? "Edit Loan Plan"
        : "Create Loan Plan"
      : showGroupForm && active === "groups"
        ? "Create Group"
        : page.title;

  const description =
    showPlanForm && active === "plans"
      ? "Configure loan terms and update the plan details."
      : showGroupForm && active === "groups"
        ? "Register a borrower group and associate it with a loan plan."
        : page.description;

  /* =====================================================
     MAIN UI
  ===================================================== */

  return (
    <div className="min-h-full w-full overflow-x-hidden bg-slate-50 text-slate-800">

      {/* =================================================
          TOP HEADER
      ================================================= */}

      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur-xl">

        <div className="mx-auto max-w-[1800px] px-3 sm:px-5 lg:px-8">

          {/* Brand Header */}

          <div className="flex min-h-[68px] items-center justify-between gap-3 sm:min-h-[76px]">

            <div className="flex min-w-0 items-center gap-3">

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-700 to-indigo-950 text-xl font-black text-white shadow-md sm:h-12 sm:w-12 sm:rounded-2xl">
                S
              </div>

              <div className="min-w-0">
                <h2 className="truncate text-base font-extrabold tracking-tight text-slate-900 sm:text-lg">
                  SMLNEXGEN
                </h2>

                <p className="hidden text-[10px] font-medium tracking-wide text-slate-500 sm:block sm:text-xs">
                  MICROFINANCE MANAGEMENT SYSTEM
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 sm:gap-3">

              <div className="hidden text-right md:block">
                <p className="text-sm font-bold text-slate-800">
                  Group Lending
                </p>

                <p className="text-[11px] text-slate-500">
                  Loan Administration
                </p>
              </div>

              <div className="hidden h-9 w-px bg-slate-200 md:block" />

              <button
                type="button"
                onClick={loadData}
                disabled={loading}
                aria-label="Refresh group loan data"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4"
              >
                <span className={loading ? "animate-spin" : ""}>
                  ↻
                </span>

                <span className="hidden sm:inline">
                  {loading ? "Refreshing..." : "Refresh"}
                </span>
              </button>

            </div>
          </div>

          {/* =================================================
              DESKTOP NAVIGATION
          ================================================= */}

          <nav
            aria-label="Group loan navigation"
            className="hidden overflow-x-auto border-t border-slate-100 md:flex md:gap-1"
          >
            {navigation.map((item) => {
              const selected = active === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => changePage(item.id)}
                  aria-current={selected ? "page" : undefined}
                  className={`relative flex shrink-0 items-center gap-2 px-3 py-4 text-xs font-bold transition lg:px-4 lg:text-sm ${
                    selected
                      ? "text-blue-800"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-lg text-sm ${
                      selected
                        ? "bg-blue-100 text-blue-800"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {item.icon}
                  </span>

                  {item.label}

                  {selected && (
                    <span className="absolute inset-x-3 bottom-0 h-[3px] rounded-full bg-blue-700" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* =================================================
              MOBILE NAVIGATION
          ================================================= */}

          <div className="border-t border-slate-100 py-2.5 md:hidden">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                Navigation
              </span>

              <span className="text-[10px] font-bold text-blue-700">
                {navigation.find((item) => item.id === active)?.label}
              </span>
            </div>

            <nav
              aria-label="Mobile group loan navigation"
              className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {navigation.map((item) => {
                const selected = active === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => changePage(item.id)}
                    aria-current={selected ? "page" : undefined}
                    className={`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold transition active:scale-95 ${
                      selected
                        ? "border-blue-700 bg-blue-700 text-white shadow-sm"
                        : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50"
                    }`}
                  >
                    <span className="text-sm">
                      {item.icon}
                    </span>

                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>

        </div>
      </header>

      {/* =================================================
          MAIN CONTENT
      ================================================= */}

      <main className="mx-auto w-full max-w-[1800px] px-3 py-5 sm:px-5 sm:py-7 lg:px-8 lg:py-8">

        {/* PAGE HEADING */}

        <div className="mb-5 flex flex-col gap-4 sm:mb-7 sm:flex-row sm:items-center sm:justify-between">

          <div className="min-w-0">

            <div className="mb-2 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />

              <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-blue-700">
                {page.eyebrow}
              </span>
            </div>

            <h1 className="break-words text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl lg:text-[32px]">
              {heading}
            </h1>

            <p className="mt-2 max-w-3xl text-xs leading-6 text-slate-500 sm:text-sm">
              {description}
            </p>

          </div>

          <div className="flex w-fit shrink-0 items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>

            <span className="text-[10px] font-extrabold tracking-wide text-emerald-700">
              GROUP LENDING
            </span>
          </div>

        </div>

        {/* CONTENT */}

        <div className="min-w-0">
          {renderContent()}
        </div>

        {/* =================================================
            FOOTER
        ================================================= */}

        <footer className="mt-8 flex flex-col gap-2 border-t border-slate-200 py-5 text-center sm:mt-10 sm:flex-row sm:items-center sm:justify-between sm:text-left">

          <p className="text-[11px] leading-5 text-slate-500">
            © {new Date().getFullYear()}{" "}
            <span className="font-extrabold text-slate-700">
              SMLNEXGEN
            </span>
            . All rights reserved.
          </p>

          <p className="text-[11px] font-medium text-slate-400">
            Microfinance Management System · Group Loan Administration
          </p>

        </footer>

      </main>
    </div>
  );
}
