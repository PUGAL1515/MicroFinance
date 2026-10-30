
import { useCallback, useEffect, useState } from "react";
import { loanApi } from "../loanApi";

const listOf = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.installments)) return data.installments;
  return [];
};

const money = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const today = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

const initialDisbursement = (application) => ({
  disbursement_date: today(),
  amount: String(application.approved_total || application.requested_total || ""),
  disbursement_mode: "bank_transfer",
  transaction_reference: "",
  disbursed_to: application.group_name || "",
  remarks: "",
});

function StatusBadge({ status }) {
  const styles = {
    submitted: "bg-amber-50 text-amber-700",
    approved: "bg-blue-50 text-blue-700",
    rejected: "bg-red-50 text-red-700",
    disbursed: "bg-emerald-50 text-emerald-700",
    closed: "bg-slate-100 text-slate-700",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
        styles[status] || "bg-slate-100 text-slate-600"
      }`}
    >
      {String(status || "unknown").toUpperCase()}
    </span>
  );
}

function Field({ label, children }) {
  return (
    <label className="block text-sm font-semibold text-slate-700">
      {label}
      <div className="mt-2">{children}</div>
    </label>
  );
}

export default function GroupLoanWorkflow({ groups = [] }) {
  const [applications, setApplications] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [requestedPerMember, setRequestedPerMember] = useState("");
  const [applicationNotes, setApplicationNotes] = useState("");

  const [firstDueDates, setFirstDueDates] = useState({});
  const [schedules, setSchedules] = useState({});
  const [expanded, setExpanded] = useState({});

  const [paymentAmounts, setPaymentAmounts] = useState({});
  const [paymentReferences, setPaymentReferences] = useState({});

  const [approvalAmounts, setApprovalAmounts] = useState({});
  const [decisionNotes, setDecisionNotes] = useState({});

  // Disbursement form state
  const [disbursementForms, setDisbursementForms] = useState({});
  const [showDisbursementForm, setShowDisbursementForm] = useState(null);

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

      await action();

      setMessage(successText);
      await loadApplications();

      return true;
    } catch (err) {
      const data = err.response?.data;
      const errorMessage =
        data?.detail ||
        data?.error ||
        (typeof data === "string" ? data : null) ||
        err.message ||
        "The requested action failed.";

      setError(errorMessage);
      return false;
    } finally {
      setBusy("");
    }
  };

  const createApplication = async (event) => {
    event.preventDefault();

    if (!selectedGroup || Number(requestedPerMember) <= 0) {
      setError("Select a group and enter a valid loan amount.");
      return;
    }

    const success = await runAction(
      "create",
      () =>
        loanApi.createApplication({
          group: Number(selectedGroup),
          requested_per_member: requestedPerMember,
          application_notes: applicationNotes,
        }),
      "Loan application submitted successfully."
    );

    if (success) {
      setRequestedPerMember("");
      setApplicationNotes("");
      setSelectedGroup("");
    }
  };

  const showSchedule = async (applicationId) => {
    try {
      setBusy(`schedule-${applicationId}`);
      setError("");

      const data = await loanApi.getSchedule(applicationId);

      setSchedules((old) => ({
        ...old,
        [applicationId]: listOf(data),
      }));

      setExpanded((old) => ({
        ...old,
        [applicationId]: true,
      }));
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          err.message ||
          "Unable to load EMI schedule."
      );
    } finally {
      setBusy("");
    }
  };

  const generateSchedule = async (application) => {
    const id = application.id;

    const success = await runAction(
      `generate-${id}`,
      async () => {
        const data = await loanApi.generateSchedule(
          id,
          firstDueDates[id] || undefined
        );

        setSchedules((old) => ({
          ...old,
          [id]: listOf(data),
        }));

        setExpanded((old) => ({
          ...old,
          [id]: true,
        }));

        if (data.total_payable != null) {
          setMessage(
            `EMI schedule generated. Total interest: ${money(
              data.total_interest
            )}; Total payable: ${money(data.total_payable)}.`
          );
        }
      },
      "EMI schedule generated successfully."
    );

    return success;
  };

  const decide = async (application, status) => {
    const id = application.id;
    const notes = decisionNotes[id] || "";

    if (status === "rejected" && !notes.trim()) {
      setError("Enter a reason before rejecting the loan.");
      return;
    }

    const amount =
      approvalAmounts[id] || String(application.requested_total || "");

    if (
      status === "approved" &&
      (!amount.trim() ||
        !Number.isFinite(Number(amount)) ||
        Number(amount) <= 0)
    ) {
      setError("Enter a valid approved loan amount.");
      return;
    }

    await runAction(
      `${status}-${id}`,
      () =>
        loanApi.decideApplication(id, {
          status,
          ...(status === "approved" ? { approved_total: amount } : {}),
          decision_notes: notes,
        }),
      status === "approved"
        ? "Loan application approved."
        : "Loan application rejected."
    );
  };

  // Open disbursement form
  const openDisbursementForm = (application) => {
    const id = application.id;

    setError("");
    setMessage("");

    setDisbursementForms((old) => ({
      ...old,
      [id]: old[id] || initialDisbursement(application),
    }));

    setShowDisbursementForm(id);
  };

  const updateDisbursementField = (applicationId, field, value) => {
    setDisbursementForms((old) => ({
      ...old,
      [applicationId]: {
        ...(old[applicationId] || {}),
        [field]: value,
      },
    }));
  };

  // Submit disbursement details
  const disburseLoan = async (application) => {
    const id = application.id;
    const form = disbursementForms[id];

    if (application.status !== "approved") {
      setError("Only approved applications can be disbursed.");
      return;
    }

    if (!application.has_schedule) {
      setError("Please generate the EMI schedule before disbursement.");
      return;
    }

    if (!form?.disbursement_date) {
      setError("Select the disbursement date.");
      return;
    }

    if (!form?.amount || Number(form.amount) <= 0) {
      setError("Enter a valid disbursement amount.");
      return;
    }

    if (!form?.disbursement_mode) {
      setError("Select the disbursement mode.");
      return;
    }

    if (!form?.disbursed_to?.trim()) {
      setError("Enter the recipient name.");
      return;
    }

    const confirmed = window.confirm(
      `Confirm disbursement of ${money(form.amount)} for Application #${id}?`
    );

    if (!confirmed) return;

    const payload = {
      disbursement_date: form.disbursement_date,
      amount: form.amount,
      disbursement_mode: form.disbursement_mode,
      transaction_reference: form.transaction_reference,
      disbursed_to: form.disbursed_to,
      remarks: form.remarks,
    };

    const success = await runAction(
      `disburse-${id}`,
      () => loanApi.disburseLoan(id, payload),
      "Loan disbursement completed successfully."
    );

    if (success) {
      setShowDisbursementForm(null);
      setDisbursementForms((old) => {
        const updated = { ...old };
        delete updated[id];
        return updated;
      });
    }
  };

  const recordPayment = async (application, installment) => {
    const installmentId = installment.id;
    const amount = paymentAmounts[installmentId];

    if (!amount || !Number.isFinite(Number(amount)) || Number(amount) <= 0) {
      setError("Enter a valid collection amount.");
      return;
    }

    await runAction(
      `payment-${installmentId}`,
      async () => {
        await loanApi.recordPayment(installmentId, {
          amount,
          reference: paymentReferences[installmentId] || "",
        });

        const schedule = await loanApi.getSchedule(application.id);

        setSchedules((old) => ({
          ...old,
          [application.id]: listOf(schedule),
        }));

        setPaymentAmounts((old) => ({
          ...old,
          [installmentId]: "",
        }));

        setPaymentReferences((old) => ({
          ...old,
          [installmentId]: "",
        }));
      },
      "Collection saved and EMI schedule refreshed."
    );
  };

  const activeGroups = groups.filter(
    (group) => group.status !== "closed"
  );

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-start justify-between gap-3 whitespace-pre-line rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError("")}
            className="font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {message && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <span>{message}</span>
          <button
            type="button"
            onClick={() => setMessage("")}
            className="font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* STEP 1: NEW APPLICATION */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-700">
            Step 1
          </p>
          <h2 className="mt-1 text-xl font-extrabold text-slate-900">
            New Group Loan Application
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            KYC and group eligibility are checked by the backend.
          </p>
        </div>

        <form
          onSubmit={createApplication}
          className="grid grid-cols-1 gap-4 md:grid-cols-2"
        >
          <Field label="Borrower Group">
            <select
              required
              value={selectedGroup}
              onChange={(event) => setSelectedGroup(event.target.value)}
              className={inputClass}
            >
              <option value="">Select group</option>
              {activeGroups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name} — {group.group_code || `#${group.id}`}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Requested Loan Per Member (₹)">
            <input
              type="number"
              min="0.01"
              step="0.01"
              required
              value={requestedPerMember}
              onChange={(event) =>
                setRequestedPerMember(event.target.value)
              }
              placeholder="e.g. 20000"
              className={inputClass}
            />
          </Field>

          <div className="md:col-span-2">
            <Field label="Application Notes">
              <textarea
                rows={2}
                value={applicationNotes}
                onChange={(event) =>
                  setApplicationNotes(event.target.value)
                }
                placeholder="Purpose of loan"
                className={inputClass}
              />
            </Field>
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={Boolean(busy) || !activeGroups.length}
              className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-50"
            >
              {busy === "create" ? "Submitting..." : "Submit Application"}
            </button>
          </div>
        </form>
      </section>

      {/* APPLICATION LIST */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-blue-700">
              Steps 2–7
            </p>
            <h2 className="mt-1 text-xl font-extrabold text-slate-900">
              Approval, EMI, Disbursement & Collection
            </h2>
          </div>

          <button
            type="button"
            onClick={loadApplications}
            disabled={loading || Boolean(busy)}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>

        {loading ? (
          <div className="p-10 text-center text-sm text-slate-500">
            Loading applications...
          </div>
        ) : applications.length === 0 ? (
          <div className="p-10 text-center">
            <h3 className="font-bold text-slate-800">
              No applications yet
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Submit a group loan application to begin processing.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {applications.map((application) => {
              const id = application.id;
              const schedule = schedules[id] || [];
              const hasSchedule =
  application.has_schedule === true ||
  Number(application.installment_count || 0) > 0;
              const isExpanded = Boolean(expanded[id]);
              const isDisbursementOpen = showDisbursementForm === id;
              const disbursement = disbursementForms[id] || {};

              return (
                <article key={id} className="space-y-5 p-5">
                  {/* APPLICATION SUMMARY */}
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-bold text-slate-900">
                        {application.group_name ||
                          `Group #${application.group}`}
                      </h3>

                      <StatusBadge status={application.status} />

                      <span className="text-xs text-slate-400">
                        Application #{id}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                      {[
                        ["Requested", money(application.requested_total)],
                        [
                          "Approved",
                          application.approved_total != null
                            ? money(application.approved_total)
                            : "—",
                        ],
                        [
                          "Interest Rate",
                          `${application.interest_rate ?? "—"}%`,
                        ],
                        [
                          "Interest Method",
                          application.interest_method || "—",
                        ],
                        [
                          "Tenure",
                          `${application.tenure_months ?? "—"} months`,
                        ],
                        [
                          "Frequency",
                          application.repayment_frequency || "—",
                        ],
                        ["Members", application.member_count ?? "—"],
                        [
                          "Submitted",
                          application.submitted_at
                            ? new Date(
                                application.submitted_at
                              ).toLocaleDateString("en-IN")
                            : "—",
                        ],
                      ].map(([label, value]) => (
                        <div
                          key={label}
                          className="rounded-xl bg-slate-50 p-3"
                        >
                          <p className="text-xs font-medium text-slate-500">
                            {label}
                          </p>
                          <p className="mt-1 break-words text-sm font-bold capitalize text-slate-900">
                            {value}
                          </p>
                        </div>
                      ))}
                    </div>

                    {application.application_notes && (
                      <p className="mt-3 text-sm text-slate-600">
                        Application note: {application.application_notes}
                      </p>
                    )}

                    {application.decision_notes && (
                      <p className="mt-2 text-sm text-slate-600">
                        Decision note: {application.decision_notes}
                      </p>
                    )}
                  </div>

                  {/* STEP 2: APPROVAL */}
                  {application.status === "submitted" && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
                      <h4 className="font-bold text-slate-900">
                        Review Application
                      </h4>

                      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                        <Field label="Approved Total Amount (₹)">
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={
                              approvalAmounts[id] ??
                              String(application.requested_total || "")
                            }
                            onChange={(event) =>
                              setApprovalAmounts((old) => ({
                                ...old,
                                [id]: event.target.value,
                              }))
                            }
                            className={inputClass}
                          />
                        </Field>

                        <Field label="Decision Notes">
                          <input
                            value={decisionNotes[id] || ""}
                            onChange={(event) =>
                              setDecisionNotes((old) => ({
                                ...old,
                                [id]: event.target.value,
                              }))
                            }
                            placeholder="Approval/rejection reason"
                            className={inputClass}
                          />
                        </Field>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={Boolean(busy)}
                          onClick={() => decide(application, "approved")}
                          className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                          {busy === `approved-${id}`
                            ? "Approving..."
                            : "Approve Loan"}
                        </button>

                        <button
                          type="button"
                          disabled={Boolean(busy)}
                          onClick={() => decide(application, "rejected")}
                          className="rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-bold text-red-700 hover:bg-red-50 disabled:opacity-50"
                        >
                          Reject Application
                        </button>
                      </div>
                    </div>
                  )}

                  {/* STEP 3: EMI SCHEDULE */}
                  {application.status === "approved" && (
                    <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4">
                      <h4 className="font-bold text-slate-900">
                        EMI Calculation & Schedule
                      </h4>

                      <p className="mt-1 text-sm text-slate-600">
                        The backend calculates the schedule using the
                        approved principal, interest method, tenure and
                        repayment frequency.
                      </p>

                      <div className="mt-3 flex flex-wrap items-end gap-3">
                        <Field label="First EMI Due Date">
                          <input
                            type="date"
                            value={firstDueDates[id] || ""}
                            onChange={(event) =>
                              setFirstDueDates((old) => ({
                                ...old,
                                [id]: event.target.value,
                              }))
                            }
                            className={inputClass}
                          />
                        </Field>

                        {!hasSchedule && (
                          <button
                            type="button"
                            disabled={Boolean(busy)}
                            onClick={() => generateSchedule(application)}
                            className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-50"
                          >
                            {busy === `generate-${id}`
                              ? "Generating..."
                              : "Generate EMI Schedule"}
                          </button>
                        )}

                        {hasSchedule && (
                          <button
                            type="button"
                            disabled={Boolean(busy)}
                            onClick={() => showSchedule(id)}
                            className="rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-bold text-blue-700 disabled:opacity-50"
                          >
                            {busy === `schedule-${id}`
                              ? "Loading..."
                              : "View EMI Schedule"}
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* STEP 4: DISBURSEMENT BUTTON */}
                  {application.status === "approved" && hasSchedule && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h4 className="font-bold text-slate-900">
                            Loan Disbursement
                          </h4>
                          <p className="mt-1 text-sm text-slate-600">
                            EMI schedule generated. Enter disbursement
                            details to continue.
                          </p>
                        </div>

                        <button
                          type="button"
                          disabled={Boolean(busy)}
                          onClick={() =>
                            isDisbursementOpen
                              ? setShowDisbursementForm(null)
                              : openDisbursementForm(application)
                          }
                          className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                          {isDisbursementOpen
                            ? "Close Form"
                            : "Enter Disbursement Details"}
                        </button>
                      </div>

                      {/* DISBURSEMENT DETAILS FORM */}
                      {isDisbursementOpen && (
                        <div className="mt-5 border-t border-emerald-200 pt-5">
                          <h4 className="mb-4 text-base font-extrabold text-slate-900">
                            Disbursement Details
                          </h4>

                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <Field label="Disbursement Date">
                              <input
                                type="date"
                                value={disbursement.disbursement_date || ""}
                                onChange={(event) =>
                                  updateDisbursementField(
                                    id,
                                    "disbursement_date",
                                    event.target.value
                                  )
                                }
                                className={inputClass}
                              />
                            </Field>

                            <Field label="Disbursement Amount (₹)">
                              <input
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={disbursement.amount || ""}
                                onChange={(event) =>
                                  updateDisbursementField(
                                    id,
                                    "amount",
                                    event.target.value
                                  )
                                }
                                className={inputClass}
                              />
                              <span className="mt-1 block text-xs text-slate-500">
                                Approved amount:{" "}
                                {money(
                                  application.approved_total ||
                                    application.requested_total
                                )}
                              </span>
                            </Field>

                            <Field label="Disbursement Mode">
                              <select
                                value={
                                  disbursement.disbursement_mode ||
                                  "bank_transfer"
                                }
                                onChange={(event) =>
                                  updateDisbursementField(
                                    id,
                                    "disbursement_mode",
                                    event.target.value
                                  )
                                }
                                className={inputClass}
                              >
                                <option value="bank_transfer">
                                  Bank Transfer
                                </option>
                                <option value="cash">Cash</option>
                                <option value="upi">UPI</option>
                                <option value="cheque">Cheque</option>
                              </select>
                            </Field>

                            <Field label="Transaction Reference / UTR Number">
                              <input
                                type="text"
                                value={
                                  disbursement.transaction_reference || ""
                                }
                                onChange={(event) =>
                                  updateDisbursementField(
                                    id,
                                    "transaction_reference",
                                    event.target.value
                                  )
                                }
                                placeholder="Enter UTR / transaction ID"
                                className={inputClass}
                              />
                            </Field>

                            <Field label="Disbursed To">
                              <input
                                type="text"
                                value={disbursement.disbursed_to || ""}
                                onChange={(event) =>
                                  updateDisbursementField(
                                    id,
                                    "disbursed_to",
                                    event.target.value
                                  )
                                }
                                placeholder="Recipient / Group Leader name"
                                className={inputClass}
                              />
                            </Field>

                            <div className="md:col-span-2">
                              <Field label="Remarks">
                                <textarea
                                  rows={3}
                                  value={disbursement.remarks || ""}
                                  onChange={(event) =>
                                    updateDisbursementField(
                                      id,
                                      "remarks",
                                      event.target.value
                                    )
                                  }
                                  placeholder="Enter disbursement remarks"
                                  className={inputClass}
                                />
                              </Field>
                            </div>
                          </div>

                          <div className="mt-5 flex flex-wrap justify-end gap-3">
                            <button
                              type="button"
                              onClick={() =>
                                setShowDisbursementForm(null)
                              }
                              disabled={Boolean(busy)}
                              className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
                            >
                              Cancel
                            </button>

                            <button
                              type="button"
                              onClick={() => disburseLoan(application)}
                              disabled={Boolean(busy)}
                              className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
                            >
                              {busy === `disburse-${id}`
                                ? "Processing..."
                                : "Confirm Disbursement"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ALREADY DISBURSED */}
                  {application.status === "disbursed" && (
                    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
                      <div className="flex-1">
                        <h4 className="font-bold text-slate-900">
                          Loan Disbursed
                        </h4>
                        <p className="mt-1 text-sm text-slate-600">
                          Loan has been marked as disbursed. View the
                          saved schedule and record collections.
                        </p>
                      </div>

                      <button
                        type="button"
                        disabled={Boolean(busy)}
                        onClick={() => showSchedule(id)}
                        className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
                      >
                        {busy === `schedule-${id}`
                          ? "Loading..."
                          : "View EMI & Collect"}
                      </button>
                    </div>
                  )}

                  {/* EMI SCHEDULE TABLE */}
                  {isExpanded && schedule.length > 0 && (
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-4">
                        <h4 className="font-bold text-slate-900">
                          EMI Schedule — Application #{id}
                        </h4>
                        <span className="text-xs text-slate-500">
                          {schedule.length} installments
                        </span>
                      </div>

                      <table className="w-full min-w-[900px] text-left text-sm">
                        <thead className="bg-white text-xs uppercase text-slate-500">
                          <tr>
                            <th className="p-3">No.</th>
                            <th className="p-3">Due Date</th>
                            <th className="p-3">Principal</th>
                            <th className="p-3">Interest</th>
                            <th className="p-3">Total EMI</th>
                            <th className="p-3">Paid</th>
                            <th className="p-3">Balance</th>
                            <th className="p-3">Status</th>
                            {application.status === "disbursed" && (
                              <th className="p-3">Collect Payment</th>
                            )}
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100">
                          {schedule.map((item) => {
                            const balance = Math.max(
                              0,
                              Number(item.total_due || 0) -
                                Number(item.paid_amount || 0)
                            );

                            return (
                              <tr
                                key={item.id || item.installment_number}
                              >
                                <td className="p-3">
                                  {item.installment_number}
                                </td>
                                <td className="p-3">{item.due_date}</td>
                                <td className="p-3">
                                  {money(item.principal_due)}
                                </td>
                                <td className="p-3">
                                  {money(item.interest_due)}
                                </td>
                                <td className="p-3 font-bold">
                                  {money(item.total_due)}
                                </td>
                                <td className="p-3">
                                  {money(item.paid_amount)}
                                </td>
                                <td className="p-3 font-semibold">
                                  {money(item.balance_due ?? balance)}
                                </td>
                                <td className="p-3">
                                  <span
                                    className={`rounded-full px-2 py-1 text-xs font-bold ${
                                      item.status === "paid"
                                        ? "bg-emerald-50 text-emerald-700"
                                        : item.status === "overdue"
                                          ? "bg-red-50 text-red-700"
                                          : "bg-amber-50 text-amber-700"
                                    }`}
                                  >
                                    {String(
                                      item.status || "pending"
                                    ).toUpperCase()}
                                  </span>
                                </td>

                                {application.status === "disbursed" && (
                                  <td className="min-w-64 p-3">
                                    {balance <= 0 ||
                                    item.status === "paid" ? (
                                      <span className="text-xs font-bold text-emerald-700">
                                        Fully paid
                                      </span>
                                    ) : (
                                      <div className="space-y-2">
                                        <input
                                          type="number"
                                          min="0.01"
                                          max={balance}
                                          step="0.01"
                                          value={
                                            paymentAmounts[item.id] || ""
                                          }
                                          onChange={(event) =>
                                            setPaymentAmounts((old) => ({
                                              ...old,
                                              [item.id]: event.target.value,
                                            }))
                                          }
                                          placeholder={`Balance ${money(
                                            balance
                                          )}`}
                                          className={inputClass}
                                        />

                                        <input
                                          value={
                                            paymentReferences[item.id] || ""
                                          }
                                          onChange={(event) =>
                                            setPaymentReferences((old) => ({
                                              ...old,
                                              [item.id]: event.target.value,
                                            }))
                                          }
                                          placeholder="Receipt/reference (optional)"
                                          className={inputClass}
                                        />

                                        <button
                                          type="button"
                                          disabled={
                                            Boolean(busy) || !item.id
                                          }
                                          onClick={() =>
                                            recordPayment(application, item)
                                          }
                                          className="rounded-lg bg-blue-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                                        >
                                          {busy === `payment-${item.id}`
                                            ? "Saving..."
                                            : "Record Collection"}
                                        </button>
                                      </div>
                                    )}
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {isExpanded && schedule.length === 0 && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                      No installments were returned. Refresh the schedule
                      or check the backend schedule endpoint.
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
