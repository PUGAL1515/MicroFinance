
import { useState } from "react";

const today = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const money = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-50";

export default function LoanDisbursementForm({
  application,
  busy,
  disabled,
  onSubmit,
  onCancel,
  onError,
}) {
  const [form, setForm] = useState({
    disbursement_date: today(),
    amount: String(
      application.approved_total ||
        application.requested_total ||
        ""
    ),
    disbursement_mode: "bank_transfer",
    transaction_reference: "",
    disbursed_to: application.group_name || "",
    remarks: "",
  });

  const update = (field, value) => {
    setForm((old) => ({
      ...old,
      [field]: value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!form.disbursement_date) {
      onError("Select the disbursement date.");
      return;
    }

    if (
      !form.amount ||
      !Number.isFinite(Number(form.amount)) ||
      Number(form.amount) <= 0
    ) {
      onError("Enter a valid disbursement amount.");
      return;
    }

    if (!form.disbursement_mode) {
      onError("Select the disbursement mode.");
      return;
    }

    if (!form.disbursed_to.trim()) {
      onError("Enter the recipient name.");
      return;
    }

    onSubmit(form);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-5 border-t border-emerald-200 pt-5"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-base font-extrabold text-slate-900">
          Disbursement Details
        </h4>
        <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
          Application #{application.id}
        </span>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-emerald-100 bg-white p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
            Approved Amount
          </p>
          <p className="mt-1 text-lg font-extrabold text-[#17365D]">
            {money(
              application.approved_total ||
                application.requested_total
            )}
          </p>
        </div>

        <div className="rounded-xl border border-emerald-100 bg-white p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
            Group
          </p>
          <p className="mt-1 text-lg font-extrabold text-[#17365D]">
            {application.group_name || `Group #${application.group}`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="block text-sm font-semibold text-slate-700">
          Disbursement Date
          <input
            type="date"
            value={form.disbursement_date}
            onChange={(event) =>
              update("disbursement_date", event.target.value)
            }
            disabled={disabled}
            className={`${inputClass} mt-2`}
          />
        </label>

        <label className="block text-sm font-semibold text-slate-700">
          Disbursement Amount (₹)
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={form.amount}
            onChange={(event) => update("amount", event.target.value)}
            disabled={disabled}
            className={`${inputClass} mt-2`}
          />
        </label>

        <label className="block text-sm font-semibold text-slate-700">
          Disbursement Mode
          <select
            value={form.disbursement_mode}
            onChange={(event) =>
              update("disbursement_mode", event.target.value)
            }
            disabled={disabled}
            className={`${inputClass} mt-2`}
          >
            <option value="bank_transfer">Bank Transfer</option>
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
            <option value="cheque">Cheque</option>
          </select>
        </label>

        <label className="block text-sm font-semibold text-slate-700">
          Transaction Reference / UTR
          <input
            type="text"
            value={form.transaction_reference}
            onChange={(event) =>
              update("transaction_reference", event.target.value)
            }
            placeholder="Enter UTR / transaction ID"
            disabled={disabled}
            className={`${inputClass} mt-2`}
          />
        </label>

        <label className="block text-sm font-semibold text-slate-700 md:col-span-2">
          Disbursed To
          <input
            type="text"
            value={form.disbursed_to}
            onChange={(event) =>
              update("disbursed_to", event.target.value)
            }
            placeholder="Recipient / Group Leader name"
            disabled={disabled}
            className={`${inputClass} mt-2`}
          />
        </label>

        <label className="block text-sm font-semibold text-slate-700 md:col-span-2">
          Remarks
          <textarea
            rows={3}
            value={form.remarks}
            onChange={(event) => update("remarks", event.target.value)}
            placeholder="Enter disbursement remarks"
            disabled={disabled}
            className={`${inputClass} mt-2`}
          />
        </label>
      </div>

      <div className="mt-5 flex flex-wrap justify-end gap-3 border-t border-emerald-100 pt-5">
        <button
          type="button"
          onClick={onCancel}
          disabled={disabled}
          className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={disabled || busy}
          className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800 disabled:opacity-50"
        >
          {busy ? "Processing..." : "Confirm Disbursement"}
        </button>
      </div>
    </form>
  );
}
