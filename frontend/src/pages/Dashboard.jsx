import { useAuth } from "../context/AuthContext";

const Dashboard = () => {
  const { user } = useAuth();
  const role = user?.profile?.role || user?.role;

  const stats = [
    { title: "Total RD Accounts", value: "1,248", icon: "📅", color: "from-blue-500 to-blue-600" },
    { title: "Total FD Accounts", value: "856", icon: "🏦", color: "from-teal-500 to-teal-600" },
    { title: "Active Group Loans", value: "342", icon: "🤝", color: "from-indigo-500 to-indigo-600" },
    { title: "Total Collection", value: "₹48.2L", icon: "💰", color: "from-emerald-500 to-emerald-600" },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">
          Welcome back, {user?.first_name || user?.username} 👋
        </h1>
        <p className="text-slate-500 mt-1">
          Role: <span className="font-medium text-slate-700">{role?.replaceAll("_", " ")}</span>
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">{stat.title}</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center text-2xl shadow-lg`}>
                {stat.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Role based message */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <h2 className="text-lg font-semibold text-slate-800 mb-2">Your Access</h2>
        {role === "SUPER_ADMIN" && (
          <p className="text-slate-600">
            You have full access to RD, FD, Group Loans, Reports and User Management.
          </p>
        )}
        {role === "RD_FD_ADMIN" && (
          <p className="text-slate-600">
            You can manage Recurring Deposits and Fixed Deposits.
          </p>
        )}
        {role === "GROUP_LOAN_ADMIN" && (
          <p className="text-slate-600">
            You can manage Group Loan operations.
          </p>
        )}
      </div>
    </div>
  );
};

export default Dashboard;