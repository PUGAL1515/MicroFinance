
import { useState } from "react";
import LoanApprovalPanel from "./LoanApprovalPanel";
import LoanDisbursementForm from "./LoanDisbursementForm";

const money = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

function StatusBadge({ status }) {
  const styles = {
    submitted: "bg-amber-50 text-amber-700 ring-amber-200",
    approved: "bg-blue-50 text-blue-700 ring-blue-200",
    rejected: "bg-red-50 text-red-700 ring-red-200",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-extrabold tracking-wide ring-1 ${
        styles[status] || "bg-slate-100 text-slate-600 ring-slate-200"
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {String(status || "unknown").toUpperCase()}
    </span>
  );
}

function InfoItem({ label, value }) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-100 bg-slate-50 p-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1.5 break-words text-sm font-extrabold text-slate-800">
        {value}
      </p>
    </div>
  );
}

export default function LoanApplicationCard({
  application,
  busy,
  onDecide,
  onGenerateSchedule,
  onDisburse,
  onError,
}) {
  const [approvalAmount, setApprovalAmount] = useState(
    String(application.requested_total || "")
  );
  const [decisionNotes, setDecisionNotes] = useState("");
  const [firstDueDate, setFirstDueDate] = useState("");
  const [disbursementOpen, setDisbursementOpen] = useState(false);

  const id = application.id;
  const hasSchedule =
    application.has_schedule === true ||
    Number(application.installment_count || 0) > 0;

  const handleDecision = async (status) => {
    if (
      status === "rejected" &&
      !decisionNotes.trim()
    ) {
      onError("Enter a reason before rejecting the loan.");
      return;
    }

    if (
      status === "approved" &&
      (!approvalAmount.trim() ||
        !Number.isFinite(Number(approvalAmount)) ||
        Number(approvalAmount) <= 0)
    ) {
      onError("Enter a valid approved loan amount.");
      return;
    }

    await onDecide(application, {
      status,
      ...(status === "approved"
        ? { approved_total: approvalAmount }
        : {}),
      decision_notes: decisionNotes,
    });
  };

  return (
    <article className="space-y-5 p-4 transition hover:bg-slate-50/40 sm:p-6">
      {/* Application summary */}
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-lg font-extrabold text-blue-700">
            {String(application.group_name || "G")
              .charAt(0)
              .toUpperCase()}
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="break-words text-base font-extrabold text-[#17365D] sm:text-lg">
              {application.group_name || `Group #${application.group}`}
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Application #{id}
            </p>
          </div>

          <StatusBadge status={application.status} />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <InfoItem
            label="Requested Amount"
            value={money(application.requested_total)}
          />
          <InfoItem
            label="Approved Amount"
            value={
              application.approved_total != null
                ? money(application.approved_total)
                : "—"
            }
          />
          <InfoItem
            label="Interest Rate"
            value={`${application.interest_rate ?? "—"}%`}
          />
          <InfoItem
            label="Interest Method"
            value={application.interest_method || "—"}
          />
          <InfoItem
            label="Tenure"
            value={`${application.tenure_months ?? "—"} months`}
          />
          <InfoItem
            label="Frequency"
            value={application.repayment_frequency || "—"}
          />
          <InfoItem
            label="Members"
            value={application.member_count ?? "—"}
          />
          <InfoItem
            label="Submitted"
            value={
              application.submitted_at
                ? new Date(application.submitted_at).toLocaleDateString(
                    "en-IN"
                  )
                : "—"
            }
          />
        </div>

        {application.application_notes && (
          <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3.5">
            <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
              Application Notes
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-700">
              {application.application_notes}
            </p>
          </div>
        )}

        {application.decision_notes && (
          <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50/60 p-3.5">
            <p className="text-[10px] font-extrabold uppercase tracking-wide text-blue-700">
              Decision Notes
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-700">
              {application.decision_notes}
            </p>
          </div>
        )}
      </div>

      {/* Approval */}
      {application.status === "submitted" && (
        <LoanApprovalPanel
          approvalAmount={approvalAmount}
          setApprovalAmount={setApprovalAmount}
          decisionNotes={decisionNotes}
          setDecisionNotes={setDecisionNotes}
          onApprove={() => handleDecision("approved")}
          onReject={() => handleDecision("rejected")}
          busy={busy}
          id={id}
        />
      )}

      {/* EMI schedule generation */}
      {application.status === "approved" && (
        <section className="rounded-2xl border border-blue-200 bg-blue-50/40 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 font-extrabold text-blue-700">
              03
            </div>
            <div>
              <h4 className="font-extrabold text-slate-900">
                EMI Calculation & Schedule
              </h4>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Generate the repayment schedule before disbursement.
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-blue-100 bg-white/80 p-3 text-sm leading-6 text-slate-600">
            The backend calculates the schedule using the approved principal,
            interest method, tenure and repayment frequency.
          </div>

          {!hasSchedule ? (
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="block w-full text-sm font-semibold text-slate-700 sm:max-w-xs">
                First EMI Due Date
                <input
                  type="date"
                  value={firstDueDate}
                  onChange={(event) => setFirstDueDate(event.target.value)}
                  disabled={Boolean(busy)}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </label>

              <button
                type="button"
                disabled={Boolean(busy)}
                onClick={() =>
                  onGenerateSchedule(application, firstDueDate)
                }
                className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-800 disabled:opacity-50"
              >
                {busy === `generate-${id}`
                  ? "Generating..."
                  : "Generate EMI Schedule"}
              </button>
            </div>
          ) : (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-700">
                ✓ EMI Schedule Generated
              </span>
              <span className="text-xs text-slate-500">
                Installments: {application.installment_count ?? "Available"}
              </span>
            </div>
          )}
        </section>
      )}

      {/* Disbursement */}
      {application.status === "approved" && hasSchedule && (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50/30 p-4 sm:p-5">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 font-extrabold text-emerald-700">
                04
              </div>
              <div>
                <h4 className="font-extrabold text-slate-900">
                  Loan Disbursement
                </h4>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  EMI schedule is ready. Complete the disbursement details.
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={() => setDisbursementOpen((old) => !old)}
              className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:opacity-50"
            >
              {disbursementOpen ? "Close Form" : "Disburse Loan"}
            </button>
          </div>

          {disbursementOpen && (
            <LoanDisbursementForm
              application={application}
              busy={busy === `disburse-${id}`}
              disabled={Boolean(busy)}
              onCancel={() => setDisbursementOpen(false)}
              onSubmit={async (payload) => {
                const success = await onDisburse(application, payload);
                if (success) setDisbursementOpen(false);
              }}
              onError={onError}
            />
          )}
        </section>
      )}

      {application.status === "rejected" && (
        <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
          This application has been rejected.
        </div>
      )}
    </article>
  );
}
