
import { formatINR } from "./GroupLoanStats";

export default function GroupLoanPlanList({ plans, onCreate, onEdit }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Group Loan Plans
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Manage loan rules and member limits.
          </p>
        </div>
        <button
          onClick={onCreate}
          className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          + Create Plan
        </button>
      </div>

      {plans.length === 0 ? (
        <div className="p-12 text-center">
          <p className="font-semibold text-slate-700">
            No loan plans found
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Create your first Group Loan Plan.
          </p>
          <button
            onClick={onCreate}
            className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Create Plan
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-4">Plan Name</th>
                <th className="px-5 py-4">Members</th>
                <th className="px-5 py-4">Loan / Member</th>
                <th className="px-5 py-4">Interest</th>
                <th className="px-5 py-4">Tenure</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {plans.map((plan) => (
                <tr key={plan.id} className="hover:bg-slate-50">
                  <td className="px-5 py-4">
                    <p className="font-semibold text-slate-900">
                      {plan.name}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      ID: {plan.id}
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    {plan.min_members}–{plan.max_members}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    {formatINR(plan.min_loan_per_member)} –{" "}
                    {formatINR(plan.max_loan_per_member)}
                  </td>
                  <td className="px-5 py-4">
                    {plan.annual_interest_rate}%
                    <p className="mt-1 text-xs capitalize text-slate-500">
                      {plan.interest_method}
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    {plan.tenure_months} months
                    <p className="mt-1 text-xs capitalize text-slate-500">
                      {plan.repayment_frequency}
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        plan.is_active
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {plan.is_active ? "Active" : "Draft / Inactive"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <button
                      onClick={() => onEdit(plan)}
                      disabled={plan.is_active}
                      className="rounded-lg border border-slate-200 px-3 py-2 font-medium text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:text-slate-400"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
