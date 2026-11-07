
import { useEffect, useState } from "react";
import { X, Wallet, CheckCircle2 } from "lucide-react";

const PaymentModal = ({ item, onClose, onSubmit, loading }) => {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  const balance = Number(item?.balance_due || 0);

  useEffect(() => {
    if (item) {
      setAmount(balance.toFixed(2));
      setMethod("cash");
      setReference("");
      setNotes("");
    }
  }, [item, balance]);

  if (!item) return null;

 const handleSubmit = (e) => {
  e.preventDefault();

  const value = Number(amount);

  if (!item?.application_id) {
    alert("Application ID missing. Please refresh Today's Dues.");
    console.error("Selected installment:", item);
    return;
  }

  if (!item?.id) {
    alert("Member installment ID missing.");
    return;
  }

  if (!value || value <= 0) {
    alert("Enter a valid payment amount.");
    return;
  }

  if (value > balance) {
    alert("Payment cannot be greater than outstanding balance.");
    return;
  }

  const payload = {
    application_id: Number(item.application_id),
    payment_method: method,
    payment_date: new Date().toISOString().slice(0, 10),
    reference: reference.trim(),
    notes: notes.trim(),

    allocations: [
      {
        member_installment_id: Number(item.id),
        amount: value.toFixed(2),
      },
    ],
  };

  console.log("Collection payload:", payload);
  console.log("Selected installment:", item);

  onSubmit(payload);
};

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-lg sm:rounded-3xl sm:p-7">

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Wallet size={20} />
            </div>

            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Collect Payment
              </h2>
              <p className="text-xs text-slate-500">
                Record customer installment payment
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mt-6 rounded-2xl bg-blue-50 p-4">
          <p className="font-bold text-blue-900">
            {item.customer_name || "Customer"}
          </p>

          <p className="mt-1 text-xs text-blue-600">
            {item.group_name || "Group"} · Installment #
            {item.installment_number || item.id}
          </p>

          <div className="mt-4 flex justify-between">
            <span className="text-sm text-blue-700">
              Outstanding Balance
            </span>

            <span className="text-xl font-bold text-blue-900">
              ₹{balance.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
              })}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Collection Amount *
            </label>

            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-500">
                ₹
              </span>

              <input
                type="number"
                min="0.01"
                max={balance}
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-xl border border-slate-200 py-3 pl-9 pr-4 text-lg font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Payment Method *
            </label>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {["cash", "upi", "bank", "other"].map((value) => (
                <button
                  type="button"
                  key={value}
                  onClick={() => setMethod(value)}
                  className={`rounded-xl border px-2 py-3 text-sm font-semibold capitalize ${
                    method === value
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-slate-200 text-slate-500"
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Reference Number
            </label>

            <input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="UPI / Transaction reference"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Notes
            </label>

            <textarea
              rows="2"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional collection notes..."
              className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
            />
          </div>

          <button
            disabled={loading || !item.id || balance <= 0}
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-700 to-blue-500 py-3.5 font-bold text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
          >
            <CheckCircle2 size={18} />
            {loading ? "Processing..." : "Confirm Collection"}
          </button>

        </form>
      </div>
    </div>
  );
};

export default PaymentModal;
