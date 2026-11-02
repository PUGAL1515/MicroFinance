import { useCallback, useEffect, useState } from "react";
import { loanApi } from "../loanApi";

import GroupLoanStats from "../components/GroupLoanStats";
import GroupLoanPlanForm from "../components/GroupLoanPlanForm";
import GroupLoanPlanList from "../components/GroupLoanPlanList";
import GroupCreateForm from "../components/GroupCreateForm";
import GroupMemberManager from "../components/GroupMemberManager";
import GroupLoanReports from "../components/GroupLoanReports";

import KYCVerification from "../../customer/components/KYCVerification";
import GroupKYCVerification from "../../customer/components/GroupKYCVerification";
import GroupLoanWorkflow from "../components/GroupLoanWorkflow";

const navigation = [
  { id: "dashboard", label: "Overview", icon: "▦" },
  { id: "plans", label: "Loan Plans", icon: "▤" },
  { id: "groups", label: "Groups", icon: "♧" },
  { id: "members", label: "Members", icon: "♙" },
  { id: "kyc", label: "KYC Verification", icon: "✓" },
  { id: "loan-processing", label: "Loan Processing", icon: "₹" },
  { id: "reports", label: "Reports", icon: "▥" },
];

const pageTitles = {
  dashboard: {
    title: "Group Loan Dashboard",
    description: "Monitor group lending, plans and member activity.",
  },
  plans: {
    title: "Group Loan Plans",
    description: "Configure and manage group loan plans.",
  },
  groups: {
    title: "Manage Groups",
    description: "Create borrower groups and manage membership.",
  },
  members: {
    title: "Group Members",
    description: "Manage active customers associated with groups.",
  },
  kyc: {
    title: "KYC Verification",
    description: "Verify every member's identity and address documents.",
  },
  "loan-processing": {
    title: "Loan Processing",
    description:
      "Submit applications, approve loans, generate EMI schedules and record collections.",
  },
  reports: {
    title: "Group Loan Reports",
    description: "Review lending and repayment summaries.",
  },
};

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

export default function GroupLoanManagement() {
  const [active, setActive] = useState("dashboard");
  const [plans, setPlans] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingPlan, setEditingPlan] = useState(null);
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [showGroupForm, setShowGroupForm] = useState(false);

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
        err.message || "Unable to load group loan data. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  const renderGroups = () => (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Registered Groups
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            View borrower groups and their member counts.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowGroupForm(true)}
          className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
        >
          + Create Group
        </button>
      </div>

      {groups.length === 0 ? (
        <div className="px-6 py-14 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl text-slate-500">
            ♧
          </div>
          <h3 className="mt-4 font-semibold text-slate-800">No groups found</h3>
          <p className="mt-1 text-sm text-slate-500">
            Create your first borrower group to get started.
          </p>
          <button
            type="button"
            onClick={() => setShowGroupForm(true)}
            className="mt-5 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
          >
            + Create your first group
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-4">Group Name</th>
                <th className="px-5 py-4">Group Code</th>
                <th className="px-5 py-4">Loan Plan</th>
                <th className="px-5 py-4">Members</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {groups.map((group) => {
                const status = String(group.status || "forming");
                const isActive = status === "active";

                return (
                  <tr key={group.id} className="transition hover:bg-blue-50/40">
                    <td className="px-5 py-4 font-semibold text-slate-900">
                      {group.name || "Unnamed Group"}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {group.group_code || "—"}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {group.plan_name || group.plan || "—"}
                    </td>
                    <td className="px-5 py-4">
                      <span className="rounded-lg bg-blue-50 px-3 py-1 font-semibold text-blue-700">
                        {group.active_member_count ?? group.member_count ?? 0}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          isActive
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => changePage("members")}
                        className="rounded-lg border border-slate-200 px-3 py-2 font-medium text-blue-700 hover:bg-blue-50"
                      >
                        View Members
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
        Total registered groups:{" "}
        <span className="font-semibold text-slate-700">{groups.length}</span>
      </div>
    </section>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-blue-100 border-t-blue-700" />
          <p className="mt-4 text-sm font-medium text-slate-600">
            Loading group loan data...
          </p>
        </div>
      );
    }

    if (error && active !== "kyc" && active !== "loan-processing") {
      return (
        <div className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
          <h3 className="font-bold text-slate-900">
            Unable to load group loan data
          </h3>
          <p className="mt-2 whitespace-pre-line text-sm text-red-600">
            {error}
          </p>
          <button
            type="button"
            onClick={loadData}
            className="mt-4 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      );
    }

    if (active === "dashboard") {
      return (
        <div className="space-y-6">
          <GroupLoanStats plans={plans} groups={groups} loading={loading} />

          <div className="grid grid-cols-1 gap-6 2xl:grid-cols-2">
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

    if (active === "members") {
      return <GroupMemberManager groups={groups} />;
    }

    if (active === "kyc") {
      return (
        <div className="space-y-8">
          <KYCVerification />
          <GroupKYCVerification groups={groups} />
        </div>
      );
    }

    if (active === "loan-processing") {
      return <GroupLoanWorkflow groups={groups} />;
    }

    if (active === "reports") {
      return <GroupLoanReports groups={groups} plans={plans} />;
    }

    return null;
  };

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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-[1800px] px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-700 to-indigo-900 text-xl font-bold text-white shadow-md">
                S
              </div>
              <div>
                <p className="text-lg font-extrabold tracking-tight text-slate-900">
                  SMLNEXGEN
                </p>
                <p className="text-xs font-medium text-slate-500">
                  Microfinance Management System
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold text-slate-800">
                  Group Lending
                </p>
                <p className="text-xs text-slate-500">Loan administration</p>
              </div>
              <button
                type="button"
                onClick={loadData}
                disabled={loading}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {loading ? "Refreshing..." : "↻ Refresh"}
              </button>
            </div>
          </div>

          <nav
            aria-label="Group loan navigation"
            className="mt-4 flex gap-1 overflow-x-auto border-t border-slate-100 pt-3"
          >
            {navigation.map((item) => {
              const selected = active === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => changePage(item.id)}
                  aria-current={selected ? "page" : undefined}
                  className={`relative flex shrink-0 items-center gap-2 rounded-t-xl px-4 py-3 text-sm font-semibold transition ${
                    selected
                      ? "bg-blue-50 text-blue-800"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <span aria-hidden="true">{item.icon}</span>
                  {item.label}
                  {selected && (
                    <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-blue-700" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1800px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-blue-700">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
              Lending Management
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              {heading}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 sm:text-base">
              {description}
            </p>
          </div>

          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Group Lending
          </span>
        </div>

        {renderContent()}

        <footer className="mt-10 flex flex-col gap-2 border-t border-slate-200 py-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} SMLNEXGEN. Microfinance Management.
          </p>
          <p>Group Loan Administration</p>
        </footer>
      </main>
    </div>
  );
}
