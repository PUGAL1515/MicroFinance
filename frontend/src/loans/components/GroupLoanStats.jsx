
const formatINR = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

export default function GroupLoanStats({ plans, groups, loading }) {
  const totalMembers = groups.reduce(
    (sum, group) => sum + Number(group.member_count || 0),
    0
  );

  const activePlans = plans.filter((plan) => plan.is_active).length;
  const activeGroups = groups.filter(
    (group) => group.status === "active"
  ).length;

  const stats = [
    {
      label: "Total Groups",
      value: groups.length,
      icon: "♧",
      color: "blue",
    },
    {
      label: "Total Members",
      value: totalMembers,
      icon: "♙",
      color: "violet",
    },
    {
      label: "Active Plans",
      value: activePlans,
      icon: "▤",
      color: "emerald",
    },
    {
      label: "Active Groups",
      value: activeGroups,
      icon: "✓",
      color: "amber",
    },
  ];

  const colors = {
    blue: "bg-blue-50 text-blue-700",
    violet: "bg-violet-50 text-violet-700",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
  };

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">
              {stat.label}
            </p>
            <span
              className={`flex h-10 w-10 items-center justify-center rounded-xl text-xl ${colors[stat.color]}`}
            >
              {stat.icon}
            </span>
          </div>
          <p className="mt-4 text-3xl font-bold text-slate-900">
            {loading ? "—" : stat.value.toLocaleString("en-IN")}
          </p>
          <p className="mt-2 text-xs text-slate-400">
            Group Loan Overview
          </p>
        </div>
      ))}
    </div>
  );
}

export { formatINR };
