
import {
  Wallet,
  TrendingUp,
  Clock,
  AlertTriangle,
} from "lucide-react";

const formatCurrency = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const CollectionStats = ({ data = {} }) => {
  const stats = [
    {
      title: "Today's Due",
      value: formatCurrency(data.today_due_amount),
      description: "Total amount scheduled today",
      icon: CalendarIcon,
      color: "blue",
    },
    {
      title: "Collected Today",
      value: formatCurrency(data.today_collected_amount),
      description: `${data.today_collection_count || 0} payments received`,
      icon: TrendingUp,
      color: "emerald",
    },
    {
      title: "Pending Amount",
      value: formatCurrency(data.pending_amount),
      description: "Today's pending collection",
      icon: Clock,
      color: "amber",
    },
    {
      title: "Overdue Amount",
      value: formatCurrency(data.overdue_amount),
      description: `${data.overdue_count || 0} installments overdue`,
      icon: AlertTriangle,
      color: "rose",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((item, index) => {
        const Icon = item.icon;

        const themes = {
          blue: "bg-blue-50 text-blue-600",
          emerald: "bg-emerald-50 text-emerald-600",
          amber: "bg-amber-50 text-amber-600",
          rose: "bg-rose-50 text-rose-600",
        };

        return (
          <div
            key={item.title}
            style={{ animationDelay: `${index * 100}ms` }}
            className="collection-animate group rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  {item.title}
                </p>

                <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
                  {item.value}
                </h2>
              </div>

              <div
                className={`flex h-12 w-12 items-center justify-center rounded-2xl ${themes[item.color]} transition-transform duration-300 group-hover:scale-110`}
              >
                <Icon size={23} />
              </div>
            </div>

            <p className="mt-4 text-xs text-slate-400">
              {item.description}
            </p>
          </div>
        );
      })}
    </div>
  );
};

function CalendarIcon(props) {
  return <Wallet {...props} />;
}

export default CollectionStats;
