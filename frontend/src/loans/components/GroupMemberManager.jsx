
import { useEffect, useState } from "react";
import { loanApi } from "../loanApi";

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

function SectionTitle({ number, title, description }) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-sm font-extrabold text-blue-700">
        {number}
      </div>
      <div>
        <h2 className="text-base font-extrabold text-slate-900 sm:text-lg">
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }) {
  return (
    <div className="rounded-xl border border-blue-100 bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </p>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-sm text-blue-700">
          {icon}
        </span>
      </div>
      <p className="mt-2 text-xl font-extrabold text-slate-900">{value}</p>
    </div>
  );
}

export default function GroupMemberManager({ groups }) {
  const [groupId, setGroupId] = useState("");
  const [members, setMembers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState("");
  const [search, setSearch] = useState("");
  const [leader, setLeader] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const selectedGroup = groups.find(
    (group) => String(group.id) === String(groupId),
  );

  const loadMembers = async () => {
    if (!groupId) {
      setMembers([]);
      return;
    }

    try {
      setLoading(true);
      setError("");
      const data = await loanApi.getMembers(groupId);
      setMembers(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      setError(err.message || "Unable to load members.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, [groupId]);

  const searchCustomers = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      const data = await loanApi.getCustomers(search);
      setCustomers(Array.isArray(data) ? data : data.results || []);
      if (!(Array.isArray(data) ? data : data.results || []).length) {
        setSuccess("No customers found.");
      }
    } catch (err) {
      setError(err.message || "Unable to search customers.");
    }
  };

  const addMember = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!groupId || !customerId) {
      setError("Select a group and customer first.");
      return;
    }

    try {
      await loanApi.addMember(groupId, customerId, leader);
      setSuccess("Customer added to group successfully.");
      setCustomerId("");
      setLeader(false);
      await loadMembers();
    } catch (err) {
      setError(err.message || "Unable to add member.");
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-6 pb-8">
      {/* PAGE HEADER */}
      <div>
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-blue-700">
          <span className="h-2 w-2 rounded-full bg-blue-600" />
          SMLNEXGEN / Group Loans
        </div>

        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
          Group Member Management
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Assign existing customers to groups and manage group membership.
        </p>
      </div>

      {/* ALERT MESSAGES */}
      {error && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <div className="flex items-start gap-2">
            <span className="font-bold">!</span>
            <span className="whitespace-pre-line">{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError("")}
            className="rounded-lg px-2 font-bold hover:bg-red-100"
            aria-label="Dismiss error"
          >
            ✕
          </button>
        </div>
      )}

      {success && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          <div className="flex items-start gap-2">
            <span className="font-bold">✓</span>
            <span>{success}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccess("")}
            className="rounded-lg px-2 font-bold hover:bg-emerald-100"
            aria-label="Dismiss message"
          >
            ✕
          </button>
        </div>
      )}

      {/* GROUP SELECTION */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-gradient-to-r from-blue-50/80 to-white p-5 sm:p-6">
          <SectionTitle
            number="01"
            title="Select Borrower Group"
            description="Choose the group where you want to add or view members."
          />

          <label className="block max-w-2xl text-sm font-semibold text-slate-700">
            Select Group
            <select
              className={`${inputClass} mt-2`}
              value={groupId}
              onChange={(e) => {
                setGroupId(e.target.value);
                setSuccess("");
                setError("");
              }}
            >
              <option value="">Choose a group</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name} ({group.group_code})
                </option>
              ))}
            </select>
          </label>
        </div>

        {selectedGroup ? (
          <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-3 sm:p-6">
            <StatCard
              label="Selected Group"
              value={selectedGroup.name}
              icon="⌂"
            />
            <StatCard
              label="Current Members"
              value={members.length}
              icon="♙"
            />
            <StatCard
              label="Plan Member Limit"
              value={
                selectedGroup.plan_details
                  ? selectedGroup.plan_details.max_members
                  : "See selected plan"
              }
              icon="▤"
            />
          </div>
        ) : (
          <div className="flex items-center gap-3 p-5 sm:p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
              ▤
            </div>
            <p className="text-sm text-slate-500">
              Select a borrower group to view its details and manage members.
            </p>
          </div>
        )}
      </section>

      {/* SEARCH CUSTOMERS */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5 sm:p-6">
          <SectionTitle
            number="02"
            title="Find Existing Customers"
            description="Search registered customers using their name, mobile number or email."
          />

          <form
            onSubmit={searchCustomers}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <div className="relative min-w-0 flex-1">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                ⌕
              </span>
              <input
                className={`${inputClass} pl-10`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search customer name, mobile number or email"
              />
            </div>

            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-800"
            >
              <span>⌕</span>
              Search Customers
            </button>
          </form>
        </div>

        {customers.length > 0 && (
          <form onSubmit={addMember} className="space-y-5 p-5 sm:p-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700">
                Select Customer
                <select
                  className={`${inputClass} mt-2`}
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  required
                >
                  <option value="">Choose a customer</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      #{customer.id} — {customer.first_name} {customer.last_name} — {customer.mobile_number}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:flex-row sm:items-center">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={leader}
                  onChange={(e) => setLeader(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded accent-blue-600"
                />
                <span>
                  <span className="block text-sm font-bold text-slate-800">
                    Mark as Group Leader
                  </span>
                  <span className="mt-1 block text-xs text-slate-500">
                    Assign this customer as the leader of the selected group.
                  </span>
                </span>
              </label>

              <button
                disabled={!groupId}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                + Add Member
              </button>
            </div>
          </form>
        )}

        {customers.length === 0 && (
          <div className="px-5 py-4 text-xs text-slate-400 sm:px-6">
            Search for a customer to display matching records here.
          </div>
        )}
      </section>

      {/* CURRENT MEMBERS */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:px-6">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                ♙
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900">
                  Current Members
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Members assigned to the selected group
                </p>
              </div>
            </div>
          </div>

          {groupId && (
            <span className="inline-flex w-fit rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
              {members.length} Members
            </span>
          )}
        </div>

        {!groupId ? (
          <div className="px-5 py-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-xl text-slate-500">
              ▤
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-700">
              Select a group first
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Choose a borrower group above to view its members.
            </p>
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center p-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-100 border-t-blue-700" />
            <p className="mt-3 text-sm text-slate-500">Loading members...</p>
          </div>
        ) : members.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-xl text-slate-500">
              ♙
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-700">
              No members added yet
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Search for an existing customer and add them to this group.
            </p>
          </div>
        ) : (
          <>
            {/* DESKTOP TABLE */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[650px] text-left text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-6 py-4 font-bold">Customer ID</th>
                    <th className="px-6 py-4 font-bold">Customer Name</th>
                    <th className="px-6 py-4 font-bold">Mobile Number</th>
                    <th className="px-6 py-4 font-bold">Role</th>
                    <th className="px-6 py-4 font-bold">Status</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {members.map((member) => (
                    <tr
                      key={member.id}
                      className="transition hover:bg-slate-50/70"
                    >
                      <td className="px-6 py-4 font-semibold text-slate-700">
                        #{member.customer}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-700">
                            {String(member.customer_name || "C")
                              .charAt(0)
                              .toUpperCase()}
                          </div>
                          <span className="font-semibold text-slate-800">
                            {member.customer_name || "—"}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-slate-600">
                        {member.mobile_number || "—"}
                      </td>

                      <td className="px-6 py-4">
                        {member.is_leader ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                            ★ Leader
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                            Member
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                            member.is_active
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          {member.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* MOBILE CARDS */}
            <div className="space-y-3 p-4 md:hidden">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 font-bold text-blue-700">
                      {String(member.customer_name || "C")
                        .charAt(0)
                        .toUpperCase()}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm font-bold text-slate-900">
                        {member.customer_name || "—"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Customer ID: #{member.customer}
                      </p>
                    </div>

                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${
                        member.is_active
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {member.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase text-slate-400">
                        Mobile
                      </p>
                      <p className="mt-1 text-sm font-medium text-slate-700">
                        {member.mobile_number || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase text-slate-400">
                        Role
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-700">
                        {member.is_leader ? "★ Group Leader" : "Member"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
