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
  "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

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
    <label className="block text-sm font-medium text-slate-700">
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
      />
    </label>
  );

  return (
    <form
      onSubmit={save}
      className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7"
    >
      <div>
        <h2 className="text-xl font-bold text-slate-900">
          {editingPlan ? "Edit Loan Plan" : "Create Group Loan Plan"}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Configure member limits, loan amount and repayment rules.
        </p>
      </div>

      {error && (
        <div className="whitespace-pre-line rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {input("name", "Plan Name")}
        {input("description", "Description", "text", { optional: true })}

        {input("min_members", "Minimum Members", "number", { min: 1 })}
        {input("max_members", "Maximum Members", "number", { min: 1 })}

        {input("min_loan_per_member", "Minimum Loan / Member (₹)", "number", {
          min: 0.01,
          step: 0.01,
        })}
        {input("max_loan_per_member", "Maximum Loan / Member (₹)", "number", {
          min: 0.01,
          step: 0.01,
        })}

        {input("max_group_loan_amount", "Maximum Group Loan (₹)", "number", {
          min: 0.01,
          step: 0.01,
        })}
        {input("annual_interest_rate", "Annual Interest (%)", "number", {
          min: 0,
          max: 100,
          step: 0.01,
        })}

        <label className="text-sm font-medium text-slate-700">
          Interest Method
          <select
            name="interest_method"
            value={form.interest_method}
            onChange={change}
            className={fieldClass}
          >
            <option value="reducing">Reducing Balance</option>
            <option value="flat">Flat Rate</option>
          </select>
        </label>

        <label className="text-sm font-medium text-slate-700">
          Tenure
          <select
            name="tenure_months"
            value={form.tenure_months}
            onChange={change}
            className={fieldClass}
          >
            {[6, 12, 18, 24].map((months) => (
              <option key={months} value={months}>
                {months} Months
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-medium text-slate-700">
          Collection Frequency
          <select
            name="repayment_frequency"
            value={form.repayment_frequency}
            onChange={change}
            className={fieldClass}
          >
            <option value="weekly">Weekly</option>
            <option value="fortnightly">Every 15 Days</option>
            <option value="monthly">Monthly</option>
          </select>
        </label>

        {!editingPlan && (
          <label className="flex items-center gap-3 rounded-xl bg-slate-50 p-4 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              name="is_active"
              checked={form.is_active}
              onChange={change}
              className="h-4 w-4 accent-blue-600"
            />
            Activate plan immediately
          </label>
        )}
      </div>

      {editingPlan?.is_active && (
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
          Active plans cannot be edited using the current backend API. Create a
          new plan version in the backend before updating an active plan.
        </p>
      )}

      <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-5">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
        )}

        <button
          disabled={saving || Boolean(editingPlan?.is_active)}
          className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving..." : editingPlan ? "Update Plan" : "Save Plan"}
        </button>
      </div>
    </form>
  );
}
