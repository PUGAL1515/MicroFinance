
import { Search, IndianRupee, ArrowRight } from "lucide-react";
import { useMemo, useState } from "react";

const currency = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
  })}`;

const TodayDues = ({ dues = [], onCollect }) => {
  const [search, setSearch] = useState("");

  const filteredDues = useMemo(() => {
    return dues.filter((item) => {
      const text = `${item.customer_name || ""} ${
        item.customer_mobile || ""
      } ${item.group_name || ""}`.toLowerCase();

      return text.includes(search.toLowerCase());
    });
  }, [dues, search]);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Today's Collection Dues
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Customer-wise installment collection details
          </p>
        </div>

        <div className="relative w-full sm:max-w-xs">
          <Search
            size={17}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
          />
        </div>
      </div>

      {filteredDues.length === 0 ? (
        <div className="px-5 py-16 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <IndianRupee size={25} />
          </div>
          <h3 className="mt-4 font-semibold text-slate-800">
            No dues found
          </h3>
          <p className="mt-1 text-sm text-slate-400">
            No matching installments available for collection.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[850px] text-left">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-4">Customer</th>
                  <th className="px-5 py-4">Group</th>
                  <th className="px-5 py-4">Installment</th>
                  <th className="px-5 py-4">Due Amount</th>
                  <th className="px-5 py-4">Paid</th>
                  <th className="px-5 py-4">Balance</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredDues.map((item) => (
                  <tr
                    key={item.id}
                    className="transition hover:bg-blue-50/40"
                  >
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-800">
                        {item.customer_name}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {item.customer_mobile}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-600">
                      {item.group_name}
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-600">
                      #{item.installment_number}
                    </td>

                    <td className="px-5 py-4 text-sm font-semibold text-slate-800">
                      {currency(item.total_due)}
                    </td>

                    <td className="px-5 py-4 text-sm text-emerald-600">
                      {currency(item.paid_amount)}
                    </td>

                    <td className="px-5 py-4 text-sm font-bold text-rose-600">
                      {currency(item.balance_due)}
                    </td>

                    <td className="px-5 py-4">
                      <StatusBadge status={item.status} />
                    </td>

                    <td className="px-5 py-4">
                      <button
                        disabled={Number(item.balance_due) <= 0}
                        onClick={() => onCollect(item)}
                        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Collect <ArrowRight size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 p-4 md:hidden">
            {filteredDues.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-slate-800">
                      {item.customer_name}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {item.customer_mobile}
                    </p>
                    <p className="mt-2 text-xs font-medium text-blue-600">
                      {item.group_name} · EMI #{item.installment_number}
                    </p>
                  </div>

                  <StatusBadge status={item.status} />
                </div>

                <div className="my-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3">
                  <div>
                    <p className="text-xs text-slate-400">Due Amount</p>
                    <p className="mt-1 font-bold text-slate-800">
                      {currency(item.total_due)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-400">Balance</p>
                    <p className="mt-1 font-bold text-rose-600">
                      {currency(item.balance_due)}
                    </p>
                  </div>
                </div>

                <button
                  disabled={Number(item.balance_due) <= 0}
                  onClick={() => onCollect(item)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-40"
                >
                  Collect Payment <ArrowRight size={16} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export function StatusBadge({ status }) {
  const styles = {
    pending: "bg-amber-50 text-amber-700",
    partial: "bg-blue-50 text-blue-700",
    paid: "bg-emerald-50 text-emerald-700",
    overdue: "bg-rose-50 text-rose-700",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
        styles[status] || "bg-slate-100 text-slate-600"
      }`}
    >
      {status || "Pending"}
    </span>
  );
}

export default TodayDues;
