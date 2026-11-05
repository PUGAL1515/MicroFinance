
import { AlertTriangle, Phone, IndianRupee } from "lucide-react";

const OverdueList = ({ items = [], onFollowUp }) => {
  const money = (value) =>
    `₹${Number(value || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
    })}`;

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
          <AlertTriangle size={21} />
        </div>
        <div>
          <h2 className="font-bold text-slate-900">Overdue Installments</h2>
          <p className="text-sm text-slate-500">
            Customers with pending installments
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-400">
          No overdue installments found.
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-rose-100 bg-rose-50/40 p-4 transition hover:border-rose-200"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-bold text-slate-800">
                    {item.customer_name}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    {item.customer_mobile} · {item.group_name}
                  </p>
                  <p className="mt-2 text-xs font-semibold text-rose-600">
                    {item.overdue_days || 0} days overdue
                  </p>
                </div>

                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <p className="text-lg font-bold text-rose-600">
                    {money(item.balance_due)}
                  </p>

                  <button
                    onClick={() => onFollowUp(item)}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-blue-700"
                  >
                    <Phone size={14} />
                    Follow Up
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OverdueList;
