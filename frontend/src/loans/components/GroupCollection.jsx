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
  paid: "bg-green-100 text-green-700",
  partial: "bg-amber-100 text-amber-700",
  pending: "bg-blue-100 text-blue-700",
  overdue: "bg-red-100 text-red-700",
};

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
      <div className="flex min-h-[300px] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="m-4 rounded-xl border border-red-200 bg-red-50 p-5 text-red-700">
        <p className="font-semibold">Unable to load Group Collection</p>
        <p className="mt-2 whitespace-pre-wrap text-sm">{error}</p>
        <button
          onClick={loadData}
          className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-white"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium text-blue-600">
              SMLNEXGEN / Group Loan
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-800">
              Group EMI Collection
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {data?.group_name || "Group"} · Application #{applicationId}
            </p>
          </div>

          <button
            onClick={loadData}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            ↻ Refresh
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="whitespace-pre-wrap rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
            {success}
          </div>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard title="Total EMI Due" value={totalDue} color="blue" />
          <SummaryCard
            title="Total Collected"
            value={totalPaid}
            color="green"
          />
          <SummaryCard title="Outstanding" value={totalBalance} color="red" />
          <SummaryCard
            title="Collection Entries"
            value={collections.length}
            color="purple"
            isCount
          />
        </div>

        {/* Collection Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col justify-between gap-3 border-b border-slate-200 p-5 md:flex-row md:items-center">
              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  Member-wise EMI Details
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Enter payment amount against each member.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <select
                  value={selectedInstallment}
                  onChange={(e) => setSelectedInstallment(e.target.value)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
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
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                >
                  <option value="unpaid">Pending + Partial + Overdue</option>
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="partial">Partial</option>
                  <option value="overdue">Overdue</option>
                  <option value="paid">Paid</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[950px] text-left text-sm">
                <thead className="bg-slate-100 text-xs uppercase text-slate-600">
                  <tr>
                    <th className="px-5 py-4">Member</th>
                    <th className="px-5 py-4">EMI</th>
                    <th className="px-5 py-4">Due Date</th>
                    <th className="px-5 py-4 text-right">Due Amount</th>
                    <th className="px-5 py-4 text-right">Paid</th>
                    <th className="px-5 py-4 text-right">Balance</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Collect Now</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredInstallments.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-800">
                          {item.customer_name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {item.mobile_number ||
                            `Customer #${item.customer_id}`}
                        </p>
                      </td>

                      <td className="px-5 py-4 font-medium text-slate-700">
                        EMI {item.installment_number}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {item.due_date}
                      </td>

                      <td className="px-5 py-4 text-right font-medium">
                        ₹{money(item.total_due)}
                      </td>

                      <td className="px-5 py-4 text-right text-green-700">
                        ₹{money(item.paid_amount)}
                      </td>

                      <td className="px-5 py-4 text-right font-semibold text-red-600">
                        ₹{money(item.balance_due)}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusStyle[item.status] || "bg-slate-100 text-slate-700"}`}
                        >
                          {item.status}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        {Number(item.balance_due) > 0 ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="0"
                              max={item.balance_due}
                              step="0.01"
                              value={amounts[item.id] ?? ""}
                              onChange={(e) =>
                                updateAmount(item, e.target.value)
                              }
                              placeholder="₹ Amount"
                              className="w-28 rounded-lg border border-slate-300 px-2 py-2 outline-none focus:border-blue-500"
                            />
                            <button
                              type="button"
                              onClick={() => selectFullBalance(item)}
                              title="Collect full balance"
                              className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                            >
                              Full
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs font-semibold text-green-600">
                            Fully Paid
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}

                  {!filteredInstallments.length && (
                    <tr>
                      <td
                        colSpan="8"
                        className="px-5 py-12 text-center text-slate-500"
                      >
                        No member installments found for this filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col justify-between gap-3 border-t border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center">
              <p className="text-sm text-slate-600">
                {selectedRows.length} member installment(s) selected
              </p>
              <button
                type="button"
                onClick={clearAmounts}
                className="text-sm font-semibold text-red-600 hover:underline"
              >
                Clear all amounts
              </button>
            </div>
          </div>

          {/* Payment details */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
              <h2 className="text-lg font-bold text-slate-800">
                Payment Details
              </h2>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="Payment Method">
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="form-input"
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
                    className="form-input"
                  />
                </FormField>

                <FormField label="Transaction Reference">
                  <input
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="UPI / Bank transaction ID"
                    className="form-input"
                  />
                </FormField>

                <FormField label="Notes">
                  <input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Optional collection notes"
                    className="form-input"
                  />
                </FormField>
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-2xl bg-blue-700 p-5 text-white shadow-sm">
              <div>
                <p className="text-sm text-blue-100">Total Collection Amount</p>
                <p className="mt-2 text-3xl font-bold">
                  ₹{money(collectionTotal)}
                </p>
                <p className="mt-2 text-xs text-blue-100">
                  Based on member-wise allocation
                </p>
                <div className="mt-5 border-t border-blue-500 pt-4 text-sm">
                  <div className="flex justify-between">
                    <span>Selected members</span>
                    <span className="font-semibold">{selectedRows.length}</span>
                  </div>
                  <div className="mt-2 flex justify-between">
                    <span>Payment method</span>
                    <span className="font-semibold uppercase">
                      {paymentMethod}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={saving || collectionTotal <= 0}
                className="mt-6 w-full rounded-xl bg-white px-4 py-3 font-bold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Saving Collection..." : "Save Group Collection"}
              </button>
            </div>
          </div>
        </form>

        {/* Collection history */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5">
            <h2 className="text-lg font-bold text-slate-800">
              Collection History
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Previously recorded group collections and receipts.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="bg-slate-100 text-xs uppercase text-slate-600">
                <tr>
                  <th className="px-5 py-4">Receipt No</th>
                  <th className="px-5 py-4">Date</th>
                  <th className="px-5 py-4">Method</th>
                  <th className="px-5 py-4">Reference</th>
                  <th className="px-5 py-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {collections.map((item) => (
                  <tr key={item.id}>
                    <td className="px-5 py-4 font-semibold text-blue-700">
                      {item.receipt_number}
                    </td>
                    <td className="px-5 py-4">{item.payment_date}</td>
                    <td className="px-5 py-4 capitalize">
                      {item.payment_method}
                    </td>
                    <td className="px-5 py-4">{item.reference || "-"}</td>
                    <td className="px-5 py-4 text-right font-bold text-green-700">
                      ₹{money(item.amount)}
                    </td>
                  </tr>
                ))}

                {!collections.length && (
                  <tr>
                    <td
                      colSpan="5"
                      className="px-5 py-10 text-center text-slate-500"
                    >
                      No collection entries yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Receipt */}
        {receipt && (
          <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <p className="font-bold text-green-800">
                  Collection Saved Successfully
                </p>
                <p className="mt-1 text-sm text-green-700">
                  Receipt: {receipt.receipt_number || "-"}
                </p>
                <p className="text-sm text-green-700">
                  Amount: ₹{money(receipt.amount)}
                </p>
              </div>
              <button
                type="button"
                onClick={printReceipt}
                className="rounded-lg bg-green-700 px-4 py-2 font-semibold text-white hover:bg-green-800"
              >
                Print Receipt
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .form-input {
          width: 100%;
          border: 1px solid #cbd5e1;
          border-radius: 0.5rem;
          padding: 0.65rem 0.75rem;
          outline: none;
          background: white;
        }
        .form-input:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 2px rgb(37 99 235 / 12%);
        }
        @media print {
          body * { visibility: hidden; }
          .print-receipt, .print-receipt * { visibility: visible; }
        }
      `}</style>
    </div>
  );
}

function SummaryCard({ title, value, color, isCount = false }) {
  const colors = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-green-50 text-green-700",
    red: "bg-red-50 text-red-700",
    purple: "bg-purple-50 text-purple-700",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className={`mt-3 text-2xl font-bold ${colors[color]}`}>
        {isCount ? value : `₹${money(value)}`}
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
