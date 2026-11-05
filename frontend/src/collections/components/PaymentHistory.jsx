
import { useState } from "react";
import { Search, Receipt, CalendarDays } from "lucide-react";

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
  })}`;

const PaymentHistory = ({ payments = [], onViewReceipt }) => {
  const [search, setSearch] = useState("");
  const [method, setMethod] = useState("");

  const filtered = payments.filter((item) => {
    const searchText = `${item.receipt_number || ""} ${
      item.group_name || ""
    } ${item.collector_name || ""}`.toLowerCase();

    return (
      searchText.includes(search.toLowerCase()) &&
      (!method || item.payment_method === method)
    );
  });

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Payment History
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            All recorded collection transactions
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search receipt..."
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-400 sm:w-48"
            />
          </div>

          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400"
          >
            <option value="">All Methods</option>
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
            <option value="bank">Bank</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="py-14 text-center">
          <Receipt className="mx-auto text-slate-300" size={35} />
          <p className="mt-3 font-semibold text-slate-700">
            No payment records found
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-4 p-4 transition hover:bg-blue-50/30 sm:flex-row sm:items-center sm:justify-between sm:px-5"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <Receipt size={20} />
                </div>

                <div className="min-w-0">
                  <p className="break-all font-bold text-slate-800">
                    {item.receipt_number || `Receipt #${item.id}`}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {item.group_name || "Group Loan"}
                  </p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                    <CalendarDays size={13} />
                    {item.payment_date || "-"}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 sm:justify-end">
                <div>
                  <p className="text-lg font-bold text-emerald-600">
                    {money(item.amount)}
                  </p>
                  <p className="text-xs capitalize text-slate-400">
                    {item.payment_method}
                  </p>
                </div>

                <button
                  onClick={() => onViewReceipt(item)}
                  className="rounded-xl border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-600 hover:text-white"
                >
                  View Receipt
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PaymentHistory;
