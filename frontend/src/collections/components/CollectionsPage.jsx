
import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  RefreshCw,
  Wallet,
  Activity,
  Users,
  ShieldCheck,
} from "lucide-react";

import CollectionHeader from "../components/CollectionHeader";
import CollectionStats from "../components/CollectionStats";
import CollectionTabs from "../components/CollectionTabs";
import TodayDues from "../components/TodayDues";
import PaymentModal from "../components/PaymentModal";
import PaymentHistory from "../components/PaymentHistory";
import OverdueList from "../components/OverdueList";
import FollowUpForm from "../components/FollowUpForm";
import ReceiptModal from "../components/ReceiptModal";

import collectionApi from "../../services/collectionApi";

const getList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.payments)) return data.payments;
  if (Array.isArray(data?.dues)) return data.dues;
  if (Array.isArray(data?.followups)) return data.followups;
  return [];
};

const tabsInfo = {
  dues: {
    title: "Today's Collections",
    description: "Review today's scheduled repayments and collect EMI payments.",
    icon: CalendarDays,
  },
  history: {
    title: "Payment History",
    description: "Track previously collected payments and transaction records.",
    icon: Wallet,
  },
  overdue: {
    title: "Overdue Management",
    description: "Monitor delayed repayments and manage outstanding balances.",
    icon: Clock3,
  },
  followups: {
    title: "Customer Follow-ups",
    description: "Schedule customer communication and track collection activities.",
    icon: Users,
  },
};

function LoadingState() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-100 border-t-blue-700" />
        <div>
          <p className="text-sm font-bold text-slate-800">
            Loading collection records
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Fetching your latest collection information...
          </p>
        </div>
      </div>

      <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <div
            key={item}
            className="h-28 animate-pulse rounded-xl bg-slate-100"
          />
        ))}
      </div>

      <div className="mt-6 h-64 animate-pulse rounded-xl bg-slate-100" />
    </div>
  );
}

function ErrorBanner({ error, onRetry }) {
  if (!error) return null;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <AlertCircle className="mt-0.5 shrink-0 text-rose-600" size={20} />
        <div>
          <p className="text-sm font-bold text-rose-800">
            Collection data warning
          </p>
          <p className="mt-1 break-words text-xs leading-5 text-rose-700">
            {error}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onRetry}
        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-xs font-bold text-rose-700 transition hover:bg-rose-100"
      >
        <RefreshCw size={14} />
        Retry
      </button>
    </div>
  );
}

function ActivityOverview({ dues, overdue, payments, followUps }) {
  const activities = [
    {
      label: "Today's Dues",
      count: dues.length,
      icon: CalendarDays,
      color: "text-blue-700",
      bg: "bg-blue-50",
    },
    {
      label: "Overdue Accounts",
      count: overdue.length,
      icon: Clock3,
      color: "text-rose-700",
      bg: "bg-rose-50",
    },
    {
      label: "Transactions",
      count: payments.length,
      icon: Wallet,
      color: "text-emerald-700",
      bg: "bg-emerald-50",
    },
    {
      label: "Follow-ups",
      count: followUps.length,
      icon: Users,
      color: "text-violet-700",
      bg: "bg-violet-50",
    },
  ];

  return (
    <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {activities.map((item) => {
        const Icon = item.icon;

        return (
          <div
            key={item.label}
            className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-5"
          >
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${item.bg} ${item.color}`}
            >
              <Icon size={21} />
            </div>

            <div className="min-w-0">
              <p className="text-xl font-extrabold tracking-tight text-slate-900">
                {item.count}
              </p>
              <p className="truncate text-xs font-medium text-slate-500">
                {item.label}
              </p>
            </div>

            <ArrowUpRight
              size={15}
              className="ml-auto hidden text-slate-300 transition group-hover:text-blue-600 sm:block"
            />
          </div>
        );
      })}
    </section>
  );
}

const CollectionsPage = () => {
  const [activeTab, setActiveTab] = useState("dues");

  const [dashboard, setDashboard] = useState({});
  const [dues, setDues] = useState([]);
  const [payments, setPayments] = useState([]);
  const [overdue, setOverdue] = useState([]);
  const [followUps, setFollowUps] = useState([]);

  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedFollowUpItem, setSelectedFollowUpItem] = useState(null);
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [followUpLoading, setFollowUpLoading] = useState(false);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    const requests = await Promise.allSettled([
      collectionApi.dashboard(),
      collectionApi.todayDues(),
      collectionApi.paymentHistory(),
      collectionApi.overdue(),
      collectionApi.followUps(),
    ]);

    const failures = [];

    if (requests[0].status === "fulfilled") {
      setDashboard(requests[0].value || {});
    } else {
      failures.push(
        `Dashboard: ${requests[0].reason?.message || "Unable to load"}`
      );
    }

    if (requests[1].status === "fulfilled") {
      setDues(getList(requests[1].value));
    } else {
      setDues([]);
      failures.push(
        `Today's dues: ${requests[1].reason?.message || "Unable to load"}`
      );
    }

    if (requests[2].status === "fulfilled") {
      setPayments(getList(requests[2].value));
    } else {
      setPayments([]);
      failures.push(
        `Payment history: ${requests[2].reason?.message || "Unable to load"}`
      );
    }

    if (requests[3].status === "fulfilled") {
      setOverdue(getList(requests[3].value));
    } else {
      setOverdue([]);
      failures.push(
        `Overdue records: ${requests[3].reason?.message || "Unable to load"}`
      );
    }

    if (requests[4].status === "fulfilled") {
      setFollowUps(getList(requests[4].value));
    } else {
      setFollowUps([]);
      failures.push(
        `Follow-ups: ${requests[4].reason?.message || "Unable to load"}`
      );
    }

    setError(failures.join(" | "));
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCollection = async (payload) => {
    setPaymentLoading(true);

    try {
      const response = await collectionApi.collectPayment(payload);

      setSelectedItem(null);
      setSelectedReceipt(response);

      await loadData();
    } catch (err) {
      alert(err.message || "Payment collection failed.");
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleFollowUp = async (payload) => {
    setFollowUpLoading(true);

    try {
      await collectionApi.createFollowUp(payload);

      alert("Follow-up saved successfully.");

      setSelectedFollowUpItem(null);
      setActiveTab("followups");

      await loadData();
    } catch (err) {
      alert(err.message || "Unable to save follow-up.");
    } finally {
      setFollowUpLoading(false);
    }
  };

  const openFollowUp = (item) => {
    // Keep follow-up selection separate from payment selection.
    // This prevents PaymentModal from opening accidentally.
    setSelectedItem(null);
    setSelectedFollowUpItem(item);
    setActiveTab("followups");
  };

  const currentTab = tabsInfo[activeTab] || tabsInfo.dues;
  const CurrentIcon = currentTab.icon;

  return (
    <div className="collection-page min-h-screen bg-[#f5f7fc] px-3 pb-8 pt-20 sm:px-5 md:pt-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-6">

        {/* Page Header */}
        <CollectionHeader
          onRefresh={loadData}
          loading={loading}
        />

        {/* Error */}
        <ErrorBanner error={error} onRetry={loadData} />

        {/* Collection Statistics */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Activity size={17} className="text-blue-700" />
                <h2 className="text-base font-extrabold text-slate-900">
                  Collection Overview
                </h2>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Financial performance and repayment summary
              </p>
            </div>

            <span className="hidden items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-700 sm:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Live Data
            </span>
          </div>

          <CollectionStats data={dashboard} />
        </section>

        {/* Activity Summary */}
        <section>
          <div className="mb-3 flex items-center gap-2">
            <ShieldCheck size={17} className="text-blue-700" />
            <h2 className="text-sm font-extrabold text-slate-800">
              Collection Activity
            </h2>
          </div>

          <ActivityOverview
            dues={dues}
            overdue={overdue}
            payments={payments}
            followUps={followUps}
          />
        </section>

        {/* Collection Workspace */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          {/* Workspace Header */}
          <div className="border-b border-slate-100 bg-gradient-to-r from-white via-blue-50/40 to-white px-4 py-5 sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                    <CurrentIcon size={18} />
                  </div>

                  <div>
                    <h2 className="text-lg font-extrabold text-slate-900">
                      {currentTab.title}
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {currentTab.description}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-500 sm:self-center">
                <CheckCircle2 size={15} className="text-emerald-600" />
                Collection Workspace
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="border-b border-slate-100 px-3 pt-3 sm:px-5">
            <CollectionTabs
              activeTab={activeTab}
              setActiveTab={(tab) => {
                setSelectedFollowUpItem(null);
                setSelectedItem(null);
                setActiveTab(tab);
              }}
            />
          </div>

          {/* Tab Content */}
          <div className="min-h-[350px] p-3 sm:p-5 lg:p-6">
            {loading ? (
              <LoadingState />
            ) : (
              <div className="collection-content-enter">

                {activeTab === "dues" && (
                  <TodayDues
                    dues={dues}
                    onCollect={setSelectedItem}
                  />
                )}

                {activeTab === "history" && (
                  <PaymentHistory
                    payments={payments}
                    onViewReceipt={setSelectedReceipt}
                  />
                )}

                {activeTab === "overdue" && (
                  <OverdueList
                    items={overdue}
                    onFollowUp={openFollowUp}
                  />
                )}

                {activeTab === "followups" && (
                  <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">

                    {/* Follow-up Form */}
                    <div className="min-w-0">
                      <FollowUpForm
                        items={overdue.length ? overdue : dues}
                        selectedItem={selectedFollowUpItem}
                        onSubmit={handleFollowUp}
                        loading={followUpLoading}
                      />
                    </div>

                    {/* Follow-up Activity */}
                    <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

                      <div className="border-b border-slate-100 bg-slate-50/70 p-5">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <h2 className="text-base font-extrabold text-slate-900">
                              Recent Follow-ups
                            </h2>
                            <p className="mt-1 text-xs text-slate-500">
                              Customer communication activity
                            </p>
                          </div>

                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                            <Users size={20} />
                          </div>
                        </div>
                      </div>

                      <div className="max-h-[600px] space-y-3 overflow-y-auto p-4 sm:p-5">

                        {followUps.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-14 text-center">
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                              <Users size={25} />
                            </div>

                            <h3 className="mt-4 text-sm font-bold text-slate-800">
                              No follow-ups yet
                            </h3>

                            <p className="mt-1 max-w-xs text-xs leading-5 text-slate-500">
                              Customer follow-up records will appear here once
                              you schedule your first follow-up.
                            </p>
                          </div>
                        ) : (
                          followUps.map((item) => (
                            <div
                              key={item.id}
                              className="group rounded-xl border border-slate-200 bg-white p-4 transition hover:border-blue-200 hover:bg-blue-50/30"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex min-w-0 items-center gap-3">
                                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-sm font-extrabold text-blue-700">
                                    {(item.customer_name || "C")
                                      .charAt(0)
                                      .toUpperCase()}
                                  </div>

                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-bold text-slate-900">
                                      {item.customer_name || "Customer"}
                                    </p>
                                    <p className="mt-1 text-[11px] text-slate-400">
                                      Follow-up #{item.id}
                                    </p>
                                  </div>
                                </div>

                                <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold capitalize text-blue-700">
                                  {String(item.status || "pending").replaceAll("_", " ")}
                                </span>
                              </div>

                              <div className="mt-3 rounded-lg bg-slate-50 p-3">
                                <p className="text-xs leading-5 text-slate-600">
                                  {item.remarks || "No remarks provided"}
                                </p>
                              </div>

                              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                                <span className="inline-flex items-center gap-1.5">
                                  <CalendarDays size={13} className="text-blue-600" />
                                  {item.follow_up_date || "Date not specified"}
                                </span>

                                <span className="font-semibold text-slate-400">
                                  Customer Follow-up
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-3">
                        <p className="text-xs font-semibold text-slate-500">
                          Total follow-ups:{" "}
                          <span className="font-extrabold text-slate-800">
                            {followUps.length}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>
        </section>

        {/* Footer */}
        <footer className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white px-4 py-4 text-xs text-slate-500 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="font-extrabold tracking-wide text-slate-800">
              SMLNEXGEN
            </span>
            <span className="mx-2 text-slate-300">|</span>
            Microfinance Management System
          </div>

          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Collection Management
          </div>
        </footer>
      </div>

      {/* Payment Modal */}
      {selectedItem && (
        <PaymentModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onSubmit={handleCollection}
          loading={paymentLoading}
        />
      )}

      {/* Receipt Modal */}
      {selectedReceipt && (
        <ReceiptModal
          receipt={selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
        />
      )}
    </div>
  );
};

export default CollectionsPage;
