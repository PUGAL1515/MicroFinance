import { useState } from "react";

const GroupLoans = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingLoan, setEditingLoan] = useState(null);

  // Static data
  const [loans, setLoans] = useState([
    {
      id: 1,
      groupName: "Sri Lakshmi SHG",
      leaderName: "Lakshmi Devi",
      members: 12,
      loanAmount: 150000,
      interestRate: 12,
      tenure: 12,
      startDate: "2025-06-15",
      status: "Active",
      collected: 87500,
      pending: 62500,
    },
    {
      id: 2,
      groupName: "Annai Teresa Group",
      leaderName: "Selvi Rani",
      members: 15,
      loanAmount: 200000,
      interestRate: 11.5,
      tenure: 18,
      startDate: "2025-03-10",
      status: "Active",
      collected: 142000,
      pending: 58000,
    },
    {
      id: 3,
      groupName: "Vetri Vinayagar SHG",
      leaderName: "Meena Kumari",
      members: 10,
      loanAmount: 100000,
      interestRate: 12,
      tenure: 12,
      startDate: "2024-11-20",
      status: "Completed",
      collected: 100000,
      pending: 0,
    },
    {
      id: 4,
      groupName: "Amman Magalir Kuzhu",
      leaderName: "Kavitha S",
      members: 14,
      loanAmount: 175000,
      interestRate: 12.5,
      tenure: 15,
      startDate: "2025-08-01",
      status: "Active",
      collected: 45000,
      pending: 130000,
    },
    {
      id: 5,
      groupName: "Sakthi Women Group",
      leaderName: "Priya Dharshini",
      members: 11,
      loanAmount: 120000,
      interestRate: 11,
      tenure: 12,
      startDate: "2025-01-05",
      status: "Overdue",
      collected: 68000,
      pending: 52000,
    },
  ]);

  const [formData, setFormData] = useState({
    groupName: "",
    leaderName: "",
    members: "",
    loanAmount: "",
    interestRate: "12",
    tenure: "12",
    startDate: new Date().toISOString().split("T")[0],
    status: "Active",
  });

  // Stats
  const totalLoans = loans.length;
  const activeLoans = loans.filter((l) => l.status === "Active").length;
  const totalDisbursed = loans.reduce((sum, l) => sum + l.loanAmount, 0);
  const totalPending = loans.reduce((sum, l) => sum + l.pending, 0);

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);

  const getStatusBadge = (status) => {
    const styles = {
      Active: "bg-emerald-100 text-emerald-700",
      Completed: "bg-blue-100 text-blue-700",
      Overdue: "bg-red-100 text-red-700",
    };
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${styles[status] || "bg-slate-100 text-slate-600"}`}>
        {status}
      </span>
    );
  };

  const handleAdd = () => {
    setEditingLoan(null);
    setFormData({
      groupName: "",
      leaderName: "",
      members: "",
      loanAmount: "",
      interestRate: "12",
      tenure: "12",
      startDate: new Date().toISOString().split("T")[0],
      status: "Active",
    });
    setShowForm(true);
  };

  const handleEdit = (loan) => {
    setEditingLoan(loan);
    setFormData({
      groupName: loan.groupName,
      leaderName: loan.leaderName,
      members: loan.members,
      loanAmount: loan.loanAmount,
      interestRate: loan.interestRate,
      tenure: loan.tenure,
      startDate: loan.startDate,
      status: loan.status,
    });
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this group loan?")) {
      setLoans(loans.filter((loan) => loan.id !== id));
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      members: Number(formData.members),
      loanAmount: Number(formData.loanAmount),
      interestRate: Number(formData.interestRate),
      tenure: Number(formData.tenure),
    };

    if (editingLoan) {
      setLoans(
        loans.map((loan) =>
          loan.id === editingLoan.id ? { ...loan, ...payload } : loan
        )
      );
    } else {
      const newLoan = {
        id: Date.now(),
        ...payload,
        collected: 0,
        pending: Number(formData.loanAmount),
      };
      setLoans([newLoan, ...loans]);
    }

    setShowForm(false);
    setEditingLoan(null);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Group Loans</h1>
          <p className="text-slate-500 mt-1">Manage Self Help Group loans</p>
        </div>
        <button
          onClick={handleAdd}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-teal-500 text-white font-medium rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-0.5 transition-all"
        >
          <span className="text-lg">+</span>
          New Group Loan
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        {[
          { title: "Total Groups", value: totalLoans, icon: "👥", color: "from-blue-500 to-blue-600" },
          { title: "Active Loans", value: activeLoans, icon: "🟢", color: "from-emerald-500 to-emerald-600" },
          { title: "Total Disbursed", value: `₹${(totalDisbursed / 100000).toFixed(1)}L`, icon: "💰", color: "from-indigo-500 to-indigo-600" },
          { title: "Pending Collection", value: `₹${(totalPending / 100000).toFixed(1)}L`, icon: "⏳", color: "from-amber-500 to-amber-600" },
        ].map((stat, index) => (
          <div key={index} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">{stat.title}</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center text-xl shadow-lg`}>
                {stat.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-5 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Group Name</th>
                <th className="px-5 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Leader</th>
                <th className="px-5 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Members</th>
                <th className="px-5 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Loan Amount</th>
                <th className="px-5 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Collected</th>
                <th className="px-5 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending</th>
                <th className="px-5 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-5 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loans.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-5 py-12 text-center text-slate-400">
                    No group loans found
                  </td>
                </tr>
              ) : (
                loans.map((loan) => (
                  <tr key={loan.id} className="hover:bg-slate-50 transition">
                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-800">{loan.groupName}</p>
                      <p className="text-xs text-slate-400 mt-0.5">Started: {loan.startDate}</p>
                    </td>
                    <td className="px-5 py-4 text-slate-600">{loan.leaderName}</td>
                    <td className="px-5 py-4 text-slate-600">{loan.members}</td>
                    <td className="px-5 py-4 font-medium text-slate-800">{formatCurrency(loan.loanAmount)}</td>
                    <td className="px-5 py-4 text-emerald-600 font-medium">{formatCurrency(loan.collected)}</td>
                    <td className="px-5 py-4 text-amber-600 font-medium">{formatCurrency(loan.pending)}</td>
                    <td className="px-5 py-4">{getStatusBadge(loan.status)}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(loan)}
                          className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(loan.id)}
                          className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowForm(false)}></div>

          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-xl font-bold text-slate-800">
                {editingLoan ? "Edit Group Loan" : "New Group Loan"}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Group Name *</label>
                <input
                  type="text"
                  name="groupName"
                  value={formData.groupName}
                  onChange={handleChange}
                  required
                  placeholder="e.g. Sri Lakshmi SHG"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Group Leader *</label>
                <input
                  type="text"
                  name="leaderName"
                  value={formData.leaderName}
                  onChange={handleChange}
                  required
                  placeholder="Leader full name"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Members *</label>
                  <input
                    type="number"
                    name="members"
                    value={formData.members}
                    onChange={handleChange}
                    required
                    min="1"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Loan Amount (₹) *</label>
                  <input
                    type="number"
                    name="loanAmount"
                    value={formData.loanAmount}
                    onChange={handleChange}
                    required
                    min="1000"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Interest Rate (%) *</label>
                  <input
                    type="number"
                    name="interestRate"
                    value={formData.interestRate}
                    onChange={handleChange}
                    required
                    step="0.1"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Tenure (Months) *</label>
                  <input
                    type="number"
                    name="tenure"
                    value={formData.tenure}
                    onChange={handleChange}
                    required
                    min="1"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Start Date *</label>
                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Active">Active</option>
                    <option value="Completed">Completed</option>
                    <option value="Overdue">Overdue</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 border border-slate-300 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-teal-500 text-white font-medium rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition"
                >
                  {editingLoan ? "Update Loan" : "Create Loan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupLoans;