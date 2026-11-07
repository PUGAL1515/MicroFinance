
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { loanApi } from "../loanApi";
import {
  Search,
  RefreshCw,
  Wallet,
  Users,
  CalendarDays,
  ArrowRight,
  AlertCircle,
  FileText,
  CheckCircle,
} from "lucide-react";

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

function normalizeList(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.results)) return response.results;
  if (Array.isArray(response?.data)) return response.data;
  return [];
}

function getGroupName(application) {
  if (typeof application.group === "object") {
    return (
      application.group?.name ||
      application.group?.group_name ||
      "Group"
    );
  }

  return (
    application.group_name ||
    application.group_details?.name ||
    "Group"
  );
}

function getStatus(application) {
  return String(
    application.status ||
    application.application_status ||
    application.loan_status ||
    "pending"
  ).toLowerCase();
}

function StatusBadge({ status }) {
  const styles = {
    disbursed: "bg-emerald-50 text-emerald-700 border-emerald-200",
    active: "bg-emerald-50 text-emerald-700 border-emerald-200",
    approved: "bg-blue-50 text-blue-700 border-blue-200",
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    rejected: "bg-red-50 text-red-700 border-red-200",
    completed: "bg-purple-50 text-purple-700 border-purple-200",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1.5 text-[11px] font-bold capitalize ${
        styles[status] ||
        "border-slate-200 bg-slate-100 text-slate-600"
      }`}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}

function SummaryCard({ title, value, icon, color }) {
  const colors = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    purple: "bg-purple-50 text-purple-700",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${colors[color]}`}
        >
          {icon}
        </div>
      </div>

      <h3 className="mt-4 text-2xl font-extrabold text-slate-900">
        {value}
      </h3>
    </div>
  );
}

export default function GroupLoanCollection({ groups = [] }) {
  const navigate = useNavigate();

  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // =========================================
  // LOAD LOAN APPLICATIONS
  // =========================================
const getApplicationId = (application) => {
  return (
    application?.id ??
    application?.application_id ??
    application?.pk ??
    application?.loan_application_id ??
    application?.application?.id ??
    application?.loan_application?.id ??
    null
  );
};
  const loadApplications = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const response = await loanApi.getApplications();

console.log("FULL APPLICATION API RESPONSE:", response);

const list = normalizeList(response);

console.table(
  list.map((item) => ({
    id: item.id,
    application_id: item.application_id,
    pk: item.pk,
    loan_application_id: item.loan_application_id,
    application_number: item.application_number,
    group_name: item.group_name,
  }))
);

setApplications(list);
    } catch (err) {
      setError(
        err.message || "Unable to load group loan applications."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  // =========================================
  // APPLICATION SUMMARY
  // =========================================

  const summary = useMemo(() => {
    const disbursed = applications.filter((item) => {
      const status = getStatus(item);
      return ["disbursed", "active"].includes(status);
    });

    const approved = applications.filter(
      (item) => getStatus(item) === "approved"
    );

    const totalAmount = applications.reduce(
      (sum, item) =>
        sum +
        Number(
          item.loan_amount ||
          item.approved_amount ||
          item.amount ||
          0
        ),
      0
    );

    return {
      total: applications.length,
      disbursed: disbursed.length,
      approved: approved.length,
      totalAmount,
    };
  }, [applications]);

  // =========================================
  // FILTER APPLICATIONS
  // =========================================

  const filteredApplications = useMemo(() => {
    return applications.filter((item) => {
      const status = getStatus(item);

      const groupName = getGroupName(item);

      const groupCode =
        item.group_code ||
        item.group_details?.group_code ||
        "";

      const applicationId =
        item.id ?? item.application_id ?? "";

      const searchText = [
        applicationId,
        groupName,
        groupCode,
        item.application_number,
        item.group?.group_code,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = searchText.includes(
        search.toLowerCase().trim()
      );

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "disbursed" &&
          ["disbursed", "active"].includes(status)) ||
        status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [applications, search, statusFilter]);

  // =========================================
  // OPEN COLLECTION PAGE
  // =========================================

const openCollection = (application) => {
  const applicationId = getApplicationId(application);

  console.log("Selected Application:", application);
  console.log("Extracted Application ID:", applicationId);

  if (
    applicationId === null ||
    applicationId === undefined ||
    applicationId === ""
  ) {
    setError(
      "Application ID is missing. Check the Django API response."
    );
    return;
  }

  navigate(
    `/group-loan/applications/${encodeURIComponent(applicationId)}/collections`
  );
};
  // =========================================
  // LOADING
  // =========================================

  if (loading) {
    return (
      <div className="flex min-h-[350px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white">
        <div className="h-11 w-11 animate-spin rounded-full border-4 border-blue-100 border-t-blue-700" />

        <p className="mt-4 text-sm font-semibold text-slate-600">
          Loading loan applications...
        </p>
      </div>
    );
  }

  // =========================================
  // MAIN UI
  // =========================================

  return (
    <div className="space-y-6">

      {/* HEADER */}

      <div className="flex flex-col justify-between gap-4 rounded-2xl bg-gradient-to-r from-blue-950 via-blue-900 to-blue-700 p-6 text-white shadow-lg sm:flex-row sm:items-center">
        <div>
          <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-bold tracking-widest text-blue-100">
            GROUP LOAN MANAGEMENT
          </span>

          <h1 className="mt-4 text-2xl font-extrabold sm:text-3xl">
            Loan Collections
          </h1>

          <p className="mt-2 text-sm text-blue-100">
            Select a loan application to manage member-wise EMI
            collections and payment records.
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadApplications(true)}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-bold text-white hover:bg-white/20 disabled:opacity-50"
        >
          <RefreshCw
            size={17}
            className={refreshing ? "animate-spin" : ""}
          />
          Refresh
        </button>
      </div>

      {/* ERROR */}

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={20} className="shrink-0" />
          <p className="whitespace-pre-line">{error}</p>
          <button
            type="button"
            onClick={() => setError("")}
            className="ml-auto font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* SUMMARY */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Total Applications"
          value={summary.total}
          icon={<FileText size={22} />}
          color="blue"
        />

        <SummaryCard
          title="Disbursed / Active"
          value={summary.disbursed}
          icon={<CheckCircle size={22} />}
          color="green"
        />

        <SummaryCard
          title="Approved Applications"
          value={summary.approved}
          icon={<Wallet size={22} />}
          color="amber"
        />

        <SummaryCard
          title="Total Loan Amount"
          value={money(summary.totalAmount)}
          icon={<Users size={22} />}
          color="purple"
        />
      </div>

      {/* APPLICATION LIST */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

        {/* SECTION HEADER */}

        <div className="border-b border-slate-100 p-5 sm:p-6">
          <h2 className="text-lg font-extrabold text-slate-900">
            Group Loan Applications
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Choose an application to open its collection page.
          </p>

          {/* FILTERS */}

          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">

            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search group or application ID..."
                className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
            >
              <option value="all">All Applications</option>
              <option value="disbursed">Disbursed / Active</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        {/* TABLE */}

        {filteredApplications.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] text-left text-sm">

              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-4 font-bold">
                    Application ID
                  </th>

                  <th className="px-5 py-4 font-bold">
                    Group Name
                  </th>

                  <th className="px-5 py-4 font-bold">
                    Members
                  </th>

                  <th className="px-5 py-4 font-bold">
                    Loan Amount
                  </th>

                  <th className="px-5 py-4 font-bold">
                    Status
                  </th>

                  <th className="px-5 py-4 font-bold">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
               {filteredApplications.map((application) => {
  const applicationId = getApplicationId(application);

  const status = getStatus(application);

  return (
    <tr key={applicationId || application.application_number}>
      <td className="px-5 py-5">
        <p className="font-extrabold text-blue-700">
          #{applicationId ?? "Missing ID"}
        </p>
      </td>

      {/* Keep your other existing columns here */}

      <td className="px-5 py-5">
        <button
          type="button"
          disabled={!applicationId}
          onClick={() => openCollection(application)}
          className="rounded-xl bg-blue-700 px-4 py-3 text-xs font-bold text-white disabled:opacity-50"
        >
          Collect Now →
        </button>
      </td>
    </tr>
  );
})}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-5 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
              <FileText size={27} />
            </div>

            <h3 className="mt-4 font-bold text-slate-800">
              No Applications Found
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              {applications.length === 0
                ? "Create and approve a group loan application first."
                : "No applications match your search or selected status."}
            </p>

            <button
              type="button"
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
              }}
              className="mt-4 rounded-xl border border-blue-200 px-4 py-2.5 text-sm font-bold text-blue-700 hover:bg-blue-50"
            >
              Clear Filters
            </button>
          </div>
        )}

        {/* FOOTER */}

        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-5 py-4">
          <span className="text-xs font-medium text-slate-500">
            Showing {filteredApplications.length} of {applications.length} applications
          </span>

          <span className="text-xs font-bold text-slate-700">
            {groups.length} Registered Groups
          </span>
        </div>
      </section>
    </div>
  );
}
