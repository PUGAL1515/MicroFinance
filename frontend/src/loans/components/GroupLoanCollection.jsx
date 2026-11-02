
import { useCallback, useEffect, useMemo, useState } from "react";
import { loanApi } from "../loanApi";
import LoanCollectionCard from "./LoanCollectionCard";

// Supports common Django REST response formats.
const listOf = (data) => {
  if (Array.isArray(data)) return data;

  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.applications)) return data.applications;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.data?.results)) return data.data.results;
  if (Array.isArray(data?.data?.applications)) return data.data.applications;

  return [];
};

const normalizeStatus = (status) =>
  String(status || "").trim().toLowerCase();

const formatMoney = (amount) =>
  Number(amount || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });

export default function GroupLoanCollection() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const loadApplications = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await loanApi.getApplications();

      console.log("Collection API response:", response);

      const data = listOf(response);

      console.log("Normalized applications:", data);

      setApplications(data);
    } catch (err) {
      console.error("Collection loading error:", err);

      setError(
        err.response?.data?.detail ||
          err.response?.data?.message ||
          err.message ||
          "Unable to load collection accounts."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  // Only successfully disbursed and closed loans belong here.
  const collectionApplications = useMemo(() => {
    return applications.filter((application) =>
      ["disbursed", "closed"].includes(
        normalizeStatus(application.status)
      )
    );
  }, [applications]);

  const filteredApplications = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    return collectionApplications.filter((application) => {
      const groupName = String(
        application.group_name ||
          application.group_details?.name ||
          ""
      ).toLowerCase();

      const applicationId = String(application.id || "").toLowerCase();

      const matchesSearch =
        !searchText ||
        groupName.includes(searchText) ||
        applicationId.includes(searchText);

      const status = normalizeStatus(application.status);

      const matchesFilter =
        filter === "all" || status === filter;

      return matchesSearch && matchesFilter;
    });
  }, [collectionApplications, search, filter]);

  const totalAccounts = collectionApplications.length;

  const disbursedCount = collectionApplications.filter(
    (item) => normalizeStatus(item.status) === "disbursed"
  ).length;

  const closedCount = collectionApplications.filter(
    (item) => normalizeStatus(item.status) === "closed"
  ).length;

  const handlePaymentSuccess = async (successText) => {
    setMessage(successText || "Payment recorded successfully.");
    await loadApplications();
  };

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-6 pb-8">

      {/* Header */}
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            SMLNEXGEN / Group Loans
          </div>

          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-[#17365D] sm:text-3xl">
            Loan Collections
          </h1>

          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
            Manage disbursed group loans, EMI schedules, repayments and outstanding balances.
          </p>
        </div>

        <button
          type="button"
          onClick={loadApplications}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          ↻ {loading ? "Refreshing..." : "Refresh Collections"}
        </button>
      </section>

      {/* Summary Cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">
            Total Collection Accounts
          </p>
          <p className="mt-2 text-3xl font-extrabold text-[#17365D]">
            {totalAccounts}
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-5">
          <p className="text-xs font-semibold text-emerald-700">
            Active Disbursed Loans
          </p>
          <p className="mt-2 text-3xl font-extrabold text-emerald-800">
            {disbursedCount}
          </p>
        </div>

        <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-5">
          <p className="text-xs font-semibold text-blue-700">
            Closed Loans
          </p>
          <p className="mt-2 text-3xl font-extrabold text-blue-800">
            {closedCount}
          </p>
        </div>
      </section>

      {/* Alerts */}
      {error && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="whitespace-pre-line">{error}</p>

          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Dismiss error"
            className="rounded-lg px-2 font-bold hover:bg-red-100"
          >
            ✕
          </button>
        </div>
      )}

      {message && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <p>{message}</p>

          <button
            type="button"
            onClick={() => setMessage("")}
            aria-label="Dismiss message"
            className="rounded-lg px-2 font-bold hover:bg-emerald-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* Search and Filters */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_220px]">
          <label className="block">
            <span className="mb-2 block text-xs font-bold text-slate-600">
              Search Group / Application
            </span>

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by group name or application ID..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-bold text-slate-600">
              Account Status
            </span>

            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
            >
              <option value="all">All Accounts</option>
              <option value="disbursed">Active Disbursed</option>
              <option value="closed">Closed</option>
            </select>
          </label>
        </div>
      </section>

      {/* Collection List */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
            Repayment Management
          </p>

          <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-extrabold text-[#17365D] sm:text-xl">
                Disbursed Loan Accounts
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                View EMI details and record repayments for each loan.
              </p>
            </div>

            <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
              {filteredApplications.length} Accounts
            </span>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center p-12">
            <div className="h-9 w-9 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-700" />
            <p className="mt-4 text-sm font-medium text-slate-500">
              Loading collection accounts...
            </p>
          </div>
        ) : filteredApplications.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-3xl text-emerald-600">
              ₹
            </div>

            <h3 className="mt-4 text-base font-extrabold text-slate-800">
              No collection accounts found
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              Successfully disbursed loans will appear here for EMI tracking and repayment.
            </p>

            <button
              type="button"
              onClick={loadApplications}
              className="mt-5 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-800"
            >
              Refresh Loans
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredApplications.map((application) => (
              <LoanCollectionCard
                key={application.id}
                application={application}
                onError={setError}
                onPaymentSuccess={handlePaymentSuccess}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
