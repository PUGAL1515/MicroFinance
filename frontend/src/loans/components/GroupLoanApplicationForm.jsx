
import { useState } from "react";

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50";

export default function GroupLoanApplicationForm({
  groups = [],
  busy,
  disabled,
  onSubmit,
  onError,
}) {
  const [selectedGroup, setSelectedGroup] = useState("");
  const [requestedPerMember, setRequestedPerMember] = useState("");
  const [applicationNotes, setApplicationNotes] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!selectedGroup || Number(requestedPerMember) <= 0) {
      onError("Select a group and enter a valid loan amount.");
      return;
    }

    const success = await onSubmit({
      group: Number(selectedGroup),
      requested_per_member: requestedPerMember,
      application_notes: applicationNotes,
    });

    if (success) {
      setSelectedGroup("");
      setRequestedPerMember("");
      setApplicationNotes("");
    }
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-gradient-to-r from-blue-50 to-white px-5 py-5 sm:px-6">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-lg font-extrabold text-blue-700">
            +
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-[#17365D]">
              New Group Loan Application
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Create a loan request for an eligible borrower group.
            </p>
          </div>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 gap-5 p-5 sm:p-6 md:grid-cols-2"
      >
        <label className="block text-sm font-semibold text-slate-700">
          Borrower Group
          <select
            required
            value={selectedGroup}
            onChange={(event) => setSelectedGroup(event.target.value)}
            disabled={disabled}
            className={`${inputClass} mt-2`}
          >
            <option value="">Select borrower group</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name} — {group.group_code || `#${group.id}`}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-semibold text-slate-700">
          Requested Loan Per Member (₹)
          <input
            type="number"
            min="0.01"
            step="0.01"
            required
            value={requestedPerMember}
            onChange={(event) =>
              setRequestedPerMember(event.target.value)
            }
            placeholder="e.g. 20000"
            disabled={disabled}
            className={`${inputClass} mt-2`}
          />
        </label>

        <label className="block text-sm font-semibold text-slate-700 md:col-span-2">
          Application Notes
          <textarea
            rows={3}
            value={applicationNotes}
            onChange={(event) => setApplicationNotes(event.target.value)}
            placeholder="Enter the purpose of the loan or additional details..."
            disabled={disabled}
            className={`${inputClass} mt-2`}
          />
        </label>

        <div className="flex flex-col justify-between gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center md:col-span-2">
          <p className="text-xs leading-5 text-slate-500">
            Group eligibility and KYC are checked by the backend.
          </p>

          <button
            type="submit"
            disabled={disabled || !groups.length}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Submitting..." : "Submit Application"}
            {!busy && <span>→</span>}
          </button>
        </div>
      </form>
    </section>
  );
}
