
import {
  CalendarDays,
  RefreshCw,
  Wallet,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";

const CollectionHeader = ({ onRefresh, loading }) => {
  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <header className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

      {/* Decorative Background */}
      <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-blue-100/60 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 right-1/3 h-52 w-52 rounded-full bg-indigo-100/40 blur-3xl" />

      <div className="relative flex flex-col justify-between gap-6 p-5 sm:p-7 lg:flex-row lg:items-center lg:p-8">

        {/* Left Section */}
        <div className="min-w-0">
          {/* Breadcrumb */}
          <div className="mb-4 flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-[0.15em]">
            <span className="text-slate-400">SMLNEXGEN</span>
            <span className="text-slate-300">/</span>
            <span className="text-blue-700">Finance Management</span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-500">Collections</span>
          </div>

          {/* Title */}
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-700 to-indigo-800 text-white shadow-lg shadow-blue-200">
              <Wallet size={24} />
            </div>

            <div className="min-w-0">
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                Collections
              </h1>

              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-slate-500">
                  Daily repayment and collection management
                </span>

                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700">
                  <ShieldCheck size={12} />
                  Group Lending
                </span>
              </div>
            </div>
          </div>

          {/* Date and Status */}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5">
              <CalendarDays size={16} className="text-blue-700" />
              <span className="text-xs font-semibold text-slate-600">
                {today}
              </span>
            </div>

            <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3.5 py-2.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>

              <span className="text-xs font-bold text-emerald-700">
                Collection Module Active
              </span>
            </div>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center">

          <div className="hidden rounded-xl border border-blue-100 bg-blue-50/70 px-4 py-3 lg:block">
            <div className="flex items-center gap-2">
              <TrendingUp size={17} className="text-blue-700" />
              <span className="text-xs font-bold text-blue-800">
                Finance Operations
              </span>
            </div>

            <p className="mt-1 text-[11px] text-slate-500">
              Monitor and manage repayments
            </p>
          </div>

          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white shadow-md shadow-blue-200 transition hover:-translate-y-0.5 hover:bg-blue-800 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
          >
            <RefreshCw
              size={17}
              className={loading ? "animate-spin" : ""}
            />

            {loading ? "Refreshing..." : "Refresh Data"}
          </button>
        </div>
      </div>

      {/* Bottom Accent */}
      <div className="h-1 w-full bg-gradient-to-r from-blue-700 via-indigo-500 to-blue-100" />
    </header>
  );
};

export default CollectionHeader;
