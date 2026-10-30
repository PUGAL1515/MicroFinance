
import { useState } from "react";
import { loanApi } from "../loanApi";

const inputClass =
  "mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

export default function GroupCreateForm({ plans, onSaved, onCancel }) {
  const [form, setForm] = useState({
    name: "",
    group_code: "",
    plan: "",
    branch_id: "",
    meeting_day: "",
    leader: "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const change = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.plan) {
      setError("Please select an active loan plan.");
      return;
    }

    try {
      setSaving(true);
      await loanApi.createGroup({
        name: form.name.trim(),
        group_code: form.group_code.trim(),
        plan: Number(form.plan),
        branch_id: form.branch_id ? Number(form.branch_id) : null,
        meeting_day: form.meeting_day,
        leader: form.leader ? Number(form.leader) : null,
      });
      onSaved();
    } catch (err) {
      setError(err.message || "Unable to create group.");
    } finally {
      setSaving(false);
    }
  };

  const activePlans = plans.filter((plan) => plan.is_active);

  return (
    <form
      onSubmit={save}
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <h2 className="text-xl font-bold text-slate-900">
        Create New Group
      </h2>
      <p className="mb-6 mt-1 text-sm text-slate-500">
        Create a group using an active loan plan.
      </p>

      {error && (
        <p className="mb-4 whitespace-pre-line rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-medium text-slate-700">
          Group Name *
          <input
            className={inputClass}
            name="name"
            value={form.name}
            onChange={change}
            placeholder="Example: Lakshmi SHG"
            required
          />
        </label>

        <label className="text-sm font-medium text-slate-700">
          Group Code *
          <input
            className={inputClass}
            name="group_code"
            value={form.group_code}
            onChange={change}
            placeholder="GRP-0001"
            required
          />
        </label>

        <label className="text-sm font-medium text-slate-700">
          Loan Plan *
          <select
            className={inputClass}
            name="plan"
            value={form.plan}
            onChange={change}
            required
          >
            <option value="">Select a plan</option>
            {activePlans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name} — {plan.min_members} to {plan.max_members} members
              </option>
            ))}
          </select>
          {activePlans.length === 0 && (
            <span className="mt-1 block text-xs text-amber-700">
              No active plans. Activate a plan before creating a group.
            </span>
          )}
        </label>

        <label className="text-sm font-medium text-slate-700">
          Branch ID
          <input
            className={inputClass}
            name="branch_id"
            type="number"
            min="1"
            value={form.branch_id}
            onChange={change}
            placeholder="Enter branch ID"
          />
        </label>

        <label className="text-sm font-medium text-slate-700">
          Group Leader Customer ID
          <input
            className={inputClass}
            name="leader"
            type="number"
            min="1"
            value={form.leader}
            onChange={change}
            placeholder="Existing customer ID"
          />
        </label>

        <label className="text-sm font-medium text-slate-700">
          Meeting Day
          <select
            className={inputClass}
            name="meeting_day"
            value={form.meeting_day}
            onChange={change}
          >
            <option value="">Select day</option>
            {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day) => (
              <option key={day} value={day}>
                {day}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-5">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700"
        >
          Cancel
        </button>
        <button
          disabled={saving || activePlans.length === 0}
          className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Creating..." : "Create Group"}
        </button>
      </div>
    </form>
  );
}
