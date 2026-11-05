
import { CalendarDays, RefreshCw } from "lucide-react";

const CollectionHeader = ({ onRefresh, loading }) => {
  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Collections
          </h1>
          <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
            Group Loans
          </span>
        </div>

        <p className="mt-1 text-sm text-slate-500">
          Manage daily collections, payments and customer follow-ups.
        </p>

        <div className="mt-3 flex items-center gap-2 text-sm text-slate-500">
          <CalendarDays size={16} className="text-blue-600" />
          {today}
        </div>
      </div>

      <button
        onClick={onRefresh}
        disabled={loading}
        className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50"
      >
        <RefreshCw
          size={16}
          className={loading ? "animate-spin" : ""}
        />
        Refresh Data
      </button>
    </div>
  );
};

export default CollectionHeader;
