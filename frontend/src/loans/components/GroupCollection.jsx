
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

const getToken = () =>
  localStorage.getItem("access") ||
  localStorage.getItem("access_token") ||
  localStorage.getItem("authToken") ||
  localStorage.getItem("token") ||
  "";

const money = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const statusStyle = {
  paid: "border-emerald-200 bg-emerald-50 text-emerald-700",
  partial: "border-amber-200 bg-amber-50 text-amber-700",
  pending: "border-blue-200 bg-blue-50 text-blue-700",
  overdue: "border-red-200 bg-red-50 text-red-700",
};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-50";

function StatusBadge({ status }) {
  const normalized = String(status || "pending").toLowerCase();

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold capitalize ${
        statusStyle[normalized] || "border-slate-200 bg-slate-100 text-slate-600"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          normalized === "paid"
            ? "bg-emerald-500"
            : normalized === "partial"
              ? "bg-amber-500"
              : normalized === "overdue"
                ? "bg-red-500"
                : "bg-blue-500"
        }`}
      />
      {normalized}
    </span>
  );
}

function SummaryCard({ title, value, color, isCount = false, icon }) {
  const colors = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-emerald-50 text-emerald-700",
    red: "bg-red-50 text-red-700",
    purple: "bg-violet-50 text-violet-700",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <span
          className={`flex h-11 w-11 items-center justify-center rounded-xl text-xl ${
            colors[color]
          }`}
        >
          {icon}
        </span>
      </div>
      <p className="mt-4 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
        {isCount ? value : `₹${money(value)}`}
      </p>
      <p className="mt-1 text-xs text-slate-400">
        {isCount ? "Recorded transactions" : "Group loan amount"}
      </p>
    </div>
  );
}

function FormField({ label, children }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </span>
      {children}
    </label>
  );
}

function SectionHeader({ icon, title, description, action }) {
  return (
    <div className="flex flex-col justify-between gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:px-6">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-lg text-blue-700">
          {icon}
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-900">{title}</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
            {description}
          </p>
        </div>
      </div>
      {action}
    </div>
  );
}

export default function GroupCollection({ applicationId: propApplicationId }) {
  const params = useParams();
  const applicationId = propApplicationId || params.applicationId;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [filter, setFilter] = useState("unpaid");
  const [selectedInstallment, setSelectedInstallment] = useState("all");

  const [amounts, setAmounts] = useState({});
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentDate, setPaymentDate] = useState(today());
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [receipt, setReceipt] = useState(null);

  const headers = useMemo(() => {
    const token = getToken();
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }, []);

  const endpoint = `${API_BASE}/api/group-loan/applications/${applicationId}/collections/`;

  const loadData = useCallback(async () => {
    if (!applicationId) {
      setError("Group Loan Application ID is missing.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(endpoint, { headers });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.detail || result.message || "Unable to load group collection.",
        );
      }

      setData(result);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [applicationId, endpoint, headers]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const installments = data?.member_installments || [];
  const collections = data?.collections || [];

  const installmentNumbers = useMemo(() => {
    return [
      ...new Set(installments.map((item) => item.installment_number)),
    ].sort((a, b) => a - b);
  }, [installments]);

  const filteredInstallments = useMemo(() => {
    return installments.filter((item) => {
      const statusMatch =
        filter === "all" ||
        (filter === "unpaid" && item.status !== "paid") ||
        item.status === filter;

      const installmentMatch =
        selectedInstallment === "all" ||
        String(item.installment_number) === String(selectedInstallment);

      return statusMatch && installmentMatch;
    });
  }, [installments, filter, selectedInstallment]);

  const totalDue = installments.reduce(
    (sum, item) => sum + Number(item.total_due || 0),
    0,
  );

  const totalPaid = installments.reduce(
    (sum, item) => sum + Number(item.paid_amount || 0),
    0,
  );

  const totalBalance = installments.reduce(
    (sum, item) => sum + Number(item.balance_due || 0),
    0,
  );

  const selectedRows = useMemo(() => {
    return Object.entries(amounts)
      .filter(([, value]) => Number(value) > 0)
      .map(([id, value]) => ({
        member_installment: Number(id),
        amount: Number(value).toFixed(2),
      }));
  }, [amounts]);

  const collectionTotal = selectedRows.reduce(
    (sum, item) => sum + Number(item.amount),
    0,
  );

  const updateAmount = (item, value) => {
    const balance = Number(item.balance_due || 0);
    const entered = value === "" ? "" : Math.max(0, Number(value));

    if (entered !== "" && entered > balance) {
      setAmounts((prev) => ({ ...prev, [item.id]: balance.toFixed(2) }));
      return;
    }

    setAmounts((prev) => ({ ...prev, [item.id]: entered }));
  };

  const selectFullBalance = (item) => {
    setAmounts((prev) => ({
      ...prev,
      [item.id]: Number(item.balance_due).toFixed(2),
    }));
  };

  const clearAmounts = () => setAmounts({});

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!selectedRows.length) {
      setError("Enter collection amount for at least one member.");
      return;
    }

    if (!paymentDate) {
      setError("Select payment date.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        amount: collectionTotal.toFixed(2),
        payment_method: paymentMethod,
        payment_date: paymentDate,
        reference,
        notes,
        allocations: selectedRows,
      };

      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        const message =
          typeof result === "object"
            ? Object.entries(result)
                .map(
                  ([key, value]) =>
                    `${key}: ${Array.isArray(value) ? value.join(", ") : typeof value === "string" ? value : JSON.stringify(value)}`,
                )
                .join("\n")
            : "Collection failed.";

        throw new Error(message || "Collection failed.");
      }

      setReceipt(result.receipt || result);
      setSuccess("Group collection saved successfully.");
      setAmounts({});
      setReference("");
      setNotes("");

      await loadData();
    } catch (err) {
      setError(err.message || "Unable to save collection.");
    } finally {
      setSaving(false);
    }
  };

  const printReceipt = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <div className="h-11 w-11 animate-spin rounded-full border-4 border-blue-100 border-t-blue-700" />
        <p className="text-sm font-medium text-slate-500">
          Loading group collection...
        </p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex min-h-[55vh] items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-2xl border border-red-200 bg-white p-7 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-2xl">
            ⚠️
          </div>
          <h2 className="mt-4 text-lg font-bold text-slate-900">
            Unable to Load Group Collection
          </h2>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-red-600">
            {error}
          </p>
          <button
            onClick={loadData}
            className="mt-5 rounded-xl bg-blue-700 px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-800"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 pb-8">
      {/* Page Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-950 via-blue-900 to-blue-700 p-5 text-white shadow-lg shadow-blue-900/10 sm:p-7">
        <div className="relative z-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-blue-100">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              SMLNEXGEN / GROUP LOAN
            </div>

            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Group EMI Collection
            </h1>

            <p className="mt-2 text-sm text-blue-100">
              {data?.group_name || "Group"} · Application #{applicationId}
            </p>
            <p className="mt-1 text-xs text-blue-200">
              Manage member-wise EMI payments and collection records.
            </p>
          </div>

          <button
            onClick={loadData}
            className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/20 sm:self-center"
          >
            <span className="text-lg">↻</span>
            Refresh Data
          </button>
        </div>

        <div className="pointer-events-none absolute -right-12 -top-24 h-64 w-64 rounded-full border-[35px] border-white/5" />
        <div className="pointer-events-none absolute -bottom-28 right-28 h-48 w-48 rounded-full bg-blue-400/10 blur-2xl" />
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <div className="flex items-start gap-2">
            <span className="text-base">⚠️</span>
            <p className="whitespace-pre-wrap leading-6">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => setError("")}
            className="shrink-0 rounded-lg px-2 py-1 font-bold hover:bg-red-100"
          >
            ✕
          </button>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100">
            ✓
          </span>
          {success}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Total EMI Due"
          value={totalDue}
          color="blue"
          icon="📋"
        />
        <SummaryCard
          title="Total Collected"
          value={totalPaid}
          color="green"
          icon="✓"
        />
        <SummaryCard
          title="Outstanding Balance"
          value={totalBalance}
          color="red"
          icon="₹"
        />
        <SummaryCard
          title="Collection Entries"
          value={collections.length}
          color="purple"
          icon="📁"
          isCount
        />
      </div>

      {/* Collection Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Member-wise EMI */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <SectionHeader
            icon="👥"
            title="Member-wise EMI Details"
            description="Review outstanding installments and enter collection amounts for each member."
            action={
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <select
                  value={selectedInstallment}
                  onChange={(e) => setSelectedInstallment(e.target.value)}
                  className={inputClass}
                >
                  <option value="all">All Installments</option>
                  {installmentNumbers.map((number) => (
                    <option key={number} value={number}>
                      EMI {number}
                    </option>
                  ))}
                </select>

                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className={inputClass}
                >
                  <option value="unpaid">Pending + Partial + Overdue</option>
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="partial">Partial</option>
                  <option value="overdue">Overdue</option>
                  <option value="paid">Paid</option>
                </select>
              </div>
            }
          />

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-4 font-bold">Member</th>
                  <th className="px-5 py-4 font-bold">EMI</th>
                  <th className="px-5 py-4 font-bold">Due Date</th>
                  <th className="px-5 py-4 text-right font-bold">Due Amount</th>
                  <th className="px-5 py-4 text-right font-bold">Paid</th>
                  <th className="px-5 py-4 text-right font-bold">Balance</th>
                  <th className="px-5 py-4 font-bold">Status</th>
                  <th className="px-5 py-4 font-bold">Collect Now</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredInstallments.map((item) => (
                  <tr
                    key={item.id}
                    className="transition hover:bg-blue-50/30"
                  >
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-800">
                        {item.customer_name}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {item.mobile_number ||
                          `Customer #${item.customer_id}`}
                      </p>
                    </td>

                    <td className="px-5 py-4 font-semibold text-slate-700">
                      EMI {item.installment_number}
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap text-slate-600">
                      {item.due_date}
                    </td>

                    <td className="px-5 py-4 text-right font-medium tabular-nums text-slate-700">
                      ₹{money(item.total_due)}
                    </td>

                    <td className="px-5 py-4 text-right font-medium tabular-nums text-emerald-700">
                      ₹{money(item.paid_amount)}
                    </td>

                    <td className="px-5 py-4 text-right font-bold tabular-nums text-red-600">
                      ₹{money(item.balance_due)}
                    </td>

                    <td className="px-5 py-4">
                      <StatusBadge status={item.status} />
                    </td>

                    <td className="px-5 py-4">
                      {Number(item.balance_due) > 0 ? (
                        <div className="flex items-center gap-2">
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                              ₹
                            </span>
                            <input
                              type="number"
                              min="0"
                              max={item.balance_due}
                              step="0.01"
                              value={amounts[item.id] ?? ""}
                              onChange={(e) =>
                                updateAmount(item, e.target.value)
                              }
                              placeholder="Amount"
                              className="w-28 rounded-xl border border-slate-200 py-2.5 pl-6 pr-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => selectFullBalance(item)}
                            title="Collect full balance"
                            className="rounded-lg bg-blue-50 px-3 py-2.5 text-xs font-bold text-blue-700 transition hover:bg-blue-100"
                          >
                            Full
                          </button>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                          ✓ Fully Paid
                        </span>
                      )}
                    </td>
                  </tr>
                ))}

                {!filteredInstallments.length && (
                  <tr>
                    <td
                      colSpan="8"
                      className="px-5 py-16 text-center text-slate-500"
                    >
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-xl">
                        📋
                      </div>
                      <p className="mt-3 font-semibold text-slate-700">
                        No Installments Found
                      </p>
                      <p className="mt-1 text-xs">
                        No member installments match the selected filters.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-semibold text-slate-700">
                {selectedRows.length} member installment(s) selected
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Selected collection amount: ₹{money(collectionTotal)}
              </p>
            </div>

            <button
              type="button"
              onClick={clearAmounts}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
            >
              Clear All Amounts
            </button>
          </div>
        </section>

        {/* Payment Details */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:col-span-2">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-xl">
                💳
              </div>
              <div>
                <h2 className="font-bold text-slate-900">Payment Details</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Enter the payment information for this collection.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <FormField label="Payment Method">
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className={inputClass}
                >
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="bank">Bank Transfer</option>
                  <option value="other">Other</option>
                </select>
              </FormField>

              <FormField label="Payment Date">
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className={inputClass}
                />
              </FormField>

              <FormField label="Transaction Reference">
                <input
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="UPI / Bank transaction ID"
                  className={inputClass}
                />
              </FormField>

              <FormField label="Notes">
                <input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional collection notes"
                  className={inputClass}
                />
              </FormField>
            </div>
          </section>

          {/* Collection Total */}
          <section className="relative flex flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br from-blue-950 to-blue-700 p-5 text-white shadow-lg shadow-blue-900/10 sm:p-6">
            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-blue-100">
                  Total Collection Amount
                </p>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-xl">
                  ₹
                </span>
              </div>

              <p className="mt-4 break-all text-3xl font-bold tracking-tight sm:text-4xl">
                ₹{money(collectionTotal)}
              </p>

              <p className="mt-2 text-xs text-blue-200">
                Based on member-wise allocation
              </p>

              <div className="mt-6 space-y-3 border-t border-white/15 pt-5 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-blue-100">Selected members</span>
                  <span className="font-bold">{selectedRows.length}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-blue-100">Payment method</span>
                  <span className="font-bold uppercase">
                    {paymentMethod}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-blue-100">Payment date</span>
                  <span className="font-bold">{paymentDate}</span>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving || collectionTotal <= 0}
              className="relative z-10 mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3.5 text-sm font-bold text-blue-800 shadow-sm transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-200 border-t-blue-700" />
                  Saving Collection...
                </>
              ) : (
                <>✓ Save Group Collection</>
              )}
            </button>

            <div className="pointer-events-none absolute -bottom-16 -right-16 h-48 w-48 rounded-full border-[25px] border-white/5" />
          </section>
        </div>
      </form>

      {/* Collection History */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <SectionHeader
          icon="📚"
          title="Collection History"
          description="Previously recorded group collections and receipts."
        />

        <div className="overflow-x-auto">
          <table className="w-full min-w-[750px] text-left text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-4 font-bold">Receipt No</th>
                <th className="px-5 py-4 font-bold">Date</th>
                <th className="px-5 py-4 font-bold">Method</th>
                <th className="px-5 py-4 font-bold">Reference</th>
                <th className="px-5 py-4 text-right font-bold">Amount</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {collections.map((item) => (
                <tr key={item.id} className="transition hover:bg-slate-50">
                  <td className="px-5 py-4 font-bold text-blue-700">
                    {item.receipt_number}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                    {item.payment_date}
                  </td>
                  <td className="px-5 py-4">
                    <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold capitalize text-slate-700">
                      {item.payment_method}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-slate-600">
                    {item.reference || "-"}
                  </td>
                  <td className="px-5 py-4 text-right font-bold tabular-nums text-emerald-700">
                    ₹{money(item.amount)}
                  </td>
                </tr>
              ))}

              {!collections.length && (
                <tr>
                  <td
                    colSpan="5"
                    className="px-5 py-14 text-center text-slate-500"
                  >
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-xl">
                      📁
                    </div>
                    <p className="mt-3 font-semibold text-slate-700">
                      No Collection Entries
                    </p>
                    <p className="mt-1 text-xs">
                      Recorded group collections will appear here.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Receipt */}
      {receipt && (
        <section className="print-receipt overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-4 bg-emerald-50 p-5 sm:flex-row sm:items-center sm:p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-2xl text-emerald-700">
                ✓
              </div>
              <div>
                <h3 className="font-bold text-emerald-900">
                  Collection Saved Successfully
                </h3>
                <p className="mt-1 text-sm text-emerald-700">
                  Receipt: {receipt.receipt_number || "-"}
                </p>
                <p className="mt-1 text-sm font-bold text-emerald-800">
                  Amount: ₹{money(receipt.amount)}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={printReceipt}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-800"
            >
              🖨 Print Receipt
            </button>
          </div>
        </section>
      )}

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-receipt,
          .print-receipt * {
            visibility: visible;
          }
          .print-receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            border: 1px solid #d1d5db;
            box-shadow: none;
          }
        }
      `}</style>
    </div>
  );
}
