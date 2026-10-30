
import { useCallback, useEffect, useState } from "react";
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
      headers: token ? { Authorization: `Bearer ${token}` } : {},
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
    (typeof member.customer === "number" ? member.customer : null)
  );
}

function isActive(member) {
  return member.is_active !== false;
}

function KycStatus({ verified }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
        verified
          ? "bg-emerald-50 text-emerald-700"
          : "bg-amber-50 text-amber-700"
      }`}
    >
      {verified ? "VERIFIED" : "PENDING"}
    </span>
  );
}

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
            typeof member.customer === "object"
              ? member.customer
              : member;

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
      <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Group Member KYC Status
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            A group is KYC-ready only when every active member has verified
            Identity and Address documents.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setRefreshKey((value) => value + 1)}
          disabled={loading}
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
        >
          Refresh KYC
        </button>
      </div>

      <div className="p-5">
        <label className="block max-w-lg text-sm font-semibold text-slate-700">
          Select Group
          <select
            value={selectedGroupId}
            onChange={(event) => setSelectedGroupId(event.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 outline-none focus:border-blue-500"
          >
            <option value="">Choose a group</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name} ({group.group_code || group.id})
              </option>
            ))}
          </select>
        </label>

        {error && (
          <p className="mt-4 whitespace-pre-line rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {loading ? (
          <p className="py-10 text-center text-sm text-slate-500">
            Checking member KYC...
          </p>
        ) : members.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500">
            No active members found in this group.
          </p>
        ) : (
          <>
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Active Members
                </p>
                <p className="mt-2 text-2xl font-extrabold text-slate-900">
                  {members.length}
                </p>
              </div>
              <div className="rounded-xl bg-blue-50 p-4">
                <p className="text-xs font-semibold uppercase text-blue-700">
                  KYC Complete
                </p>
                <p className="mt-2 text-2xl font-extrabold text-blue-900">
                  {completedCount}
                </p>
              </div>
              <div
                className={`rounded-xl p-4 ${
                  allVerified ? "bg-emerald-50" : "bg-amber-50"
                }`}
              >
                <p
                  className={`text-xs font-semibold uppercase ${
                    allVerified ? "text-emerald-700" : "text-amber-700"
                  }`}
                >
                  Group Readiness
                </p>
                <p
                  className={`mt-2 text-lg font-extrabold ${
                    allVerified ? "text-emerald-800" : "text-amber-800"
                  }`}
                >
                  {allVerified ? "READY FOR APPLICATION" : "KYC INCOMPLETE"}
                </p>
              </div>
            </div>

            <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[650px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="p-4">Member</th>
                    <th className="p-4">Customer ID</th>
                    <th className="p-4">Identity</th>
                    <th className="p-4">Address</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {members.map((row, index) => {
                    const complete =
                      row.identityVerified && row.addressVerified;

                    return (
                      <tr key={row.membership.id || row.customerId || index}>
                        <td className="p-4 font-semibold text-slate-900">
                          {customerName(row)}
                          {row.membership.is_leader && (
                            <span className="ml-2 text-xs text-blue-700">
                              Leader
                            </span>
                          )}
                          {row.error && (
                            <p className="mt-1 text-xs text-red-600">
                              {row.error}
                            </p>
                          )}
                        </td>
                        <td className="p-4 text-slate-600">
                          {row.customerId || "—"}
                        </td>
                        <td className="p-4">
                          <KycStatus verified={row.identityVerified} />
                        </td>
                        <td className="p-4">
                          <KycStatus verified={row.addressVerified} />
                        </td>
                        <td className="p-4">
                          <span
                            className={`text-xs font-bold ${
                              complete
                                ? "text-emerald-700"
                                : "text-amber-700"
                            }`}
                          >
                            {complete ? "COMPLETE" : "ACTION REQUIRED"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
