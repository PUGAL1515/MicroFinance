
import { formatINR } from "./GroupLoanStats";

export default function GroupLoanPlanList({ plans, onCreate, onEdit }) {
  return (
    <section className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xl">
            📑
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Group Loan Plans
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Manage loan rules and member limits.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onCreate}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-100"
        >
          <span className="text-lg leading-none">＋</span>
          Create Plan
        </button>
      </div>

      {/* Plan Count */}
      {plans.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/70 px-5 py-3 sm:px-6">
          <p className="text-sm text-slate-600">
            Total Plans{" "}
            <span className="ml-1 font-bold text-slate-900">
              {plans.length}
            </span>
          </p>

          <div className="flex items-center gap-3 text-xs font-medium">
            <span className="flex items-center gap-1.5 text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              {plans.filter((plan) => plan.is_active).length} Active
            </span>

            <span className="flex items-center gap-1.5 text-slate-500">
              <span className="h-2 w-2 rounded-full bg-slate-400" />
              {plans.filter((plan) => !plan.is_active).length} Inactive
            </span>
          </div>
        </div>
      )}

      {/* Empty State */}
      {plans.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-5 py-14 text-center sm:py-16">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-3xl">
            📋
          </div>

          <h3 className="mt-5 text-base font-bold text-slate-800">
            No Loan Plans Found
          </h3>

          <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
            You haven't created any group loan plans yet. Create your first
            plan to start managing group loans.
          </p>

          <button
            type="button"
            onClick={onCreate}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
          >
            <span className="text-lg leading-none">＋</span>
            Create Your First Plan
          </button>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-4 font-semibold">Plan Name</th>
                  <th className="px-5 py-4 font-semibold">Members</th>
                  <th className="px-5 py-4 font-semibold">Loan / Member</th>
                  <th className="px-5 py-4 font-semibold">Interest</th>
                  <th className="px-5 py-4 font-semibold">Tenure</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                  <th className="px-5 py-4 text-right font-semibold">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {plans.map((plan) => (
                  <tr
                    key={plan.id}
                    className="transition-colors hover:bg-blue-50/30"
                  >
                    {/* Plan Name */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 font-bold text-blue-700">
                          {plan.name?.charAt(0)?.toUpperCase() || "P"}
                        </div>

                        <div>
                          <p className="font-bold text-slate-800">
                            {plan.name}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            Plan ID: {plan.id}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Members */}
                    <td className="px-5 py-4">
                      <div className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 font-semibold text-slate-700">
                        <span>👥</span>
                        {plan.min_members}–{plan.max_members}
                      </div>
                    </td>

                    {/* Loan Amount */}
                    <td className="whitespace-nowrap px-5 py-4">
                      <p className="font-semibold text-slate-800">
                        {formatINR(plan.min_loan_per_member)}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        to {formatINR(plan.max_loan_per_member)}
                      </p>
                    </td>

                    {/* Interest */}
                    <td className="px-5 py-4">
                      <p className="font-bold text-slate-800">
                        {plan.annual_interest_rate}%
                      </p>
                      <p className="mt-1 text-xs capitalize text-slate-500">
                        {plan.interest_method}
                      </p>
                    </td>

                    {/* Tenure */}
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-800">
                        {plan.tenure_months} months
                      </p>
                      <p className="mt-1 text-xs capitalize text-slate-500">
                        {plan.repayment_frequency}
                      </p>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${
                          plan.is_active
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            plan.is_active ? "bg-emerald-500" : "bg-slate-400"
                          }`}
                        />
                        {plan.is_active ? "Active" : "Draft / Inactive"}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => onEdit(plan)}
                        disabled={plan.is_active}
                        title={
                          plan.is_active
                            ? "Active plans cannot be edited"
                            : "Edit loan plan"
                        }
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400"
                      >
                        <span>✎</span>
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="grid grid-cols-1 gap-4 p-4 md:hidden">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-blue-200"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 font-bold text-blue-700">
                      {plan.name?.charAt(0)?.toUpperCase() || "P"}
                    </div>

                    <div className="min-w-0">
                      <h3 className="truncate font-bold text-slate-900">
                        {plan.name}
                      </h3>
                      <p className="mt-1 text-xs text-slate-400">
                        Plan ID: {plan.id}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                      plan.is_active
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {plan.is_active ? "Active" : "Inactive"}
                  </span>
                </div>

                <div className="my-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3">
                  <div>
                    <p className="text-xs text-slate-500">Members</p>
                    <p className="mt-1 text-sm font-bold text-slate-800">
                      {plan.min_members}–{plan.max_members}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">Interest</p>
                    <p className="mt-1 text-sm font-bold text-slate-800">
                      {plan.annual_interest_rate}%
                    </p>
                    <p className="text-xs capitalize text-slate-500">
                      {plan.interest_method}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">Min Loan / Member</p>
                    <p className="mt-1 text-sm font-bold text-slate-800">
                      {formatINR(plan.min_loan_per_member)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">Max Loan / Member</p>
                    <p className="mt-1 text-sm font-bold text-slate-800">
                      {formatINR(plan.max_loan_per_member)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">Tenure</p>
                    <p className="mt-1 text-sm font-bold text-slate-800">
                      {plan.tenure_months} months
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">Collection</p>
                    <p className="mt-1 text-sm font-bold capitalize text-slate-800">
                      {plan.repayment_frequency}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onEdit(plan)}
                  disabled={plan.is_active}
                  className="w-full rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400"
                >
                  {plan.is_active ? "Active Plan – Editing Disabled" : "✎ Edit Plan"}
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

