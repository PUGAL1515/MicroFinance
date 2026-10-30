
import { useEffect, useState } from "react";
import { loanApi } from "../loanApi";

const inputClass =
  "w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500";

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
    (group) => String(group.id) === String(groupId)
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
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">
          Add Group Members
        </h2>
        <p className="mb-5 mt-1 text-sm text-slate-500">
          Search your existing customers and add them to a group.
        </p>

        <label className="block text-sm font-medium text-slate-700">
          Select Group
          <select
            className={`${inputClass} mt-1`}
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

        {selectedGroup && (
          <div className="mt-4 grid gap-3 rounded-xl bg-blue-50 p-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-blue-700">Group</p>
              <p className="font-semibold text-slate-900">
                {selectedGroup.name}
              </p>
            </div>
            <div>
              <p className="text-xs text-blue-700">Current Members</p>
              <p className="font-semibold text-slate-900">
                {members.length}
              </p>
            </div>
            <div>
              <p className="text-xs text-blue-700">Plan Limit</p>
              <p className="font-semibold text-slate-900">
                {selectedGroup.plan_details
                  ? selectedGroup.plan_details.max_members
                  : "See selected plan"}
              </p>
            </div>
          </div>
        )}
      </section>

      {error && (
        <div className="whitespace-pre-line rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">
          {success}
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <form onSubmit={searchCustomers} className="flex flex-col gap-3 sm:flex-row">
          <input
            className={inputClass}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer name, mobile number or email"
          />
          <button className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white">
            Search
          </button>
        </form>

        {customers.length > 0 && (
          <form onSubmit={addMember} className="mt-4 space-y-4">
            <label className="block text-sm font-medium text-slate-700">
              Select Customer
              <select
                className={`${inputClass} mt-1`}
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                required
              >
                <option value="">Choose a customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    #{customer.id} — {customer.first_name}{" "}
                    {customer.last_name} — {customer.mobile_number}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={leader}
                onChange={(e) => setLeader(e.target.checked)}
                className="h-4 w-4 accent-blue-600"
              />
              Mark as Group Leader
            </label>

            <button
              disabled={!groupId}
              className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              Add Member
            </button>
          </form>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5">
          <h3 className="font-bold text-slate-900">Current Members</h3>
        </div>

        {!groupId ? (
          <p className="p-8 text-sm text-slate-500">
            Select a group to view its members.
          </p>
        ) : loading ? (
          <p className="p-8 text-sm text-slate-500">Loading members...</p>
        ) : members.length === 0 ? (
          <p className="p-8 text-sm text-slate-500">
            No members added yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[550px] text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-5 py-3">Customer ID</th>
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Mobile</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {members.map((member) => (
                  <tr key={member.id}>
                    <td className="px-5 py-3">
                      {member.customer}
                    </td>
                    <td className="px-5 py-3 font-medium">
                      {member.customer_name || "—"}
                    </td>
                    <td className="px-5 py-3">
                      {member.mobile_number || "—"}
                    </td>
                    <td className="px-5 py-3">
                      {member.is_leader ? "Leader" : "Member"}
                    </td>
                    <td className="px-5 py-3">
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700">
                        {member.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
