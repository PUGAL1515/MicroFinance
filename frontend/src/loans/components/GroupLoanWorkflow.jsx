
import { useCallback, useEffect, useState } from "react";
import { loanApi } from "../loanApi";

import GroupLoanApplicationForm from "./GroupLoanApplicationForm";
import LoanApplicationCard from "./LoanApplicationCard";

const listOf = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.applications)) return data.applications;
  return [];
};

export default function GroupLoanWorkflow({ groups = [] }) {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadApplications = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const data = await loanApi.getApplications();
      setApplications(listOf(data));
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          err.message ||
          "Unable to load loan applications."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  const runAction = async (key, action, successText) => {
    try {
      setBusy(key);
      setError("");
      setMessage("");

      const result = await action();

      await loadApplications();
      setMessage(
        typeof result === "string" ? result : successText
      );

      return true;
    } catch (err) {
      const data = err.response?.data;

      setError(
        data?.detail ||
          data?.error ||
          (typeof data === "string" ? data : null) ||
          err.message ||
          "The requested action failed."
      );

      return false;
    } finally {
      setBusy("");
    }
  };

  const createApplication = async (payload) => {
    const success = await runAction(
      "create",
      () => loanApi.createApplication(payload),
      "Loan application submitted successfully."
    );

    return success;
  };

  const decideApplication = async (application, payload) => {
    return runAction(
      `${payload.status}-${application.id}`,
      () => loanApi.decideApplication(application.id, payload),
      payload.status === "approved"
        ? "Loan application approved successfully."
        : "Loan application rejected."
    );
  };

  const generateSchedule = async (application, firstDueDate) => {
    return runAction(
      `generate-${application.id}`,
      async () => {
        const data = await loanApi.generateSchedule(
          application.id,
          firstDueDate || undefined
        );

        if (data?.total_payable != null) {
          return `EMI schedule generated. Total interest: ₹${Number(
            data.total_interest || 0
          ).toLocaleString("en-IN")}; Total payable: ₹${Number(
            data.total_payable || 0
          ).toLocaleString("en-IN")}.`;
        }

        return "EMI schedule generated successfully.";
      },
      "EMI schedule generated successfully."
    );
  };

  const disburseLoan = async (application, payload) => {
    const confirmed = window.confirm(
      `Confirm disbursement of ₹${Number(payload.amount).toLocaleString(
        "en-IN"
      )} for Application #${application.id}?`
    );

    if (!confirmed) return false;

    const success = await runAction(
      `disburse-${application.id}`,
      () => loanApi.disburseLoan(application.id, payload),
      "Loan disbursed successfully. It is now available in the Collection module."
    );

    if (success) {
      setMessage(
        "Loan disbursed successfully. It has been moved to the Collection module."
      );
    }

    return success;
  };

  // Disbursed loans are handled only in the Collection module.
  const processingApplications = applications.filter(
    (application) =>
      !["disbursed", "closed"].includes(
        String(application.status || "").toLowerCase()
      )
  );

  const submittedCount = processingApplications.filter(
    (item) => item.status === "submitted"
  ).length;

  const approvedCount = processingApplications.filter(
    (item) => item.status === "approved"
  ).length;

  const activeGroups = groups.filter(
    (group) => group.status !== "closed"
  );

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-6 pb-8">
      {/* Header */}
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
            <span className="h-2 w-2 rounded-full bg-blue-600" />
            SMLNEXGEN / Group Loans
          </div>

          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-[#17365D] sm:text-3xl">
            Loan Processing
          </h1>

          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
            Submit group loan applications, review requests, generate EMI
            schedules and complete loan disbursement.
          </p>
        </div>

        <button
          type="button"
          onClick={loadApplications}
          disabled={loading || Boolean(busy)}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span>↻</span>
          {loading ? "Refreshing..." : "Refresh Applications"}
        </button>
      </section>

      {/* Statistics */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">
            Applications in Processing
          </p>
          <p className="mt-2 text-3xl font-extrabold text-[#17365D]">
            {processingApplications.length}
          </p>
        </div>

        <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-5">
          <p className="text-xs font-semibold text-amber-700">
            Awaiting Approval
          </p>
          <p className="mt-2 text-3xl font-extrabold text-amber-800">
            {submittedCount}
          </p>
        </div>

        <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-5">
          <p className="text-xs font-semibold text-blue-700">
            Approved / Awaiting Disbursement
          </p>
          <p className="mt-2 text-3xl font-extrabold text-blue-800">
            {approvedCount}
          </p>
        </div>
      </section>

      {/* Alerts */}
      {error && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="whitespace-pre-line">{error}</p>
          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Dismiss error"
            className="rounded-lg px-2 font-bold hover:bg-red-100"
          >
            ✕
          </button>
        </div>
      )}

      {message && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <p className="whitespace-pre-line">{message}</p>
          <button
            type="button"
            onClick={() => setMessage("")}
            aria-label="Dismiss message"
            className="rounded-lg px-2 font-bold hover:bg-emerald-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* New application */}
      <GroupLoanApplicationForm
        groups={activeGroups}
        busy={busy === "create"}
        disabled={Boolean(busy)}
        onSubmit={createApplication}
        onError={setError}
      />

      {/* Applications */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
            Application Workflow
          </p>

          <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-extrabold text-[#17365D] sm:text-xl">
                Active Loan Applications
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Review, approve, schedule and disburse group loans.
              </p>
            </div>

            <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
              {processingApplications.length} Applications
            </span>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center p-12">
            <div className="h-9 w-9 animate-spin rounded-full border-4 border-blue-100 border-t-blue-700" />
            <p className="mt-4 text-sm font-medium text-slate-500">
              Loading applications...
            </p>
          </div>
        ) : processingApplications.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-3xl text-blue-600">
              ✓
            </div>
            <h3 className="mt-4 text-base font-extrabold text-slate-800">
              No applications in processing
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              New applications will appear here. Once a loan is disbursed, it
              will move to the Loan Collections page.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {processingApplications.map((application) => (
              <LoanApplicationCard
                key={application.id}
                application={application}
                busy={busy}
                onDecide={decideApplication}
                onGenerateSchedule={generateSchedule}
                onDisburse={disburseLoan}
                onError={setError}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
