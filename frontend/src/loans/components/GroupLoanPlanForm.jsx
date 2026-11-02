
import { useEffect, useState } from "react";
import { loanApi } from "../loanApi";

const initialForm = {
  name: "",
  description: "",
  min_members: 5,
  max_members: 10,
  min_loan_per_member: "5000",
  max_loan_per_member: "30000",
  max_group_loan_amount: "300000",
  annual_interest_rate: "12",
  interest_method: "reducing",
  tenure_months: 12,
  repayment_frequency: "monthly",
  is_active: false,
};

const fieldClass =
  "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400";

export default function GroupLoanPlanForm({ editingPlan, onSaved, onCancel }) {
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (editingPlan) {
      setForm({ ...initialForm, ...editingPlan });
    } else {
      setForm(initialForm);
    }
    setError("");
  }, [editingPlan]);

  const change = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const save = async (event) => {
    event.preventDefault();
    setError("");

    if (Number(form.min_members) > Number(form.max_members)) {
      setError("Minimum members cannot exceed maximum members.");
      return;
    }

    if (Number(form.min_loan_per_member) > Number(form.max_loan_per_member)) {
      setError("Minimum loan cannot exceed maximum loan.");
      return;
    }

    if (
      Number(form.max_group_loan_amount) <
      Number(form.min_loan_per_member) * Number(form.min_members)
    ) {
      setError("Group loan limit is too low for the minimum group.");
      return;
    }

    const payload = {
      ...form,
      min_members: Number(form.min_members),
      max_members: Number(form.max_members),
      min_loan_per_member: Number(form.min_loan_per_member),
      max_loan_per_member: Number(form.max_loan_per_member),
      max_group_loan_amount: Number(form.max_group_loan_amount),
      annual_interest_rate: Number(form.annual_interest_rate),
      tenure_months: Number(form.tenure_months),
    };

    try {
      setSaving(true);

      if (editingPlan) {
        await loanApi.updatePlan(editingPlan.id, payload);
      } else {
        await loanApi.createPlan(payload);
      }

      onSaved();
    } catch (err) {
      setError(err.message || "Unable to save plan.");
    } finally {
      setSaving(false);
    }
  };

  const input = (name, label, type = "text", extra = {}) => (
    <label className="block text-sm font-semibold text-slate-700">
      {label}
      <input
        className={fieldClass}
        name={name}
        type={type}
        value={form[name]}
        onChange={change}
        required={!extra.optional}
        min={extra.min}
        max={extra.max}
        step={extra.step}
        disabled={saving}
        placeholder={extra.placeholder || ""}
      />
    </label>
  );

  return (
    <form
      onSubmit={save}
      className="mx-auto w-full max-w-6xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-950 via-blue-900 to-blue-700 px-5 py-6 text-white sm:px-7">
        <div className="relative z-10 flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-2xl">
            📑
          </div>

          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-blue-200">
              Group Loan Management
            </p>
            <h2 className="text-xl font-bold sm:text-2xl">
              {editingPlan ? "Edit Loan Plan" : "Create Group Loan Plan"}
            </h2>
            <p className="mt-1 text-sm text-blue-100">
              Configure member limits, loan amounts and repayment rules.
            </p>
          </div>
        </div>

        <div className="pointer-events-none absolute -right-10 -top-20 h-48 w-48 rounded-full border-[25px] border-white/5" />
      </div>

      <div className="space-y-7 p-5 sm:p-7">
        {/* Error */}
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

        {/* Basic Plan Information */}
        <section>
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-lg text-blue-700">
              📝
            </div>
            <div>
              <h3 className="font-bold text-slate-900">
                Basic Plan Information
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Enter the plan name and description.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {input("name", "Plan Name", "text", {
              placeholder: "Example: Women Group Loan",
            })}

            {input("description", "Description", "text", {
              optional: true,
              placeholder: "Enter plan description",
            })}
          </div>
        </section>

        <div className="border-t border-slate-100" />

        {/* Member Configuration */}
        <section>
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-lg text-indigo-700">
              👥
            </div>
            <div>
              <h3 className="font-bold text-slate-900">
                Member Configuration
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Define the minimum and maximum group member limits.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {input("min_members", "Minimum Members", "number", {
              min: 1,
            })}

            {input("max_members", "Maximum Members", "number", {
              min: 1,
            })}
          </div>
        </section>

        <div className="border-t border-slate-100" />

        {/* Loan Amount Configuration */}
        <section>
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-lg text-emerald-700">
              ₹
            </div>
            <div>
              <h3 className="font-bold text-slate-900">
                Loan Amount Configuration
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Set individual member loan limits and overall group limit.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {input("min_loan_per_member", "Minimum Loan / Member (₹)", "number", {
              min: 0.01,
              step: 0.01,
            })}

            {input("max_loan_per_member", "Maximum Loan / Member (₹)", "number", {
              min: 0.01,
              step: 0.01,
            })}

            <div className="md:col-span-2">
              {input(
                "max_group_loan_amount",
                "Maximum Group Loan Amount (₹)",
                "number",
                {
                  min: 0.01,
                  step: 0.01,
                }
              )}
            </div>
          </div>
        </section>

        <div className="border-t border-slate-100" />

        {/* Interest and Repayment */}
        <section>
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-lg text-amber-700">
              📊
            </div>
            <div>
              <h3 className="font-bold text-slate-900">
                Interest & Repayment Configuration
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Configure interest calculation and repayment schedule.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {input("annual_interest_rate", "Annual Interest Rate (%)", "number", {
              min: 0,
              max: 100,
              step: 0.01,
            })}

            <label className="block text-sm font-semibold text-slate-700">
              Interest Method
              <select
                name="interest_method"
                value={form.interest_method}
                onChange={change}
                className={fieldClass}
                disabled={saving}
              >
                <option value="reducing">Reducing Balance</option>
                <option value="flat">Flat Rate</option>
              </select>
            </label>

            <label className="block text-sm font-semibold text-slate-700">
              Loan Tenure
              <select
                name="tenure_months"
                value={form.tenure_months}
                onChange={change}
                className={fieldClass}
                disabled={saving}
              >
                {[6, 12, 18, 24].map((months) => (
                  <option key={months} value={months}>
                    {months} Months
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-semibold text-slate-700">
              Collection Frequency
              <select
                name="repayment_frequency"
                value={form.repayment_frequency}
                onChange={change}
                className={fieldClass}
                disabled={saving}
              >
                <option value="weekly">Weekly</option>
                <option value="fortnightly">Every 15 Days</option>
                <option value="monthly">Monthly</option>
              </select>
            </label>
          </div>
        </section>

        {/* Activation */}
        {!editingPlan && (
          <>
            <div className="border-t border-slate-100" />

            <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={form.is_active}
                  onChange={change}
                  disabled={saving}
                  className="mt-1 h-4 w-4 accent-blue-600"
                />

                <span>
                  <span className="block text-sm font-bold text-slate-800">
                    Activate plan immediately
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">
                    Enable this plan for group creation as soon as it is saved.
                  </span>
                </span>
              </label>
            </section>
          </>
        )}

        {/* Active Plan Warning */}
        {editingPlan?.is_active && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <span className="text-lg">⚠️</span>
            <p className="leading-6">
              Active plans cannot be edited using the current backend API.
              Create a new plan version in the backend before updating an
              active plan.
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-slate-400">
            Please verify all loan limits and repayment settings before saving.
          </p>

          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Cancel
              </button>
            )}

            <button
              type="submit"
              disabled={saving || Boolean(editingPlan?.is_active)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 py-3 text-sm font-bold text-white shadow-md shadow-blue-700/20 transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Saving...
                </>
              ) : editingPlan ? (
                "Update Plan"
              ) : (
                <>
                  <span>＋</span>
                  Save Plan
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
