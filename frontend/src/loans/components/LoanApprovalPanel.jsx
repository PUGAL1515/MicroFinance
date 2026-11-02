
const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-50";

export default function LoanApprovalPanel({
  approvalAmount,
  setApprovalAmount,
  decisionNotes,
  setDecisionNotes,
  onApprove,
  onReject,
  busy,
  id,
}) {
  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 font-extrabold text-amber-700">
          02
        </div>
        <div>
          <h4 className="font-extrabold text-slate-900">
            Application Review
          </h4>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Verify the requested amount and record your decision.
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="block text-sm font-semibold text-slate-700">
          Approved Total Amount (₹)
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={approvalAmount}
            onChange={(event) => setApprovalAmount(event.target.value)}
            disabled={Boolean(busy)}
            className={`${inputClass} mt-2`}
          />
        </label>

        <label className="block text-sm font-semibold text-slate-700">
          Decision Notes
          <input
            value={decisionNotes}
            onChange={(event) => setDecisionNotes(event.target.value)}
            placeholder="Approval / rejection reason"
            disabled={Boolean(busy)}
            className={`${inputClass} mt-2`}
          />
        </label>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={Boolean(busy)}
          onClick={onApprove}
          className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
        >
          {busy === `approved-${id}` ? "Approving..." : "✓ Approve Loan"}
        </button>

        <button
          type="button"
          disabled={Boolean(busy)}
          onClick={onReject}
          className="rounded-xl border border-red-200 bg-white px-5 py-3 text-sm font-bold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
        >
          {busy === `rejected-${id}`
            ? "Rejecting..."
            : "✕ Reject Application"}
        </button>
      </div>
    </section>
  );
}
