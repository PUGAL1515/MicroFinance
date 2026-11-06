
import { useCallback, useEffect, useMemo, useState } from "react";
import { loanApi } from "../../loans/loanApi";

const API_URL = import.meta.env.VITE_API_BASE_URL || "";

async function getKyc(customerId) {
  const token =
    localStorage.getItem("access") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("authToken");

  const response = await fetch(
    `${API_URL}/api/customer/${customerId}/kyc/`,
    {
      headers: token
        ? { Authorization: `Bearer ${token}` }
        : {},
    }
  );

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
    (typeof member.customer === "number"
      ? member.customer
      : null)
  );
}

function getCustomerName(row) {
  const customer = row.customer || {};

  return (
    customer.full_name ||
    [customer.first_name, customer.last_name]
      .filter(Boolean)
      .join(" ") ||
    `Customer #${row.customerId || "?"}`
  );
}

function StatusBadge({ verified }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold ${
        verified
          ? "bg-emerald-50 text-emerald-700"
          : "bg-amber-50 text-amber-700"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          verified ? "bg-emerald-500" : "bg-amber-500"
        }`}
      />
      {verified ? "Verified" : "Pending"}
    </span>
  );
}

function SummaryCard({ title, value, subtitle, icon, color }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-500 sm:text-sm">
            {title}
          </p>

          <p className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            {value}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            {subtitle}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl ${color}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function DocumentStatus({ title, verified }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500">
          {title}
        </p>
        <div className="mt-1">
          <StatusBadge verified={verified} />
        </div>
      </div>
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          verified
            ? "bg-emerald-100 text-emerald-700"
            : "bg-amber-100 text-amber-700"
        }`}
      >
        {verified ? "✓" : "!"}
      </span>
    </div>
  );
}

export default function GroupKYCVerification({ groups = [] }) {
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!groups.length) {
      setSelectedGroupId("");
      setMembers([]);
      return;
    }

    const exists = groups.some(
      (group) => String(group.id) === String(selectedGroupId)
    );

    if (!selectedGroupId || !exists) {
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

      const activeMembers = membershipList.filter(
        (member) => member.is_active !== false
      );

      const rows = await Promise.all(
        activeMembers.map(async (member) => {
          const customerId = getCustomerId(member);

          const customer =
            typeof member.customer === "object" &&
            member.customer !== null
              ? member.customer
              : member;

          if (!customerId) {
            return {
              membership: member,
              customer,
              customerId: null,
              identityVerified: false,
              addressVerified: false,
              error: "Customer ID is missing.",
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

  const completedCount = useMemo(
    () =>
      members.filter(
        (member) =>
          member.identityVerified && member.addressVerified
      ).length,
    [members]
  );

  const pendingCount = members.length - completedCount;

  const allVerified =
    members.length > 0 && completedCount === members.length;

  const progress = members.length
    ? Math.round((completedCount / members.length) * 100)
    : 0;

  const selectedGroup = groups.find(
    (group) => String(group.id) === String(selectedGroupId)
  );

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 pb-8 sm:space-y-6">

      {/* PAGE HEADER */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950 via-blue-950 to-blue-800 p-5 text-white shadow-lg sm:p-7">
        <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-bold tracking-wider text-blue-100">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              GROUP LOAN MANAGEMENT
            </div>

            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              Group KYC Verification
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-blue-100">
              Monitor identity and address document verification
              for every active group member.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setRefreshKey((value) => value + 1)}
            disabled={loading || !selectedGroupId}
            className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            <span className={loading ? "animate-spin" : ""}>
              ↻
            </span>
            {loading ? "Refreshing..." : "Refresh Status"}
          </button>
        </div>

        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full border-[35px] border-white/5" />
        <div className="pointer-events-none absolute -bottom-32 right-32 h-64 w-64 rounded-full bg-blue-400/10 blur-3xl" />
      </div>

      {/* GROUP SELECTION */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <label className="block w-full sm:max-w-md">
            <span className="mb-2 block text-sm font-bold text-slate-800">
              Select Loan Group
            </span>

            <select
              value={selectedGroupId}
              onChange={(event) =>
                setSelectedGroupId(event.target.value)
              }
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
            >
              <option value="">Choose a group</option>

              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name} ({group.group_code || group.id})
                </option>
              ))}
            </select>
          </label>

          {selectedGroup && (
            <div className="rounded-xl bg-blue-50 px-4 py-3 sm:min-w-48">
              <p className="text-[10px] font-bold uppercase tracking-wider text-blue-500">
                Selected Group
              </p>
              <p className="mt-1 truncate text-sm font-bold text-blue-950">
                {selectedGroup.name}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ERROR */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <span className="text-lg">⚠</span>
          <div className="min-w-0 flex-1">
            <p className="font-bold">Unable to load KYC information</p>
            <p className="mt-1 break-words">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => setError("")}
            className="rounded-lg px-2 font-bold hover:bg-red-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* LOADING */}
      {loading ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-100 border-t-blue-700" />
          <p className="mt-4 text-sm font-bold text-slate-700">
            Checking member KYC...
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Please wait while documents are being checked.
          </p>
        </div>
      ) : !selectedGroupId ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-16 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
            👥
          </div>
          <h3 className="mt-4 font-bold text-slate-800">
            No Groups Available
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Create a loan group to view member KYC details.
          </p>
        </div>
      ) : members.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-16 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
            👥
          </div>
          <h3 className="mt-4 font-bold text-slate-800">
            No Active Members
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            This group currently has no active members to verify.
          </p>
        </div>
      ) : (
        <>
          {/* SUMMARY */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 sm:gap-4">
            <SummaryCard
              title="Total Members"
              value={members.length}
              subtitle="Active group members"
              icon="👥"
              color="bg-blue-50 text-blue-700"
            />

            <SummaryCard
              title="KYC Completed"
              value={completedCount}
              subtitle="Both documents verified"
              icon="✓"
              color="bg-emerald-50 text-emerald-700"
            />

            <SummaryCard
              title="Pending Members"
              value={pendingCount}
              subtitle="Verification required"
              icon="◷"
              color="bg-amber-50 text-amber-700"
            />

            <SummaryCard
              title="Completion Rate"
              value={`${progress}%`}
              subtitle="Overall group progress"
              icon="↗"
              color="bg-violet-50 text-violet-700"
            />
          </div>

          {/* GROUP READINESS */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-extrabold text-slate-900">
                    Group KYC Readiness
                  </h3>

                  <span
                    className={`rounded-full px-3 py-1 text-[10px] font-bold ${
                      allVerified
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {allVerified ? "READY" : "INCOMPLETE"}
                  </span>
                </div>

                <p className="mt-1 text-xs text-slate-500">
                  Every active member must have verified identity
                  and address documents.
                </p>
              </div>

              <p className="text-3xl font-extrabold tracking-tight text-blue-900">
                {progress}%
              </p>
            </div>

            <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  allVerified ? "bg-emerald-500" : "bg-blue-600"
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-slate-500">
              <span>
                {completedCount} of {members.length} members completed
              </span>
              <span>
                {pendingCount} remaining
              </span>
            </div>
          </section>

          {/* MEMBER LIST */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-2 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div>
                <h3 className="font-extrabold text-slate-900">
                  Member Verification Details
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Identity and address verification for each member.
                </p>
              </div>

              <span className="w-fit rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
                {members.length} Members
              </span>
            </div>

            {/* DESKTOP TABLE */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-4 font-bold">Member</th>
                    <th className="px-5 py-4 font-bold">Customer ID</th>
                    <th className="px-5 py-4 font-bold">Identity</th>
                    <th className="px-5 py-4 font-bold">Address</th>
                    <th className="px-5 py-4 font-bold">Overall Status</th>
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
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-800">
                              {getCustomerName(row)
                                .charAt(0)
                                .toUpperCase()}
                            </div>

                            <div>
                              <p className="font-bold text-slate-800">
                                {getCustomerName(row)}
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

                        <td className="px-5 py-4 font-semibold text-slate-600">
                          #{row.customerId || "—"}
                        </td>

                        <td className="px-5 py-4">
                          <StatusBadge verified={row.identityVerified} />
                        </td>

                        <td className="px-5 py-4">
                          <StatusBadge verified={row.addressVerified} />
                        </td>

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
                            {complete ? "Complete" : "Action Required"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* MOBILE MEMBER CARDS */}
            <div className="grid grid-cols-1 gap-3 bg-slate-50/70 p-3 md:hidden">
              {members.map((row, index) => {
                const complete =
                  row.identityVerified && row.addressVerified;

                return (
                  <article
                    key={row.membership.id || row.customerId || index}
                    className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-800">
                          {getCustomerName(row)
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <div className="min-w-0">
                          <p className="break-words text-sm font-bold text-slate-900">
                            {getCustomerName(row)}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Customer #{row.customerId || "—"}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${
                          complete
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {complete ? "Complete" : "Pending"}
                      </span>
                    </div>

                    {row.membership.is_leader && (
                      <span className="mt-3 inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700">
                        GROUP LEADER
                      </span>
                    )}

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <DocumentStatus
                        title="Identity Proof"
                        verified={row.identityVerified}
                      />
                      <DocumentStatus
                        title="Address Proof"
                        verified={row.addressVerified}
                      />
                    </div>

                    {row.error && (
                      <p className="mt-3 break-words text-xs text-red-600">
                        {row.error}
                      </p>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
