
import { useState } from "react";
import { PhoneCall, CalendarDays } from "lucide-react";

const FollowUpForm = ({ items = [], onSubmit, loading }) => {
  const [form, setForm] = useState({
    member_installment: "",
    follow_up_date: new Date().toISOString().slice(0, 10),
    next_follow_up_date: "",
    status: "contacted",
    remarks: "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const submit = (e) => {
    e.preventDefault();

    if (!form.member_installment) {
      alert("Please select a customer installment.");
      return;
    }

    onSubmit(form);
  };

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          <PhoneCall size={20} />
        </div>
        <div>
          <h2 className="font-bold text-slate-900">Customer Follow-up</h2>
          <p className="text-sm text-slate-500">
            Record customer contact and next follow-up
          </p>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Customer Installment *
          </label>

          <select
            required
            name="member_installment"
            value={form.member_installment}
            onChange={handleChange}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          >
            <option value="">Select customer</option>
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.customer_name} - {item.group_name} - EMI #{item.installment_number}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Follow-up Date *
            </label>
            <input
              required
              type="date"
              name="follow_up_date"
              value={form.follow_up_date}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Next Follow-up
            </label>
            <input
              type="date"
              name="next_follow_up_date"
              value={form.next_follow_up_date}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Follow-up Status *
          </label>

          <select
            name="status"
            value={form.status}
            onChange={handleChange}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
          >
            <option value="pending">Pending</option>
            <option value="contacted">Contacted</option>
            <option value="promised">Payment Promised</option>
            <option value="unreachable">Unreachable</option>
            <option value="paid">Paid</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Remarks
          </label>
          <textarea
            name="remarks"
            rows="3"
            value={form.remarks}
            onChange={handleChange}
            placeholder="Enter customer response..."
            className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
          />
        </div>

        <button
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 font-semibold text-white shadow-lg shadow-blue-100 transition hover:bg-blue-700 disabled:opacity-50"
        >
          <CalendarDays size={17} />
          {loading ? "Saving..." : "Save Follow-up"}
        </button>
      </form>
    </div>
  );
};

export default FollowUpForm;
