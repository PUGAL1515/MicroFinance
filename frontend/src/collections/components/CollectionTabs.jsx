
import {
  LayoutDashboard,
  CalendarCheck,
  Receipt,
  AlertCircle,
  PhoneCall,
} from "lucide-react";

const tabs = [
  { id: "dues", label: "Today's Dues", icon: CalendarCheck },
  { id: "history", label: "Payment History", icon: Receipt },
  { id: "overdue", label: "Overdue", icon: AlertCircle },
  { id: "followups", label: "Follow-ups", icon: PhoneCall },
];

const CollectionTabs = ({ activeTab, setActiveTab }) => {
  return (
    <div className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-100 bg-white p-2 shadow-sm">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-300 ${
              active
                ? "bg-gradient-to-r from-blue-700 to-blue-500 text-white shadow-md shadow-blue-200"
                : "text-slate-500 hover:bg-blue-50 hover:text-blue-700"
            }`}
          >
            <Icon size={17} />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};

export default CollectionTabs;
