
import { formatINR } from "./GroupLoanStats";

export default function GroupLoanReports({ groups, plans }) {
  const activeGroups = groups.filter((g) => g.status === "active");
  const formingGroups = groups.filter(
    (g) => g.status === "forming" || g.status === "pending",
  );

  const summaryCards = [
    {
      label: "Total Groups",
      value: groups.length,
      icon: "👥",
      iconBg: "bg-blue-50",
      iconColor: "text-blue-700",
      description: "All registered groups",
    },
    {
      label: "Active Groups",
      value: activeGroups.length,
      icon: "✓",
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-700",
      description: "Currently active groups",
    },
    {
      label: "Forming / Pending",
      value: formingGroups.length,
      icon: "◷",
      iconBg: "bg-amber-50",
      iconColor: "text-amber-700",
      description: "Groups awaiting activation",
    },
  ];

  const getStatusStyle = (status) => {
    switch (status) {
      case "active":
        return "bg-emerald-50 text-emerald-700";
      case "forming":
        return "bg-blue-50 text-blue-700";
      case "pending":
        return "bg-amber-50 text-amber-700";
      default:
        return "bg-slate-100 text-slate-600";
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700">
              Group Loan Management
            </span>
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Group Loan Reports
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Overview of groups and configured loan plans.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm sm:self-auto">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="text-xs font-semibold text-slate-600">
            Report Overview
          </span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {summaryCards.map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  {item.label}
                </p>

                <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
                  {item.value}
                </p>
              </div>

              <div
                className={`flex h-12 w-12 items-center justify-center rounded-xl text-2xl font-bold ${item.iconBg} ${item.iconColor}`}
              >
                {item.icon}
              </div>
            </div>

            <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-400">
              {item.description}
            </p>
          </div>
        ))}
      </div>

      {/* Group Summary */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-xl">
              👥
            </div>

            <div>
              <h3 className="font-bold text-slate-900">Group Summary</h3>
              <p className="mt-1 text-xs text-slate-500">
                Group-wise plan and membership details.
              </p>
            </div>
          </div>

          <span className="w-fit rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
            {groups.length} Groups
          </span>
        </div>

        {groups.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
              📋
            </div>
            <h4 className="mt-4 font-semibold text-slate-800">
              No Groups Available
            </h4>
            <p className="mt-1 text-sm text-slate-500">
              Group details will appear here once groups are created.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-4 font-semibold">Group</th>
                    <th className="px-5 py-4 font-semibold">Group Code</th>
                    <th className="px-5 py-4 font-semibold">Loan Plan</th>
                    <th className="px-5 py-4 font-semibold">Members</th>
                    <th className="px-5 py-4 font-semibold">Status</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {groups.map((group) => (
                    <tr
                      key={group.id}
                      className="transition-colors hover:bg-blue-50/30"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 font-bold text-blue-700">
                            {group.name?.charAt(0)?.toUpperCase() || "G"}
                          </div>

                          <div>
                            <p className="font-semibold text-slate-800">
                              {group.name}
                            </p>
                            <p className="mt-1 text-xs text-slate-400">
                              Group ID: {group.id}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
                          {group.group_code}
                        </span>
                      </td>

                      <td className="px-5 py-4 font-medium text-slate-700">
                        {plans.find((p) => p.id === group.plan)?.name ||
                          `Plan #${group.plan}`}
                      </td>

                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-2 font-semibold text-slate-700">
                          <span className="text-slate-400">👥</span>
                          {group.member_count ?? "—"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold capitalize ${getStatusStyle(
                            group.status,
                          )}`}
                        >
                          {group.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Group Cards */}
            <div className="grid grid-cols-1 gap-3 p-4 md:hidden">
              {groups.map((group) => (
                <div
                  key={group.id}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 font-bold text-blue-700">
                        {group.name?.charAt(0)?.toUpperCase() || "G"}
                      </div>

                      <div className="min-w-0">
                        <h4 className="truncate font-bold text-slate-900">
                          {group.name}
                        </h4>
                        <p className="mt-1 text-xs text-slate-400">
                          ID: {group.id}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ${getStatusStyle(
                        group.status,
                      )}`}
                    >
                      {group.status}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3">
                    <div>
                      <p className="text-xs text-slate-500">Group Code</p>
                      <p className="mt-1 break-all text-sm font-semibold text-slate-800">
                        {group.group_code}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">Members</p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">
                        {group.member_count ?? "—"}
                      </p>
                    </div>

                    <div className="col-span-2">
                      <p className="text-xs text-slate-500">Loan Plan</p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">
                        {plans.find((p) => p.id === group.plan)?.name ||
                          `Plan #${group.plan}`}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {/* Configured Plans */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-100 p-5 sm:px-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-xl">
            📑
          </div>

          <div>
            <h3 className="font-bold text-slate-900">Configured Plans</h3>
            <p className="mt-1 text-xs text-slate-500">
              Loan limits and repayment configuration.
            </p>
          </div>
        </div>

        <div className="space-y-3 p-4 sm:p-5">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="flex flex-col gap-4 rounded-xl border border-slate-100 bg-slate-50/70 p-4 transition hover:border-blue-100 hover:bg-blue-50/30 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white font-bold text-blue-700 shadow-sm">
                  {plan.name?.charAt(0)?.toUpperCase() || "P"}
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-slate-900">{plan.name}</p>

                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                        plan.is_active
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {plan.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {plan.min_members}–{plan.max_members} members
                    <span className="mx-1.5 text-slate-300">·</span>
                    {plan.annual_interest_rate}% annual interest
                    <span className="mx-1.5 text-slate-300">·</span>
                    {plan.tenure_months} months
                  </p>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-3 sm:border-0 sm:pt-0 sm:text-right">
                <p className="text-lg font-bold text-slate-900">
                  {formatINR(plan.max_group_loan_amount)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Maximum group limit
                </p>
              </div>
            </div>
          ))}

          {plans.length === 0 && (
            <div className="py-8 text-center">
              <p className="text-sm font-medium text-slate-600">
                No plans available.
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Configured loan plans will appear here.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Data Availability Notice */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <span className="text-lg">ℹ️</span>
        <div>
          <h4 className="text-sm font-bold text-amber-900">
            Report Data Availability
          </h4>
          <p className="mt-1 text-sm leading-6 text-amber-800">
            Loan disbursement, collection, overdue and outstanding figures
            require loan account and payment APIs. They are not calculated
            from the plans or group list.
          </p>
        </div>
      </div>
    </div>
  );
}
