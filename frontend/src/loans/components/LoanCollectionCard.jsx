
import { useCallback, useState } from "react";
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
const normalizeStatus = (status) =>
  String(status || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
function InstallmentStatus({ status }) {
  const normalizedStatus = normalizeStatus(status);

  const styles = {
    paid: "bg-emerald-50 text-emerald-700",
    overdue: "bg-red-50 text-red-700",
    pending: "bg-amber-50 text-amber-700",
    partial: "bg-blue-50 text-blue-700",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-extrabold ${
        styles[normalizedStatus] || "bg-slate-100 text-slate-600"
      }`}
    >
      {normalizedStatus.toUpperCase() || "PENDING"}
    </span>
  );
}

function LoanStatus({ status }) {
  const normalizedStatus = normalizeStatus(status);

  const isClosed = normalizedStatus === "closed";
  const isDisbursed = normalizedStatus === "disbursed";

  const styles = {
    closed: "bg-slate-100 text-slate-600",
    disbursed: "bg-emerald-50 text-emerald-700",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1.5 text-[10px] font-extrabold ${
        styles[normalizedStatus] || "bg-amber-50 text-amber-700"
      }`}
    >
      {isClosed
        ? "CLOSED"
        : isDisbursed
          ? "ACTIVE"
          : normalizedStatus.toUpperCase() || "UNKNOWN"}
    </span>
  );
}

export default function LoanCollectionCard({
  application,
  onError,
  onPaymentSuccess,
}) {
  const [schedule, setSchedule] = useState([]);
  const [expanded, setExpanded] = useState(false);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [busy, setBusy] = useState("");
  const [paymentAmounts, setPaymentAmounts] = useState({});
  const [paymentReferences, setPaymentReferences] = useState({});

  const id = application.id;
const normalizeStatus = (status) =>
  String(status || "").trim().toLowerCase();
  const loadSchedule = useCallback(async () => {
    try {
      setLoadingSchedule(true);
      onError("");

      const data = await loanApi.getSchedule(id);
      setSchedule(listOf(data));
      setExpanded(true);
    } catch (err) {
      onError(
        err.response?.data?.detail ||
          err.message ||
          "Unable to load EMI schedule."
      );
    } finally {
      setLoadingSchedule(false);
    }
  }, [id, onError]);

  const recordPayment = async (installment) => {
    const installmentId = installment.id;
    const amount = paymentAmounts[installmentId];

    if (
      !amount ||
      !Number.isFinite(Number(amount)) ||
      Number(amount) <= 0
    ) {
      onError("Enter a valid collection amount.");
      return;
    }

    const balance = Math.max(
      0,
      Number(installment.total_due || 0) -
        Number(installment.paid_amount || 0)
    );

    if (Number(amount) > balance) {
      onError(
        `Collection amount cannot exceed the pending balance of ${money(
          balance
        )}.`
      );
      return;
    }

    try {
      setBusy(`payment-${installmentId}`);
      onError("");

      await loanApi.recordPayment(installmentId, {
        amount,
        reference: paymentReferences[installmentId] || "",
      });

      const data = await loanApi.getSchedule(id);
      setSchedule(listOf(data));

      setPaymentAmounts((old) => ({
        ...old,
        [installmentId]: "",
      }));

      setPaymentReferences((old) => ({
        ...old,
        [installmentId]: "",
      }));

      await onPaymentSuccess(
        "Collection saved successfully. EMI schedule has been refreshed."
      );
    } catch (err) {
      const data = err.response?.data;
      onError(
        data?.detail ||
          data?.error ||
          (typeof data === "string" ? data : null) ||
          err.message ||
          "Unable to record collection."
      );
    } finally {
      setBusy("");
    }
  };

  const totalDue = schedule.reduce(
    (sum, item) => sum + Number(item.total_due || 0),
    0
  );

  const totalPaid = schedule.reduce(
    (sum, item) => sum + Number(item.paid_amount || 0),
    0
  );

  const totalBalance = schedule.reduce((sum, item) => {
    const balance =
      item.balance_due != null
        ? Number(item.balance_due)
        : Math.max(
            0,
            Number(item.total_due || 0) -
              Number(item.paid_amount || 0)
          );

    return sum + balance;
  }, 0);

  const paidCount = schedule.filter(
    (item) =>
      item.status === "paid" ||
      Number(item.balance_due ?? (
        Number(item.total_due || 0) -
        Number(item.paid_amount || 0)
      )) <= 0
  ).length;

  return (
    <article className="p-4 transition hover:bg-slate-50/40 sm:p-6">
      {/* Account header */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-lg font-extrabold text-emerald-700">
          ₹
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="break-words text-base font-extrabold text-[#17365D] sm:text-lg">
            {application.group_name || `Group #${application.group}`}
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Application #{id}
            {application.member_count != null &&
              ` · ${application.member_count} members`}
          </p>
        </div>

        <LoanStatus status={application.status} />
      </div>

      {/* Account information */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
            Loan Amount
          </p>
          <p className="mt-1.5 break-words text-sm font-extrabold text-slate-900">
            {money(
              application.approved_total ||
                application.requested_total
            )}
          </p>
        </div>

        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
            Interest Rate
          </p>
          <p className="mt-1.5 text-sm font-extrabold text-slate-900">
            {application.interest_rate ?? "—"}%
          </p>
        </div>

        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
            Tenure
          </p>
          <p className="mt-1.5 text-sm font-extrabold text-slate-900">
            {application.tenure_months ?? "—"} months
          </p>
        </div>

        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
            Repayment
          </p>
          <p className="mt-1.5 text-sm font-extrabold capitalize text-slate-900">
            {application.repayment_frequency || "—"}
          </p>
        </div>
      </div>

      {/* Schedule actions */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-extrabold text-slate-800">
            EMI Repayment Schedule
          </h4>
          <p className="mt-1 text-xs text-slate-500">
            View installment details and record customer repayments.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (expanded) {
              setExpanded(false);
            } else {
              loadSchedule();
            }
          }}
          disabled={loadingSchedule}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:opacity-50"
        >
          {loadingSchedule
            ? "Loading..."
            : expanded
              ? "Hide EMI Schedule"
              : "View EMI & Collect"}
        </button>
      </div>

      {/* EMI schedule */}
      {expanded && (
        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
          {schedule.length > 0 ? (
            <>
              <div className="grid grid-cols-1 gap-3 border-b border-slate-200 bg-slate-50 p-4 sm:grid-cols-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    Total Scheduled
                  </p>
                  <p className="mt-1 text-base font-extrabold text-slate-900">
                    {money(totalDue)}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                    Total Collected
                  </p>
                  <p className="mt-1 text-base font-extrabold text-emerald-700">
                    {money(totalPaid)}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-orange-700">
                    Outstanding Balance
                  </p>
                  <p className="mt-1 text-base font-extrabold text-orange-700">
                    {money(totalBalance)}
                  </p>
                </div>
              </div>

              <div className="border-b border-slate-100 bg-white px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-slate-500">
                    Installments completed
                  </span>
                  <span className="text-xs font-extrabold text-slate-800">
                    {paidCount} / {schedule.length}
                  </span>
                </div>

                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{
                      width: `${
                        schedule.length
                          ? (paidCount / schedule.length) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[1050px] text-left text-sm">
                  <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">EMI No.</th>
                      <th className="px-4 py-3">Due Date</th>
                      <th className="px-4 py-3">Principal</th>
                      <th className="px-4 py-3">Interest</th>
                      <th className="px-4 py-3">EMI Amount</th>
                      <th className="px-4 py-3">Paid</th>
                      <th className="px-4 py-3">Balance</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Repayment Entry</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {schedule.map((item) => {
                      const balance = Math.max(
                        0,
                        Number(
                          item.balance_due ??
                            (
                              Number(item.total_due || 0) -
                              Number(item.paid_amount || 0)
                            )
                        )
                      );

                      const isPaid =
                        item.status === "paid" || balance <= 0;

                      return (
                        <tr
                          key={item.id || item.installment_number}
                          className="align-top transition hover:bg-slate-50/70"
                        >
                          <td className="px-4 py-4 font-extrabold text-slate-700">
                            {item.installment_number}
                          </td>

                          <td className="whitespace-nowrap px-4 py-4 text-slate-600">
                            {item.due_date
                              ? new Date(
                                  `${item.due_date}T00:00:00`
                                ).toLocaleDateString("en-IN")
                              : "—"}
                          </td>

                          <td className="whitespace-nowrap px-4 py-4 text-slate-600">
                            {money(item.principal_due)}
                          </td>

                          <td className="whitespace-nowrap px-4 py-4 text-slate-600">
                            {money(item.interest_due)}
                          </td>

                          <td className="whitespace-nowrap px-4 py-4 font-bold text-slate-900">
                            {money(item.total_due)}
                          </td>

                          <td className="whitespace-nowrap px-4 py-4 font-semibold text-emerald-700">
                            {money(item.paid_amount)}
                          </td>

                          <td className="whitespace-nowrap px-4 py-4 font-bold text-slate-900">
                            {money(balance)}
                          </td>

                          <td className="px-4 py-4">
                            <InstallmentStatus status={item.status} />
                          </td>

                          <td className="min-w-64 px-4 py-4">
                            {isPaid ? (
                              <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-emerald-700">
                                ✓ Fully Paid
                              </span>
                            ) : normalizeStatus(application.status) === "closed"? (
                              <span className="text-xs text-slate-400">
                                Loan closed
                              </span>
                            ) : (
                              <div className="min-w-56 space-y-2">
                                <input
                                  type="number"
                                  min="0.01"
                                  max={balance}
                                  step="0.01"
                                  value={paymentAmounts[item.id] || ""}
                                  onChange={(event) =>
                                    setPaymentAmounts((old) => ({
                                      ...old,
                                      [item.id]: event.target.value,
                                    }))
                                  }
                                  placeholder={`Balance ${money(balance)}`}
                                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                />

                                <input
                                  type="text"
                                  value={paymentReferences[item.id] || ""}
                                  onChange={(event) =>
                                    setPaymentReferences((old) => ({
                                      ...old,
                                      [item.id]: event.target.value,
                                    }))
                                  }
                                  placeholder="Receipt / reference (optional)"
                                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                />

                                <button
                                  type="button"
                                  disabled={Boolean(busy) || !item.id}
                                  onClick={() => recordPayment(item)}
                                  className="w-full rounded-lg bg-blue-700 px-3 py-2.5 text-xs font-bold text-white transition hover:bg-blue-800 disabled:opacity-50"
                                >
                                  {busy === `payment-${item.id}`
                                    ? "Saving..."
                                    : "Record Collection"}
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="p-8 text-center">
              <p className="font-bold text-slate-700">
                No installments found
              </p>
              <p className="mt-1 text-sm text-slate-500">
                The backend did not return an EMI schedule for this loan.
              </p>
            </div>
          )}
        </div>
      )}
    </article>
  );
}
