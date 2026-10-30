
import { formatINR } from "./GroupLoanStats";

export default function GroupLoanReports({ groups, plans }) {
  const activeGroups = groups.filter((g) => g.status === "active");
  const formingGroups = groups.filter(
    (g) => g.status === "forming" || g.status === "pending"
  );

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-900">
          Group Loan Reports
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Overview of groups and configured loan plans.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Total Groups", value: groups.length },
          { label: "Active Groups", value: activeGroups.length },
          { label: "Forming / Pending", value: formingGroups.length },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-slate-200 bg-white p-5"
          >
            <p className="text-sm text-slate-500">{item.label}</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {item.value}
            </p>
          </div>
        ))}
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 p-5">
          <h3 className="font-bold text-slate-900">
            Group Summary
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[650px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-5 py-4">Group</th>
                <th className="px-5 py-4">Code</th>
                <th className="px-5 py-4">Plan</th>
                <th className="px-5 py-4">Members</th>
                <th className="px-5 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {groups.map((group) => (
                <tr key={group.id}>
                  <td className="px-5 py-4 font-semibold">
                    {group.name}
                  </td>
                  <td className="px-5 py-4">{group.group_code}</td>
                  <td className="px-5 py-4">
                    {plans.find((p) => p.id === group.plan)?.name ||
                      `Plan #${group.plan}`}
                  </td>
                  <td className="px-5 py-4">
                    {group.member_count ?? "—"}
                  </td>
                  <td className="px-5 py-4 capitalize">
                    {group.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="font-bold text-slate-900">Configured Plans</h3>
        <div className="mt-4 space-y-3">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-4"
            >
              <div>
                <p className="font-semibold text-slate-900">
                  {plan.name}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {plan.min_members}–{plan.max_members} members ·{" "}
                  {plan.annual_interest_rate}% annual interest ·{" "}
                  {plan.tenure_months} months
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-slate-900">
                  {formatINR(plan.max_group_loan_amount)}
                </p>
                <p className="text-xs text-slate-500">
                  Maximum group limit
                </p>
              </div>
            </div>
          ))}
          {plans.length === 0 && (
            <p className="text-sm text-slate-500">
              No plans available.
            </p>
          )}
        </div>
      </section>

      <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
        Loan disbursement, collection, overdue and outstanding figures
        require loan account and payment APIs. They are not calculated
        from the plans or group list.
      </p>
    </div>
  );
}
