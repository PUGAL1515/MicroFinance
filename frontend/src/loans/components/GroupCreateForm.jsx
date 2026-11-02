
import { useState } from "react";
import { loanApi } from "../loanApi";

const inputClass =
  "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-50";

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

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

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
      className="mx-auto w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-950 via-blue-900 to-blue-700 px-5 py-6 text-white sm:px-7">
        <div className="relative z-10 flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-2xl">
            👥
          </div>

          <div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-blue-200">
              Group Loan Management
            </div>
            <h2 className="text-xl font-bold sm:text-2xl">
              Create New Group
            </h2>
            <p className="mt-1 text-sm text-blue-100">
              Register a group and assign an active loan plan.
            </p>
          </div>
        </div>

        <div className="pointer-events-none absolute -right-10 -top-20 h-48 w-48 rounded-full border-[25px] border-white/5" />
      </div>

      {/* Form Body */}
      <div className="space-y-6 p-5 sm:p-7">
        {/* Error Message */}
        {error && (
          <div className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <div className="flex items-start gap-2">
              <span className="text-base">⚠️</span>
              <p className="whitespace-pre-line leading-6">{error}</p>
            </div>

            <button
              type="button"
              onClick={() => setError("")}
              className="shrink-0 rounded-lg px-2 py-1 font-bold hover:bg-red-100"
            >
              ✕
            </button>
          </div>
        )}

        {/* Basic Information */}
        <section>
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <span className="text-lg">📋</span>
            </div>
            <div>
              <h3 className="font-bold text-slate-900">
                Group Information
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Enter the basic details of the new group.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <label className="block text-sm font-semibold text-slate-700">
              Group Name <span className="text-red-500">*</span>
              <input
                className={inputClass}
                name="name"
                value={form.name}
                onChange={change}
                placeholder="Example: Lakshmi SHG"
                required
              />
              <span className="mt-1.5 block text-xs font-normal text-slate-400">
                Enter the registered group name.
              </span>
            </label>

            <label className="block text-sm font-semibold text-slate-700">
              Group Code <span className="text-red-500">*</span>
              <input
                className={inputClass}
                name="group_code"
                value={form.group_code}
                onChange={change}
                placeholder="Example: GRP-0001"
                required
              />
              <span className="mt-1.5 block text-xs font-normal text-slate-400">
                Enter a unique identification code.
              </span>
            </label>
          </div>
        </section>

        <div className="border-t border-slate-100" />

        {/* Loan Plan */}
        <section>
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
              <span className="text-lg">💳</span>
            </div>
            <div>
              <h3 className="font-bold text-slate-900">
                Loan Plan Assignment
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Select the active loan plan for this group.
              </p>
            </div>
          </div>

          <label className="block text-sm font-semibold text-slate-700">
            Loan Plan <span className="text-red-500">*</span>
            <select
              className={inputClass}
              name="plan"
              value={form.plan}
              onChange={change}
              required
            >
              <option value="">Select a loan plan</option>
              {activePlans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name} — {plan.min_members} to {plan.max_members} members
                </option>
              ))}
            </select>

            {activePlans.length === 0 ? (
              <span className="mt-2 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
                ⚠ No active plans. Activate a plan before creating a group.
              </span>
            ) : (
              <span className="mt-2 block text-xs font-normal text-slate-400">
                {activePlans.length} active loan plan(s) available.
              </span>
            )}
          </label>
        </section>

        <div className="border-t border-slate-100" />

        {/* Group Management Details */}
        <section>
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <span className="text-lg">🏢</span>
            </div>
            <div>
              <h3 className="font-bold text-slate-900">
                Group Management Details
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Add branch, group leader and meeting schedule.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <label className="block text-sm font-semibold text-slate-700">
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
              <span className="mt-1.5 block text-xs font-normal text-slate-400">
                Enter the existing branch ID.
              </span>
            </label>

            <label className="block text-sm font-semibold text-slate-700">
              Group Leader Customer ID
              <input
                className={inputClass}
                name="leader"
                type="number"
                min="1"
                value={form.leader}
                onChange={change}
                placeholder="Enter existing customer ID"
              />
              <span className="mt-1.5 block text-xs font-normal text-slate-400">
                Enter the customer ID of the group leader.
              </span>
            </label>

            <label className="block text-sm font-semibold text-slate-700 md:col-span-2">
              Meeting Day
              <select
                className={inputClass}
                name="meeting_day"
                value={form.meeting_day}
                onChange={change}
              >
                <option value="">Select meeting day</option>
                {[
                  "Monday",
                  "Tuesday",
                  "Wednesday",
                  "Thursday",
                  "Friday",
                  "Saturday",
                ].map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        {/* Footer Actions */}
        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-slate-400">
            Fields marked with <span className="text-red-500">*</span> are
            required.
          </p>

          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving || activePlans.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 py-3 text-sm font-bold text-white shadow-md shadow-blue-700/20 transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Creating...
                </>
              ) : (
                <>
                  <span>＋</span>
                  Create Group
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
