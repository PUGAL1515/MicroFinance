
import { useCallback, useEffect, useState } from "react";
import { loanApi } from "../../loans/loanApi";

const API_URL = import.meta.env.VITE_API_BASE_URL || "";

async function getKyc(customerId) {
  const token =
    localStorage.getItem("access") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("authToken");

  const response = await fetch(`${API_URL}/api/customer/${customerId}/kyc/`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      data?.detail || `Unable to load customer ${customerId} KYC.`
    );
  }

  return Array.isArray(data) ? data : data?.results || [];
}

function getCustomerId(member) {
  return (
    member.customer_id ??
    member.customer?.id ??
    (typeof member.customer === "number" ? member.customer : null)
  );
}

function isActive(member) {
  return member.is_active !== false;
}

/* ---------------- KYC STATUS BADGE ---------------- */

function KycStatus({ verified }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold ${
        verified
          ? "border border-emerald-100 bg-emerald-50 text-emerald-700"
          : "border border-amber-100 bg-amber-50 text-amber-700"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          verified ? "bg-emerald-500" : "bg-amber-500"
        }`}
      />
      {verified ? "VERIFIED" : "PENDING"}
    </span>
  );
}

/* ---------------- SUMMARY CARD ---------------- */

function SummaryCard({ title, value, icon, color, description }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">
            {value}
          </p>
          {description && (
            <p className="mt-1 text-xs text-slate-400">{description}</p>
          )}
        </div>

        <div
          className={`flex h-12 w-12 items-center justify-center rounded-xl text-xl ${color}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

/* ---------------- MAIN COMPONENT ---------------- */

export default function GroupKYCVerification({ groups = [] }) {
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!selectedGroupId && groups.length) {
      setSelectedGroupId(String(groups[0].id));
    }
  }, [groups, selectedGroupId]);

  const loadMembersAndKyc = useCallback(async () => {
    if (!selectedGroupId) {
      setMembers([]);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const rawMembers = await loanApi.getMembers(selectedGroupId);

      const membershipList = Array.isArray(rawMembers)
        ? rawMembers
        : rawMembers?.results || [];

      const activeMembers = membershipList.filter(isActive);

      const rows = await Promise.all(
        activeMembers.map(async (member) => {
          const customerId = getCustomerId(member);

          const customer =
            typeof member.customer === "object" ? member.customer : member;

          if (!customerId) {
            return {
              membership: member,
              customer,
              customerId: null,
              identityVerified: false,
              addressVerified: false,
              error: "Customer ID is missing in member API response.",
            };
          }

          try {
            const docs = await getKyc(customerId);

            return {
              membership: member,
              customer,
              customerId,
              identityVerified: docs.some(
                (doc) =>
                  doc.document_type === "identity" &&
                  doc.status === "verified"
              ),
              addressVerified: docs.some(
                (doc) =>
                  doc.document_type === "address" &&
                  doc.status === "verified"
              ),
              error: "",
            };
          } catch (err) {
            return {
              membership: member,
              customer,
              customerId,
              identityVerified: false,
              addressVerified: false,
              error: err.message,
            };
          }
        })
      );

      setMembers(rows);
    } catch (err) {
      setError(err.message || "Unable to load group members.");
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [selectedGroupId]);

  useEffect(() => {
    loadMembersAndKyc();
  }, [loadMembersAndKyc, refreshKey]);

  const completedCount = members.filter(
    (member) => member.identityVerified && member.addressVerified
  ).length;

  const allVerified = members.length > 0 && completedCount === members.length;

  const customerName = (row) => {
    const customer = row.customer || {};

    return (
      customer.full_name ||
      [customer.first_name, customer.last_name].filter(Boolean).join(" ") ||
      `Customer #${row.customerId || "?"}`
    );
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-slate-100 bg-white p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-2xl">
            📋
          </div>

          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Group Member KYC Status
            </h2>

            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
              A group is KYC-ready only when every active member has verified
              Identity and Address documents.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setRefreshKey((value) => value + 1)}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className={loading ? "animate-spin" : ""}>↻</span>
          {loading ? "Refreshing..." : "Refresh KYC"}
        </button>
      </div>

      <div className="space-y-6 p-5 sm:p-6">
        {/* Group Selection */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
          <label className="block max-w-xl">
            <span className="mb-2 block text-sm font-bold text-slate-700">
              Select Group
            </span>

            <select
              value={selectedGroupId}
              onChange={(event) => setSelectedGroupId(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
            >
              <option value="">Choose a group</option>

              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name} ({group.group_code || group.id})
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <span className="text-lg">⚠️</span>
            <p className="whitespace-pre-line">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-100 bg-slate-50/50 px-5 py-16">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-100 border-t-blue-700" />
            <p className="mt-4 font-semibold text-slate-700">
              Checking member KYC...
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Please wait while we verify documents.
            </p>
          </div>
        ) : members.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 px-5 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-3xl">
              👥
            </div>

            <h3 className="mt-4 font-bold text-slate-800">
              No active members found
            </h3>

            <p className="mt-1 max-w-sm text-sm text-slate-500">
              {selectedGroupId
                ? "This group currently has no active members to verify."
                : "Please select a group to view member KYC status."}
            </p>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <SummaryCard
                title="Active Members"
                value={members.length}
                icon="👥"
                color="bg-slate-100 text-slate-700"
                description="Active group members"
              />

              <SummaryCard
                title="KYC Complete"
                value={completedCount}
                icon="✓"
                color="bg-blue-50 text-blue-700"
                description="Identity and address verified"
              />

              <div
                className={`rounded-2xl border p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md ${
                  allVerified
                    ? "border-emerald-100 bg-emerald-50/60"
                    : "border-amber-100 bg-amber-50/60"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p
                      className={`text-sm font-semibold ${
                        allVerified ? "text-emerald-700" : "text-amber-700"
                      }`}
                    >
                      Group Readiness
                    </p>

                    <p
                      className={`mt-3 text-lg font-extrabold ${
                        allVerified ? "text-emerald-800" : "text-amber-800"
                      }`}
                    >
                      {allVerified
                        ? "READY FOR APPLICATION"
                        : "KYC INCOMPLETE"}
                    </p>

                    <p
                      className={`mt-1 text-xs ${
                        allVerified ? "text-emerald-600" : "text-amber-600"
                      }`}
                    >
                      {completedCount} of {members.length} members verified
                    </p>
                  </div>

                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl ${
                      allVerified
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {allVerified ? "✓" : "!"}
                  </div>
                </div>
              </div>
            </div>

            {/* Progress */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Overall KYC Progress
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Members with both required documents verified
                  </p>
                </div>

                <span className="text-lg font-extrabold text-blue-800">
                  {Math.round((completedCount / members.length) * 100)}%
                </span>
              </div>

              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    allVerified ? "bg-emerald-500" : "bg-blue-600"
                  }`}
                  style={{
                    width: `${(completedCount / members.length) * 100}%`,
                  }}
                />
              </div>
            </div>

            {/* Member KYC Table */}
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <div className="flex flex-col gap-1 border-b border-slate-100 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-bold text-slate-900">
                    Member Verification Details
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Individual identity and address verification status.
                  </p>
                </div>

                <span className="w-fit rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
                  {members.length} Members
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-5 py-4 font-bold">Member</th>
                      <th className="px-5 py-4 font-bold">Customer ID</th>
                      <th className="px-5 py-4 font-bold">Identity</th>
                      <th className="px-5 py-4 font-bold">Address</th>
                      <th className="px-5 py-4 font-bold">Status</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {members.map((row, index) => {
                      const complete =
                        row.identityVerified && row.addressVerified;

                      return (
                        <tr
                          key={row.membership.id || row.customerId || index}
                          className="transition hover:bg-blue-50/40"
                        >
                          {/* Member */}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-800">
                                {customerName(row).charAt(0).toUpperCase()}
                              </div>

                              <div className="min-w-0">
                                <p className="font-semibold text-slate-800">
                                  {customerName(row)}
                                </p>

                                {row.membership.is_leader && (
                                  <span className="mt-1 inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                                    GROUP LEADER
                                  </span>
                                )}

                                {row.error && (
                                  <p className="mt-1 max-w-xs text-xs text-red-600">
                                    {row.error}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Customer ID */}
                          <td className="px-5 py-4 font-medium text-slate-600">
                            {row.customerId || "—"}
                          </td>

                          {/* Identity */}
                          <td className="px-5 py-4">
                            <KycStatus verified={row.identityVerified} />
                          </td>

                          {/* Address */}
                          <td className="px-5 py-4">
                            <KycStatus verified={row.addressVerified} />
                          </td>

                          {/* Overall Status */}
                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex items-center gap-2 text-xs font-bold ${
                                complete
                                  ? "text-emerald-700"
                                  : "text-amber-700"
                              }`}
                            >
                              <span
                                className={`h-2 w-2 rounded-full ${
                                  complete
                                    ? "bg-emerald-500"
                                    : "bg-amber-500"
                                }`}
                              />
                              {complete ? "COMPLETE" : "ACTION REQUIRED"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
